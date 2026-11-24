// Staking koin AXTO (pemilik, 24 Nov 2026): aturan hadiah berlaku kelipatan, hadiah 1/1 diundi acak & langsung tampil,
// koin terkunci sampai kontrak selesai, hadiah dikirim tanpa gas oleh wallet toko, staking ditutup saat rilis DEX.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/stake.js';
import * as C from '../src/coin.js';
import { stakeRewards, stakeTier, REWARD_TIERS, poolIds, stakeMetadata, stakeContractMetadata, stakeDesign, STAKE_ORDER } from '../../engine/src/stake.js';

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
      m.set(k, { body: typeof body === 'string' ? body : String(body), etag: `e${++n}`, meta: opt.customMetadata });
      return { etag: `e${n}` };
    },
    async delete(k) { m.delete(k); },
    async list({ prefix, cursor, limit = 1000 }) {
      const keys = [...m.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      return { objects: keys.slice(start, start + limit).map((k) => ({ key: k, customMetadata: m.get(k).meta })), truncated: start + limit < keys.length, cursor: String(start + limit) };
    },
  };
}
const W = '0x' + 'ab'.repeat(20);
const PAYOUT = '0x' + 'cd'.repeat(20);
const MICRO = C.MICRO;
const envWith = async (coins) => {
  const env = { STORE: fakeR2() };
  if (coins) await C.adjust(env, W, BigInt(coins) * MICRO, { ev: 'test' });
  return env;
};
const T0 = Date.UTC(2026, 10, 25, 3, 0);

test('aturan pemilik: per 1 AXTO 3/8/20 Classic; bonus 12 bulan berlaku kelipatan (10 → 3 Rare … 10.000 → 4.000 Rare, 1.000 Epic, 500 Masterpiece)', () => {
  assert.deepEqual(stakeRewards(1, 3), { classic: 3, rare: 0, epic: 0, masterpiece: 0 });
  assert.deepEqual(stakeRewards(1, 6), { classic: 8, rare: 0, epic: 0, masterpiece: 0 });
  assert.deepEqual(stakeRewards(1, 12), { classic: 20, rare: 0, epic: 0, masterpiece: 0 });
  assert.deepEqual(stakeRewards(10, 12), { classic: 200, rare: 3, epic: 0, masterpiece: 0 });
  assert.deepEqual(stakeRewards(10, 6), { classic: 80, rare: 0, epic: 0, masterpiece: 0 }, 'bonus hanya untuk 1 tahun penuh');
  assert.deepEqual(stakeRewards(100, 12), { classic: 2000, rare: 40, epic: 0, masterpiece: 0 });
  assert.deepEqual(stakeRewards(1000, 12), { classic: 20000, rare: 400, epic: 100, masterpiece: 50 });
  assert.deepEqual(stakeRewards(10000, 12), { classic: 200000, rare: 4000, epic: 1000, masterpiece: 500 });
  assert.deepEqual(stakeRewards(20000, 12), { classic: 400000, rare: 8000, epic: 2000, masterpiece: 1000 }, 'kelipatan');
  assert.deepEqual(stakeRewards(1234, 12), { classic: 24680, rare: 400 + 80 + 9, epic: 100, masterpiece: 50 }, '1.000 + 2×100 + 3×10');
  assert.equal(stakeRewards(0, 12), null);
  assert.equal(stakeRewards(5, 4), null);
});

test('koleksi staking: 1/1, Qur\'an & hadits lebih dulu, metadata OS-ST tanpa harga, galeri OpenSea mempromosikan koin', () => {
  assert.deepEqual(STAKE_ORDER, ['st-quran', 'st-hadith', 'st-stamp']);
  assert.deepEqual(stakeDesign(1), { key: 'st-quran', id: 1 });
  assert.deepEqual(stakeDesign(5), { key: 'st-hadith', id: 2 });
  assert.deepEqual(stakeDesign(6), { key: 'st-stamp', id: 2 });
  const m = stakeMetadata(1);
  assert.match(m.name, /^OS-ST-1 · AXTO Staking — Quran /);
  assert.ok(!m.attributes.some((a) => a.trait_type === 'Price (USD)'), 'hadiah tidak dijual');
  assert.equal(m.attributes.find((a) => a.trait_type === 'Edition Size').value, 1);
  assert.equal(m.image, 'https://axto.io/img/stake/1.svg');
  const c = stakeContractMetadata();
  assert.match(c.description, /never sold|Nothing here is for sale/);
  assert.match(c.description, /Mulai dari \$1/);
  assert.match(c.description, /dirilis ke DEX/);
});

