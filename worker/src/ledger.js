/**
 * Durable Object "Ledger" — satu instance ("main") untuk semua koleksi, supaya hold USDC/AXTO lintas koleksi
 * dihitung di satu tempat. DO hanya koordinator (antrean tunggal, memori); setiap perubahan ditulis ke R2
 * (sistem pencatatan, aturan pemilik: R2 saja, jangan pernah D1).
 *
 * Kunci R2:
 *   e/<c>/state.json        produksi: {produced, cursor, requeue[], batches}
 *   e/<c>/sold.bin          snapshot bitset terjual (ditulis tick, maks 1×/5 menit)
 *   r/<c>/<k>.json          segel ronde k: {k, startAt, endAt, sealAt, tokens[]}
 *   l/<c>/<id>.json         lot aktif / buku penawaran (hanya yang punya tawaran)
 *   h/<c>/<id>.json         lot selesai (riwayat)
 *   log/<stream>/...        log append-only (bid, sold, seal, close, cascade)
 */
import { DurableObject } from 'cloudflare:workers';
import * as A from '../../engine/src/auction.js';
import { COLLECTIONS } from '../../engine/src/core.js';
import { readJSON, putJSON, appendLog, listKeys, createOnce } from './r2.js';
import { vault } from './vault.js';
import { recover, domainSeparator, bidStructHash, typedHash, lotIdHex, spendable, ownerOf, isAddress } from './eth.js';

export const KEYS = Object.keys(COLLECTIONS);
const currencyOf = (c) => (COLLECTIONS[c].exclusive ? 'AXTO' : 'USDC');
/**
 * lotId stabil per token untuk penjualan primer (penawaran menunggu tetap sah saat masuk ronde; lot yang di-requeue
 * belum pernah settled sehingga lotId sama tetap bisa dipakai). Replay dicegah nonce Bid + deadline attestasi.
 * Resale marketplace eksklusif memakai lotId baru: `axto:<c>:<id>:r<n>`.
 */
const lotKey = (c, id) => `axto:${c}:${id}`;

