/**
 * Staking koin AXTO di worker (pemilik, 24 Nov 2026 — aturan lengkap di engine/src/stake.js).
 *
 * Alur
 *   Kunci:   member memilih jumlah koin utuh, lama kunci (3 / 6 / 12 bulan) dan alamat penerima hadiah (Base). Koin
 *            dipotong dari saldo (idempoten per staking), hadiah langsung diundi dari stok acak tiap tier koleksi
 *            „AXTO Staking" (1/1) dan langsung tampil di Portal member — belum bisa dikirim.
 *   Selesai: cron worker (tiap 5 menit) melepas staking yang jatuh tempo: koin kembali ke saldo, staking masuk antrean
 *            kirim. Mesin di GitHub Actions (market/opensea-list.mjs, wallet toko) mengirim NFT hadiahnya ke alamat
 *            penerima dengan transferBatch — gas ditanggung axto.io (gratis untuk member).
 *
 * Masa staking (pemilik, 24 Nov 2026: „Staking stop saat release dex"): staking baru hanya diterima SEBELUM koin AXTO
 * dirilis ke DEX. Begitu rilis DEX, pintu staking ditutup; kontrak yang sudah berjalan tetap selesai sesuai masanya dan
 * hadiahnya tetap dikirim tanpa gas.
 *
 * Penyimpanan: R2 saja (aturan pemilik). Satu dokumen per staking (tulis-sekali + CAS), indeks per member & per tanggal
 * jatuh tempo (tulis-sekali, metadata), kursor stok per tier (CAS, ≤ 4 tulis per staking), log koin append-only.
 */
import { getJSON, readJSON, createOnce, update, casMeta, listKeys, appendLog } from './r2.js';
import { adjust, MICRO, account, coinCfg } from './coin.js';
import { STAKE_TERMS, REWARD_TIERS, stakeRewards, rewardTotal, scanPool, poolIds, STAKE_WORKS } from '../../engine/src/stake.js';

export const STAKE_AGREEMENT_V = '2026-11-24.1';
const TIERS = Object.keys(REWARD_TIERS); // classic, rare, epic, masterpiece
const posKey = (id) => `stake/pos/${id}.json`;
const poolKey = (tier) => `stake/pool/${tier}.json`;
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, '');
const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const isEvm = (a) => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a);
const meta = (p) => ({ w: p.wallet, st: p.status, c: String(p.coins), m: String(p.months), end: String(p.end) });

/** Akhir kontrak: tanggal yang sama `months` bulan kemudian (UTC). */
export function endOf(start, months) {
  const d = new Date(start);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.getTime();
}

/** Pratinjau publik: hadiah untuk jumlah & lama kunci, serta sisa stok tiap tier. */
/** Staking masih dibuka? (ditutup saat koin AXTO dirilis ke DEX) */
export async function isOpen(env) {
  return !(await coinCfg(env)).dexReleased;
}

export async function quote(env, { coins, months }) {
  if (!(await isOpen(env))) return { error: 'closed' };
  const r = stakeRewards(coins, Number(months));
  if (!r) return { error: 'amount' };
  const left = {};
  for (const t of TIERS) left[t] = STAKE_WORKS - Number((await readJSON(env.STORE, poolKey(t)))?.next ?? 0);
  return { coins: Math.floor(Number(coins)), months: Number(months), rewards: r, total: rewardTotal(r), positionsLeft: left };
}

/** Undi hadiah satu tier dari kursor stoknya (CAS). Mengembalikan rentang posisi [from, to). */
async function allocate(env, tier, count) {
  let range = null;
  await update(env.STORE, poolKey(tier), (cur) => {
    const from = Number(cur?.next ?? 0);
    const s = scanPool(tier, from, count);
    if (s.got < count) throw Object.assign(new Error('stock'), { code: 'stock' });
    range = { tier, from, to: s.to, count };
    return { next: s.to, given: Number(cur?.given ?? 0) + count, at: Date.now() };
  });
  return range;
}

