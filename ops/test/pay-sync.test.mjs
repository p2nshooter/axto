import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { run, call, BASE } from '../pay-sync.mjs';

const KEY = 'KEY-1';
const SECRET = 'secret-1';
const HM = 'hmac-1';

function fake(state) {
  return async (url, init = {}) => {
    const u = new URL(String(url));
    const ok = (j, status = 200) => new Response(JSON.stringify(j), { status, headers: { 'content-type': 'application/json' } });
    if (u.origin === BASE) {
      assert.equal(init.method ?? 'GET', 'GET', 'hanya baca');
      assert.equal(init.headers['X-APIKEY'], KEY);
      assert.equal(init.headers.Sign, createHmac('sha256', SECRET).update(u.search.slice(1)).digest('hex'));
      const q = Object.fromEntries(u.searchParams);
      state.calls.push(`${u.pathname}:${q.coin}`);
      if (u.pathname === '/api/v2/capital/deposit/address/list') {
        assert.equal(q.network, undefined, 'satu panggilan per koin');
        if (q.coin === 'USDT') return ok([{ coin: 'USDT', address: '0xabc', tag: '', network: 'bep20' }, { coin: 'USDT', address: '', tag: '', network: 'xpl' }]);
        if (q.coin === 'BTC') return ok([{ coin: 'BTC', address: '1Boat', tag: '', network: 'mainnet' }]);
        return ok([{ coin: q.coin, address: '', tag: '', network: 'erc20' }]);
      }
      if (u.pathname === '/api/v2/capital/deposit/hisrec') return ok(q.coin === 'USDT' ? [{ id: '1', amount: '10.00001234', coin: 'USDT', txId: '0x1', status: 'success', insertTime: 1, completeTime: 1 }] : []);
      return ok({ code: -1, msg: 'x' }, 400);
    }
    if (String(url) === 'https://axto.io/internal/pay/ingest') {
      const body = String(init.body);
      assert.equal(init.headers['x-axto-sig'], createHmac('sha256', HM).update(`${init.headers['x-axto-ts']}.${body}`).digest('hex'), 'HMAC engine');
      const j = JSON.parse(body);
      state.posts.push(j);
      return ok({ ok: true, options: j.addresses ? ['usdt:bep20', 'btc:btc'] : undefined, seen: 1, matched: j.deposits ? 1 : 0 });
    }
    return ok({}, 404);
  };
}

test('runner: alamat per koin sekali, riwayat deposit koin yang punya alamat berulang, dikirim ke worker dengan HMAC', async () => {
  const state = { calls: [], posts: [] };
  let t = 0;
  const r = await run({ fetchImpl: fake(state), key: KEY, secret: SECRET, hmacKey: HM, budgetMs: 50, pollMs: 20, now: () => (t += 10), sleep: async () => {}, log: () => {} });
  assert.deepEqual(r.coins, ['usdt', 'btc'], 'hanya koin yang punya alamat');
  assert.equal(state.calls.filter((c) => c.startsWith('/api/v2/capital/deposit/address/list')).length, 10);
  assert.ok(r.rounds >= 1);
  assert.ok(state.posts[0].addresses.some((a) => a.network === 'mainnet'));
  assert.equal(state.posts.slice(1).every((p) => Object.keys(p.deposits).join() === 'usdt,btc'), true);
  assert.equal(r.matched, r.rounds);
});

test('runner: hanya titik baca; tanpa kunci tidak memanggil apa pun', async () => {
  await assert.rejects(call(globalThis.fetch, KEY, SECRET, '/api/v2/capital/withdraw/apply', {}), /gw:method/);
  const state = { calls: [], posts: [] };
  const r = await run({ fetchImpl: fake(state), key: '', secret: '', hmacKey: HM, log: () => {} });
  assert.equal(r.waiting, 'key');
  assert.equal(state.calls.length, 0);
});
