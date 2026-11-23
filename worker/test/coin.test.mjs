// Koin AXTO lewat NOWPayments: tanda tangan IPN, TOTP, hitungan koin, aliran beli → IPN → kredit, cairkan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import * as C from '../src/coin.js';

// R2 tiruan dengan etag + onlyIf (cukup untuk createOnce / CAS) dan list berprefix + customMetadata
function fakeR2() {
  const m = new Map();
  let n = 0;
  return {
    m,
    async get(k) { const o = m.get(k); return o ? { etag: o.etag, json: async () => JSON.parse(o.body), body: o.body } : null; },
    async head(k) { const o = m.get(k); return o ? { uploaded: new Date(o.at) } : null; },
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
      const page = keys.slice(start, start + limit);
      return { objects: page.map((k) => ({ key: k, customMetadata: m.get(k).meta })), truncated: start + limit < keys.length, cursor: String(start + limit) };
    },
  };
}

// NOWPayments tiruan: /payment, /payment/{id}, /payout/validate-address, /estimate, /payout/fee, /auth, /payout, /verify
function fakeNP(state) {
  return async (url, init = {}) => {
    const u = new URL(url);
    const body = init.body ? JSON.parse(init.body) : null;
    const ok = (j) => new Response(JSON.stringify(j), { status: 200, headers: { 'content-type': 'application/json' } });
    if (u.pathname !== '/v1/auth') assert.equal(init.headers?.['x-api-key'], 'test-api-key');
    if (u.pathname === '/v1/payout/validate-address') return ok(true);
    if (u.pathname === '/v1/payment' && init.method === 'POST') {
      state.payment = { payment_id: 555001, payment_status: 'waiting', pay_address: 'TPayAddressOfNowPayments11111111', pay_amount: 50.12, pay_currency: body.pay_currency, price_amount: body.price_amount, order_id: body.order_id };
      state.createdWith = body;
      return ok(state.payment);
    }
    if (u.pathname === '/v1/payment/555001') return ok(state.payment);
    if (u.pathname === '/v1/estimate') return ok({ estimated_amount: Number(u.searchParams.get('amount')) * 1.0 });
    if (u.pathname === '/v1/payout/fee') return ok({ fee: 1 });
    if (u.pathname === '/v1/auth') { state.auth = body; return ok({ token: 'jwt-token' }); }
    if (u.pathname === '/v1/payout' && init.method === 'POST') {
      assert.equal(init.headers.authorization, 'Bearer jwt-token');
      state.payouts = (state.payouts ?? 0) + 1;
      state.payoutBody = body;
      return ok({ id: 'batch-1', withdrawals: [{ id: 'w-1', status: 'WAITING' }] });
    }
    if (u.pathname === '/v1/payout/batch-1/verify') { state.verified = body.verification_code; return ok(true); }
    return new Response('{}', { status: 404 });
  };
}

const ENV = () => ({ STORE: fakeR2(), BASE_URL: 'https://axto.io', NOWPAYMENTS_API_KEY: 'test-api-key', NOWPAYMENTS_IPN_SECRET: ' ipn-secret ', NOWPAYMENTS_EMAIL: 'owner@example.com', NOWPAYMENTS_PASSWORD: 'pw', NOWPAYMENTS_2FA_SECRET: 'JBSWY3DPEHPK3PXP' });
const W = '0x1111111111111111111111111111111111111111';

test('IPN: tanda tangan = HMAC-SHA512 atas JSON berkunci urut rekursif (sama dengan SDK resmi)', async () => {
  const payload = { payment_status: 'finished', payment_id: 1, nested: { z: 1, a: [{ y: 2, b: 3 }] }, actually_paid: 0.5 };
  // rujukan: implementasi SDK resmi (@nowpaymentsio/nowpayments-sdk-nodejs, dist/ipn.js) dengan node:crypto
  const sortObjectDeep = (v) => (Array.isArray(v) ? v.map(sortObjectDeep) : v && typeof v === 'object' && v.constructor === Object ? Object.keys(v).sort().reduce((r, k) => ((r[k] = sortObjectDeep(v[k])), r), {}) : v);
  const ref = createHmac('sha512', 'ipn-secret').update(JSON.stringify(sortObjectDeep(payload))).digest('hex');
  assert.equal(await C.ipnSignature(payload, ' ipn-secret '), ref);
  assert.deepEqual(await C.verifyIpn(JSON.stringify(payload), ref, 'ipn-secret'), payload);
  assert.equal(await C.verifyIpn(JSON.stringify(payload), ref.replace(/.$/, (c) => (c === '0' ? '1' : '0')), 'ipn-secret'), null);
  assert.equal(await C.verifyIpn(JSON.stringify({ ...payload, actually_paid: 5 }), ref, 'ipn-secret'), null);
  assert.equal(await C.verifyIpn(JSON.stringify(payload), ref, ''), null);
  assert.equal(await C.verifyIpn('not json', ref, 'ipn-secret'), null);
});

