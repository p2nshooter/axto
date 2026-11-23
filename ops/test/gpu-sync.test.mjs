// Seri G- dengan GPU gratis: Workers AI → Pollinations (cadangan) → AI Horde (asinkron) → kunci HF ulyah.com.
// Tanpa jaringan: fetch & R2 tiruan. Nomor seri G- berurutan, tidak dobel, Figur Model tidak diproduksi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, promptFor, GPU_KEYS, candidates } from '../gpu-sync.mjs';
import { showcaseIds } from '../../engine/src/showcase.js';

const IMG = Buffer.alloc(40_000, 7);
const mkIO = () => {
  const files = {};
  const bytes = {};
  return { files, bytes, getText: (k) => files[k] ?? null, putText: (k, v) => { files[k] = v; }, putBytes: (k, b, t) => { bytes[k] = t; }, copy: (a, b, t = 'image/png') => { bytes[b] = t; } };
};
const res = (status, body, type) => new Response(body, { status, headers: type ? { 'content-type': type } : {} });
const ENV = { CLOUDFLARE_ACCOUNT_ID: 'acc', CLOUDFLARE_API_KEY: 'k', CLOUDFLARE_EMAIL: 'e@x' };

test('deskripsi GPU: tanpa teks, Figur Model tidak diproduksi', () => {
  assert.deepEqual(GPU_KEYS, ['time', 'stamp', 'quran', 'hadith', 'ex-time', 'ex-stamp', 'ex-quran', 'ex-hadith']);
  assert.throws(() => promptFor('ex-model', 1));
  const ex = candidates('ex-quran');
  assert.equal(new Set(ex).size, 10_000, 'permutasi lengkap karya eksklusif');
  for (const c of GPU_KEYS) assert.match(promptFor(c, candidates(c)[0]), /no text, no letters/);
  assert.throws(() => promptFor('model', 1));
});

test('GPU gratis: Workers AI merender, gagal sesekali dilewati; seri G- per koleksi berurutan; Pollinations tidak dipakai (watermark)', async () => {
  const io = mkIO();
  let cf = 0;
  let pol = 0;
  const fetchImpl = async (url) => {
    if (url.endsWith('/internal/gpu/render')) { cf += 1; return cf % 3 === 0 ? res(502, JSON.stringify({ error: 'ai' }), 'application/json') : res(200, JSON.stringify({ ok: true, type: 'image/jpeg' }), 'application/json'); }
    if (url.includes('pollinations')) { pol += 1; return res(200, IMG, 'image/jpeg'); } // tidak boleh dipanggil
    if (url.includes('/generate/async')) return res(202, JSON.stringify({ id: `h${Math.random()}` }), 'application/json');
    return res(404, 'x');
  };
  const r = await run({ io, fetchImpl, env: ENV, log: () => {}, perCol: 2, max: { direct: 16, horde: 2 }, pause: async () => {} });
  assert.equal(Object.values(r.made).reduce((a, b) => a + b, 0), 16);
  assert.equal(r.made['cloudflare-workers-ai'], 16, JSON.stringify(r.made));
  assert.equal(pol, 0, 'Pollinations tidak pernah dipanggil');
  for (const c of GPU_KEYS) {
    const st = JSON.parse(io.files[`axto-nft-data/os/gpu-${c}.json`]);
    assert.ok(st.ids.length >= 1, c);
    assert.deepEqual(Object.values(st.serial).sort((a, b) => a - b), st.ids.map((_, i) => i + 1));
    for (const id of st.ids) assert.ok(st.by[id] === 'cloudflare-workers-ai' || io.bytes[`axto-nft-data/gpu/${c}/${id}.png`], 'gambar tersimpan (Workers AI menyimpan sendiri di worker)');
  }
  assert.equal(r.hordePending, 2);
  assert.ok(r.ulyahQueued > 0);
  const jobs = JSON.parse(io.files['ulyah-media/axto-gpu/jobs.json']).jobs;
  assert.ok(jobs.every((j) => j.c !== 'model' && /no text/.test(j.prompt)));
});

