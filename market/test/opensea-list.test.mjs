/**
 * Uji mesin listing OpenSea (keputusan pemilik 24 Nov 2026: 10 koleksi ERC-721 × 10 juta karya, edisi 1 tercetak saat
 * deploy, edisi berikutnya otomatis saat laku, harga tetap $1–$250, tanpa lelang) di ganache: kontrak AxtoCollection
 * sungguhan dengan premint 10 juta, listing lewat SDK tiruan (tanpa jaringan), penjualan dibaca dari event Transfer,
 * edisi berikutnya dicetak wallet toko, karya habis diganti calon berikutnya, hasil jual → treasury dari R2 privat.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac, createCipheriv, randomBytes } from 'node:crypto';
import ganache from 'ganache';
import { ethers } from 'ethers';
import { run, usdToEth, usdToWei, listingFor, RESERVE } from '../opensea-list.mjs';
import { tokenOf, tokenInfo, WORKS } from '../../engine/src/opensea.js';
import { showcaseCandidate } from '../../engine/src/showcase.js';

const art = (n) => JSON.parse(readFileSync(new URL(`../../contracts/out/${n}.json`, import.meta.url), 'utf8'));
const seal = (pk) => {
  const key = createHmac('sha256', 'local').update('axto:DEPLOYER_ENC').digest();
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(pk, 'utf8'), c.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') });
};
const TREASURY = '0x' + '7e'.repeat(20); // fiktif — alamat asli hanya ada di R2 privat
const CONDUIT = '0x1E0049783F008A0085193E00003D00cd54003c71';
const WIN = 40; // karya terlisting per koleksi di uji (produksi 5.000)
let server, provider, deployer, store, buyer, col, gcol, feed, R2, posted;

before(async () => {
  delete process.env.CLOUDFLARE_API_KEY;
  const mnemonic = 'test test test test test test test test test test test junk';
  server = ganache.server({ logging: { quiet: true }, chain: { chainId: 8453, hardfork: 'shanghai' }, wallet: { mnemonic, totalAccounts: 4, defaultBalance: 100 }, miner: { blockGasLimit: 120_000_000 } });
  await server.listen(18546);
  provider = new ethers.JsonRpcProvider('http://127.0.0.1:18546');
  [deployer, store, buyer] = [0, 1, 2].map((i) => ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${i}`).connect(provider));
  const f = new ethers.ContractFactory(art('AxtoCollection').abi, art('AxtoCollection').bytecode, deployer);
  const cfg721 = (k, name, sym) => ({ name, symbol: sym, maxSupply: WORKS * 10, owner: buyer.address, royaltyReceiver: TREASURY, baseURI: `https://axto.io/api/token/${k}/`, contractURI: `https://axto.io/api/contract/${k}`, custody: store.address, premint: WORKS, operator: CONDUIT, signer: ethers.ZeroAddress, minter: store.address, editionStride: WORKS, validator: ethers.ZeroAddress, operators: [] });
  col = await (await f.deploy(cfg721('time', 'AXTO Time', 'AXTIME'), { gasLimit: 30_000_000 })).waitForDeployment();
  gcol = await (await f.deploy(cfg721('g-time', 'AXTO G- Time', 'AXGTIME'), { gasLimit: 30_000_000 })).waitForDeployment();
  feed = await (await new ethers.ContractFactory(art('MockFeed').abi, art('MockFeed').bytecode, deployer).deploy(2500n * 10n ** 8n)).waitForDeployment();
  const cfg = JSON.stringify({ chainId: 8453, standard: 'erc721-editions', works: WORKS, store: store.address, collections: { time: await col.getAddress(), 'g-time': await gcol.getAddress() } });
  R2 = {
    'axto-nft-data/cfg/contracts-8453.json': cfg,
    'axto-nft-data/cfg/active.json': cfg,
    'axto-vault-data/store.enc': seal(store.privateKey),
    'axto-nft-data/private/config.json': JSON.stringify({ wallets: { treasury: TREASURY } }),
  };
  posted = [];
});
after(async () => { await server.close(); });

const io = () => ({
  r2get: (k) => R2[k] ?? null,
  r2put: (k, v) => { R2[k] = v; },
  feed: null,
  fakeListing: { createBulkListings: async ({ listings, accountAddress }) => { posted.push(...listings.map((l) => ({ ...l, accountAddress }))); return { successful: listings, failed: [] }; } },
});
const go = async (extra = {}) => { const x = io(); x.feed = await feed.getAddress(); return run({ io: x, chainId: 8453, rpc: 'http://127.0.0.1:18546', log: () => {}, window: WIN, ...extra }); };
const winWorks = (n = WIN) => Array.from({ length: n }, (_, i) => showcaseCandidate('time', i));

test('USD → ETH dibulatkan ke atas 6 desimal; listing ERC-721 satu token, harga dari edisi karyanya', () => {
  assert.equal(usdToEth(10, 2500n * 10n ** 8n), '0.004');
  assert.equal(usdToEth(25, 3000n * 10n ** 8n), '0.008334');
  assert.equal(usdToEth(1000, 1700n * 10n ** 8n), '0.588236');
  const t = tokenOf(42, 1);
  const l = listingFor('g-quran', '0x' + '11'.repeat(20), t, 3000n * 10n ** 8n, 1);
  assert.deepEqual(l.asset, { tokenAddress: '0x' + '11'.repeat(20), tokenId: String(t) });
  assert.equal(ethers.parseEther(l.amount), usdToWei(tokenInfo('g-quran', t).priceUsd, 3000n * 10n ** 8n));
  assert.throws(() => listingFor('time', '0x' + '11'.repeat(20), 0, 3000n * 10n ** 8n, 1));
});

test('putaran pertama: edisi 1 karya etalase (urutan acak) dilisting harga tetap di kedua koleksi, ditandatangani wallet toko', async () => {
  const r = await go({ budgetMs: 60_000 });
  assert.equal(r.made, WIN * 2);
  const show = JSON.parse(R2['axto-nft-data/os/showcase-time.json']);
  assert.deepEqual(show.ids, winWorks());
  assert.equal(R2['axto-nft-data/os/showcase-g-time.json'], undefined, 'etalase situs hanya untuk koleksi publik');
  const mine = posted.filter((p) => p.asset.tokenAddress === col.target);
  assert.deepEqual(mine.map((p) => Number(p.asset.tokenId)), winWorks().map((w) => tokenOf(w, 1)));
  assert.ok(posted.every((p) => p.accountAddress === store.address && Number(p.amount) > 0));
  assert.equal(JSON.parse(R2['axto-nft-data/cfg/opensea.json']).step, 'berjalan');
  posted.length = 0;
  assert.equal((await go()).made, 0, 'putaran berikutnya tidak melisting ulang');
});

test('laku di OpenSea: edisi berikutnya dicetak & dilisting; karya yang edisi terakhirnya laku diganti calon berikutnya', async () => {
  const works = winWorks();
  const multi = works.find((w) => tokenInfo('time', tokenOf(w, 1)).supply >= 2);
  // karya dengan edisi 1 saja (Mahakarya) — bila tidak ada di etalase uji, pakai edisi terakhir karya multi
  const single = works.find((w) => tokenInfo('time', tokenOf(w, 1)).supply === 1);
  const asStore = col.connect(store);
  await (await asStore.transferFrom(store.address, buyer.address, tokenOf(multi, 1))).wait(); // seperti eksekusi order OpenSea
  if (single) await (await asStore.transferFrom(store.address, buyer.address, tokenOf(single, 1))).wait();
  await buyer.sendTransaction({ to: store.address, value: ethers.parseEther('0.01') }); // hasil penjualan masuk wallet toko
  posted.length = 0;
  const r = await go({ budgetMs: 60_000 });
  assert.equal(r.sold.time, single ? 2 : 1);
  assert.equal(r.minted.time, 1);
  assert.equal(await col.ownerOf(tokenOf(multi, 2)), store.address, 'edisi 2 tercetak ke wallet toko');
  const ids = posted.filter((p) => p.asset.tokenAddress === col.target).map((p) => Number(p.asset.tokenId));
  assert.ok(ids.includes(tokenOf(multi, 2)), 'edisi 2 langsung dilisting');
  const show = JSON.parse(R2['axto-nft-data/os/showcase-time.json']);
  if (single) {
    assert.ok(!show.ids.includes(single), 'karya habis keluar dari etalase');
    assert.equal(show.ids.length, WIN);
    assert.ok(ids.includes(tokenOf(showcaseCandidate('time', WIN), 1)), 'diganti calon berikutnya');
  }
  // hasil penjualan → treasury, cadangan gas cetak tetap di wallet toko
  assert.ok(r.swept && Number(r.swept.eth) > 0);
  const left = await provider.getBalance(store.address);
  assert.ok(left >= RESERVE && left < RESERVE + ethers.parseEther('0.001'), `sisa ${ethers.formatEther(left)}`);
});

test('edisi terakhir: tidak ada edisi ke-(supply+1); admin menjeda listing; tanpa kontrak ERC-721 hanya menunggu', async () => {
  const works = winWorks();
  const w = works.find((x) => tokenInfo('time', tokenOf(x, 1)).supply === 2 || tokenInfo('time', tokenOf(x, 1)).supply === 3);
  if (w) {
    const s = tokenInfo('time', tokenOf(w, 1)).supply;
    const asStore = col.connect(store);
    for (let e = 1; e <= s; e += 1) {
      if (!(await col.exists(tokenOf(w, e)))) await go();
      await (await asStore.transferFrom(store.address, buyer.address, tokenOf(w, e))).wait();
      await (await buyer.sendTransaction({ to: store.address, value: ethers.parseEther('0.01') })).wait(); // hasil jual = gas cetak
    }
    await go();
    assert.equal(await col.exists(tokenOf(w, s + 1)), false, 'tidak melebihi jumlah edisi karya');
    assert.ok(!JSON.parse(R2['axto-nft-data/os/showcase-time.json']).ids.includes(w));
  }
  R2['axto-nft-data/cfg/opensea-pause.json'] = JSON.stringify({ paused: true });
  posted.length = 0;
  assert.equal((await go()).waiting, 'paused');
  assert.equal(posted.length, 0);
  delete R2['axto-nft-data/cfg/opensea-pause.json'];
  const old = R2['axto-nft-data/cfg/contracts-8453.json'];
  R2['axto-nft-data/cfg/contracts-8453.json'] = JSON.stringify({ ...JSON.parse(old), standard: 'erc1155' });
  assert.equal((await go()).waiting, 'standard');
  R2['axto-nft-data/cfg/contracts-8453.json'] = old;
});

test('hadiah staking koin AXTO: wallet toko mengirim NFT hadiah dengan transferBatch (gas oleh axto.io), batch tercatat sekali', async () => {
  const d2 = deployer.connect(new ethers.JsonRpcProvider('http://127.0.0.1:18546', undefined, { cacheTimeout: -1 })); // nonce segar
  const f = new ethers.ContractFactory(art('AxtoCollection').abi, art('AxtoCollection').bytecode, d2);
  const scfg = { name: 'AXTO Staking', symbol: 'AXSTAKE', maxSupply: 500, owner: buyer.address, royaltyReceiver: TREASURY, baseURI: 'https://axto.io/api/token/stake/', contractURI: 'https://axto.io/api/contract/stake', custody: store.address, premint: 100, operator: ethers.ZeroAddress, signer: ethers.ZeroAddress, minter: store.address, editionStride: 0, validator: ethers.ZeroAddress, operators: [] };
  const scol = await (await f.deploy(scfg, { gasLimit: 30_000_000 })).waitForDeployment();
  const c = JSON.parse(R2['axto-nft-data/cfg/contracts-8453.json']);
  c.collections.stake = await scol.getAddress();
  R2['axto-nft-data/cfg/contracts-8453.json'] = JSON.stringify(c);
  await (await d2.sendTransaction({ to: store.address, value: ethers.parseEther('0.05') })).wait(); // hasil penjualan = dana gas
  const member = ethers.Wallet.createRandom().address;
  const queue = [{ id: 'abc12345', payout: member, tier: 'classic', offset: 0, ids: [5, 9, 77] }];
  const sent = [];
  const stakeApi = async (method, path, body) => {
    if (method === 'GET' && path === '/internal/stake/kirim') return { items: queue.splice(0) };
    if (method === 'POST' && path === '/internal/stake/terkirim') { sent.push(body); return { ok: true }; }
    throw new Error(`tak terduga ${method} ${path}`);
  };
  const x = io(); x.feed = await feed.getAddress(); x.stakeApi = stakeApi;
  await run({ io: x, chainId: 8453, rpc: 'http://127.0.0.1:18546', log: () => {}, window: WIN, budgetMs: 60_000 });
  for (const id of [5, 9, 77]) assert.equal(await scol.ownerOf(id), member);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].count, 3);
  assert.match(sent[0].tx, /^0x[0-9a-f]{64}$/);
  // batch yang sudah terkirim tetapi belum tercatat: dicatat tanpa transaksi baru
  queue.push({ id: 'abc12345', payout: member, tier: 'classic', offset: 0, ids: [5, 9, 77] });
  const x2 = io(); x2.feed = await feed.getAddress(); x2.stakeApi = stakeApi;
  await run({ io: x2, chainId: 8453, rpc: 'http://127.0.0.1:18546', log: () => {}, window: WIN, budgetMs: 60_000 });
  assert.equal(sent.length, 2);
  assert.equal(sent[1].tx, null);
  assert.equal(await scol.isApprovedForAll(store.address, CONDUIT), false, 'koleksi staking tidak pernah disetujui konduit OpenSea');
});
