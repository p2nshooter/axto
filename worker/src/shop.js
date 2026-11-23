/**
 * Toko eksklusif axto.io + Pasar member + WD — desain akhir pemilik 23 Nov 2026:
 *   „NFT exclusive harganya tetap aja $1, untuk auction itu fasilitas untuk member, bisa auction, bisa penawaran, bisa harga
 *    tetap dan penawaran. Supply 10 setiap NFT, member bisa WD satuan … bisa juga WD masal untuk menghemat gas fee.
 *    Ini untuk mendukung perputaran coin axto."
 *   „Member yg … sudah di WD ke walletnya jg tidak bisa lagi menjual ke marketplace axto.io, tp riwayat dan NFT nya tetep
 *    tampil di portal member nya … beritahukan untuk melakukan penjualan di marketplace opensea dll".
 *
 * Tiga pasar terpisah:
 *   1. Toko eksklusif axto.io — 5 koleksi × 10.000 karya × 10 edisi, harga tetap $1/edisi, dibayar koin AXTO (saldo kustodi
 *      NOWPayments di coin.js). Pendapatan → catatan x/rev/.
 *   2. Pasar member — member menjual edisi miliknya: harga tetap, lelang, penawaran, atau harga tetap + penawaran. Dibayar
 *      koin AXTO antar member; fee situs 10% (penjual menerima 90%). Tawaran & penawaran menahan koin (escrow) dan
 *      dikembalikan otomatis bila disalip / ditolak / listing ditutup.
 *   3. OpenSea — koleksi publik (market/opensea-list.mjs), hanya ditampilkan; pembelian di OpenSea.
 *
 * WD: edisi keluar dari kustodi axto.io (satuan atau massal, satu voucher per koleksi = satu transaksi) → vault menandatangani
 * voucher AxtoEditions.mintWithVoucher → member mengirim transaksi dari wallet-nya (gas dibayar member). Sejak voucher terbit,
 * edisi itu TIDAK lagi di database axto.io dan tidak bisa dijual di pasar member; riwayatnya tetap tampil di portal.
 *
 * Penyimpanan: R2 saja (aturan pemilik). Setiap langkah idempoten (ref) sehingga operasi yang terputus bisa diulang
 * tanpa debit/kredit ganda; x/pending/ dipungut cron (recover). Tanpa hot key: satu dokumen per karya, per member-karya,
 * per listing.
 *
 * Kunci R2 (bucket STORE):
 *   x/stock/<c>/<id>.json         {sold, orders:{oid:q}}                         meta {sold}
 *   x/own/<w>/<c>/<id>.json       {qty, locked:{lid:q}, refs:[]}                 meta {qty, free}
 *   x/gone/<w>/<c>/<id>.json      {qty, wd:[{ref, n, at}]}                       riwayat WD (tidak lagi di database)
 *   x/order/<oid>.json            pembelian toko {wallet, c, id, qty, micro, status}
 *   x/mkt/<lid>.json              listing pasar member
 *   x/open/<lid>                  indeks listing terbuka                         meta {c, id, mode, price, ends, qty, seller}
 *   x/wd/<ref>.json               WD {wallet, c, items, voucher, status}
 *   x/by/<w>/<kind>/<id>          indeks riwayat member (o = beli toko, l = listing, t = transaksi pasar, w = WD)
 *   x/rev/<hari>/<id>             pendapatan perusahaan (meta {micro, kind})
 *   x/pending/<kind>/<id>         pekerjaan yang belum selesai (dipungut cron)
 */
import { readJSON, putJSON, appendLog, listKeys, createOnce, casMeta } from './r2.js';
import * as COIN from './coin.js';
import { COLLECTIONS } from '../../engine/src/core.js';
import { EXCLUSIVE_SUPPLY, EXCLUSIVE_PRICE_USD } from '../../engine/src/editions.js';
import { vault } from './vault.js';

export const EX_KEYS = Object.keys(COLLECTIONS).filter((c) => COLLECTIONS[c].exclusive);
export const FEE_PCT = 10n; // fee situs pasar member
export const MODES = ['fixed', 'auction', 'offer', 'fixed_offer'];
export const MIN_STEP_PCT = 5n; // kenaikan tawaran lelang minimum
const EXTEND_MS = 5 * 60_000; // tawaran di 5 menit terakhir memperpanjang lelang 5 menit
const MAX_DAYS = 14;
const MIN_MICRO = 10_000n; // 0,01 AXTO
const WD_MAX_ITEMS = 50; // per voucher (vault)

const lw = (w) => String(w).toLowerCase();
const isEx = (c) => EX_KEYS.includes(c);
const validId = (c, id) => Number.isSafeInteger(id) && id >= 1 && id <= (COLLECTIONS[c]?.max ?? 0);
const rid = () => [...crypto.getRandomValues(new Uint8Array(9))].map((x) => x.toString(16).padStart(2, '0')).join('');
const okRef = (r) => typeof r === 'string' && /^[0-9a-z-]{8,40}$/.test(r);
const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const fail = (error, extra = {}) => ({ ok: false, error, ...extra });

const stockKey = (c, id) => `x/stock/${c}/${id}.json`;
const ownKey = (w, c, id) => `x/own/${lw(w)}/${c}/${id}.json`;
const goneKey = (w, c, id) => `x/gone/${lw(w)}/${c}/${id}.json`;
const sumLocked = (o) => Object.values(o?.locked ?? {}).reduce((a, b) => a + b, 0);
const ownMeta = (o) => ({ qty: String(o.qty), free: String(o.qty - sumLocked(o)) });

/** Harga satu edisi eksklusif dalam mikro-AXTO pada harga koin saat ini ($1 = 0,1 AXTO pada $10/AXTO). */
export async function editionMicro(env) {
  const { priceCents } = await COIN.coinCfg(env);
  return COIN.microForCents(EXCLUSIVE_PRICE_USD * 100, priceCents);
}

