/**
 * Seri G- axto.io — VIDEO GPU, dirender axto.io SENDIRI.
 *   Pemilik, 24 Nov 2026: „Series G- wajib sudah dengan animasi saat produksi, jd 100% di buatkan GPU" · „Cek menyeluruh
 *   … engine produksi series, krn G- berhenti" · „Copy aja API GPU dari ulyah.com, biar ga terhubung ke ulyah.com" ·
 *   „Ambil semua apinya yg aktif bukanya hanya GPU, siapa tau berguna".
 *
 * Lukisan seri G- dibuat worker axto.io (worker/src/gpu.js: FLUX.2 + pemeriksa mutu, cap `qa`). Skrip ini (GitHub Actions,
 * tiap jam + penjaga produksi) menjadikannya video:
 *   1. KUNCI: serah-terima tersegel dari ulyah.com (`ulyah-media/axto-handoff/keys.sealed.json`, RSA-OAEP-256 + AES-256-GCM
 *      ke kunci publik saluran privat axto) dibuka dengan kunci privat saluran (vault axto) lalu disimpan ulang di vault
 *      axto `axto-vault-data/api-keys.enc` — SEMUA kunci aktif, semua penyedia. Sejak itu axto.io memakai salinannya sendiri;
 *      ulyah.com tidak lagi merender apa pun untuk axto. Kunci tidak pernah dicetak.
 *   2. ANTREAN: karya lolos mutu (cap qa versi QA_V) yang belum beranimasi, bergiliran antar koleksi.
 *   3. RENDER: Space ZeroGPU Hugging Face (Wan 2.2 I2V cepat, cadangan LTX-Video distilled) dengan kunci Hugging Face
 *      bergiliran; kunci yang kuotanya habis dilewati untuk putaran ini. Video → R2 axto `axto-nft-data/gpu/<c>/<id>.mp4`,
 *      karya ditandai `vid` (dokumen dibaca ULANG tepat sebelum ditulis — worker menulis dokumen yang sama tiap 5 menit).
 *   4. GAGAL: dicatat per karya dengan alasannya (kuota, HTTP, waktu habis) di `axto-vault-data/gpu-video.json` dan dicoba
 *      lagi setelah 3 jam. Tidak pernah menyerah selamanya — penyebab G- berhenti 24 Nov 2026: mesin lama di ulyah.com
 *      menyerah setelah 4 kali gagal sehingga 48 karya antrean tidak pernah diproses lagi.
 * Karya G- tampil di situs hanya bila lolos mutu DAN videonya sudah ada.
 *
 * ENV: CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, CLOUDFLARE_ACCOUNT_ID, [GPU_BUDGET_MIN=40]
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmac, createCipheriv, createDecipheriv, privateDecrypt, randomBytes, constants } from 'node:crypto';

import { GPU_KEYS, QA_V, candidates, promptFor, gerakFor } from '../engine/src/gpu.js';
export { GPU_KEYS, candidates, promptFor };
export const VIDEO_ANTRE = 48;
export const RETRY_MS = 3 * 3600_000;
/** Versi cara render. Naik → catatan gagal lama dihapus (gagal karena cara lama, bukan karena karyanya). 2 = anonim + LTX. */
export const RENDER_V = 2;
const NEG = 'text, letters, words, writing, numbers, subtitles, watermark, logo, signature, people, face, blurry, distorted, deformed, melting, static, frozen, low quality';

