/**
 * Uji ujung-ke-ujung SELURUH transaksi AXTO dengan kode produksi yang sebenarnya:
 *   wallet member (ethers, setara MetaMask) menandatangani Bid EIP-712 persis seperti worker/public/app.js
 *   → worker/src/eth.js memverifikasi tanda tangan → engine/src/auction.js (logika lelang Ledger) menentukan pemenang
 *   → vault coinaxto/src/methods.js (attestResult / issueCoinVoucher / mintVoucher) menandatangani
 *   → worker/src/eth.js encodeClaim membuat calldata → kontrak di chain lokal (ganache) mengeksekusi.
 * Alur: lelang publik USDC (mint ke pemenang), koin dari PayPal (voucher → AxtoSale.claimPaid), lelang eksklusif AXTO
 * (kustodi), resale marketplace 90/10, WD (mintWithVoucher), dan semua penolakan replay.
 * VAULT_DIR = folder repo coinaxto (default ../../../coinaxto).
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ganache from 'ganache';
import { ethers } from 'ethers';
import * as A from '../../engine/src/auction.js';
import { recover, domainSeparator, bidStructHash, typedHash, lotIdHex, encodeClaim } from '../../worker/src/eth.js';

const VAULT_DIR = resolve(process.env.VAULT_DIR || new URL('../../../coinaxto', import.meta.url).pathname);
const { methods } = await import(pathToFileURL(`${VAULT_DIR}/src/methods.js`).href);

const art = (n) => JSON.parse(readFileSync(new URL(`../out/${n}.json`, import.meta.url), 'utf8'));
const E = (n) => ethers.parseEther(String(n));
const U = (n) => ethers.parseUnits(String(n), 6);
const ZERO = ethers.ZeroAddress;
const BANK = '0x6918A3C9a58E71B3bca993e8cDD2630D2DDB6469';

/** R2 tiruan (get/put + onlyIf etagDoesNotMatch) untuk VAULT_STORE. */
function memR2() {
  const m = new Map();
  return {
    async get(k) { return m.has(k) ? { json: async () => JSON.parse(m.get(k)) } : null; },
    async put(k, body, opts = {}) {
      if (opts.onlyIf?.etagDoesNotMatch === '*' && m.has(k)) return null;
      m.set(k, typeof body === 'string' ? body : JSON.stringify(body));
      return { key: k };
    },
  };
}

let provider, owner, treasury, signerW, alice, bob, carol, chainId;
let usdc, token, sale, house, col, colEx, env;

/** nonce eksplisit & tahan ganache usang: max(latest, pending), coba ulang bila ganache menolak nonce. */
async function freshNonce(provider, addr) { return Math.max(await provider.getTransactionCount(addr, 'latest'), await provider.getTransactionCount(addr, 'pending')); }
async function sendDeploy(provider, f, addr, args) {
  for (let i = 0, n = await freshNonce(provider, addr); ; i += 1, n += 1) {
    try { return await f.deploy(...args, { nonce: n }); } catch (e) { if (i >= 4 || !/correct nonce|nonce too low/i.test(String(e.message))) throw e; }
  }
}
async function deploy(name, ...args) {
  const a = art(name);
  // nonce eksplisit: ganache kadang memberi nonce "pending" usang setelah deploy besar (premint 2 jt)
  const c = await sendDeploy(provider, new ethers.ContractFactory(a.abi, a.bytecode, owner), owner.address, args);
  await c.waitForDeployment();
  return c;
}
const now = () => Math.floor(Date.now() / 1000);

/** Member menandatangani Bid persis seperti app.js (eth_signTypedData_v4). */
async function signBid(wallet, { c, colAddr, tokenId, currency, units, lotKey }) {
  const cur = c.startsWith('ex-') ? 'AXTO' : 'USDC';
  const lotId = lotIdHex(lotKey);
  const msg = { lotId, collection: colAddr, tokenId: BigInt(tokenId), currency, maxAmount: BigInt(A.toBase(units, cur)), nonce: BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000)), deadline: BigInt(now() + 7 * 86400) };
  const domain = { name: 'AXTO Auction House', version: '1', chainId, verifyingContract: await house.getAddress() };
  const types = { Bid: [{ name: 'lotId', type: 'bytes32' }, { name: 'collection', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'currency', type: 'address' }, { name: 'maxAmount', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }] };
  const sig = await wallet.signTypedData(domain, types, msg);
  // worker (Ledger.verifyBid) memulihkan penanda tangan
  const ds = domainSeparator({ name: 'AXTO Auction House', version: '1', chainId: Number(chainId), verifyingContract: domain.verifyingContract });
  assert.equal(recover(typedHash(ds, bidStructHash(msg)), sig).toLowerCase(), wallet.address.toLowerCase(), 'worker memulihkan penawar');
  return { msg, sig, units };
}