// ---------------------------------------------------------------- kepemilikan (kustodi)
/** Tambah/kurangi edisi milik member secara idempoten (ref). Kurang dari yang bebas → error 'qty'. */
async function moveOwn(env, w, c, id, delta, ref, { lock, unlock } = {}) {
  return casMeta(env.STORE, ownKey(w, c, id), (cur) => {
    const o = cur ?? { qty: 0, locked: {}, refs: [] };
    if (ref && o.refs.includes(ref)) return undefined;
    const locked = { ...o.locked };
    if (unlock) { if (!(unlock in locked)) throw new Error('lock'); delete locked[unlock]; }
    const qty = o.qty + delta;
    const free = qty - Object.values(locked).reduce((a, b) => a + b, 0) - (lock ? lock[1] : 0);
    if (qty < 0 || free < 0) throw new Error('qty');
    if (lock) locked[lock[0]] = lock[1];
    return { qty, locked, refs: [...o.refs, ...(ref ? [ref] : [])].slice(-200), at: Date.now() };
  }, ownMeta);
}

/** Edisi yang dipegang member di kustodi axto.io + riwayat yang sudah ditarik (WD) ke wallet. */
export async function holdings(env, w) {
  const items = [];
  for (const o of await listKeys(env.STORE, `x/own/${lw(w)}/`, 5000)) {
    const [, , , c, f] = o.key.split('/');
    const qty = Number(o.customMetadata?.qty ?? 0);
    if (qty > 0) items.push({ c, id: Number(f.replace('.json', '')), qty, free: Number(o.customMetadata?.free ?? qty) });
  }
  const gone = [];
  for (const o of await listKeys(env.STORE, `x/gone/${lw(w)}/`, 5000)) {
    const g = await readJSON(env.STORE, o.key);
    const [, , , c, f] = o.key.split('/');
    if (g) gone.push({ c, id: Number(f.replace('.json', '')), qty: g.qty, wd: g.wd.slice(-5) });
  }
  return { items, gone };
}

// ---------------------------------------------------------------- 1. toko eksklusif axto.io ($1 / edisi, koin AXTO)
export async function stockOf(env, c, id) {
  const s = await readJSON(env.STORE, stockKey(c, id));
  return { supply: EXCLUSIVE_SUPPLY, sold: s?.sold ?? 0, left: EXCLUSIVE_SUPPLY - (s?.sold ?? 0) };
}

/** Peta karya → terjual untuk satu koleksi (dari customMetadata; satu daftar prefix, di-cache pemanggil). */
export async function soldMap(env, c) {
  const out = {};
  for (const o of await listKeys(env.STORE, `x/stock/${c}/`, 20_000)) {
    const n = Number(o.customMetadata?.sold ?? 0);
    if (n > 0) out[o.key.split('/')[3].replace('.json', '')] = n;
  }
  return out;
}

export async function buyExclusive(env, wallet, b) {
  const c = String(b?.c ?? '');
  const id = Number(b?.id);
  const qty = Number(b?.qty ?? 1);
  if (!isEx(c) || !validId(c, id)) return fail('item');
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > EXCLUSIVE_SUPPLY) return fail('qty');
  if (!okRef(b?.ref)) return fail('ref');
  const oid = `s-${(await sha(`${lw(wallet)}:${b.ref}`)).slice(0, 24)}`;
  const micro = (await editionMicro(env)) * BigInt(qty);
  const order = { oid, wallet: lw(wallet), c, id, qty, micro: micro.toString(), usd: qty * EXCLUSIVE_PRICE_USD, status: 'new', at: Date.now() };
  if (await createOnce(env.STORE, `x/order/${oid}.json`, order)) await putJSON(env.STORE, `x/pending/order/${oid}`, { at: Date.now() });
  return completeOrder(env, oid);
}

/** Jalankan (atau lanjutkan) pembelian toko: stok → debit koin → kustodi member. Tiap langkah idempoten. */
export async function completeOrder(env, oid) {
  const key = `x/order/${oid}.json`;
  const o = await readJSON(env.STORE, key);
  if (!o) return fail('not_found');
  if (o.status !== 'new') return { ok: o.status === 'done', order: o, ...(o.status === 'done' ? {} : { error: o.error }) };
  const finish = async (status, error) => {
    const done = { ...o, status, ...(error ? { error } : {}), doneAt: Date.now() };
    await putJSON(env.STORE, key, done);
    await env.STORE.delete(`x/pending/order/${oid}`);
    await putJSON(env.STORE, `x/by/${o.wallet}/o/${oid}`, { oid }, { c: o.c, id: String(o.id), qty: String(o.qty), micro: o.micro, status, at: String(o.at) });
    return { ok: status === 'done', order: done, ...(error ? { error } : {}) };
  };
  // 1) stok: maksimal 10 edisi per karya, tidak pernah terjual lebih
  try {
    await casMeta(env.STORE, stockKey(o.c, o.id), (cur) => {
      const s = cur ?? { sold: 0, orders: {} };
      if (s.orders[oid]) return undefined;
      if (s.sold + o.qty > EXCLUSIVE_SUPPLY) throw new Error('sold_out');
      return { sold: s.sold + o.qty, orders: { ...s.orders, [oid]: o.qty } };
    }, (s) => ({ sold: String(s.sold) }));
  } catch (e) {
    if (e.message === 'sold_out') return finish('failed', 'sold_out');
    throw e;
  }
  // 2) debit koin AXTO pembeli
  try {
    await COIN.adjust(env, o.wallet, -BigInt(o.micro), { ev: 'nft_buy', order: oid, c: o.c, id: o.id, qty: o.qty }, `buy:${oid}`);
  } catch (e) {
    if (e.message !== 'balance') throw e;
    await casMeta(env.STORE, stockKey(o.c, o.id), (cur) => {
      if (!cur?.orders[oid]) return undefined;
      const orders = { ...cur.orders };
      delete orders[oid];
      return { sold: cur.sold - o.qty, orders };
    }, (s) => ({ sold: String(s.sold) }));
    return finish('failed', 'balance');
  }
  // 3) edisi masuk kustodi member + pendapatan perusahaan
  await moveOwn(env, o.wallet, o.c, o.id, o.qty, `buy:${oid}`);
  await putJSON(env.STORE, `x/rev/${day(o.at)}/${oid}`, { oid }, { micro: o.micro, kind: 'shop' });
  await appendLog(env.STORE, 'shop', { oid, wallet: o.wallet, c: o.c, id: o.id, qty: o.qty, micro: o.micro });
  return finish('done');
}

