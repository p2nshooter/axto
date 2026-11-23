/**
 * Mesin penjualan OpenSea otomatis — desain akhir pemilik 23 Nov 2026:
 *   „NFT yg akan di upload ke open sea … supply nya dari 1-10, harga dari $1-$10k tergantung kelangkaan … Harga tetap
 *    saja, jgn auction … pastikan di opensea jg SEO nya kuat".
 * Dijalankan workflow opensea-list.yml tiap jam. Tanpa operator, tanpa gas untuk listing:
 *
 *  1. Kunci wallet toko sistem (kustodi kontrak edisi AxtoEditions) dibuka dari bucket privat vault
 *     (axto-vault-data/store.enc, AES-256-GCM, kunci diturunkan dari CLOUDFLARE_API_KEY). Tidak pernah ke repo/log.
 *  2. Stok dibaca langsung dari rantai: released() + balanceOfBatch(wallet toko, id) per koleksi. Sisa edisi = saldo
 *     wallet toko; terjual = edisi − sisa (tidak perlu menebak dari log, tidak bisa salah hitung).
 *  3. Etalase axto.io „Di OpenSea" (sampai 5.000 karya per jenis yang masih tersedia, urutan rilis = urutan acak etalase)
 *     → R2 axto-nft-data/os/showcase-<c>.json (dibaca worker). Yang habis otomatis hilang dari etalase.
 *  4. Bila karya tersedia tinggal < RELEASE_LOW, rilis berikutnya (RELEASE_STEP id) dikirim oleh wallet perilis
 *     (deployer, kunci di vault) — gas diisi dari hasil penjualan bila kurang. Jumlah rilis dicatat ke cfg worker.
 *  5. Listing HARGA TETAP per edisi (USD → ETH memakai Chainlink ETH/USD di Base): satu order Seaport per token dengan
 *     quantity = sisa edisi dan harga total = harga satuan × quantity (pembeli boleh membeli sebagian). Satu tanda tangan
 *     Seaport bulk per batch. Listing kedaluwarsa sendiri setelah 30 hari lalu diperbarui (harga ETH terbaru). Tanpa lelang.
 *  6. ETH hasil penjualan di wallet toko diteruskan ke treasury pemilik (alamat dari R2 privat, bukan dari repo).
 *  7. Status ringkas → axto-nft-data/cfg/opensea.json (Portal admin).
 *
 * ENV: CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, CLOUDFLARE_ACCOUNT_ID, OPENSEA_API_KEY, CHAIN_ID (8453), [BUDGET_MIN]
 * Uji lokal tanpa R2/OpenSea: lihat test/opensea-list.test.mjs (semua I/O disuntikkan lewat `io`).
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmac, createDecipheriv } from 'node:crypto';
import { ethers } from 'ethers';
import { SHOWCASE_KEYS, SHOWCASE_N } from '../engine/src/showcase.js';
import { collection } from '../engine/src/core.js';
import { edition, designOf, releaseSupplies } from '../engine/src/editions.js';

const NETS = {
  8453: { rpc: 'https://mainnet.base.org', feed: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70', name: 'Base', chain: 'base' },
  84532: { rpc: 'https://sepolia.base.org', feed: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1', name: 'Base Sepolia', chain: 'base_sepolia' },
};
export const LIST_DAYS = 30; // listing kedaluwarsa sendiri (tanpa gas pembatalan), lalu diperbarui dengan harga ETH terbaru
const RENEW_BEFORE = 3 * 86_400; // perbarui listing 3 hari sebelum kedaluwarsa
const BATCH = 100; // satu tanda tangan Seaport bulk per 100 listing
const READ_CHUNK = 500; // id per panggilan balanceOfBatch
export const RELEASE_LOW = 4_000; // rilis lagi bila karya tersedia per koleksi < 4.000
export const RELEASE_STEP = 1_000; // id per rilis lanjutan
const RELEASE_GAS = 3_000_000n; // batas gas satu rilis 1.000 id (terukur ±1,2 jt)
const SWEEP_MIN = ethers.parseEther('0.002'); // teruskan ke treasury bila saldo wallet toko ≥ 0,002 ETH
const ABI = [
  'function released() view returns (uint256)',
  'function releaser() view returns (address)',
  'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
  'function release(bytes supplies)',
];

// ---------------------------------------------------------------- I/O sungguhan (R2 lewat wrangler, RPC, OpenSea SDK)
export function realIO() {
  const tmp = mkdtempSync(join(tmpdir(), 'axto-os-'));
  const r2get = (bucketKey) => {
    const f = join(tmp, 'o');
    try {
      execFileSync('npx', ['--yes', 'wrangler@4.156.1', 'r2', 'object', 'get', bucketKey, '--file', f, '--remote'], { stdio: 'pipe' });
      return readFileSync(f, 'utf8');
    } catch { return null; }
  };
  const r2put = (bucketKey, text) => {
    const f = join(tmp, 'p');
    writeFileSync(f, text);
    execFileSync('npx', ['--yes', 'wrangler@4.156.1', 'r2', 'object', 'put', bucketKey, '--file', f, '--content-type', 'application/json', '--remote'], { stdio: 'pipe' });
  };
  return { r2get, r2put, sdk: async (wallet, chain) => { const { OpenSeaSDK } = await import('@opensea/sdk'); return new OpenSeaSDK(wallet, { chain, apiKey: process.env.OPENSEA_API_KEY }); } };
}

const encKey = () => createHmac('sha256', process.env.CLOUDFLARE_API_KEY || 'local').update('axto:DEPLOYER_ENC').digest();
export function openSealed(s) {
  const j = JSON.parse(s);
  const d = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(j.iv, 'base64'));
  d.setAuthTag(Buffer.from(j.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(j.ct, 'base64')), d.final()]).toString('utf8');
}

/** USD → wei, dibulatkan ke atas ke kelipatan 1e12 (6 desimal ETH) dengan harga ETH/USD 8 desimal dari Chainlink.
 *  Kelipatan 1e12 menjaga biaya basis-poin tetap bulat per satuan, sehingga pembelian sebagian (1 dari N edisi) sah di Seaport. */
