// Seri G-: antrean dari DNA (tanpa teks, tanpa Figur Model), hasil disalin & diberi nomor seri G- berurutan, idempoten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, promptFor, GPU_KEYS } from '../gpu-sync.mjs';
import { showcaseIds } from '../../engine/src/showcase.js';

const mkIO = (files = {}) => {
  const copies = [];
  return { files, copies, getText: (k) => files[k] ?? null, putText: (k, v) => { files[k] = v; }, copy: (a, b) => { copies.push([a, b]); files[b] = 'png'; } };
};

test('deskripsi GPU: tanpa teks, Figur Model tidak diproduksi', () => {
  assert.deepEqual(GPU_KEYS, ['time', 'stamp', 'quran', 'hadith']);
  for (const c of GPU_KEYS) {
    const p = promptFor(c, showcaseIds(c).ids[0]);
    assert.match(p, /no text, no letters/);
    assert.ok(p.length > 80 && p.length < 600, p);
  }
  assert.throws(() => promptFor('model', 1));
});

test('putaran pertama: antrean per koleksi; putaran berikutnya: hasil disalin + seri G-1, G-2 … tanpa dobel', () => {
  const io = mkIO();
  let r = run({ io, log: () => {}, perCol: 3 });
  assert.equal(r.queued, 12);
  const jobs = JSON.parse(io.files['ulyah-media/axto-gpu/jobs.json']).jobs;
  assert.deepEqual(jobs.filter((j) => j.c === 'quran').map((j) => j.id), showcaseIds('quran').ids.slice(0, 3));
  // ulyah merender dua karya Qur'an
  const [a, b] = showcaseIds('quran').ids;
  io.files['ulyah-media/axto-gpu/done.json'] = JSON.stringify({ done: { [`quran:${b}`]: { at: '2026-11-23T12:00:00Z' }, [`quran:${a}`]: { at: '2026-11-23T11:00:00Z' } }, failed: {} });
  r = run({ io, log: () => {}, perCol: 3 });
  const st = JSON.parse(io.files['axto-nft-data/os/gpu-quran.json']);
  assert.deepEqual(st.ids, [a, b]);
  assert.deepEqual(st.serial, { [a]: 1, [b]: 2 }, 'nomor seri mengikuti urutan selesai');
  assert.equal(io.copies.length, 2);
  assert.equal(r.summary.quran.works, 2);
  assert.ok(!JSON.parse(io.files['ulyah-media/axto-gpu/jobs.json']).jobs.some((j) => j.c === 'quran' && (j.id === a || j.id === b)));
  run({ io, log: () => {}, perCol: 3 });
  assert.equal(io.copies.length, 2, 'tidak disalin ulang');
});
