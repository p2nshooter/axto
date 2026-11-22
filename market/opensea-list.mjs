/**
 * Mesin penjualan OpenSea otomatis (perintah pemilik #44 „biar otomatis seluruh NFT di jual di opensea", #45 etalase).
 * Dijalankan workflow opensea-list.yml tiap jam. Tanpa operator, tanpa gas untuk listing:
 *
 *  1. Kunci wallet toko sistem dibuka dari bucket privat vault (axto-vault-data/store.enc, AES-256-GCM, kunci enkripsi
 *     diturunkan dari CLOUDFLARE_API_KEY — sama seperti deployer). Kunci tidak pernah ke repo, log, atau worker publik.
 *  2. Penjualan baru dideteksi dari log Transfer(from = wallet toko) → daftar „terjual" per koleksi.
 *  3. Etalase axto.io (5.000 acak per jenis, engine/src/showcase.js) dihitung ulang tanpa yang terjual → R2
 *     axto-nft-data/os/showcase-<c>.json (dibaca worker). Yang terjual otomatis diganti calon berikutnya.
 *  4. Listing harga tetap per tier (USD → ETH memakai Chainlink ETH/USD di Base) ditandatangani wallet toko (satu
 *     tanda tangan Seaport bulk per batch) dan dikirim ke OpenSea dengan OPENSEA_API_KEY. Urutan: etalase dulu (diperbarui
 *     sebelum kedaluwarsa), lalu sisa koleksi bergulir mengikuti urutan acak yang sama.
 *  5. ETH hasil penjualan di wallet toko diteruskan ke treasury pemilik (wallet toko tidak menyimpan uang).
 *  6. Status ringkas → axto-nft-data/cfg/opensea.json (Portal admin).
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
import { SHOWCASE_KEYS, SHOWCASE_N, showcaseCandidate, showcaseIds, priceUsd } from '../engine/src/showcase.js';
import { collection } from '../engine/src/core.js';

export const TREASURY = '0xDC39C04E704b1fec2BE648c49c842B2B17AfEBDA';
const NETS = {
  8453: { rpc: 'https://mainnet.base.org', feed: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70', name: 'Base', chain: 'base' },
  84532: { rpc: 'https://sepolia.base.org', feed: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1', name: 'Base Sepolia', chain: 'base_sepolia' },
};
export const LIST_DAYS = 30; // listing kedaluwarsa sendiri (tanpa gas pembatalan), lalu diperbarui dengan harga ETH terbaru
const RENEW_BEFORE = 3 * 86_400; // perbarui listing etalase 3 hari sebelum kedaluwarsa
const BATCH = 100; // satu tanda tangan Seaport bulk per 100 listing
const SWEEP_MIN = ethers.parseEther('0.002'); // teruskan ke treasury bila saldo wallet toko ≥ 0,002 ETH
const TRANSFER = ethers.id('Transfer(address,address,uint256)');

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

/** USD → ETH (string desimal, dibulatkan ke atas 6 desimal) dengan harga ETH/USD 8 desimal dari Chainlink. */
export function usdToEth(usd, ethUsd8) {
  const wei = (BigInt(usd) * 10n ** 26n + ethUsd8 - 1n) / ethUsd8; // usd × 1e18 × 1e8 / harga
  const step = 10n ** 12n; // 6 desimal
  return ethers.formatEther(((wei + step - 1n) / step) * step);
}

