/**
 * Keranjang axto.io — pemilik, 24 Nov 2026:
 *   „member bisa masukan ke keranjang dulu, dan bisa beli masal, dan barang yg sudah masuk keranjang di beli duluan sama
 *    orang lain, langsung hilang otomatis" · „Bikin keranjang jg, biar member bisa masukin ke keranjang sebelum beli massal,
 *    begitu jg WD massal".
 *
 * Logika „sudah dibeli member lain":
 *   - Keranjang BUKAN pemesanan. Setiap kali dibuka (dan diperbarui otomatis di halaman), ketersediaan diperiksa ulang:
 *     barang yang habis/ditutup hilang dari keranjang, jumlah yang melebihi sisa dikurangi — member diberi tahu.
 *   - Barang baru DIPESAN saat checkout, satu per satu secara atomik (compare-and-swap R2). Yang gagal dipesan karena keduluan
 *     dikeluarkan; sisanya tetap diproses dan hanya itu yang ditagih.
 *   - Bayar koin AXTO: langsung selesai per barang. Bayar kripto: barang ditahan 60 menit dan baru diserahkan setelah
 *     pembayaran diterima; tidak dibayar → dilepas otomatis dan dikembalikan ke keranjang.
 *   - WD massal: daftar tarik dipilih dari koleksi di kustodi, diperiksa ulang terhadap jumlah bebas (yang sudah dijual,
 *     dilisting atau dihadiahkan hilang otomatis), lalu ditarik sekaligus — satu transaksi per koleksi, gas ditanggung axto.io.
 *
 * R2: cart/<wallet>.json {buy:[{t:'ex',c,id,qty}|{t:'mk',lid,qty}], wd:[{c,id,qty}], at}  (satu dokumen per member)
 */
import { readJSON, update, appendLog } from './r2.js';
import * as SHOP from './shop.js';
import * as COIN from './coin.js';
import * as PAY from './pay.js';
import { EXCLUSIVE_SUPPLY } from '../../engine/src/editions.js';

export const CART_MAX = 200;
const lw = (s) => String(s ?? '').toLowerCase();
const fail = (error, extra = {}) => ({ ok: false, error, ...extra });
const cartKey = (w) => `cart/${lw(w)}.json`;
const empty = () => ({ buy: [], wd: [], at: Date.now() });
const same = (a, b) => a.t === b.t && (a.t === 'mk' ? a.lid === b.lid : a.c === b.c && a.id === b.id);
const sameWd = (a, b) => a.c === b.c && a.id === b.id;
const okLid = (l) => typeof l === 'string' && /^[0-9a-z-]{6,60}$/.test(l);

/** Ubah isi keranjang: op add|set|remove|clear, list buy|wd. */
export async function edit(env, wallet, b) {
  const list = b?.list === 'wd' ? 'wd' : 'buy';
  const op = String(b?.op ?? 'add');
  const qty = Number(b?.qty ?? 1);
  let item;
  if (op !== 'clear') {
    if (list === 'buy' && b?.t === 'mk') {
      if (!okLid(b?.lid)) return fail('item');
      item = { t: 'mk', lid: b.lid, qty };
    } else {
      const c = String(b?.c ?? '');
      const id = Number(b?.id);
      if (!SHOP.isEx(c) || !SHOP.validId(c, id)) return fail('item');
      item = list === 'wd' ? { c, id, qty } : { t: 'ex', c, id, qty };
    }
    if (op !== 'remove' && (!Number.isSafeInteger(qty) || qty < 1 || qty > 10_000)) return fail('qty');
  }
  // tambah: hanya yang memang tersedia sekarang (habis / tidak bebas → ditolak dengan alasan)
  if (op === 'add' || op === 'set') {
    if (list === 'wd') {
      const h = await SHOP.holdings(env, wallet);
      if (!h.items.some((i) => i.c === item.c && i.id === item.id && i.free > 0)) return fail('not_free');
    } else if (item.t === 'mk') {
      const L = await SHOP.getListing(env, item.lid);
      if (!L || L.status !== 'open' || L.left < 1 || !(L.mode === 'fixed' || L.mode === 'fixed_offer')) return fail('closed');
      if (L.seller === lw(wallet)) return fail('own');
    } else if ((await SHOP.stockOf(env, item.c, item.id)).left < 1) return fail('sold_out');
  }
  const eq = list === 'wd' ? sameWd : same;
  let err = null;
  await update(env.STORE, cartKey(wallet), (cur) => {
    const x = cur ?? empty();
    let arr = [...(x[list] ?? [])];
    if (op === 'clear') arr = [];
    else if (op === 'remove') arr = arr.filter((y) => !eq(y, item));
    else {
      const i = arr.findIndex((y) => eq(y, item));
      if (i >= 0) arr[i] = { ...arr[i], qty: op === 'set' ? qty : arr[i].qty + qty };
      else if (arr.length >= CART_MAX) { err = 'cart_full'; return undefined; } else arr.push(item);
    }
    return { ...x, [list]: arr, at: Date.now() };
  });
  if (err) return fail(err, { max: CART_MAX });
  return view(env, wallet);
}

