/**
 * Pembayaran kripto axto.io — keputusan pemilik 24 Nov 2026:
 *   „Semua pembayaran coinaxto ke indodax aja" · „Ambil address dari sana" · „Bikin webhook lg untuk ke indodax seluruh
 *   pembayaran dan transaksi axto.io" (https://axto.io/api/indodax) · „sy tidak memberi izin deposit wd di api key indodax,
 *   hanya tracking pembayaran, jika pembayaran di Terima baru pembelian berhasil" · „member bebas milih menggunakan crypto
 *   apa, pake stable coin aja rekomendasi atau make crypto terkenal" · „buatkan QR nya dengan jaringanya".
 *
 * Nama penyedia akun penampung TIDAK pernah tampil di halaman, JS publik atau respons API publik (rahasia perusahaan).
 * Kunci API hanya izin LIHAT: sistem tidak pernah menarik dana. Yang dibaca hanya alamat deposit + jaringannya (getInfo) dan
 * riwayat deposit (transHistory). Saldo, nama dan email akun tidak pernah disimpan atau ditampilkan.
 *
 * Alur satu pembayaran (intent):
 *   1. Member memilih koin + jaringan → alamat deposit akun untuk jaringan itu + jumlah koin dari kurs bursa, ditambah
 *      penanda unik pada digit terakhir (sen terkecil) agar deposit bisa dicocokkan otomatis + QR. Berlaku 60 menit.
 *   2. Member mengirim dari wallet/bursa mana pun; boleh menempelkan hash transaksi (pencocokan paling pasti).
 *   3. Cron 5 menit (dan tombol „Cek pembayaran", dibatasi 20 detik) membaca transHistory 2 hari terakhir. Deposit SUKSES
 *      dicocokkan lewat hash transaksi yang diklaim member atau lewat jumlah unik. Setiap deposit diproses sekali
 *      (tulis-sekali per id deposit). Baru setelah itu pembelian berhasil: koin dikreditkan / isi keranjang diserahkan.
 *   4. Kurang bayar: ditunggu sampai kedaluwarsa; lalu nilai yang diterima dikreditkan sebagai saldo koin AXTO (dana member
 *      tidak hilang). Datang terlambat (sesudah kedaluwarsa): diproses bila barang masih ada, kalau tidak → saldo koin AXTO.
 *
 * R2 (bucket STORE):
 *   pay/cfg.json               {opts:[{coin, nets:[{net, addr}]}], unknown:[…], at}       ← dari getInfo (tanpa saldo/nama)
 *   pay/intent/<id>.json       intent
 *   pay/amt/<coin>/<units8>    jumlah unik yang sedang dipakai (tulis-sekali) → {id}      meta {exp}
 *   pay/tx/<hash>              hash transaksi yang diklaim member (tulis-sekali) → {id}
 *   pay/dep/<coin>/<depId>     deposit yang sudah diproses (tulis-sekali) → {id|null, units8, tx, at}
 *   pay/by/<wallet>/<id>       indeks per member                                         meta {kind, st, usd}
 *   pay/open/<id>              intent yang belum selesai (dipungut cron)
 *   pay/sync.json              {at, ok, error, deposits}                                 ← status sinkronisasi terakhir
 */
import { readJSON, putJSON, createOnce, update, appendLog, listKeys } from './r2.js';

export const TAPI = 'https://indodax.com/tapi';
export const PUBAPI = 'https://indodax.com/api';
export const PAY_TTL_MS = 60 * 60_000;
const RELEASE_GRACE_MS = 15 * 60_000; // pesanan dilepas 15 menit sesudah kedaluwarsa
const AMT_KEEP_MS = 72 * 3600_000; // jumlah unik tetap dikenali 72 jam (deposit terlambat)
const CFG_TTL_MS = 6 * 3600_000;
const SYNC_MIN_MS = 20_000;
export const MIN_USD_CENTS = 100; // $1 (pemilik: minimum beli $1)
export const MAX_USD_CENTS = 1_000_000; // $10.000 per pembayaran