/** Satu putaran kerja. io disuntikkan agar bisa diuji tanpa R2/OpenSea. */
export async function run({ io = realIO(), chainId: chainIn = Number(process.env.CHAIN_ID || 8453), rpc, now = () => Math.floor(Date.now() / 1000), budgetMs = Number(process.env.BUDGET_MIN || 45) * 60_000, log = console.log } = {}) {
  const t0 = Date.now();
  const net = NETS[chainIn] ?? { rpc, feed: null, name: 'lokal', chain: 'base' };
  const provider = new ethers.JsonRpcProvider(rpc ?? net.rpc);
  const chainId = Number((await provider.getNetwork()).chainId);
  const cfgText = io.r2get(`axto-nft-data/cfg/contracts-${chainId}.json`);
  const status = { chainId, network: net.name, at: new Date().toISOString() };
  const putStatus = (extra) => io.r2put('axto-nft-data/cfg/opensea.json', JSON.stringify({ ...status, ...extra }));
  if (!cfgText) { putStatus({ step: 'menunggu kontrak' }); log('Kontrak belum aktif — tidak ada yang dilisting.'); return { waiting: 'contracts' }; }
  const cfg = JSON.parse(cfgText);
  const sealed = io.r2get('axto-vault-data/store.enc');
  if (!sealed) throw new Error('kunci wallet toko tidak ada di vault');
  const wallet = new ethers.Wallet(openSealed(sealed), provider);
  if (cfg.store && cfg.store.toLowerCase() !== wallet.address.toLowerCase()) throw new Error('wallet toko tidak cocok dengan kontrak');
  status.store = wallet.address;

  const stKey = `axto-vault-data/opensea-${chainId}.json`;
  const st = JSON.parse(io.r2get(stKey) || '{}');
  st.sold ??= {}; st.until ??= {}; st.cursor ??= {}; st.listed ??= 0; st.errors ??= [];
  const save = () => io.r2put(stKey, JSON.stringify(st));

  // 2) penjualan baru: Transfer(from = wallet toko) sejak blok terakhir
  const latest = await provider.getBlockNumber();
  const from = st.lastBlock != null ? st.lastBlock + 1 : latest; // putaran pertama: belum ada penjualan
  const storeTopic = ethers.zeroPadValue(wallet.address, 32);
  for (const c of SHOWCASE_KEYS) {
    const addr = cfg.collections?.[c];
    if (!addr) continue;
    const sold = new Set(st.sold[c] ?? []);
    for (let a = from; a <= latest; a += 5000) {
      const logs = await provider.getLogs({ address: addr, topics: [TRANSFER, storeTopic], fromBlock: a, toBlock: Math.min(latest, a + 4999) });
      for (const l of logs) sold.add(Number(BigInt(l.topics[3])));
    }
    st.sold[c] = [...sold].sort((x, y) => x - y);
  }
  st.lastBlock = latest;

  // 3) etalase 5.000 per jenis tanpa yang terjual → worker
  const shows = {};
  for (const c of SHOWCASE_KEYS) {
    const sold = new Set(st.sold[c]);
    const { ids, scanned } = showcaseIds(c, sold);
    shows[c] = ids;
    io.r2put(`axto-nft-data/os/showcase-${c}.json`, JSON.stringify({ c, ids, scanned, sold: sold.size, at: new Date().toISOString() }));
    // buang catatan kedaluwarsa milik token yang sudah keluar dari etalase
    const keep = new Set(ids);
    st.until[c] = Object.fromEntries(Object.entries(st.until[c] ?? {}).filter(([id]) => keep.has(Number(id))));
    if (st.cursor[c] == null || st.cursor[c] < scanned) st.cursor[c] = scanned; // ekor koleksi dimulai setelah etalase
  }
  save();

  // 5) teruskan hasil penjualan ke treasury
  const bal = await provider.getBalance(wallet.address);
  if (bal >= SWEEP_MIN) {
    const fee = await provider.getFeeData();
    const gasPrice = (fee.maxFeePerGas ?? fee.gasPrice ?? 10_000_000n) * 2n;
    const reserve = 21_000n * gasPrice + ethers.parseEther('0.00002');
    if (bal > reserve) {
      const tx = await wallet.sendTransaction({ to: TREASURY, value: bal - reserve, gasLimit: 21_000n, maxFeePerGas: gasPrice, maxPriorityFeePerGas: fee.maxPriorityFeePerGas ?? 1_000_000n });
      await tx.wait();
      status.swept = { eth: ethers.formatEther(bal - reserve), tx: tx.hash };
      log(`Hasil penjualan ${ethers.formatEther(bal - reserve)} ETH → treasury (${tx.hash})`);
    }
  }

  // 4) listing: etalase dulu, lalu ekor koleksi bergulir
  // Zero hand admin (#48): listing berjalan sendiri begitu kontrak aktif. Admin hanya BISA menjeda (cfg/opensea-pause.json).
  const pause = JSON.parse(io.r2get('axto-nft-data/cfg/opensea-pause.json') || '{}');
  if (pause.paused) { putStatus({ step: 'dijeda admin', sold: Object.fromEntries(Object.entries(st.sold).map(([c, a]) => [c, a.length])) }); log('Listing dijeda dari Portal admin.'); return { waiting: 'paused', sold: st.sold, swept: status.swept ?? null }; }
  if (!process.env.OPENSEA_API_KEY && !io.fakeListing) { putStatus({ step: 'menunggu OPENSEA_API_KEY', sold: Object.fromEntries(Object.entries(st.sold).map(([c, a]) => [c, a.length])) }); return { waiting: 'apikey' }; }
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
  const listBatch = async (c, ids) => {
    const listings = ids.map((id) => ({ asset: { tokenAddress: cfg.collections[c], tokenId: String(id) }, amount: usdToEth(priceUsd(c, id), ethUsd8), expirationTime: expiration }));
    const r = await sdk.createBulkListings({ listings, accountAddress: wallet.address, continueOnError: true });
    const bad = new Set((r.failed ?? []).map((f) => f.index));
    ids.forEach((id, i) => { if (!bad.has(i)) { st.until[c] ??= {}; if (shows[c].includes(id)) st.until[c][id] = expiration; } });
    for (const f of (r.failed ?? []).slice(0, 3)) failed.push(`${c}#${ids[f.index]}: ${String(f.error?.message ?? f.error).slice(0, 160)}`);
    made += ids.length - bad.size;
    st.listed += ids.length - bad.size;
    save();
    return bad.size;
  };
  // 4a) etalase: yang belum pernah dilisting atau akan kedaluwarsa
  for (const c of SHOWCASE_KEYS) {
    if (!cfg.collections?.[c]) continue;
    const due = shows[c].filter((id) => !(st.until[c]?.[id] > now() + RENEW_BEFORE));
    for (let i = 0; i < due.length && timeLeft(); i += BATCH) await listBatch(c, due.slice(i, i + BATCH));
  }
  // 4b) ekor koleksi: lanjut dari cursor (urutan acak yang sama), bergiliran antar jenis; balik ke awal setelah selesai
  let progress = true;
  while (timeLeft() && progress) {
    progress = false;
    for (const c of SHOWCASE_KEYS) {
      if (!cfg.collections?.[c] || !timeLeft()) continue;
      const max = collection(c).max;
      const sold = new Set(st.sold[c]);
      const ids = [];
      let k = st.cursor[c];
      while (ids.length < BATCH && k < max) { const id = showcaseCandidate(c, k); k += 1; if (!sold.has(id)) ids.push(id); }
      st.cursor[c] = k >= max ? 0 : k; // putaran baru: listing lama sudah/akan kedaluwarsa
      if (ids.length) { await listBatch(c, ids); progress = true; }
    }
  }
  st.errors = failed.slice(0, 10);
  save();
  const showListed = Object.fromEntries(SHOWCASE_KEYS.map((c) => [c, Object.keys(st.until[c] ?? {}).length]));
  putStatus({ step: 'berjalan', listedThisRun: made, listedTotal: st.listed, showcase: showListed, showcaseTarget: SHOWCASE_N, sold: Object.fromEntries(Object.entries(st.sold).map(([c, a]) => [c, a.length])), cursor: st.cursor, errors: st.errors });
  log(`Listing baru: ${made} · etalase terlisting ${JSON.stringify(showListed)} · gagal ${failed.length}`);
  return { made, showcase: showListed, sold: st.sold, swept: status.swept ?? null, errors: failed };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  run().then((r) => {
    if (process.env.GITHUB_STEP_SUMMARY && r) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## Listing OpenSea otomatis\n\n${r.waiting ? `Menunggu: ${r.waiting}` : `Listing baru: ${r.made} · etalase: ${JSON.stringify(r.showcase)}`}\n`, { flag: 'a' });
  }).catch((e) => { console.error(e.shortMessage || e.message || e); process.exit(1); });
}