export function usdToWei(usd, ethUsd8) {
  const wei = (BigInt(usd) * 10n ** 26n + ethUsd8 - 1n) / ethUsd8; // usd × 1e18 × 1e8 / harga
  const step = 10n ** 12n;
  return ((wei + step - 1n) / step) * step;
}
export const usdToEth = (usd, ethUsd8) => ethers.formatEther(usdToWei(usd, ethUsd8));

/** Satu baris listing ERC-1155: quantity = sisa edisi, amount = harga satuan × quantity (total order). */
export function listingFor(c, address, k, qty, ethUsd8, expirationTime) {
  const e = edition(c, designOf(c, k));
  return { asset: { tokenAddress: address, tokenId: String(k) }, quantity: qty, amount: ethers.formatEther(usdToWei(e.priceUsd, ethUsd8) * BigInt(qty)), expirationTime, priceUsd: e.priceUsd };
}

/** Saldo kustodi untuk id 1..n (balanceOfBatch per 500). */
async function balances(C, holder, n) {
  const out = new Array(n + 1).fill(0);
  for (let a = 1; a <= n; a += READ_CHUNK) {
    const ids = [];
    for (let k = a; k <= Math.min(n, a + READ_CHUNK - 1); k += 1) ids.push(k);
    const bal = await C.balanceOfBatch(ids.map(() => holder), ids);
    ids.forEach((k, i) => { out[k] = Number(bal[i]); });
  }
  return out;
}

