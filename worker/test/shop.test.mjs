// Toko eksklusif ($1/edisi, 10 edisi per karya, koin AXTO), pasar member (harga tetap, penawaran, lelang; fee 10%) dan
// WD satuan/massal — dengan R2 tiruan (etag + onlyIf + customMetadata). Koin dihitung ulang di akhir: tidak ada koin yang
// tercipta atau hilang (kekekalan saldo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/shop.js';
import * as C from '../src/coin.js';

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
      const o = { body: String(body), etag: `e${++n}`, meta: opt.customMetadata };
      m.set(k, o);
      return { etag: o.etag };
    },
    async delete(k) { m.delete(k); },
    async list({ prefix, cursor, limit = 1000 }) {
      const keys = [...m.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const page = keys.slice(start, start + limit);
      return { objects: page.map((k) => ({ key: k, customMetadata: m.get(k).meta })), truncated: start + limit < keys.length, cursor: String(start + limit) };
    },
  };
}
const A = '0x' + 'a1'.repeat(20);
const B = '0x' + 'b2'.repeat(20);
const D = '0x' + 'd4'.repeat(20);
const COL = '0x' + 'c3'.repeat(20);
const vaultCalls = [];
const mkEnv = () => ({
  STORE: fakeR2(),
  VAULT_HMAC_KEY: 'k',
  VAULT: { call: async (method, body) => { const p = JSON.parse(body); vaultCalls.push([method, p]); return { to: p.owner, ids: p.items.map((x) => String(x.id)), amounts: p.items.map((x) => String(x.amount)), ref: '0x' + '11'.repeat(32), deadline: '1900000000', sig: '0x' + '22'.repeat(65) }; } },
});
const bal = async (env, w) => BigInt((await C.account(env, w)).micro);
const coins = (s) => C.parseCoins(s);
const colAddr = (c) => (c === 'ex-time' || c === 'ex-quran' ? COL : '');
const NAMES = { 'ex-time': 'AXTO Exclusive Time', 'ex-quran': "AXTO Exclusive Qur'an" };
let k = 0;
const ref = () => `ref-${String(++k).padStart(6, '0')}`;
async function revenue(env) {
  let t = 0n;
  for (const [key, o] of env.STORE.m) if (key.startsWith('x/rev/')) t += BigInt(o.meta.micro);
  return t;
}

test('toko eksklusif: $1 per edisi = 0,1 AXTO (harga koin $10), maksimal 10 edisi per karya, saldo kurang ditolak', async () => {
  const env = mkEnv();
  assert.equal(await S.editionMicro(env), 100_000n);
  await C.adjust(env, A, coins('1'));
  let r = await S.buyExclusive(env, A, { c: 'ex-time', id: 7, qty: 3, ref: ref() });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(await bal(env, A), coins('0.7'));
  assert.deepEqual(await S.stockOf(env, 'ex-time', 7), { supply: 10, sold: 3, left: 7 });
  const rr = r.order.oid;
  // ulang dengan ref sama → tidak dobel
  const again = await S.buyExclusive(env, A, { c: 'ex-time', id: 7, qty: 3, ref: `ref-${String(k).padStart(6, '0')}` });
  assert.equal(again.order.oid, rr);
  assert.equal(await bal(env, A), coins('0.7'));
  // saldo kurang: 8 edisi = 0,8 AXTO > 0,7 → gagal, stok kembali
  r = await S.buyExclusive(env, A, { c: 'ex-time', id: 7, qty: 7, ref: ref() });
  assert.equal(r.ok, true);
  r = await S.buyExclusive(env, A, { c: 'ex-time', id: 8, qty: 1, ref: ref() });
  assert.equal(r.error, 'balance');
  assert.deepEqual(await S.stockOf(env, 'ex-time', 8), { supply: 10, sold: 0, left: 10 });
  // habis: 10/10
  await C.adjust(env, B, coins('5'));
  r = await S.buyExclusive(env, B, { c: 'ex-time', id: 7, qty: 1, ref: ref() });
  assert.equal(r.error, 'sold_out');
  assert.equal(await bal(env, B), coins('5'));
  assert.equal((await S.soldMap(env, 'ex-time'))['7'], 10);
  const h = await S.holdings(env, A);
  assert.deepEqual(h.items, [{ c: 'ex-time', id: 7, qty: 10, free: 10 }]);
  assert.equal(await revenue(env), coins('1'));
  // masukan tidak sah
  assert.equal((await S.buyExclusive(env, A, { c: 'time', id: 1, qty: 1, ref: ref() })).error, 'item');
  assert.equal((await S.buyExclusive(env, A, { c: 'ex-time', id: 1, qty: 11, ref: ref() })).error, 'qty');
});