/** Kunci koin. b = {coins, months, payout, agree, agreementV}. */
export async function lock(env, wallet, b, now = Date.now()) {
  const months = Number(b.months);
  const coins = Number(b.coins);
  if (!STAKE_TERMS[months]) return { error: 'months' };
  if (!Number.isSafeInteger(coins) || coins < 1 || coins > 20_000_000) return { error: 'amount' };
  const payout = String(b.payout ?? wallet).trim();
  if (!isEvm(payout)) return { error: 'payout_address' };
  if (b.agree !== true || b.agreementV !== STAKE_AGREEMENT_V) return { error: 'agreement' };
  if (!(await isOpen(env))) return { error: 'closed' }; // staking berhenti saat rilis DEX
  const rewards = stakeRewards(coins, months);
  const id = `${now.toString(36)}${hex(crypto.getRandomValues(new Uint8Array(5)))}`;
  const micro = BigInt(coins) * MICRO;
  try {
    await adjust(env, wallet, -micro, { ev: 'stake_lock', stake: id, coins, months }, `stake:${id}`);
  } catch (e) {
    return { error: e.message === 'balance' ? 'balance' : 'retry' };
  }
  const ranges = [];
  try {
    for (const t of TIERS) if (rewards[t] > 0) ranges.push(await allocate(env, t, rewards[t]));
  } catch (e) {
    await adjust(env, wallet, micro, { ev: 'stake_refund', stake: id, reason: e.code ?? 'retry' }, `stake-refund:${id}`);
    if (ranges.length) await appendLog(env.STORE, 'stake', { ev: 'orphan_ranges', stake: id, ranges }, now); // posisi stok terpakai tanpa pemilik
    return { error: e.code === 'stock' ? 'stock' : 'retry' };
  }
  const end = endOf(now, months);
  const pos = { id, wallet: wallet.toLowerCase(), coins, micro: micro.toString(), months, start: now, end, payout, rewards, ranges, sent: {}, status: 'locked', agreement: { v: STAKE_AGREEMENT_V, at: now }, at: now };
  await createOnce(env.STORE, posKey(id), pos, meta(pos));
  await createOnce(env.STORE, `coin/by/${pos.wallet}/k/${id}`, { id });
  await createOnce(env.STORE, `stake/due/${ymd(end)}/${id}`, { id }, { end: String(end) });
  await appendLog(env.STORE, 'stake', { ev: 'lock', stake: id, wallet: pos.wallet, coins, months, end, total: rewardTotal(rewards) }, now);
  return { ok: true, stake: publicPos(pos) };
}

/** Pratinjau token hadiah per tier (beberapa pertama) — untuk ditampilkan langsung setelah staking. */
export function preview(pos, per = 8) {
  const out = {};
  for (const r of pos.ranges ?? []) out[r.tier] = poolIds(r.tier, r.from, r.to, { limit: per });
  return out;
}

export function publicPos(p) {
  return { id: p.id, coins: p.coins, months: p.months, start: p.start, end: p.end, payout: p.payout, rewards: p.rewards, total: rewardTotal(p.rewards), sent: p.sent ?? {}, status: p.status, preview: preview(p), tx: (p.tx ?? []).slice(-5) };
}

/** Portal member: semua staking milik wallet ini. */
export async function memberView(env, wallet) {
  const keys = await listKeys(env.STORE, `coin/by/${wallet.toLowerCase()}/k/`, 500);
  const list = [];
  for (const k of keys) {
    const p = await readJSON(env.STORE, posKey(k.key.split('/').pop()));
    if (p) list.push(publicPos(p));
  }
  list.sort((a, b) => b.start - a.start);
  const acct = await account(env, wallet);
  return { open: await isOpen(env), stakes: list, lockedCoins: list.filter((p) => p.status === 'locked').reduce((a, p) => a + p.coins, 0), balanceMicro: acct.micro, agreementV: STAKE_AGREEMENT_V };
}

/** Halaman token hadiah satu staking (24 per halaman). */
export async function items(env, wallet, id, tier, page = 0) {
  const p = await readJSON(env.STORE, posKey(id));
  if (!p || p.wallet !== wallet.toLowerCase()) return null;
  const r = (p.ranges ?? []).find((x) => x.tier === tier);
  if (!r) return { ids: [], count: 0 };
  const per = 24;
  return { ids: poolIds(tier, r.from, r.to, { offset: page * per, limit: per }), count: r.count, page, per };
}