export class Ledger extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.s = {}; // per koleksi: {state, sold:Uint8Array, soldDirty, rounds: Map k→seal, inRound: Map id→k, lots: Map id→lot}
    ctx.blockConcurrencyWhile(() => this.load());
  }

  get genesis() { return Number(this.env.GENESIS_MS || 0); }

  async load() {
    const B = this.env.STORE;
    for (const c of KEYS) {
      const max = COLLECTIONS[c].max;
      const state = (await readJSON(B, `e/${c}/state.json`)) ?? { produced: 0, cursor: 0, requeue: [], batches: 0, soldAt: 0 };
      const snap = await B.get(`e/${c}/sold.bin`);
      const sold = snap ? new Uint8Array(await snap.arrayBuffer()) : new Uint8Array(Math.ceil((max + 1) / 8));
      const x = { state, sold, soldDirty: false, rounds: new Map(), inRound: new Map(), lots: new Map() };
      // putar ulang log terjual sejak snapshot
      for (const day of daysSince(state.soldAt)) {
        for (const o of await listKeys(B, `log/sold-${c}/${day}/`, 100_000)) {
          const ev = await readJSON(B, o.key);
          if (ev && ev.at >= state.soldAt) setBit(sold, ev.tokenId);
        }
      }
      if (this.genesis) {
        const r = A.roundAt(this.genesis, Date.now());
        for (const k of [r.k - 1, r.k, r.k + 1]) {
          if (k < 0) continue;
          const seal = await readJSON(B, `r/${c}/${k}.json`);
          if (seal) this.indexSeal(x, seal);
        }
      }
      for (const o of await listKeys(B, `l/${c}/`, 1_000_000)) {
        const lot = await readJSON(B, o.key);
        if (lot) x.lots.set(lot.tokenId, lot);
      }
      this.s[c] = x;
    }
  }

  indexSeal(x, seal) {
    x.rounds.set(seal.k, seal);
    for (const id of seal.tokens) x.inRound.set(id, seal.k);
  }

  isSold(c, id) { return getBit(this.s[c].sold, id); }

  /** Semua hold aktif (lintas koleksi) untuk satu mata uang. Map lotKey → {bidder, amount}. */
  holds(currency) {
    const m = new Map();
    for (const c of KEYS) {
      if (currencyOf(c) !== currency) continue;
      for (const lot of this.s[c].lots.values()) {
        if (lot.status === 'awaiting_claim') m.set(lot.lotId, { bidder: lot.winner.bidder, amount: lot.winner.amount });
        else if ((lot.status === 'live' || lot.status === 'offer') && lot.leader) m.set(lot.lotId, { bidder: lot.leader, amount: A.holdOf(lot) });
      }
    }
    return m;
  }

  async persistLot(c, lot) {
    await putJSON(this.env.STORE, `l/${c}/${lot.tokenId}.json`, lot, { status: lot.status });
  }

  // ---------------- produksi (engine) ----------------
  /** Engine melapor batch yang lolos QA: token from..to (urut produksi). Idempoten. */
  async commit({ c, from, to, root }) {
    const x = this.s[c];
    if (!x) throw new Error('collection');
    const max = COLLECTIONS[c].max;
    if (!(Number.isSafeInteger(from) && Number.isSafeInteger(to) && from >= 1 && to >= from && to <= max)) throw new Error('range');
    if (from !== x.state.produced + 1) {
      if (to <= x.state.produced) return { ok: true, duplicate: true, produced: x.state.produced };
      throw new Error(`gap: expected ${x.state.produced + 1}`);
    }
    const ok = await createOnce(this.env.STORE, `e/${c}/batch/${String(from).padStart(7, '0')}-${String(to).padStart(7, '0')}.json`, { from, to, root, at: Date.now() });
    if (!ok) return { ok: true, duplicate: true, produced: x.state.produced };
    x.state.produced = to;
    x.state.batches += 1;
    await putJSON(this.env.STORE, `e/${c}/state.json`, x.state);
    return { ok: true, produced: to };
  }

  engineState(c) {
    const x = this.s[c];
    return { produced: x.state.produced, max: COLLECTIONS[c].max, enabled: !x.state.paused };
  }

  // ---------------- statistik & daftar ----------------
  stats() {
    const now = Date.now();
    const out = { genesis: this.genesis, collections: {} };
    for (const c of KEYS) {
      const x = this.s[c];
      let live = 0;
      for (const [, k] of x.inRound) { const s = x.rounds.get(k); if (s && now >= s.startAt && now < s.endAt + A.SNIPE_MAX_EXT_MS) live += 1; }
      out.collections[c] = { produced: x.state.produced, sold: popcount(x.sold), live, ready: this.readyCount(c), currency: currencyOf(c) };
    }
    if (this.genesis) out.round = A.roundAt(this.genesis, now);
    return out;
  }

  readyCount(c) {
    const x = this.s[c];
    return Math.max(0, x.state.produced - popcount(x.sold) - x.inRound.size);
  }

  /** Lot live: filter & urut. sort: ending|highest|lowest. */
  lots(c, { sort = 'ending', limit = 48, offset = 0 } = {}) {
    const x = this.s[c];
    const now = Date.now();
    const rows = [];
    for (const [id, k] of x.inRound) {
      const seal = x.rounds.get(k);
      if (!seal || now < seal.startAt) continue;
      const lot = x.lots.get(id);
      const endAt = lot?.endAt ?? seal.endAt;
      if (now >= endAt && (!lot || lot.status !== 'live')) continue;
      rows.push({ tokenId: id, price: lot?.price ?? 0, start: lot?.start ?? A.startUnits(A.START_USD, currencyOf(c)), endAt, bids: lot?.bids.length ?? 0, status: lot?.status ?? 'live' });
    }
    const by = { ending: (a, b) => a.endAt - b.endAt || a.tokenId - b.tokenId, highest: (a, b) => b.price - a.price || a.tokenId - b.tokenId, lowest: (a, b) => a.price - b.price || a.tokenId - b.tokenId }[sort] ?? (() => 0);
    rows.sort(by);
    return { total: rows.length, currency: currencyOf(c), rows: rows.slice(offset, offset + limit) };
  }

  /** Stok menunggu dengan penawaran: tertinggi → terendah (atau sebaliknya). */
  offers(c, { order = 'desc', limit = 48, offset = 0 } = {}) {
    const rows = [...this.s[c].lots.values()].filter((l) => l.status === 'offer' && l.leader).map((l) => ({ tokenId: l.tokenId, price: l.price, bids: l.bids.length }));
    rows.sort((a, b) => (order === 'asc' ? a.price - b.price : b.price - a.price) || a.tokenId - b.tokenId);
    return { total: rows.length, currency: currencyOf(c), rows: rows.slice(offset, offset + limit) };
  }

  lot(c, id) {
    const x = this.s[c];
    const k = x.inRound.get(id);
    const seal = k !== undefined ? x.rounds.get(k) : null;
    const lot = x.lots.get(id);
    const ready = id <= x.state.produced;
    const status = this.isSold(c, id) ? 'sold' : lot?.status ?? (seal ? (Date.now() < seal.startAt ? 'sealed' : 'live') : ready ? 'waiting' : 'not_produced');
    return {
      tokenId: id, collection: c, lotId: lot?.lotId ?? lotIdHex(lotKey(c, id)), currency: currencyOf(c), status, round: k ?? null,
      startAt: seal?.startAt ?? null, endAt: lot?.endAt ?? seal?.endAt ?? null,
      start: lot?.start ?? A.startUnits(A.START_USD, currencyOf(c)), price: lot?.price ?? 0,
      leader: lot?.leader ?? null, minFixed: lot ? A.minNext(lot, 'fixed') : A.startUnits(A.START_USD, currencyOf(c)),
      minProxy: lot ? A.minNext(lot, 'proxy') : A.startUnits(A.START_USD, currencyOf(c)),
      bids: (lot?.bids ?? []).map((b) => ({ bidder: b.bidder, kind: b.kind, at: b.at })).slice(-50),
      winner: lot?.winner ?? null, claim: lot?.claim ? { until: lot.claim.until, ready: Boolean(lot.claim.att) } : null,
    };
  }

  // ---------------- menawar ----------------
  /**
   * bid: {c, tokenId, bidder, kind, units, nonce, deadline, sig}. Tanda tangan EIP-712 Bid wajib dari bidder;
   * units = jumlah tetap atau batas proxy (unit 0,01 USDC / 0,001 AXTO).
   */
  async bid(b) {
    const { c, tokenId, bidder, kind } = b;
    const x = this.s[c];
    if (!x) return { ok: false, error: 'collection' };
    if (!Number.isSafeInteger(tokenId) || tokenId < 1 || tokenId > COLLECTIONS[c].max) return { ok: false, error: 'token' };
    if (!isAddress(bidder)) return { ok: false, error: 'bidder' };
    if (this.isSold(c, tokenId)) return { ok: false, error: 'sold' };
    if (tokenId > x.state.produced) return { ok: false, error: 'not_produced' };
    const now = Date.now();
    if (!(Number(b.deadline) * 1000 > now + 3_600_000)) return { ok: false, error: 'deadline' };
    const cur = currencyOf(c);
    const k = x.inRound.get(tokenId);
    const seal = k !== undefined ? x.rounds.get(k) : null;
    if (seal && now < seal.startAt) return { ok: false, error: 'sealed_not_live' };
    let lot = x.lots.get(tokenId);
    if (!lot) {
      lot = A.newLot({ lotId: lotIdHex(lotKey(c, tokenId)), collection: c, tokenId, currency: cur, endAt: seal ? seal.endAt : null });
      lot.round = k ?? null;
    }
    // verifikasi tanda tangan Bid (EIP-712) — inilah yang nanti diperiksa kontrak saat klaim
    const env = this.env;
    const domain = domainSeparator({ name: 'AXTO Auction House', version: '1', chainId: Number(env.CHAIN_ID), verifyingContract: env.AUCTION_HOUSE });
    const msg = { lotId: lot.lotId, collection: env[`COLLECTION_${c.replace('-', '_').toUpperCase()}`], tokenId, currency: cur === 'USDC' ? env.USDC : env.AXTO_TOKEN, maxAmount: BigInt(A.toBase(b.units, cur)), nonce: BigInt(b.nonce), deadline: BigInt(b.deadline) };
    let signer;
    try { signer = recover(typedHash(domain, bidStructHash(msg)), b.sig); } catch { return { ok: false, error: 'bad_signature' }; }
    if (signer.toLowerCase() !== bidder.toLowerCase()) return { ok: false, error: 'bad_signature' };
    // dana di wallet member sendiri: min(saldo, allowance ke AuctionHouse) − hold di lot lain
    const onchain = A.fromBase((await spendable(env.BASE_RPC, msg.currency, bidder, env.AUCTION_HOUSE)).toString(), cur);
    const available = A.availableFor(signer, onchain, this.holds(cur), lot.lotId);
    const r = A.placeBid(lot, { bidder: signer, kind, amount: b.units, max: b.units, sig: { sig: b.sig, nonce: String(b.nonce), deadline: String(b.deadline), units: b.units } }, now, available);
    if (!r.ok) return r;
    x.lots.set(tokenId, lot);
    await this.persistLot(c, lot);
    await appendLog(env.STORE, `bid-${c}`, { tokenId, bidder: signer, kind, units: b.units, price: lot.price, leader: lot.leader });
    return { ok: true, price: lot.price, leader: lot.leader, endAt: lot.endAt, released: r.released ?? null, outbid: Boolean(r.outbidImmediately) };
  }

  // ---------------- jadwal (cron tiap 5 menit) ----------------
  async tick(now = Date.now()) {
    if (!this.genesis) return { skipped: 'genesis' };
    const report = {};
    for (const c of KEYS) report[c] = await this.tickCollection(c, now);
    for (const c of KEYS) await this.flushSold(c);
    return report;
  }

  async tickCollection(c, now) {
    const x = this.s[c];
    const B = this.env.STORE;
    const r = A.roundAt(this.genesis, now);
    const done = { sealed: 0, live: 0, closed: 0, cascaded: 0 };
    // 1) segel ronde yang sealAt-nya lewat (1 jam sebelum live): jumlah lot terkunci di sini
    for (const k of [r.k, r.k + 1]) {
      const startAt = this.genesis + k * A.ROUND_MS;
      if (now < startAt - A.SEAL_BEFORE_MS || now >= startAt + A.ROUND_MS || x.rounds.has(k)) continue;
      const existing = await readJSON(B, `r/${c}/${k}.json`);
      if (existing) { this.indexSeal(x, existing); continue; }
      const n = A.sealCount(this.readyCount(c));
      const offered = [...x.lots.values()].filter((l) => l.status === 'offer' && l.leader).map((l) => ({ tokenId: l.tokenId, price: l.price }));
      const tokens = A.selectLots(offered, this.fifo(c), n);
      const seal = { k, startAt, endAt: startAt + A.ROUND_MS, sealAt: now, tokens };
      if (!(await createOnce(B, `r/${c}/${k}.json`, seal))) continue;
      this.indexSeal(x, seal);
      const sel = new Set(tokens);
      x.state.requeue = x.state.requeue.filter((id) => !sel.has(id));
      x.state.cursor = Math.max(x.state.cursor, ...tokens.filter((id) => id > x.state.cursor), x.state.cursor);
      await putJSON(B, `e/${c}/state.json`, x.state);
      await appendLog(B, `seal-${c}`, { k, n: tokens.length });
      done.sealed += tokens.length;
    }
    // 2) live: buku penawaran yang masuk ronde menjadi lot live saat startAt
    for (const lot of x.lots.values()) {
      if (lot.status !== 'offer') continue;
      const k = x.inRound.get(lot.tokenId);
      const seal = k !== undefined ? x.rounds.get(k) : null;
      if (seal && now >= seal.startAt) {
        A.goLive(lot, seal.endAt);
        lot.round = k;
        await this.persistLot(c, lot);
        done.live += 1;
      }
    }
    // 3) tutup ronde yang berakhir
    for (const [k, seal] of x.rounds) {
      if (now < seal.endAt) continue;
      let pending = false;
      for (const id of seal.tokens) {
        if (x.inRound.get(id) !== k) continue;
        const lot = x.lots.get(id);
        if (lot && lot.status === 'live') {
          if (now < lot.endAt) { pending = true; continue; }
          A.close(lot, now);
          if (lot.status === 'awaiting_claim') {
            await this.attest(c, lot);
            await this.persistLot(c, lot);
            await appendLog(B, `close-${c}`, { tokenId: id, winner: lot.winner });
            done.closed += 1;
            continue;
          }
        }
        if (!lot || lot.status === 'unsold') {
          x.inRound.delete(id);
          if (lot) { x.lots.delete(id); await B.delete(`l/${c}/${id}.json`); }
          if (!this.isSold(c, id)) x.state.requeue.push(id);
        }
      }
      if (!pending && seal.tokens.every((id) => x.inRound.get(id) !== k || x.lots.get(id)?.status !== 'live')) {
        if (now >= seal.endAt + A.SNIPE_MAX_EXT_MS + A.CLAIM_WINDOW_MS * (A.MAX_CASCADE + 1)) x.rounds.delete(k);
      }
    }
    // 4) klaim: kedaluwarsa → periksa on-chain, lalu cascade
    for (const lot of x.lots.values()) {
      if (lot.status !== 'awaiting_claim') continue;
      if (await this.checkClaimed(c, lot)) continue;
      if (now < lot.claim.until) continue;
      const cur = currencyOf(c);
      const holds = this.holds(cur);
      const avail = new Map();
      for (const cand of A.cascadeCandidates(lot, lot.failed ?? [])) {
        const token = cur === 'USDC' ? this.env.USDC : this.env.AXTO_TOKEN;
        const units = A.fromBase((await spendable(this.env.BASE_RPC, token, cand.bidder, this.env.AUCTION_HOUSE)).toString(), cur);
        avail.set(cand.bidder, A.availableFor(cand.bidder, units, holds, lot.lotId));
      }
      A.cascade(lot, now, (who) => avail.get(who) ?? 0);
      if (lot.status === 'awaiting_claim') { await this.attest(c, lot); await this.persistLot(c, lot); }
      else { // requeue
        x.lots.delete(lot.tokenId);
        x.inRound.delete(lot.tokenId);
        await B.delete(`l/${c}/${lot.tokenId}.json`);
        x.state.requeue.push(lot.tokenId);
      }
      await appendLog(B, `cascade-${c}`, { tokenId: lot.tokenId, status: lot.status, winner: lot.winner });
      done.cascaded += 1;
    }
    await putJSON(B, `e/${c}/state.json`, x.state);
    return done;
  }

  /** Urutan stok siap: requeue dulu, lalu token baru setelah cursor; lewati terjual & yang sudah di ronde. */
  *fifo(c) {
    const x = this.s[c];
    for (const id of x.state.requeue) if (!this.isSold(c, id) && !x.inRound.has(id)) yield id;
    for (let id = x.state.cursor + 1; id <= x.state.produced; id += 1) if (!this.isSold(c, id) && !x.inRound.has(id)) yield id;
  }

  /** Minta attestasi hasil lelang ke vault (kunci signer hanya di vault). */
  async attest(c, lot) {
    const env = this.env;
    const sig = lot.bids.filter((b) => b.bidder === lot.winner.bidder).at(-1)?.sig;
    if (!sig) return;
    const exclusive = COLLECTIONS[c].exclusive;
    const res = {
      lotId: lot.lotId, collection: env[`COLLECTION_${c.replace('-', '_').toUpperCase()}`], tokenId: String(lot.tokenId), winner: lot.winner.bidder,
      currency: exclusive ? env.AXTO_TOKEN : env.USDC, price: A.toBase(lot.winner.amount, currencyOf(c)), seller: '0x0000000000000000000000000000000000000000', // primer: 100% treasury
      mode: exclusive ? 2 : 0, deadline: String(Math.floor((lot.claim.until + 3_600_000) / 1000)),
    };
    try {
      const att = await vault(env, 'attestResult', { result: res, bid: { maxUnits: sig.units, nonce: sig.nonce, deadline: sig.deadline, sig: sig.sig } });
      lot.claim.att = { result: res, sig: att.sig, bid: { lotId: lot.lotId, collection: res.collection, tokenId: res.tokenId, currency: res.currency, maxAmount: A.toBase(sig.units, currencyOf(c)), nonce: sig.nonce, deadline: sig.deadline }, bidSig: sig.sig };
    } catch (e) {
      await appendLog(env.STORE, 'error', { where: 'attest', c, tokenId: lot.tokenId, e: String(e) });
    }
  }

  /** Data klaim untuk pemenang (dipanggil dari portal member). */
  claimData(c, tokenId, wallet) {
    const lot = this.s[c].lots.get(tokenId);
    if (!lot || lot.status !== 'awaiting_claim' || lot.winner.bidder.toLowerCase() !== String(wallet).toLowerCase() || !lot.claim.att) return null;
    return { until: lot.claim.until, ...lot.claim.att };
  }

  /** Publik: sudah di-mint ke pemenang? Eksklusif: AuctionHouse mencatat kustodi → vault memastikan event. */
  async checkClaimed(c, lot) {
    const env = this.env;
    let done = false;
    if (!COLLECTIONS[c].exclusive) {
      const owner = await ownerOf(env.BASE_RPC, env[`COLLECTION_${c.toUpperCase()}`], lot.tokenId);
      done = owner && owner.toLowerCase() === lot.winner.bidder.toLowerCase();
    } else {
      try { done = Boolean((await vault(env, 'isSettled', { lotId: lot.lotId })).settled); } catch { done = false; }
    }
    if (done) await this.markSold(c, lot);
    return done;
  }

  async markSold(c, lot) {
    const x = this.s[c];
    const B = this.env.STORE;
    A.settle(lot, null);
    setBit(x.sold, lot.tokenId);
    x.soldDirty = true;
    x.lots.delete(lot.tokenId);
    x.inRound.delete(lot.tokenId);
    await putJSON(B, `h/${c}/${lot.tokenId}.json`, lot);
    await B.delete(`l/${c}/${lot.tokenId}.json`);
    await appendLog(B, `sold-${c}`, { tokenId: lot.tokenId, winner: lot.winner });
    if (COLLECTIONS[c].exclusive) await createOnce(B, `c/ex-own/${c}/${lot.tokenId}.json`, { owner: lot.winner.bidder, since: Date.now(), lotId: lot.lotId, status: 'custody' });
  }

  async flushSold(c) {
    const x = this.s[c];
    if (!x.soldDirty) return;
    const at = Date.now();
    await this.env.STORE.put(`e/${c}/sold.bin`, x.sold);
    x.state.soldAt = at - 60_000; // tumpang tindih 1 menit: putar ulang log aman (idempoten)
    await putJSON(this.env.STORE, `e/${c}/state.json`, x.state);
    x.soldDirty = false;
  }

  /** Pemenang memberi tahu tx klaim → periksa segera (tidak perlu menunggu tick). */
  async claimed(c, tokenId) {
    const lot = this.s[c].lots.get(tokenId);
    if (!lot || lot.status !== 'awaiting_claim') return { ok: false };
    const ok = await this.checkClaimed(c, lot);
    if (ok) await this.flushSold(c);
    return { ok };
  }
}

const getBit = (b, i) => (b[i >> 3] & (1 << (i & 7))) !== 0;
const setBit = (b, i) => { b[i >> 3] |= 1 << (i & 7); };
function popcount(b) {
  let n = 0;
  for (let i = 0; i < b.length; i += 1) { let v = b[i]; while (v) { v &= v - 1; n += 1; } }
  return n;
}
function daysSince(t) {
  if (!t) return [];
  const out = [];
  for (let d = t - (t % 86_400_000); d <= Date.now(); d += 86_400_000) out.push(new Date(d).toISOString().slice(0, 10));
  return out;
}
