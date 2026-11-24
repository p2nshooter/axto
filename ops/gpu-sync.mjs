/**
 * Seri G- axto.io — VIDEO GPU (pemilik, 24 Nov 2026: „Series G- wajib sudah dengan animasi saat produksi, jd 100% di
 * buatkan GPU" · „bikin ulang semua, hasil NFT 100% sudah keluar dengan animasi yg interaktif" · „Series G- yg sudah
 * terlanjur di buat, kembalikan ke gambar aslinya tanpa animasi").
 *
 * Sejak dibuat ulang, LUKISAN seri G- hanya dibuat worker axto.io (worker/src/gpu.js: FLUX.2 + pemeriksa mutu, cap `qa`).
 * Penyedia gambar lama (AI Horde, kunci GPU ulyah.com untuk gambar) DICABUT: mutunya tidak terjaga. Skrip ini (GitHub
 * Actions, tiap jam lewat penjaga produksi) kini hanya:
 *   1. menyalin video yang sudah dirender GPU (kunci GPU ulyah.com, ZeroGPU Wan 2.2 I2V / LTX-Video) dari
 *      ulyah-media/axto-gpu/vid/<c>/<id>.mp4 ke R2 axto.io gpu/<c>/<id>.mp4 dan menandai `vid`,
 *   2. mengantrekan karya lolos-mutu yang belum beranimasi ke ulyah-media/axto-gpu/video-jobs.json,
 *   3. mengosongkan antrean gambar lama ulyah (jobs.json) agar tidak ada lagi gambar tanpa pemeriksaan mutu.
 * Karya G- BARU tampil di situs bila lolos mutu DAN videonya sudah ada; karya G- LAMA tidak disentuh (tampil sebagai
 * lukisan aslinya, diam).
 *
 * ENV: CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, CLOUDFLARE_ACCOUNT_ID
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GPU_KEYS, QA_V, candidates, promptFor, gerakFor } from '../engine/src/gpu.js';
export { GPU_KEYS, candidates, promptFor };
export const VIDEO_ANTRE = 48;

export function realIO() {
  const tmp = mkdtempSync(join(tmpdir(), 'axto-gpu-'));
  const wr = (args) => execFileSync('npx', ['--yes', 'wrangler@4.156.1', 'r2', 'object', ...args, '--remote'], { stdio: 'pipe' });
  return {
    getText: (bk) => { const f = join(tmp, 'g'); try { wr(['get', bk, '--file', f]); return readFileSync(f, 'utf8'); } catch { return null; } },
    putText: (bk, text) => { const f = join(tmp, 'p'); writeFileSync(f, text); wr(['put', bk, '--file', f, '--content-type', 'application/json']); },
    putBytes: (bk, bytes, type) => { const f = join(tmp, 'b'); writeFileSync(f, bytes); wr(['put', bk, '--file', f, '--content-type', type, '--cache-control', 'public, max-age=31536000, immutable']); },
    copy: (from, to, type = 'image/png') => { const f = join(tmp, 'c'); wr(['get', from, '--file', f]); wr(['put', to, '--file', f, '--content-type', type, '--cache-control', 'public, max-age=31536000, immutable']); },
  };
}

export async function run({ io = realIO(), log = console.log } = {}) {
  const parse = (t, d) => { try { return t ? JSON.parse(t) : d; } catch { return d; } };
  const st = {};
  for (const c of GPU_KEYS) st[c] = parse(io.getText(`axto-nft-data/os/gpu-${c}.json`), { ids: [], serial: {}, by: {} });
  const lolos = (c, id) => st[c].qa?.[id]?.v === QA_V;
  const made = {};

  // 1) video yang sudah dirender → R2 axto.io, ditandai vid (hanya karya lolos-mutu yang masih ada di seri)
  const vdone = parse(io.getText('ulyah-media/axto-gpu/video-done.json'), { done: {} });
  const vidBaru = Object.fromEntries(GPU_KEYS.map((c) => [c, []]));
  for (const k of Object.keys(vdone.done ?? {})) {
    const [c, s, v] = k.split(':');
    const id = Number(s);
    if (!GPU_KEYS.includes(c) || v !== `v${QA_V}` || !st[c].ids?.includes(id) || !lolos(c, id) || st[c].vid?.[id]) continue;
    try { io.copy(`ulyah-media/axto-gpu/vid/${c}/${id}-v${QA_V}.mp4`, `axto-nft-data/gpu/${c}/${id}.mp4`, 'video/mp4'); vidBaru[c].push(id); made['video-gpu'] = (made['video-gpu'] ?? 0) + 1; } catch { /* putaran berikutnya */ }
  }

  // 2) antrean video: karya lolos-mutu yang belum beranimasi, bergiliran antar koleksi
  const videoJobs = [];
  for (let i = 0; videoJobs.length < VIDEO_ANTRE; i += 1) {
    let any = false;
    for (const c of GPU_KEYS) {
      const belum = (st[c].ids ?? []).filter((id) => lolos(c, id) && !st[c].vid?.[id] && !vidBaru[c].includes(id));
      if (belum[i] === undefined) continue;
      any = true;
      if (videoJobs.length < VIDEO_ANTRE) videoJobs.push({ c, id: belum[i], v: QA_V, img: `https://axto.io/gpu/${c}/${belum[i]}.png?v=q${QA_V}`, prompt: gerakFor(c, belum[i]) });
    }
    if (!any) break;
  }
  io.putText('ulyah-media/axto-gpu/video-jobs.json', JSON.stringify({ at: new Date().toISOString(), jobs: videoJobs }));
  // 3) antrean gambar lama ulyah dikosongkan (gambar seri G- hanya dari worker axto.io dengan pemeriksa mutu)
  io.putText('ulyah-media/axto-gpu/jobs.json', JSON.stringify({ at: new Date().toISOString(), jobs: [] }));

  // Tandai vid: dokumen dibaca ULANG tepat sebelum ditulis (worker menulis dokumen yang sama tiap 5 menit).
  for (const c of GPU_KEYS) {
    if (!vidBaru[c].length) continue;
    const doc = parse(io.getText(`axto-nft-data/os/gpu-${c}.json`), { ids: [], serial: {}, by: {} });
    const ok = vidBaru[c].filter((id) => doc.ids?.includes(id) && doc.qa?.[id]?.v === QA_V);
    if (!ok.length) continue;
    st[c] = { ...doc, vid: { ...(doc.vid ?? {}), ...Object.fromEntries(ok.map((id) => [id, true])) } };
    io.putText(`axto-nft-data/os/gpu-${c}.json`, JSON.stringify(st[c]));
  }
  const summary = Object.fromEntries(GPU_KEYS.map((c) => [c, (st[c].ids ?? []).filter((id) => lolos(c, id)).length]));
  const beranimasi = Object.fromEntries(GPU_KEYS.map((c) => [c, Object.keys(st[c].vid ?? {}).length]));
  log(`Seri G- lolos mutu: ${JSON.stringify(summary)} · beranimasi (tampil) ${JSON.stringify(beranimasi)} · video baru ${made['video-gpu'] ?? 0} · antrean video ${videoJobs.length}`);
  return { summary, made, beranimasi, videoQueued: videoJobs.length };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  run().then((r) => {
    if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## Seri G- (lolos mutu → video GPU → tampil)\n\n${Object.entries(r.summary).map(([c, n]) => `- ${c}: ${n} lolos mutu, ${r.beranimasi[c]} beranimasi`).join('\n')}\n- video baru: ${r.made['video-gpu'] ?? 0} · antrean video: ${r.videoQueued}\n`, { flag: 'a' });
  }).catch((e) => { console.error(e.message || e); process.exit(1); });
}
