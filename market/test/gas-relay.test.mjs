/**
 * Wallet gas axto.io (pemilik 24 Nov 2026: „Seluruh gas fee di tanggung axto.io" · „gas fee tetep dari alamat 0x2AB7…")
 * di ganache: voucher WD member dikirim wallet gas (penerima tetap member, member tidak membayar gas), voucher yang sudah
 * dipakai dicatat tanpa transaksi, wallet toko diisi ulang dari wallet gas, kunci lain ditolak.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ganache from 'ganache';
import { ethers } from 'ethers';
import { run, STORE_FILL } from '../gas-relay.mjs';

const art = (n) => JSON.parse(readFileSync(new URL(`../../contracts/out/${n}.json`, import.meta.url), 'utf8'));
const RPC = 'http://127.0.0.1:18547';
let server, provider, deployer, gas, member, signer, store, ed, R2, reported;

before(async () => {
  const mnemonic = 'test test test test test test test test test test test junk';
  server = ganache.server({ logging: { quiet: true }, chain: { chainId: 8453, hardfork: 'shanghai' }, wallet: { mnemonic, totalAccounts: 6, defaultBalance: 100 }, miner: { blockGasLimit: 60_000_000 } });
  await server.listen(18547);
  provider = new ethers.JsonRpcProvider(RPC, undefined, { cacheTimeout: -1 });
  [deployer, gas, member, signer] = [0, 1, 2, 3].map((i) => ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${i}`).connect(provider));
  store = ethers.Wallet.createRandom().address; // wallet toko kosong → perlu diisi
  const a = art('AxtoEditions');
  ed = await (await new ethers.ContractFactory(a.abi, a.bytecode, deployer).deploy({ name: 'AXTO Exclusive Time', symbol: 'AXEXT', owner: deployer.address, royaltyReceiver: deployer.address, baseURI: 'x', contractURI: 'x', custody: ethers.ZeroAddress, operator: ethers.ZeroAddress, releaser: ethers.ZeroAddress, signer: signer.address, maxId: 10_000, editionCap: 10, validator: ethers.ZeroAddress, operators: [] })).waitForDeployment();
  R2 = { 'axto-nft-data/cfg/contracts-8453.json': JSON.stringify({ store }) };
});
after(async () => { await server.close(); });

async function voucher(ref, ids, amounts) {
  const deadline = Math.floor(Date.now() / 1000) + 14 * 86400;
  const v = { to: member.address, ids, amounts, ref: ethers.id(ref), deadline };
  const sig = await signer.signTypedData({ name: 'AXTO Exclusive Time', version: '1', chainId: 8453, verifyingContract: await ed.getAddress() }, { MintVoucher: [{ name: 'to', type: 'address' }, { name: 'ids', type: 'uint256[]' }, { name: 'amounts', type: 'uint256[]' }, { name: 'ref', type: 'bytes32' }, { name: 'deadline', type: 'uint256' }] }, v);
  return { ...v, ids: ids.map(String), amounts: amounts.map(String), deadline: String(deadline), sig };
}

const io = (items) => ({
  r2get: (k) => R2[k] ?? null,
  r2put: (k, v) => { R2[k] = v; },
  api: async (method, path, body) => {
    if (path === '/internal/wd/antre') return { items };
    if (path === '/internal/wd/terkirim') { reported.push(body); return { ok: true }; }
    throw new Error(path);
  },
});

test('tanpa kunci: tidak mengirim apa pun; kunci selain wallet gas yang ditetapkan ditolak', async () => {
  assert.deepEqual(await run({ io: io([]), rpc: RPC, key: '', log: () => {} }), { waiting: 'key' });
  assert.match(JSON.parse(R2['axto-nft-data/cfg/gas.json']).step, /menunggu kunci/);
  await assert.rejects(run({ io: io([]), rpc: RPC, key: member.privateKey, log: () => {} }), /tidak cocok/);
});

test('WD massal dikirim wallet gas: karya tiba di wallet member tanpa gas member; voucher terpakai dicatat; wallet toko diisi ulang', async () => {
  reported = [];
  const contract = await ed.getAddress();
  const v1 = await voucher('wd-1', [1, 2, 3], [2, 1, 1]);
  const v2 = await voucher('wd-2', [9], [1]);
  // v2 sudah dikirim sendiri oleh member
  await (await ed.connect(member).mintWithVoucher(v2.to, v2.ids, v2.amounts, v2.ref, v2.deadline, v2.sig)).wait();
  const memberEth = await provider.getBalance(member.address);
  const gasEth = await provider.getBalance(gas.address);
  const items = [{ ref: 'aaaaaaaaaaaaaaaaaaaa-ex-time', c: 'ex-time', contract, voucher: v1 }, { ref: 'bbbbbbbbbbbbbbbbbbbb-ex-time', c: 'ex-time', contract, voucher: v2 }];
  const r = await run({ io: io(items), rpc: RPC, key: gas.privateKey, gasWallet: gas.address, log: () => {} });
  assert.equal(r.sent.length, 1);
  assert.equal(await ed.balanceOf(member.address, 1), 2n);
  assert.equal(await ed.balanceOf(member.address, 3), 1n);
  assert.equal(await provider.getBalance(member.address), memberEth, 'member tidak membayar gas');
  assert.ok((await provider.getBalance(gas.address)) < gasEth, 'gas dibayar wallet gas');
  assert.deepEqual(reported.map((x) => [x.ref, x.tx ? 'tx' : null]), [['aaaaaaaaaaaaaaaaaaaa-ex-time', 'tx'], ['bbbbbbbbbbbbbbbbbbbb-ex-time', null]]);
  assert.equal(await provider.getBalance(store), STORE_FILL, 'wallet toko diisi ulang dari wallet gas');
  // putaran berikutnya: voucher yang sudah terkirim hanya dicatat, wallet toko tidak diisi lagi
  reported = [];
  const r2 = await run({ io: io([items[0]]), rpc: RPC, key: gas.privateKey, gasWallet: gas.address, log: () => {} });
  assert.equal(r2.sent.length, 0);
  assert.equal(r2.topup, null);
  assert.deepEqual(reported.map((x) => x.tx), [null]);
  const st = JSON.parse(R2['axto-nft-data/cfg/gas.json']);
  assert.equal(st.step, 'berjalan');
});
