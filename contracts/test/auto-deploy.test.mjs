/**
 * Uji deploy otomatis sistem (perintah pemilik #31): seluruh urutan di ganache, kepemilikan langsung ke wallet pemilik,
 * koleksi publik tercetak penuh ke kustodi, distribusi koin 20/30/30/20, deployer tanpa hak sesudahnya, gas ≤ anggaran.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ganache from 'ganache';
import { ethers } from 'ethers';

const ADMIN = '0x38Cd3F76a132f70b12C9E4ea6aDAFaCF62483166';
const COIN = '0x6918A3C9a58E71B3bca993e8cDD2630D2DDB6469';
const TREASURY = '0xDC39C04E704b1fec2BE648c49c842B2B17AfEBDA';
const art = (n) => JSON.parse(readFileSync(new URL(`../out/${n}.json`, import.meta.url), 'utf8'));
let server, provider, deployer, signerW, result, mod;

before(async () => {
  const mnemonic = 'test test test test test test test test test test test junk';
  server = ganache.server({ logging: { quiet: true }, chain: { chainId: 8453, hardfork: 'shanghai' }, wallet: { mnemonic, totalAccounts: 3, defaultBalance: 100 }, miner: { blockGasLimit: 60_000_000 } });
  await server.listen(18545);
  provider = new ethers.JsonRpcProvider('http://127.0.0.1:18545');
  deployer = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/0").connect(provider);
  signerW = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/1");
  const usdc = await (await new ethers.ContractFactory(art('MockUSDC').abi, art('MockUSDC').bytecode, deployer).deploy()).waitForDeployment();
  const feed = await (await new ethers.ContractFactory(art('MockFeed').abi, art('MockFeed').bytecode, deployer).deploy(2000n * 10n ** 8n, { nonce: await provider.getTransactionCount(deployer.address, 'latest') })).waitForDeployment();
  Object.assign(process.env, { LOCAL_RPC: 'http://127.0.0.1:18545', LOCAL_KEY: deployer.privateKey, SIGNER: signerW.address, LOCAL_USDC: await usdc.getAddress(), LOCAL_FEED: await feed.getAddress() });
  mod = await import('../scripts/auto-deploy.mjs');
  result = await mod.main();
});
after(async () => { await server.close(); });

test('urutan lengkap selesai; gas di bawah anggaran yang dipakai untuk menghitung kebutuhan ETH', () => {
  assert.equal(result.done, true);
  console.log(`gas total deploy otomatis: ${result.gasUsed}`);
  assert.ok(result.gasUsed <= mod.TOTAL_GAS, `gas ${result.gasUsed} > anggaran ${mod.TOTAL_GAS}`);
});

test('kepemilikan langsung ke pemilik: AuctionHouse + 7 koleksi → admin, AxtoSale + AxtoToken → wallet koin', async () => {
  const own = async (a) => new ethers.Contract(a, ['function owner() view returns (address)'], provider).owner();
  const c = result.contracts;
  assert.equal(await own(c.auctionHouse), ADMIN);
  for (const a of Object.values(c.collections)) assert.equal(await own(a), ADMIN);
  assert.equal(await own(c.sale), COIN);
  assert.equal(await own(c.token), COIN);
});

test('koleksi publik tercetak penuh ke wallet admin (profil OpenSea pemilik), AuctionHouse operatornya; eksklusif kosong dengan signer vault', async () => {
  const c = result.contracts;
  for (const k of ['time', 'stamp', 'quran', 'model']) {
    const col = new ethers.Contract(c.collections[k], art('AxtoCollection').abi, provider);
    assert.equal(await col.balanceOf(ADMIN), 2_000_000n, k);
    assert.equal(await col.ownerOf(2_000_000), ADMIN, k);
    assert.equal(await col.isApprovedForAll(ADMIN, c.auctionHouse), true, k);
  }
  for (const k of ['ex-time', 'ex-stamp', 'ex-quran']) {
    const col = new ethers.Contract(c.collections[k], art('AxtoCollection').abi, provider);
    assert.equal(await col.totalMinted(), 0n, k);
    assert.equal(await col.signer(), signerW.address, k);
  }
  const house = new ethers.Contract(c.auctionHouse, art('AxtoAuctionHouse').abi, provider);
  assert.equal(await house.currencies(c.token), true);
  assert.equal(await house.currencies(process.env.LOCAL_USDC), true);
});

test('koin 10 jt: presale 2 jt, vesting 3 jt, kunci 2 jt, cadangan DEX 3 jt di wallet koin; deployer 0 & tidak tepercaya', async () => {
  const c = result.contracts;
  const t = new ethers.Contract(c.token, art('AxtoToken').abi, provider);
  const E = (n) => ethers.parseEther(String(n));
  assert.equal(await t.balanceOf(c.sale), E(2_000_000));
  assert.equal(await t.balanceOf(c.vesting), E(3_000_000));
  assert.equal(await t.balanceOf(c.lock), E(2_000_000));
  assert.equal(await t.balanceOf(COIN), E(3_000_000));
  assert.equal(await t.balanceOf(result.deployer), 0n);
  assert.equal(await t.trusted(result.deployer), false);
  assert.equal(await t.sale(), c.sale);
  for (const a of [c.auctionHouse, c.vesting, c.lock, TREASURY, COIN]) assert.equal(await t.trusted(a), true);
});

test('aman diulang: run kedua tidak mendeploy apa pun lagi', async () => {
  const n0 = await provider.getTransactionCount(result.deployer, 'latest');
  const again = await mod.main();
  assert.equal(again.done, true);
  assert.equal(await provider.getTransactionCount(result.deployer, 'latest'), n0);
});
