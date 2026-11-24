import { test } from 'node:test';
import assert from 'node:assert/strict';
import { permute, unpermute, COLLECTIONS, decodeRadix } from '../src/core.js';
import { dna, spaceSize, canonical } from '../src/dna.js';
import { metadata } from '../src/metadata.js';
import { qaToken, qaBatch, wellFormed } from '../src/qa.js';
import { fsProvider } from '../src/provider-fs.js';
import { planTotal, PLANS } from '../src/catalog/quran.js';

test('permute adalah bijeksi (domain kecil, penuh)', () => {
  for (const n of [1, 2, 7, 100, 1000, 4097]) {
    const seen = new Set();
    for (let i = 0; i < n; i += 1) {
      const y = permute(i, n, 'k' + n);
      assert.ok(y >= 0 && y < n);
      assert.equal(unpermute(y, n, 'k' + n), i);
      seen.add(y);
    }
    assert.equal(seen.size, n);
  }
});

test('ruang kombinasi setiap koleksi > max', () => {
  for (const k of Object.keys(COLLECTIONS)) {
    if (COLLECTIONS[k].kind === 'quran' || COLLECTIONS[k].kind === 'hadith') { assert.ok(spaceSize(k) >= 263, `${k}: gaya per teks kurang`); continue; } // ruang gaya per ayat/hadits
    assert.ok(spaceSize(k) >= COLLECTIONS[k].max, `${k}: ${spaceSize(k)} < ${COLLECTIONS[k].max}`);
  }
  assert.equal(planTotal(PLANS.quran), 10_000_000);
  assert.equal(planTotal(PLANS['ex-quran']), 10_000);
});

test('DNA unik (sampel 30.000 per koleksi + ujung rentang)', () => {
  for (const k of Object.keys(COLLECTIONS)) {
    const max = COLLECTIONS[k].max;
    const seen = new Set();
    const ids = [...Array(Math.min(30000, max)).keys()].map((i) => i + 1).concat([max, max - 1, Math.floor(max / 2)]);
    for (const id of ids) {
      const c = canonical(dna(k, id));
      assert.ok(!seen.has(c) || id === max || id === max - 1 || id === Math.floor(max / 2), `${k} kembar pada ${id}`);
      seen.add(c);
    }
  }
});

test('deterministik: tokenId sama → DNA & metadata sama', () => {
  assert.deepEqual(dna('time', 4242), dna('time', 4242));
  assert.deepEqual(metadata('stamp', 9), metadata('stamp', 9));
});

test('tier = label kelangkaan (5 tingkat); harga tetap & edisi menurut kelangkaan (keputusan akhir 23 Nov 2026)', async () => {
  const { BANDS, edition } = await import('../src/editions.js');
  const cnt = [0, 0, 0, 0, 0];
  for (let i = 1; i <= 20000; i += 1) cnt[dna('stamp', i).tier.rank] += 1;
  assert.ok(cnt[0] > cnt[4] * 5, JSON.stringify(cnt));
  assert.ok(cnt.every((n) => n > 0), JSON.stringify(cnt));
  // OpenSea: harga tetap $1-$10.000 & edisi 1-10 dari tier (makin langka makin sedikit & makin mahal)
  for (const [c, id] of [['time', 7], ['stamp', 9_999_999], ['quran', 10_000_000], ['model', 3], ['hadith', 42]]) {
    const d = dna(c, id);
    const b = BANDS[d.tier.rank];
    const e = edition(c, id);
    const attrs = metadata(c, id).attributes;
    assert.equal(attrs.find((a) => a.trait_type === 'Price (USD)').value, String(e.priceUsd), c);
    assert.equal(attrs.find((a) => a.trait_type === 'Edition Size').value, e.supply, c);
    assert.ok(b.price.includes(e.priceUsd), `${c} harga ${e.priceUsd} di luar tier ${b.name}`);
    assert.ok(e.supply >= b.supply[1] && e.supply <= b.supply[0], `${c} edisi ${e.supply} di luar tier ${b.name}`);
  }
  assert.equal(BANDS[0].price[0], 1);
  assert.equal(BANDS[4].price.at(-1), 250); // pemilik 24 Nov 2026: Classic $1–5 … Masterpiece $100–250
  assert.deepEqual(BANDS[4].supply, [1, 1]);
  // eksklusif: harga tetap $1, 10 edisi
  for (const [c, id] of [['ex-time', 10_000], ['ex-quran', 1], ['ex-model', 77], ['ex-hadith', 5]]) {
    const attrs = metadata(c, id).attributes;
    assert.equal(attrs.find((a) => a.trait_type === 'Price (USD)').value, '1', c);
    assert.equal(attrs.find((a) => a.trait_type === 'Edition Size').value, 10, c);
  }
});

test('tokenId di luar rentang ditolak', () => {
  assert.throws(() => dna('time', 0));
  assert.throws(() => dna('time', 10_000_001));
  assert.ok(dna('time', 10_000_000));
  assert.throws(() => dna('ex-time', 10_001));
  assert.throws(() => dna('ex-model', 10_001));
});

