/**
 * Produksi seri G- di worker axto.io — satu-satunya pelukis seri G- (Cron Trigger tiap 5 menit, 24 jam, gratis).
 *
 * Pemilik, 24 Nov 2026: „ini series G- sampah semua" · „Bikin ulang semua, hasil NFT 100% sudah keluar dengan animasi yg
 * interaktif" · lalu „Series G- yg sudah terlanjur di buat, kembalikan ke gambar aslinya tanpa animasi". Maka:
 *  - Karya G- LAMA (sudah terlanjur dibuat) TIDAK dihapus: tampil sebagai lukisan GPU aslinya, diam, tanpa animasi apa pun.
 *    Hanya karya bertanda situs lain (watermark) yang tetap disembunyikan dan dilukis ulang di sini dengan nomor seri SAMA.
 *  - Karya G- BARU dilukis FLUX.2 [klein] (Workers AI) dari prompt v2, lalu DIPERIKSA mesin (model penglihatan Gemma 4):
 *    tanpa tulisan/angka/tanda air, simetris & di tengah, tidak cacat, subjek benar, nilai ≥ 8/10, dan untuk Qur'an &
 *    hadits panel tengah kosong yang posisinya diukur (agar ayat ASLI diletakkan tepat di dalamnya). Gagal → dibuang &
 *    dilukis ulang; yang lolos masuk seri dengan cap `qa`, lalu tampil setelah GPU membuat videonya (animasi interaktif).
 *
 * GRATIS: jatah harian dibatasi jauh di bawah alokasi gratis akun (10.000 neuron/hari dipakai bersama; satu percobaan ±120
 * neuron: FLUX.2 klein 1024² ±104 + pemeriksaan ±15), disebar merata 24 jam. Galat 4006 → berhenti sampai esok.
 * Penyimpanan hanya R2 (CAS untuk dokumen seri, satu tulis per percobaan untuk jatah, log append-only).
 */
import { Buffer } from 'node:buffer';
import { GPU_KEYS, QA_V, candidates, promptFor, tambahSeri } from '../../engine/src/gpu.js';
import { getJSON, update, appendLog } from './r2.js';

export const GPU_HARIAN = 36;
export const MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
export const MODEL_CADANGAN = '@cf/black-forest-labs/flux-1-schnell';
export const MODEL_QA = '@cf/google/gemma-4-26b-a4b-it';
/** Penyedia yang gambarnya bertanda situs lain → disembunyikan & dilukis ulang (nomor seri tetap). */
export const PERLU_ULANG = new Set(['pollinations']);
const GAGAL_MAKS = 3;
const tanggal = (now) => new Date(now).toISOString().slice(0, 10);
const kunciJatah = (now) => `os/gpu-jatah/${tanggal(now)}.json`;
const batasHarian = (env) => { const n = Number(env.GPU_HARIAN); return Number.isInteger(n) && n >= 0 && n <= 60 ? n : GPU_HARIAN; };

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
const pesan = (e) => String(e?.message ?? e).slice(0, 300);

/** Jenis berkas dari tanda tangan byte. */
export function jenisGambar(b) {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'image/webp';
  return 'image/jpeg';
}

/** Melukis dengan FLUX.2 [klein] 4B (1024², masukan multipart); cadangan FLUX.1 schnell 8 langkah bila klein menolak. */
export async function lukis(env, prompt) {
  let alasanKlein = '';
  try {
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('width', '1024');
    form.append('height', '1024');
    const fr = new Response(form);
    const out = await env.AI.run(MODEL, { multipart: { body: fr.body, contentType: fr.headers.get('content-type') } });
    const bytes = Buffer.from(String(out?.image ?? ''), 'base64');
    if (bytes.byteLength >= 15_000) return { bytes, model: MODEL };
    alasanKlein = 'gambar kosong';
  } catch (e) {
    alasanKlein = pesan(e);
    if (alokasiHabis(alasanKlein)) throw e;
  }
  const out = await env.AI.run(MODEL_CADANGAN, { prompt, steps: 8 });
  const bytes = Buffer.from(String(out?.image ?? ''), 'base64');
  if (bytes.byteLength < 15_000) throw new Error('gambar kosong');
  return { bytes, model: MODEL_CADANGAN, alasanKlein };
}