// ---------------------------------------------------------------- 2. pasar member (koin AXTO, fee 10%)
const lkey = (lid) => `x/mkt/${lid}.json`;
const openMeta = (L) => ({ c: L.c, id: String(L.id), mode: L.mode, price: String(L.mode === 'auction' ? (L.top?.micro ?? L.startMicro) : (L.priceMicro ?? L.minMicro ?? '0')), ends: String(L.endsAt ?? 0), qty: String(L.left), seller: L.seller });
export const publicListing = (L) => ({
  lid: L.lid, c: L.c, id: L.id, mode: L.mode, qty: L.qty, left: L.left, seller: `${L.seller.slice(0, 6)}…${L.seller.slice(-4)}`, status: L.status,
  price: L.priceMicro ? COIN.fmtCoins(L.priceMicro) : null, start: L.startMicro ? COIN.fmtCoins(L.startMicro) : null, min: L.minMicro ? COIN.fmtCoins(L.minMicro) : null,
  top: L.top ? { micro: COIN.fmtCoins(L.top.micro), by: `${L.top.by.slice(0, 6)}…${L.top.by.slice(-4)}`, at: L.top.at } : null, bids: L.bids?.length ?? 0,
  offers: (L.offers ?? []).filter((x) => x.status === 'open').map((x) => ({ oid: x.oid, micro: COIN.fmtCoins(x.micro), qty: x.qty, by: `${x.by.slice(0, 6)}…${x.by.slice(-4)}`, at: x.at })),
  endsAt: L.endsAt ?? null, at: L.at,
});

export async function createListing(env, wallet, b) {
  const c = String(b?.c ?? '');
  const id = Number(b?.id);
  const qty = Number(b?.qty ?? 1);
  const mode = String(b?.mode ?? '');
  if (!isEx(c) || !validId(c, id)) return fail('item');
  if (!MODES.includes(mode)) return fail('mode');
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > EXCLUSIVE_SUPPLY) return fail('qty');
  const coins = (v) => { try { return v == null || v === '' ? null : COIN.parseCoins(String(v)); } catch { return -1n; } };
  const price = coins(b.price);
  const start = coins(b.start);
  const min = coins(b.min);
  if (price === -1n || start === -1n || min === -1n) return fail('price');
  if ((mode === 'fixed' || mode === 'fixed_offer') && !(price >= MIN_MICRO)) return fail('price');
  if (mode === 'auction' && !(start >= MIN_MICRO)) return fail('price');
  const days = Number(b.days ?? 7);
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) return fail('days');
  const lid = `l-${rid()}`;
  const now = Date.now();
  // urutan aman: listing (status pending) → kunci edisi → buka. Terputus → cron: kunci ada = buka, tidak ada = gagal.
  const L = { lid, seller: lw(wallet), c, id, qty, left: qty, mode, status: 'pending', priceMicro: mode === 'fixed' || mode === 'fixed_offer' ? price.toString() : null, startMicro: mode === 'auction' ? start.toString() : null, minMicro: mode === 'offer' && min ? min.toString() : null, endsAt: now + days * 86_400_000, top: null, bids: [], offers: [], sales: [], at: now };
  await putJSON(env.STORE, lkey(lid), L);
  await putJSON(env.STORE, `x/pending/list/${lid}`, { at: now });
  try { await moveOwn(env, wallet, c, id, 0, `list:${lid}`, { lock: [lid, qty] }); } catch (e) {
    if (e.message !== 'qty') throw e;
    await putJSON(env.STORE, lkey(lid), { ...L, status: 'failed' });
    await env.STORE.delete(`x/pending/list/${lid}`);
    return fail('qty');
  }
  return openPending(env, lid);
}

async function openPending(env, lid) {
  const L0 = await getListing(env, lid);
  if (!L0) return fail('not_found');
  if (L0.status === 'pending') {
    const own = await readJSON(env.STORE, ownKey(L0.seller, L0.c, L0.id));
    const locked = own?.locked?.[lid] === L0.qty;
    await editListing(env, lid, (x) => (x.status === 'pending' ? { ...x, status: locked ? 'open' : 'failed' } : undefined));
  }
  const L = await getListing(env, lid);
  await env.STORE.delete(`x/pending/list/${lid}`);
  if (L.status !== 'open') return fail('qty');
  const { c, id, mode } = L;
  await putJSON(env.STORE, `x/open/${lid}`, { lid }, openMeta(L));
  await putJSON(env.STORE, `x/by/${L.seller}/l/${lid}`, { lid }, { c, id: String(id), mode, at: String(L.at) });
  await appendLog(env.STORE, 'market', { ev: 'list', lid, seller: L.seller, c, id, qty: L.qty, mode });
  return { ok: true, listing: publicListing(L) };
}

/** Listing terbuka (opsional saring koleksi & mode), urut: segera berakhir / harga terendah / terbaru. */
export async function openListings(env, { c, mode, sort = 'new', limit = 120 } = {}) {
  const rows = [];
  for (const o of await listKeys(env.STORE, 'x/open/', 20_000)) {
    const m = o.customMetadata ?? {};
    if ((c && m.c !== c) || (mode && m.mode !== mode)) continue;
    rows.push({ lid: o.key.slice(7), c: m.c, id: Number(m.id), mode: m.mode, price: COIN.fmtCoins(m.price ?? '0'), priceMicro: m.price ?? '0', ends: Number(m.ends), qty: Number(m.qty), seller: m.seller ? `${m.seller.slice(0, 6)}…${m.seller.slice(-4)}` : '' });
  }
  const by = { ending: (a, b) => a.ends - b.ends, low: (a, b) => (BigInt(a.priceMicro) < BigInt(b.priceMicro) ? -1 : 1), high: (a, b) => (BigInt(a.priceMicro) > BigInt(b.priceMicro) ? -1 : 1), new: (a, b) => b.ends - a.ends };
  rows.sort(by[sort] ?? by.new);
  return { total: rows.length, rows: rows.slice(0, limit) };
}

export async function getListing(env, lid) {
  if (!/^l-[0-9a-f]{18}$/.test(String(lid))) return null;
  return readJSON(env.STORE, lkey(lid));
}

