// Seri G- (pemilik 24 Nov 2026): karya lama TIDAK dihapus (tampil sebagai gambar aslinya); karya baru FLUX.2 + pemeriksa
// mutu, hanya yang lolos masuk seri; jatah gratis harian disebar 24 jam (R2 CAS, tidak dobel).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gpuTick, ambilJatah, lukisGratis, putusan, MODEL, MODEL_QA, MODEL_CADANGAN } from '../src/gpu.js';
import { candidates, QA_V } from '../../engine/src/gpu.js';

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
    async delete(k) { for (const x of [].concat(k)) m.delete(x); },
    async list({ prefix }) { return { objects: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })), truncated: false }; },
  };
}
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(30_000, 9)]).toString('base64');
const BAGUS = { text: false, symmetric: true, deformed: false, subject: true, quality: 9, panel: [0.3, 0.32, 0.7, 0.68], tone: 'light' };
const JAM = (h, mnt = 0) => Date.UTC(2026, 10, 24, h, mnt);
/** Workers AI tiruan: FLUX.2 klein (multipart) melukis, Gemma 4 memeriksa dengan jawaban `nilai()`. */
function aiTiruan(nilai = () => BAGUS) {
  const log = [];
  return {
    log,
    async run(model, inp) {
      log.push(model);
      if (model === MODEL) { assert.ok(inp.multipart?.body && /multipart\/form-data/.test(inp.multipart.contentType)); return { image: PNG }; }
      if (model === MODEL_QA) {
        const [t, im] = inp.messages[0].content;
        assert.match(t.text, /ONLY one JSON object/);
        assert.match(im.image_url.url, /^data:image\/png;base64,/);
        return { response: `\`\`\`json\n${JSON.stringify(nilai())}\n\`\`\`` };
      }
      throw new Error(`model tak terduga ${model}`);
    },
  };
}
const envDengan = (ai) => ({ STORE: fakeR2(), AI: ai, GPU_HARIAN: '36' });

test('karya G- lama TIDAK dihapus atau disentuh; hanya karya bertanda situs lain dilukis ulang (lolos mutu, nomor seri sama)', async () => {
  const env = envDengan(aiTiruan());
  const [a, b] = candidates('stamp');
  env.STORE.m.set('os/gpu-stamp.json', { body: JSON.stringify({ ids: [a, b], serial: { [a]: 1, [b]: 2 }, by: { [a]: 'huggingface-ulyah', [b]: 'pollinations' } }), etag: 'x1' });
  env.STORE.m.set(`gpu/stamp/${a}.png`, { body: 'lama', etag: 'y' });
  const r = await gpuTick(env, { now: JAM(23, 55) });
  assert.deepEqual(r.dibuat, { c: 'stamp', id: b, g: 2, ulang: true, nilai: 9 });
  const doc = JSON.parse(env.STORE.m.get('os/gpu-stamp.json').body);
  assert.deepEqual(doc.ids, [a, b]);
  assert.deepEqual(doc.serial, { [a]: 1, [b]: 2 });
  assert.equal(doc.by[a], 'huggingface-ulyah', 'karya lama tetap');
  assert.equal(doc.qa?.[a], undefined, 'karya lama tanpa cap — tampil sebagai gambar aslinya');
  assert.equal(doc.qa[b].v, QA_V);
  assert.equal(env.STORE.m.get(`gpu/stamp/${a}.png`).body, 'lama', 'gambar lama tidak dihapus');
});

test('tick: FLUX.2 melukis, pemeriksa meloloskan → seri G-1.. bergiliran 8 koleksi, cap mutu & panel tersimpan', async () => {
  const ai = aiTiruan();
  const env = envDengan(ai);
  const hasil = [];
  for (let i = 0; i < 8; i += 1) hasil.push((await gpuTick(env, { now: JAM(23, 55) + i * 1000 })).dibuat);
  assert.equal(new Set(hasil.map((h) => h.c)).size, 8, 'bergiliran ke 8 koleksi');
  for (const h of hasil) assert.equal(h.g, 1);
  const q = JSON.parse(env.STORE.m.get('os/gpu-quran.json').body);
  const id = candidates('quran')[0];
  assert.deepEqual(q.ids, [id]);
  assert.deepEqual(q.qa[id], { v: QA_V, nilai: 9, model: MODEL, panel: [0.3, 0.32, 0.7, 0.68], nada: 'terang' });
  assert.ok(env.STORE.m.has(`gpu/quran/${id}.png`));
  assert.equal(ai.log.filter((x) => x === MODEL).length, 8);
  assert.equal(ai.log.filter((x) => x === MODEL_QA).length, 8, 'setiap lukisan diperiksa');
});