/** Cron: lepas staking yang jatuh tempo — koin kembali ke saldo, hadiah masuk antrean kirim (gas oleh axto.io). */
export async function processDue(env, now = Date.now(), max = 50) {
  const today = ymd(now);
  let n = 0;
  for (const o of await listKeys(env.STORE, 'stake/due/', 1000)) {
    if (n >= max) break;
    const [, , day, id] = o.key.split('/');
    if (day > today) break; // kunci terurut menurut tanggal
    const p = await readJSON(env.STORE, posKey(id));
    if (!p || p.end > now) continue;
    if (p.status === 'locked') {
      await adjust(env, p.wallet, BigInt(p.micro), { ev: 'stake_unlock', stake: id, coins: p.coins }, `stake-unlock:${id}`);
      await casMeta(env.STORE, posKey(id), (cur) => (cur && cur.status === 'locked' ? { ...cur, status: rewardTotal(cur.rewards) ? 'sending' : 'done', matured: now } : undefined), meta);
      if (rewardTotal(p.rewards)) await createOnce(env.STORE, `stake/send/${id}`, { id, at: now });
      await appendLog(env.STORE, 'stake', { ev: 'mature', stake: id, wallet: p.wallet, coins: p.coins }, now);
    }
    await env.STORE.delete(o.key);
    n += 1;
  }
  return n;
}

/** Internal (mesin wallet toko): batch berikutnya yang harus dikirim — maks `limit` token per staking. */
export async function pendingSends(env, limit = 300) {
  const out = [];
  for (const o of await listKeys(env.STORE, 'stake/send/', 20)) {
    const id = o.key.split('/').pop();
    const p = await readJSON(env.STORE, posKey(id));
    if (!p || p.status !== 'sending') { await env.STORE.delete(o.key); continue; }
    const r = (p.ranges ?? []).find((x) => Number(p.sent?.[x.tier] ?? 0) < x.count);
    if (!r) continue;
    const done = Number(p.sent?.[r.tier] ?? 0);
    out.push({ id, payout: p.payout, tier: r.tier, offset: done, ids: poolIds(r.tier, r.from, r.to, { offset: done, limit }) });
  }
  return out;
}

/** Internal: catat batch terkirim (idempoten per offset). Semua terkirim → status 'done'. */
export async function markSent(env, { id, tier, offset, count, tx }) {
  let finished = false;
  let changed = false;
  await casMeta(env.STORE, posKey(id), (cur) => {
    if (!cur || cur.status !== 'sending') return undefined;
    const done = Number(cur.sent?.[tier] ?? 0);
    if (done !== Number(offset)) return undefined; // batch ini sudah dicatat
    const sent = { ...(cur.sent ?? {}), [tier]: done + Number(count) };
    finished = (cur.ranges ?? []).every((r) => Number(sent[r.tier] ?? 0) >= r.count);
    changed = true;
    return { ...cur, sent, tx: [...(cur.tx ?? []).slice(-50), { tier, offset: Number(offset), count: Number(count), tx: String(tx ?? '') }], status: finished ? 'done' : 'sending' };
  }, meta);
  if (finished) await env.STORE.delete(`stake/send/${id}`);
  return { ok: changed, finished };
}

/** Portal admin: ringkasan seluruh staking. */
export async function adminView(env) {
  const all = await listKeys(env.STORE, 'stake/pos/', 100_000);
  const t = { positions: all.length, locked: 0, lockedCoins: 0, sending: 0, done: 0, byMonths: { 3: 0, 6: 0, 12: 0 } };
  for (const o of all) {
    const m = o.customMetadata ?? {};
    if (m.st === 'locked') { t.locked += 1; t.lockedCoins += Number(m.c ?? 0); }
    if (m.st === 'sending') t.sending += 1;
    if (m.st === 'done') t.done += 1;
    t.byMonths[m.m] = (t.byMonths[m.m] ?? 0) + 1;
  }
  const pools = {};
  for (const tier of TIERS) pools[tier] = (await readJSON(env.STORE, poolKey(tier))) ?? { next: 0, given: 0 };
  return { open: await isOpen(env), totals: t, pools, works: STAKE_WORKS };
}

export { getJSON };