test('pasar member: harga tetap (beli sebagian), penawaran diterima/ditolak, fee 10%, kekekalan koin', async () => {
  const env = mkEnv();
  await C.adjust(env, A, coins('1'));
  await C.adjust(env, B, coins('10'));
  await C.adjust(env, D, coins('10'));
  await S.buyExclusive(env, A, { c: 'ex-quran', id: 42, qty: 5, ref: ref() });
  const start = (await bal(env, A)) + (await bal(env, B)) + (await bal(env, D)) + (await revenue(env));
  // 1) harga tetap + penawaran, 4 edisi @ 2 AXTO
  let r = await S.createListing(env, A, { c: 'ex-quran', id: 42, qty: 4, mode: 'fixed_offer', price: '2', days: 3 });
  assert.equal(r.ok, true, JSON.stringify(r));
  const lid = r.listing.lid;
  assert.equal((await S.holdings(env, A)).items[0].free, 1);
  // tidak bisa menjual lebih dari yang bebas
  assert.equal((await S.createListing(env, A, { c: 'ex-quran', id: 42, qty: 2, mode: 'fixed', price: '1' })).error, 'qty');
  assert.equal((await S.buyListing(env, A, { lid, qty: 1, ref: ref() })).error, 'own');
  r = await S.buyListing(env, B, { lid, qty: 1, ref: ref() });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.listing.left, 3);
  assert.equal(await bal(env, B), coins('8'));
  assert.equal(await bal(env, A), coins('0.5') + coins('1.8')); // 90% dari 2 AXTO
  // penawaran D: 2 edisi @ 1,5 → koin ditahan; ditolak → kembali
  r = await S.makeOffer(env, D, { lid, qty: 2, amount: '1.5' });
  assert.equal(r.ok, true);
  assert.equal(await bal(env, D), coins('7'));
  const off1 = r.listing.offers[0].oid;
  assert.equal((await S.dropOffer(env, A, { lid, oid: off1 })).ok, true);
  assert.equal(await bal(env, D), coins('10'));
  // penawaran baru diterima
  r = await S.makeOffer(env, D, { lid, qty: 2, amount: '1.5' });
  const off2 = r.listing.offers.find((x) => x.oid !== off1).oid;
  assert.equal((await S.acceptOffer(env, D, { lid, oid: off2 })).error, 'not_seller');
  r = await S.acceptOffer(env, A, { lid, oid: off2 });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.listing.left, 1);
  assert.equal(await bal(env, D), coins('7'));
  // penawaran tersisa dikembalikan saat penjual menutup listing
  await S.makeOffer(env, B, { lid, qty: 1, amount: '0.5' });
  assert.equal(await bal(env, B), coins('7.5'));
  assert.equal((await S.cancelListing(env, A, { lid })).ok, true);
  assert.equal(await bal(env, B), coins('8'));
  const hA = await S.holdings(env, A);
  assert.deepEqual(hA.items, [{ c: 'ex-quran', id: 42, qty: 2, free: 2 }]);
  assert.deepEqual((await S.holdings(env, B)).items, [{ c: 'ex-quran', id: 42, qty: 1, free: 1 }]);
  assert.deepEqual((await S.holdings(env, D)).items, [{ c: 'ex-quran', id: 42, qty: 2, free: 2 }]);
  const end = (await bal(env, A)) + (await bal(env, B)) + (await bal(env, D)) + (await revenue(env));
  assert.equal(end, start, 'tidak ada koin tercipta/hilang');
  assert.equal((await S.openListings(env)).total, 0);
  const hist = await S.history(env, A);
  assert.equal(hist.trades.length, 2);
});

