/**
 * Deploy otomatis oleh sistem (perintah pemilik #31 „lu yg ngerjain semua nya", #32 gas termurah, #48 zero hand) —
 * desain akhir pemilik 23 Nov 2026 (edisi supply 1–10 per NFT, eksklusif 10 edisi $1, koin 100 jt, tanpa lelang on-chain).
 * Dijalankan workflow contracts-deploy.yml tiap jam sampai selesai; aman diulang (state per langkah di R2 privat).
 *
 * 1. Wallet deployer khusus sistem: dibuat sekali, kunci terenkripsi AES-256-GCM di bucket privat vault
 *    (axto-vault-data/deployer.enc; kunci enkripsi diturunkan dari CLOUDFLARE_API_KEY). Tidak pernah ke repo/log.
 * 2. Status publik (alamat, saldo, kebutuhan gas, langkah) → axto-nft-data/cfg/deployer.json → tampil di Portal admin.
 * 3. Saldo cukup → deploy berurutan, kepemilikan langsung ke wallet pemilik sejak konstruktor:
 *    - AxtoToken 100.000.000 → presale 20 jt · vesting/DEX 30 jt · hold 30 jt · bank 20 jt (+ wallet buyback tepercaya);
 *    - 10 koleksi OpenSea AxtoCollection (ERC-721 + ERC-2309, keputusan pemilik 24 Nov 2026, engine/src/opensea.js):
 *      5 publik + 5 kembaran seri G-, masing-masing 10.000.000 karya. EDISI 1 semua karya tercetak di konstruktor ke
 *      wallet toko (100 jt NFT langsung di OpenSea, ±7,7 jt gas per koleksi); edisi berikutnya (1–10 per karya) dicetak
 *      wallet toko saat edisi sebelumnya laku (market/opensea-list.mjs). Konduit OpenSea disetujui sejak konstruktor;
 *    - 5 koleksi eksklusif AxtoEditions (ERC-1155): 10.000 karya × 10 edisi, tercetak saat member WD dengan voucher vault.
 * 4. Selesai → POST /internal/contracts (HMAC) → worker memverifikasi on-chain & menyimpan + vault setConfig.
 *
 * ENV: CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, CLOUDFLARE_ACCOUNT_ID, CHAIN_ID (8453 | 84532), [AXTO_API]
 * Uji lokal (ganache, tanpa R2): LOCAL_RPC=… LOCAL_KEY=… SIGNER=… node scripts/auto-deploy.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmac, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ethers } from 'ethers';
import { OS_COLS, WORKS, MAX_EDITIONS } from '../../engine/src/opensea.js';
import { STAKE_KEY, STAKE_WORKS, STAKE_MAX } from '../../engine/src/stake.js';
import { collection } from '../../engine/src/core.js';

const ADMIN = '0x38Cd3F76a132f70b12C9E4ea6aDAFaCF62483166';
const COIN = '0x6918A3C9a58E71B3bca993e8cDD2630D2DDB6469';
const TREASURY = '0xDC39C04E704b1fec2BE648c49c842B2B17AfEBDA';
// alamat milik pemilik (perintah #40): bank = pemegang 10 jt; presale/vesting/hold diisi pemilik sendiri dari bank
const PRESALE_W = '0x114aa45B77f06C07B6Ee0aB03F89FAdaCDc6614C';
const VESTING_W = '0x61A0CD9c14EDF48948E39144cc5d8aB4e8A17c62';
const HOLD_W = '0xeef8b1c3BDE202A77Fe3B24d1f43EbA10498a94c';
const NETS = {
  8453: { rpc: 'https://mainnet.base.org', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', feed: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70', name: 'Base' },
  84532: { rpc: 'https://sepolia.base.org', usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', feed: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1', name: 'Base Sepolia' },
};
/** [kunci, nama, simbol] — 10 koleksi OpenSea ERC-721 (5 publik + 5 seri G-) lalu eksklusif axto.io (10 edisi). Urutan tetap. */
const OPENSEA_COLS = OS_COLS.map((c) => [c.key, c.name, c.symbol]);
const EXCLUSIVE_COLS = [['ex-time', 'AXTO Exclusive Time', 'AXXTIME'], ['ex-stamp', 'AXTO Exclusive Stamp', 'AXXSTAMP'], ['ex-quran', "AXTO Exclusive Qur'an", 'AXXQURAN'], ['ex-model', 'AXTO Exclusive Model', 'AXXMODEL'], ['ex-hadith', 'AXTO Exclusive Hadith', 'AXXHADITH']];
/** Koleksi hadiah staking koin AXTO (pemilik 24 Nov 2026): 10 jt karya 1/1 tercetak ke wallet toko, tidak pernah di-listing. */
const STAKE_COLS = [[STAKE_KEY, 'AXTO Staking', 'AXSTAKE']];
const COLS = [...OPENSEA_COLS, ...EXCLUSIVE_COLS, ...STAKE_COLS];
/** Karya staking yang tercetak saat deploy (uji lokal boleh mengecilkannya). */
export const STAKE_PREMINT = Number(process.env.STAKE_WORKS || STAKE_WORKS);
/** Karya per koleksi OpenSea (= edisi 1 yang tercetak saat deploy). Uji lokal boleh mengecilkannya. */
export const OS_WORKS = Number(process.env.OS_WORKS || WORKS);
/** Konduit OpenSea (Seaport) — sama di semua jaringan; disetujui sejak konstruktor agar listing tanpa transaksi persetujuan. */
export const OPENSEA_CONDUIT = '0x1E0049783F008A0085193E00003D00cd54003c71';
/**
 * Royalti 10% tetap berlaku setelah WD & dijual di mana pun (perintah pemilik 23 Nov 2026): Creator Token Standards v3
 * (Limit Break) — validator terverifikasi di Base. Daftar operator milik tiap koleksi: konduit OpenSea + operator daftar
 * bawaan Limit Break di Base (Payment Processor), dibaca dari log AddedAccountToList validator.
 */