test('kunci: koin dipotong, hadiah 1/1 diundi acak sesuai tier, langsung tampil, tanpa bentrok antar staking', async () => {
  const env = await envWith(300);
  const a = await S.lock(env, W, { coins: 100, months: 12, payout: PAYOUT, agree: true, agreementV: S.STAKE_AGREEMENT_V }, T0);
  assert.equal(a.ok, true);
  assert.deepEqual(a.stake.rewards, { classic: 2000, rare: 40, epic: 0, masterpiece: 0 });
  assert.equal((await C.account(env, W)).micro, String(200n * MICRO), '100 AXTO terkunci');
  for (const [tier, ids] of Object.entries(a.stake.preview)) for (const t of ids) assert.equal(stakeTier(t), REWARD_TIERS[tier], `${tier} #${t}`);
  const b = await S.lock(env, W, { coins: 10, months: 3, payout: PAYOUT, agree: true, agreementV: S.STAKE_AGREEMENT_V }, T0 + 1000);
  assert.equal(b.ok, true);
  const posA = JSON.parse(env.STORE.m.get(`stake/pos/${a.stake.id}.json`).body);
  const posB = JSON.parse(env.STORE.m.get(`stake/pos/${b.stake.id}.json`).body);
  const idsA = new Set(poolIds('classic', posA.ranges[0].from, posA.ranges[0].to));
  const idsB = poolIds('classic', posB.ranges[0].from, posB.ranges[0].to);
  assert.equal(idsA.size, 2000);
  assert.equal(idsB.length, 30);
  assert.ok(idsB.every((t) => !idsA.has(t)), 'tidak ada NFT hadiah yang diberikan dua kali');
  // end = 12 bulan kemudian (tanggal sama)
  assert.equal(new Date(posA.end).toISOString().slice(0, 10), '2027-11-25');
});

test('penolakan: saldo kurang, lama kunci salah, alamat penerima salah, tanpa persetujuan; staking ditutup saat rilis DEX', async () => {
  const env = await envWith(5);
  const base = { months: 3, payout: PAYOUT, agree: true, agreementV: S.STAKE_AGREEMENT_V };
  assert.equal((await S.lock(env, W, { ...base, coins: 6 })).error, 'balance');
  assert.equal((await S.lock(env, W, { ...base, coins: 1, months: 4 })).error, 'months');
  assert.equal((await S.lock(env, W, { ...base, coins: 1, payout: 'T123' })).error, 'payout_address');
  assert.equal((await S.lock(env, W, { ...base, coins: 1, agree: false })).error, 'agreement');
  assert.equal((await C.account(env, W)).micro, String(5n * MICRO), 'tidak ada koin yang hilang');
  // pemilik: „Staking stop saat release dex"
  await env.STORE.put('cfg/coin.json', JSON.stringify({ priceCents: 1000, dexReleased: true }));
  assert.equal((await S.lock(env, W, { ...base, coins: 1 })).error, 'closed');
  assert.equal((await S.quote(env, { coins: 1, months: 12 })).error, 'closed');
  assert.equal((await S.memberView(env, W)).open, false);
});