/** Ubah listing dengan CAS; fn(L) → L baru atau melempar error kode. */
const editListing = (env, lid, fn) => casMeta(env.STORE, lkey(lid), (cur) => { if (!cur) throw new Error('not_found'); return fn(cur); });

async function refreshOpen(env, L) {
  if (L.status === 'open' && L.left > 0) await putJSON(env.STORE, `x/open/${L.lid}`, { lid: L.lid }, openMeta(L));
  else await env.STORE.delete(`x/open/${L.lid}`);
}

/** Serahkan q edisi dari penjual ke pembeli + bayar penjual 90% / fee 10%. Idempoten per sid. */
async function deliver(env, L, sid, buyer, q, micro) {
  // penjual: kunci listing dan jumlah edisi turun bersama dalam SATU CAS (tidak ada celah edisi „bebas" sesaat)
  await casMeta(env.STORE, ownKey(L.seller, L.c, L.id), (cur) => {
    const o = cur ?? { qty: 0, locked: {}, refs: [] };
    if (o.refs.includes(`sell:${sid}`)) return undefined;
    const locked = { ...o.locked };
    const n = (locked[L.lid] ?? 0) - q;
    if (n < 0 || o.qty < q) throw new Error('lock');
    if (n > 0) locked[L.lid] = n; else delete locked[L.lid];
    return { qty: o.qty - q, locked, refs: [...o.refs, `sell:${sid}`].slice(-200), at: Date.now() };
  }, ownMeta);
  await moveOwn(env, buyer, L.c, L.id, q, `get:${sid}`);
  const fee = (BigInt(micro) * FEE_PCT) / 100n;
  await COIN.adjust(env, L.seller, BigInt(micro) - fee, { ev: 'market_sale', lid: L.lid, sid, c: L.c, id: L.id, qty: q }, `pay:${sid}`);
  await putJSON(env.STORE, `x/rev/${day()}/${sid}`, { sid, lid: L.lid }, { micro: fee.toString(), kind: 'fee' });
  for (const w of [L.seller, buyer]) await putJSON(env.STORE, `x/by/${lw(w)}/t/${sid}`, { sid, lid: L.lid }, { c: L.c, id: String(L.id), qty: String(q), micro: String(micro), side: lw(w) === L.seller ? 'sell' : 'buy', at: String(Date.now()) });
  await appendLog(env.STORE, 'market', { ev: 'sale', lid: L.lid, sid, seller: L.seller, buyer: lw(buyer), qty: q, micro: String(micro), fee: fee.toString() });
}

/** Tahan koin untuk tawaran/penawaran. Penanda x/pending/hold/<id> ditulis sebelum debit. false = saldo kurang. */
async function hold(env, wallet, micro, lid, id, ev) {
  await putJSON(env.STORE, `x/pending/hold/${id}`, { lid, wallet: lw(wallet), micro: micro.toString(), at: Date.now() });
  try {
    await COIN.adjust(env, wallet, -micro, { ev, lid, id }, `hold:${id}`);
    return true;
  } catch (e) {
    await env.STORE.delete(`x/pending/hold/${id}`);
    if (e.message === 'balance') return false;
    throw e;
  }
}

/** Kembalikan koin yang ditahan tetapi tidak pernah tercatat di listing (ditolak / terputus). */
async function unhold(env, wallet, micro, lid, id) {
  await COIN.adjust(env, wallet, BigInt(micro), { ev: 'hold_return', lid, id }, `rel:${id}`);
  await env.STORE.delete(`x/pending/hold/${id}`);
}

/**
 * Kembalikan koin yang ditahan (tawaran lelang yang kalah/disalip, penawaran yang ditolak/ditarik/dikembalikan).
 * Urutan aman: status final dicatat DULU di listing (tidak bisa lagi diterima), lalu koin dikembalikan (ref idempoten),
 * lalu ditandai released. Terputus di tengah → x/pending/rel/<lid> dipungut cron dan diulang tanpa kembali ganda.
 */
async function releaseFunds(env, lid) {
  await putJSON(env.STORE, `x/pending/rel/${lid}`, { lid, at: Date.now() });
  const L = await getListing(env, lid);
  const winner = L.sales.find((s) => s.sid.startsWith('w-'))?.sid.slice(2);
  const bids = L.bids.filter((x) => !x.released && x.bid !== L.top?.bid && x.bid.slice(2) !== winner);
  const offers = L.offers.filter((x) => !x.released && ['withdrawn', 'declined', 'returned'].includes(x.status));
  for (const x of bids) await COIN.adjust(env, x.by, BigInt(x.micro), { ev: 'bid_release', lid, bid: x.bid }, `rel:${x.bid}`);
  for (const x of offers) await COIN.adjust(env, x.by, BigInt(x.micro), { ev: 'offer_release', lid, offer: x.oid }, `rel:${x.oid}`);
  if (bids.length || offers.length) {
    const b = new Set(bids.map((x) => x.bid));
    const f = new Set(offers.map((x) => x.oid));
    await editListing(env, lid, (x) => ({ ...x, bids: x.bids.map((y) => (b.has(y.bid) ? { ...y, released: true } : y)), offers: x.offers.map((y) => (f.has(y.oid) ? { ...y, released: true } : y)) }));
  }
  await env.STORE.delete(`x/pending/rel/${lid}`);
}

/** Beli langsung (harga tetap / harga tetap + penawaran). */
export async function buyListing(env, wallet, b) {
  const L0 = await getListing(env, b?.lid);
  const q = Number(b?.qty ?? 1);
  if (!L0) return fail('not_found');
  if (!okRef(b?.ref)) return fail('ref');
  if (!(L0.mode === 'fixed' || L0.mode === 'fixed_offer')) return fail('mode');
  if (lw(wallet) === L0.seller) return fail('own');
  if (!Number.isSafeInteger(q) || q < 1) return fail('qty');
  const sid = `b-${(await sha(`${lw(wallet)}:${b.ref}`)).slice(0, 24)}`;
  const micro = BigInt(L0.priceMicro) * BigInt(q);
  // 1) pesan edisi di listing
  let L;
  try {
    L = await editListing(env, L0.lid, (x) => {
      if (x.sales.some((s) => s.sid === sid)) return undefined;
      if (x.status !== 'open' || Date.now() > x.endsAt) throw new Error('closed');
      if (x.left < q) throw new Error('qty');
      return { ...x, left: x.left - q, sales: [...x.sales, { sid, buyer: lw(wallet), qty: q, micro: micro.toString(), status: 'new', at: Date.now() }] };
    });
  } catch (e) { if (['closed', 'qty'].includes(e.message)) return fail(e.message); throw e; }
  await putJSON(env.STORE, `x/pending/sale/${sid}`, { lid: L.lid });
  return completeSale(env, L.lid, sid);
}

