/**
 * Uji mesin listing OpenSea (perintah pemilik #44/#45) di ganache: wallet toko memegang premint, listing dikirim lewat SDK
 * tiruan (tanpa jaringan), penjualan terdeteksi dari Transfer, etalase 5.000 diganti otomatis, hasil jual → treasury.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac, createCipheriv, randomBytes } from 'node:crypto';
import ganache from 'ganache';
import { ethers } from 'ethers';
import { run, usdToEth, TREASURY } from '../opensea-list.mjs';
import { showcaseIds, priceUsd, SHOWCASE_N } from '../../engine/src/showcase.js';

const art = (n) => JSON.parse(readFileSync(new URL(`../../contracts/out/${n}.json`, import.meta.url), 'utf8'));
const seal = (pk) => {
  const key = createHmac('sha256', 'local').update('axto:DEPLOYER_ENC').digest();
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(pk, 'utf8'), c.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') });
};
let server, provider, deployer, store, buyer, col, feed, R2, posted;

before(async () => {
  delete process.env.CLOUDFLARE_API_KEY;
  const mnemonic = 'test test test test test test test test test test test junk';
  server = ganache.server({ logging: { quiet: true }, chain: { chainId: 8453, hardfork: 'shanghai' }, wallet: { mnemonic, totalAccounts: 4, defaultBalance: 100 }, miner: { blockGasLimit: 60_000_000 } });
  await server.listen(18546);
  provider = new ethers.JsonRpcProvider('http://127.0.0.1:18546');
  [deployer, store, buyer] = [0, 1, 2].map((i) => ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${i}`).connect(provider));
  let n = await provider.getTransactionCount(deployer.address, 'latest');
  const f = (name) => new ethers.ContractFactory(art(name).abi, art(name).bytecode, deployer);
  col = await (await f('AxtoCollection').deploy({ name: 'AXTO Time', symbol: 'AXTIME', maxSupply: 2_000_000, owner: deployer.address, royaltyReceiver: TREASURY, baseURI: 'https://axto.io/api/meta/time/', contractURI: 'https://axto.io/api/contract/time', custody: store.address, premint: 2_000_000, operator: '0x1E0049783F008A0085193E00003D00cd54003c71', signer: ethers.ZeroAddress }, { nonce: n++ })).waitForDeployment();
  feed = await (await f('MockFeed').deploy(2500n * 10n ** 8n, { nonce: n++ })).waitForDeployment();
  R2 = { 'axto-nft-data/cfg/opensea-ready.json': JSON.stringify({ ready: true }), 'axto-nft-data/cfg/contracts-8453.json': JSON.stringify({ chainId: 8453, store: store.address, collections: { time: await col.getAddress() } }), 'axto-vault-data/store.enc': seal(store.privateKey) };
  posted = [];
});
after(async () => { await server.close(); });

const io = () => ({
  r2get: (k) => R2[k] ?? null,
  r2put: (k, v) => { R2[k] = v; },
  feed: null,
  fakeListing: { createBulkListings: async ({ listings, accountAddress }) => { posted.push(...listings.map((l) => ({ ...l, accountAddress }))); return { successful: listings, failed: [] }; } },
});

test('USD → ETH dibulatkan ke atas 6 desimal (harga Chainlink 8 desimal)', () => {
  assert.equal(usdToEth(10, 2500n * 10n ** 8n), '0.004');
  assert.equal(usdToEth(25, 3000n * 10n ** 8n), '0.008334');
  assert.equal(usdToEth(1000, 1700n * 10n ** 8n), '0.588236');
});

test('putaran pertama: etalase 5.000 dilisting dulu dengan harga tier, ditandatangani wallet toko, lalu ekor koleksi', async () => {
  const x = io();
  x.feed = await feed.getAddress();
  const r = await run({ io: x, chainId: 8453, rpc: 'http://127.0.0.1:18546', budgetMs: 4000, log: () => {} });
  const show = JSON.parse(R2['axto-nft-data/os/showcase-time.json']);
  assert.equal(show.ids.length, SHOWCASE_N);
  assert.deepEqual(show.ids, showcaseIds('time').ids);
  assert.equal(r.showcase.time, SHOWCASE_N);
  assert.ok(r.made > SHOWCASE_N, `ekor juga dilisting (${r.made})`);
  const first = posted.slice(0, SHOWCASE_N).map((l) => Number(l.asset.tokenId));
  assert.deepEqual(first, show.ids);
  for (const l of posted.slice(0, 50)) {
    assert.equal(l.accountAddress, store.address);
    assert.equal(l.amount, usdToEth(priceUsd('time', Number(l.asset.tokenId)), 2500n * 10n ** 8n));
    assert.ok(l.expirationTime > Date.now() / 1000 + 29 * 86400);
  }
  const status = JSON.parse(R2['axto-nft-data/cfg/opensea.json']);
  assert.equal(status.step, 'berjalan');
  assert.equal(status.store, store.address);
});

test('NFT etalase terjual di OpenSea → diganti calon berikutnya; hasil jual diteruskan ke treasury', async () => {
  const show0 = JSON.parse(R2['axto-nft-data/os/showcase-time.json']).ids;
  const gone = show0[7];
  await (await buyer.sendTransaction({ to: store.address, value: ethers.parseEther('0.01') })).wait(); // hasil jual masuk
  await (await col.connect(store).transferFrom(store.address, buyer.address, gone)).wait(); // seolah dibeli lewat Seaport (di dunia nyata gas dibayar pembeli)
  const bal = async () => BigInt(await provider.send('eth_getBalance', [TREASURY, 'latest'])); // tanpa cache ethers
  const before = await bal();
  posted = [];
  const x = io();
  x.feed = await feed.getAddress();
  const r = await run({ io: x, chainId: 8453, rpc: 'http://127.0.0.1:18546', budgetMs: 1500, log: () => {} });
  const show1 = JSON.parse(R2['axto-nft-data/os/showcase-time.json']);
  assert.equal(show1.ids.length, SHOWCASE_N);
  assert.ok(!show1.ids.includes(gone));
  assert.deepEqual(show1.ids, showcaseIds('time', new Set([gone])).ids);
  const added = show1.ids.filter((id) => !show0.includes(id));
  assert.equal(added.length, 1);
  assert.ok(posted.some((l) => Number(l.asset.tokenId) === added[0]) || r.showcase.time === SHOWCASE_N);
  assert.ok(r.sold.time.includes(gone));
  assert.ok(r.swept && Number(r.swept.eth) > 0.009, JSON.stringify(r.swept));
  const after = await bal();
  assert.ok(after - before > ethers.parseEther('0.009'), `treasury ${ethers.formatEther(before)} → ${ethers.formatEther(after)}`);
});

test('belum ada tanda siap OpenSea dari admin: etalase & penjualan tetap diproses, tetapi tidak ada listing', async () => {
  const saved = R2['axto-nft-data/cfg/opensea-ready.json'];
  delete R2['axto-nft-data/cfg/opensea-ready.json'];
  posted = [];
  const x = io();
  x.feed = await feed.getAddress();
  const r = await run({ io: x, chainId: 8453, rpc: 'http://127.0.0.1:18546', log: () => {} });
  assert.equal(r.waiting, 'opensea_setup');
  assert.equal(posted.length, 0);
  assert.ok(R2['axto-nft-data/os/showcase-time.json']);
  assert.match(JSON.parse(R2['axto-nft-data/cfg/opensea.json']).step, /Creator Studio/);
  R2['axto-nft-data/cfg/opensea-ready.json'] = saved;
});

test('tanpa kontrak aktif: hanya status menunggu, tidak ada listing', async () => {
  const saved = R2['axto-nft-data/cfg/contracts-8453.json'];
  delete R2['axto-nft-data/cfg/contracts-8453.json'];
  posted = [];
  const r = await run({ io: io(), chainId: 8453, rpc: 'http://127.0.0.1:18546', log: () => {} });
  assert.equal(r.waiting, 'contracts');
  assert.equal(posted.length, 0);
  R2['axto-nft-data/cfg/contracts-8453.json'] = saved;
});