/**
 * Isi keranjang dengan ketersediaan terkini. Barang habis dihapus, jumlah berlebih dikurangi (disimpan kembali), dan
 * daftar `removed` memberi tahu member apa yang hilang karena keduluan member lain.
 */
export async function view(env, wallet) {
  const x = (await readJSON(env.STORE, cartKey(wallet))) ?? empty();
  const { priceCents } = await COIN.coinCfg(env);
  const ed = await SHOP.editionMicro(env);
  const removed = [];
  const buy = [];
  for (const it of x.buy ?? []) {
    if (it.t === 'mk') {
      const L = await SHOP.getListing(env, it.lid);
      const open = L && L.status === 'open' && Date.now() <= L.endsAt && (L.mode === 'fixed' || L.mode === 'fixed_offer') && L.left > 0;
      if (!open) { removed.push({ ...it, c: L?.c, id: L?.id, why: L?.status === 'sold' || L?.left === 0 ? 'sold' : 'closed' }); continue; }
      if (L.seller === lw(wallet)) { removed.push({ ...it, c: L.c, id: L.id, why: 'own' }); continue; }
      const qty = Math.min(it.qty, L.left);
      if (qty < it.qty) removed.push({ ...it, c: L.c, id: L.id, why: 'reduced', left: L.left });
      const micro = BigInt(L.priceMicro) * BigInt(qty);
      buy.push({ t: 'mk', lid: it.lid, c: L.c, id: L.id, qty, left: L.left, coins: COIN.fmtCoins(micro), usd: Number(COIN.centsForMicro(micro, priceCents)) / 100, micro: micro.toString() });
    } else {
      const st = await SHOP.stockOf(env, it.c, it.id);
      if (st.left <= 0) { removed.push({ ...it, why: 'sold' }); continue; }
      const qty = Math.min(it.qty, st.left);
      if (qty < it.qty) removed.push({ ...it, why: 'reduced', left: st.left });
      buy.push({ t: 'ex', c: it.c, id: it.id, qty, left: st.left, coins: COIN.fmtCoins(ed * BigInt(qty)), usd: qty, micro: (ed * BigInt(qty)).toString() });
    }
  }
  // daftar WD: dibandingkan dengan jumlah bebas di kustodi
  const h = await SHOP.holdings(env, wallet);
  const free = new Map(h.items.map((i) => [`${i.c}:${i.id}`, i.free]));
  const wd = [];
  for (const it of x.wd ?? []) {
    const f = free.get(`${it.c}:${it.id}`) ?? 0;
    if (f <= 0) { removed.push({ ...it, list: 'wd', why: 'not_free' }); continue; }
    const qty = Math.min(it.qty, f);
    if (qty < it.qty) removed.push({ ...it, list: 'wd', why: 'reduced', left: f });
    wd.push({ c: it.c, id: it.id, qty, free: f });
  }
  if (removed.length) {
    await update(env.STORE, cartKey(wallet), (cur) => (cur ? { ...cur, buy: buy.map(({ t, c, id, lid, qty }) => (t === 'mk' ? { t, lid, qty } : { t, c, id, qty })), wd: wd.map(({ c, id, qty }) => ({ c, id, qty })), at: Date.now() } : undefined));
  }
  const totalMicro = buy.reduce((a, i) => a + BigInt(i.micro), 0n);
  const totalUsd = buy.reduce((a, i) => a + i.usd, 0);
  return { ok: true, buy, wd, removed, total: { usd: Math.round(totalUsd * 100) / 100, coins: COIN.fmtCoins(totalMicro), items: buy.reduce((a, i) => a + i.qty, 0) }, wdItems: wd.reduce((a, i) => a + i.qty, 0) };
}