/** Space gambar→video ZeroGPU (Gradio REST: POST /gradio_api/call/<api>, lalu GET SSE hasilnya). */
// Urutan: LTX lebih dulu — diuji 24 Nov 2026 dari runner: LTX berhasil (±4 detik), Wan 2.2 sedang rusak di hulu.
export const SPACES = [
  // Lightricks/ltx-video-distilled · image_to_video(prompt, negative, image, video, height, width, mode, duration, frames, seed, randomize, guidance, texture)
  { space: 'lightricks-ltx-video-distilled', api: 'image_to_video', data: (img, prompt, seed) => [prompt, NEG, img, null, 512, 512, 'image-to-video', 2, 9, seed, false, 1, true] },
  // zerogpu-aoti/wan2-2-fp8da-aoti-faster · generate_video(image, prompt, steps, negative, duration, guidance, guidance_2, seed, randomize)
  { space: 'zerogpu-aoti-wan2-2-fp8da-aoti-faster', api: 'generate_video', data: (img, prompt, seed) => [img, prompt, 4, NEG, 2.5, 1, 1, seed, false] },
];

export function realIO() {
  const tmp = mkdtempSync(join(tmpdir(), 'axto-gpu-'));
  // galat sementara R2 (mis. 500 „internal error") dicoba ulang 4× berjeda 2/5/10 detik sebelum menyerah
  const wr = (args) => {
    for (let i = 0; ; i += 1) {
      try { return execFileSync('npx', ['--yes', 'wrangler@4.156.1', 'r2', 'object', ...args, '--remote'], { stdio: 'pipe' }); } catch (e) {
        if (args[0] === 'get' && /not found|10007|does not exist/i.test(String(e.stderr ?? e.message))) throw e;
        if (i >= 3) throw e;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, [2_000, 5_000, 10_000][i]);
      }
    }
  };
  return {
    getText: (bk) => { const f = join(tmp, 'g'); try { wr(['get', bk, '--file', f]); return readFileSync(f, 'utf8'); } catch { return null; } },
    putText: (bk, text) => { const f = join(tmp, 'p'); writeFileSync(f, text); wr(['put', bk, '--file', f, '--content-type', 'application/json']); },
    putBytes: (bk, bytes, type) => { const f = join(tmp, 'b'); writeFileSync(f, bytes); wr(['put', bk, '--file', f, '--content-type', type, '--cache-control', 'public, max-age=31536000, immutable']); },
  };
}

// ---------------------------------------------------------------- kunci (vault axto)
const hkey = (cf, label) => createHmac('sha256', cf).update(label).digest();
const sealV = (text, key) => {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') });
};
const unsealV = (s, key) => {
  const j = JSON.parse(s);
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(j.iv, 'base64'));
  d.setAuthTag(Buffer.from(j.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(j.ct, 'base64')), d.final()]).toString('utf8');
};
export const _seal = { sealV, unsealV, hkey };
/** Berkas tersegel RSA-OAEP-256 + AES-256-GCM (format ops/seal-private.mjs & serah-terima ulyah.com). */
export function openSealed(json, privPem) {
  const j = JSON.parse(json);
  const k = privateDecrypt({ key: privPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(j.ek, 'base64'));
  const d = createDecipheriv('aes-256-gcm', k, Buffer.from(j.iv, 'base64'));
  d.setAuthTag(Buffer.from(j.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(j.ct, 'base64')), d.final()]).toString('utf8');
}

/**
 * Kunci API axto: serah-terima terbaru (bila ada & lebih baru) disimpan ulang di vault axto; selain itu salinan vault.
 * Mengembalikan {keys, from, at}. Tidak pernah mencetak kunci.
 */
export function loadKeys(io, cf) {
  if (!cf) return { keys: [], from: 'tanpa CLOUDFLARE_API_KEY' };
  const vaultKey = hkey(cf, 'axto:API_KEYS');
  let have = null;
  try { const s = io.getText('axto-vault-data/api-keys.enc'); if (s) have = JSON.parse(unsealV(s, vaultKey)); } catch { have = null; }
  const handoff = io.getText('ulyah-media/axto-handoff/keys.sealed.json');
  if (handoff) {
    try {
      const priv = unsealV(io.getText('axto-vault-data/bundle-key.enc'), hkey(cf, 'axto:BUNDLE_KEY'));
      const got = JSON.parse(openSealed(handoff, priv));
      if (Array.isArray(got.keys) && (!have || String(got.at) > String(have.at))) {
        have = { at: got.at, from: 'serah-terima', keys: got.keys.filter((k) => k && typeof k.key === 'string' && k.key.length > 8) };
        io.putText('axto-vault-data/api-keys.enc', sealV(JSON.stringify(have), vaultKey));
      }
    } catch { /* segel rusak / kunci saluran belum ada: pakai salinan vault */ }
  }
  return have ?? { keys: [], from: 'belum ada' };
}