/** Koin yang ditawarkan, stablecoin lebih dulu (rekomendasi pemilik), lalu kripto terkenal. */
export const COINS = {
  usdt: { label: 'USDT', name: 'Tether USD', stable: true, maxDp: 6 },
  usdc: { label: 'USDC', name: 'USD Coin', stable: true, maxDp: 6 },
  eth: { label: 'ETH', name: 'Ethereum', maxDp: 8 },
  btc: { label: 'BTC', name: 'Bitcoin', maxDp: 8 },
  bnb: { label: 'BNB', name: 'BNB', maxDp: 8 },
  sol: { label: 'SOL', name: 'Solana', maxDp: 8 },
  trx: { label: 'TRX', name: 'TRON', maxDp: 6 },
  pol: { label: 'POL', name: 'Polygon', maxDp: 8 },
  doge: { label: 'DOGE', name: 'Dogecoin', maxDp: 8 },
  ltc: { label: 'LTC', name: 'Litecoin', maxDp: 8 },
};
export const COIN_ORDER = Object.keys(COINS);

/**
 * Jaringan yang dikenali (nama mengikuti getInfo). `fam` = bentuk alamat; `rank` kecil = biaya jaringan lebih murah
 * (Base paling dianjurkan). Jaringan yang tidak dikenali TIDAK ditawarkan (lebih aman daripada menebak).
 */
export const NETS = {
  base: { label: 'Base', fam: 'evm', chainId: 8453, rank: 1 },
  bep20: { label: 'BNB Smart Chain (BEP20)', fam: 'evm', chainId: 56, rank: 2 },
  bsc: { label: 'BNB Smart Chain (BEP20)', fam: 'evm', chainId: 56, rank: 2 },
  polygon: { label: 'Polygon', fam: 'evm', chainId: 137, rank: 3 },
  matic: { label: 'Polygon', fam: 'evm', chainId: 137, rank: 3 },
  arb: { label: 'Arbitrum One', fam: 'evm', chainId: 42161, rank: 4 },
  arbitrum: { label: 'Arbitrum One', fam: 'evm', chainId: 42161, rank: 4 },
  op: { label: 'Optimism', fam: 'evm', chainId: 10, rank: 5 },
  optimism: { label: 'Optimism', fam: 'evm', chainId: 10, rank: 5 },
  trc20: { label: 'TRON (TRC20)', fam: 'tron', rank: 6 },
  trx: { label: 'TRON', fam: 'tron', rank: 6 },
  tron: { label: 'TRON', fam: 'tron', rank: 6 },
  sol: { label: 'Solana', fam: 'sol', rank: 7 },
  spl: { label: 'Solana (SPL)', fam: 'sol', rank: 7 },
  solana: { label: 'Solana', fam: 'sol', rank: 7 },
  mainnet: { label: 'Mainnet', fam: 'native', rank: 8 },
  btc: { label: 'Bitcoin', fam: 'native', rank: 8 },
  ltc: { label: 'Litecoin', fam: 'native', rank: 8 },
  doge: { label: 'Dogecoin', fam: 'native', rank: 8 },
  eth: { label: 'Ethereum', fam: 'evm', chainId: 1, rank: 9 },
  erc20: { label: 'Ethereum (ERC20)', fam: 'evm', chainId: 1, rank: 9 },
};

const FAMILY = {
  evm: /^0x[0-9a-fA-F]{40}$/,
  tron: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
  sol: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
};
const NATIVE = {
  btc: /^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/,
  ltc: /^(ltc1[02-9ac-hj-np-z]{11,71}|[LM3][1-9A-HJ-NP-Za-km-z]{25,34})$/,
  doge: /^[DA9][1-9A-HJ-NP-Za-km-z]{25,34}$/,
};