/** Lanjutkan penjualan pasar: debit pembeli → serah edisi → bayar penjual. Gagal saldo → batalkan pesanan. */
export async function completeSale(env, lid, sid) {
  let L = await getListing(env, lid);
  const s = L?.sales.find((x) => x.sid === sid);
  if (!s) { await env.STORE.delete(`x/pending/sale/${sid}`); return fail('not_found'); }
  if (s.status === 'done') { await env.STORE.delete(`x/pending/sale/${sid}`); return { ok: true, listing: publicListing(L) }; }
  if (s.status === 'failed') { await env.STORE.delete(`x/pending/sale/${sid}`); return fail(s.error ?? 'failed'); }
  const setSale = (status, error) => editListing(env, lid, (x) => {
    const sales = x.sales.map((y) => (y.sid === sid ? { ...y, status, ...(error ? { error } : {}) } : y));
    const left = status === 'failed' ? x.left + s.qty : x.left;
    return { ...x, sales, left, status: x.status === 'open' && left === 0 && status === 'done' ? 'sold' : x.status };
  });
  if (!s.escrow) {
    try {
      await COIN.adjust(env, s.buyer, -BigInt(s.micro), { ev: 'market_buy', lid, sid }, `buy:${sid}`);
    } catch (e) {
      if (e.message !== 'balance') throw e;
      L = await setSale('failed', 'balance');
      await refreshOpen(env, L);
      await env.STORE.delete(`x/pending/sale/${sid}`);
      return fail('balance');
    }
  }
  await deliver(env, L, sid, s.buyer, s.qty, s.micro);
  L = await setSale('done');
  if (L.status === 'sold') await closeListing(env, L.lid, 'sold');
  else await refreshOpen(env, L);
  await env.STORE.delete(`x/pending/sale/${sid}`);
  return { ok: true, listing: publicListing(L) };
}

/** Tawaran lelang: koin ditahan (escrow); penawar sebelumnya dikembalikan otomatis. */
export async function bid(env, wallet, b) {
  const L0 = await getListing(env, b?.lid);
  if (!L0) return fail('not_found');
  if (L0.mode !== 'auction') return fail('mode');
  if (lw(wallet) === L0.seller) return fail('own');
  let micro;
  try { micro = COIN.parseCoins(String(b?.amount ?? '')); } catch { return fail('price'); }
  const need = L0.top ? (BigInt(L0.top.micro) * (100n + MIN_STEP_PCT) + 99n) / 100n : BigInt(L0.startMicro);
  if (micro < need) return fail('low', { min: COIN.fmtCoins(need) });
  const bidId = `a-${rid()}`;
  if (!(await hold(env, wallet, micro, L0.lid, bidId, 'bid_hold'))) return fail('balance');
  let prev = null;
  let L;
  try {
    L = await editListing(env, L0.lid, (x) => {
      if (x.status !== 'open' || Date.now() > x.endsAt) throw new Error('closed');
      const min = x.top ? (BigInt(x.top.micro) * (100n + MIN_STEP_PCT) + 99n) / 100n : BigInt(x.startMicro);
      if (micro < min) throw new Error('low');
      prev = x.top;
      const endsAt = x.endsAt - Date.now() < EXTEND_MS ? Date.now() + EXTEND_MS : x.endsAt;
      return { ...x, top: { bid: bidId, by: lw(wallet), micro: micro.toString(), at: Date.now() }, bids: [...x.bids, { bid: bidId, by: lw(wallet), micro: micro.toString(), at: Date.now() }].slice(-200), endsAt };
    });
  } catch (e) {
    await unhold(env, wallet, micro, L0.lid, bidId);
    if (['closed', 'low'].includes(e.message)) return fail(e.message);
    throw e;
  }
  await env.STORE.delete(`x/pending/hold/${bidId}`);
  if (prev) await releaseFunds(env, L.lid);
  await refreshOpen(env, L);
  return { ok: true, listing: publicListing(L) };
}

/** Penawaran (mode offer / fixed_offer): koin ditahan sampai diterima, ditolak, ditarik, atau listing ditutup. */
export async function makeOffer(env, wallet, b) {
  const L0 = await getListing(env, b?.lid);
  if (!L0) return fail('not_found');
  if (!(L0.mode === 'offer' || L0.mode === 'fixed_offer')) return fail('mode');
  if (lw(wallet) === L0.seller) return fail('own');
  const q = Number(b?.qty ?? 1);
  if (!Number.isSafeInteger(q) || q < 1 || q > L0.left) return fail('qty');
  let each;
  try { each = COIN.parseCoins(String(b?.amount ?? '')); } catch { return fail('price'); }
  if (each < MIN_MICRO || (L0.minMicro && each < BigInt(L0.minMicro))) return fail('low', { min: COIN.fmtCoins(L0.minMicro ?? MIN_MICRO) });
  const micro = each * BigInt(q);
  const oid = `f-${rid()}`;
  if (!(await hold(env, wallet, micro, L0.lid, oid, 'offer_hold'))) return fail('balance');
  try {
    const L = await editListing(env, L0.lid, (x) => {
      if (x.status !== 'open' || Date.now() > x.endsAt) throw new Error('closed');
      return { ...x, offers: [...x.offers, { oid, by: lw(wallet), qty: q, micro: micro.toString(), status: 'open', at: Date.now() }] };
    });
    await env.STORE.delete(`x/pending/hold/${oid}`);
    return { ok: true, listing: publicListing(L) };
  } catch (e) {
    await unhold(env, wallet, micro, L0.lid, oid);
    if (e.message === 'closed') return fail('closed');
    throw e;
  }
}