test('lukisan bertulisan / tidak simetris DITOLAK: tidak disimpan, tidak masuk seri, kandidat dicoba ulang lalu dilewati setelah 3×', async () => {
  const env = envDengan(aiTiruan(() => ({ ...BAGUS, text: true, symmetric: false })));
  const t = JAM(23, 55);
  for (const c of ['time', 'stamp', 'hadith', 'ex-time', 'ex-stamp', 'ex-quran', 'ex-hadith']) env.STORE.m.set(`os/gpu-${c}.json`, { body: JSON.stringify({ ids: [1, 2], serial: { 1: 1, 2: 2 }, by: {}, qa: { 1: { v: QA_V }, 2: { v: QA_V } } }), etag: c });
  const id = candidates('quran')[0];
  for (let i = 0; i < 3; i += 1) assert.match((await gpuTick(env, { now: t + i })).alasan, /mutu: tulisan, tidak simetris/);
  const q = JSON.parse(env.STORE.m.get('os/gpu-quran.json').body);
  assert.deepEqual(q.ids, []);
  assert.equal(q.gagal[id], 3);
  assert.equal(env.STORE.m.has(`gpu/quran/${id}.png`), false, 'lukisan gagal tidak pernah disimpan');
  env.AI = aiTiruan();
  const r = await gpuTick(env, { now: t + 10 });
  assert.equal(r.dibuat.id, candidates('quran')[1], 'kandidat yang gagal 3× dilewati');
});

test('putusan pemeriksa: panel Qur\'an wajib ada, cukup besar & di tengah; nilai < 8 ditolak', () => {
  assert.equal(putusan('quran', BAGUS).lolos, true);
  assert.deepEqual(putusan('quran', { ...BAGUS, panel: null }).alasan, ['panel']);
  assert.deepEqual(putusan('ex-hadith', { ...BAGUS, panel: [0, 0, 0.3, 0.3] }).alasan, ['panel']);
  assert.deepEqual(putusan('time', { ...BAGUS, quality: 7 }).alasan, ['nilai 7']);
  assert.equal(putusan('time', { ...BAGUS, panel: null }).lolos, true, 'jam tidak butuh panel');
  assert.deepEqual(putusan('stamp', {}).alasan, ['tulisan', 'tidak simetris', 'cacat', 'subjek', 'nilai ?']);
});

test('jatah gratis disebar 24 jam & tidak pernah melewati batas harian', async () => {
  const s = fakeR2();
  let dapat = 0;
  for (let i = 0; i < 10; i += 1) if (await ambilJatah(s, { now: JAM(0, 10) + i, cap: 36 })) dapat += 1;
  assert.equal(dapat, 1, 'pukul 00.10 baru 1 jatah terbuka');
  let total = dapat;
  for (let mnt = 15; mnt < 1440; mnt += 5) if (await ambilJatah(s, { now: JAM(0) + mnt * 60_000, cap: 36 })) total += 1;
  assert.equal(total, 36);
});

test('alokasi gratis Workers AI habis (4006) → berhenti sampai esok, tidak pernah berbayar; klein menolak → cadangan FLUX.1', async () => {
  const env = envDengan({ async run() { throw new Error('4006: you have used up your daily free allocation of 10,000 neurons'); } });
  const r = await lukisGratis(env, 'time', candidates('time')[0], 'x', { now: JAM(12), rata: false });
  assert.equal(r.ok, false);
  let n = 0;
  env.AI = { async run() { n += 1; return { image: PNG }; } };
  assert.equal((await lukisGratis(env, 'time', candidates('time')[1], 'x', { now: JAM(13), rata: false })).alasan, 'jatah');
  assert.equal(n, 0, 'tidak memanggil Workers AI lagi hari itu');
  const dipakai = [];
  env.AI = { async run(model) { dipakai.push(model); if (model === MODEL) throw new Error('5006: input tidak dikenal'); if (model === MODEL_QA) return { response: JSON.stringify(BAGUS) }; return { image: PNG }; } };
  const besok = await lukisGratis(env, 'time', candidates('time')[1], 'x', { now: JAM(12) + 86_400_000, rata: false });
  assert.equal(besok.ok, true);
  assert.deepEqual(dipakai, [MODEL, MODEL_CADANGAN, MODEL_QA]);
  assert.match(besok.alasanKlein, /5006/);
});
