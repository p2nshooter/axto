import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../src/auction.js';

const T0 = Date.UTC(2026, 11, 1);

test('jadwal ronde 72 jam bersambung, segel 1 jam sebelum', () => {
  const r0 = A.roundAt(T0, T0 + 5 * A.HOUR);
  assert.equal(r0.k, 0);
  assert.equal(r0.endAt - r0.startAt, 72 * A.HOUR);
  const r1 = A.roundAt(T0, r0.endAt);
  assert.equal(r1.k, 1);
  assert.equal(r1.startAt, r0.endAt);
  assert.equal(r0.nextSealAt, r0.endAt - A.HOUR);
});

test('jumlah lot = 10% stok siap, min 1, maks cap', () => {
  assert.equal(A.sealCount(0), 0);
  assert.equal(A.sealCount(5), 1);
  assert.equal(A.sealCount(12_345), 1234);
  assert.equal(A.sealCount(2_000_000), 20_000);
});

test('pemilihan lot: penawaran tertinggi dulu, lalu urutan produksi', () => {
  const ids = A.selectLots([{ tokenId: 50, price: 300 }, { tokenId: 9, price: 900 }], [1, 2, 9, 3, 4], 4);
  assert.deepEqual(ids, [9, 50, 1, 2]);
});

test('harga mulai $1 untuk semua lot tanpa kecuali (USDC & AXTO, $10/AXTO)', () => {
  assert.equal(A.START_USD, 1);
  assert.equal(A.startUnits(), 100); // 1 USDC
  assert.equal(A.startUnits(A.START_USD, 'USDC'), 100);
  assert.equal(A.startUnits(A.START_USD, 'AXTO'), 100); // 0,1 AXTO = $1
  for (const c of ['time', 'stamp', 'quran', 'model', 'ex-time', 'ex-stamp', 'ex-quran']) {
    const cur = c.startsWith('ex-') ? 'AXTO' : 'USDC';
    assert.equal(A.newLot({ lotId: c, collection: c, tokenId: 1, currency: cur }).start, 100, c);
  }
  assert.equal(A.toBase(100, 'USDC'), '1000000');
  assert.equal(A.toBase(100, 'AXTO'), '100000000000000000');
});

test('contoh pemilik: A $1, B $3 (lepas A), C $5 (lepas B), D $10 saldo kurang → ditolak', () => {
  const lot = A.newLot({ lotId: 'L1', collection: 'ex-time', tokenId: 1, currency: 'USDC', start: 100, endAt: T0 + A.ROUND_MS });
  let r = A.placeBid(lot, { bidder: 'A', kind: 'fixed', amount: 100 }, T0, 100);
  assert.ok(r.ok);
  assert.equal(A.holdOf(lot), 100);
  r = A.placeBid(lot, { bidder: 'B', kind: 'fixed', amount: 300 }, T0 + 1, 300);
  assert.ok(r.ok);
  assert.deepEqual(r.released, { bidder: 'A', amount: 100 });
  r = A.placeBid(lot, { bidder: 'C', kind: 'fixed', amount: 500 }, T0 + 2, 1000);
  assert.ok(r.ok);
  assert.deepEqual(r.released, { bidder: 'B', amount: 300 });
  r = A.placeBid(lot, { bidder: 'D', kind: 'fixed', amount: 1000 }, T0 + 3, 999);
  assert.equal(r.error, 'insufficient_funds');
  assert.equal(lot.leader, 'C');
  assert.equal(lot.price, 500);
});

test('manual bebas (> tertinggi), otomatis minimal +10%', () => {
  const lot = A.newLot({ lotId: 'L2', collection: 'time', tokenId: 2, currency: 'USDC', start: 500, endAt: T0 + A.ROUND_MS });
  assert.equal(A.placeBid(lot, { bidder: 'A', kind: 'fixed', amount: 499 }, T0, 1e9).error, 'too_low');
  assert.ok(A.placeBid(lot, { bidder: 'A', kind: 'fixed', amount: 500 }, T0, 1e9).ok);
  assert.ok(A.placeBid(lot, { bidder: 'B', kind: 'fixed', amount: 501 }, T0, 1e9).ok); // manual +$0,01 boleh
  const r = A.placeBid(lot, { bidder: 'C', kind: 'proxy', max: 540 }, T0, 1e9);
  assert.equal(r.error, 'too_low'); // proxy harus ≥ 501 + 10%
  assert.equal(r.min, 501 + 51);
});

