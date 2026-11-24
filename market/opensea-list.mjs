/**
 * Mesin penjualan OpenSea otomatis — keputusan pemilik 24 Nov 2026 (engine/src/opensea.js):
 *   „100jt NFT dengan suplly 1-10 per series dan harga $1-$10000" · „Edisi 1 dulu, sisanya otomatis" ·
 *   „5 koleksi seri G- × 10 juta" · „Harga tetap saja, jgn auction" (23 Nov).
 * Dijalankan workflow opensea-list.yml tiap jam. Tanpa operator; listing tanpa gas (tanda tangan Seaport):
 *
 *  1. Kunci wallet toko sistem (kustodi & minter 10 koleksi ERC-721) dibuka dari bucket privat vault
 *     (axto-vault-data/store.enc, AES-256-GCM, kunci diturunkan dari CLOUDFLARE_API_KEY). Tidak pernah ke repo/log.
 *  2. Penjualan dibaca dari rantai: event Transfer keluar dari wallet toko sejak blok terakhir yang dipindai.
 *  3. Edisi berikutnya karya yang laku (sampai 1–10 edisi menurut kelangkaan) dicetak wallet toko lewat mintBatch —
 *     gas dibayar dari hasil penjualan yang masuk ke wallet toko. Karya yang edisi terakhirnya laku keluar dari etalase.
 *  4. Etalase per koleksi = WINDOW karya pertama dalam urutan acak etalase (showcase.js) yang belum habis; untuk koleksi
 *     publik ditulis ke R2 axto-nft-data/os/showcase-<c>.json (dibaca worker).
 *  5. Listing HARGA TETAP per token (USD → ETH memakai Chainlink ETH/USD di Base, satu tanda tangan Seaport bulk per
 *     batch), kedaluwarsa sendiri setelah 30 hari lalu diperbarui dengan harga ETH terbaru. Tanpa lelang.
 *  6. ETH hasil penjualan + royalti 10% (keduanya masuk wallet toko) di atas cadangan gas pencetakan diteruskan ke alamat
 *     deposit ETH jaringan Base milik akun Indodax (axto-nft-data/pay/cfg.json, dibaca worker dari API Indodax); bila
 *     alamat itu belum dibuat di Indodax, ke treasury pemilik (R2 privat). Setiap kiriman dicatat (pay/sweep/<tx>).
 *  7. Status ringkas → axto-nft-data/cfg/opensea.json (Portal admin).
 *
 * ENV: CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, CLOUDFLARE_ACCOUNT_ID, OPENSEA_API_KEY, CHAIN_ID (8453), [BUDGET_MIN], [OS_WINDOW]
 * Uji lokal tanpa R2/OpenSea: lihat test/opensea-list.test.mjs (semua I/O disuntikkan lewat `io`).
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmac, createDecipheriv } from 'node:crypto';
import { ethers } from 'ethers';
import { SHOWCASE_N, showcaseCandidate } from '../engine/src/showcase.js';
import { LIST_COLS, STAKE_COL, tokenOfCol, tokenInfo, nextToken } from '../engine/src/opensea.js';
import { stakeFree, stakeShowcase } from '../engine/src/stake.js';

const NETS = {
  8453: { rpc: 'https://mainnet.base.org', feed: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70', name: 'Base', chain: 'base' },
  84532: { rpc: 'https://sepolia.base.org', feed: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1', name: 'Base Sepolia', chain: 'base_sepolia' },
};
export const LIST_DAYS = 30; // listing kedaluwarsa sendiri (tanpa gas pembatalan), lalu diperbarui dengan harga ETH terbaru
const RENEW_BEFORE = 3 * 86_400; // perbarui listing 3 hari sebelum kedaluwarsa
const BATCH = 100; // satu tanda tangan Seaport bulk per 100 listing
export const WINDOW = Number(process.env.OS_WINDOW || SHOWCASE_N); // karya terlisting per koleksi
const MINT_BATCH = 200; // edisi berikutnya per transaksi mintBatch
const MINT_GAS = (n) => 60_000n + 60_000n * BigInt(n); // batas gas mintBatch (terukur ±35 rb per token)
const LOG_CHUNK = 5_000; // blok per eth_getLogs
export const RESERVE = ethers.parseEther('0.0005'); // cadangan gas pencetakan edisi berikutnya di wallet toko
const SWEEP_MIN = ethers.parseEther('0.002'); // teruskan ke treasury bila saldo wallet toko ≥ 0,002 ETH
/** Kiriman ke Indodax minimal 0,01 ETH: deposit di bawah batas minimum bursa tidak dikreditkan. */
export const SWEEP_MIN_EXCHANGE = ethers.parseEther('0.01');
const ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'function mintBatch(address to, uint256[] tokenIds)',
  'function exists(uint256 tokenId) view returns (bool)',
];