/** Penjual menerima penawaran → edisi berpindah (koin sudah ditahan), penjual dibayar 90%. */
export async function acceptOffer(env, wallet, b) {
  const L0 = await getListing(env, b?.lid);
  if (!L0) return fail('not_found');
  if (lw(wallet) !== L0.seller) return fail('not_seller');
  const sid = `o-${String(b?.oid ?? '').slice(2, 20)}`;
  let L;
  try {
    L = await editListing(env, L0.lid, (x) => {
      const f = x.offers.find((y) => y.oid === b.oid);
      if (!f) throw new Error('not_found');
      if (f.status === 'accepted') return undefined;
      if (f.status !== 'open' || x.status !== 'open') throw new Error('closed');
      if (x.left < f.qty) throw new Error('qty');
      return { ...x, left: x.left - f.qty, offers: x.offers.map((y) => (y.oid === f.oid ? { ...y, status: 'accepted' } : y)), sales: [...x.sales, { sid, buyer: f.by, qty: f.qty, micro: f.micro, escrow: true, status: 'new', at: Date.now() }] };
    });
  } catch (e) { if (['not_found', 'closed', 'qty'].includes(e.message)) return fail(e.message); throw e; }
  await putJSON(env.STORE, `x/pending/sale/${sid}`, { lid: L.lid });
  return completeSale(env, L.lid, sid);
}

/** Penawar menarik penawarannya / penjual menolak → koin dikembalikan. */
export async function dropOffer(env, wallet, b) {
  const L0 = await getListing(env, b?.lid);
  if (!L0) return fail('not_found');
  let f;
  try {
    await editListing(env, L0.lid, (x) => {
      f = x.offers.find((y) => y.oid === b?.oid);
      if (!f) throw new Error('not_found');
      if (f.status !== 'open') return undefined;
      if (lw(wallet) !== f.by && lw(wallet) !== x.seller) throw new Error('forbidden');
      return { ...x, offers: x.offers.map((y) => (y.oid === f.oid ? { ...y, status: lw(wallet) === f.by ? 'withdrawn' : 'declined' } : y)) };
    });
  } catch (e) { if (['not_found', 'forbidden'].includes(e.message)) return fail(e.message); throw e; }
  await releaseFunds(env, L0.lid);
  return { ok: true };
}

/** Penjual menutup listing (lelang hanya bila belum ada tawaran). Sisa edisi kembali bebas; penawaran dikembalikan. */
export async function cancelListing(env, wallet, b) {
  const L0 = await getListing(env, b?.lid);
  if (!L0) return fail('not_found');
  if (lw(wallet) !== L0.seller) return fail('not_seller');
  if (L0.mode === 'auction' && L0.top) return fail('has_bids');
  return closeListing(env, L0.lid, 'cancelled');
}

/** Tutup listing: kembalikan semua penawaran terbuka, lepas kunci sisa edisi, hapus dari indeks terbuka. Idempoten. */
async function closeListing(env, lid, status) {
  const L = await editListing(env, lid, (x) => (x.closed ? undefined : { ...x, status: x.status === 'sold' ? 'sold' : status, closed: Date.now(), offers: x.offers.map((y) => (y.status === 'open' ? { ...y, status: 'returned' } : y)) }));
  await releaseFunds(env, lid);
  await casMeta(env.STORE, ownKey(L.seller, L.c, L.id), (cur) => {
    if (!cur || !(lid in (cur.locked ?? {}))) return undefined;
    const locked = { ...cur.locked };
    delete locked[lid];
    return { ...cur, locked, at: Date.now() };
  }, ownMeta);
  await env.STORE.delete(`x/open/${lid}`);
  await appendLog(env.STORE, 'market', { ev: 'close', lid, status: L.status });
  return { ok: true, listing: publicListing(L) };
}

/** Cron: lelang yang berakhir diselesaikan (pemenang = tawaran tertinggi), listing kedaluwarsa ditutup. */
export async function settleDue(env, now = Date.now(), max = 50) {
  let n = 0;
  for (const o of await listKeys(env.STORE, 'x/open/', 20_000)) {
    if (n >= max) break;
    if (Number(o.customMetadata?.ends ?? 0) > now) continue;
    const lid = o.key.slice(7);
    const L = await getListing(env, lid);
    if (!L) { await env.STORE.delete(o.key); continue; }
    n += 1;
    if (L.mode === 'auction' && L.top && !L.sales.length) {
      const sid = `w-${L.top.bid.slice(2)}`;
      const L2 = await editListing(env, lid, (x) => (x.sales.length ? undefined : { ...x, left: 0, sales: [{ sid, buyer: x.top.by, qty: x.qty, micro: x.top.micro, escrow: true, status: 'new', at: now }] }));
      await putJSON(env.STORE, `x/pending/sale/${sid}`, { lid });
      await completeSale(env, L2.lid, sid);
    } else await closeListing(env, lid, 'ended');
  }
  return n;
}

// ---------------------------------------------------------------- WD satuan / massal (voucher vault → mintWithVoucher)
/**
 * items: [{c, id, amount}] — dikelompokkan per koleksi; satu voucher (satu transaksi) per koleksi. Edisi dikurangi dari
 * kustodi DULU (tidak bisa dijual lagi di axto.io), lalu vault menandatangani voucher. colAddr(c) → alamat kontrak.
 */
export async function withdraw(env, wallet, b, colAddr, names) {
  if (!okRef(b?.ref)) return fail('ref');
  if (!Array.isArray(b?.items) || !b.items.length) return fail('items');
  const groups = {};
  for (const it of b.items) {
    const c = String(it?.c ?? '');
    const id = Number(it?.id);
    const a = Number(it?.amount ?? 1);
    if (!isEx(c) || !validId(c, id) || !Number.isSafeInteger(a) || a < 1 || a > EXCLUSIVE_SUPPLY) return fail('item');
    (groups[c] ??= new Map()).set(id, (groups[c].get(id) ?? 0) + a);
  }
  for (const c of Object.keys(groups)) {
    if (groups[c].size > WD_MAX_ITEMS) return fail('too_many', { max: WD_MAX_ITEMS });
    if (!/^0x[0-9a-fA-F]{40}$/.test(colAddr(c) ?? '')) return fail('contract_pending');
  }
  const out = [];
  for (const [c, m] of Object.entries(groups)) {
    const ref = `${(await sha(`${lw(wallet)}:${b.ref}`)).slice(0, 20)}-${c}`;
    const items = [...m].map(([id, amount]) => ({ id, amount }));
    if (await createOnce(env.STORE, `x/wd/${ref}.json`, { ref, wallet: lw(wallet), c, items, status: 'new', at: Date.now() })) await putJSON(env.STORE, `x/pending/wd/${ref}`, { at: Date.now() });
    out.push(await completeWithdraw(env, ref, colAddr, names));
  }
  const bad = out.find((r) => !r.ok);
  return bad && out.length === 1 ? bad : { ok: out.every((r) => r.ok), vouchers: out };
}