test('lelang member: tawaran ditahan, yang disalip dikembalikan, kenaikan minimal 5%, pemenang menerima edisi saat berakhir', async () => {
  const env = mkEnv();
  await C.adjust(env, A, coins('1'));
  await C.adjust(env, B, coins('10'));
  await C.adjust(env, D, coins('10'));
  await S.buyExclusive(env, A, { c: 'ex-time', id: 3, qty: 2, ref: ref() });
  const start = (await bal(env, A)) + (await bal(env, B)) + (await bal(env, D)) + (await revenue(env));
  let r = await S.createListing(env, A, { c: 'ex-time', id: 3, qty: 2, mode: 'auction', start: '1', days: 1 });
  const lid = r.listing.lid;
  assert.equal((await S.bid(env, B, { lid, amount: '0.5' })).error, 'low');
  assert.equal((await S.bid(env, B, { lid, amount: '1' })).ok, true);
  assert.equal(await bal(env, B), coins('9'));
  assert.equal((await S.bid(env, D, { lid, amount: '1.04' })).error, 'low');
  assert.equal((await S.bid(env, D, { lid, amount: '1.05' })).ok, true);
  assert.equal(await bal(env, B), coins('10'), 'B disalip → koin kembali');
  assert.equal(await bal(env, D), coins('8.95'));
  assert.equal((await S.cancelListing(env, A, { lid })).error, 'has_bids');
  assert.equal((await S.bid(env, B, { lid, amount: '20' })).error, 'balance');
  // berakhir → selesaikan
  const L = await S.getListing(env, lid);
  assert.equal(await S.settleDue(env, L.endsAt + 1), 1);
  const done = await S.getListing(env, lid);
  assert.equal(done.status, 'sold');
  assert.deepEqual((await S.holdings(env, D)).items, [{ c: 'ex-time', id: 3, qty: 2, free: 2 }]);
  assert.deepEqual((await S.holdings(env, A)).items, []);
  assert.equal(await bal(env, A), coins('0.8') + (coins('1.05') * 9n) / 10n);
  const end = (await bal(env, A)) + (await bal(env, B)) + (await bal(env, D)) + (await revenue(env));
  assert.equal(end, start);
  // lelang tanpa tawaran → berakhir, edisi kembali bebas
  await S.buyExclusive(env, B, { c: 'ex-time', id: 4, qty: 1, ref: ref() });
  r = await S.createListing(env, B, { c: 'ex-time', id: 4, qty: 1, mode: 'auction', start: '1', days: 1 });
  await S.settleDue(env, Date.now() + 2 * 86_400_000);
  assert.equal((await S.getListing(env, r.listing.lid)).status, 'ended');
  assert.deepEqual((await S.holdings(env, B)).items, [{ c: 'ex-time', id: 4, qty: 1, free: 1 }]);
});

test('WD massal: satu voucher per koleksi, edisi keluar dari database axto.io, tidak bisa dijual lagi, riwayat tetap tampil', async () => {
  const env = mkEnv();
  await C.adjust(env, A, coins('3'));
  await S.buyExclusive(env, A, { c: 'ex-time', id: 1, qty: 3, ref: ref() });
  await S.buyExclusive(env, A, { c: 'ex-time', id: 2, qty: 1, ref: ref() });
  await S.buyExclusive(env, A, { c: 'ex-quran', id: 9, qty: 2, ref: ref() });
  await S.buyExclusive(env, A, { c: 'ex-model', id: 5, qty: 1, ref: ref() });
  // kontrak ex-model belum aktif → ditolak sebelum apa pun berubah
  assert.equal((await S.withdraw(env, A, { ref: ref(), items: [{ c: 'ex-model', id: 5, amount: 1 }] }, colAddr, NAMES)).error, 'contract_pending');
  // lebih dari yang dimiliki → gagal, tidak ada yang keluar
  let r = await S.withdraw(env, A, { ref: ref(), items: [{ c: 'ex-time', id: 1, amount: 2 }, { c: 'ex-time', id: 2, amount: 5 }] }, colAddr, NAMES);
  assert.equal(r.error, 'qty');
  assert.equal((await S.holdings(env, A)).items.find((x) => x.id === 1).qty, 3);
  vaultCalls.length = 0;
  const wref = ref();
  r = await S.withdraw(env, A, { ref: wref, items: [{ c: 'ex-time', id: 1, amount: 2 }, { c: 'ex-time', id: 2, amount: 1 }, { c: 'ex-quran', id: 9, amount: 2 }] }, colAddr, NAMES);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.vouchers.length, 2, 'satu voucher per koleksi');
  assert.equal(vaultCalls.length, 2);
  assert.deepEqual(vaultCalls.map(([m]) => m), ['mintBatchVoucher', 'mintBatchVoucher']);
  assert.deepEqual(vaultCalls[0][1].items, [{ id: 1, amount: 2 }, { id: 2, amount: 1 }]);
  // ulang dengan ref sama → voucher yang sama, tidak dobel keluar
  r = await S.withdraw(env, A, { ref: wref, items: [{ c: 'ex-time', id: 1, amount: 2 }, { c: 'ex-time', id: 2, amount: 1 }, { c: 'ex-quran', id: 9, amount: 2 }] }, colAddr, NAMES);
  assert.equal(r.ok, true);
  const h = await S.holdings(env, A);
  assert.deepEqual(h.items.map((x) => [x.c, x.id, x.qty]).sort(), [['ex-model', 5, 1], ['ex-time', 1, 1]].sort());
  assert.deepEqual(h.gone.map((x) => [x.c, x.id, x.qty]).sort(), [['ex-quran', 9, 2], ['ex-time', 1, 2], ['ex-time', 2, 1]].sort());
  // yang sudah ditarik tidak bisa dijual di pasar member
  assert.equal((await S.createListing(env, A, { c: 'ex-quran', id: 9, qty: 1, mode: 'fixed', price: '1' })).error, 'qty');
  const mine = await S.myWithdrawals(env, A, colAddr);
  assert.equal(mine.length, 2);
  assert.equal(mine[0].voucher.sig.length, 132);
});