test('putaran berikutnya: hasil AI Horde & ulyah.com masuk dengan nomor seri lanjutan, tidak dobel', async () => {
  const io = mkIO();
  const [q1, q2, q3] = showcaseIds('quran').ids;
  io.files['axto-nft-data/os/gpu-quran.json'] = JSON.stringify({ ids: [q1], serial: { [q1]: 1 }, by: { [q1]: 'pollinations' } });
  io.files['axto-nft-data/os/gpu-horde.json'] = JSON.stringify({ pending: [{ c: 'quran', id: q2, hid: 'H1', at: Date.now() }] });
  io.files['ulyah-media/axto-gpu/done.json'] = JSON.stringify({ done: { [`quran:${q3}`]: { at: '2026-11-23T12:00:00Z' }, [`quran:${q1}`]: { at: '2026-11-23T10:00:00Z' } }, failed: {} });
  const fetchImpl = async (url) => {
    if (url.endsWith('/generate/check/H1')) return res(200, JSON.stringify({ done: true }), 'application/json');
    if (url.endsWith('/generate/status/H1')) return res(200, JSON.stringify({ generations: [{ img: 'https://r2.example/h1.webp' }] }), 'application/json');
    if (url === 'https://r2.example/h1.webp') return res(200, IMG, 'image/webp');
    return res(503, 'down');
  };
  const r = await run({ io, fetchImpl, env: {}, log: () => {}, perCol: 1, max: { direct: 0, horde: 0 }, pause: async () => {} });
  const st = JSON.parse(io.files['axto-nft-data/os/gpu-quran.json']);
  assert.deepEqual(st.ids, [q1, q3, q2]);
  assert.deepEqual(st.serial, { [q1]: 1, [q3]: 2, [q2]: 3 });
  assert.equal(st.by[q2], 'ai-horde');
  assert.equal(st.by[q3], 'huggingface-ulyah');
  assert.equal(io.bytes[`axto-nft-data/gpu/quran/${q2}.png`], 'image/webp');
  assert.equal(r.hordePending, 0);
});

test('video GPU: hasil video disalin & ditandai vid; karya G- tanpa video masuk antrean (bukan bertanda situs lain)', async () => {
  const io = mkIO();
  const [a, b, c2] = showcaseIds('time').ids;
  io.files['axto-nft-data/os/gpu-time.json'] = JSON.stringify({ ids: [a, b, c2], serial: { [a]: 1, [b]: 2, [c2]: 3 }, by: { [a]: 'cloudflare-workers-ai', [b]: 'cloudflare-workers-ai', [c2]: 'pollinations' } });
  io.files['ulyah-media/axto-gpu/video-done.json'] = JSON.stringify({ done: { [`time:${a}`]: { at: 'x', bytes: 1, space: 's' } } });
  const r = await run({ io, fetchImpl: async () => new Response('down', { status: 503 }), env: {}, log: () => {}, perCol: 1, max: { direct: 0, horde: 0 }, pause: async () => {} });
  assert.equal(io.bytes[`axto-nft-data/gpu/time/${a}.mp4`], 'video/mp4');
  const st = JSON.parse(io.files['axto-nft-data/os/gpu-time.json']);
  assert.deepEqual(st.vid, { [a]: true });
  assert.deepEqual(st.serial, { [a]: 1, [b]: 2, [c2]: 3 }, 'nomor seri tetap');
  const jobs = JSON.parse(io.files['ulyah-media/axto-gpu/video-jobs.json']).jobs.filter((j) => j.c === 'time');
  assert.deepEqual(jobs.map((j) => j.id), [b], 'hanya karya bersih yang belum beranimasi');
  assert.equal(jobs[0].img, `https://axto.io/gpu/time/${b}.png?v=b`);
  assert.match(jobs[0].prompt, /clock hands rotate/);
  assert.match(jobs[0].prompt, /no text/);
  assert.equal(r.beranimasi.time, 1);
});