const okRef = (r) => typeof r === 'string' && /^[0-9a-z]{8,40}$/.test(r);

/** Hapus barang yang berhasil dibeli/dipesan dari keranjang. */
async function drop(env, wallet, done, list = 'buy') {
  if (!done.length) return;
  const eq = list === 'wd' ? sameWd : same;
  await update(env.STORE, cartKey(wallet), (cur) => (cur ? { ...cur, [list]: (cur[list] ?? []).filter((y) => !done.some((d) => eq(d, y))), at: Date.now() } : undefined));
}

/**
 * Checkout. pay: 'axto' (saldo koin AXTO, langsung) | 'crypto' ({coin, net} → pembayaran 60 menit).
 * ref dari klien membuat checkout idempoten (klik ganda / jaringan putus tidak membeli dua kali).
 */
export async function checkout(env, wallet, b) {
  if (!okRef(b?.ref)) return fail('ref');
  const v = await view(env, wallet);
  if (!v.buy.length) return fail('empty', { removed: v.removed });
  if (b?.pay === 'axto') {
    const results = [];
    for (const [i, it] of v.buy.entries()) {
      const ref = `${b.ref}-${i}`;
      const r = it.t === 'mk' ? await SHOP.buyListing(env, wallet, { lid: it.lid, qty: it.qty, ref }) : await SHOP.buyExclusive(env, wallet, { c: it.c, id: it.id, qty: it.qty, ref });
      results.push({ t: it.t, c: it.c, id: it.id, lid: it.lid, qty: it.qty, ok: r.ok, error: r.ok ? null : r.error });
    }
    await drop(env, wallet, results.filter((r) => r.ok));
    await appendLog(env.STORE, 'cart', { ev: 'checkout', pay: 'axto', wallet: lw(wallet), n: results.length, ok: results.filter((r) => r.ok).length });
    return { ok: results.some((r) => r.ok), pay: 'axto', results, removed: v.removed, ...(results.some((r) => r.ok) ? {} : { error: results[0]?.error ?? 'failed' }) };
  }
  if (b?.pay !== 'crypto') return fail('pay');
  const coin = String(b?.coin ?? '');
  const net = String(b?.net ?? '');
  if (!PAY.gatewayReady(env)) return fail('pay_off');
  // 1) pesan setiap barang; yang keduluan dikeluarkan
  const items = [];
  const dropped = [];
  for (const [i, it] of v.buy.entries()) {
    const ref = `${b.ref}-${i}`;
    if (it.t === 'mk') {
      const r = await SHOP.reserveListing(env, wallet, { lid: it.lid, qty: it.qty, ref });
      if (r.ok) items.push({ t: 'mk', lid: it.lid, c: it.c, id: it.id, qty: it.qty, sid: r.sid, usdCents: Math.round(it.usd * 100) });
      else dropped.push({ t: 'mk', lid: it.lid, c: it.c, id: it.id, qty: it.qty, why: r.error });
    } else {
      const r = await SHOP.reserveExclusive(env, wallet, { c: it.c, id: it.id, qty: it.qty, ref });
      if (r.ok) items.push({ t: 'ex', c: it.c, id: it.id, qty: it.qty, oid: r.oid, usdCents: it.qty * 100 });
      else dropped.push({ t: 'ex', c: it.c, id: it.id, qty: it.qty, why: r.error });
    }
  }
  if (!items.length) return fail('sold_out', { dropped, removed: v.removed });
  const usdCents = items.reduce((a, i) => a + i.usdCents, 0);
  // 2) pembayaran; gagal dibuat → semua pesanan dilepas lagi
  const r = await PAY.createIntent(env, wallet, { kind: 'cart', usdCents, coin, net, extra: { items, dropped } });
  if (!r.ok) {
    await releaseAll(env, items);
    return { ...r, dropped };
  }
  await drop(env, wallet, items);
  await appendLog(env.STORE, 'cart', { ev: 'checkout', pay: 'crypto', wallet: lw(wallet), intent: r.intent.id, n: items.length, usdCents });
  return { ok: true, pay: 'crypto', intent: r.intent, dropped, removed: v.removed };
}