test('jatuh tempo: koin kembali utuh, hadiah masuk antrean kirim; batch tercatat sekali (idempoten) sampai selesai', async () => {
  const env = await envWith(2);
  const r = await S.lock(env, W, { coins: 2, months: 3, payout: PAYOUT, agree: true, agreementV: S.STAKE_AGREEMENT_V }, T0);
  assert.equal((await C.account(env, W)).micro, '0');
  assert.equal(await S.processDue(env, T0 + 30 * 86_400_000), 0, 'belum jatuh tempo');
  assert.equal((await S.pendingSends(env)).length, 0, 'belum bisa dikirim sebelum kontrak selesai');
  const due = T0 + 93 * 86_400_000;
  assert.equal(await S.processDue(env, due), 1);
  assert.equal((await C.account(env, W)).micro, String(2n * MICRO), 'koin kembali ke saldo');
  assert.equal(await S.processDue(env, due + 1000), 0, 'tidak dilepas dua kali');
  const [it] = await S.pendingSends(env, 4);
  assert.equal(it.payout, PAYOUT);
  assert.equal(it.ids.length, 4);
  assert.equal((await S.markSent(env, { id: r.stake.id, tier: 'classic', offset: 0, count: 4, tx: '0x1' })).finished, false);
  assert.equal((await S.markSent(env, { id: r.stake.id, tier: 'classic', offset: 0, count: 4, tx: '0x1' })).ok, false, 'batch yang sama tidak dicatat dua kali');
  const [it2] = await S.pendingSends(env, 4);
  assert.equal(it2.offset, 4);
  assert.equal(it2.ids.length, 2);
  assert.equal((await S.markSent(env, { id: r.stake.id, tier: 'classic', offset: 4, count: 2, tx: '0x2' })).finished, true);
  assert.equal((await S.pendingSends(env)).length, 0);
  const v = await S.memberView(env, W);
  assert.equal(v.stakes[0].status, 'done');
  assert.equal(v.stakes[0].sent.classic, 6);
});

test('koin: pembelian minimal $1 (batas jaringan per mata uang dihormati), perjanjian tanpa nama mitra pembayaran, peringatan jual kembali', () => {
  assert.equal(C.LIMITS.minBuyUsd, 1);
  for (const l of ['id', 'en']) {
    const all = [...C.AGREEMENT[l], C.AGREEMENT_WARN[l].title, ...C.AGREEMENT_WARN[l].items].join(' ');
    assert.doesNotMatch(all, /nowpayments/i, 'rahasia perusahaan');
    assert.match(C.AGREEMENT[l][0], /investasi|investment/);
  }
  assert.match(C.AGREEMENT_WARN.id.title, /berharap/);
  assert.match(C.AGREEMENT_WARN.id.items[1], /50%/);
});

test('pemilik: „Pastikan tidak ada karya yg sama" — desain staking tidak pernah sama dengan karya publik atau staking lain', async () => {
  const { dna, radicesOf } = await import('../../engine/src/dna.js');
  const { permute, unpermute, product, collection } = await import('../../engine/src/core.js');
  const { stakeDna } = await import('../../engine/src/stake.js');
  const comboOf = (digits, radices) => digits.reduce((acc, x, i) => acc * radices[i] + x, 0);
  // Qur'an & hadits: untuk ayat/hadits yang sama, gaya staking ≠ semua gaya publik (permutasi publik yang sama, nomor sesudahnya)
  for (const [key, pubKey, saltOf] of [['st-quran', 'quran', (u) => `axto/quran/v1:style:ayah:${u}`], ['st-hadith', 'hadith', (u) => `axto/hadith/v1:style:${u}`]]) {
    const R = radicesOf(key);
    assert.deepEqual(R, radicesOf(pubKey), `${key}: ruang sifat sama dengan publik (tanpa Finish)`);
    for (const id of [1, 2, 6236, 6237, 38_145, 999_999, 3_333_334]) {
      const d = dna(key, id);
      const combo = comboOf(d.digits, R);
      const v = unpermute(combo, product(R), saltOf(d.series.unit));
      assert.equal(v, d.series.variant);
      assert.ok(v >= d.series.variants, `${key} #${id}: gaya ${v} termasuk jatah publik (0..${d.series.variants - 1})`);
      assert.notEqual(permute(0, product(R), saltOf(d.series.unit)), combo);
    }
  }
  // prangko: nomor kombinasi di permutasi publik selalu ≥ 10 jt (jatah publik 0..10 jt − 1)
  const R = radicesOf('stamp');
  for (const id of [1, 2, 500_000, 3_333_334]) {
    const d = dna('st-stamp', id);
    assert.ok(unpermute(comboOf(d.digits, R), product(R), 'axto/stamp/v1:combo') >= collection('stamp').max, `st-stamp #${id}`);
  }
  // tidak ada dua token staking yang sama
  const seen = new Set();
  for (let t = 1; t <= 30_000; t += 1) {
    const d = stakeDna(t);
    const k = `${d.kind}:${d.series?.unit ?? ''}:${d.digits.join('.')}`;
    assert.ok(!seen.has(k), `token staking ${t} kembar`);
    seen.add(k);
  }
});