test('proxy-bid menaikkan +10% otomatis sampai batas', () => {
  const lot = A.newLot({ lotId: 'L3', collection: 'time', tokenId: 3, currency: 'USDC', start: 1000, endAt: T0 + A.ROUND_MS });
  assert.ok(A.placeBid(lot, { bidder: 'A', kind: 'proxy', max: 5000 }, T0, 5000).ok);
  assert.equal(lot.price, 1000);
  const r = A.placeBid(lot, { bidder: 'B', kind: 'fixed', amount: 2000 }, T0 + 1, 2000);
  assert.ok(r.ok && r.outbidImmediately);
  assert.equal(lot.leader, 'A');
  assert.equal(lot.price, 2200); // 2000 + 10%
  const r2 = A.placeBid(lot, { bidder: 'C', kind: 'proxy', max: 9000 }, T0 + 2, 9000);
  assert.ok(r2.ok);
  assert.equal(lot.leader, 'C');
  assert.equal(lot.price, 5500); // 5000 + 10%
  assert.deepEqual(r2.released, { bidder: 'A', amount: 5000 });
});

test('anti-sniping: perpanjangan 10 menit, maksimum +60 menit', () => {
  const end = T0 + A.ROUND_MS;
  const lot = A.newLot({ lotId: 'L4', collection: 'stamp', tokenId: 4, currency: 'USDC', start: 500, endAt: end });
  A.placeBid(lot, { bidder: 'A', kind: 'fixed', amount: 500 }, end - 60_000, 1e9);
  assert.equal(lot.endAt, end - 60_000 + A.SNIPE_WINDOW_MS);
  let t = lot.endAt - 1000;
  for (let i = 0; i < 20; i += 1) {
    A.placeBid(lot, { bidder: i % 2 ? 'A' : 'B', kind: 'fixed', amount: lot.price + 1 }, t, 1e9);
    t = lot.endAt - 1000;
  }
  assert.ok(lot.endAt <= end + A.SNIPE_MAX_EXT_MS);
});

test('tutup → klaim 48 jam → cascade ke penawar berikutnya yang dananya cukup', () => {
  const lot = A.newLot({ lotId: 'L5', collection: 'quran', tokenId: 5, currency: 'USDC', start: 500, endAt: T0 + 1000 });
  A.placeBid(lot, { bidder: 'A', kind: 'fixed', amount: 500 }, T0, 1e9);
  A.placeBid(lot, { bidder: 'B', kind: 'fixed', amount: 700 }, T0, 1e9);
  A.placeBid(lot, { bidder: 'C', kind: 'fixed', amount: 900 }, T0, 1e9);
  A.close(lot, lot.endAt);
  assert.equal(lot.status, 'awaiting_claim');
  assert.deepEqual(lot.winner, { bidder: 'C', amount: 900 });
  A.cascade(lot, T0 + A.CLAIM_WINDOW_MS + 3000, (b) => (b === 'B' ? 100 : 10_000)); // B kurang dana
  assert.deepEqual(lot.winner, { bidder: 'A', amount: 500 });
  A.cascade(lot, T0 + 2 * A.CLAIM_WINDOW_MS, () => 0);
  assert.equal(lot.status, 'requeue');
});

test('tanpa penawar → unsold (kembali ke antrean)', () => {
  const lot = A.newLot({ lotId: 'L6', collection: 'time', tokenId: 6, currency: 'USDC', start: 500, endAt: T0 });
  A.close(lot, T0);
  assert.equal(lot.status, 'unsold');
});

test('hold lintas lot: saldo yang sudah dipakai memimpin lot lain tidak bisa dipakai lagi', () => {
  const holds = new Map([['X', { bidder: 'A', amount: 800 }], ['Y', { bidder: 'B', amount: 100 }]]);
  assert.equal(A.availableFor('A', 1000, holds, 'Z'), 200);
  assert.equal(A.availableFor('A', 1000, holds, 'X'), 1000);
});

test('pembagian dana marketplace eksklusif 90/10', () => {
  assert.deepEqual(A.split(1000, true), { seller: 900, platform: 100 });
  assert.deepEqual(A.split(1000, false), { seller: 0, platform: 1000 });
});

test('penawaran stok menunggu menjadi tawaran pembuka saat live', () => {
  const lot = A.newLot({ lotId: 'O1', collection: 'time', tokenId: 7, currency: 'USDC', start: 500 });
  assert.equal(lot.status, 'offer');
  assert.ok(A.placeBid(lot, { bidder: 'A', kind: 'fixed', amount: 650 }, T0, 1e9).ok);
  A.goLive(lot, T0 + A.ROUND_MS);
  assert.equal(lot.status, 'live');
  assert.equal(lot.leader, 'A');
  assert.equal(lot.price, 650);
});
