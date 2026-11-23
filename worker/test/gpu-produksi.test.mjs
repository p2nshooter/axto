// Seri G- 24 jam di worker: Cron Trigger + Workers AI dalam jatah gratis harian, seri berurutan & tidak dobel (R2 CAS).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gpuTick, ambilJatah, lukisGratis } from '../src/gpu.js';
import { candidates } from '../../engine/src/gpu.js';

function fakeR2() {
  const m = new Map();
  let n = 0;
  return {
    m,
    async get(k) { const o = m.get(k); return o ? { etag: o.etag, json: async () => JSON.parse(o.body), body: o.body } : null; },
    async put(k, body, opt = {}) {
      const cur = m.get(k);
      if (opt.onlyIf?.etagDoesNotMatch === '*' && cur) return null;
      if (opt.onlyIf?.etagMatches && (!cur || cur.etag !== opt.onlyIf.etagMatches)) return null;
      m.set(k, { body: typeof body === 'string' ? body : `<${body.byteLength} byte>`, etag: `e${++n}` });
      return { etag: `e${n}` };
    },
  };
}
const GAMBAR = Buffer.alloc(30_000, 9).toString('base64');
const envDengan = (ai) => ({ STORE: fakeR2(), AI: { run: ai }, GPU_HARIAN: '48' });
const JAM = (h, mnt = 0) => Date.UTC(2026, 10, 24, h, mnt);

test('tick cron melukis satu karya, koleksi paling sedikit dulu, nomor seri lanjut & tidak dobel', async () => {
  let panggil = 0;
  const env = envDengan(async (model, inp) => { panggil += 1; assert.match(inp.prompt, /no text/); return { image: GAMBAR }; });
  const t = JAM(23, 55); // jatah hari ini hampir seluruhnya terbuka
  const hasil = [];
  for (let i = 0; i < 10; i += 1) hasil.push((await gpuTick(env, { now: t + i * 1000 })).dibuat);
  assert.equal(panggil, 10);
  const perKoleksi = {};
  for (const h of hasil) perKoleksi[h.c] = (perKoleksi[h.c] ?? 0) + 1;
  assert.ok(Object.keys(perKoleksi).length === 8, 'bergiliran ke 8 koleksi');
  for (const c of Object.keys(perKoleksi)) {
    const doc = JSON.parse(env.STORE.m.get(`os/gpu-${c}.json`).body);
    assert.equal(new Set(doc.ids).size, doc.ids.length);
    assert.deepEqual(Object.values(doc.serial).sort((a, b) => a - b), doc.ids.map((_, i) => i + 1));
    assert.deepEqual(doc.ids, candidates(c).slice(0, doc.ids.length), 'urutan kandidat tetap');
    for (const id of doc.ids) assert.ok(env.STORE.m.has(`gpu/${c}/${id}.png`));
  }
});

test('jatah gratis disebar 24 jam: pagi buta hanya sedikit, tidak pernah melewati batas harian', async () => {
  const s = fakeR2();
  let dapat = 0;
  for (let i = 0; i < 10; i += 1) if (await ambilJatah(s, { now: JAM(0, 10) + i, cap: 48 })) dapat += 1;
  assert.equal(dapat, 1, 'pukul 00.10 baru 1 jatah terbuka');
  let total = dapat;
  for (let mnt = 15; mnt < 1440; mnt += 5) if (await ambilJatah(s, { now: JAM(0) + mnt * 60_000, cap: 48 })) total += 1;
  assert.equal(total, 48, 'sehari tepat 48 karya, merata');
});

test('alokasi gratis Workers AI habis (4006) → berhenti sampai esok, tidak pernah berbayar', async () => {
  const env = envDengan(async () => { throw new Error('4006: you have used up your daily free allocation of 10,000 neurons'); });
  const r = await lukisGratis(env, 'time', candidates('time')[0], 'x no text', { now: JAM(12), rata: false });
  assert.equal(r.ok, false);
  const ai2 = { n: 0 };
  env.AI.run = async () => { ai2.n += 1; return { image: GAMBAR }; };
  const r2 = await lukisGratis(env, 'time', candidates('time')[1], 'x no text', { now: JAM(13), rata: false });
  assert.equal(r2.alasan, 'jatah');
  assert.equal(ai2.n, 0, 'tidak memanggil Workers AI lagi hari itu');
  const besok = await lukisGratis(env, 'time', candidates('time')[1], 'x no text', { now: JAM(12) + 86_400_000, rata: false });
  assert.equal(besok.ok, true);
});