/** Lot berjalan di logika Ledger (engine/auction.js) lalu ditutup → pemenang. */
function runLot(lotKey, cur, bids, start) {
  const endAt = Date.now() + 60_000;
  const lot = A.newLot({ lotId: lotIdHex(lotKey), collection: 'x', tokenId: 1, currency: cur, start, endAt });
  for (const b of bids) {
    const r = A.placeBid(lot, { bidder: b.who, kind: b.kind, amount: b.bid.units, max: b.bid.units, sig: { sig: b.bid.sig } }, Date.now(), 10 ** 12);
    assert.ok(r.ok, r.error);
  }
  A.close(lot, lot.endAt); // anti-sniping bisa memperpanjang endAt
  assert.equal(lot.status, 'awaiting_claim');
  return lot;
}

/** Vault menandatangani hasil, pemenang mengirim claim() memakai calldata dari worker. */
async function attestAndClaim({ lot, winnerWallet, winBid, colAddr, tokenId, currency, cur, seller = ZERO, mode }) {
  const result = { lotId: winBid.msg.lotId, collection: colAddr, tokenId: String(tokenId), winner: winnerWallet.address, currency, price: A.toBase(lot.winner.amount, cur), seller, mode, deadline: String(now() + 2 * 86400) };
  const att = await methods.attestResult(env, { result, bid: { maxUnits: winBid.units, nonce: String(winBid.msg.nonce), deadline: String(winBid.msg.deadline), sig: winBid.sig } });
  assert.ok(att.sig, JSON.stringify(att));
  const bid = { lotId: winBid.msg.lotId, collection: colAddr, tokenId: String(tokenId), currency, maxAmount: winBid.msg.maxAmount.toString(), nonce: winBid.msg.nonce.toString(), deadline: winBid.msg.deadline.toString() };
  const data = encodeClaim(bid, winBid.sig, result, att.sig);
  return { tx: { to: await house.getAddress(), data }, result };
}