export async function completeWithdraw(env, ref, colAddr, names) {
  const key = `x/wd/${ref}.json`;
  const w = await readJSON(env.STORE, key);
  if (!w) return fail('not_found');
  if (w.status === 'voucher' || w.status === 'minted') return { ok: true, wd: publicWd(w, colAddr) };
  if (w.status === 'failed') return fail(w.error);
  // 1) keluar dari kustodi (semua atau tidak sama sekali)
  const done = [];
  try {
    for (const it of w.items) { await moveOwn(env, w.wallet, w.c, it.id, -it.amount, `wd:${ref}`); done.push(it); }
  } catch (e) {
    if (e.message !== 'qty') throw e;
    for (const it of done) await moveOwn(env, w.wallet, w.c, it.id, it.amount, `wdback:${ref}`);
    await putJSON(env.STORE, key, { ...w, status: 'failed', error: 'qty' });
    await env.STORE.delete(`x/pending/wd/${ref}`);
    return fail('qty');
  }
  // 2) riwayat „sudah ditarik ke wallet — tidak lagi di database axto.io"
  for (const it of w.items) {
    await casMeta(env.STORE, goneKey(w.wallet, w.c, it.id), (cur) => {
      const g = cur ?? { qty: 0, wd: [] };
      if (g.wd.some((x) => x.ref === ref)) return undefined;
      return { qty: g.qty + it.amount, wd: [...g.wd, { ref, n: it.amount, at: Date.now() }].slice(-50) };
    });
  }
  // 3) voucher vault (idempoten per wdRef)
  const v = await vault(env, 'mintBatchVoucher', { collection: colAddr(w.c), collectionName: names[w.c], items: w.items, owner: w.wallet, wdRef: ref });
  if (v?.error) throw new Error(`vault:${v.error}`);
  const rec = { ...w, status: 'voucher', voucher: v, at2: Date.now() };
  await putJSON(env.STORE, key, rec);
  await putJSON(env.STORE, `x/by/${w.wallet}/w/${ref}`, { ref }, { c: w.c, n: String(w.items.reduce((a, b) => a + b.amount, 0)), at: String(w.at) });
  await env.STORE.delete(`x/pending/wd/${ref}`);
  await appendLog(env.STORE, 'wd', { ref, wallet: w.wallet, c: w.c, items: w.items });
  return { ok: true, wd: publicWd(rec, colAddr) };
}

const publicWd = (w, colAddr) => ({ ref: w.ref, c: w.c, items: w.items, status: w.status, contract: colAddr(w.c), voucher: w.voucher ? { to: w.voucher.to, ids: w.voucher.ids, amounts: w.voucher.amounts, ref: w.voucher.ref, deadline: w.voucher.deadline, sig: w.voucher.sig } : null });

export async function myWithdrawals(env, wallet, colAddr) {
  const out = [];
  for (const o of (await listKeys(env.STORE, `x/by/${lw(wallet)}/w/`, 500)).slice(-100)) {
    const w = await readJSON(env.STORE, `x/wd/${o.key.split('/').pop()}.json`);
    if (w) out.push(publicWd(w, colAddr));
  }
  return out.reverse();
}

/** Member melaporkan transaksi mint terkirim (hanya catatan; kontrak sendiri menolak voucher ganda). */
export async function markMinted(env, wallet, b) {
  const ref = String(b?.ref ?? '');
  if (!/^[0-9a-f]{20}-ex-[a-z]+$/.test(ref) || !/^0x[0-9a-fA-F]{64}$/.test(String(b?.tx ?? ''))) return fail('input');
  const w = await readJSON(env.STORE, `x/wd/${ref}.json`);
  if (!w || w.wallet !== lw(wallet)) return fail('not_found');
  await putJSON(env.STORE, `x/wd/${ref}.json`, { ...w, status: 'minted', tx: b.tx, mintedAt: Date.now() });
  return { ok: true };
}

// ---------------------------------------------------------------- hadiah & berbagi (kustodi → wallet lain, tanpa gas)
const GIFT_MAX = 100; // penerima per kiriman (berbagi ke komunitas)
/**
 * Kirim hadiah: edisi di kustodi berpindah ke alamat wallet lain di dalam axto.io — instan, gratis, tanpa gas. Penerima
 * cukup menghubungkan wallet itu untuk melihatnya, menjualnya di Pasar Member, atau menariknya (WD). Bukan penjualan,
 * jadi tanpa fee (pemilik: „Biarin TF langsung antar wallet"). items: [{c, id, amount, to}] — satu karya ke banyak
 * alamat sekaligus untuk komunitas. Semua jumlah diperiksa dulu; tiap langkah idempoten (ref) dan dipulihkan cron.
 */