/** Koleksi hadiah staking (engine/src/stake.js): dikirim wallet toko dengan transferBatch — gas oleh axto.io. */
const STAKE_ABI = ['function transferBatch(address to, uint256[] tokenIds)', 'function ownerOf(uint256 tokenId) view returns (address)', 'function isApprovedForAll(address owner, address operator) view returns (bool)', 'function setApprovalForAll(address operator, bool approved)'];
const CONDUIT = '0x1E0049783F008A0085193E00003D00cd54003c71'; // konduit OpenSea (Seaport)

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
  // API internal worker (HMAC sama dengan contracts/scripts/auto-deploy.mjs): antrean kirim hadiah staking
  const stakeApi = async (method, path, payload) => {
    const base = process.env.AXTO_API || 'https://axto.io';
    const key = process.env.ENGINE_HMAC_KEY || createHmac('sha256', process.env.CLOUDFLARE_API_KEY || 'local').update('axto:ENGINE_HMAC_KEY').digest('hex');
    const body = payload ? JSON.stringify(payload) : '';
    const ts = Date.now();
    const sig = createHmac('sha256', key).update(`${ts}.${body}`).digest('hex');
    const r = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json', 'x-axto-ts': String(ts), 'x-axto-sig': sig }, body: method === 'GET' ? undefined : body });
    return r.json();
  };
  return { r2get, r2put, stakeApi, api: stakeApi, sdk: async (wallet, chain) => { const { OpenSeaSDK } = await import('@opensea/sdk'); return new OpenSeaSDK(wallet, { chain, apiKey: process.env.OPENSEA_API_KEY }); } };
}

const encKey = () => createHmac('sha256', process.env.CLOUDFLARE_API_KEY || 'local').update('axto:DEPLOYER_ENC').digest();
export function openSealed(s) {
  const j = JSON.parse(s);
  const d = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(j.iv, 'base64'));
  d.setAuthTag(Buffer.from(j.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(j.ct, 'base64')), d.final()]).toString('utf8');
}

/** USD → wei, dibulatkan ke atas ke kelipatan 1e12 (6 desimal ETH) dengan harga ETH/USD 8 desimal dari Chainlink. */
export function usdToWei(usd, ethUsd8) {
  const wei = (BigInt(usd) * 10n ** 26n + ethUsd8 - 1n) / ethUsd8; // usd × 1e18 × 1e8 / harga
  const step = 10n ** 12n;
  return ((wei + step - 1n) / step) * step;
}
export const usdToEth = (usd, ethUsd8) => ethers.formatEther(usdToWei(usd, ethUsd8));

/** Satu listing ERC-721 harga tetap untuk token `tokenId` koleksi `key` (harga dari edisi karya itu). */
export function listingFor(key, address, tokenId, ethUsd8, expirationTime) {
  const i = tokenInfo(key, tokenId);
  if (!i) throw new RangeError(`token ${key}#${tokenId} tidak sah`);
  return { asset: { tokenAddress: address, tokenId: String(tokenId) }, amount: usdToEth(i.priceUsd, ethUsd8), expirationTime, priceUsd: i.priceUsd };
}