async function releaseAll(env, items) {
  for (const it of items) {
    if (it.t === 'mk') await SHOP.releaseListing(env, it.lid, it.sid);
    else await SHOP.releaseExclusive(env, it.oid);
  }
}

/** WD massal dari daftar tarik: dikelompokkan per koleksi (satu voucher/transaksi per koleksi), gas oleh axto.io. */
export async function withdrawAll(env, wallet, b, colAddr, names) {
  if (!okRef(b?.ref)) return fail('ref');
  const v = await view(env, wallet);
  if (!v.wd.length) return fail('empty', { removed: v.removed });
  const r = await SHOP.withdraw(env, wallet, { ref: b.ref, items: v.wd.map((i) => ({ c: i.c, id: i.id, amount: i.qty })) }, colAddr, names);
  if (r.ok || r.vouchers?.some((x) => x.ok)) await drop(env, wallet, v.wd, 'wd');
  return { ...r, removed: v.removed };
}

// ---------------------------------------------------------------- penangan pembayaran keranjang (dipanggil pay.js)
/** Lunas: serahkan setiap barang. Barang yang keburu habis (bayar terlambat) → nilainya menjadi saldo koin AXTO. */
async function fulfil(env, x, now) {
  const out = [];
  let refundCents = 0;
  for (const it of x.items ?? []) {
    const r = it.t === 'mk' ? await SHOP.completeListingCrypto(env, it.lid, it.sid, x.id) : await SHOP.completeExclusiveCrypto(env, it.oid, x.id);
    out.push({ t: it.t, c: it.c, id: it.id, qty: it.qty, ok: r.ok });
    if (!r.ok) refundCents += it.usdCents;
  }
  let note = null;
  if (refundCents > 0) {
    await creditUsd(env, x, refundCents, 'cart_refund', now);
    note = 'refund_coins';
  }
  return { status: 'done', result: { items: out, refundUsd: refundCents / 100 }, note };
}

/** Kurang bayar sampai kedaluwarsa: pesanan dilepas, nilai yang diterima menjadi saldo koin AXTO. */
async function partial(env, x, now) {
  await releaseAll(env, x.items ?? []);
  const cents = Number((BigInt(x.usdCents) * BigInt(x.paid8)) / BigInt(x.units8));
  if (cents > 0) await creditUsd(env, x, cents, 'cart_underpaid', now);
  await restore(env, x);
  return { result: { creditedUsd: cents / 100 }, note: 'underpaid' };
}

async function expire(env, x) {
  await releaseAll(env, x.items ?? []);
  await restore(env, x);
}

/** Barang dari pembayaran yang tidak jadi dikembalikan ke keranjang (tanpa melebihi batas). */
async function restore(env, x) {
  await update(env.STORE, cartKey(x.wallet), (cur) => {
    const c = cur ?? empty();
    const buy = [...(c.buy ?? [])];
    for (const it of x.items ?? []) {
      const item = it.t === 'mk' ? { t: 'mk', lid: it.lid, qty: it.qty } : { t: 'ex', c: it.c, id: it.id, qty: Math.min(it.qty, EXCLUSIVE_SUPPLY) };
      if (!buy.some((y) => same(y, item)) && buy.length < CART_MAX) buy.push(item);
    }
    return { ...c, buy, at: Date.now() };
  });
}

async function creditUsd(env, x, cents, ev, now) {
  const { priceCents } = await COIN.coinCfg(env);
  const micro = COIN.microForCents(cents, priceCents);
  await COIN.creditPaid(env, x.wallet, micro, `pay:${x.id}:${ev}`, { ev, intent: x.id, usdCents: cents, coin: x.coin, at: now });
}

PAY.registerHandler('cart', { fulfil, partial, expire });
