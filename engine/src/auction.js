/**
 * Logika lelang murni (tanpa I/O) — dipakai Durable Object di worker dan tes di engine.
 *
 * Satuan uang = bilangan bulat "unit":
 *   USDC → 1 unit = $0,01 (= 10^4 base unit USDC 6 desimal)
 *   AXTO → 1 unit = 0,001 AXTO (= 10^15 base unit AXTO 18 desimal)
 */
export const HOUR = 3_600_000;
export const ROUND_MS = 72 * HOUR;
export const SEAL_BEFORE_MS = HOUR;
export const SNIPE_WINDOW_MS = 10 * 60_000;
export const SNIPE_MAX_EXT_MS = 60 * 60_000;
export const CLAIM_WINDOW_MS = 48 * HOUR;
export const MAX_CASCADE = 3;
export const ROUND_SHARE = 0.1;

export const CURRENCY = {
  USDC: { unitBase: 10n ** 4n, decimals: 6, unitLabel: 0.01 },
  AXTO: { unitBase: 10n ** 15n, decimals: 18, unitLabel: 0.001 },
};

/** Harga mulai dalam unit. refUsdPerAxto = harga acuan AXTO (presale $10). */
export function startUnits(usd, currency, refUsdPerAxto = 10) {
  if (currency === 'USDC') return Math.round(usd * 100);
  if (currency === 'AXTO') return Math.round((usd / refUsdPerAxto) * 1000);
  throw new Error(`mata uang ${currency}?`);
}

export const toBase = (units, currency) => (BigInt(units) * CURRENCY[currency].unitBase).toString();
export const fromBase = (base, currency) => Number(BigInt(base) / CURRENCY[currency].unitBase);

/** Kenaikan otomatis 10% (dibulatkan ke atas, minimal 1 unit). */
export const inc = (p) => Math.max(1, Math.ceil(p * 0.1));

/** Jadwal ronde: ronde k mulai genesis + k·72 jam. */
export function roundAt(genesis, now) {
  const k = Math.max(0, Math.floor((now - genesis) / ROUND_MS));
  const startAt = genesis + k * ROUND_MS;
  return { k, startAt, endAt: startAt + ROUND_MS, sealAt: startAt - SEAL_BEFORE_MS, nextSealAt: startAt + ROUND_MS - SEAL_BEFORE_MS };
}

/** Jumlah lot yang disegel: 10% stok siap, min 1 (bila ada stok), maks cap. */
export function sealCount(ready, cap = 20_000) {
  if (ready <= 0) return 0;
  return Math.max(1, Math.min(cap, Math.floor(ready * ROUND_SHARE)));
}

/**
 * Pilih token untuk ronde: penawaran tertinggi dulu (stok menunggu), lalu urutan produksi.
 * offered: [{tokenId, price}] ; fifo: iterable tokenId stok siap (urut produksi) ; n: jumlah lot.
 */
export function selectLots(offered, fifo, n) {
  const out = [];
  const taken = new Set();
  for (const o of [...offered].sort((a, b) => b.price - a.price || a.tokenId - b.tokenId)) {
    if (out.length >= n) break;
    out.push(o.tokenId);
    taken.add(o.tokenId);
  }
  for (const t of fifo) {
    if (out.length >= n) break;
    if (!taken.has(t)) out.push(t);
  }
  return out;
}

/** Lot baru (atau buku penawaran stok menunggu: endAt = null). */
export function newLot({ lotId, collection, tokenId, currency, start, endAt = null }) {
  return { lotId, collection, tokenId, currency, start, endAt, origEnd: endAt, price: 0, leader: null, leaderMax: 0, leaderKind: null, bids: [], status: endAt ? 'live' : 'offer', winner: null, claim: null, cascade: 0 };
}

/** Komitmen (hold) pemimpin pada lot ini. */
export const holdOf = (lot) => (lot.leader ? (lot.leaderKind === 'proxy' ? lot.leaderMax : lot.price) : 0);

/** Harga minimum berikutnya untuk jenis tawaran. */
export function minNext(lot, kind) {
  if (!lot.leader) return lot.start;
  return kind === 'proxy' ? lot.price + inc(lot.price) : lot.price + 1;
}

/**
 * Pasang tawaran.
 * bid: {bidder, kind:'fixed'|'proxy', amount (fixed) | max (proxy), at, sig}
 * available: jumlah unit yang bisa dipakai bidder = min(saldo, allowance) − hold aktif di lot LAIN.
 * Mengembalikan {ok, error?, lot, released?: {bidder, amount}} — lot dimutasi hanya bila ok.
 */