/** Satu putaran kerja. io disuntikkan agar bisa diuji tanpa R2/OpenSea. */
export async function run({ io = realIO(), chainId: chainIn = Number(process.env.CHAIN_ID || 8453), rpc, now = () => Math.floor(Date.now() / 1000), budgetMs = Number(process.env.BUDGET_MIN || 45) * 60_000, log = console.log } = {}) {
  const t0 = Date.now();
  const net = NETS[chainIn] ?? { rpc, feed: null, name: 'lokal', chain: 'base' };
  const provider = new ethers.JsonRpcProvider(rpc ?? net.rpc);
  const chainId = Number((await provider.getNetwork()).chainId);
  const cfgKey = `axto-nft-data/cfg/contracts-${chainId}.json`;
  const cfgText = io.r2get(cfgKey);
  const status = { chainId, network: net.name, at: new Date().toISOString() };
  const putStatus = (extra) => io.r2put('axto-nft-data/cfg/opensea.json', JSON.stringify({ ...status, ...extra }));
  if (!cfgText) { putStatus({ step: 'menunggu kontrak' }); log('Kontrak belum aktif — tidak ada yang dilisting.'); return { waiting: 'contracts' }; }
  const cfg = JSON.parse(cfgText);
  if (cfg.standard !== 'erc1155') { putStatus({ step: 'menunggu kontrak edisi (ERC-1155)' }); log('Kontrak aktif bukan kontrak edisi — tidak ada yang dilisting.'); return { waiting: 'standard' }; }
  const sealed = io.r2get('axto-vault-data/store.enc');
  if (!sealed) throw new Error('kunci wallet toko tidak ada di vault');
  const wallet = new ethers.Wallet(openSealed(sealed), provider);
  if (cfg.store && cfg.store.toLowerCase() !== wallet.address.toLowerCase()) throw new Error('wallet toko tidak cocok dengan kontrak');
  status.store = wallet.address;
  let priv = {};
  try { priv = JSON.parse(io.r2get('axto-nft-data/private/config.json') || '{}'); } catch { priv = {}; }
  const treasury = ethers.isAddress(priv.wallets?.treasury ?? '') ? priv.wallets.treasury : null;

  const stKey = `axto-vault-data/opensea-${chainId}.json`;
  const st = JSON.parse(io.r2get(stKey) || '{}');
  st.until ??= {}; st.listed ??= 0; st.errors ??= []; st.releases ??= [];
  const save = () => io.r2put(stKey, JSON.stringify(st));
  const cols = SHOWCASE_KEYS.filter((c) => ethers.isAddress(cfg.collections?.[c] ?? ''));

  // 2) stok dari rantai
  const stock = {};
  for (const c of cols) {
    const C = new ethers.Contract(cfg.collections[c], ABI, provider);
    const released = Number(await C.released());
    stock[c] = { C, released, bal: await balances(C, wallet.address, released) };
  }

  // 4) rilis lanjutan bila stok menipis (wallet perilis = deployer; gas diisi dari hasil penjualan bila kurang)
  const releasedNow = {};
  const low = cols.filter((c) => {
    const s = stock[c];
    const avail = s.bal.reduce((n, b, k) => n + (k > 0 && b > 0 ? 1 : 0), 0);
    return avail < RELEASE_LOW && s.released < collection(c).max;
  });
  if (low.length) {
    const sealedDep = io.r2get('axto-vault-data/deployer.enc');
    const rel = sealedDep ? new ethers.Wallet(openSealed(sealedDep), provider) : null;
    const fee = await provider.getFeeData();
    const maxFee = (fee.maxFeePerGas ?? fee.gasPrice ?? 10_000_000n) * 2n;
    for (const c of low) {
      const s = stock[c];
      if (!rel || (await s.C.releaser()).toLowerCase() !== rel.address.toLowerCase()) { status.release = 'wallet perilis tidak cocok'; break; }
      const need = RELEASE_GAS * maxFee;
      const have = await provider.getBalance(rel.address);
      if (have < need) {
        const storeBal = await provider.getBalance(wallet.address);
        const topUp = need * 3n - have;
        if (storeBal < topUp + 21_000n * maxFee) { status.release = 'menunggu gas untuk rilis'; break; }
        await (await wallet.sendTransaction({ to: rel.address, value: topUp, gasLimit: 21_000n, maxFeePerGas: maxFee, maxPriorityFeePerGas: fee.maxPriorityFeePerGas ?? 1_000_000n })).wait();
        log(`Gas rilis diisi ${ethers.formatEther(topUp)} ETH dari hasil penjualan.`);
      }
      const n = Math.min(RELEASE_STEP, collection(c).max - s.released);
      const tx = await s.C.connect(rel).release(releaseSupplies(c, s.released + 1, n), { gasLimit: RELEASE_GAS, maxFeePerGas: maxFee, maxPriorityFeePerGas: fee.maxPriorityFeePerGas ?? 1_000_000n });
      await tx.wait();
      for (let k = s.released + 1; k <= s.released + n; k += 1) s.bal[k] = edition(c, designOf(c, k)).supply;
      s.released += n;
      releasedNow[c] = n;
      st.releases.push({ c, n, to: s.released, tx: tx.hash, at: new Date().toISOString() });
      st.releases = st.releases.slice(-50);
      log(`Rilis ${c}: +${n} karya (total ${s.released}) — ${tx.hash}`);
    }
    if (Object.keys(releasedNow).length) {
      // catat jumlah rilis untuk worker (peta karya → token id OpenSea)
      const upd = (key) => { const t = io.r2get(key); if (!t) return; const j = JSON.parse(t); if (Number(j.chainId) !== chainId) return; j.released = { ...(j.released ?? {}), ...Object.fromEntries(cols.map((c) => [c, stock[c].released])) }; io.r2put(key, JSON.stringify(j)); };
      upd(cfgKey);
      upd('axto-nft-data/cfg/active.json');
    }
  }

  // 3) etalase: karya yang masih tersedia (urutan rilis) → worker
  const summary = {};
  for (const c of cols) {
    const s = stock[c];
    const avail = [];
    let soldUnits = 0;
    let editions = 0;
    for (let k = 1; k <= s.released; k += 1) {
      const sup = edition(c, designOf(c, k)).supply;
      editions += sup;
      soldUnits += sup - s.bal[k];
      if (s.bal[k] > 0) avail.push(k);
    }
    s.avail = avail;
    const ids = avail.slice(0, SHOWCASE_N).map((k) => designOf(c, k));
    io.r2put(`axto-nft-data/os/showcase-${c}.json`, JSON.stringify({ c, ids, released: s.released, available: avail.length, soldOut: s.released - avail.length, editions, soldUnits, at: new Date().toISOString() }));
    const keep = new Set(avail);
    st.until[c] = Object.fromEntries(Object.entries(st.until[c] ?? {}).filter(([k]) => keep.has(Number(k))));
    summary[c] = { released: s.released, available: avail.length, soldOut: s.released - avail.length, editions, soldUnits };
  }
  save();

  // 6) teruskan hasil penjualan ke treasury (alamat dari R2 privat)
  const bal = await provider.getBalance(wallet.address);
  if (treasury && bal >= SWEEP_MIN) {
    const fee = await provider.getFeeData();
    const gasPrice = (fee.maxFeePerGas ?? fee.gasPrice ?? 10_000_000n) * 2n;
    const reserve = 21_000n * gasPrice + ethers.parseEther('0.0002'); // cadangan kecil: isi gas rilis berikutnya
    if (bal > reserve) {
      const tx = await wallet.sendTransaction({ to: treasury, value: bal - reserve, gasLimit: 21_000n, maxFeePerGas: gasPrice, maxPriorityFeePerGas: fee.maxPriorityFeePerGas ?? 1_000_000n });
      await tx.wait();
      status.swept = { eth: ethers.formatEther(bal - reserve), tx: tx.hash };
      log(`Hasil penjualan ${ethers.formatEther(bal - reserve)} ETH → treasury (${tx.hash})`);
    }
  } else if (!treasury && bal >= SWEEP_MIN) status.sweep = 'alamat treasury belum ada di R2 privat';

  const base = { collections: summary, sold: Object.fromEntries(cols.map((c) => [c, summary[c].soldUnits])), releases: st.releases.slice(-10), releasedNow };
  // 5) listing harga tetap. Zero hand admin (#48): berjalan sendiri; admin hanya BISA menjeda (cfg/opensea-pause.json).
  const pause = JSON.parse(io.r2get('axto-nft-data/cfg/opensea-pause.json') || '{}');
  if (pause.paused) { putStatus({ step: 'dijeda admin', ...base }); log('Listing dijeda dari Portal admin.'); return { waiting: 'paused', ...base, swept: status.swept ?? null }; }
  if (!process.env.OPENSEA_API_KEY && !io.fakeListing) { putStatus({ step: 'menunggu OPENSEA_API_KEY', ...base }); return { waiting: 'apikey', ...base }; }
  const feed = new ethers.Contract(io.feed ?? net.feed, ['function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)'], provider);
  const [, answer, , updatedAt] = await feed.latestRoundData();
  if (answer <= 0n || now() - Number(updatedAt) > 86_400) throw new Error('harga ETH/USD Chainlink basi');
  const ethUsd8 = BigInt(answer);
  status.ethUsd = Number(ethUsd8) / 1e8;
  const sdk = io.fakeListing ?? await io.sdk(wallet, net.chain);
  const expiration = now() + LIST_DAYS * 86_400;
  let made = 0;
  const failed = [];
  const timeLeft = () => Date.now() - t0 < budgetMs;
  const listBatch = async (c, ks) => {
    const listings = ks.map((k) => listingFor(c, cfg.collections[c], k, stock[c].bal[k], ethUsd8, expiration)).map(({ priceUsd, ...l }) => l);
    const r = await sdk.createBulkListings({ listings, accountAddress: wallet.address, continueOnError: true });
    const bad = new Set((r.failed ?? []).map((f) => f.index));
    ks.forEach((k, i) => { if (!bad.has(i)) { st.until[c] ??= {}; st.until[c][k] = expiration; } });
    for (const f of (r.failed ?? []).slice(0, 3)) failed.push(`${c}#${ks[f.index]}: ${String(f.error?.message ?? f.error).slice(0, 160)}`);
    made += ks.length - bad.size;
    st.listed += ks.length - bad.size;
    save();
  };
  // urutan rilis (= urutan acak etalase), bergiliran antar jenis agar semua koleksi tampil sejak awal
  const due = Object.fromEntries(cols.map((c) => [c, stock[c].avail.filter((k) => !(st.until[c]?.[k] > now() + RENEW_BEFORE))]));
  for (let i = 0; timeLeft() && cols.some((c) => due[c].length > i); i += BATCH) {
    for (const c of cols) {
      if (!timeLeft()) break;
      const ks = due[c].slice(i, i + BATCH);
      if (ks.length) await listBatch(c, ks);
    }
  }
  st.errors = failed.slice(0, 10);
  save();
  const showcase = Object.fromEntries(cols.map((c) => [c, Object.keys(st.until[c] ?? {}).length]));
  putStatus({ step: 'berjalan', listedThisRun: made, listedTotal: st.listed, showcase, showcaseTarget: SHOWCASE_N, ...base, errors: st.errors });
  log(`Listing baru: ${made} · terlisting ${JSON.stringify(showcase)} · gagal ${failed.length}`);
  return { made, showcase, ...base, swept: status.swept ?? null, errors: failed };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  run().then((r) => {
    if (process.env.GITHUB_STEP_SUMMARY && r) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## Listing OpenSea otomatis (harga tetap, edisi 1–10)\n\n${r.waiting ? `Menunggu: ${r.waiting}` : `Listing baru: ${r.made} · terlisting: ${JSON.stringify(r.showcase)} · terjual (edisi): ${JSON.stringify(r.sold)}`}\n`, { flag: 'a' });
  }).catch((e) => { console.error(e.shortMessage || e.message || e); process.exit(1); });
}
