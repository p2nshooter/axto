// Seri G- dibuat ulang (pemilik 24 Nov 2026): lukisan hanya dari worker (FLUX.2 + pemeriksa mutu); skrip ini hanya video GPU.
// Tanpa jaringan: R2 tiruan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, promptFor, GPU_KEYS, candidates } from '../gpu-sync.mjs';
import { gerakFor, QA_V } from '../../engine/src/gpu.js';
import { showcaseIds } from '../../engine/src/showcase.js';

const mkIO = () => {
  const files = {};
  const bytes = {};
  return { files, bytes, getText: (k) => files[k] ?? null, putText: (k, v) => { files[k] = v; }, putBytes: (k, b, t) => { bytes[k] = t; }, copy: (a, b, t = 'image/png') => { bytes[b] = `${t} ← ${a}`; } };
};

test('prompt v2: tanpa kata yang dilukis jadi huruf (masterpiece, 8k, no text), simetris & di tengah; Figur Model tidak', () => {
  assert.deepEqual(GPU_KEYS, ['time', 'stamp', 'quran', 'hadith', 'ex-time', 'ex-stamp', 'ex-quran', 'ex-hadith']);
  assert.equal(new Set(candidates('ex-quran')).size, 10_000, 'permutasi lengkap karya eksklusif');
  for (const c of GPU_KEYS) {
    for (const id of candidates(c).slice(0, 5)) {
      const p = promptFor(c, id);
      assert.doesNotMatch(p, /masterpiece|8k|no text|no letters|year \d|digits|nixie|seven-segment|calligraph/i, p);
      assert.match(p, /perfectly symmetrical composition, centered, straight-on front view/);
      assert.match(gerakFor(c, id), /static camera/);
    }
  }
  for (const c of ['quran', 'hadith']) assert.match(promptFor(c, candidates(c)[0]), /plain cream parchment (panel|cartouche) in the exact center/);
  assert.throws(() => promptFor('ex-model', 1));
  assert.throws(() => promptFor('model', 1));
});

test('video GPU: hanya karya lolos mutu yang diantrekan; video v2 disalin & ditandai vid; antrean gambar lama dikosongkan', async () => {
  const io = mkIO();
  const [a, b, c2, d] = showcaseIds('time').ids;
  const qa = { v: QA_V, nilai: 9 };
  io.files['axto-nft-data/os/gpu-time.json'] = JSON.stringify({ ids: [a, b, c2, d], serial: { [a]: 1, [b]: 2, [c2]: 3, [d]: 4 }, by: {}, qa: { [a]: qa, [b]: qa, [d]: { v: 1 } } });
  io.files['ulyah-media/axto-gpu/video-done.json'] = JSON.stringify({ done: { [`time:${a}:v${QA_V}`]: { at: 'x', bytes: 1, space: 's' }, [`time:${d}:v${QA_V}`]: { at: 'x' }, [`time:${b}`]: { at: 'lama' } } });
  io.files['ulyah-media/axto-gpu/jobs.json'] = JSON.stringify({ jobs: [{ c: 'time', id: 9 }] });
  const r = await run({ io, log: () => {} });
  assert.equal(io.bytes[`axto-nft-data/gpu/time/${a}.mp4`], `video/mp4 ← ulyah-media/axto-gpu/vid/time/${a}-v${QA_V}.mp4`);
  assert.equal(io.bytes[`axto-nft-data/gpu/time/${d}.mp4`], undefined, 'karya tanpa cap mutu v2 tidak pernah tampil');
  assert.equal(io.bytes[`axto-nft-data/gpu/time/${b}.mp4`], undefined, 'video versi lama tidak dipakai');
  const doc = JSON.parse(io.files['axto-nft-data/os/gpu-time.json']);
  assert.deepEqual(doc.vid, { [a]: true });
  const jobs = JSON.parse(io.files['ulyah-media/axto-gpu/video-jobs.json']).jobs;
  assert.deepEqual(jobs.map((j) => j.id), [b], 'hanya karya lolos mutu yang belum beranimasi');
  assert.equal(jobs[0].img, `https://axto.io/gpu/time/${b}.png?v=q${QA_V}`);
  assert.equal(jobs[0].v, QA_V);
  assert.match(jobs[0].prompt, /hands rotate/);
  assert.deepEqual(JSON.parse(io.files['ulyah-media/axto-gpu/jobs.json']).jobs, [], 'gambar tanpa pemeriksaan mutu tidak dibuat lagi');
  assert.equal(r.beranimasi.time, 1);
  assert.equal(r.summary.time, 2);
});