const SUBJEK = {
  time: 'a luxury collectible clock whose round dial is clearly visible in the centre',
  stamp: 'a single vintage postage stamp',
  quran: 'an ornate illuminated manuscript page with a plain EMPTY panel in the centre (the real verse text is placed there later, so the panel must contain no writing and no ornament)',
  hadith: 'an ornate illuminated manuscript page with a plain EMPTY panel in the centre (the real hadith text is placed there later, so the panel must contain no writing and no ornament)',
};

/** Teks jawaban model obrolan Workers AI (bentuk `response` atau gaya OpenAI). */
const teksJawaban = (out) => {
  if (typeof out?.response === 'string') return out.response;
  if (out?.response && typeof out.response === 'object') return JSON.stringify(out.response);
  return String(out?.choices?.[0]?.message?.content ?? '');
};

/** Putusan pemeriksa dari JSON jawaban (murni). */
export function putusan(c, j) {
  const k = c.replace(/^ex-/, '');
  const butuhPanel = k === 'quran' || k === 'hadith';
  const q = Number(j?.quality);
  const p = Array.isArray(j?.panel) && j.panel.length === 4 && j.panel.every((x) => Number.isFinite(Number(x))) ? j.panel.map((x) => Math.round(Math.min(1, Math.max(0, Number(x))) * 1000) / 1000) : null;
  const panelOk = Boolean(p && p[2] > p[0] && p[3] > p[1] && (p[2] - p[0]) * (p[3] - p[1]) >= 0.1 && Math.abs((p[0] + p[2]) / 2 - 0.5) <= 0.15 && Math.abs((p[1] + p[3]) / 2 - 0.5) <= 0.2);
  const alasan = [];
  if (j?.text !== false) alasan.push('tulisan');
  if (j?.symmetric !== true) alasan.push('tidak simetris');
  if (j?.deformed !== false) alasan.push('cacat');
  if (j?.subject !== true) alasan.push('subjek');
  if (!(q >= 8)) alasan.push(`nilai ${Number.isFinite(q) ? q : '?'}`);
  if (butuhPanel && !panelOk) alasan.push('panel');
  return { lolos: alasan.length === 0, alasan, nilai: Number.isFinite(q) ? q : 0, ...(butuhPanel && p ? { panel: p, nada: j?.tone === 'dark' ? 'gelap' : 'terang' } : {}) };
}

/** Pemeriksa mutu (model penglihatan): lolos hanya karya tanpa tulisan, simetris, utuh, subjek benar, nilai ≥ 8. */
export async function periksa(env, c, bytes) {
  const k = c.replace(/^ex-/, '');
  const butuhPanel = k === 'quran' || k === 'hadith';
  const tanya = `You are the strict art director of a premium digital art gallery. This AI-generated image should show ${SUBJEK[k]}.
Reply with ONLY one JSON object and nothing else:
{"text": true if ANY letters, numbers, digits, words, pseudo-writing, calligraphy, signature, logo or watermark is visible anywhere in the image,
"symmetric": true only if the main object is centred and close to perfectly left-right symmetrical,
"deformed": true if anything looks warped, melted, broken, duplicated or malformed,
"subject": true if the image clearly shows the requested subject,
"quality": an integer from 1 to 10 for beauty and craftsmanship as luxury collectible art${butuhPanel ? `,
"panel": [x0, y0, x1, y1] the plain empty central panel as fractions (0 to 1) of the image width and height, or null if there is none,
"tone": "light" or "dark", the brightness of that panel` : ''}}`;
  const url = `data:${jenisGambar(bytes)};base64,${Buffer.from(bytes).toString('base64')}`;
  const out = await env.AI.run(MODEL_QA, {
    messages: [{ role: 'user', content: [{ type: 'text', text: tanya }, { type: 'image_url', image_url: { url } }] }],
    max_tokens: 300,
    temperature: 0,
    chat_template_kwargs: { enable_thinking: false },
  });
  const t = teksJawaban(out);
  const m = /\{[\s\S]*\}/.exec(t);
  let j = null;
  try { j = m ? JSON.parse(m[0]) : null; } catch { j = null; }
  if (!j) return { lolos: false, alasan: ['jawaban pemeriksa'], nilai: 0, mentah: t.slice(0, 200) };
  return putusan(c, j);
}

/**
 * Satu percobaan berjatah: lukis → periksa. Lolos → disimpan ke R2 gpu/<c>/<id>.<png|jpg>; gagal → tidak disimpan.
 * `simpan: false` untuk pratinjau (hasil dikembalikan, tidak disimpan).
 */
