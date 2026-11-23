/**
 * Produksi seri G- di worker axto.io (pemilik, 23 Nov 2026: „series G- berhenti produksi, kenapa ini" · „Pastikan produksi
 * berjalan 24 jam non stop" · „Tapi semuanya tetep gratis").
 *
 * Penyebab berhenti: produksi hanya digerakkan cron GitHub Actions, dan GitHub melewatkan jadwal saat sibuk (gpu-sync
 * tidak pernah sekali pun terpicu jadwal). Sekarang Cron Trigger worker (tiap 5 menit, andal) ikut melukis dengan Workers
 * AI — GRATIS: jatah harian dibatasi jauh di bawah alokasi gratis akun (10.000 neuron/hari, dipakai bersama layanan lain;
 * FLUX schnell ±77 neuron/karya) dan disebar merata 24 jam. Bila alokasi gratis habis (galat 4006) produksi Workers AI
 * berhenti sampai esok hari — tidak pernah berbayar. Penyedia lain tetap jalan lewat ops/gpu-sync.mjs (penjaga produksi).
 *
 * Gambar bertanda situs lain (watermark penyedia GPU terbuka) tidak pernah tampil: karya itu disembunyikan dan dilukis
 * ulang di sini lebih dulu, dengan nomor seri G- yang SAMA.
 *
 * Penyimpanan hanya R2: gambar gpu/<c>/<id>.png, seri os/gpu-<c>.json (compare-and-swap, tidak dobel), jatah harian
 * os/gpu-jatah/<tanggal>.json (satu tulis per karya), galat ke log append-only.
 */
import { Buffer } from 'node:buffer';
import { GPU_KEYS, candidates, promptFor, tambahSeri } from '../../engine/src/gpu.js';
import { getJSON, update, appendLog } from './r2.js';

export const GPU_HARIAN = 48;
/** Penyedia yang gambarnya bertanda situs lain → disembunyikan & dilukis ulang (nomor seri tetap). */
export const PERLU_ULANG = new Set(['pollinations']);
const MODEL = '@cf/black-forest-labs/flux-1-schnell';
const tanggal = (now) => new Date(now).toISOString().slice(0, 10);
const kunciJatah = (now) => `os/gpu-jatah/${tanggal(now)}.json`;
const batasHarian = (env) => { const n = Number(env.GPU_HARIAN); return Number.isInteger(n) && n >= 0 && n <= 120 ? n : GPU_HARIAN; };

/**
 * Ambil satu jatah Workers AI hari ini (CAS). `rata`: jatah dibuka bertahap sepanjang hari (produksi 24 jam, bukan habis
 * di pagi hari). Mengembalikan false bila jatah habis / belum terbuka / alokasi gratis akun sudah habis.
 */
export async function ambilJatah(bucket, { now = Date.now(), cap = GPU_HARIAN, rata = true } = {}) {
  const menit = Math.floor((now % 86_400_000) / 60_000);
  const terbuka = rata ? Math.min(cap, Math.ceil((cap * (menit + 5)) / 1440)) : cap;
  let ok = false;
  await update(bucket, kunciJatah(now), (cur) => {
    const n = cur?.n ?? 0;
    if (cur?.habis || n >= terbuka) { ok = false; return undefined; }
    ok = true;
    return { n: n + 1, cap, at: new Date(now).toISOString() };
  });
  return ok;
}

const tandaiHabis = (bucket, now) => update(bucket, kunciJatah(now), (cur) => ({ ...(cur ?? { n: 0 }), habis: true, at: new Date(now).toISOString() }));
const alokasiHabis = (m) => /\b4006\b|daily free allocation|neurons/i.test(m);

/** Workers AI melukis satu karya → R2 gpu/<c>/<id>.png. Melempar galat bila gagal. */
export async function lukisWorkersAI(env, c, id, prompt) {
  const out = await env.AI.run(MODEL, { prompt, steps: 6 }); // FLUX schnell tidak menerima seed
  const bytes = Buffer.from(String(out?.image ?? ''), 'base64');
  if (bytes.byteLength < 15_000) throw new Error('gambar kosong');
  await env.STORE.put(`gpu/${c}/${Number(id)}.png`, bytes, { httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' } });
  return bytes.byteLength;
}

/** Workers AI dengan jatah gratis harian; dipakai cron worker DAN /internal/gpu/render (ops/gpu-sync.mjs). */
export async function lukisGratis(env, c, id, prompt, { now = Date.now(), rata = true } = {}) {
  if (!(await ambilJatah(env.STORE, { now, cap: batasHarian(env), rata }))) return { ok: false, alasan: 'jatah' };
  try {
    return { ok: true, bytes: await lukisWorkersAI(env, c, id, prompt) };
  } catch (e) {
    const m = String(e?.message ?? e).slice(0, 300);
    if (alokasiHabis(m)) await tandaiHabis(env.STORE, now);
    return { ok: false, alasan: m };
  }
}

/** Satu tick cron: koleksi dengan karya G- paling sedikit → karya kandidat berikutnya → Workers AI → seri G- (CAS). */
export async function gpuTick(env, { now = Date.now() } = {}) {
  const docs = {};
  for (const c of GPU_KEYS) docs[c] = (await getJSON(env.STORE, `os/gpu-${c}.json`))?.value ?? { ids: [], serial: {}, by: {} };
  // 1) lukis ulang karya bertanda situs lain lebih dulu (nomor seri G- tetap)
  for (const c of GPU_KEYS) {
    const id = docs[c].ids.find((x) => PERLU_ULANG.has(String(docs[c].by?.[x] ?? '')));
    if (id === undefined) continue;
    const r = await lukisGratis(env, c, id, promptFor(c, id), { now });
    if (!r.ok) {
      if (r.alasan !== 'jatah') await appendLog(env.STORE, 'gpu', { c, id, ulang: true, e: r.alasan }, now);
      return { dibuat: null, alasan: r.alasan };
    }
    const doc = await update(env.STORE, `os/gpu-${c}.json`, (cur) => (cur?.ids?.includes(id) ? { ...cur, by: { ...cur.by, [id]: 'cloudflare-workers-ai' }, at: new Date(now).toISOString() } : undefined));
    return { dibuat: { c, id, g: Number(doc?.serial?.[id] ?? 0), ulang: true } };
  }
  // 2) karya baru
  const urut = [...GPU_KEYS].sort((a, b) => docs[a].ids.length - docs[b].ids.length || GPU_KEYS.indexOf(a) - GPU_KEYS.indexOf(b));
  for (const c of urut) {
    const ada = new Set(docs[c].ids);
    const id = candidates(c).find((x) => !ada.has(x));
    if (!id) continue;
    const r = await lukisGratis(env, c, id, promptFor(c, id), { now });
    if (!r.ok) {
      if (r.alasan !== 'jatah') await appendLog(env.STORE, 'gpu', { c, id, e: r.alasan }, now);
      return { dibuat: null, alasan: r.alasan };
    }
    const doc = await update(env.STORE, `os/gpu-${c}.json`, (cur) => tambahSeri(cur, id, 'cloudflare-workers-ai', new Date(now).toISOString()));
    return { dibuat: { c, id, g: Number(doc?.serial?.[id] ?? 0) } };
  }
  return { dibuat: null, alasan: 'tidak ada kandidat' };
}
