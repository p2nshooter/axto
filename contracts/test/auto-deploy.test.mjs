/**
 * Uji deploy otomatis sistem (perintah pemilik #31): seluruh urutan di ganache, kepemilikan langsung ke wallet pemilik,
 * 10 koleksi OpenSea ERC-721 (5 publik + 5 seri G-) dengan EDISI 1 dari 10 juta karya tercetak ke wallet toko, edisi
 * berikutnya oleh wallet toko, distribusi koin 20/30/30/20, deployer tanpa hak sesudahnya, gas ≤ anggaran (pemilik
 * 24 Nov 2026: dana deploy hanya ±0,0015 ETH).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ganache from 'ganache';
import { ethers } from 'ethers';
import { tokenOf, tokenInfo, OS_KEYS } from '../../engine/src/opensea.js';

const ADMIN = '0x38Cd3F76a132f70b12C9E4ea6aDAFaCF62483166';
const COIN = '0x6918A3C9a58E71B3bca993e8cDD2630D2DDB6469';
const TREASURY = '0xDC39C04E704b1fec2BE648c49c842B2B17AfEBDA';
const PRESALE_W = '0x114aa45B77f06C07B6Ee0aB03F89FAdaCDc6614C';
const VESTING_W = '0x61A0CD9c14EDF48948E39144cc5d8aB4e8A17c62';
const HOLD_W = '0xeef8b1c3BDE202A77Fe3B24d1f43EbA10498a94c';
const art = (n) => JSON.parse(readFileSync(new URL(`../out/${n}.json`, import.meta.url), 'utf8'));
let server, provider, deployer, signerW, storeW, result, mod, validator;
const BUYBACK = '0x000000000000000000000000000000000000bEEF'; // contoh fiktif (alamat asli hanya di R2 privat)

before(async () => {
  const mnemonic = 'test test test test test test test test test test test junk';
  server = ganache.server({ logging: { quiet: true }, chain: { chainId: 8453, hardfork: 'shanghai' }, wallet: { mnemonic, totalAccounts: 4, defaultBalance: 100 }, miner: { blockGasLimit: 120_000_000 } });
  await server.listen(18545);
  provider = new ethers.JsonRpcProvider('http://127.0.0.1:18545');
  deployer = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/0").connect(provider);
  signerW = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/1");
  storeW = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/2");
  // validator royalti tiruan (perilaku v3: daftar putih operator + OTC) — di Base dipakai validator Limit Break asli
  const mv = await (await new ethers.ContractFactory(art('MockTransferValidator').abi, art('MockTransferValidator').bytecode, deployer).deploy()).waitForDeployment();
  validator = await mv.getAddress();
  Object.assign(process.env, { LOCAL_RPC: 'http://127.0.0.1:18545', LOCAL_KEY: deployer.privateKey, LOCAL_STORE_KEY: storeW.privateKey, SIGNER: signerW.address, LOCAL_BUYBACK: BUYBACK, LOCAL_VALIDATOR: validator });
  mod = await import('../scripts/auto-deploy.mjs');
  result = await mod.main();
});
after(async () => { await server.close(); });

test('urutan lengkap selesai; gas di bawah anggaran yang dipakai untuk menghitung kebutuhan ETH', () => {
  assert.equal(result.done, true);
  console.log(`gas total deploy otomatis: ${result.gasUsed}`);
  assert.ok(result.gasUsed <= mod.TOTAL_GAS, `gas ${result.gasUsed} > anggaran ${mod.TOTAL_GAS}`);
});

test('kepemilikan langsung ke pemilik: 15 koleksi → admin, AxtoToken → wallet koin; tanpa AuctionHouse/AxtoSale', async () => {
  const own = async (a) => new ethers.Contract(a, ['function owner() view returns (address)'], provider).owner();
  const c = result.contracts;
  assert.equal(Object.keys(c.collections).length, 15);
  for (const a of Object.values(c.collections)) assert.equal(await own(a), ADMIN);
  assert.equal(await own(c.token), COIN);
  assert.equal(c.standard, 'erc721-editions');
  assert.equal(c.works, 10_000_000);
  assert.equal(c.auctionHouse, undefined);
  assert.equal(c.sale, undefined);
});

test('10 koleksi OpenSea: edisi 1 dari 10 juta karya tercetak ke wallet toko (100 juta NFT); edisi berikutnya urut oleh wallet toko; konduit & royalti', async () => {
  const c = result.contracts;
  assert.equal(c.store, storeW.address);
  assert.deepEqual(OS_KEYS, ['time', 'stamp', 'quran', 'model', 'hadith', 'g-time', 'g-stamp', 'g-quran', 'g-model', 'g-hadith']);
  let total = 0n;
  for (const k of OS_KEYS) {
    const col = new ethers.Contract(c.collections[k], art('AxtoCollection').abi, provider);
    assert.equal(await col.balanceOf(storeW.address), 10_000_000n, k);
    total += await col.balanceOf(storeW.address);
    for (const id of [1, 5_000, 5_001, 9_999_999, 10_000_000]) assert.equal(await col.ownerOf(id), storeW.address, `${k} #${id}`);
    await assert.rejects(col.ownerOf(10_000_001), k); // edisi 2 belum dicetak
    assert.equal(await col.maxSupply(), 100_000_000n, k);
    assert.equal(await col.isApprovedForAll(storeW.address, mod.OPENSEA_CONDUIT), true, k);
    assert.equal(await col.minters(storeW.address), true, k);
    assert.equal(await col.tokenURI(7), `https://axto.io/api/token/${k}/7`);
    const [recv, roy] = await col.royaltyInfo(1, 10_000n);
    assert.equal(recv, TREASURY);
    assert.equal(roy, 1000n);
    assert.equal(await col.getTransferValidator(), validator, `${k}: royalti ditegakkan sejak deploy`);
  }
  assert.equal(total, 100_000_000n, '100 juta NFT langsung ada di OpenSea');
  // karya yang punya ≥ 2 edisi: edisi 2 dicetak wallet toko setelah edisi 1 laku
  const col = new ethers.Contract(c.collections.quran, art('AxtoCollection').abi, storeW.connect(provider));
  let k = 1;
  while (tokenInfo('quran', tokenOf(k, 1)).supply < 2) k += 1;
  const t2 = tokenOf(k, 2);
  assert.equal(tokenInfo('quran', t2).edition, 2);
  await (await col.mintBatch(storeW.address, [t2])).wait();
  assert.equal(await col.ownerOf(t2), storeW.address);
  await assert.rejects(col.mintBatch(storeW.address, [tokenOf(k + 1, 3)])); // edisi 3 tanpa edisi 2 ditolak
  // marketplace di luar daftar pembayar royalti tidak bisa memindahkan NFT wallet toko
  const rogue = ethers.HDNodeWallet.fromPhrase('test test test test test test test test test test test junk', undefined, "m/44'/60'/0'/0/1").connect(provider);
  await (await col.setApprovalForAll(rogue.address, true)).wait();
  await assert.rejects(col.connect(rogue).transferFrom(storeW.address, rogue.address, t2));
});

test('eksklusif: 10 edisi per karya, WD massal dengan voucher vault (gas member), batas 10 & voucher sekali pakai', async () => {
  const c = result.contracts;
  const member = ethers.HDNodeWallet.fromPhrase('test test test test test test test test test test test junk', undefined, "m/44'/60'/0'/0/3").connect(provider);
  for (const k of ['ex-time', 'ex-stamp', 'ex-quran', 'ex-model', 'ex-hadith']) {
    const col = new ethers.Contract(c.collections[k], art('AxtoEditions').abi, provider);
    assert.equal(await col.editionCap(), 10n, k);
    assert.equal(await col.maxId(), 10_000n, k);
    assert.equal(await col.signer(), signerW.address, k);
    assert.equal(await col.custody(), ethers.ZeroAddress, k);
  }
  const addr = c.collections['ex-quran'];
  const col = new ethers.Contract(addr, art('AxtoEditions').abi, member);
  const domain = { name: "AXTO Exclusive Qur'an", version: '1', chainId: 8453, verifyingContract: addr };
  const types = { MintVoucher: [{ name: 'to', type: 'address' }, { name: 'ids', type: 'uint256[]' }, { name: 'amounts', type: 'uint256[]' }, { name: 'ref', type: 'bytes32' }, { name: 'deadline', type: 'uint256' }] };
  const v = { to: member.address, ids: [7, 42, 9999], amounts: [3, 1, 10], ref: ethers.id('wd-1'), deadline: 4_000_000_000 };
  const sig = await signerW.signTypedData(domain, types, v);
  const rc = await (await col.mintWithVoucher(v.to, v.ids, v.amounts, v.ref, v.deadline, sig)).wait();
  console.log(`gas WD massal 3 karya / 14 edisi: ${rc.gasUsed}`);
  assert.deepEqual((await col.balanceOfBatch([member.address, member.address, member.address], v.ids)).map(Number), [3, 1, 10]);
  await assert.rejects(col.mintWithVoucher(v.to, v.ids, v.amounts, v.ref, v.deadline, sig)); // voucher sekali pakai
  const v2 = { ...v, ids: [9999], amounts: [1], ref: ethers.id('wd-2') };
  await assert.rejects(col.mintWithVoucher(v2.to, v2.ids, v2.amounts, v2.ref, v2.deadline, await signerW.signTypedData(domain, types, v2))); // edisi ke-11
  const v3 = { ...v, ids: [5], amounts: [1], ref: ethers.id('wd-3') };
  await assert.rejects(col.mintWithVoucher(v3.to, v3.ids, v3.amounts, v3.ref, v3.deadline, await ethers.Wallet.createRandom().signTypedData(domain, types, v3))); // bukan vault
});

test('koin 100 jt dibagi langsung: presale 20 jt, vesting/DEX 30 jt, hold 30 jt, bank 20 jt; wallet buyback tepercaya; deployer tanpa hak', async () => {
  const c = result.contracts;
  const t = new ethers.Contract(c.token, art('AxtoToken').abi, provider);
  const E = (n) => ethers.parseEther(String(n));
  assert.equal(await t.totalSupply(), E(100_000_000));
  assert.equal(await t.balanceOf(PRESALE_W), E(20_000_000));
  assert.equal(await t.balanceOf(VESTING_W), E(30_000_000));
  assert.equal(await t.balanceOf(HOLD_W), E(30_000_000));
  assert.equal(await t.balanceOf(COIN), E(20_000_000));
  assert.equal(await t.balanceOf(result.deployer), 0n);
  assert.equal(await t.trusted(result.deployer), false);
  for (const a of [TREASURY, COIN, PRESALE_W, VESTING_W, HOLD_W, BUYBACK]) assert.equal(await t.trusted(a), true);
  assert.equal(await t.tradingEnabled(), false);
});

test('aman diulang: run kedua tidak mendeploy apa pun lagi', async () => {
  const n0 = await provider.getTransactionCount(result.deployer, 'latest');
  const again = await mod.main();
  assert.equal(again.done, true);
  assert.equal(await provider.getTransactionCount(result.deployer, 'latest'), n0);
});

test('royalti 10% tetap berlaku setelah WD (ERC-1155C): hanya marketplace dalam daftar koleksi yang boleh memindah, kirim langsung tetap boleh', async () => {
  const c = result.contracts;
  const member = ethers.HDNodeWallet.fromPhrase('test test test test test test test test test test test junk', undefined, "m/44'/60'/0'/0/3").connect(provider);
  for (const a of Object.entries(c.collections).filter(([k]) => k.startsWith('ex-')).map(([, x]) => x)) {
    const col = new ethers.Contract(a, art('AxtoEditions').abi, provider);
    assert.equal(await col.getTransferValidator(), validator);
    assert.ok((await col.operatorListId()) > 0n);
    for (const op of mod.ROYALTY_OPERATORS) assert.equal(await new ethers.Contract(validator, art('MockTransferValidator').abi, provider).isAccountWhitelistedByCollection(a, op), true);
    assert.equal(await col.supportsInterface('0x2a55205a'), true, 'ERC-2981');
    const [recv, roy] = await col.royaltyInfo(1, 10_000n);
    assert.equal(recv, TREASURY);
    assert.equal(roy, 1000n);
  }
  const col = new ethers.Contract(c.collections['ex-quran'], art('AxtoEditions').abi, member);
  const sig = (await col.getTransferValidationFunction())[0];
  assert.equal(sig, ethers.id('validateTransfer(address,address,address,uint256,uint256)').slice(0, 10));
  // member (sudah WD 3 edisi #7 di uji sebelumnya) mengirim langsung antar wallet → boleh (keputusan pemilik)
  const friend = ethers.Wallet.createRandom().address;
  assert.equal(await col.directTransfersAllowed(), true);
  await (await col.safeTransferFrom(member.address, friend, 7, 1, '0x')).wait();
  assert.equal(await col.balanceOf(friend, 7), 1n);
  // hanya pemilik (wallet admin) yang bisa menutupnya
  await assert.rejects(col.setDirectTransfersAllowed(false));
  // marketplace yang tidak membayar royalti (operator di luar daftar) → ditolak di rantai
  const rogue = ethers.HDNodeWallet.fromPhrase('test test test test test test test test test test test junk', undefined, "m/44'/60'/0'/0/1").connect(provider);
  await (await col.setApprovalForAll(rogue.address, true)).wait();
  await assert.rejects(col.connect(rogue).safeTransferFrom(member.address, friend, 7, 1, '0x'));
  // tanpa validator (mis. jaringan tanpa Limit Break): penegakan mati, deploy tetap jalan
  const ed = art('AxtoEditions');
  const plain = await (await new ethers.ContractFactory(ed.abi, ed.bytecode, deployer).deploy({ name: 'X', symbol: 'X', owner: ADMIN, royaltyReceiver: TREASURY, baseURI: 'x', contractURI: 'x', custody: ethers.ZeroAddress, operator: ethers.ZeroAddress, releaser: ethers.ZeroAddress, signer: signerW.address, maxId: 10, editionCap: 10, validator: ethers.Wallet.createRandom().address, operators: mod.ROYALTY_OPERATORS })).waitForDeployment();
  assert.equal(await plain.getTransferValidator(), ethers.ZeroAddress);
});