export async function gift(env, wallet, b) {
  if (!okRef(b?.ref)) return fail('ref');
  if (!Array.isArray(b?.items) || !b.items.length) return fail('items');
  if (b.items.length > GIFT_MAX) return fail('too_many', { max: GIFT_MAX });
  const need = new Map();
  const items = [];
  for (const it of b.items) {
    const c = String(it?.c ?? '');
    const id = Number(it?.id);
    const amount = Number(it?.amount ?? 1);
    const to = String(it?.to ?? '').trim();
    if (!isEx(c) || !validId(c, id) || !Number.isSafeInteger(amount) || amount < 1 || amount > EXCLUSIVE_SUPPLY) return fail('item');
    if (!/^0x[0-9a-fA-F]{40}$/.test(to)) return fail('address', { to });
    if (lw(to) === lw(wallet)) return fail('self');
    items.push({ c, id, amount, to: lw(to) });
    need.set(`${c}:${id}`, (need.get(`${c}:${id}`) ?? 0) + amount);
  }
  const gid = `g-${(await sha(`${lw(wallet)}:${b.ref}`)).slice(0, 24)}`;
  if (await readJSON(env.STORE, `x/gift/${gid}.json`)) return completeGift(env, gid); // permintaan ulang
  for (const [k, n] of need) {
    const [c, id] = k.split(':');
    const o = await readJSON(env.STORE, ownKey(wallet, c, Number(id)));
    if (!o || o.qty - sumLocked(o) < n) return fail('qty', { c, id: Number(id) });
  }
  const note = String(b.note ?? '').replace(/[<>]/g, '').slice(0, 140);
  if (await createOnce(env.STORE, `x/gift/${gid}.json`, { gid, from: lw(wallet), items, note, status: 'new', at: Date.now() })) await putJSON(env.STORE, `x/pending/gift/${gid}`, { at: Date.now() });
  return completeGift(env, gid);
}

export async function completeGift(env, gid) {
  const key = `x/gift/${gid}.json`;
  const g = await readJSON(env.STORE, key);
  if (!g) return fail('not_found');
  if (g.status !== 'new') { await env.STORE.delete(`x/pending/gift/${gid}`); return { ok: g.status === 'done', gift: { gid, items: g.items.length }, ...(g.error ? { error: g.error } : {}) }; }
  let done = 0;
  for (const [i, it] of g.items.entries()) {
    try { await moveOwn(env, g.from, it.c, it.id, -it.amount, `gift:${gid}:${i}`); } catch (e) {
      if (e.message !== 'qty') throw e;
      // jumlah berubah di antara pemeriksaan & eksekusi: hentikan; yang sudah terkirim tetap sah
      await putJSON(env.STORE, key, { ...g, status: done ? 'partial' : 'failed', error: 'qty', done });
      await env.STORE.delete(`x/pending/gift/${gid}`);
      return fail('qty', { done });
    }
    await moveOwn(env, it.to, it.c, it.id, it.amount, `giftin:${gid}:${i}`);
    await putJSON(env.STORE, `x/by/${it.to}/r/${gid}-${i}`, { gid }, { c: it.c, id: String(it.id), qty: String(it.amount), from: g.from, at: String(g.at) });
    done += 1;
  }
  await putJSON(env.STORE, `x/by/${g.from}/g/${gid}`, { gid }, { n: String(g.items.length), editions: String(g.items.reduce((a, x) => a + x.amount, 0)), at: String(g.at) });
  await putJSON(env.STORE, key, { ...g, status: 'done', done });
  await env.STORE.delete(`x/pending/gift/${gid}`);
  await appendLog(env.STORE, 'gift', { gid, from: g.from, n: g.items.length });
  return { ok: true, gift: { gid, items: g.items.length } };
}

// ---------------------------------------------------------------- riwayat member & pemulihan & admin
export async function history(env, wallet) {
  const rows = async (k) => (await listKeys(env.STORE, `x/by/${lw(wallet)}/${k}/`, 1000)).map((o) => ({ id: o.key.split('/').pop(), ...o.customMetadata }));
  const fmt = (r) => ({ ...r, coins: r.micro ? COIN.fmtCoins(r.micro) : undefined });
  return { orders: (await rows('o')).map(fmt).reverse().slice(0, 200), trades: (await rows('t')).map(fmt).reverse().slice(0, 200), listings: (await rows('l')).reverse().slice(0, 200), giftsSent: (await rows('g')).reverse().slice(0, 100), giftsReceived: (await rows('r')).reverse().slice(0, 200) };
}

/** Cron: lanjutkan pekerjaan yang terputus (> 1 menit). */
export async function recover(env, colAddr, names, now = Date.now()) {
  let n = 0;
  for (const o of await listKeys(env.STORE, 'x/pending/', 500)) {
    const [, , kind, id] = o.key.split('/');
    const p = await readJSON(env.STORE, o.key);
    if (!p || now - Number(p.at ?? 0) < 60_000) continue;
    try {
      if (kind === 'order') await completeOrder(env, id);
      else if (kind === 'sale') await completeSale(env, p.lid, id);
      else if (kind === 'wd') await completeWithdraw(env, id, colAddr, names);
      else if (kind === 'rel') await releaseFunds(env, id);
      else if (kind === 'list') await openPending(env, id);
      else if (kind === 'gift') await completeGift(env, id);
      else if (kind === 'hold') {
        const L = await getListing(env, p.lid);
        const tracked = L && (L.bids.some((x) => x.bid === id) || L.offers.some((x) => x.oid === id));
        if (tracked) await env.STORE.delete(o.key); else await unhold(env, p.wallet, p.micro, p.lid, id);
      }
      n += 1;
    } catch (e) { await appendLog(env.STORE, 'error', { path: `recover:${kind}`, id, e: String(e?.message ?? e).slice(0, 200) }); }
  }
  return n;
}

export async function adminView(env) {
  const days = [];
  for (let i = 0; i < 30; i += 1) days.push(day(Date.now() - i * 86_400_000));
  let shop = 0n;
  let fees = 0n;
  let orders = 0;
  for (const d of days) {
    for (const o of await listKeys(env.STORE, `x/rev/${d}/`, 20_000)) {
      if (o.customMetadata?.kind === 'shop') { shop += BigInt(o.customMetadata.micro ?? 0); orders += 1; } else fees += BigInt(o.customMetadata?.micro ?? 0);
    }
  }
  const sold = {};
  for (const c of EX_KEYS) sold[c] = Object.values(await soldMap(env, c)).reduce((a, b) => a + b, 0);
  return { last30: { shopCoins: COIN.fmtCoins(shop), feeCoins: COIN.fmtCoins(fees), orders }, editionsSold: sold, editionsTotal: Object.fromEntries(EX_KEYS.map((c) => [c, COLLECTIONS[c].max * EXCLUSIVE_SUPPLY])), open: (await listKeys(env.STORE, 'x/open/', 20_000)).length, pending: (await listKeys(env.STORE, 'x/pending/', 1000)).length };
}

async function sha(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
