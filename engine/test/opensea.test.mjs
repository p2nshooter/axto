// Koleksi OpenSea (keputusan pemilik 24 Nov 2026): 10 kontrak ERC-721 × 10 juta karya = 100 juta, edisi 1 tercetak saat
// deploy, edisi berikutnya urut sampai 1–10 menurut kelangkaan, harga tetap $1–$250; token = (edisi − 1) × 10 jt + karya.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OS_COLS, OS_KEYS, WORKS, tokenOf, tokenInfo, nextToken, tokenMetadata, gContractMetadata } from '../src/opensea.js';
import { edition } from '../src/editions.js';
import { metadata, contractMetadata } from '../src/metadata.js';

test('10 koleksi: 5 publik + 5 kembaran seri G-, nama & simbol unik', () => {
  assert.equal(OS_COLS.length, 10);
  assert.deepEqual(OS_KEYS, ['time', 'stamp', 'quran', 'model', 'hadith', 'g-time', 'g-stamp', 'g-quran', 'g-model', 'g-hadith']);
  assert.equal(new Set(OS_COLS.map((c) => c.symbol)).size, 10);
  assert.equal(WORKS * OS_COLS.length, 100_000_000);
});

test('nomor token ↔ karya & edisi; edisi tidak melebihi jumlah edisi karya; harga & edisi sama dengan editions.js', () => {
  for (const k of [1, 2, 42, 5_000_000, WORKS]) {
    const e = edition('quran', k);
    assert.ok(e.supply >= 1 && e.supply <= 10 && e.priceUsd >= 1 && e.priceUsd <= 250);
    for (let ed = 1; ed <= e.supply; ed += 1) {
      const t = tokenOf(k, ed);
      assert.deepEqual([tokenInfo('quran', t).work, tokenInfo('quran', t).edition, tokenInfo('quran', t).supply, tokenInfo('quran', t).priceUsd], [k, ed, e.supply, e.priceUsd]);
      assert.equal(nextToken('quran', t), ed < e.supply ? tokenOf(k, ed + 1) : null);
    }
    if (e.supply < 10) assert.equal(tokenInfo('quran', tokenOf(k, e.supply + 1)), null, 'edisi di luar jumlah edisi karya');
  }
  assert.equal(tokenOf(1, 1), 1);
  assert.equal(tokenOf(WORKS, 10), 100_000_000);
  assert.throws(() => tokenOf(0, 1));
  assert.throws(() => tokenOf(1, 11));
  assert.equal(tokenInfo('time', 0), null);
  assert.equal(tokenInfo('time', 100_000_001), null);
  assert.equal(tokenInfo('ex-time', 1), null, 'eksklusif bukan koleksi OpenSea ERC-721');
});

test('metadata token: nama edisi, seri G- memakai lukisan GPU bila ada, selain itu karya aslinya', () => {
  const info = tokenInfo('g-time', tokenOf(42, 1));
  const meta = metadata('time', 42);
  const a = tokenMetadata(info, meta);
  assert.match(a.name, /^OS-G · AXTO Time — .* · Edition 1\/\d+$/, 'belum dilukis: kode OS-G tanpa nomor lahir');
  assert.equal(a.image, meta.image, 'belum dilukis: karya asli');
  const b = tokenMetadata(info, meta, 'https://axto.io', { img: 'https://axto.io/gpu/time/42.png?v=2', anim: null, serial: 22 });
  assert.match(b.name, /^OS-G-22 · AXTO Time — /, 'sudah dilukis: OS-G-<nomor seri lukisan GPU>');
  assert.equal(b.image, 'https://axto.io/gpu/time/42.png?v=2');
  assert.equal(b.animation_url, meta.animation_url);
  assert.ok(b.attributes.some((x) => x.trait_type === 'Edition' && x.value === 1));
  const pub = tokenMetadata(tokenInfo('time', tokenOf(42, 1)), meta, 'https://axto.io', { img: 'x' });
  assert.match(pub.name, /^OS-42 · AXTO Time — .* · Edition 1\/\d+$/);
  assert.equal(pub.image, meta.image, 'koleksi publik tidak pernah memakai lukisan GPU');
  assert.equal(gContractMetadata(contractMetadata('hadith'), 'g-hadith').name, 'AXTO G- Hadith Calligraphy');
});