test('TOTP RFC 6238 (SHA-1): vektor uji resmi', async () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // "12345678901234567890" dalam Base32
  assert.equal(await C.totp(secret, 59_000), '287082');
  assert.equal(await C.totp(secret, 1_111_111_109_000), '081804');
  assert.equal(await C.totp(secret, 1_234_567_890_000), '005924');
  assert.equal(await C.totp(`otpauth://totp/NP?secret=${secret}&issuer=NP`, 2_000_000_000_000), '279037');
});

test('hitungan koin: $10/AXTO, mikro, potongan 50% sebelum DEX', () => {
  assert.equal(C.microForCents(5000, 1000), 5_000_000n); // $50 → 5 AXTO
  assert.equal(C.fmtCoins(C.microForCents(1234, 1000)), '1.234');
  assert.equal(C.parseCoins('2.5'), 2_500_000n);
  assert.equal(C.parseCoins('0'), null);
  assert.equal(C.parseCoins('1.1234567'), null);
  assert.deepEqual(C.cashoutQuote({ micro: 10_000_000n, priceCents: 1000, released: false }), { valueCents: 10000, penaltyPct: 50, payoutCents: 5000 });
  assert.deepEqual(C.cashoutQuote({ micro: 10_000_000n, priceCents: 1000, released: true }), { valueCents: 10000, penaltyPct: 0, payoutCents: 10000 });
  const order = { usdCents: 10000 };
  assert.equal(C.creditTarget(order, { payment_status: 'finished' }, 1000), 10_000_000n);
  assert.equal(C.creditTarget(order, { payment_status: 'partially_paid', actually_paid: 25, pay_amount: 100 }, 1000), 2_500_000n);
  assert.equal(C.creditTarget(order, { payment_status: 'confirming' }, 1000), 0n);
});