export async function lukisGratis(env, c, id, prompt, { now = Date.now(), rata = true, simpan = true } = {}) {
  if (!(await ambilJatah(env.STORE, { now, cap: batasHarian(env), rata }))) return { ok: false, alasan: 'jatah' };
  try {
    const g = await lukis(env, prompt);
    const qa = await periksa(env, c, g.bytes);
    const type = jenisGambar(g.bytes);
    if (simpan && qa.lolos) await env.STORE.put(`gpu/${c}/${Number(id)}.png`, g.bytes, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' } });
    return { ok: qa.lolos, alasan: qa.lolos ? '' : `mutu: ${qa.alasan.join(', ')}`, qa, model: g.model, type, bytes: g.bytes.byteLength, ...(simpan ? {} : { gambar: g.bytes }), ...(g.alasanKlein ? { alasanKlein: g.alasanKlein } : {}) };
  } catch (e) {
    const m = pesan(e);
    if (alokasiHabis(m)) await tandaiHabis(env.STORE, now);
    return { ok: false, alasan: m };
  }
}

/** Satu tick cron: lukis ulang karya bertanda situs lain (nomor seri tetap) → atau satu karya baru (koleksi paling sedikit
 * dulu), selalu lewat lukis + periksa mutu. Karya lama lain tidak disentuh. */
export async function gpuTick(env, { now = Date.now() } = {}) {
  const docs = {};
  for (const c of GPU_KEYS) docs[c] = (await getJSON(env.STORE, `os/gpu-${c}.json`))?.value ?? { ids: [], serial: {}, by: {} };
  const gagal = async (c, id, r) => {
    if (r.alasan === 'jatah') return { dibuat: null, alasan: r.alasan };
    if (r.qa) await update(env.STORE, `os/gpu-${c}.json`, (cur) => ({ ...(cur ?? docs[c]), gagal: { ...(cur?.gagal ?? {}), [id]: (cur?.gagal?.[id] ?? 0) + 1 } }));
    await appendLog(env.STORE, 'gpu', { c, id, e: r.alasan, ...(r.qa?.mentah ? { mentah: r.qa.mentah } : {}), ...(r.alasanKlein ? { klein: r.alasanKlein } : {}) }, now);
    return { dibuat: null, alasan: r.alasan };
  };
  const capDari = (r) => ({ v: QA_V, nilai: r.qa.nilai, model: r.model, ...(r.qa.panel ? { panel: r.qa.panel, nada: r.qa.nada } : {}) });
  // 1) karya bertanda situs lain dilukis ulang lebih dulu (nomor seri G- tetap)
  for (const c of GPU_KEYS) {
    const id = docs[c].ids.find((x) => PERLU_ULANG.has(String(docs[c].by?.[x] ?? '')) && (docs[c].gagal?.[x] ?? 0) < GAGAL_MAKS);
    if (id === undefined) continue;
    const r = await lukisGratis(env, c, id, promptFor(c, id), { now });
    if (!r.ok) return gagal(c, id, r);
    const doc = await update(env.STORE, `os/gpu-${c}.json`, (cur) => (cur?.ids?.includes(id) ? { ...cur, by: { ...cur.by, [id]: 'cloudflare-workers-ai' }, qa: { ...(cur.qa ?? {}), [id]: capDari(r) }, at: new Date(now).toISOString() } : undefined));
    return { dibuat: { c, id, g: Number(doc?.serial?.[id] ?? 0), ulang: true, nilai: r.qa.nilai } };
  }
  // 2) karya baru
  const urut = [...GPU_KEYS].sort((a, b) => docs[a].ids.length - docs[b].ids.length || GPU_KEYS.indexOf(a) - GPU_KEYS.indexOf(b));
  for (const c of urut) {
    const ada = new Set(docs[c].ids);
    const id = candidates(c).find((x) => !ada.has(x) && (docs[c].gagal?.[x] ?? 0) < GAGAL_MAKS);
    if (!id) continue;
    const r = await lukisGratis(env, c, id, promptFor(c, id), { now });
    if (!r.ok) return gagal(c, id, r);
    const doc = await update(env.STORE, `os/gpu-${c}.json`, (cur) => tambahSeri(cur, id, 'cloudflare-workers-ai', new Date(now).toISOString(), capDari(r)));
    return { dibuat: { c, id, g: Number(doc?.serial?.[id] ?? 0), nilai: r.qa.nilai } };
  }
  return { dibuat: null, alasan: 'tidak ada kandidat' };
}