export const TRANSFER_VALIDATOR = process.env.LOCAL_VALIDATOR || '0x721C002B0059009a671D00aD1700c9748146cd1B';
export const ROYALTY_OPERATORS = [
  '0x1E0049783F008A0085193E00003D00cd54003c71', // konduit OpenSea (Seaport)
  '0x9A1D00000000fC540e2000560054812452eB5366', // Payment Processor (daftar bawaan Limit Break, Base)
  '0x9A1D001670C8b17F8B7900E8d7A41e785B3F0515',
  '0x9A1D00bEd7CD04BCDA516d721A596eb22Aac6834',
  '0x0E00009d00d1000069ed00A908e00081F5006008',
].map((a) => ethers.getAddress(a.toLowerCase()));
/** Gas terukur di ganache untuk seluruh urutan ini (lihat test/auto-deploy.test.mjs), dibulatkan ke atas: token + 10 koleksi
 *  OpenSea dengan edisi 1 (10 × ±7,7 jt) + 5 koleksi eksklusif + koleksi staking 10 jt karya 1/1 (±7,7 jt) + daftar operator
 *  royalti. */
export const TOTAL_GAS = BigInt(process.env.TOTAL_GAS_OVERRIDE || 113_000_000);

const LOCAL = !!process.env.LOCAL_RPC;
const CHAIN = Number(process.env.CHAIN_ID || 8453);
const BASE = process.env.AXTO_API || 'https://axto.io';
const tmp = mkdtempSync(join(tmpdir(), 'axto-dep-'));
const log = (...a) => console.log(...a);

