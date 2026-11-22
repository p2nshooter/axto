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
    if (COLLECTIONS[k].kind === 'quran') continue;
    assert.ok(spaceSize(k) >= COLLECTIONS[k].max, `${k}: ${spaceSize(k)} < ${COLLECTIONS[k].max}`);
  }
  assert.equal(planTotal(PLANS.quran), 2_000_000);
  assert.equal(planTotal(PLANS['ex-quran']), 50_000);
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

test('tier = label kelangkaan (5 tingkat, distribusi wajar); harga mulai $1 untuk semua', () => {
  const cnt = [0, 0, 0, 0, 0];
  for (let i = 1; i <= 20000; i += 1) cnt[dna('stamp', i).tier.rank] += 1;
  assert.ok(cnt[0] > cnt[4] * 5, JSON.stringify(cnt));
  assert.ok(cnt.every((n) => n > 0), JSON.stringify(cnt));
  for (const [c, id] of [['time', 7], ['stamp', 1_999_999], ['quran', 2_000_000], ['model', 3], ['ex-time', 50_000], ['ex-quran', 1]]) {
    const price = metadata(c, id).attributes.find((a) => a.trait_type === 'Starting Price (USD)');
    assert.equal(price.value, '1', c);
  }
});

test('tokenId di luar rentang ditolak', () => {
  assert.throws(() => dna('time', 0));
  assert.throws(() => dna('time', 2_000_001));
  assert.throws(() => dna('ex-time', 50_001));
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