// ---------------------------------------------------------------- render
/** Ambil berkas hasil dari data „complete" Gradio (gr.Video → {video: FileData} atau FileData). */
export function urlVideo(base, out) {
  const first = Array.isArray(out) ? out[0] : out;
  const f = first && typeof first === 'object' && 'video' in first ? first.video : first;
  if (!f || typeof f !== 'object') return null;
  if (typeof f.url === 'string' && /^https:\/\//.test(f.url)) return f.url;
  return typeof f.path === 'string' ? `${base}/file=${f.path}` : null;
}

/** Satu render lewat satu Space. {bytes} atau {err, msg} — err: quota | http_<n> | timeout | … (tanpa kunci). */
export async function renderVideo(fetchImpl, key, spec, job, ms = 150_000) {
  const base = `https://${spec.space}.hf.space/gradio_api`;
  // key null = anonim (jatah ZeroGPU per IP runner); akun HF gratis ditolak ZeroGPU tanpa pesan (data: null)
  const auth = key ? { Authorization: `Bearer ${key}` } : {};
  const signal = AbortSignal.timeout(ms);
  try {
    // gambar diunggah ke Space dulu (tidak bergantung pada Space mengambil dari axto.io); gagal unggah → URL langsung
    let img = { path: job.img, url: job.img, orig_name: `${job.c}-${job.id}.png`, meta: { _type: 'gradio.FileData' } };
    try {
      const g = await fetchImpl(job.img, { signal });
      if (g.ok) {
        const fd = new FormData();
        fd.append('files', new Blob([await g.arrayBuffer()], { type: 'image/png' }), `${job.c}-${job.id}.png`);
        const u = await fetchImpl(`${base}/upload`, { method: 'POST', signal, headers: auth, body: fd });
        const up = u.ok ? (await u.json().catch(() => null))?.[0] : null;
        if (typeof up === 'string' && up) img = { path: up, orig_name: `${job.c}-${job.id}.png`, meta: { _type: 'gradio.FileData' } };
      }
    } catch (e) {
      if (e?.name === 'TimeoutError' || e?.name === 'AbortError') throw e;
    }
    const r = await fetchImpl(`${base}/call/${spec.api}`, { method: 'POST', signal, headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: spec.data(img, job.prompt, job.id % 2_147_483_647) }) });
    if (!r.ok) return { err: r.status === 429 ? 'quota' : `http_${r.status}` };
    const ev = (await r.json())?.event_id;
    if (!ev) return { err: 'no_event' };
    const s = await fetchImpl(`${base}/call/${spec.api}/${ev}`, { signal, headers: auth });
    if (!s.ok) return { err: `sse_${s.status}` };
    const sse = await s.text();
    const m = /event:\s*complete\s*\r?\ndata:\s*(.+)/.exec(sse);
    if (!m) {
      const e = /event:\s*error\s*\r?\ndata:\s*(.*)/.exec(sse)?.[1] ?? '';
      return { err: /quota|exceeded|GPU limit|daily/i.test(e) ? 'quota' : 'space_error', msg: `${spec.space}: ${e || '(kosong)'}`.replace(/hf_[A-Za-z0-9]+/g, 'hf_…').slice(0, 160) };
    }
    const url = urlVideo(base, JSON.parse(m[1]));
    if (!url) return { err: 'no_file' };
    const v = await fetchImpl(url, { signal, headers: auth });
    if (!v.ok) return { err: `file_${v.status}` };
    const bytes = Buffer.from(await v.arrayBuffer());
    return bytes.length > 20_000 ? { bytes } : { err: 'small' };
  } catch (e) {
    return { err: e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'timeout' : 'net' };
  }
}