/** Satu putaran kerja. io disuntikkan agar bisa diuji tanpa R2/OpenSea. */
export async function run({ io = realIO(), chainId: chainIn = Number(process.env.CHAIN_ID || 8453), rpc, now = () => Math.floor(Date.now() / 1000), budgetMs = Number(process.env.BUDGET_MIN || 45) * 60_000, window = WINDOW, log = console.log } = {}) {
  const t0 = Date.now();
  const net = NETS[chainIn] ?? { rpc, feed: null, name: 'lokal', chain: 'base' };
  // tanpa cache permintaan ethers (bawaan 250 ms): saldo & nonce harus segar di antara transaksi berurutan
  const provider = new ethers.JsonRpcProvider(rpc ?? net.rpc, undefined, { cacheTimeout: -1 });
  const chainId = Number((await provider.getNetwork()).chainId);
  const cfgText = io.r2get(`axto-nft-data/cfg/contracts-${chainId}.json`);
  const status = { chainId, network: net.name, at: new Date().toISOString() };
  const putStatus = (extra) => io.r2put('axto-nft-data/cfg/opensea.json', JSON.stringify({ ...status, ...extra }));
  if (!cfgText) { putStatus({ step: 'menunggu kontrak' }); log('Kontrak belum aktif — tidak ada yang dilisting.'); return { waiting: 'contracts' }; }
  const cfg = JSON.parse(cfgText);
  if (cfg.standard !== 'erc721-editions') { putStatus({ step: 'menunggu kontrak edisi ERC-721' }); log('Kontrak aktif bukan kontrak edisi ERC-721 — tidak ada yang dilisting.'); return { waiting: 'standard' }; }
  const sealed = io.r2get('axto-vault-data/store.enc');
  if (!sealed) throw new Error('kunci wallet toko tidak ada di vault');
  const wallet = new ethers.Wallet(openSealed(sealed), provider);
  if (cfg.store && cfg.store.toLowerCase() !== wallet.address.toLowerCase()) throw new Error('wallet toko tidak cocok dengan kontrak');
  status.store = wallet.address;
  let priv = {};
  try { priv = JSON.parse(io.r2get('axto-nft-data/private/config.json') || '{}'); } catch { priv = {}; }
  const treasury = ethers.isAddress(priv.wallets?.treasury ?? '') ? priv.wallets.treasury : null;
  // alamat deposit ETH jaringan Base milik akun Indodax (pemilik: „semua ter central menggunakan indodax")
  let exchange = null;
  try {
    const pc = JSON.parse(io.r2get('axto-nft-data/pay/cfg.json') || '{}');
    const a = pc.opts?.find((o) => o.coin === 'eth')?.nets?.find((n) => n.net === 'base')?.addr ?? '';
    if (ethers.isAddress(a)) exchange = ethers.getAddress(a);
  } catch { exchange = null; }

  const stKey = `axto-vault-data/opensea-${chainId}.json`;
  const st = JSON.parse(io.r2get(stKey) || '{}');
  for (const f of ['from', 'cur', 'out', 'until', 'pend']) st[f] ??= {};
  st.listed ??= 0; st.errors ??= []; st.minted ??= [];
  const save = () => io.r2put(stKey, JSON.stringify(st));
  // 10 koleksi edisi 1–10 + 3 koleksi 1/1 (pemilik 24 Nov 2026) — koleksi staking TIDAK pernah dilisting
  const cols = LIST_COLS.filter((c) => ethers.isAddress(cfg.collections?.[c.key] ?? ''));
  const head = await provider.getBlockNumber();
  const fee = await provider.getFeeData();
  const tip = fee.maxPriorityFeePerGas ?? 1_000_000n;
  const maxFee = (fee.maxFeePerGas ?? fee.gasPrice ?? 10_000_000n) * 2n;
  // nonce dikelola sendiri: beberapa transaksi berurutan dalam satu putaran (cetak edisi, teruskan hasil jual)
  let nonce = await provider.getTransactionCount(wallet.address, 'pending');

  // 1b) sisa hadiah staking → pasar (pemilik 24 Nov 2026): begitu staking ditutup, token yang belum pernah diundikan ikut
  // dilisting harga tetap (1/1, tier). Wallet toko menyetujui konduit OpenSea sekali untuk koleksi staking.
  let stakePools = null;
  const stakeAddr0 = cfg.collections?.stake;
  if (ethers.isAddress(stakeAddr0 ?? '') && io.stakeApi) {
    const ss = await io.stakeApi('GET', '/internal/stake/stok').catch(() => null);
    if (ss && ss.open === false && ss.pools) {
      const scol = new ethers.Contract(stakeAddr0, STAKE_ABI, wallet);
      if (!(await scol.isApprovedForAll(wallet.address, CONDUIT))) {
        const t = await scol.setApprovalForAll(CONDUIT, true, { maxFeePerGas: maxFee, maxPriorityFeePerGas: tip, nonce: nonce++ });
        await t.wait();
        log(`Staking ditutup: sisa hadiah dilepas ke pasar OpenSea (persetujuan konduit ${t.hash})`);
      }
      stakePools = ss.pools;
      cols.push(STAKE_COL);
    }
  }

  // 2) penjualan: Transfer keluar dari wallet toko sejak blok terakhir → edisi berikutnya masuk antrean cetak
  const sold = {};
  for (const c of cols) {
    const k = c.key;
    for (const f of ['cur', 'out', 'until']) st[f][k] ??= {};
    st.pend[k] ??= [];
    const C = new ethers.Contract(cfg.collections[k], ABI, provider);
    if (st.from[k] === undefined) { st.from[k] = head; continue; } // putaran pertama: belum ada listing, belum ada penjualan
    sold[k] = 0;
    for (let a = st.from[k] + 1; a <= head; a += LOG_CHUNK) {
      const b = Math.min(head, a + LOG_CHUNK - 1);
      for (const ev of await C.queryFilter(C.filters.Transfer(wallet.address, null), a, b)) {
        const t = Number(ev.args.tokenId);
        const i = tokenInfo(k, t);
        if (!i) continue;
        sold[k] += 1;
        delete st.until[k][t];
        const nx = nextToken(k, t);
        if (nx) { st.cur[k][i.work] = nx; if (!st.pend[k].includes(nx)) st.pend[k].push(nx); }
        else { st.out[k][i.work] = true; delete st.cur[k][i.work]; }
      }
      st.from[k] = b;
    }
  }
  save();

  // 3) cetak edisi berikutnya (gas dari hasil penjualan di wallet toko)
  const minted = {};
  for (const c of cols) {
    const k = c.key;
    const C = new ethers.Contract(cfg.collections[k], ABI, wallet);
    while (st.pend[k].length) {
      const batch = [];
      for (const t of st.pend[k].slice(0, MINT_BATCH)) if (!(await C.exists(t))) batch.push(t);
      if (batch.length) {
        const gas = MINT_GAS(batch.length);
        if ((await provider.getBalance(wallet.address)) < gas * maxFee) { status.mint = 'menunggu hasil penjualan untuk gas cetak edisi berikutnya'; break; }
        const tx = await C.mintBatch(wallet.address, batch, { gasLimit: gas, maxFeePerGas: maxFee, maxPriorityFeePerGas: tip, nonce: nonce++ });
        await tx.wait();
        minted[k] = (minted[k] ?? 0) + batch.length;
        st.minted.push({ c: k, n: batch.length, tx: tx.hash, at: new Date().toISOString() });
        st.minted = st.minted.slice(-50);
        log(`Edisi berikutnya ${k}: +${batch.length} (${tx.hash})`);
      }
      st.pend[k] = st.pend[k].slice(MINT_BATCH);
      save();
    }
  }

  // 4) etalase: WINDOW karya pertama (urutan acak etalase) yang belum habis; token terlisting = edisi yang sedang dijual
  const win = {};
  const summary = {};
  for (const c of cols) {
    const k = c.key;
    const pend = new Set(st.pend[k]);
    const works = [];
    let i = 0;
    for (; works.length < window && i < 10_000_000; i += 1) {
      const w = c.stake ? stakeShowcase(i) : showcaseCandidate(c.base, i);
      if (!st.out[k][w] && (!c.stake || stakeFree(w, stakePools))) works.push(w);
    }
    win[k] = works.map((w) => st.cur[k][w] ?? tokenOfCol(k, w, 1)).filter((t) => !pend.has(t));
    const keep = new Set(win[k].map(String));
    st.until[k] = Object.fromEntries(Object.entries(st.until[k]).filter(([t]) => keep.has(t)));
    summary[k] = { window: works.length, soldOut: Object.keys(st.out[k]).length, sold: sold[k] ?? 0, minted: minted[k] ?? 0 };
    if (!c.g) io.r2put(`axto-nft-data/os/showcase-${c.base}.json`, JSON.stringify({ c: c.base, ids: works, available: works.length, soldOut: summary[k].soldOut, at: new Date().toISOString() }));
  }
  save();

  // 3b) hadiah staking koin AXTO yang jatuh tempo: kirim ke alamat penerima, gas dari wallet toko (gratis bagi member)
  status.stake = { sent: 0 };
  const stakeAddr = cfg.collections?.stake;
  if (ethers.isAddress(stakeAddr ?? '') && io.stakeApi) {
    const scol = new ethers.Contract(stakeAddr, STAKE_ABI, wallet);
    const todo = await io.stakeApi('GET', '/internal/stake/kirim').catch((e) => ({ items: [], error: String(e?.message ?? e) }));
    for (const it of todo.items ?? []) {
      if (Date.now() - t0 > budgetMs) break;
      if (!it.ids?.length || !ethers.isAddress(it.payout ?? '')) continue;
      const owner0 = String(await scol.ownerOf(it.ids[0]).catch(() => '')).toLowerCase();
      let tx = null;
      if (owner0 === wallet.address.toLowerCase()) {
        const gasLimit = BigInt(it.ids.length) * 60_000n + 80_000n;
        if ((await provider.getBalance(wallet.address)) < gasLimit * maxFee) { status.stake.waiting = 'gas'; break; }
        const t = await scol.transferBatch(it.payout, it.ids, { gasLimit, maxFeePerGas: maxFee, maxPriorityFeePerGas: tip, nonce: nonce++ });
        await t.wait();
        tx = t.hash;
      } else if (owner0 !== it.payout.toLowerCase()) {
        st.errors = [...st.errors.slice(-20), { at: new Date().toISOString(), stake: it.id, e: `pemilik token ${it.ids[0]} bukan wallet toko` }];
        continue;
      }
      // batch yang sudah terkirim (tx null) tetap dicatat agar tidak dikirim ulang
      await io.stakeApi('POST', '/internal/stake/terkirim', { id: it.id, tier: it.tier, offset: it.offset, count: it.ids.length, tx });
      status.stake.sent += it.ids.length;
      log(`Hadiah staking ${it.id}: ${it.ids.length} NFT ${it.tier} → ${it.payout}${tx ? ` (${tx})` : ' (sudah terkirim)'}`);
    }
  }

  // 6) teruskan hasil penjualan + royalti ke Indodax (atau treasury), sisakan cadangan gas pencetakan edisi berikutnya
  const bal = await provider.getBalance(wallet.address);
  const dest = exchange ?? treasury;
  const reserve = 21_000n * maxFee + RESERVE;
  const amount = bal > reserve ? bal - reserve : 0n;
  if (dest && amount >= (exchange ? SWEEP_MIN_EXCHANGE : SWEEP_MIN)) {
    const tx = await wallet.sendTransaction({ to: dest, value: amount, gasLimit: 21_000n, maxFeePerGas: maxFee, maxPriorityFeePerGas: tip, nonce: nonce++ });
    await tx.wait();
    const to = exchange ? 'indodax' : 'treasury';
    // dicatat agar sinkron deposit Indodax mengenalinya sebagai setoran hasil penjualan, bukan pembayaran member
    io.r2put(`axto-nft-data/pay/sweep/${tx.hash.toLowerCase()}.json`, JSON.stringify({ tx: tx.hash, to, eth: ethers.formatEther(amount), at: new Date().toISOString() }));
    status.swept = { eth: ethers.formatEther(amount), tx: tx.hash, to };
    log(`Hasil penjualan ${ethers.formatEther(amount)} ETH → ${to} (${tx.hash})`);
  } else if (!dest && amount >= SWEEP_MIN) status.sweep = 'alamat deposit ETH Base Indodax & treasury belum ada';
  else if (!exchange && amount >= SWEEP_MIN) status.sweep = 'alamat deposit ETH jaringan Base di Indodax belum dibuat — sementara ke treasury';

  const base = { collections: summary, minted, sold };
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
  const listBatch = async (k, ts) => {
    const listings = ts.map((t) => listingFor(k, cfg.collections[k], t, ethUsd8, expiration)).map(({ priceUsd, ...l }) => l);
    const r = await sdk.createBulkListings({ listings, accountAddress: wallet.address, continueOnError: true });
    const bad = new Set((r.failed ?? []).map((f) => f.index));
    ts.forEach((t, i) => { if (!bad.has(i)) st.until[k][t] = expiration; });
    for (const f of (r.failed ?? []).slice(0, 3)) failed.push(`${k}#${ts[f.index]}: ${String(f.error?.message ?? f.error).slice(0, 160)}`);
    made += ts.length - bad.size;
    st.listed += ts.length - bad.size;
    save();
  };
  // urutan etalase, bergiliran antar koleksi agar semua koleksi tampil sejak awal
  const due = Object.fromEntries(cols.map((c) => [c.key, win[c.key].filter((t) => !(st.until[c.key][t] > now() + RENEW_BEFORE))]));
  for (let i = 0; timeLeft() && cols.some((c) => due[c.key].length > i); i += BATCH) {
    for (const c of cols) {
      if (!timeLeft()) break;
      const ts = due[c.key].slice(i, i + BATCH);
      if (ts.length) await listBatch(c.key, ts);
    }
  }
  st.errors = failed.slice(0, 10);
  save();
  const showcase = Object.fromEntries(cols.map((c) => [c.key, Object.keys(st.until[c.key] ?? {}).length]));
  putStatus({ step: 'berjalan', listedThisRun: made, listedTotal: st.listed, showcase, showcaseTarget: window, ...base, errors: st.errors });
  log(`Listing baru: ${made} · terlisting ${JSON.stringify(showcase)} · gagal ${failed.length}`);
  return { made, showcase, ...base, swept: status.swept ?? null, errors: failed };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  run().then((r) => {
    if (process.env.GITHUB_STEP_SUMMARY && r) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## Listing OpenSea otomatis (ERC-721, edisi 1–10, harga tetap)\n\n${r.waiting ? `Menunggu: ${r.waiting}` : `Listing baru: ${r.made} · terlisting: ${JSON.stringify(r.showcase)} · terjual: ${JSON.stringify(r.sold)} · edisi baru dicetak: ${JSON.stringify(r.minted)}`}\n`, { flag: 'a' });
  }).catch((e) => { console.error(e.shortMessage || e.message || e); process.exit(1); });
}