test('alamat pengirim per jaringan', () => {
  assert.ok(C.validAddress('usdt-trx', 'TTestAddrForAxtoUnitTests123456789'));
  assert.ok(C.validAddress('usdc-bsc', '0xabababababababababababababababababababab'));
  assert.ok(C.validAddress('btc', '1TestBtcAddrForAxtoUnitTests12345'));
  assert.ok(C.validAddress('btc', 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'));
  assert.ok(!C.validAddress('usdt-trx', '0xabababababababababababababababababababab'));
  assert.ok(!C.validAddress('bnb-bsc', 'TTestAddrForAxtoUnitTests123456789'));
  assert.ok(!C.validAddress('doge', 'D1'));
});

test('beli → IPN (diperiksa ulang ke API) → kredit sekali; IPN berulang tidak menggandakan', async () => {
  const env = ENV();
  const state = {};
  globalThis.fetch = fakeNP(state);
  assert.equal((await C.buy(env, W, { usd: 50, cur: 'usdt-trx', payer: 'TTestAddrForAxtoUnitTests123456789', agree: false, agreementV: C.AGREEMENT_V }, { lang: 'id', base: 'https://axto.io' })).error, 'agreement');
  assert.equal((await C.buy(env, W, { usd: 50, cur: 'usdt-trx', payer: '0xabababababababababababababababababababab', agree: true, agreementV: C.AGREEMENT_V }, { lang: 'id', base: 'https://axto.io' })).error, 'payer_address');
  assert.equal((await C.buy(env, W, { usd: 5, cur: 'usdt-trx', payer: 'TTestAddrForAxtoUnitTests123456789', agree: true, agreementV: C.AGREEMENT_V }, { lang: 'id', base: 'https://axto.io' })).error, 'amount');
  const r = await C.buy(env, W, { usd: 50, cur: 'usdt-trx', payer: 'TTestAddrForAxtoUnitTests123456789', agree: true, agreementV: C.AGREEMENT_V }, { lang: 'id', base: 'https://axto.io' });
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(state.createdWith.pay_currency, 'usdttrc20');
  assert.equal(state.createdWith.price_currency, 'usd');
  assert.equal(state.createdWith.ipn_callback_url, 'https://axto.io/api/nowpayments/ipn');
  assert.equal(r.order.pay.address, 'TPayAddressOfNowPayments11111111');
  // IPN palsu (tanda tangan salah) ditolak
  const fake = new Request('https://axto.io/api/nowpayments/ipn', { method: 'POST', body: JSON.stringify({ payment_id: 555001, order_id: r.order.id, payment_status: 'finished' }), headers: { 'x-nowpayments-sig': 'ab'.repeat(64) } });
  assert.equal((await C.ipn(fake, env)).status, 401);
  // IPN sah tapi API masih "confirming" → belum ada kredit (IPN hanya pemicu)
  const sign = async (p) => new Request('https://axto.io/api/nowpayments/ipn', { method: 'POST', body: JSON.stringify(p), headers: { 'x-nowpayments-sig': await C.ipnSignature(p, 'ipn-secret') } });
  state.payment = { ...state.payment, payment_status: 'confirming' };
  const p1 = { payment_id: 555001, order_id: r.order.id, payment_status: 'finished' }; // klaim IPN tidak dipercaya
  assert.equal((await C.ipn(await sign(p1), env)).body.credited, '0');
  assert.equal((await C.account(env, W)).micro, '0');
  // API menyatakan selesai → 5 AXTO masuk, alamat pengirim terdaftar sebagai tujuan pencairan
  state.payment = { ...state.payment, payment_status: 'finished', actually_paid: 50.12, payin_hash: 'tronTxHash' };
  assert.equal((await C.ipn(await sign(p1), env)).body.credited, '5000000');
  assert.equal((await C.ipn(await sign(p1), env)).body.credited, '0'); // IPN ulang
  const a = await C.account(env, W);
  assert.equal(a.micro, '5000000');
  assert.deepEqual(a.addresses.map((x) => [x.cur, x.addr]), [['usdt-trx', 'TTestAddrForAxtoUnitTests123456789']]);
  const mv = await C.memberView(env, W);
  assert.equal(mv.balance, '5');
  assert.equal(mv.orders[0].txid, 'tronTxHash');
  const ev = [...env.STORE.m.keys()].filter((k) => k.startsWith('log/coin/'));
  assert.equal(ev.length, 1);
});

test('cairkan: hanya ke alamat & mata uang pembelian, potong 50%, payout 2 fase tanpa ganda, gagal → koin kembali', async () => {
  const env = ENV();
  const state = {};
  globalThis.fetch = fakeNP(state);
  const r = await C.buy(env, W, { usd: 100, cur: 'usdt-trx', payer: 'TTestAddrForAxtoUnitTests123456789', agree: true, agreementV: C.AGREEMENT_V }, { lang: 'en', base: 'https://axto.io' });
  state.payment = { ...state.payment, payment_status: 'finished' };
  await C.applyPayment(env, r.order.id, state.payment);
  assert.equal((await C.account(env, W)).micro, '10000000'); // $100 → 10 AXTO
  // alamat lain ditolak
  assert.equal((await C.requestCashout(env, W, { coins: '5', cur: 'usdt-trx', addr: 'TOtherTestAddrForAxtoUnitTests9999', agree: true })).error, 'destination');
  assert.equal((await C.requestCashout(env, W, { coins: '5', cur: 'btc', addr: 'TTestAddrForAxtoUnitTests123456789', agree: true })).error, 'destination');
  // terlalu kecil setelah potongan ($10 × 50% = $5 < $20)
  assert.equal((await C.requestCashout(env, W, { coins: '1', cur: 'usdt-trx', addr: 'TTestAddrForAxtoUnitTests123456789', agree: true })).error, 'minimum');
  assert.equal((await C.requestCashout(env, W, { coins: '11', cur: 'usdt-trx', addr: 'TTestAddrForAxtoUnitTests123456789', agree: true })).error, 'balance');
  const c = await C.requestCashout(env, W, { coins: '6', cur: 'usdt-trx', addr: 'TTestAddrForAxtoUnitTests123456789', agree: true });
  assert.ok(c.ok, JSON.stringify(c));
  assert.equal(c.cashout.valueUsd, 60);
  assert.equal(c.cashout.penaltyPct, 50);
  assert.equal(c.cashout.payoutUsd, 30);
  assert.equal((await C.account(env, W)).micro, '4000000');
  // dua putaran berbarengan → satu payout saja
  await Promise.all([C.processCashouts(env), C.processCashouts(env)]);
  assert.equal(state.payouts, 1);
  assert.equal(state.payoutBody.withdrawals[0].address, 'TTestAddrForAxtoUnitTests123456789');
  assert.equal(state.payoutBody.withdrawals[0].currency, 'usdttrc20');
  assert.equal(state.payoutBody.withdrawals[0].amount, 29); // $30 dikurangi biaya jaringan 1
  assert.match(state.verified, /^\d{6}$/);
  assert.equal(state.auth.email, 'owner@example.com');
  await C.processCashouts(env);
  assert.equal(state.payouts, 1); // antrean sudah kosong
  // IPN payout selesai
  const sign = async (p) => new Request('https://axto.io/api/nowpayments/ipn', { method: 'POST', body: JSON.stringify(p), headers: { 'x-nowpayments-sig': await C.ipnSignature(p, 'ipn-secret') } });
  const done = await C.ipn(await sign({ id: 'w-1', batch_withdrawal_id: 'batch-1', status: 'FINISHED', unique_external_id: c.cashout.id, hash: 'payoutHash' }), env);
  assert.equal(done.body.status, 'finished');
  const mv = await C.memberView(env, W);
  assert.equal(mv.cashouts[0].status, 'paid');
  assert.equal(mv.cashouts[0].txid, 'payoutHash');
  // pencairan kedua gagal di NOWPayments → koin kembali ke member, sekali saja
  const c2 = await C.requestCashout(env, W, { coins: '4', cur: 'usdt-trx', addr: 'TTestAddrForAxtoUnitTests123456789', agree: true });
  assert.ok(c2.ok);
  assert.equal((await C.account(env, W)).micro, '0');
  await C.processCashouts(env);
  const fail = await sign({ id: 'w-1', status: 'FAILED', unique_external_id: c2.cashout.id });
  await C.ipn(fail, env);
  await C.ipn(await sign({ id: 'w-1', status: 'FAILED', unique_external_id: c2.cashout.id }), env);
  assert.equal((await C.account(env, W)).micro, '4000000');
  // ringkasan admin: terjual 10 (presale tidak berkurang), buyback 6 (yang 4 dikembalikan ke member)
  const av = await C.adminView(env);
  assert.equal(av.totals.soldViaNowpayments, '10');
  assert.equal(av.totals.boughtBack, '6');
  assert.equal(av.buyback.coins, '6');
  assert.equal(av.totals.heldByMembers, '4');
  assert.equal(av.ipnUrl, 'https://axto.io/api/nowpayments/ipn');
});

test('tanpa kredensial payout: pencairan tetap antre (tidak hilang), admin melihatnya', async () => {
  const env = ENV();
  delete env.NOWPAYMENTS_2FA_SECRET;
  const state = {};
  globalThis.fetch = fakeNP(state);
  const r = await C.buy(env, W, { usd: 100, cur: 'bnb-bsc', payer: '0xabababababababababababababababababababab', agree: true, agreementV: C.AGREEMENT_V }, { lang: 'en', base: 'https://axto.io' });
  await C.applyPayment(env, r.order.id, { ...state.payment, payment_status: 'finished' });
  const c = await C.requestCashout(env, W, { coins: '10', cur: 'bnb-bsc', addr: '0xabababababababababababababababababababab', agree: true });
  assert.equal(c.cashout.status, 'awaiting_payout_setup');
  assert.deepEqual(await C.processCashouts(env), { processed: 0, waiting: 1, reason: 'payout_credentials_missing' });
  assert.equal(state.payouts, undefined);
});