// ---------------------------------------------------------------- satu putaran
export async function run({ io = realIO(), fetchImpl = globalThis.fetch, now = Date.now, budgetMs = Number(process.env.GPU_BUDGET_MIN || 40) * 60_000, perMs = 150_000, cf = process.env.CLOUDFLARE_API_KEY, log = console.log } = {}) {
  const t0 = now();
  const parse = (t, d) => { try { return t ? JSON.parse(t) : d; } catch { return d; } };
  const st = {};
  for (const c of GPU_KEYS) st[c] = parse(io.getText(`axto-nft-data/os/gpu-${c}.json`), { ids: [], serial: {}, by: {} });
  const lolos = (c, id) => st[c].qa?.[id]?.v === QA_V;
  const state = parse(io.getText('axto-vault-data/gpu-video.json'), { failed: {}, done: {} });
  state.failed ??= {};
  state.done ??= {};
  if (state.v !== RENDER_V) { state.failed = {}; state.v = RENDER_V; }
  const jk = (j) => `${j.c}:${j.id}:v${QA_V}`;

  // 1) kunci
  const K = loadKeys(io, cf);
  const byProvider = K.keys.reduce((a, k) => ({ ...a, [k.provider]: (a[k.provider] ?? 0) + 1 }), {});
  const hf = K.keys.filter((k) => /^hf/i.test(String(k.provider)));

  // 2) antrean bergiliran antar koleksi; yang sudah gagal 2× baru dicoba lagi setelah RETRY_MS
  const jobs = [];
  const skipped = { cooldown: 0 };
  for (let i = 0; jobs.length < VIDEO_ANTRE; i += 1) {
    let any = false;
    for (const c of GPU_KEYS) {
      const belum = (st[c].ids ?? []).filter((id) => lolos(c, id) && !st[c].vid?.[id]);
      if (belum[i] === undefined) continue;
      any = true;
      const job = { c, id: belum[i], img: `https://axto.io/gpu/${c}/${belum[i]}.png?v=q${QA_V}`, prompt: gerakFor(c, belum[i]) };
      const f = state.failed[jk(job)];
      if (f && f.n >= 2 && now() - f.at < RETRY_MS) { skipped.cooldown += 1; continue; }
      if (jobs.length < VIDEO_ANTRE) jobs.push(job);
    }
    if (!any) break;
  }

  // 3) render
  const made = Object.fromEntries(GPU_KEYS.map((c) => [c, []]));
  const errs = {};
  const contoh = {}; // contoh pesan galat Space (tanpa kunci) agar penyebab terlihat di log
  const habis = new Set(); // kunci yang kuotanya habis di putaran ini
  let anonHabis = false; // jatah anonim IP runner habis di putaran ini
  const lewat = { anonim: 0, kunci: 0 };
  let n = 0;
  for (const job of jobs) {
    if (now() - t0 > budgetMs) break;
    const live = hf.map((_, i) => i).filter((i) => !habis.has(i));
    // anonim lebih dulu (terbukti jalan dari runner), lalu maksimal 2 kunci HF sebagai cadangan
    const tries = [...(anonHabis ? [] : [-1]), ...live.slice(0, 2).map((_, t) => live[(n + t) % live.length])];
    if (!tries.length) break;
    let ok = false;
    let last = null;
    for (const ki of tries) {
      if (ok || now() - t0 > budgetMs) break;
      for (const spec of SPACES) {
        const r = await renderVideo(fetchImpl, ki < 0 ? null : hf[ki].key, spec, job, perMs);
        if (r.bytes) {
          try { io.putBytes(`axto-nft-data/gpu/${job.c}/${job.id}.mp4`, r.bytes, 'video/mp4'); } catch (e) {
            // penyimpanan gagal setelah dicoba ulang → karya ini dicoba lagi putaran berikutnya, putaran tetap lanjut
            last = { err: 'r2', msg: String(e.message).slice(0, 120) };
            errs.r2 = (errs.r2 ?? 0) + 1;
            break;
          }
          made[job.c].push(job.id);
          state.done[jk(job)] = { at: new Date(now()).toISOString(), bytes: r.bytes.length, space: spec.space, via: ki < 0 ? 'anonim' : 'kunci' };
          delete state.failed[jk(job)];
          lewat[ki < 0 ? 'anonim' : 'kunci'] += 1;
          ok = true;
          break;
        }
        last = r;
        errs[r.err] = (errs[r.err] ?? 0) + 1;
        if (r.msg && Object.keys(contoh).length < 6 && !Object.values(contoh).includes(r.msg)) contoh[`${r.err}#${Object.keys(contoh).length + 1}`] = `${ki < 0 ? 'anonim' : 'kunci'} · ${r.msg}`;
        if (r.err === 'quota') { if (ki < 0) anonHabis = true; else habis.add(ki); break; }
      }
    }
    n += 1;
    if (!ok) state.failed[jk(job)] = { n: (state.failed[jk(job)]?.n ?? 0) + 1, at: now(), err: last?.err ?? 'no_key', msg: last?.msg ?? null };
    try { io.putText('axto-vault-data/gpu-video.json', JSON.stringify(state)); } catch (e) { log(`status sementara tidak tersimpan (dicoba lagi di akhir): ${String(e.message).slice(0, 120)}`); }
  }

  // 4) tandai vid: dokumen dibaca ULANG tepat sebelum ditulis
  for (const c of GPU_KEYS) {
    if (!made[c].length) continue;
    const doc = parse(io.getText(`axto-nft-data/os/gpu-${c}.json`), { ids: [], serial: {}, by: {} });
    const ok = made[c].filter((id) => doc.ids?.includes(id) && doc.qa?.[id]?.v === QA_V);
    if (!ok.length) continue;
    st[c] = { ...doc, vid: { ...(doc.vid ?? {}), ...Object.fromEntries(ok.map((id) => [id, true])) } };
    io.putText(`axto-nft-data/os/gpu-${c}.json`, JSON.stringify(st[c]));
  }
  io.putText('axto-vault-data/gpu-video.json', JSON.stringify(state));
  const summary = Object.fromEntries(GPU_KEYS.map((c) => [c, (st[c].ids ?? []).filter((id) => lolos(c, id)).length]));
  const beranimasi = Object.fromEntries(GPU_KEYS.map((c) => [c, Object.keys(st[c].vid ?? {}).length]));
  const video = { baru: Object.values(made).reduce((a, x) => a + x.length, 0), antrean: jobs.length, jeda: skipped.cooldown, kunci: { semua: K.keys.length, hf: hf.length, habisKuota: habis.size, sumber: K.from, perPenyedia: byProvider }, anonimHabis: anonHabis, lewat, gagal: errs, contoh };
  log(`Seri G- lolos mutu: ${JSON.stringify(summary)} · beranimasi (tampil) ${JSON.stringify(beranimasi)} · video ${JSON.stringify(video)}`);
  return { summary, beranimasi, video, made };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  run().then((r) => {
    if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## Seri G- (lolos mutu → video GPU axto.io → tampil)\n\n${Object.entries(r.summary).map(([c, n]) => `- ${c}: ${n} lolos mutu, ${r.beranimasi[c]} beranimasi`).join('\n')}\n- video: ${JSON.stringify(r.video)}\n`, { flag: 'a' });
  }).catch((e) => { console.error(e.message || e); process.exit(1); });
}
