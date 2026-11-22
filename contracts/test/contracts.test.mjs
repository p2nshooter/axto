import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ganache from 'ganache';
import { ethers } from 'ethers';

const art = (n) => JSON.parse(readFileSync(new URL(`../out/${n}.json`, import.meta.url), 'utf8'));
const E = (n) => ethers.parseEther(String(n));
const U = (n) => ethers.parseUnits(String(n), 6);
const BANK = '0x6918A3C9a58E71B3bca993e8cDD2630D2DDB6469'; // bank koin AXTO (komisi marketplace)

let provider, owner, treasury, signerW, alice, bob, carol, chainId;
let usdc, feed, token, sale, house, col, colEx, vest, lock, premintRcpt;

async function deploy(name, ...args) {
  const a = art(name);
  const f = new ethers.ContractFactory(a.abi, a.bytecode, owner);
  // nonce eksplisit: ganache kadang memberi nonce "pending" usang setelah deploy besar (premint 2 jt)
  const c = await f.deploy(...args, { nonce: await provider.getTransactionCount(owner.address, 'latest') });
  await c.waitForDeployment();
  return c;
}
const as = (c, who) => c.connect(who);
const now = async () => (await provider.getBlock('latest')).timestamp;
const warp = async (s) => { await provider.send('evm_increaseTime', [s]); await provider.send('evm_mine', []); };
const revert = async (p, msg) => { await assert.rejects(p, (e) => (msg ? String(e.message + JSON.stringify(e.info ?? '')).includes(msg) : true)); };

const BID = { Bid: [
  { name: 'lotId', type: 'bytes32' }, { name: 'collection', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'currency', type: 'address' },
  { name: 'maxAmount', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }] };
const RESULT = { Result: [
  { name: 'lotId', type: 'bytes32' }, { name: 'collection', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'winner', type: 'address' },
  { name: 'currency', type: 'address' }, { name: 'price', type: 'uint256' }, { name: 'seller', type: 'address' }, { name: 'mode', type: 'uint8' }, { name: 'deadline', type: 'uint256' }] };