before(async () => {
  const mnemonic = 'test test test test test test test test test test test junk';
  const g = ganache.provider({ logging: { quiet: true }, chain: { chainId: 84532, hardfork: 'shanghai' }, wallet: { mnemonic, totalAccounts: 8, defaultBalance: 1000 } });
  provider = new ethers.BrowserProvider(g);
  [owner, treasury, signerW, alice, bob, carol] = [0, 1, 2, 3, 4, 5].map((i) => ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${i}`).connect(provider));
  chainId = (await provider.getNetwork()).chainId;
  usdc = await deploy('MockUSDC');
  const feed = await deploy('MockFeed', 2000n * 10n ** 8n);
  token = await deploy('AxtoToken', owner.address, [owner.address], [E(100_000_000)], []);
  sale = await deploy('AxtoSale', owner.address, await token.getAddress(), await usdc.getAddress(), await feed.getAddress(), treasury.address, signerW.address, owner.address);
  house = await deploy('AxtoAuctionHouse', owner.address, treasury.address, signerW.address, [await usdc.getAddress(), await token.getAddress()], await token.getAddress(), BANK);
  col = await deploy('AxtoCollection', { name: 'AXTO Time', symbol: 'AXTIME', maxSupply: 2_000_000, owner: owner.address, royaltyReceiver: treasury.address, baseURI: 'https://axto.io/api/meta/time/', contractURI: 'https://axto.io/api/contract/time', custody: owner.address, premint: 2_000_000, operator: await house.getAddress(), signer: ZERO, minter: ZERO, editionStride: 0, validator: ZERO, operators: [] });
  colEx = await deploy('AxtoCollection', { name: 'AXTO Exclusive Time', symbol: 'AXXTIME', maxSupply: 50_000, owner: owner.address, royaltyReceiver: treasury.address, baseURI: 'https://axto.io/api/meta/ex-time/', contractURI: 'https://axto.io/api/contract/ex-time', custody: ZERO, premint: 0, operator: ZERO, signer: signerW.address, minter: ZERO, editionStride: 0, validator: ZERO, operators: [] });
  await (await token.setSale(await sale.getAddress(), owner.address)).wait();
  for (const a of [await house.getAddress(), treasury.address]) await (await token.setTrusted(a, true)).wait();
  for (const w of [alice, bob, carol]) await (await usdc.mint(w.address, U(1000))).wait();
  // env vault = konfigurasi produksi, kunci signer = wallet signer kontrak
  env = { SIGNER_KEY: signerW.privateKey, CHAIN_ID: String(chainId), AUCTION_HOUSE: await house.getAddress(), AXTO_SALE: await sale.getAddress(), USDC: await usdc.getAddress(), VAULT_STORE: memR2() };
  assert.equal((await methods.signerAddress(env)).address.toLowerCase(), signerW.address.toLowerCase());
});

test('1. lelang publik USDC mulai $1: proxy vs tetap → vault attest → pemenang klaim, NFT pindah dari wallet admin (premint) ke pemenang, dana ke treasury', async () => {
  const c = await col.getAddress();
  const cu = await usdc.getAddress();
  const start = A.startUnits(A.START_USD, 'USDC');
  assert.equal(start, 100); // $1
  const a = await signBid(alice, { c: 'time', colAddr: c, tokenId: 7, currency: cu, units: 500, lotKey: 'axto:time:7' }); // proxy maks $5
  const b = await signBid(bob, { c: 'time', colAddr: c, tokenId: 7, currency: cu, units: 300, lotKey: 'axto:time:7' }); // tetap $3
  const lot = runLot('axto:time:7', 'USDC', [{ who: alice.address, kind: 'proxy', bid: a }, { who: bob.address, kind: 'fixed', bid: b }], start);
  assert.equal(lot.winner.bidder, alice.address);
  assert.ok(lot.winner.amount > 300 && lot.winner.amount <= 500, `harga ${lot.winner.amount}`);
  const { tx, result } = await attestAndClaim({ lot, winnerWallet: alice, winBid: a, colAddr: c, tokenId: 7, currency: cu, cur: 'USDC', mode: 1 });
  await (await usdc.connect(alice).approve(await house.getAddress(), BigInt(result.price))).wait();
  const before = await usdc.balanceOf(treasury.address);
  assert.equal(await col.ownerOf(7), owner.address); // sudah tercetak di wallet admin & tampil di OpenSea sejak deploy
  await (await alice.sendTransaction({ ...tx, gasLimit: 600_000 })).wait(); // pemenang membayar gas
  assert.equal(await col.ownerOf(7), alice.address);
  assert.equal((await usdc.balanceOf(treasury.address)) - before, BigInt(result.price));
  await assert.rejects(alice.sendTransaction({ ...tx, gasLimit: 600_000 }).then((t) => t.wait()), 'klaim ulang ditolak');
});

test('2. bukan pemenang tidak bisa klaim; tanda tangan bid orang lain ditolak', async () => {
  const c = await col.getAddress();
  const cu = await usdc.getAddress();
  const a = await signBid(alice, { c: 'time', colAddr: c, tokenId: 8, currency: cu, units: 200, lotKey: 'axto:time:8' });
  const lot = runLot('axto:time:8', 'USDC', [{ who: alice.address, kind: 'fixed', bid: a }], 100);
  const { tx } = await attestAndClaim({ lot, winnerWallet: alice, winBid: a, colAddr: c, tokenId: 8, currency: cu, cur: 'USDC', mode: 1 });
  await (await usdc.connect(bob).approve(await house.getAddress(), U(10))).wait();
  await assert.rejects(bob.sendTransaction({ ...tx, gasLimit: 600_000 }).then((t) => t.wait()), 'bob bukan pemenang');
  const forged = await methods.attestResult(env, { result: { lotId: a.msg.lotId, collection: c, tokenId: '8', winner: bob.address, currency: cu, price: A.toBase(200, 'USDC'), seller: ZERO, mode: 1, deadline: String(now() + 86400) }, bid: { maxUnits: 200, nonce: String(a.msg.nonce), deadline: String(a.msg.deadline), sig: a.sig } });
  assert.equal(forged.error, 'bid_signature', 'vault menolak attestasi untuk pemenang yang tidak menandatangani bid');
});

test('3. koin AXTO dari PayPal: voucher vault → AxtoSale.claimPaid ke wallet member; voucher sekali pakai', async () => {
  for (const [w, coins, order] of [[bob, 10, 'SANDBOXORDER0001'], [carol, 5, 'SANDBOXORDER0002']]) {
    const v = await methods.issueCoinVoucher(env, order, { wallet: w.address.toLowerCase(), coins });
    await (await sale.connect(w).claimPaid(v.to, v.amount, v.ref, v.deadline, v.sig, { gasLimit: 400_000 })).wait();
    assert.equal(await token.balanceOf(w.address), E(coins));
    const again = await methods.issueCoinVoucher(env, order, { wallet: w.address.toLowerCase(), coins });
    assert.equal(again.sig, v.sig, 'vault idempoten per order');
    await assert.rejects(sale.connect(w).claimPaid(v.to, v.amount, v.ref, v.deadline, v.sig, { gasLimit: 400_000 }).then((t) => t.wait()), 'voucher dipakai ulang ditolak');
  }
});

test('4. lelang eksklusif dibayar AXTO (kustodi axto.io, mode 2), lalu resale marketplace 90/10, lalu WD mint ke wallet', async () => {
  const cx = await colEx.getAddress();
  const ax = await token.getAddress();
  const start = A.startUnits(A.START_USD, 'AXTO');
  assert.equal(start, 100); // 0,1 AXTO = $1
  // primer: bob menang 0,5 AXTO
  const b = await signBid(bob, { c: 'ex-time', colAddr: cx, tokenId: 3, currency: ax, units: 500, lotKey: 'axto:ex-time:3' });
  const lot = runLot('axto:ex-time:3', 'AXTO', [{ who: bob.address, kind: 'fixed', bid: b }], start);
  const p = await attestAndClaim({ lot, winnerWallet: bob, winBid: b, colAddr: cx, tokenId: 3, currency: ax, cur: 'AXTO', mode: 2 });
  await (await token.connect(bob).approve(await house.getAddress(), BigInt(p.result.price))).wait();
  const t0 = await token.balanceOf(treasury.address);
  await (await bob.sendTransaction({ ...p.tx, gasLimit: 600_000 })).wait();
  assert.equal((await token.balanceOf(treasury.address)) - t0, E(0.5));
  assert.equal(await house.settled(b.msg.lotId), true);
  // resale: bob menjual Buy Now 1 AXTO ke carol → 0,9 ke bob, 0,1 fee
  const r = await signBid(carol, { c: 'ex-time', colAddr: cx, tokenId: 3, currency: ax, units: 1000, lotKey: 'axto:ex-time:3:r1' });
  const rl = runLot('axto:ex-time:3:r1', 'AXTO', [{ who: carol.address, kind: 'fixed', bid: r }], 1000);
  const q = await attestAndClaim({ lot: rl, winnerWallet: carol, winBid: r, colAddr: cx, tokenId: 3, currency: ax, cur: 'AXTO', seller: bob.address, mode: 2 });
  await (await token.connect(carol).approve(await house.getAddress(), BigInt(q.result.price))).wait();
  const [bob0, tr0] = [await token.balanceOf(bob.address), await token.balanceOf(BANK)];
  await (await carol.sendTransaction({ ...q.tx, gasLimit: 600_000 })).wait();
  assert.equal((await token.balanceOf(bob.address)) - bob0, E(0.9));
  assert.equal((await token.balanceOf(BANK)) - tr0, E(0.1)); // komisi 10% AXTO → bank koin pemilik (#41)
  // WD: vault menerbitkan voucher mint untuk pemilik kustodi (carol); carol mint sendiri (bayar gas)
  const v = await methods.mintVoucher(env, { collection: cx, collectionName: 'AXTO Exclusive Time', tokenId: '3', owner: carol.address, custodyRef: 'ex-time:3:r1' });
  await (await colEx.connect(carol).mintWithVoucher(v.to, v.tokenId, v.ref, v.deadline, v.sig, { gasLimit: 400_000 })).wait();
  assert.equal(await colEx.ownerOf(3), carol.address);
  const other = await methods.mintVoucher(env, { collection: cx, collectionName: 'AXTO Exclusive Time', tokenId: '3', owner: bob.address, custodyRef: 'x' });
  assert.equal(other.error, 'withdrawn', 'token yang sudah di-WD tidak bisa diterbitkan lagi untuk orang lain');
  await assert.rejects(colEx.connect(carol).mintWithVoucher(v.to, v.tokenId, v.ref, v.deadline, v.sig, { gasLimit: 400_000 }).then((t) => t.wait()), 'WD ulang ditolak');
});

test('5. royalti jual kembali 10% (ERC-2981) terbaca di koleksi', async () => {
  const [recv, amt] = await col.royaltyInfo(7, E(1));
  assert.equal(recv, treasury.address);
  assert.equal(amt, E(0.1));
});