export function placeBid(lot, bid, now, available) {
  if (lot.status !== 'live' && lot.status !== 'offer') return { ok: false, error: 'lot_closed' };
  if (lot.endAt && now >= lot.endAt) return { ok: false, error: 'lot_ended' };
  const kind = bid.kind === 'proxy' ? 'proxy' : 'fixed';
  const commit = kind === 'proxy' ? Math.floor(bid.max) : Math.floor(bid.amount);
  if (!Number.isSafeInteger(commit) || commit <= 0) return { ok: false, error: 'bad_amount' };
  const self = lot.leader === bid.bidder;
  if (self) {
    if (kind !== 'proxy' || commit <= lot.leaderMax) return { ok: false, error: 'already_leading' };
    if (available < commit) return { ok: false, error: 'insufficient_funds' };
    lot.leaderMax = commit;
    lot.leaderKind = 'proxy';
    lot.bids.push({ bidder: bid.bidder, kind, max: commit, at: now, sig: bid.sig ?? null });
    return { ok: true, lot };
  }
  const need = minNext(lot, kind);
  if (commit < need) return { ok: false, error: 'too_low', min: need };
  if (available < commit) return { ok: false, error: 'insufficient_funds' };
  const prev = lot.leader ? { bidder: lot.leader, amount: holdOf(lot) } : null;
  lot.bids.push({ bidder: bid.bidder, kind, max: commit, at: now, sig: bid.sig ?? null });
  if (!lot.leader) {
    lot.leader = bid.bidder;
    lot.leaderKind = kind;
    lot.leaderMax = commit;
    lot.price = kind === 'proxy' ? lot.start : commit;
  } else {
    const L = lot.leaderKind === 'proxy' ? lot.leaderMax : lot.price;
    if (commit > L) {
      lot.price = kind === 'proxy' ? Math.min(commit, Math.max(L + inc(L), lot.price + inc(lot.price))) : commit;
      lot.leader = bid.bidder;
      lot.leaderKind = kind;
      lot.leaderMax = commit;
    } else {
      // pemimpin proxy bertahan dan menaikkan harga otomatis (+10%) sampai batasnya
      lot.price = Math.min(L, commit + inc(commit));
      extend(lot, now);
      return { ok: true, lot, outbidImmediately: true };
    }
  }
  extend(lot, now);
  const released = prev && prev.bidder !== lot.leader ? prev : null;
  return { ok: true, lot, released };
}

/** Anti-sniping: tawaran di 10 menit terakhir memperpanjang lot (maks +60 menit dari akhir semula). */
function extend(lot, now) {
  if (!lot.endAt) return;
  if (lot.endAt - now < SNIPE_WINDOW_MS) lot.endAt = Math.min(now + SNIPE_WINDOW_MS, lot.origEnd + SNIPE_MAX_EXT_MS);
}

/** Ubah buku penawaran stok menunggu menjadi lot live saat ronde dimulai. */
export function goLive(lot, endAt) {
  lot.status = 'live';
  lot.endAt = endAt;
  lot.origEnd = endAt;
  return lot;
}

/** Tutup lot: tetapkan pemenang & jendela klaim. Tanpa penawar → kembali ke antrean. */
export function close(lot, now) {
  if (lot.status !== 'live') return lot;
  if (lot.endAt && now < lot.endAt) return lot;
  if (!lot.leader) {
    lot.status = 'unsold';
    return lot;
  }
  lot.status = 'awaiting_claim';
  lot.winner = { bidder: lot.leader, amount: lot.price };
  lot.claim = { until: now + CLAIM_WINDOW_MS };
  return lot;
}

/** Kandidat cascade: penawar lain urut batas tertinggi (satu per bidder), tidak termasuk yang sudah gagal. */
export function cascadeCandidates(lot, failed = []) {
  const best = new Map();
  for (const b of lot.bids) {
    if (b.bidder === lot.winner?.bidder || failed.includes(b.bidder)) continue;
    if ((best.get(b.bidder)?.max ?? -1) < b.max) best.set(b.bidder, b);
  }
  return [...best.values()].filter((b) => b.max >= lot.start).sort((a, b) => b.max - a.max || a.at - b.at);
}

/**
 * Pemenang tidak klaim / dananya kurang → turunkan hak ke penawar berikutnya yang dananya cukup.
 * availableOf(bidder) → unit tersedia. Mengembalikan lot (status awaiting_claim baru, atau 'requeue').
 */
export function cascade(lot, now, availableOf) {
  if (lot.status !== 'awaiting_claim') return lot;
  lot.failed = [...(lot.failed ?? []), lot.winner.bidder];
  if (lot.cascade >= MAX_CASCADE) {
    lot.status = 'requeue';
    return lot;
  }
  for (const c of cascadeCandidates(lot, lot.failed)) {
    if (availableOf(c.bidder) >= c.max) {
      lot.cascade += 1;
      lot.winner = { bidder: c.bidder, amount: c.max };
      lot.claim = { until: now + CLAIM_WINDOW_MS };
      return lot;
    }
    lot.failed.push(c.bidder);
  }
  lot.status = 'requeue';
  return lot;
}

/** Tandai lot selesai setelah klaim on-chain terkonfirmasi. */
export function settle(lot, txHash) {
  lot.status = 'sold';
  lot.claim = { ...lot.claim, tx: txHash };
  return lot;
}

/** Pembagian dana: primer → 100% treasury; resale marketplace eksklusif → 90% penjual + 10% platform. */
export function split(amountUnits, resale) {
  if (!resale) return { seller: 0, platform: amountUnits };
  const platform = Math.ceil(amountUnits * 0.1);
  return { seller: amountUnits - platform, platform };
}

/**
 * Hitung unit tersedia untuk bidder: min(saldo, allowance) − Σ hold di lot lain.
 * holds: Map lotId → {bidder, amount}
 */
export function availableFor(bidder, onchainUnits, holds, exceptLotId) {
  let held = 0;
  for (const [lotId, h] of holds) if (h.bidder === bidder && lotId !== exceptLotId) held += h.amount;
  return onchainUnits - held;
}
