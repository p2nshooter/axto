// Seri G- (pemilik 24 Nov 2026): karya lama TIDAK dihapus (tampil sebagai gambar aslinya); karya baru FLUX.2 + pemeriksa
// mutu, hanya yang lolos masuk seri; jatah gratis harian disebar 24 jam (R2 CAS, tidak dobel).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gpuTick, ambilJatah, lukisGratis, putusan, putusanCek, lamaTampil, lamaBerlogo, BERLOGO, MODEL, MODEL_QA, MODEL_CADANGAN } from '../src/gpu.js';
import { candidates, QA_V } from '../../engine/src/gpu.js';

function fakeR2() {
  const m = new Map();
  let n = 0;
  return {
    m,
    async get(k) { const o = m.get(k); return o ? { etag: o.etag, json: async () => JSON.parse(o.body), body: o.body, arrayBuffer: async () => Uint8Array.from(o.raw ?? Buffer.from(o.body)).buffer } : null; },
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
const PNG_LAMA = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(2_000, 5)]);
const gambarLama = (env, c, id) => env.STORE.m.set(`gpu/${c}/${id}.png`, { body: 'lama', raw: PNG_LAMA, etag: `g${id}` });
/** Workers AI tiruan: FLUX.2 klein (multipart) melukis, Gemma 4 memeriksa mutu (`nilai()`) & logo karya lama (`cek(id)`). */
function aiTiruan(nilai = () => BAGUS, cek = () => ({ mark: false })) {
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
        if (/"mark"/.test(t.text)) return { response: JSON.stringify(cek()) };
        return { response: `\`\`\`json\n${JSON.stringify(nilai())}\n\`\`\`` };
      }
      throw new Error(`model tak terduga ${model}`);
    },
  };
}
const envDengan = (ai) => ({ STORE: fakeR2(), AI: ai, GPU_HARIAN: '36' });

test('karya G- lama: tampil hanya setelah pemeriksa mesin menyatakannya bersih; bertanda situs lain dilukis ulang lebih dulu (nomor seri sama)', async () => {
  const env = envDengan(aiTiruan());
  const [a, b] = candidates('stamp');
  env.STORE.m.set('os/gpu-stamp.json', { body: JSON.stringify({ ids: [a, b], serial: { [a]: 1, [b]: 2 }, by: { [a]: 'huggingface-ulyah', [b]: 'pollinations' } }), etag: 'x1' });
  gambarLama(env, 'stamp', a);
  const sebelum = JSON.parse(env.STORE.m.get('os/gpu-stamp.json').body);
  assert.equal(lamaTampil(sebelum, 'stamp', a), false, 'belum diperiksa = belum tampil');
  const r = await gpuTick(env, { now: JAM(23, 55) });
  assert.deepEqual(r.dibuat, { c: 'stamp', id: b, g: 2, ulang: true, nilai: 9 });
  assert.equal(r.dicek, 1);
  const doc = JSON.parse(env.STORE.m.get('os/gpu-stamp.json').body);
  assert.deepEqual(doc.ids, [a, b]);
  assert.deepEqual(doc.serial, { [a]: 1, [b]: 2 });
  assert.equal(doc.by[a], 'huggingface-ulyah', 'karya lama tidak dihapus');
  assert.equal(doc.cek[a].bersih, true);
  assert.equal(lamaTampil(doc, 'stamp', a), true, 'bersih → tampil sebagai gambar aslinya sampai dilukis ulang');
  assert.equal(doc.qa?.[a], undefined);
  assert.equal(doc.qa[b].v, QA_V);
  assert.equal(env.STORE.m.get(`gpu/stamp/${a}.png`).body, 'lama', 'gambar lama tidak dihapus');
});

test('jgn ada logo apapun: karya lama berlogo (daftar mata atau ditolak pemeriksa) disembunyikan & dilukis ulang lebih dulu', async () => {
  const env = envDengan(aiTiruan(() => BAGUS, () => ({ mark: true })));
  const berlogo = BERLOGO.time[0];
  const x = candidates('time').find((id) => !BERLOGO.time.includes(id));
  env.STORE.m.set('os/gpu-time.json', { body: JSON.stringify({ ids: [x, berlogo], serial: { [x]: 1, [berlogo]: 2 }, by: { [x]: 'huggingface-ulyah', [berlogo]: 'huggingface-ulyah' } }), etag: 't' });
  gambarLama(env, 'time', x);
  const awal = JSON.parse(env.STORE.m.get('os/gpu-time.json').body);
  assert.equal(lamaBerlogo(awal, 'time', berlogo), true);
  assert.equal(lamaTampil(awal, 'time', berlogo), false);
  const r1 = await gpuTick(env, { now: JAM(23, 55) });
  const d1 = JSON.parse(env.STORE.m.get('os/gpu-time.json').body);
  assert.equal(d1.cek[x].bersih, false, 'pemeriksa menemukan logo/tulisan');
  assert.equal(lamaTampil(d1, 'time', x), false, 'berlogo tidak tampil');
  assert.deepEqual(r1.dibuat, { c: 'time', id: x, g: 1, ulang: true, nilai: 9 }, 'nomor seri kecil dilukis ulang lebih dulu');
  const r2 = await gpuTick(env, { now: JAM(23, 56) });
  assert.deepEqual(r2.dibuat, { c: 'time', id: berlogo, g: 2, ulang: true, nilai: 9 });
  const d2 = JSON.parse(env.STORE.m.get('os/gpu-time.json').body);
  assert.equal(d2.qa[x].v, QA_V);
  assert.equal(d2.qa[berlogo].v, QA_V, 'lukisan baru lolos mutu (tanpa tulisan/logo) → tampil setelah video GPU dibuat');
  assert.equal(putusanCek({}).bersih, false, 'jawaban tanpa „mark: false" tidak pernah dianggap bersih');
});

test('karya lama yang masih diam dilukis ulang bergantian dengan karya baru (agar semuanya beranimasi)', async () => {
  const env = envDengan(aiTiruan());
  const [x] = candidates('hadith');
  env.STORE.m.set('os/gpu-hadith.json', { body: JSON.stringify({ ids: [x], serial: { [x]: 1 }, by: { [x]: 'huggingface-ulyah' }, cek: { [x]: { bersih: true } } }), etag: 'h' });
  const slotUlang = JAM(23, 50); // floor(t / 5 menit) genap
  const slotBaru = slotUlang + 300_000;
  const baru = await gpuTick(env, { now: slotBaru });
  assert.equal(baru.dibuat.ulang, undefined, 'giliran karya baru');
  const ulang = await gpuTick(env, { now: slotUlang + 600_000 });
  assert.deepEqual(ulang.dibuat, { c: 'hadith', id: x, g: 1, ulang: true, nilai: 9 }, 'giliran lukis ulang karya lama yang diam');
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
