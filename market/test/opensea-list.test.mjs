/**
 * Uji mesin listing OpenSea (desain akhir 23 Nov 2026: edisi 1–10, harga tetap $1–$10.000, tanpa lelang) di ganache:
 * wallet toko memegang edisi yang dirilis kontrak AxtoEditions, listing dikirim lewat SDK tiruan (tanpa jaringan),
 * stok dibaca dari saldo on-chain, karya habis hilang dari etalase, stok menipis → rilis otomatis, hasil jual → treasury
 * dari R2 privat.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac, createCipheriv, randomBytes } from 'node:crypto';
import ganache from 'ganache';
import { ethers } from 'ethers';
import { run, usdToEth, usdToWei, listingFor, RELEASE_LOW, RELEASE_STEP } from '../opensea-list.mjs';
import { edition, designOf, releaseSupplies, BANDS } from '../../engine/src/editions.js';

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
const FIRST = RELEASE_LOW + 50; // rilis awal kecil agar tes cepat (produksi: 5.000)
let server, provider, deployer, store, buyer, col, feed, R2, posted;

before(async () => {
  delete process.env.CLOUDFLARE_API_KEY;
  const mnemonic = 'test test test test test test test test test test test junk';
  server = ganache.server({ logging: { quiet: true }, chain: { chainId: 8453, hardfork: 'shanghai' }, wallet: { mnemonic, totalAccounts: 4, defaultBalance: 100 }, miner: { blockGasLimit: 120_000_000 } });
  await server.listen(18546);
  provider = new ethers.JsonRpcProvider('http://127.0.0.1:18546');
  [deployer, store, buyer] = [0, 1, 2].map((i) => ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${i}`).connect(provider));
  let n = await provider.getTransactionCount(deployer.address, 'latest');
  const f = (name) => new ethers.ContractFactory(art(name).abi, art(name).bytecode, deployer);
  col = await (await f('AxtoEditions').deploy({ name: 'AXTO Time', symbol: 'AXTIME', owner: buyer.address, royaltyReceiver: TREASURY, baseURI: 'https://axto.io/api/edition/time/', contractURI: 'https://axto.io/api/contract/time', custody: store.address, operator: CONDUIT, releaser: deployer.address, signer: ethers.ZeroAddress, maxId: 10_000_000, editionCap: 0 }, { nonce: n++ })).waitForDeployment();
  for (let from = 1; from <= FIRST; from += 2500) await (await col.release(releaseSupplies('time', from, Math.min(2500, FIRST - from + 1)), { nonce: n++ })).wait();
  feed = await (await f('MockFeed').deploy(2500n * 10n ** 8n, { nonce: n++ })).waitForDeployment();
  const cfg = JSON.stringify({ chainId: 8453, standard: 'erc1155', released: { time: FIRST }, store: store.address, collections: { time: await col.getAddress() } });
  R2 = {
    'axto-nft-data/cfg/contracts-8453.json': cfg,
    'axto-nft-data/cfg/active.json': cfg,
    'axto-vault-data/store.enc': seal(store.privateKey),
    'axto-vault-data/deployer.enc': seal(deployer.privateKey),
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
const go = async (extra = {}) => { const x = io(); x.feed = await feed.getAddress(); return run({ io: x, chainId: 8453, rpc: 'http://127.0.0.1:18546', log: () => {}, ...extra }); };

test('USD → ETH dibulatkan ke atas 6 desimal; harga total habis dibagi jumlah edisi (beli sebagian sah)', () => {
  assert.equal(usdToEth(10, 2500n * 10n ** 8n), '0.004');
  assert.equal(usdToEth(25, 3000n * 10n ** 8n), '0.008334');
  assert.equal(usdToEth(1000, 1700n * 10n ** 8n), '0.588236');
  const l = listingFor('time', '0x' + '11'.repeat(20), 3, 7, 3000n * 10n ** 8n, 1);
  const wei = ethers.parseEther(l.amount);
  assert.equal(wei % 7n, 0n);
  assert.equal(wei / 7n, usdToWei(edition('time', designOf('time', 3)).priceUsd, 3000n * 10n ** 8n));
  for (const bps of [50n, 100n, 250n, 1000n]) assert.equal(((wei * bps) / 10_000n) % 7n, 0n, `biaya ${bps} bps tetap bulat per satuan`);
});

test('putaran pertama: semua karya rilis dilisting harga tetap, quantity = edisi, ditandatangani wallet toko', async () => {
  const r = await go({ budgetMs: 60_000 });
  const show = JSON.parse(R2['axto-nft-data/os/showcase-time.json']);
  assert.equal(show.released, FIRST);
  assert.equal(show.available, FIRST);
  assert.equal(show.ids.length, Math.min(FIRST, 5000));
  assert.deepEqual(show.ids.slice(0, 20), Array.from({ length: 20 }, (_, i) => designOf('time', i + 1)));
  assert.equal(r.made, FIRST);
  assert.equal(r.collections.time.soldUnits, 0);
  assert.deepEqual(r.releasedNow, {});
  for (const l of posted.slice(0, 60)) {
    const k = Number(l.asset.tokenId);
    const e = edition('time', designOf('time', k));
    assert.equal(l.accountAddress, store.address);
    assert.equal(l.quantity, e.supply);
    assert.equal(l.amount, ethers.formatEther(usdToWei(e.priceUsd, 2500n * 10n ** 8n) * BigInt(e.supply)));
    assert.ok(BANDS[e.rank].price.includes(e.priceUsd));
    assert.ok(l.expirationTime > Date.now() / 1000 + 29 * 86400);
    assert.equal(l.priceUsd, undefined, 'hanya parameter SDK yang dikirim');
  }
  const status = JSON.parse(R2['axto-nft-data/cfg/opensea.json']);
  assert.equal(status.step, 'berjalan');
  assert.equal(status.store, store.address);
  assert.equal(status.listedTotal, FIRST);
  // putaran berikutnya: tidak ada yang perlu diperbarui
  posted = [];
  assert.equal((await go()).made, 0);
});

test('terjual di OpenSea: edisi berkurang, karya habis keluar dari etalase, stok menipis → rilis otomatis, hasil jual → treasury', async () => {
  await (await buyer.sendTransaction({ to: store.address, value: ethers.parseEther('0.05') })).wait(); // gas uji (di dunia nyata dibayar pembeli)
  const C = col.connect(store);
  let sn = await provider.getTransactionCount(store.address, 'latest'); // nonce eksplisit (cache RPC ethers 250 ms)
  const k1 = 1; const s1 = edition('time', designOf('time', k1)).supply;
  const k2 = 2; const s2 = edition('time', designOf('time', k2)).supply;
  await (await C.safeTransferFrom(store.address, buyer.address, k1, s1, '0x', { nonce: sn++ })).wait(); // habis
  await (await C.safeTransferFrom(store.address, buyer.address, k2, 1, '0x', { nonce: sn++ })).wait(); // terjual 1 edisi
  // habiskan 60 karya lagi agar tersedia < RELEASE_LOW → rilis berikutnya
  const ids = []; const amts = [];
  for (let k = 3; k <= 62; k += 1) { ids.push(k); amts.push(edition('time', designOf('time', k)).supply); }
  await (await C.safeBatchTransferFrom(store.address, buyer.address, ids, amts, '0x', { nonce: sn++ })).wait();
  await (await buyer.sendTransaction({ to: store.address, value: ethers.parseEther('0.01') })).wait(); // hasil jual masuk
  const bal = async (a) => BigInt(await provider.send('eth_getBalance', [a, 'latest']));
  const before = await bal(TREASURY);
  posted = [];
  const r = await go({ budgetMs: 60_000 });
  assert.equal(r.releasedNow.time, RELEASE_STEP);
  assert.equal(Number(await col.released()), FIRST + RELEASE_STEP);
  const show = JSON.parse(R2['axto-nft-data/os/showcase-time.json']);
  assert.equal(show.released, FIRST + RELEASE_STEP);
  assert.equal(show.available, FIRST + RELEASE_STEP - 61);
  assert.ok(!show.ids.includes(designOf('time', k1)), 'karya habis keluar dari etalase');
  assert.ok(show.ids.includes(designOf('time', k2)), 'karya tersisa tetap di etalase');
  assert.equal(r.collections.time.soldUnits, s1 + 1 + amts.reduce((a, b) => a + b, 0));
  // karya baru langsung dilisting; karya lama tidak dilisting ulang (order Seaport menerima beli sebagian)
  assert.equal(posted.length, RELEASE_STEP);
  assert.ok(posted.every((l) => Number(l.asset.tokenId) > FIRST));
  // jumlah rilis tercatat untuk worker (peta karya → token id)
  assert.equal(JSON.parse(R2['axto-nft-data/cfg/active.json']).released.time, FIRST + RELEASE_STEP);
  assert.equal(JSON.parse(R2['axto-nft-data/cfg/contracts-8453.json']).released.time, FIRST + RELEASE_STEP);
  assert.ok(r.swept && Number(r.swept.eth) > 0.009, JSON.stringify(r.swept));
  assert.ok((await bal(TREASURY)) - before > ethers.parseEther('0.009'));
});

test('admin menjeda listing: stok & etalase tetap diproses, tidak ada listing baru', async () => {
  R2['axto-nft-data/cfg/opensea-pause.json'] = JSON.stringify({ paused: true });
  posted = [];
  const r = await go();
  assert.equal(r.waiting, 'paused');
  assert.equal(posted.length, 0);
  assert.ok(R2['axto-nft-data/os/showcase-time.json']);
  assert.match(JSON.parse(R2['axto-nft-data/cfg/opensea.json']).step, /dijeda/);
  delete R2['axto-nft-data/cfg/opensea-pause.json'];
});

test('tanpa kontrak edisi aktif: hanya status menunggu, tidak ada listing', async () => {
  const saved = R2['axto-nft-data/cfg/contracts-8453.json'];
  delete R2['axto-nft-data/cfg/contracts-8453.json'];
  posted = [];
  assert.equal((await go()).waiting, 'contracts');
  R2['axto-nft-data/cfg/contracts-8453.json'] = JSON.stringify({ ...JSON.parse(saved), standard: 'erc721' });
  assert.equal((await go()).waiting, 'standard');
  assert.equal(posted.length, 0);
  R2['axto-nft-data/cfg/contracts-8453.json'] = saved;
});
