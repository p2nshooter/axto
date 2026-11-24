// Pembayaran kripto (pemilik, 24 Nov 2026): alamat deposit dari akun penampung (kunci izin lihat), jumlah unik + QR,
// deposit sukses → pembelian berhasil; keranjang beli massal + WD massal; barang yang keduluan hilang otomatis.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import * as PAY from '../src/pay.js';
import * as C from '../src/coin.js';
import * as CART from '../src/cart.js';
import * as SHOP from '../src/shop.js';

function fakeR2() {
  const m = new Map();
  let n = 0;
  return {
    m,
    async get(k) { const o = m.get(k); return o ? { etag: o.etag, json: async () => JSON.parse(o.body), body: o.body } : null; },
    async head(k) { const o = m.get(k); return o ? { uploaded: new Date(o.at), customMetadata: o.meta } : null; },
    async put(k, body, opt = {}) {
      const cur = m.get(k);
      if (opt.onlyIf?.etagDoesNotMatch === '*' && cur) return null;
      if (opt.onlyIf?.etagMatches && (!cur || cur.etag !== opt.onlyIf.etagMatches)) return null;
      const o = { body: typeof body === 'string' ? body : String(body), etag: `e${++n}`, meta: opt.customMetadata, at: Date.now() };
      m.set(k, o);
      return { etag: o.etag };
    },
    async delete(k) { m.delete(k); },
    async list({ prefix, cursor, limit = 1000 }) {
      const keys = [...m.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      return { objects: keys.slice(start, start + limit).map((k) => ({ key: k, customMetadata: m.get(k).meta })), truncated: start + limit < keys.length, cursor: String(start + limit) };
    },
  };
}

const EVM = '0x' + '5a'.repeat(20);
const W = '0x' + '11'.repeat(20);
const W2 = '0x' + '22'.repeat(20);
// akun penampung tiruan (API v2): alamat deposit per koin & jaringan, riwayat deposit per koin, ticker publik
const TRON = 'TTestAddrForAxtoUnitTests123456789';
const ADDR = {
  'USDT:BEP20': { address: EVM, network: 'bep20' },
  'USDT:TRC20': { address: TRON, network: 'trc20' },
  'USDT:ERC20': { address: EVM, network: 'erc20' },
  'USDC:BASE': { address: EVM, network: 'base' },
  'USDC:ERC20': { address: EVM, network: 'erc20' },
  'USDC:SOL': { address: 'So1anaTestAddrxxxxxxxxxxxxxxxxxxxxxxxxxxx', network: 'sol', tag: 'memo-1' },
  'ETH:BASE': { address: EVM, network: 'base' },
  'ETH:ARB': { address: EVM, network: 'arb' },
  'ETH:ETH': { address: EVM, network: 'eth' },
  'BTC:BTC': { address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', network: 'btc' },
};
function fakeGateway(state) {
  return async (url, init = {}) => {
    const u = new URL(String(url));
    const ok = (j, status = 200) => new Response(JSON.stringify(j), { status, headers: { 'content-type': 'application/json' } });
    if (String(url) === 'https://indodax.com/api/ticker_all') return ok({ tickers: { usdt_idr: { last: '16000' }, usdc_idr: { last: '16000' }, eth_idr: { last: '48000000' }, btc_idr: { last: '1600000000' } } });
    if (u.origin === PAY.GW) {
      // tanda tangan HMAC-SHA256 atas query string, kunci di X-APIKEY; hanya GET
      assert.equal(init.method ?? 'GET', 'GET');
      assert.equal(init.headers['X-APIKEY'], 'KEY-1');
      assert.equal(init.headers.Sign, createHmac('sha256', 'secret-1').update(u.search.slice(1)).digest('hex'));
      const q = Object.fromEntries(u.searchParams);
      state.calls = [...(state.calls ?? []), u.pathname];
      if (u.pathname === '/api/v2/capital/deposit/address/list') {
        const a = ADDR[`${q.coin}:${q.network}`];
        if (!a) return ok([{ coin: q.coin, address: '', tag: '', network: q.network.toLowerCase() }]);
        return ok([{ coin: q.coin, address: a.address, tag: a.tag ?? '', network: a.network }]);
      }
      if (u.pathname === '/api/v2/capital/deposit/hisrec') return ok(state.deposits?.[q.coin.toLowerCase()] ?? []);
      return ok({ code: -1100, msg: 'unknown' }, 400);
    }
    return new Response('{}', { status: 404 });
  };
}
const dep = (id, amount, txId, network = 'bep20', t = Date.now()) => ({ id, amount, coin: 'X', txId, address: 'x', network, status: 'success', insertTime: t, completeTime: t });
const ready = (env) => PAY.gatewayCfg(env, { refresh: true, refreshPause: 0 });

const ENV = () => ({ STORE: fakeR2(), BASE_URL: 'https://axto.io', INDODAX_API_KEY: 'KEY-1', INDODAX_API_SECRET: 'secret-1' });
beforeEach(() => { PAY._resetPrices(); PAY._resetCfg(); });

test('alamat deposit (API v2): hanya jaringan yang punya alamat & dikenali; memo wajib tidak ditawarkan; dibaca di cron, bukan saat member membuka', async () => {
  const env = ENV();
  const state = {};
  globalThis.fetch = fakeGateway(state);
  await assert.rejects(PAY.publicOptions(env), /gw:warming/, 'belum dibaca cron: belum ditawarkan');
  await PAY.cron(env, Date.now(), { refreshPause: 0 });
  PAY._resetCfg();
  const opts = await PAY.publicOptions(env);
  assert.deepEqual(opts.map((o) => o.coin), ['usdt', 'usdc', 'eth', 'btc'], 'stablecoin lebih dulu');
  assert.deepEqual(opts.find((o) => o.coin === 'usdt').nets.map((n) => n.net), ['bep20', 'trc20', 'erc20'], 'jaringan murah lebih dulu');
  assert.deepEqual(opts.find((o) => o.coin === 'usdc').nets.map((n) => n.net), ['base', 'erc20'], 'USDC Solana (memo wajib) tidak ditawarkan');
  assert.deepEqual(opts.find((o) => o.coin === 'eth').nets.map((n) => n.net), ['base', 'arb', 'eth'], 'Base (termurah) lebih dulu; tanpa alamat (OP) tidak ditawarkan');
  assert.equal(opts.find((o) => o.coin === 'usdc').nets[0].wallet, true);
  const saved = JSON.stringify(await env.STORE.get('pay/cfg.json').then((o) => o.json()));
  assert.ok(!saved.includes('memo-1'), 'alamat bermemo tidak disimpan sebagai opsi');
  assert.ok(state.calls.every((c) => c.startsWith('/api/v2/capital/deposit/')), 'hanya titik baca deposit yang dipanggil');
  // sistem tidak pernah memanggil titik lain (penarikan, perdagangan)
  await assert.rejects(PAY.gw(env, '/api/v2/capital/withdraw/apply', {}), /gw:method/);
  await assert.rejects(PAY.gw(env, '/api/v2/order', {}), /gw:method/);
});

test('jumlah unik: dua pembayaran $10 tidak pernah berjumlah sama; tambahan maksimal ±$0,10', () => {
  const p = PAY.amountPlan('usdt', 1000, 1);
  assert.equal(p.base, 1_000_000_000n); // 10 USDT dalam unit 1e-8
  assert.equal(p.dp, 4);
  assert.ok(Number(p.step) * p.tags / 1e8 <= 0.1);
  const e = PAY.amountPlan('eth', 1000, 3000);
  assert.ok(Number(e.step) / 1e8 * 3000 * e.tags <= 0.1 + 1e-9);
  assert.ok(e.base >= 333_333n);
});

test('beli koin AXTO: pembayaran → deposit sukses (cocok jumlah unik) → kredit sekali; deposit ulang tidak menggandakan', async () => {
  const env = ENV();
  const state = {};
  globalThis.fetch = fakeGateway(state);
  await ready(env);
  assert.equal((await C.buy(env, W, { usd: 10, coin: 'usdt', net: 'bep20', payer: EVM, agree: false, agreementV: C.AGREEMENT_V }, { lang: 'id' })).error, 'agreement');
  assert.equal((await C.buy(env, W, { usd: 10, coin: 'usdt', net: 'bep20', payer: 'TTestAddrForAxtoUnitTests123456789', agree: true, agreementV: C.AGREEMENT_V }, { lang: 'id' })).error, 'payer_address');
  assert.equal((await C.buy(env, W, { usd: 0.5, coin: 'usdt', net: 'bep20', payer: EVM, agree: true, agreementV: C.AGREEMENT_V }, { lang: 'id' })).error, 'amount');
  assert.equal((await C.buy(env, W, { usd: 10, coin: 'usdt', net: 'trc20', payer: EVM, agree: true, agreementV: C.AGREEMENT_V }, { lang: 'id' })).error, 'payer_address');
  assert.equal((await C.buy(env, W, { usd: 10, coin: 'usdt', net: 'polygon', payer: EVM, agree: true, agreementV: C.AGREEMENT_V }, { lang: 'id' })).error, 'network', 'jaringan tanpa alamat deposit ditolak');
  const r = await C.buy(env, W, { usd: 10, coin: 'usdt', net: 'bep20', payer: '0x' + '77'.repeat(20), agree: true, agreementV: C.AGREEMENT_V }, { lang: 'id' });
  assert.ok(r.ok, JSON.stringify(r));
  const x = r.intent;
  assert.equal(x.address, EVM);
  assert.equal(x.netLabel, 'BNB Smart Chain (BEP20)');
  assert.match(x.amount, /^10\.0\d{3}$|^10\.\d{1,4}$/);
  assert.ok(Number(x.amount) > 10 && Number(x.amount) <= 10.1);
  // QR berisi alamat
  assert.match(await PAY.qrSvg(x.address), /^<svg/);
  // deposit milik orang lain dengan jumlah berbeda → tidak dicocokkan
  state.deposits = { usdt: [dep('d1', '10.00000000', '0x' + 'aa'.repeat(32))] };
  await PAY.syncDeposits(env, { force: true });
  assert.equal((await C.account(env, W)).micro, '0');
  // deposit dengan jumlah unik tepat → 1 AXTO ($10 pada $10/AXTO)
  state.deposits.usdt.push(dep('d2', x.amount, '0x' + 'bb'.repeat(32)));
  const s1 = await PAY.syncDeposits(env, { force: true });
  assert.equal(s1.matched, 1);
  assert.equal((await C.account(env, W)).micro, '1000000');
  assert.equal((await PAY.getIntent(env, x.id)).status, 'done');
  await PAY.syncDeposits(env, { force: true });
  assert.equal((await C.account(env, W)).micro, '1000000', 'deposit yang sama diproses sekali');
  assert.equal((await C.presaleSold(env)).toString(), '1000000');
  const a = await C.account(env, W);
  assert.deepEqual(a.addresses.map((d) => d.cur), ['usdt:bep20'], 'alamat member tercatat sebagai tujuan pencairan');
  // admin melihat deposit tanpa pasangan (d1)
  const av = await PAY.adminView(env);
  assert.equal(av.unmatched.length, 1);
  assert.equal(av.unmatched[0].depositId, 'd1');
});

test('kurang bayar: ditunggu sampai kedaluwarsa, lalu dikreditkan sesuai yang diterima; hash transaksi yang diklaim mencocokkan', async () => {
  const env = ENV();
  const state = {};
  globalThis.fetch = fakeGateway(state);
  await ready(env);
  const t0 = Date.now();
  const r = await C.buy(env, W, { usd: 20, coin: 'usdc', net: 'base', payer: EVM, agree: true, agreementV: C.AGREEMENT_V }, { lang: 'en' });
  const x = r.intent;
  const tx = '0x' + 'cd'.repeat(32);
  assert.ok((await PAY.claimTx(env, W, x.id, tx)).ok);
  assert.equal((await PAY.claimTx(env, W2, x.id, tx)).error, 'not_found');
  state.deposits = { usdc: [dep('u1', '10.00000000', tx, 'base', t0)] };
  await PAY.syncDeposits(env, { force: true });
  assert.equal((await PAY.getIntent(env, x.id)).status, 'partial');
  assert.equal((await C.account(env, W)).micro, '0', 'belum dikreditkan selama masih bisa dilunasi');
  await PAY.cron(env, t0 + PAY.PAY_TTL_MS + 20 * 60_000);
  const after = await PAY.getIntent(env, x.id);
  assert.equal(after.status, 'credited');
  const got = BigInt((await C.account(env, W)).micro);
  assert.ok(got > 990_000n && got <= 1_000_000n, `≈ 1 AXTO untuk $10 dari $20, dapat ${got}`);
});

test('URL callback: penarikan apa pun ditolak (tidak pernah „ok") dan dicatat untuk admin', async () => {
  const env = ENV();
  const res = await PAY.callback(new Request('https://axto.io/api/indodax', { method: 'POST', body: 'request_id=x1&withdraw_currency=eth&withdraw_amount=1&withdraw_address=0xabc' }), env);
  assert.equal(await res.text(), 'refused');
  assert.equal(await (await PAY.callback(new Request('https://axto.io/api/indodax'), env)).text(), 'axto.io');
  assert.equal([...env.STORE.m.keys()].filter((k) => k.startsWith('log/pay-alert/')).length, 1);
});

test('keranjang: barang yang keduluan member lain hilang otomatis; checkout koin AXTO membeli semuanya sekaligus', async () => {
  const env = ENV();
  globalThis.fetch = fakeGateway({});
  await C.adjust(env, W, 10n * C.MICRO, { ev: 'test' });
  await C.adjust(env, W2, 10n * C.MICRO, { ev: 'test' });
  const c = SHOP.EX_KEYS[0];
  assert.ok((await CART.edit(env, W, { op: 'add', t: 'ex', c, id: 1, qty: 2 })).ok);
  assert.ok((await CART.edit(env, W, { op: 'add', t: 'ex', c, id: 2, qty: 1 })).ok);
  assert.ok((await CART.edit(env, W, { op: 'add', t: 'ex', c, id: 3, qty: 10 })).ok);
  let v = await CART.view(env, W);
  assert.equal(v.buy.length, 3);
  assert.equal(v.total.usd, 13);
  // member lain memborong karya #3 (10 edisi) dan 9 edisi karya #1
  assert.ok((await SHOP.buyExclusive(env, W2, { c, id: 3, qty: 10, ref: 'w2-buy-0002' })).ok);
  assert.ok((await SHOP.buyExclusive(env, W2, { c, id: 1, qty: 9, ref: 'w2-buy-0003' })).ok);
  v = await CART.view(env, W);
  assert.deepEqual(v.removed.map((r) => [r.id, r.why]), [[1, 'reduced'], [3, 'sold']]);
  assert.deepEqual(v.buy.map((i) => [i.id, i.qty]), [[1, 1], [2, 1]]);
  assert.equal((await CART.view(env, W)).removed.length, 0, 'keranjang sudah diperbarui');
  const r = await CART.checkout(env, W, { pay: 'axto', ref: 'cartcheckout01' });
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(r.results.map((x) => x.ok), [true, true]);
  assert.equal((await CART.view(env, W)).buy.length, 0);
  const h = await SHOP.holdings(env, W);
  assert.deepEqual(h.items.map((i) => [i.id, i.qty]).sort(), [[1, 1], [2, 1]]);
});

test('keranjang kripto: barang dipesan saat checkout, diserahkan setelah pembayaran diterima; tidak dibayar → dilepas & kembali ke keranjang', async () => {
  const env = ENV();
  const state = {};
  globalThis.fetch = fakeGateway(state);
  await ready(env);
  const c = SHOP.EX_KEYS[1];
  await CART.edit(env, W, { op: 'add', t: 'ex', c, id: 7, qty: 3 });
  const r = await CART.checkout(env, W, { pay: 'crypto', coin: 'usdt', net: 'bep20', ref: 'cryptocheck01' });
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.intent.usd, 3);
  assert.equal((await SHOP.stockOf(env, c, 7)).left, 7, 'stok ditahan selama menunggu pembayaran');
  assert.equal((await SHOP.holdings(env, W)).items.length, 0, 'belum diserahkan sebelum dibayar');
  state.deposits = { usdt: [dep('k1', r.intent.amount, '0x' + 'ef'.repeat(32))] };
  await PAY.syncDeposits(env, { force: true });
  assert.equal((await PAY.getIntent(env, r.intent.id)).status, 'done');
  assert.deepEqual((await SHOP.holdings(env, W)).items.map((i) => [i.id, i.qty]), [[7, 3]]);
  assert.equal((await SHOP.stockOf(env, c, 7)).left, 7);
  // pembayaran kedua tidak dibayar → dilepas dan kembali ke keranjang
  const t0 = Date.now();
  await CART.edit(env, W, { op: 'add', t: 'ex', c, id: 8, qty: 2 });
  const r2 = await CART.checkout(env, W, { pay: 'crypto', coin: 'usdt', net: 'bep20', ref: 'cryptocheck02' });
  assert.equal((await SHOP.stockOf(env, c, 8)).left, 8);
  assert.equal((await CART.view(env, W)).buy.length, 0);
  await PAY.cron(env, t0 + PAY.PAY_TTL_MS + 20 * 60_000);
  assert.equal((await PAY.getIntent(env, r2.intent.id)).status, 'expired');
  assert.equal((await SHOP.stockOf(env, c, 8)).left, 10, 'stok dilepas');
  assert.deepEqual((await CART.view(env, W)).buy.map((i) => [i.id, i.qty]), [[8, 2]], 'kembali ke keranjang');
});

test('daftar WD: yang sudah tidak bebas hilang otomatis; WD massal menghapus daftar', async () => {
  const env = ENV();
  globalThis.fetch = fakeGateway({});
  await C.adjust(env, W, 10n * C.MICRO, { ev: 'test' });
  const c = SHOP.EX_KEYS[0];
  assert.ok((await SHOP.buyExclusive(env, W, { c, id: 5, qty: 2, ref: 'wdlist-buy-01' })).ok);
  await CART.edit(env, W, { op: 'add', list: 'wd', c, id: 5, qty: 2 });
  assert.equal((await CART.edit(env, W, { op: 'add', list: 'wd', c, id: 6, qty: 1 })).error, 'not_free', 'karya yang tidak dimiliki tidak bisa masuk daftar WD');
  // satu edisi dihadiahkan setelah masuk daftar → daftar menyesuaikan otomatis
  assert.ok((await SHOP.gift(env, W, { ref: 'wdlistgift01', items: [{ c, id: 5, amount: 1, to: W2 }] })).ok);
  const v = await CART.view(env, W);
  assert.deepEqual(v.wd.map((i) => [i.id, i.qty]), [[5, 1]]);
  assert.equal(v.removed[0].why, 'reduced');
  // kontrak belum aktif → ditolak, daftar tetap
  const r = await CART.withdrawAll(env, W, { ref: 'wdall0000001' }, () => '', {});
  assert.equal(r.error, 'contract_pending');
  assert.equal((await CART.view(env, W)).wd.length, 1);
});

test('Pasar Member dibayar kripto: edisi ditahan, setelah pembayaran diterima pindah ke pembeli; penjual menerima 90% koin AXTO', async () => {
  const env = ENV();
  const state = {};
  globalThis.fetch = fakeGateway(state);
  await ready(env);
  const c = SHOP.EX_KEYS[2];
  await C.adjust(env, W2, 10n * C.MICRO, { ev: 'test' });
  assert.ok((await SHOP.buyExclusive(env, W2, { c, id: 9, qty: 3, ref: 'seller-buy-01' })).ok);
  const L = await SHOP.createListing(env, W2, { c, id: 9, qty: 3, mode: 'fixed', price: '2', days: 7 });
  assert.ok(L.ok, JSON.stringify(L));
  const lid = L.listing.lid;
  assert.equal((await CART.edit(env, W2, { op: 'add', t: 'mk', lid, qty: 1 })).error, 'own', 'tidak bisa membeli listing sendiri');
  assert.ok((await CART.edit(env, W, { op: 'add', t: 'mk', lid, qty: 2 })).ok);
  const v = await CART.view(env, W);
  assert.equal(v.total.usd, 40, '2 edisi × 2 AXTO × $10');
  const r = await CART.checkout(env, W, { pay: 'crypto', coin: 'usdc', net: 'base', ref: 'mkcrypto0001' });
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal((await SHOP.getListing(env, lid)).left, 1, 'dua edisi ditahan untuk pembeli');
  const sellerBefore = BigInt((await C.account(env, W2)).micro);
  state.deposits = { usdc: [dep('m1', r.intent.amount, '0x' + '12'.repeat(32), 'base')] };
  await PAY.syncDeposits(env, { force: true });
  assert.equal((await PAY.getIntent(env, r.intent.id)).status, 'done');
  assert.deepEqual((await SHOP.holdings(env, W)).items.map((i) => [i.id, i.qty]), [[9, 2]]);
  assert.equal(BigInt((await C.account(env, W2)).micro) - sellerBefore, 3_600_000n, 'penjual: 4 AXTO − fee 10%');
  assert.equal((await C.account(env, W)).micro, '0', 'pembeli tidak memakai koin AXTO');
});