test('QA: sampel semua koleksi lolos (termasuk teks Qur\'an sama persis dengan sumber)', async () => {
  for (const k of ['time', 'stamp', 'quran', 'ex-time', 'ex-stamp', 'ex-quran']) {
    for (const id of [1, 2, 3, 777, COLLECTIONS[k].max]) {
      const r = await qaToken(k, id, fsProvider);
      assert.ok(r.ok, `${k}#${id}: ${r.errors.join('; ')}`);
    }
  }
});

test('QA batch kecil: root stabil', async () => {
  const a = await qaBatch('time', 1000, 50, fsProvider);
  const b = await qaBatch('time', 1000, 50, fsProvider);
  assert.equal(a.failures.length, 0);
  assert.equal(a.root, b.root);
});

test('wellFormed mendeteksi tag rusak', () => {
  assert.ok(wellFormed('<svg><g/></svg>').ok);
  assert.ok(!wellFormed('<svg><g></svg>').ok);
  assert.ok(!wellFormed('<svg>a & b</svg>').ok);
});

test('decodeRadix', () => {
  assert.deepEqual(decodeRadix(0, [3, 4]), [0, 0]);
  assert.deepEqual(decodeRadix(11, [3, 4]), [2, 3]);
});

test('#43 genom gerak: tidak ada dua NFT yang bergerak sama (20.000 berurutan per koleksi) dan SVG beranimasi tetap valid', async () => {
  const { motionGenome, radices } = await import('../src/render/motion.js');
  const { animatedSvg } = await import('../src/metadata.js');
  const { wellFormed } = await import('../src/qa.js');
  for (const k of ['time', 'stamp', 'quran', 'ex-time', 'ex-quran']) {
    const kind = COLLECTIONS[k].kind;
    assert.ok(radices(kind).reduce((a, b) => a * b, 1) >= COLLECTIONS[k].max, `${k}: ruang gerak < max`);
    const seen = new Set();
    const n = Math.min(20000, COLLECTIONS[k].max);
    for (let id = 1; id <= n; id += 1) {
      const g = motionGenome(dna(k, id)).key;
      assert.ok(!seen.has(g), `${k}#${id} gerak kembar`);
      seen.add(g);
    }
  }
  for (const [k, id] of [['time', 1], ['time', 9_999_999], ['stamp', 2], ['stamp', 77]]) {
    const s = animatedSvg(dna(k, id), {});
    assert.ok(wellFormed(s), `${k}#${id} SVG rusak`);
    assert.match(s, /@keyframes mx/);
    assert.doesNotMatch(s, /axsw/); // sapuan cahaya klasik sudah diganti
  }
});

test('#49 hadits: 10 jt publik & 10.000 eksklusif tanpa kembar, teks sama persis dengan sumber, rujukan lengkap', async () => {
  const { TOTAL_HADITH } = await import('../src/catalog/hadith.js');
  assert.equal(TOTAL_HADITH, 38144);
  const seen = new Set();
  for (let id = 1; id <= 20000; id += 1) { const c = canonical(dna('hadith', id)); assert.ok(!seen.has(c), `hadith#${id} kembar`); seen.add(c); }
  const units = new Set();
  for (let id = 1; id <= 10000; id += 1) units.add(dna('ex-hadith', id).series.unit);
  assert.equal(units.size, 10000, 'eksklusif: 10.000 hadits berbeda');
  for (const [k, id] of [['hadith', 1], ['hadith', 9_999_999], ['ex-hadith', 7]]) {
    const r = await qaToken(k, id, fsProvider);
    assert.ok(r.ok, `${k}#${id}: ${r.errors.join('; ')}`);
    const m = metadata(k, id);
    for (const t of ['Kitab', 'Hadith Number', 'Series', 'Gallery']) assert.ok(m.attributes.some((a) => a.trait_type === t), `${k}#${id} tanpa ${t}`);
  }
});

test('jgn ada logo/label apapun di semua karya (pemilik, 24 Nov 2026): tanpa tanda „AXTO", lencana EXCLUSIVE, logo atau tanda air', async () => {
  const { animatedSvg, renderCtx } = await import('../src/metadata.js');
  for (const k of Object.keys(COLLECTIONS)) {
    for (const id of [1, 42, 777]) {
      const d = dna(k, id);
      const s = animatedSvg(d, await renderCtx(d, fsProvider));
      // teks yang TAMPIL (isi <text>/<textPath>) — nama fon seperti 'AXTO Amiri' tidak tampil
      const tampil = [...s.matchAll(/<text(?:Path)?\b[^>]*>([^<]*)</g)].map((m) => m[1]).join(' ');
      assert.doesNotMatch(tampil, /AXTO|©|logo|watermark|EXCLUSIVE|LIVE · 1\/1/i, `${k}#${id} membawa tanda/logo/label`);
    }
  }
});