/** Kontrak token resmi per jaringan EVM — hanya untuk tombol „bayar dengan wallet browser" (QR tetap alamat polos). */
export const TOKENS = {
  'usdc:base': { addr: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', dec: 6 },
  'usdt:bep20': { addr: '0x55d398326f99059fF775485246999027B3197955', dec: 18 },
  'usdc:bep20': { addr: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', dec: 18 },
  'usdt:polygon': { addr: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', dec: 6 },
  'usdc:polygon': { addr: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', dec: 6 },
  'usdt:arb': { addr: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', dec: 6 },
  'usdc:arb': { addr: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', dec: 6 },
  'usdt:erc20': { addr: '0xdAC17F958D2ee523a2206206994597C13D831ec7', dec: 6 },
  'usdc:erc20': { addr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', dec: 6 },
};
for (const [k, v] of Object.entries({ ...TOKENS })) {
  const [c, n] = k.split(':');
  if (n === 'bep20') TOKENS[`${c}:bsc`] = v;
  if (n === 'polygon') TOKENS[`${c}:matic`] = v;
  if (n === 'arb') TOKENS[`${c}:arbitrum`] = v;
}

const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const lw = (s) => String(s ?? '').toLowerCase();
const rid = () => hex(crypto.getRandomValues(new Uint8Array(9)));
const fail = (error, extra = {}) => ({ ok: false, error, ...extra });

// ---------------------------------------------------------------- angka: unit 1e-8 (presisi riwayat deposit bursa)
const U8 = 100_000_000n;
/** "12.3400" → 1234000000n (unit 1e-8). Lebih dari 8 desimal dibulatkan ke bawah. */
export function toUnits8(s) {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(String(s ?? '').trim());
  if (!m) return null;
  return BigInt(m[1]) * U8 + BigInt((m[2] ?? '').slice(0, 8).padEnd(8, '0'));
}
export function fromUnits8(u, dp = 8) {
  const whole = u / U8;
  const frac = (u % U8).toString().padStart(8, '0').slice(0, dp).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
}

// ---------------------------------------------------------------- HTTP bursa
async function hmac512(secret, body) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(body)));
}

export const gatewayReady = (env) => Boolean(env.INDODAX_API_KEY && env.INDODAX_API_SECRET);

/** Panggilan API privat (hanya metode baca). Mengembalikan `return`; error → Error('gw:<kode>'). */
export async function tapi(env, method, params = {}) {
  if (!gatewayReady(env)) throw new Error('gw:not_configured');
  if (!['getInfo', 'transHistory'].includes(method)) throw new Error('gw:method'); // sistem tidak pernah menarik/berdagang
  const body = new URLSearchParams({ method, timestamp: String(Date.now()), recvWindow: '15000', ...params }).toString();
  const r = await fetch(TAPI, { method: 'POST', headers: { Key: env.INDODAX_API_KEY, Sign: await hmac512(env.INDODAX_API_SECRET, body), 'content-type': 'application/x-www-form-urlencoded' }, body });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch { j = null; }
  if (!r.ok || !j || j.success !== 1) throw new Error(`gw:${j?.error_code || r.status}`);
  return j.return;
}

let PX = { at: 0, map: null };
/** Harga USD per koin dari ticker publik bursa (IDR ÷ USDT/IDR). Cache 60 detik. */
export async function pricesUsd(env, now = Date.now()) {
  if (PX.map && now - PX.at < 60_000) return PX.map;
  const r = await fetch(`${PUBAPI}/ticker_all`, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`px:${r.status}`);
  const t = (await r.json())?.tickers ?? {};
  const last = (k) => Number(t[`${k}_idr`]?.last ?? t[`${k}idr`]?.last);
  const usdt = last('usdt');
  if (!(usdt > 0)) throw new Error('px:usdt');
  const map = { usdt: 1 };
  for (const c of COIN_ORDER) if (c !== 'usdt') { const v = last(c); if (v > 0) map[c] = v / usdt; }
  if (!map.pol) { const v = last('matic'); if (v > 0) map.pol = v / usdt; }
  PX = { at: now, map };
  return map;
}
export const _resetPrices = () => { PX = { at: 0, map: null }; };

// ---------------------------------------------------------------- alamat deposit & jaringan
export const addrOk = (coin, net, addr) => {
  const n = NETS[net];
  if (!n || typeof addr !== 'string') return false;
  if (n.fam === 'native') return Boolean(NATIVE[coin]?.test(addr));
  return FAMILY[n.fam].test(addr);
};

/** Bangun daftar opsi dari jawaban getInfo (hanya address/network/memo_is_required yang dibaca). */
export function buildOptions(info) {
  const opts = [];
  const unknown = [];
  for (const coin of COIN_ORDER) {
    const key = coin === 'pol' && !info?.address?.pol ? 'matic' : coin;
    const a = info?.address?.[key];
    if (!a) continue;
    let nets = info?.network?.[key] ?? [];
    if (!Array.isArray(nets)) nets = [nets];
    const out = [];
    for (const net0 of nets) {
      const net = lw(net0);
      const addr = typeof a === 'object' ? a[net0] ?? a[net] : a;
      const memo = info?.memo_is_required?.[key]?.[net0] ?? info?.memo_is_required?.[key]?.[net];
      if (memo) continue; // memo wajib: tidak ditawarkan (salah memo = dana hilang)
      if (!NETS[net]) { unknown.push(`${coin}:${net}`); continue; }
      if (!addrOk(coin, net, addr)) { unknown.push(`${coin}:${net}:alamat`); continue; }
      out.push({ net, addr });
    }
    out.sort((x, y) => NETS[x.net].rank - NETS[y.net].rank);
    if (out.length) opts.push({ coin, key, nets: out });
  }
  return { opts, unknown };
}

let CFG = { at: 0, v: null };
export async function gatewayCfg(env, { refresh = false, now = Date.now() } = {}) {
  if (!refresh && CFG.v && now - CFG.at < 300_000) return CFG.v;
  let v = await readJSON(env.STORE, 'pay/cfg.json').catch(() => null);
  if (refresh || !v || now - Number(v.at ?? 0) > CFG_TTL_MS) {
    try {
      const info = await tapi(env, 'getInfo');
      v = { ...buildOptions(info), at: now };
      await putJSON(env.STORE, 'pay/cfg.json', v);
    } catch (e) {
      if (!v) throw e; // tanpa konfigurasi lama: tidak bisa menawarkan pembayaran
    }
  }
  CFG = { at: now, v };
  return v;
}
export const _resetCfg = () => { CFG = { at: 0, v: null }; };

/** Opsi publik untuk formulir bayar (tanpa alamat; alamat baru diberikan per pesanan). */
export async function publicOptions(env) {
  const cfg = await gatewayCfg(env);
  return cfg.opts.map((o) => ({ coin: o.coin, label: COINS[o.coin].label, name: COINS[o.coin].name, stable: Boolean(COINS[o.coin].stable), nets: o.nets.map((n) => ({ net: n.net, label: NETS[n.net].label, cheap: NETS[n.net].rank <= 3, wallet: NETS[n.net].fam === 'evm' && (COINS[o.coin].stable ? Boolean(TOKENS[`${o.coin}:${n.net}`]) : ['eth', 'bnb', 'pol'].includes(o.coin)) })) }));
}

// ---------------------------------------------------------------- intent
/** Jumlah dasar (unit 1e-8, dibulatkan ke atas pada `step`) + langkah penanda unik. Tambahan maksimal ±$0,10. */
export function amountPlan(coin, usdCents, priceUsd) {
  const c = COINS[coin];
  // presisi: cukup halus agar 999 langkah ≤ $0,10, tidak melebihi presisi koin
  let dp = Math.min(c.maxDp, Math.max(2, Math.ceil(-Math.log10(0.0001 / priceUsd))));
  if (c.stable) dp = 4; // stablecoin: 4 desimal (dompet bursa umumnya menerima 4–6 desimal)
  const step = 10n ** BigInt(8 - dp);
  const priceMicros = BigInt(Math.round(priceUsd * 1e8)); // USD × 1e8 per 1 koin
  // unit8 = usd × 1e8 / price … dihitung dalam bilangan bulat: cents × 1e6 × 1e8 / priceMicros
  let base = (BigInt(usdCents) * 1_000_000n * U8 + priceMicros - 1n) / priceMicros;
  base = ((base + step - 1n) / step) * step;
  const stepUsd = Number(step) / 1e8 * priceUsd;
  const tags = Math.max(50, Math.min(999, Math.floor(0.10 / Math.max(stepUsd, 1e-12))));
  return { base, step, tags, dp };
}

const intentKey = (id) => `pay/intent/${id}.json`;
const byMeta = (x) => ({ kind: x.kind, st: x.status, usd: String(x.usdCents) });

export function publicIntent(x) {
  if (!x) return null;
  const net = NETS[x.net] ?? {};
  const tok = TOKENS[`${x.coin}:${x.net}`];
  return {
    id: x.id, kind: x.kind, status: x.status, usd: x.usdCents / 100, coin: x.coin, coinLabel: COINS[x.coin]?.label ?? x.coin.toUpperCase(),
    net: x.net, netLabel: net.label ?? x.net, chainId: net.chainId ?? null, address: x.address, amount: fromUnits8(BigInt(x.units8), x.dp ?? 8),
    received: fromUnits8(BigInt(x.paid8 ?? '0'), 8), exp: x.exp, at: x.at, qr: `/api/pay/${x.id}/qr.svg`,
    token: tok ? { addr: tok.addr, dec: tok.dec } : null, evm: net.fam === 'evm', items: x.items ?? null, dropped: x.dropped ?? [],
    coins: x.coinsMicro ?? null, result: x.result ?? null, note: x.note ?? null,
  };
}

/**
 * Buat pembayaran. kind: 'coin' (isi saldo AXTO) | 'cart' (keranjang). `extra` disimpan apa adanya (isi keranjang yang
 * sudah dipesan, jumlah koin, dsb). Penanda jumlah unik ditulis-sekali sehingga dua pesanan tidak pernah berjumlah sama.
 */
export async function createIntent(env, wallet, { kind, usdCents, coin, net, extra = {} }, now = Date.now()) {
  if (!gatewayReady(env)) return fail('pay_off');
  if (!Number.isInteger(usdCents) || usdCents < MIN_USD_CENTS) return fail('amount_min', { min: MIN_USD_CENTS / 100 });
  if (usdCents > MAX_USD_CENTS) return fail('amount_max', { max: MAX_USD_CENTS / 100 });
  if (!COINS[coin]) return fail('coin');
  let cfg;
  try { cfg = await gatewayCfg(env, { now }); } catch { return fail('pay_unavailable'); }
  const opt = cfg.opts.find((o) => o.coin === coin);
  const n = opt?.nets.find((x) => x.net === net);
  if (!n) return fail('network');
  let px;
  try { px = (await pricesUsd(env, now))[coin]; } catch { return fail('price'); }
  if (!(px > 0)) return fail('price');
  const plan = amountPlan(coin, usdCents, px);
  const id = `p${now.toString(36)}${rid()}`;
  const exp = now + PAY_TTL_MS;
  let units = null;
  for (let i = 0; i < 25 && units === null; i += 1) {
    const tag = BigInt(1 + Math.floor(Math.random() * plan.tags));
    const u = plan.base + tag * plan.step;
    if (await createOnce(env.STORE, `pay/amt/${coin}/${u}`, { id }, { exp: String(exp + AMT_KEEP_MS) })) units = u;
  }
  if (units === null) return fail('busy');
  const x = { id, wallet: lw(wallet), kind, usdCents, coin, net, address: n.addr, units8: units.toString(), dp: plan.dp, priceUsd: px, paid8: '0', deposits: [], status: 'await', at: now, exp, ...extra };
  await createOnce(env.STORE, intentKey(id), x);
  await putJSON(env.STORE, `pay/by/${x.wallet}/${id}`, { id }, byMeta(x));
  await putJSON(env.STORE, `pay/open/${id}`, { id }, { exp: String(exp) });
  await appendLog(env.STORE, 'pay', { ev: 'intent', id, kind, wallet: x.wallet, usdCents, coin, net, amount: fromUnits8(units) });
  return { ok: true, intent: publicIntent(x) };
}

export async function getIntent(env, id) {
  return /^p[0-9a-z]{6,40}$/.test(String(id)) ? readJSON(env.STORE, intentKey(id)) : null;
}

export async function setIntent(env, id, fn) {
  const x = await update(env.STORE, intentKey(id), (cur) => (cur ? fn(cur) : undefined));
  if (x) await putJSON(env.STORE, `pay/by/${x.wallet}/${id}`, { id }, byMeta(x));
  return x;
}

export async function myIntents(env, wallet, kind) {
  const out = [];
  for (const o of (await listKeys(env.STORE, `pay/by/${lw(wallet)}/`, 1000)).slice(-60)) {
    if (kind && o.customMetadata?.kind !== kind) continue;
    const x = await readJSON(env.STORE, intentKey(o.key.split('/').pop()));
    if (x) out.push(publicIntent(x));
  }
  return out.reverse();
}

// ---------------------------------------------------------------- pencocokan deposit
/** Penangan per jenis pembayaran (diisi coin.js & cart.js lewat registerHandler — tanpa impor melingkar). */
const HANDLERS = {};
export const registerHandler = (kind, h) => { HANDLERS[kind] = h; };

/** Member menempelkan hash transaksinya (opsional, pencocokan paling pasti). Satu hash hanya untuk satu pembayaran. */
export async function claimTx(env, wallet, id, tx) {
  const x = await getIntent(env, id);
  if (!x || x.wallet !== lw(wallet)) return fail('not_found');
  const h = String(tx ?? '').trim();
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(h) && !/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(h)) return fail('tx');
  const key = `pay/tx/${/^(0x)?[0-9a-fA-F]{64}$/.test(h) ? lw(h.replace(/^0x/i, '')) : h}`;
  if (!(await createOnce(env.STORE, key, { id }))) {
    const u = await readJSON(env.STORE, key);
    if (u?.id !== id) return fail('tx_used');
  }
  await setIntent(env, id, (c) => (c.txClaim ? undefined : { ...c, txClaim: h }));
  return { ok: true };
}

const txKey = (tx) => {
  const t = String(tx ?? '').trim();
  if (!t) return null;
  return `pay/tx/${/^(0x)?[0-9a-fA-F]{64}$/.test(t) ? lw(t.replace(/^0x/i, '')) : t}`;
};

/** Terapkan satu deposit sukses ke intent (idempoten per id deposit), lalu panggil penangan jenisnya. */
export async function applyDeposit(env, id, dep, now = Date.now()) {
  const x = await setIntent(env, id, (c) => {
    if (c.deposits.some((d) => d.id === dep.id)) return undefined;
    const paid8 = (BigInt(c.paid8) + BigInt(dep.units8)).toString();
    const full = BigInt(paid8) * 1000n >= BigInt(c.units8) * 995n; // toleransi 0,5% (pembulatan dompet)
    const status = ['done', 'credited'].includes(c.status) ? c.status : full ? 'paid' : 'partial';
    return { ...c, paid8, status, deposits: [...c.deposits, { ...dep, at: now }], paidAt: full ? (c.paidAt ?? now) : c.paidAt };
  });
  if (!x) return fail('not_found');
  await appendLog(env.STORE, 'pay', { ev: 'deposit', id, coin: x.coin, units8: dep.units8, tx: dep.tx ?? null, depositId: dep.id, status: x.status });
  return settle(env, id, now);
}

/** Selesaikan intent menurut statusnya: lunas → penangan; kedaluwarsa & kurang → kredit saldo koin. */
export async function settle(env, id, now = Date.now()) {
  const x = await getIntent(env, id);
  if (!x) return fail('not_found');
  const h = HANDLERS[x.kind];
  if (!h) return fail('kind');
  if (x.status === 'paid') {
    const r = await h.fulfil(env, x, now);
    await setIntent(env, id, (c) => (c.status === 'paid' ? { ...c, status: r.status ?? 'done', result: r.result ?? null, note: r.note ?? null, doneAt: now } : undefined));
    await env.STORE.delete(`pay/open/${id}`);
    return { ok: true, intent: publicIntent(await getIntent(env, id)) };
  }
  if (x.status === 'partial' && now > x.exp + RELEASE_GRACE_MS) {
    const r = await h.partial(env, x, now);
    await setIntent(env, id, (c) => (c.status === 'partial' ? { ...c, status: 'credited', result: r.result ?? null, note: r.note ?? 'underpaid', doneAt: now } : undefined));
    await env.STORE.delete(`pay/open/${id}`);
  }
  return { ok: true, intent: publicIntent(await getIntent(env, id)) };
}

/**
 * Baca riwayat deposit 2 hari terakhir dan cocokkan. Dibatasi sekali per 20 detik (status di pay/sync.json).
 * Deposit tanpa pasangan dicatat (pay/dep/…, id null) untuk portal admin.
 */
export async function syncDeposits(env, { now = Date.now(), force = false } = {}) {
  if (!gatewayReady(env)) return { ok: false, error: 'pay_off' };
  const last = await readJSON(env.STORE, 'pay/sync.json').catch(() => null);
  if (!force && last && now - Number(last.at ?? 0) < SYNC_MIN_MS) return { ok: true, skipped: true };
  await putJSON(env.STORE, 'pay/sync.json', { ...(last ?? {}), at: now });
  const d = (ms) => new Date(ms).toISOString().slice(0, 10);
  let hist;
  try {
    hist = await tapi(env, 'transHistory', { start: d(now - 2 * 86_400_000), end: d(now + 86_400_000) });
  } catch (e) {
    await putJSON(env.STORE, 'pay/sync.json', { at: now, ok: false, error: String(e.message).slice(0, 120), okAt: last?.okAt ?? null });
    return { ok: false, error: e.message };
  }
  let seen = 0;
  let matched = 0;
  for (const coin of COIN_ORDER) {
    const keys = coin === 'pol' ? ['pol', 'matic'] : [coin];
    for (const k of keys) {
      for (const e of hist?.deposit?.[k] ?? []) {
        if (String(e.status ?? '').toLowerCase() !== 'success') continue;
        const depId = String(e.deposit_id ?? '').replace(/[^0-9A-Za-z_-]/g, '');
        const units8 = toUnits8(e[k] ?? e.amount);
        if (!depId || units8 === null) continue;
        seen += 1;
        const dkey = `pay/dep/${coin}/${depId}`;
        if (await env.STORE.head(dkey)) continue;
        let id = null;
        const tk = txKey(e.tx);
        if (tk) id = (await readJSON(env.STORE, tk))?.id ?? null;
        if (!id) id = (await readJSON(env.STORE, `pay/amt/${coin}/${units8}`))?.id ?? null;
        // intent harus untuk koin yang sama dan dibuat sebelum deposit sukses
        if (id) {
          const x = await getIntent(env, id);
          const okTime = !e.success_time || Number(e.success_time) * 1000 >= Number(x?.at ?? 0) - 10 * 60_000;
          if (!x || x.coin !== coin || !okTime) id = null;
        }
        if (!(await createOnce(env.STORE, dkey, { id, units8: units8.toString(), tx: e.tx ?? null, at: now }))) continue;
        if (!id) { await appendLog(env.STORE, 'pay', { ev: 'unmatched', coin, depositId: depId, units8: units8.toString(), tx: e.tx ?? null }); continue; }
        await applyDeposit(env, id, { id: depId, units8: units8.toString(), tx: e.tx ?? null }, now);
        matched += 1;
      }
    }
  }
  await putJSON(env.STORE, 'pay/sync.json', { at: now, ok: true, okAt: now, seen, matched });
  return { ok: true, seen, matched };
}

/** Cron: sinkronkan deposit, lalu selesaikan/lepaskan intent yang kedaluwarsa, lalu bersihkan penanda jumlah lama. */
export async function cron(env, now = Date.now()) {
  const s = await syncDeposits(env, { now, force: true }).catch((e) => ({ ok: false, error: e.message }));
  let expired = 0;
  for (const o of await listKeys(env.STORE, 'pay/open/', 1000)) {
    const id = o.key.split('/').pop();
    const exp = Number(o.customMetadata?.exp ?? 0);
    if (now <= exp + RELEASE_GRACE_MS) continue;
    const x = await getIntent(env, id);
    if (!x) { await env.STORE.delete(o.key); continue; }
    if (x.status === 'await') {
      const h = HANDLERS[x.kind];
      if (h?.expire) await h.expire(env, x, now);
      await setIntent(env, id, (c) => (c.status === 'await' ? { ...c, status: 'expired', doneAt: now } : undefined));
      await env.STORE.delete(o.key);
      expired += 1;
    } else await settle(env, id, now);
  }
  for (const o of await listKeys(env.STORE, 'pay/amt/', 5000)) if (Number(o.customMetadata?.exp ?? Infinity) < now) await env.STORE.delete(o.key);
  return { sync: s, expired };
}

/** Deposit yang datang sesudah intent kedaluwarsa tetap diterapkan (settle → penangan memutuskan). */
export async function lateOk(x) { return ['expired', 'await', 'partial'].includes(x.status); }

// ---------------------------------------------------------------- QR (SVG) + titik akhir callback
export async function qrSvg(text) {
  const { default: qrcode } = await import('qrcode-generator');
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 6, margin: 3, scalable: true });
}

/**
 * https://axto.io/api/indodax — URL callback akun. Akun hanya dipakai menerima pembayaran; penarikan TIDAK pernah diminta
 * sistem, jadi setiap permintaan konfirmasi penarikan dijawab selain „ok" (bursa membatalkannya) dan dicatat sebagai
 * peringatan untuk admin. GET → tanda hidup.
 */
export async function callback(request, env) {
  if (request.method !== 'POST') return new Response('axto.io', { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  const raw = (await request.text()).slice(0, 4096);
  const p = Object.fromEntries(new URLSearchParams(raw));
  await appendLog(env.STORE, 'pay-alert', { ev: 'withdraw_callback_refused', request_id: String(p.request_id ?? '').slice(0, 80), currency: String(p.withdraw_currency ?? '').slice(0, 16), amount: String(p.withdraw_amount ?? '').slice(0, 40), address: String(p.withdraw_address ?? '').slice(0, 120), ip: String(p.requester_ip ?? request.headers.get('cf-connecting-ip') ?? '').slice(0, 64) });
  return new Response('refused', { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}

/** Ringkasan untuk portal admin (tanpa kunci; tanpa saldo akun). */
export async function adminView(env) {
  const [cfg, sync, open, alerts] = await Promise.all([
    readJSON(env.STORE, 'pay/cfg.json').catch(() => null),
    readJSON(env.STORE, 'pay/sync.json').catch(() => null),
    listKeys(env.STORE, 'pay/open/', 1000),
    listKeys(env.STORE, `log/pay-alert/`, 200),
  ]);
  const unmatched = [];
  for (const coin of COIN_ORDER) {
    for (const o of (await listKeys(env.STORE, `pay/dep/${coin}/`, 2000)).slice(-200)) {
      const d = await readJSON(env.STORE, o.key);
      if (d && !d.id) unmatched.push({ coin, depositId: o.key.split('/').pop(), amount: fromUnits8(BigInt(d.units8)), tx: d.tx, at: d.at });
    }
  }
  const recent = [];
  for (const o of (await listKeys(env.STORE, 'pay/intent/', 100_000)).slice(-60)) {
    const x = await readJSON(env.STORE, o.key);
    if (x) recent.push({ ...publicIntent(x), wallet: x.wallet });
  }
  return { recent: recent.reverse(), ready: gatewayReady(env), callbackUrl: `${env.BASE_URL || 'https://axto.io'}/api/indodax`, sync, options: cfg ? { at: cfg.at, coins: cfg.opts.map((o) => `${o.coin}: ${o.nets.map((n) => n.net).join(', ')}`), unknown: cfg.unknown } : null, open: open.length, unmatched: unmatched.slice(-100), alerts: alerts.length };
}

/** Admin mencocokkan deposit tanpa pasangan ke sebuah pembayaran secara manual (mis. member salah nominal). */
export async function adminAssign(env, admin, b, now = Date.now()) {
  const coin = String(b?.coin ?? '');
  const depId = String(b?.depositId ?? '').replace(/[^0-9A-Za-z_-]/g, '');
  const key = `pay/dep/${coin}/${depId}`;
  const d = await readJSON(env.STORE, key);
  if (!d || d.id) return fail('deposit');
  const x = await getIntent(env, String(b?.id ?? ''));
  if (!x || x.coin !== coin) return fail('intent');
  const r = await update(env.STORE, key, (cur) => (cur && !cur.id ? { ...cur, id: x.id, by: admin, assignedAt: now } : undefined));
  if (!r || r.id !== x.id) return fail('deposit');
  await appendLog(env.STORE, 'admin', { ev: 'pay-assign', coin, depositId: depId, id: x.id, by: admin });
  return applyDeposit(env, x.id, { id: depId, units8: d.units8, tx: d.tx ?? null }, now);
}