// ---------------------------------------------------------------- R2 lewat wrangler (kredensial Global API Key)
function r2get(bucketKey) {
  if (LOCAL) return LOCALSTORE[bucketKey] ?? null;
  const f = join(tmp, 'o');
  try {
    execFileSync('npx', ['--yes', 'wrangler@4.156.1', 'r2', 'object', 'get', bucketKey, '--file', f, '--remote'], { stdio: 'pipe' });
    return readFileSync(f, 'utf8');
  } catch { return null; }
}
function r2put(bucketKey, text, type = 'application/json') {
  if (LOCAL) { LOCALSTORE[bucketKey] = text; return; }
  const f = join(tmp, 'p');
  writeFileSync(f, text);
  execFileSync('npx', ['--yes', 'wrangler@4.156.1', 'r2', 'object', 'put', bucketKey, '--file', f, '--content-type', type, '--remote'], { stdio: 'pipe' });
}
const LOCALSTORE = {};
/** Konfigurasi privat pemilik (R2 axto-nft-data/private/config.json, dari saluran tersegel) — mis. wallet buyback. */
function privateCfg() {
  if (LOCAL) return { buyback: process.env.LOCAL_BUYBACK };
  try { return JSON.parse(r2get('axto-nft-data/private/config.json') || '{}'); } catch { return {}; }
}

// ---------------------------------------------------------------- kunci deployer terenkripsi
const encKey = () => createHmac('sha256', process.env.CLOUDFLARE_API_KEY || 'local').update('axto:DEPLOYER_ENC').digest();
function seal(pk) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', encKey(), iv);
  const ct = Buffer.concat([c.update(pk, 'utf8'), c.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') });
}
function open(s) {
  const j = JSON.parse(s);
  const d = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(j.iv, 'base64'));
  d.setAuthTag(Buffer.from(j.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(j.ct, 'base64')), d.final()]).toString('utf8');
}

/**
 * Verifikasi kode semua kontrak agar BaseScan menampilkan kode, nama & syarat pemasangan logo terpenuhi.
 *  - Sourcify (tanpa kunci) selalu;  - BaseScan lewat Etherscan API v2 bila secret ETHERSCAN_API_KEY ada.
 * Gagal satu kontrak tidak menggagalkan deploy; workflow berikutnya mencoba lagi sampai BaseScan terverifikasi.
 */
