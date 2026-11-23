/**
 * Seri G- axto.io — karya yang dilukis GPU (pemilik, 23 Nov 2026: „tandai serinya dengan G- biar jelas bahwa ini karya
 * GPU" · „Series G- masih blm terlihat, biar cepet live" · „Cari GPU gratisan di seluruh dunia, coba make GPU terbuka").
 * Dijalankan workflow gpu-sync.yml tiap jam (GitHub Actions punya internet). GPU gratis / terbuka yang dipakai bergiliran,
 * pindah otomatis bila satu penyedia menolak atau habis jatah:
 *   1. Cloudflare Workers AI — FLUX.1 schnell, jatah gratis harian akun Cloudflare yang sudah ada (tanpa kunci baru).
 *   2. AI Horde — jaringan GPU sukarelawan dunia, anonim (asinkron: dikirim sekarang, diambil di putaran berikutnya).
 *   3. Kunci GPU Hugging Face ulyah.com — antrean ulyah-media/axto-gpu/jobs.json, dirender heartbeat 15 menit ulyah.com.
 *
 * Karya: etalase berikutnya per koleksi (kecuali Figur Model — GPU tidak boleh melukis sosok orang sungguhan), deskripsi
 * dari DNA karya, SELALU tanpa teks (teks Al-Qur'an & hadits tidak pernah dibuat mesin). Hasil → R2 axto-nft-data/gpu/<c>/<id>.png
 * (tipe asli disimpan di metadata), nomor seri G-1, G-2, … berurutan per koleksi → os/gpu-<c>.json {ids, serial, by}.
 * Skrip ini satu-satunya penulis os/gpu-<c>.json (worker hanya membaca).
 *
 * ENV: CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, CLOUDFLARE_ACCOUNT_ID · [GPU_BUDGET_MIN] · [QUEUE_PER_COL]
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GPU_KEYS, candidates, NEGATIVE, promptFor, tambahSeri } from '../engine/src/gpu.js';
export { GPU_KEYS, candidates, NEGATIVE, promptFor };
const QUEUE_PER_COL = Number(process.env.QUEUE_PER_COL || 24);
const UA = 'axto-gpu/1.0 (+https://axto.io)';
const HORDE = 'https://aihorde.net/api/v2';

const isImage = (type, bytes) => /^image\/(png|jpeg|webp)/.test(type || '') && bytes.byteLength > 15_000;

/** Penyedia GPU gratis. Masing-masing: render(job) → {bytes, type} | null. */
export function providers({ fetchImpl = fetch, env = process.env } = {}) {
  const list = [];
  // Workers AI lewat worker axto.io (binding AI): kunci HMAC engine = secret atau turunan CLOUDFLARE_API_KEY
  const hk = env.ENGINE_HMAC_KEY || (env.CLOUDFLARE_API_KEY ? createHmac('sha256', env.CLOUDFLARE_API_KEY).update('axto:ENGINE_HMAC_KEY').digest('hex') : '');
  if (hk) {
    list.push({
      name: 'cloudflare-workers-ai',
      async render(job) {
        const body = JSON.stringify({ c: job.c, id: job.id, prompt: job.prompt });
        const ts = String(Date.now());
        const sig = createHmac('sha256', hk).update(`${ts}.${body}`).digest('hex');
        const r = await fetchImpl(`${env.AXTO_API || 'https://axto.io'}/internal/gpu/render`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-axto-ts': ts, 'x-axto-sig': sig }, body });
        const j = await r.json().catch(() => null);
        if (!r.ok || !j?.ok) { list.why ??= {}; list.why[this.name] = `HTTP ${r.status} ${j?.error ?? ''} ${j?.detail ?? ''}`.trim().slice(0, 160); return null; }
        return { stored: true, type: j.type };
      },
    });
  }
  // Pollinations.ai DIHAPUS (23 Nov 2026): gambarnya bertanda situs lain walau diminta nologo — tidak boleh tampil.
  return list;
}

/** AI Horde (anonim, asinkron): kirim pekerjaan, ambil hasil di putaran berikutnya. */
export function horde({ fetchImpl = fetch } = {}) {
  const H = { apikey: '0000000000', 'Client-Agent': 'axto-gpu:1.0:axto.io', 'content-type': 'application/json' };
  return {
    async submit(job) {
      const r = await fetchImpl(`${HORDE}/generate/async`, { method: 'POST', headers: H, body: JSON.stringify({ prompt: `${job.prompt} ### ${NEGATIVE}`, params: { width: 768, height: 768, steps: 24, n: 1, sampler_name: 'k_euler_a', cfg_scale: 7 }, nsfw: false, censor_nsfw: true, r2: true, models: ['SDXL 1.0'] }) });
      const j = r.ok ? await r.json().catch(() => null) : null;
      return j?.id ?? null;
    },
    async collect(hid) {
      const c = await fetchImpl(`${HORDE}/generate/check/${hid}`, { headers: H });
      const cj = c.ok ? await c.json().catch(() => null) : null;
      if (!cj) return { state: 'error' };
      if (cj.faulted || cj.is_possible === false) return { state: 'failed' };
      if (!cj.done) return { state: 'waiting' };
      const s = await fetchImpl(`${HORDE}/generate/status/${hid}`, { headers: H });
      const url = (s.ok ? await s.json().catch(() => null) : null)?.generations?.[0]?.img;
      if (!url) return { state: 'failed' };
      const im = await fetchImpl(url, { headers: { 'user-agent': UA } });
      const type = (im.headers.get('content-type') ?? 'image/webp').split(';')[0];
      const bytes = Buffer.from(await im.arrayBuffer());
      return isImage(type, bytes) ? { state: 'done', bytes, type } : { state: 'failed' };
    },
  };
}

export function realIO() {
  const tmp = mkdtempSync(join(tmpdir(), 'axto-gpu-'));
  const wr = (args) => execFileSync('npx', ['--yes', 'wrangler@4.156.1', 'r2', 'object', ...args, '--remote'], { stdio: 'pipe' });
  return {
    getText: (bk) => { const f = join(tmp, 'g'); try { wr(['get', bk, '--file', f]); return readFileSync(f, 'utf8'); } catch { return null; } },
    putText: (bk, text) => { const f = join(tmp, 'p'); writeFileSync(f, text); wr(['put', bk, '--file', f, '--content-type', 'application/json']); },
    putBytes: (bk, bytes, type) => { const f = join(tmp, 'b'); writeFileSync(f, bytes); wr(['put', bk, '--file', f, '--content-type', type, '--cache-control', 'public, max-age=31536000, immutable']); },
    copy: (from, to) => { const f = join(tmp, 'c'); wr(['get', from, '--file', f]); wr(['put', to, '--file', f, '--content-type', 'image/png', '--cache-control', 'public, max-age=31536000, immutable']); },
  };
}

export async function run({ io = realIO(), fetchImpl = fetch, env = process.env, log = console.log, perCol = QUEUE_PER_COL, budgetMs = Number(env.GPU_BUDGET_MIN || 20) * 60_000, max = { direct: 60, horde: 6 }, pause = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const t0 = Date.now();
  const parse = (t, d) => { try { return t ? JSON.parse(t) : d; } catch { return d; } };
  const st = {};
  for (const c of GPU_KEYS) {
    st[c] = parse(io.getText(`axto-nft-data/os/gpu-${c}.json`), { ids: [], serial: {}, by: {} });
    st[c].serial ??= {};
    st[c].by ??= {};
  }
  const have = (c, id) => st[c].ids.includes(id);
  const dirty = new Set();
  const baru = Object.fromEntries(GPU_KEYS.map((c) => [c, []]));
  const add = (c, id, by) => {
    if (have(c, id)) return false;
    const next = Math.max(0, ...Object.values(st[c].serial).map(Number)) + 1;
    st[c].ids.push(id);
    st[c].serial[id] = next;
    st[c].by[id] = by;
    baru[c].push({ id, by });
    dirty.add(c);
    return true;
  };
  const made = {};
  const bump = (by) => { made[by] = (made[by] ?? 0) + 1; };

  // a) hasil kunci GPU ulyah.com
  const done = parse(io.getText('ulyah-media/axto-gpu/done.json'), { done: {}, failed: {} });
  for (const [k, v] of Object.entries(done.done ?? {}).sort((x, y) => String(x[1].at).localeCompare(String(y[1].at)))) {
    const [c, s] = k.split(':');
    const id = Number(s);
    if (!GPU_KEYS.includes(c) || have(c, id)) continue;
    try { io.copy(`ulyah-media/axto-gpu/out/${c}/${id}.png`, `axto-nft-data/gpu/${c}/${id}.png`); if (add(c, id, 'huggingface-ulyah')) bump('huggingface-ulyah'); } catch { /* putaran berikutnya */ }
  }

  // b) AI Horde: ambil pekerjaan yang dikirim putaran lalu
  const H = horde({ fetchImpl });
  const hs = parse(io.getText('axto-nft-data/os/gpu-horde.json'), { pending: [] });
  const keep = [];
  for (const p of hs.pending ?? []) {
    if (have(p.c, p.id)) continue;
    let r = { state: 'error' };
    try { r = await H.collect(p.hid); } catch { r = { state: 'error' }; }
    if (r.state === 'done') { io.putBytes(`axto-nft-data/gpu/${p.c}/${p.id}.png`, r.bytes, r.type); if (add(p.c, p.id, 'ai-horde')) bump('ai-horde'); }
    else if ((r.state === 'waiting' || r.state === 'error') && Date.now() - p.at < 3 * 3_600_000) keep.push(p);
  }

  // c) karya berikutnya (bergiliran antar koleksi)
  const failedUlyah = (c, id) => (done.failed?.[`${c}:${id}`] ?? 0) >= 3;
  const busy = new Set(keep.map((p) => `${p.c}:${p.id}`));
  const lists = Object.fromEntries(GPU_KEYS.map((c) => { const out = []; for (const id of candidates(c)) { if (out.length >= perCol * 4) break; if (!have(c, id) && !busy.has(`${c}:${id}`) && !failedUlyah(c, id)) out.push(id); } return [c, out]; }));
  const queue = [];
  for (let i = 0; queue.length < perCol * GPU_KEYS.length * 4; i += 1) {
    let any = false;
    for (const c of GPU_KEYS) if (lists[c][i] !== undefined) { queue.push({ c, id: lists[c][i] }); any = true; }
    if (!any) break;
  }

  // d) render langsung dengan GPU gratis (bergiliran; penyedia yang gagal 3× berturut-turut diistirahatkan)
  const P = providers({ fetchImpl, env });
  const strikes = Object.fromEntries(P.map((p) => [p.name, 0]));
  let direct = 0;
  let qi = 0;
  for (; qi < queue.length && direct < max.direct && Date.now() - t0 < budgetMs; qi += 1) {
    const job = { ...queue[qi], prompt: promptFor(queue[qi].c, queue[qi].id) };
    const live = P.filter((p) => strikes[p.name] < 3);
    if (!live.length) break;
    let ok = false;
    for (let t = 0; t < live.length && !ok; t += 1) {
      const p = live[(qi + t) % live.length];
      let out = null;
      try { out = await p.render(job); } catch { out = null; }
      if (out) { if (!out.stored) io.putBytes(`axto-nft-data/gpu/${job.c}/${job.id}.png`, out.bytes, out.type); add(job.c, job.id, p.name); bump(p.name); strikes[p.name] = 0; ok = true; direct += 1; }
      else strikes[p.name] += 1;
    }
    await pause(6000); // sopan pada GPU terbuka (batas laju anonim)
  }

  // e) sisanya: kirim ke AI Horde (beberapa) dan antrean kunci GPU ulyah.com
  let sent = 0;
  for (; qi < queue.length && sent < max.horde; qi += 1) {
    const job = { ...queue[qi], prompt: promptFor(queue[qi].c, queue[qi].id) };
    let hid = null;
    try { hid = await H.submit(job); } catch { hid = null; }
    if (!hid) break;
    keep.push({ c: job.c, id: job.id, hid, at: Date.now() });
    sent += 1;
  }
  const ulyahJobs = queue.slice(qi, qi + perCol * GPU_KEYS.length).map((j) => ({ ...j, prompt: promptFor(j.c, j.id) }));
  io.putText('ulyah-media/axto-gpu/jobs.json', JSON.stringify({ at: new Date().toISOString(), jobs: ulyahJobs }));
  io.putText('axto-nft-data/os/gpu-horde.json', JSON.stringify({ at: new Date().toISOString(), pending: keep }));
  // Worker axto.io juga menambah seri G- tiap 5 menit (Cron Trigger + Workers AI). Agar tidak saling menimpa, dokumen
  // dibaca ULANG tepat sebelum ditulis dan hanya karya baru putaran ini yang ditambahkan (nomor seri lanjutan terbaru).
  for (const c of GPU_KEYS) {
    if (!dirty.has(c)) continue;
    let doc = parse(io.getText(`axto-nft-data/os/gpu-${c}.json`), { ids: [], serial: {}, by: {} });
    for (const x of baru[c]) doc = tambahSeri(doc, x.id, x.by) ?? doc;
    st[c] = doc;
    io.putText(`axto-nft-data/os/gpu-${c}.json`, JSON.stringify(doc));
  }
  const summary = Object.fromEntries(GPU_KEYS.map((c) => [c, st[c].ids.length]));
  log(`Seri G-: ${JSON.stringify(summary)} · baru per GPU ${JSON.stringify(made)} · AI Horde menunggu ${keep.length} · antrean ulyah ${ulyahJobs.length}${P.why ? ` · alasan gagal ${JSON.stringify(P.why)}` : ''}`);
  return { summary, made, hordePending: keep.length, ulyahQueued: ulyahJobs.length, why: P.why ?? {} };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  run().then((r) => {
    if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## Seri G- (karya GPU gratis)\n\n${Object.entries(r.summary).map(([c, n]) => `- ${c}: ${n} karya`).join('\n')}\n- baru per GPU: ${JSON.stringify(r.made)}\n- AI Horde menunggu: ${r.hordePending} · antrean ulyah.com: ${r.ulyahQueued}\n`, { flag: 'a' });
  }).catch((e) => { console.error(e.message || e); process.exit(1); });
}
