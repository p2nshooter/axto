/**
 * Deploy otomatis oleh sistem (perintah pemilik #31 „lu yg ngerjain semua nya", #30 mint otomatis, #32 gas termurah).
 * Dijalankan workflow contracts-deploy.yml tiap jam sampai selesai; aman diulang (state per langkah di R2 privat).
 *
 * 1. Wallet deployer khusus sistem: dibuat sekali, kunci terenkripsi AES-256-GCM di bucket privat vault
 *    (axto-vault-data/deployer.enc; kunci enkripsi diturunkan dari CLOUDFLARE_API_KEY). Tidak pernah ke repo/log.
 * 2. Status publik (alamat, saldo, kebutuhan gas, langkah) → axto-nft-data/cfg/deployer.json → tampil di Portal admin.
 * 3. Saldo cukup → deploy berurutan; kepemilikan langsung ke wallet pemilik sejak konstruktor:
 *    AuctionHouse + 7 koleksi → admin NFT; AxtoSale → wallet koin; AxtoToken diserahkan ke wallet koin di akhir.
 *    Koleksi publik (4 × 2.000.000) tercetak penuh saat deploy (ERC-2309) ke wallet admin → tampil di profil OpenSea pemilik;
 *    AuctionHouse menjadi operator untuk memindahkannya ke pemenang yang membayar.
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

const ADMIN = '0x38Cd3F76a132f70b12C9E4ea6aDAFaCF62483166';
const COIN = '0x6918A3C9a58E71B3bca993e8cDD2630D2DDB6469';
const TREASURY = '0xDC39C04E704b1fec2BE648c49c842B2B17AfEBDA';
const NETS = {
  8453: { rpc: 'https://mainnet.base.org', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', feed: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70', name: 'Base' },
  84532: { rpc: 'https://sepolia.base.org', usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', feed: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1', name: 'Base Sepolia' },
};
const COLS = [
  ['time', 'AXTO Time', 'AXTIME', 2_000_000], ['stamp', 'AXTO Stamp', 'AXSTAMP', 2_000_000], ['quran', "AXTO Qur'an", 'AXQURAN', 2_000_000], ['model', 'AXTO Model', 'AXMODEL', 2_000_000],
  ['ex-time', 'AXTO Exclusive Time', 'AXXTIME', 50_000], ['ex-stamp', 'AXTO Exclusive Stamp', 'AXXSTAMP', 50_000], ['ex-quran', "AXTO Exclusive Qur'an", 'AXXQURAN', 50_000],
];
/** Gas terukur di ganache untuk seluruh urutan ini (lihat test/auto-deploy.test.mjs), dibulatkan ke atas. */
export const TOTAL_GAS = 32_000_000n;

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
  if (!LOCAL && r2get(`axto-nft-data/cfg/contracts-${chainId}.json`)) {
    const prev = JSON.parse(r2get(`axto-vault-data/deploy-${chainId}.json`) || '{}');
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

  const fee = await provider.getFeeData();
  const maxFee = fee.maxFeePerGas ?? fee.gasPrice ?? 10_000_000n;
  const spent = BigInt(st.gasUsed ?? 0);
  const left = TOTAL_GAS > spent ? TOTAL_GAS - spent : 0n;
  const need = (left * maxFee * 3n) / 2n + ethers.parseEther('0.0001'); // +50% & cadangan biaya data L1
  const bal = await provider.getBalance(me);
  const status = (step, extra = {}) => {
    const s = { address: me, chainId, network: net.name, balance: ethers.formatEther(bal), need: ethers.formatEther(need), step, at: new Date().toISOString(), ...extra };
    if (!LOCAL) r2put('axto-nft-data/cfg/deployer.json', JSON.stringify(s));
    return s;
  };
  log(`Deployer ${me} · saldo ${ethers.formatEther(bal)} ETH · perlu ±${ethers.formatEther(need)} ETH di ${net.name}`);
  if (bal < need && !st.done) {
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

  // 10.000.000 AXTO seluruhnya ke wallet koin pemilik (perintah #39); pemilik membagi sendiri ke alamat-alamatnya
  const token = await deploy('token', 'AxtoToken', me, COIN);
  const sale = await deploy('sale', 'AxtoSale', COIN, token, net.usdc, net.feed, TREASURY, signer, COIN);
  const house = await deploy('auctionHouse', 'AxtoAuctionHouse', ADMIN, TREASURY, signer, [net.usdc, token]);
  st.collections = st.collections ?? {};
  for (const [k, name, sym, max] of COLS) {
    if (st.collections[k]) continue;
    const ex = k.startsWith('ex-');
    const cfg = { name, symbol: sym, maxSupply: max, owner: ADMIN, royaltyReceiver: TREASURY, baseURI: `${BASE}/api/meta/${k}/`, contractURI: `${BASE}/api/contract/${k}`, custody: ex ? ethers.ZeroAddress : ADMIN, premint: ex ? 0 : max, operator: ex ? ethers.ZeroAddress : house, signer: ex ? signer : ethers.ZeroAddress };
    st.collections[k] = await deploy(`col:${k}`, 'AxtoCollection', cfg);
    delete st[`col:${k}`];
    save();
  }
  const T = new ethers.Contract(token, art('AxtoToken').abi, wallet);
  await step('setSale', (o) => T.setSale(sale, o));
  for (const [k, a] of [['trust:house', house], ['trust:treasury', TREASURY]]) await step(k, (o) => T.setTrusted(a, true, o));
  await step('untrust deployer', (o) => T.setTrusted(me, false, o));
  await step('owner token → wallet koin', (o) => T.transferOwnership(COIN, o));
  st.done = true;
  save();
  if (!LOCAL) { st.verified = await verifyAll(chainId, st); save(); }

  const body = JSON.stringify({ chainId, token, sale, auctionHouse: house, collections: st.collections });
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

export { main };
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().then((r) => {
    if (process.env.GITHUB_STEP_SUMMARY && r) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## Deploy kontrak otomatis\n\n${r.waiting ? `Menunggu dana: kirim ±${ethers.formatEther(r.need)} ETH ke \`${r.address}\` (jaringan ${CHAIN === 8453 ? 'Base' : 'Base Sepolia'}).` : r.done ? 'Kontrak aktif ✅' : ''}\n`, { flag: 'a' });
  }).catch((e) => { console.error(e.shortMessage || e.message || e); process.exit(1); });
}