async function verifyAll(chainId, st) {
  const input = JSON.parse(readFileSync(new URL('../out/_verify-input.json', import.meta.url), 'utf8'));
  const solcv = JSON.parse(readFileSync(new URL('../out/_solc.json', import.meta.url), 'utf8'));
  const res = { sourcify: 0, etherscan: 0 };
  const key = process.env.ETHERSCAN_API_KEY;
  for (const [address, v] of Object.entries(st.verify ?? {})) {
    try {
      const r = await fetch(`https://sourcify.dev/server/v2/verify/${chainId}/${address}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stdJsonInput: input, compilerVersion: solcv.version, contractIdentifier: v.id }) });
      if (r.ok || r.status === 409) res.sourcify += 1;
      log(`sourcify ${v.id} ${address}: ${r.status}`);
    } catch (e) { log(`sourcify ${address}: ${e.message}`); }
    if (!key) continue;
    try {
      const body = new URLSearchParams({ module: 'contract', action: 'verifysourcecode', apikey: key, contractaddress: address, sourceCode: JSON.stringify(input), codeformat: 'solidity-standard-json-input', contractname: v.id, compilerversion: solcv.etherscan, constructorArguements: v.args });
      const j = await (await fetch(`https://api.etherscan.io/v2/api?chainid=${chainId}`, { method: 'POST', body })).json();
      if (j.status === '1' || /already verified/i.test(j.result ?? '')) res.etherscan += 1;
      log(`basescan ${v.id} ${address}: ${j.result}`);
    } catch (e) { log(`basescan ${address}: ${e.message}`); }
  }
  log(`Verifikasi: Sourcify ${res.sourcify}, BaseScan ${res.etherscan}${key ? '' : ' (secret ETHERSCAN_API_KEY belum ada)'}`);
  return { sourcify: res.sourcify > 0, etherscan: key ? res.etherscan === Object.keys(st.verify ?? {}).length : false, at: new Date().toISOString() };
}

async function main() {
  const net = LOCAL ? { rpc: process.env.LOCAL_RPC, usdc: process.env.LOCAL_USDC, feed: process.env.LOCAL_FEED, name: 'lokal' } : NETS[CHAIN];
  if (!net) throw new Error(`CHAIN_ID ${CHAIN} tidak didukung`);
  const provider = new ethers.JsonRpcProvider(net.rpc);
  const chainId = Number((await provider.getNetwork()).chainId);

  // kontrak sudah aktif di jaringan ini → tidak ada yang perlu dikerjakan
  const prevSt = JSON.parse((LOCAL ? null : r2get(`axto-vault-data/deploy-${chainId}.json`)) || LOCALSTORE[`axto-vault-data/deploy-${chainId}.json`] || '{}');
  const missing = COLS.filter(([k]) => !prevSt.collections?.[k]).map(([k]) => k);
  if (!LOCAL && r2get(`axto-nft-data/cfg/contracts-${chainId}.json`) && !missing.length) {
    const prev = prevSt;
    if (prev.done && !prev.verified?.etherscan) {
      prev.verified = await verifyAll(chainId, prev);
      r2put(`axto-vault-data/deploy-${chainId}.json`, JSON.stringify(prev));
    }
    log(`Kontrak ${net.name} sudah aktif — selesai.`);
    return { done: true };
  }

  let pk = LOCAL ? process.env.LOCAL_KEY : null;
  if (!pk) {
    const sealed = r2get('axto-vault-data/deployer.enc');
    if (sealed) pk = open(sealed);
    else {
      pk = ethers.Wallet.createRandom().privateKey;
      r2put('axto-vault-data/deployer.enc', seal(pk));
      log('Wallet deployer sistem dibuat (kunci terenkripsi di bucket privat vault).');
    }
  }
  const wallet = new ethers.Wallet(pk, provider);
  const me = wallet.address;
  const signer = LOCAL ? process.env.SIGNER : JSON.parse(r2get('axto-vault-data/signer.json') || '{}').signer;
  if (!ethers.isAddress(signer)) throw new Error('alamat signer vault belum ada (jalankan deploy vault dulu)');

  const stKey = `axto-vault-data/deploy-${chainId}.json`;
  const st = JSON.parse(r2get(stKey) || '{}');
  const save = () => r2put(stKey, JSON.stringify(st));

  // wallet toko sistem (#44): pemegang 8 jt NFT publik & penanda tangan listing OpenSea; kuncinya hanya di vault
  if (!st.store) {
    let spk = LOCAL ? process.env.LOCAL_STORE_KEY : null;
    if (!spk) {
      const sealedStore = r2get('axto-vault-data/store.enc');
      if (sealedStore) spk = open(sealedStore);
      else { spk = ethers.Wallet.createRandom().privateKey; r2put('axto-vault-data/store.enc', seal(spk)); log('Wallet toko sistem dibuat (kunci terenkripsi di bucket privat vault).'); }
    }
    st.store = new ethers.Wallet(spk).address;
    save();
  }
  const STORE = st.store;

  // Dana pemilik pas-pasan (±0,0015 ETH, 24 Nov 2026): kebutuhan dihitung dari harga gas yang BENAR-BENAR dibayar
  // (base fee blok terakhir + tip), bukan batas maxFee (≈ 2× base fee). Tiap transaksi tetap memakai maxFee biasa; bila
  // saldo habis di tengah, deploy berhenti dan dilanjutkan otomatis begitu dana ditambah (state per langkah di R2 privat).
  const fee = await provider.getFeeData();
  const head = await provider.getBlock('latest');
  const tip = fee.maxPriorityFeePerGas ?? 1_000_000n;
  const paid = (head?.baseFeePerGas ?? fee.gasPrice ?? 10_000_000n) + tip;
  const spent = BigInt(st.gasUsed ?? 0);
  const left = TOTAL_GAS > spent ? TOTAL_GAS - spent : 0n;
  const need = (left * paid * 5n) / 4n + ethers.parseEther('0.00002'); // +25% cadangan + biaya data L1 (kecil)
  const bal = await provider.getBalance(me);
  const status = (step, extra = {}) => {
    const s = { address: me, store: st.store, chainId, network: net.name, balance: ethers.formatEther(bal), need: ethers.formatEther(need), step, at: new Date().toISOString(), ...extra };
    if (!LOCAL) r2put('axto-nft-data/cfg/deployer.json', JSON.stringify(s));
    return s;
  };
  log(`Deployer ${me} · saldo ${ethers.formatEther(bal)} ETH · perlu ±${ethers.formatEther(need)} ETH di ${net.name}`);
  // Rem darurat: berkas contracts/DEPLOY_HOLD ada → tidak mendeploy apa pun (mis. desain kontrak sedang diubah sebelum deploy)
  const hold = (() => { try { return readFileSync(new URL('../DEPLOY_HOLD', import.meta.url), 'utf8').trim(); } catch { return ''; } })();
  if (hold && !LOCAL && !st.done && !st.token) {
    status(`ditahan: ${hold}`);
    log(`::notice::Deploy ditahan — ${hold}`);
    return { held: hold, address: me };
  }
  const adding = st.done && COLS.some(([k]) => !st.collections?.[k]); // deploy bertahap: koleksi baru setelah semua aktif
  if (adding) log(`Deploy bertahap: menambah ${COLS.filter(([k]) => !st.collections?.[k]).map(([k]) => k).join(', ')}`);
  if (bal < need && (!st.done || adding)) {
    status('menunggu dana');
    log(`::notice::Kirim ±${ethers.formatEther(need)} ETH (jaringan ${net.name}) ke ${me}. Workflow ini mencoba lagi tiap jam.`);
    return { waiting: true, address: me, need };
  }

  const art = (n) => JSON.parse(readFileSync(new URL(`../out/${n}.json`, import.meta.url), 'utf8'));
  let nonce = await provider.getTransactionCount(me, 'latest');
  const track = async (txp) => { const tx = await txp; const r = await tx.wait(); st.gasUsed = String(BigInt(st.gasUsed ?? 0) + r.gasUsed); return r; };
  const deploy = async (key, name, ...args) => {
    if (st[key]) return st[key];
    status(`deploy ${key}`);
    const a = art(name);
    const f = new ethers.ContractFactory(a.abi, a.bytecode, wallet);
    const c = await f.deploy(...args, { nonce: nonce++ });
    await track(Promise.resolve(c.deploymentTransaction()));
    st[key] = await c.getAddress();
    st.verify = { ...(st.verify ?? {}), [st[key]]: { id: `${a.source}:${a.contractName}`, args: f.interface.encodeDeploy(args).slice(2) } };
    save();
    log(`✓ ${key} ${st[key]}`);
    return st[key];
  };
  const step = async (key, fn) => {
    if (st.steps?.[key]) return;
    status(key);
    await track(fn({ nonce: nonce++ }));
    st.steps = { ...(st.steps ?? {}), [key]: true };
    save();
    log(`✓ ${key}`);
  };

  // AXTO 100.000.000, pembagian persen tetap (perintah #41, suplai diubah 23 Nov 2026): presale 20 jt · vesting/listing DEX
  // 30 jt · hold 5 thn 30 jt · bank (jatah owner) 20 jt. Wallet buyback (R2 privat) ikut tepercaya sebelum listing DEX.
  const E = (n) => ethers.parseEther(String(n));
  const buyback = privateCfg().buyback;
  const trustedExtra = ethers.isAddress(buyback ?? '') ? [buyback] : [];
  const token = await deploy('token', 'AxtoToken', me, [PRESALE_W, VESTING_W, HOLD_W, COIN], [E(20_000_000), E(30_000_000), E(30_000_000), E(20_000_000)], trustedExtra);
  st.collections = st.collections ?? {};
  for (const [k, name, sym] of COLS) {
    if (st.collections[k]) continue;
    if (k.startsWith('ex-')) {
      // eksklusif axto.io: ERC-1155, 10 edisi per karya, tercetak saat member WD (gas member)
      const cfg = {
        name, symbol: sym, owner: ADMIN, royaltyReceiver: TREASURY,
        baseURI: `${BASE}/api/edition/${k}/`, contractURI: `${BASE}/api/contract/${k}`,
        custody: ethers.ZeroAddress, operator: ethers.ZeroAddress, releaser: ethers.ZeroAddress, signer,
        maxId: collection(k).max, editionCap: 10, validator: TRANSFER_VALIDATOR, operators: ROYALTY_OPERATORS,
      };
      st.collections[k] = await deploy(`col:${k}`, 'AxtoEditions', cfg);
    } else if (k === STAKE_KEY) {
      // hadiah staking: ERC-721 + ERC-2309, 10 jt karya 1/1 tercetak ke wallet toko; TANPA persetujuan konduit OpenSea →
      // tidak pernah di-listing (tidak bisa dibeli). Wallet toko mengirim hadiah dengan transferBatch (gas oleh axto.io).
      const cfg = {
        name, symbol: sym, maxSupply: STAKE_MAX, owner: ADMIN, royaltyReceiver: TREASURY,
        baseURI: `${BASE}/api/token/${k}/`, contractURI: `${BASE}/api/contract/${k}`,
        custody: STORE, premint: STAKE_PREMINT, operator: ethers.ZeroAddress, signer: ethers.ZeroAddress,
        minter: STORE, editionStride: 0, validator: TRANSFER_VALIDATOR, operators: ROYALTY_OPERATORS,
      };
      st.collections[k] = await deploy(`col:${k}`, 'AxtoCollection', cfg);
    } else {
      // OpenSea: ERC-721 + ERC-2309 — edisi 1 semua karya tercetak di konstruktor ke wallet toko (kustodi & minter)
      const cfg = {
        name, symbol: sym, maxSupply: OS_WORKS * MAX_EDITIONS, owner: ADMIN, royaltyReceiver: TREASURY,
        baseURI: `${BASE}/api/token/${k}/`, contractURI: `${BASE}/api/contract/${k}`,
        custody: STORE, premint: OS_WORKS, operator: OPENSEA_CONDUIT, signer: ethers.ZeroAddress,
        minter: STORE, editionStride: OS_WORKS, validator: TRANSFER_VALIDATOR, operators: ROYALTY_OPERATORS,
      };
      st.collections[k] = await deploy(`col:${k}`, 'AxtoCollection', cfg);
    }
    delete st[`col:${k}`];
    save();
  }
  const T = new ethers.Contract(token, art('AxtoToken').abi, wallet);
  await step('trust:treasury', (o) => T.setTrusted(TREASURY, true, o));
  await step('untrust deployer', (o) => T.setTrusted(me, false, o));
  await step('owner token → wallet koin', (o) => T.transferOwnership(COIN, o));
  st.done = true;
  save();
  if (!LOCAL) { st.verified = await verifyAll(chainId, st); save(); }

  const body = JSON.stringify({ chainId, token, store: STORE, collections: st.collections, standard: 'erc721-editions', works: OS_WORKS });
  if (!LOCAL) {
    const key = process.env.ENGINE_HMAC_KEY || createHmac('sha256', process.env.CLOUDFLARE_API_KEY).update('axto:ENGINE_HMAC_KEY').digest('hex');
    const ts = Date.now();
    const sig = createHmac('sha256', key).update(`${ts}.${body}`).digest('hex');
    const r = await (await fetch(`${BASE}/internal/contracts`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-axto-ts': String(ts), 'x-axto-sig': sig }, body })).json();
    if (!r.ok) throw new Error(`simpan ke worker gagal: ${JSON.stringify(r)}`);
    status('selesai', { contracts: JSON.parse(body) });
  }
  log(`✅ Semua kontrak aktif di ${net.name}. Gas terpakai: ${st.gasUsed}`);
  return { done: true, gasUsed: BigInt(st.gasUsed), contracts: JSON.parse(body), deployer: me };
}

export { main, LOCALSTORE };
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().then((r) => {
    if (process.env.GITHUB_STEP_SUMMARY && r) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## Deploy kontrak otomatis\n\n${r.waiting ? `Menunggu dana: kirim ±${ethers.formatEther(r.need)} ETH ke \`${r.address}\` (jaringan ${CHAIN === 8453 ? 'Base' : 'Base Sepolia'}).` : r.done ? 'Kontrak aktif ✅' : ''}\n`, { flag: 'a' });
  }).catch((e) => { console.error(e.shortMessage || e.message || e); process.exit(1); });
}