before(async () => {
  const mnemonic = 'test test test test test test test test test test test junk';
  const g = ganache.provider({ logging: { quiet: true }, chain: { chainId: 84532, hardfork: 'shanghai' }, wallet: { mnemonic, totalAccounts: 8, defaultBalance: 1000 } });
  provider = new ethers.BrowserProvider(g);
  // Wallet lokal: transaksi & tanda tangan EIP-712 dibuat di klien, persis seperti MetaMask.
  [owner, treasury, signerW, alice, bob, carol] = [0, 1, 2, 3, 4, 5].map((i) => ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${i}`).connect(provider));
  chainId = (await provider.getNetwork()).chainId;
  usdc = await deploy('MockUSDC');
  feed = await deploy('MockFeed', 2000n * 10n ** 8n);
  token = await deploy('AxtoToken', owner.address, [owner.address], [E(10_000_000)]); // di tes: semua ke owner
  sale = await deploy('AxtoSale', owner.address, await token.getAddress(), await usdc.getAddress(), await feed.getAddress(), treasury.address, signerW.address, owner.address);
  house = await deploy('AxtoAuctionHouse', owner.address, treasury.address, signerW.address, [await usdc.getAddress(), await token.getAddress()], await token.getAddress(), BANK);
  col = await deploy('AxtoCollection', { name: 'AXTO Time', symbol: 'AXTIME', maxSupply: 2_000_000, owner: owner.address, royaltyReceiver: treasury.address, baseURI: 'https://axto.io/api/meta/time/', contractURI: 'https://axto.io/api/contract/time', custody: owner.address, premint: 2_000_000, operator: await house.getAddress(), signer: ethers.ZeroAddress });
  premintRcpt = await provider.getTransactionReceipt(col.deploymentTransaction().hash);
  colEx = await deploy('AxtoCollection', { name: 'AXTO Exclusive Time', symbol: 'AXXTIME', maxSupply: 50_000, owner: owner.address, royaltyReceiver: treasury.address, baseURI: 'https://axto.io/api/meta/ex-time/', contractURI: 'https://axto.io/api/contract/ex-time', custody: ethers.ZeroAddress, premint: 0, operator: ethers.ZeroAddress, signer: signerW.address });
  vest = await deploy('AxtoVesting', await token.getAddress(), owner.address, E(3_000_000));
  lock = await deploy('AxtoLock', await token.getAddress(), treasury.address);
  // distribusi persis seperti skrip deploy
  await (await token.setSale(await sale.getAddress(), owner.address)).wait();
  for (const a of [await house.getAddress(), await vest.getAddress(), await lock.getAddress(), treasury.address]) await (await token.setTrusted(a, true)).wait();
  await (await token.transfer(await vest.getAddress(), E(3_000_000))).wait();
  await (await token.transfer(await lock.getAddress(), E(2_000_000))).wait();
  for (const w of [alice, bob, carol]) await (await usdc.mint(w.address, U(10_000))).wait();
});

test('koin: supply 10 jt tetap; presale menjual lewat allowance 2 jt dari wallet presale', async () => {
  assert.equal(await token.totalSupply(), E(10_000_000));
  // di tes ini pemilik memindahkan sendiri 3 jt (vesting) & 2 jt (kunci) dari walletnya
  assert.equal(await token.balanceOf(owner.address), E(5_000_000));
  assert.equal(await token.balanceOf(await sale.getAddress()), 0n);
  assert.equal(await token.allowance(owner.address, await sale.getAddress()), E(2_000_000));
  assert.equal(token.interface.getFunction('mint'), null);
  assert.equal(token.interface.getFunction('burn'), null);
});

test('presale USDC $10 → koin masuk wallet pembeli, USDC langsung ke treasury', async () => {
  await (await as(usdc, alice).approve(await sale.getAddress(), U(100))).wait();
  const t0 = await usdc.balanceOf(treasury.address);
  await (await as(sale, alice).buyWithUSDC(E(10))).wait();
  assert.equal(await token.balanceOf(alice.address), E(10));
  assert.equal((await usdc.balanceOf(treasury.address)) - t0, U(100));
  assert.equal(await sale.sold(), E(10));
});

test('presale ETH via Chainlink ($2000/ETH → 1 ETH = 200 AXTO), harga basi ditolak', async () => {
  await (await feed.set(2000n * 10n ** 8n, await now())).wait();
  await (await as(sale, bob).buyWithETH(E(199), { value: E(1) })).wait();
  assert.equal(await token.balanceOf(bob.address), E(200));
  await (await feed.set(2000n * 10n ** 8n, (await now()) - 7200)).wait();
  await revert(as(sale, bob).buyWithETH(0, { value: E(1) }));
});

test('beli manual: kirim ETH langsung ke alamat AxtoSale → AXTO masuk ke wallet pengirim, ETH ke treasury', async () => {
  await (await feed.set(2000n * 10n ** 8n, await now())).wait(); // harga segar (tes sebelumnya membuatnya basi)
  const dave = ethers.HDNodeWallet.fromPhrase('test test test test test test test test test test test junk', undefined, "m/44'/60'/0'/0/6").connect(provider);
  const t0 = await provider.getBalance(treasury.address);
  await (await dave.sendTransaction({ to: await sale.getAddress(), value: E('0.05') })).wait(); // $100 pada $2000/ETH
  assert.equal(await token.balanceOf(dave.address), E(10));
  assert.equal((await provider.getBalance(treasury.address)) - t0, E('0.05'));
});

test('sebelum listing DEX: transfer antar-pengguna dikunci', async () => {
  await revert(as(token, alice).transfer(bob.address, E(1)));
  await revert(token.enableTrading()); // presale belum habis & < 365 hari
});

test('voucher PayPal: klaim sekali, batas harian, bisa dibatalkan', async () => {
  const domain = { name: 'AXTO Sale', version: '1', chainId, verifyingContract: await sale.getAddress() };
  const types = { CoinVoucher: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'ref', type: 'bytes32' }, { name: 'deadline', type: 'uint256' }] };
  const v = { to: carol.address, amount: E(5), ref: ethers.id('pp-order-1'), deadline: (await now()) + 3600 };
  const sig = await signerW.signTypedData(domain, types, v);
  await (await as(sale, carol).claimPaid(v.to, v.amount, v.ref, v.deadline, sig)).wait();
  assert.equal(await token.balanceOf(carol.address), E(5));
  await revert(as(sale, carol).claimPaid(v.to, v.amount, v.ref, v.deadline, sig)); // replay
  const v2 = { ...v, amount: E(60_000), ref: ethers.id('pp-order-2') };
  await revert(as(sale, carol).claimPaid(v2.to, v2.amount, v2.ref, v2.deadline, await signerW.signTypedData(domain, types, v2))); // dailyCap
  const v3 = { ...v, ref: ethers.id('pp-order-3') };
  const s3 = await signerW.signTypedData(domain, types, v3);
  await (await as(sale, signerW).cancelVoucher(v3.ref)).wait();
  await revert(as(sale, carol).claimPaid(v3.to, v3.amount, v3.ref, v3.deadline, s3));
  const forged = await alice.signTypedData(domain, types, { ...v, ref: ethers.id('x') });
  await revert(as(sale, alice).claimPaid(v.to, v.amount, ethers.id('x'), v.deadline, forged));
});

async function lot(collection, tokenId, bidder, max, price, opts = {}) {
  const hd = { name: 'AXTO Auction House', version: '1', chainId, verifyingContract: await house.getAddress() };
  const currency = opts.currency ?? (await usdc.getAddress());
  const lotId = ethers.id(opts.lotId ?? `lot-${collection}-${tokenId}`);
  const bid = { lotId, collection, tokenId, currency, maxAmount: max, nonce: opts.nonce ?? BigInt(tokenId), deadline: (await now()) + 86400 * 10 };
  const bidSig = await bidder.signTypedData(hd, BID, bid);
  const res = { lotId, collection, tokenId, winner: opts.winner ?? bidder.address, currency, price, seller: opts.seller ?? ethers.ZeroAddress, mode: opts.mode ?? 1, deadline: (await now()) + 86400 * 2 };
  const resSig = await (opts.resSigner ?? signerW).signTypedData(hd, RESULT, res);
  return { bid, bidSig, res, resSig };
}

test('premint koleksi publik: 2.000.000 token di wallet admin sejak deploy (ERC-2309, maks 5.000 per event), AuctionHouse operatornya', async () => {
  const h = owner.address; // wallet admin (owner) memegang premint → tampil di profil OpenSea pemilik
  assert.equal(await col.isApprovedForAll(h, await house.getAddress()), true);
  assert.equal(await col.balanceOf(h), 2_000_000n);
  assert.equal(await col.totalMinted(), 2_000_000n);
  for (const id of [1, 5000, 5001, 1_234_567, 2_000_000]) assert.equal(await col.ownerOf(id), h);
  await revert(col.ownerOf(2_000_001));
  const topic = col.interface.getEvent('ConsecutiveTransfer').topicHash;
  const evs = premintRcpt.logs.filter((l) => l.topics[0] === topic).map((l) => col.interface.parseLog(l).args);
  assert.equal(evs.length, 400);
  assert.equal(evs[0].fromTokenId, 1n);
  assert.equal(evs[0].toTokenId, 5000n);
  assert.equal(evs[399].toTokenId, 2_000_000n);
  assert.ok(evs.every((e) => e.toAddress === h && e.fromAddress === ethers.ZeroAddress && e.toTokenId - e.fromTokenId < 5000n));
  assert.equal(await col.owner(), owner.address);
  assert.equal(await colEx.signer(), signerW.address);
  assert.equal(await house.currencies(await usdc.getAddress()), true);
  assert.equal(await house.currencies(await token.getAddress()), true);
  console.log(`gas deploy koleksi publik + premint 2 jt: ${premintRcpt.gasUsed}`);
});

test('lelang publik: pemenang klaim (bayar gas sendiri) → USDC ke treasury, NFT pindah dari wallet admin ke pemenang', async () => {
  const c = await col.getAddress();
  await (await as(usdc, alice).approve(await house.getAddress(), U(50))).wait(); // dana tetap di wallet sampai klaim
  const L = await lot(c, 42, alice, U(50), U(1));
  const t0 = await usdc.balanceOf(treasury.address);
  await revert(as(house, bob).claim(L.bid, L.bidSig, L.res, L.resSig)); // bukan pemenang
  assert.equal(await col.ownerOf(42), owner.address);
  await (await as(house, alice).claim(L.bid, L.bidSig, L.res, L.resSig)).wait();
  assert.equal(await col.ownerOf(42), alice.address);
  assert.equal(await col.balanceOf(owner.address), 2_000_000n - 1n);
  assert.equal((await usdc.balanceOf(treasury.address)) - t0, U(1));
  assert.equal(await col.tokenURI(42), 'https://axto.io/api/meta/time/42');
  const [rcv, roy] = await col.royaltyInfo(42, U(100));
  assert.equal(rcv, treasury.address);
  assert.equal(roy, U(10)); // 10%
  await revert(as(house, alice).claim(L.bid, L.bidSig, L.res, L.resSig)); // tidak bisa ganda
});

test('lelang: harga > batas tawaran, attestasi palsu, dan kedaluwarsa ditolak', async () => {
  const c = await col.getAddress();
  const L1 = await lot(c, 43, alice, U(2), U(3));
  await revert(as(house, alice).claim(L1.bid, L1.bidSig, L1.res, L1.resSig));
  const L2 = await lot(c, 44, alice, U(5), U(1), { resSigner: alice });
  await revert(as(house, alice).claim(L2.bid, L2.bidSig, L2.res, L2.resSig));
  const L3 = await lot(c, 45, alice, U(5), U(1));
  await warp(86400 * 3);
  await revert(as(house, alice).claim(L3.bid, L3.bidSig, L3.res, L3.resSig));
});

test('hanya minter resmi yang bisa mint; token premint tidak bisa dicetak ulang; tokenId di luar rentang ditolak', async () => {
  await revert(as(col, alice).mint(alice.address, 1));
  await revert(col.mint(owner.address, 1)); // owner pun bukan minter; token 1 sudah ada
  const c = await col.getAddress();
  await (await as(usdc, bob).approve(await house.getAddress(), U(10))).wait();
  const L = await lot(c, 2_000_001, bob, U(5), U(1));
  await revert(as(house, bob).claim(L.bid, L.bidSig, L.res, L.resSig));
});

test('eksklusif: lelang berbayar AXTO (mode kustodi) + resale 90/10 sebelum listing DEX', async () => {
  const c = await colEx.getAddress();
  const ax = await token.getAddress();
  await (await as(token, alice).approve(await house.getAddress(), E(5))).wait();
  const L = await lot(c, 7, alice, E(1), E('0.1'), { currency: ax, mode: 2 });
  const t0 = await token.balanceOf(treasury.address);
  await (await as(house, alice).claim(L.bid, L.bidSig, L.res, L.resSig)).wait();
  assert.equal((await token.balanceOf(treasury.address)) - t0, E('0.1'));
  assert.equal(await colEx.exists(7), false); // tetap di kustodi axto.io, belum on-chain
  // resale: bob membeli dari alice seharga 1 AXTO → 0,9 ke alice, 0,1 ke bank koin
  await (await as(token, bob).approve(await house.getAddress(), E(1))).wait();
  const R = await lot(c, 7, bob, E(1), E(1), { currency: ax, mode: 2, seller: alice.address, lotId: 'resale-ex-7' });
  const a0 = await token.balanceOf(alice.address);
  const k0 = await token.balanceOf(BANK);
  await (await as(house, bob).claim(R.bid, R.bidSig, R.res, R.resSig)).wait();
  assert.equal((await token.balanceOf(alice.address)) - a0, E('0.9'));
  assert.equal((await token.balanceOf(BANK)) - k0, E('0.1')); // komisi 10% AXTO → bank koin pemilik (#41)
});

test('WD eksklusif: voucher signer → member mint sendiri; voucher sekali pakai', async () => {
  const domain = { name: 'AXTO Exclusive Time', version: '1', chainId, verifyingContract: await colEx.getAddress() };
  const types = { MintVoucher: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'ref', type: 'bytes32' }, { name: 'deadline', type: 'uint256' }] };
  const v = { to: bob.address, tokenId: 7, ref: ethers.id('wd-7'), deadline: (await now()) + 3600 };
  const sig = await signerW.signTypedData(domain, types, v);
  await (await as(colEx, bob).mintWithVoucher(v.to, v.tokenId, v.ref, v.deadline, sig)).wait();
  assert.equal(await colEx.ownerOf(7), bob.address);
  await revert(as(colEx, bob).mintWithVoucher(v.to, v.tokenId, v.ref, v.deadline, sig));
});

test('ERC-721C: antarmuka terdeteksi, validator dipanggil saat transfer', async () => {
  const iface = new ethers.Interface(['function getTransferValidator()', 'function getTransferValidationFunction()', 'function setTransferValidator(address)']);
  let id = 0n;
  for (const f of iface.fragments) id ^= BigInt(f.selector);
  assert.equal(await col.supportsInterface(ethers.toBeHex(id, 4)), true);
  assert.equal(await col.supportsInterface('0x2a55205a'), true); // ERC-2981
  const [sel, isView] = await col.getTransferValidationFunction();
  assert.equal(isView, true);
  assert.equal(sel, ethers.id('validateTransfer(address,address,address,uint256)').slice(0, 10));
});

test('listing DEX setelah 365 hari; vesting tim 10%/tahun; lock 5 tahun', async () => {
  assert.equal(await vest.vested(), 0n);
  await warp(366 * 86400);
  await (await token.enableTrading()).wait();
  await revert(token.enableTrading());
  await (await as(token, alice).transfer(carol.address, E(1))).wait(); // bebas setelah listing
  assert.equal(await vest.vested(), 0n);
  await warp(365 * 86400 + 10);
  assert.equal(await vest.vested(), E(300_000));
  await (await vest.release()).wait();
  await revert(lock.release());
  await warp(4 * 365 * 86400);
  // ganache 7: eth_estimateGas dengan field nonce gagal setelah evm_increaseTime besar (tanpa nonce lolos) → gas eksplisit
  await (await lock.release({ gasLimit: 120_000 })).wait();
  assert.equal(await token.balanceOf(await lock.getAddress()), 0n);
});
