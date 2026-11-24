/**
 * Sinkron pembayaran kripto dari runner GitHub (pemilik 24 Nov 2026: „jika pembayaran di Terima baru pembelian berhasil").
 * API akun penampung menolak jaringan worker Cloudflare (HTTP 403) tetapi menerima runner GitHub, jadi runner yang membaca:
 *  - alamat deposit semua koin (satu panggilan per koin, di awal putaran);
 *  - riwayat deposit 2 hari terakhir per koin yang punya alamat, tiap POLL_MS selama BUDGET_MS.
 * Jawaban dikirim apa adanya ke worker (POST /internal/pay/ingest, HMAC); pencocokan & pengkreditan tetap di worker
 * (worker/src/pay.js). Hanya titik BACA yang dipanggil — kunci API izin lihat, tidak pernah menarik dana atau berdagang.
 *
 * ENV: PAY_API_KEY, PAY_API_SECRET, CLOUDFLARE_API_KEY (turunan kunci HMAC engine) atau ENGINE_HMAC_KEY, [AXTO_API],
 *      [BUDGET_MS], [POLL_MS]
 */
import { createHmac } from 'node:crypto';

export const BASE = 'https://api.indodax.com';
export const COINS = ['usdt', 'usdc', 'eth', 'btc', 'bnb', 'sol', 'trx', 'pol', 'doge', 'ltc'];
const READ = new Set(['/api/v2/capital/deposit/address/list', '/api/v2/capital/deposit/hisrec']);

/** Panggilan baca bertanda tangan (HMAC-SHA256 atas query string). Galat → Error('gw:<kode>'). */
export async function call(fetchImpl, key, secret, path, params) {
  if (!READ.has(path)) throw new Error('gw:method');
  const q = new URLSearchParams({ ...params, timestamp: String(Date.now()), recvWindow: '10000' }).toString();
  const sign = createHmac('sha256', secret).update(q).digest('hex');
  const r = await fetchImpl(`${BASE}${path}?${q}`, { headers: { 'X-APIKEY': key, Sign: sign, accept: 'application/json' } });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch { j = null; }
  if (!r.ok || j === null || (!Array.isArray(j) && j.code !== undefined)) throw new Error(`gw:${j?.code ?? r.status}`);
  return j;
}

/** Kirim ke worker dengan tanda tangan engine (sama dengan /internal/contracts). */
export async function post(fetchImpl, api, hmacKey, body) {
  const text = JSON.stringify(body);
  const ts = Date.now();
  const sig = createHmac('sha256', hmacKey).update(`${ts}.${text}`).digest('hex');
  const r = await fetchImpl(`${api}/internal/pay/ingest`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-axto-ts': String(ts), 'x-axto-sig': sig }, body: text });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(`ingest ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

export async function run({
  fetchImpl = globalThis.fetch,
  key = process.env.PAY_API_KEY,
  secret = process.env.PAY_API_SECRET,
  api = process.env.AXTO_API || 'https://axto.io',
  hmacKey = process.env.ENGINE_HMAC_KEY || (process.env.CLOUDFLARE_API_KEY ? createHmac('sha256', process.env.CLOUDFLARE_API_KEY).update('axto:ENGINE_HMAC_KEY').digest('hex') : ''),
  budgetMs = Number(process.env.BUDGET_MS || 540_000),
  pollMs = Number(process.env.POLL_MS || 20_000),
  now = Date.now,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  log = console.log,
} = {}) {
  if (!key || !secret) { log('Kunci API pembayaran belum ada — tidak ada yang dibaca.'); return { waiting: 'key' }; }
  if (!hmacKey) throw new Error('kunci HMAC engine tidak ada');
  const t0 = now();
  // 1) alamat deposit: satu panggilan per koin (tanpa parameter jaringan → semua jaringan koin itu)
  const addresses = [];
  const errors = {};
  for (const c of COINS) {
    try {
      const j = await call(fetchImpl, key, secret, '/api/v2/capital/deposit/address/list', { coin: c.toUpperCase() });
      for (const r of j) addresses.push({ ...r, coin: r?.coin || c.toUpperCase() });
    } catch (e) { errors[e.message] = (errors[e.message] ?? 0) + 1; }
  }
  const coins = [...new Set(addresses.filter((r) => r?.address).map((r) => String(r.coin).toLowerCase()).map((c) => (c === 'matic' ? 'pol' : c)))].filter((c) => COINS.includes(c));
  const first = await post(fetchImpl, api, hmacKey, { addresses });
  log(`Alamat deposit: ${first.options?.join(' · ') || 'tidak ada'}${Object.keys(errors).length ? ` · galat ${JSON.stringify(errors)}` : ''}`);
  // 2) riwayat deposit per koin, berulang sampai batas waktu (deposit sukses → pembelian berhasil di worker)
  let rounds = 0;
  let matched = 0;
  let seen = 0;
  const depErr = {};
  do {
    const deposits = {};
    const end = now();
    for (const c of coins) {
      try {
        deposits[c] = await call(fetchImpl, key, secret, '/api/v2/capital/deposit/hisrec', { coin: c.toUpperCase(), startTime: String(end - 2 * 86_400_000), endTime: String(end), limit: '1000' });
      } catch (e) { depErr[e.message] = (depErr[e.message] ?? 0) + 1; }
    }
    // harga ticker publik (worker bisa ditolak bursa juga untuk ticker) — hanya `last` koin yang dipakai
    let tickers;
    try {
      const tr = await fetchImpl('https://indodax.com/api/ticker_all', { headers: { accept: 'application/json' } });
      const all = tr.ok ? (await tr.json())?.tickers ?? {} : {};
      tickers = Object.fromEntries([...COINS, 'matic'].map((c) => [`${c}_idr`, all[`${c}_idr`]]).filter(([, v]) => Number(v?.last) > 0).map(([k, v]) => [k, { last: v.last }]));
    } catch { tickers = undefined; }
    const r = await post(fetchImpl, api, hmacKey, { deposits, tickers });
    matched += r.matched ?? 0;
    seen = r.seen ?? seen;
    rounds += 1;
    if (now() - t0 + pollMs > budgetMs) break;
    await sleep(pollMs);
  } while (now() - t0 < budgetMs);
  log(`Riwayat deposit: ${rounds} putaran, ${seen} deposit sukses terlihat, ${matched} pembayaran baru dicocokkan${Object.keys(depErr).length ? ` · galat ${JSON.stringify(depErr)}` : ''}`);
  return { coins, rounds, matched, seen, errors, depErr };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  run().catch((e) => { console.error(e.message || e); process.exit(1); });
}