test('pemulihan: pembelian yang terputus diselesaikan cron tanpa debit ganda', async () => {
  const env = mkEnv();
  await C.adjust(env, A, coins('1'));
  // simulasi: order tercatat + stok dipesan + koin didebit, lalu proses mati sebelum edisi masuk kustodi
  const r1 = await S.buyExclusive(env, A, { c: 'ex-time', id: 11, qty: 2, ref: ref() });
  const oid = r1.order.oid;
  const o = JSON.parse(env.STORE.m.get(`x/order/${oid}.json`).body);
  await env.STORE.put(`x/order/${oid}.json`, JSON.stringify({ ...o, status: 'new' }));
  await env.STORE.put(`x/pending/order/${oid}`, JSON.stringify({ at: 0 }));
  await S.recover(env, colAddr, NAMES);
  assert.equal(await bal(env, A), coins('0.8'));
  assert.deepEqual((await S.holdings(env, A)).items, [{ c: 'ex-time', id: 11, qty: 2, free: 2 }]);
  assert.equal((await S.stockOf(env, 'ex-time', 11)).sold, 2);
  assert.equal([...env.STORE.m.keys()].filter((x) => x.startsWith('x/pending/')).length, 0);
  // koin ditahan tanpa tercatat (proses mati) → dikembalikan cron
  await env.STORE.put('x/pending/hold/a-deadbeef', JSON.stringify({ lid: 'l-000000000000000000', wallet: A, micro: '300000', at: 0 }));
  await C.adjust(env, A, -300_000n, null, 'hold:a-deadbeef');
  await S.recover(env, colAddr, NAMES);
  assert.equal(await bal(env, A), coins('0.8'));
});

test('hadiah & berbagi: satu karya ke banyak wallet sekaligus, gratis tanpa fee, penerima bisa menjual atau WD', async () => {
  const env = mkEnv();
  await C.adjust(env, A, coins('1'));
  await S.buyExclusive(env, A, { c: 'ex-quran', id: 1, qty: 10, ref: ref() });
  const before = await bal(env, A);
  const friends = [B, D, '0x' + 'e5'.repeat(20)];
  // jumlah melebihi milik → ditolak sebelum apa pun berpindah
  assert.equal((await S.gift(env, A, { ref: ref(), items: friends.map((to) => ({ c: 'ex-quran', id: 1, amount: 4, to })) })).error, 'qty');
  assert.equal((await S.gift(env, A, { ref: ref(), items: [{ c: 'ex-quran', id: 1, amount: 1, to: A }] })).error, 'self');
  assert.equal((await S.gift(env, A, { ref: ref(), items: [{ c: 'ex-quran', id: 1, amount: 1, to: 'bukan-alamat' }] })).error, 'address');
  const gref = ref();
  let r = await S.gift(env, A, { ref: gref, note: 'Selamat Idulfitri', items: friends.map((to) => ({ c: 'ex-quran', id: 1, amount: 3, to })) });
  assert.equal(r.ok, true, JSON.stringify(r));
  r = await S.gift(env, A, { ref: gref, items: friends.map((to) => ({ c: 'ex-quran', id: 1, amount: 3, to })) });
  assert.equal(r.ok, true, 'ulang dengan ref sama tidak mengirim dua kali');
  assert.deepEqual((await S.holdings(env, A)).items, [{ c: 'ex-quran', id: 1, qty: 1, free: 1 }]);
  for (const f of friends) assert.deepEqual((await S.holdings(env, f)).items, [{ c: 'ex-quran', id: 1, qty: 3, free: 3 }]);
  assert.equal(await bal(env, A), before, 'hadiah tanpa biaya');
  assert.equal((await S.history(env, B)).giftsReceived.length, 1);
  assert.equal((await S.history(env, A)).giftsSent.length, 1);
  // penerima langsung bisa menjual di pasar member
  assert.equal((await S.createListing(env, B, { c: 'ex-quran', id: 1, qty: 2, mode: 'fixed', price: '1' })).ok, true);
});
