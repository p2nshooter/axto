/**
 * Koin AXTO lewat NOWPayments — beli & cairkan, otomatis penuh (pemilik, 23 Nov 2026):
 *   „Pembelian dan Penjualan axto coin seluruh full otomatis melalui nowpayments" · „member juga bisa mencairkan coin axto
 *   nya tapi di potong 50% jika belum waktunya di release ke dex, seluruh member wajib menyetujui perjanjian saat melakukan
 *   pembelian" · „member yg ingin menjual akan di TF ke rekening/address yg di pakai saat member membeli tidak bisa ke
 *   rekening lain" · „coin axto yg di jual client masuk kembali address asalnya, catat history nya di portal admin, dan
 *   seluruh coin axto terpantau dari portal admin seluruhnya" · „Untuk buyback coin axto masuk nya ke address ini …
 *   Jadi di presale jika sudah di beli tidak nambah" (alamat buyback hanya di R2 privat `private/config.json`).
 *
 * Aliran
 *   Beli:    member (masuk) memilih USD + mata uang + alamat wallet pengirimnya, menyetujui perjanjian → POST /v1/payment
 *            → member membayar ke alamat NOWPayments → IPN (POST /api/nowpayments/ipn, HMAC-SHA512 `x-nowpayments-sig`)
 *            → status diperiksa ulang ke API (GET /v1/payment/{id}) → koin dikreditkan sekali (idempoten per pesanan).
 *   Cairkan: koin dipotong dari saldo, nilai USD = koin × harga presale; sebelum rilis DEX dipotong 50% → payout NOWPayments
 *            (/v1/auth → /v1/payout → /v1/payout/{batch}/verify dengan kode TOTP) HANYA ke alamat & mata uang yang dipakai
 *            member saat membeli. Koin yang dicairkan dibeli kembali (buyback) dan masuk ke wallet buyback axto.io —
 *            stok presale tidak bertambah lagi. Gagal → koin dikembalikan ke member.
 *   Pantau:  setiap gerak koin = satu peristiwa di log append-only `log/coin/…`; portal admin menjumlahkannya.
 *
 * Penyimpanan: R2 saja (aturan pemilik). Kunci API/IPN/kredensial payout hanya rahasia worker (dari GitHub Secrets saat
 * deploy) — tidak pernah di repo, log, atau halaman. Alamat member disimpan privat dan hanya tampil ke pemiliknya & admin.
 *
 * R2 (axto-nft-data):
 *   coin/acct/<wallet>.json      {wallet, micro, addresses:[{cur,addr,order,at}], agreements:{v:at}}
 *   coin/order/<id>.json         pesanan beli (+ customMetadata ringkas untuk daftar admin)
 *   coin/out/<id>.json           pencairan
 *   coin/queue/<id>              antrean payout (dihapus setelah payout diverifikasi)
 *   log/coin/<hari>/…            peristiwa koin (buy_credit, cashout, cashout_paid, cashout_refund, …)
 *   cfg/coin.json                {priceCents, dexReleased} — diubah admin
 */
import { readJSON, getJSON, createOnce, appendLog, listKeys, update } from './r2.js';

export const NP_API = 'https://api.nowpayments.io';
/** Webhook pembayaran (alamat lama tetap diterima untuk pembayaran yang dibuat sebelum 24 Nov 2026). */
export const IPN_PATH = '/api/pay/ipn';
export const IPN_PATHS = ['/api/pay/ipn', '/api/nowpayments/ipn'];
/** 1 AXTO = 1.000.000 mikro di pembukuan internal (bilangan bulat, tanpa pecahan desimal). */
export const MICRO = 1_000_000n;
export const DEFAULT_PRICE_CENTS = 1000; // $10 per AXTO (harga presale)
export const PENALTY_BEFORE_DEX = 50; // %
/** Pemilik, 24 Nov 2026: „Pembelian dan investasi axto minimum $1". Batas bawah sebenarnya per mata uang = minimum jaringan
 *  gerbang pembayaran (mis. USDT TRON ±$10, BTC ±$4) — lihat minUsdFor(). */
export const LIMITS = { minBuyUsd: 1, maxBuyUsd: 10_000, minCashoutUsd: 20 };
/** Batas presale: 20.000.000 AXTO (harga tetap sampai terjual habis). */
export const PRESALE_MICRO = 20_000_000n * 1_000_000n;

/** Empat jalur bayar yang dipakai pemilik di NOWPayments. Kode dicocokkan ulang dengan GET /v1/merchant/coins. */
export const CURRENCIES = {
  'usdt-trx': { code: 'usdttrc20', label: 'USDT · TRON (TRC20)', net: 'tron' },
  'usdc-bsc': { code: 'usdcbsc', label: 'USDC · BNB Smart Chain (BEP20)', net: 'evm' },
  btc: { code: 'btc', label: 'Bitcoin (BTC)', net: 'btc' },
  'bnb-bsc': { code: 'bnbbsc', label: 'BNB · BNB Smart Chain (BEP20)', net: 'evm' },
};

/** Alamat wallet pengirim yang masuk akal untuk jaringannya (pemeriksaan bentuk; NOWPayments memvalidasi ulang). */
export function validAddress(cur, a) {
  const c = CURRENCIES[cur];
  if (!c || typeof a !== 'string') return false;
  if (c.net === 'tron') return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a);
  if (c.net === 'evm') return /^0x[0-9a-fA-F]{40}$/.test(a);
  if (c.net === 'btc') return /^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a) || /^bc1[02-9ac-hj-np-z]{11,71}$/.test(a);
  return false;
}

// ---------------------------------------------------------------- perjanjian (wajib disetujui saat membeli)
export const AGREEMENT_V = '2026-11-24.1';
export const AGREEMENT = {
  id: [
    'AXTO adalah koin komunitas NFT axto.io — investasi bersama di dalam ekosistem karya seni digital yang hidup. Seperti setiap aset kripto, nilainya dapat naik maupun turun dan tidak dijamin; tidak ada janji keuntungan. Belilah sesuai kemampuan dan patuhi aturan di negara Anda.',
    'Pembayaran diproses otomatis oleh gerbang pembayaran kripto mitra axto.io (USDT TRC20, USDC BEP20, BTC, BNB BEP20). Koin masuk ke akun Anda begitu pembayaran terkonfirmasi.',
    'Anda wajib membayar dari alamat wallet milik Anda sendiri yang Anda isi di formulir ini — bukan dari bursa (exchange) atau wallet orang lain.',
    'Koin yang Anda staking terkunci sampai masa kontraknya selesai; hadiah NFT-nya dikirim tanpa biaya gas ke alamat yang Anda cantumkan begitu kontrak selesai.',
    'Semua transaksi tercatat (alamat, jumlah, waktu, hash transaksi). axto.io dapat menahan transaksi yang terindikasi penipuan atau melanggar hukum.',
  ],
  en: [
    'AXTO is the community coin of the axto.io NFT museum — a shared investment inside an ecosystem of living digital art. Like every crypto asset, its value can rise or fall and is not guaranteed; no profit is promised. Buy within your means and follow the rules of your country.',
    'Payments are processed automatically by axto.io\'s crypto payment partner (USDT TRC20, USDC BEP20, BTC, BNB BEP20). Coins reach your account as soon as the payment is confirmed.',
    'You must pay from a wallet address you own, entered in this form — not from an exchange or someone else\'s wallet.',
    'Coins you stake stay locked until the term ends; their NFT rewards are delivered gas-free to the address you name as soon as the term completes.',
    'Every transaction is recorded (addresses, amounts, times, transaction hashes). axto.io may hold transactions that indicate fraud or break the law.',
  ],
};
/**
 * Pemilik, 24 Nov 2026: „perjanjian ini notif nya cukup di infokan saat member melakukan pembelian axto coin, kasih tambahan
 * warning!!! Kami tidak mengharapkan ini terjadi. Pake bahasanya lebih elegan, jgn di expose di depan begitu." — ketentuan
 * menjual kembali koin hanya tampil di jendela persetujuan saat membeli, sebagai peringatan yang santun.
 */
export const AGREEMENT_WARN = {
  id: {
    title: 'Perhatian — kami berharap ini tidak pernah Anda perlukan',
    items: [
      'Bila suatu saat Anda ingin menjual kembali koin AXTO kepada axto.io, dananya hanya dikirim ke alamat dan mata uang yang Anda pakai saat membeli — tidak ke alamat, wallet, atau rekening lain.',
      'Sebelum koin AXTO dirilis ke DEX, penjualan kembali dipotong 50% dari nilainya pada harga presale; sesudah rilis DEX tanpa potongan. Nilai dihitung dalam USD lalu dikonversi ke mata uang pembelian pada kurs saat itu; biaya jaringan dipotong dari jumlah yang dikirim; minimal $20.',
      'Koin yang dijual kembali tidak kembali ke stok presale. Bila pengiriman gagal, koin dikembalikan utuh ke saldo Anda.',
    ],
  },
  en: {
    title: 'Please note — we hope you will never need this',
    items: [
      'Should you ever wish to sell AXTO coins back to axto.io, the funds are sent only to the address and currency you used to buy — never to any other address, wallet or bank account.',
      'Before the AXTO coin is released to a DEX, a sale back is reduced by 50% of its value at the presale price; after the DEX release there is no reduction. The value is calculated in USD and converted into the purchase currency at the rate of the moment; network fees are deducted from the amount sent; minimum $20.',
      'Coins sold back do not return to the presale stock. If a payout fails, the coins are returned to your balance in full.',
    ],
  },
};
export async function agreementHash(lang) {
  const w = AGREEMENT_WARN[lang] ?? AGREEMENT_WARN.en;
  const text = `${AGREEMENT_V}\n${(AGREEMENT[lang] ?? AGREEMENT.en).join('\n')}\n${w.title}\n${w.items.join('\n')}`;
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

// ---------------------------------------------------------------- utilitas murni (diuji)
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');

/** Kunci objek diurutkan rekursif — persis seperti SDK resmi NOWPayments (sortObjectDeep). */
export function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object' && v.constructor === Object) return Object.keys(v).sort().reduce((o, k) => ((o[k] = sortDeep(v[k])), o), {});
  return v;
}

/** HMAC-SHA512(JSON.stringify(sortDeep(payload)), rahasia IPN) — format tanda tangan IPN NOWPayments. */
export async function ipnSignature(payload, secret) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(secret).trim()), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(JSON.stringify(sortDeep(payload)))));
}

/** Verifikasi IPN; perbandingan waktu-konstan. Mengembalikan payload hanya bila tanda tangan sah. */
export async function verifyIpn(rawBody, sig, secret) {
  if (!secret || typeof sig !== 'string' || !/^[0-9a-f]{128}$/i.test(sig.trim())) return null;
  let payload;
  try { payload = JSON.parse(rawBody); } catch { return null; }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const want = await ipnSignature(payload, secret);
  const got = sig.trim().toLowerCase();
  let diff = 0;
  for (let i = 0; i < want.length; i += 1) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0 ? payload : null;
}

/** Kode TOTP RFC 6238 (SHA-1, 30 detik, 6 digit) dari rahasia Base32 2FA aplikasi — untuk verifikasi payout otomatis. */
export async function totp(secretB32, now = Date.now()) {
  const s = String(secretB32).trim().replace(/^otpauth:\/\/.*[?&]secret=([^&]+).*$/i, '$1').toUpperCase().replace(/[\s=-]/g, '');
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of s) {
    const v = A.indexOf(ch);
    if (v < 0) throw new Error('totp_secret');
    bits += v.toString(2).padStart(5, '0');
  }
  const key = new Uint8Array(Math.floor(bits.length / 8)).map((_, i) => parseInt(bits.slice(i * 8, i * 8 + 8), 2));
  const counter = BigInt(Math.floor(now / 30_000));
  const msg = new Uint8Array(8);
  new DataView(msg.buffer).setBigUint64(0, counter);
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', k, msg));
  const o = h[h.length - 1] & 0xf;
  const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 1_000_000).padStart(6, '0');
}

/** USD (sen) → koin (mikro) pada harga presale (sen per AXTO). Dibulatkan ke bawah. */
export const microForCents = (cents, priceCents) => (BigInt(cents) * MICRO) / BigInt(priceCents);
/** Koin (mikro) → USD (sen). Dibulatkan ke bawah. */
export const centsForMicro = (micro, priceCents) => (BigInt(micro) * BigInt(priceCents)) / MICRO;
export const fmtCoins = (micro) => {
  const m = BigInt(micro);
  const w = m / MICRO;
  const f = (m % MICRO).toString().padStart(6, '0').replace(/0+$/, '');
  return f ? `${w}.${f}` : `${w}`;
};
/** "12.5" → mikro (maks 6 desimal); null bila bukan angka positif. */
export function parseCoins(s) {
  const m = /^(\d{1,12})(?:\.(\d{1,6}))?$/.exec(String(s ?? '').trim());
  if (!m) return null;
  const v = BigInt(m[1]) * MICRO + BigInt((m[2] ?? '').padEnd(6, '0'));
  return v > 0n ? v : null;
}

/** Nilai pencairan: potongan 50% sebelum rilis DEX. */
export function cashoutQuote({ micro, priceCents, released }) {
  const valueCents = centsForMicro(micro, priceCents);
  const penaltyPct = released ? 0 : PENALTY_BEFORE_DEX;
  const payoutCents = (valueCents * BigInt(100 - penaltyPct)) / 100n;
  return { valueCents: Number(valueCents), penaltyPct, payoutCents: Number(payoutCents) };
}

/** Kredit yang semestinya untuk status pembayaran: penuh bila selesai, proporsional bila kurang bayar, nol selain itu. */
export function creditTarget(order, payment, priceCents) {
  const full = microForCents(order.usdCents, priceCents);
  const st = String(payment.payment_status ?? '');
  if (st === 'finished') return full;
  if (st === 'partially_paid') {
    const paid = Number(payment.actually_paid ?? 0);
    const want = Number(payment.pay_amount ?? 0);
    if (!(paid > 0 && want > 0)) return 0n;
    const ratio = BigInt(Math.floor(Math.min(1, paid / want) * 1e6));
    return (full * ratio) / 1_000_000n;
  }
  return 0n;
}

// ---------------------------------------------------------------- NOWPayments HTTP
const jwtCache = { token: null, exp: 0 };

async function np(env, path, { method = 'GET', body, bearer = false, query } = {}) {
  if (!env.NOWPAYMENTS_API_KEY) throw new Error('np_not_configured');
  const u = new URL(path, NP_API);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  const headers = { 'x-api-key': env.NOWPAYMENTS_API_KEY, accept: 'application/json' };
  if (body) headers['content-type'] = 'application/json';
  if (bearer) headers.authorization = `Bearer ${await jwt(env)}`;
  const r = await fetch(u, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  let j = null;
  try { j = t ? JSON.parse(t) : null; } catch { j = null; }
  if (!r.ok) throw Object.assign(new Error(`np_${r.status}`), { status: r.status, detail: j?.message ?? j?.code ?? null });
  return j;
}

async function jwt(env) {
  if (jwtCache.token && Date.now() < jwtCache.exp) return jwtCache.token;
  if (!env.NOWPAYMENTS_EMAIL || !env.NOWPAYMENTS_PASSWORD) throw new Error('payout_credentials_missing');
  const r = await fetch(new URL('/v1/auth', NP_API), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.NOWPAYMENTS_EMAIL, password: env.NOWPAYMENTS_PASSWORD }) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.token) throw new Error(`np_auth_${r.status}`);
  jwtCache.token = j.token;
  jwtCache.exp = Date.now() + 4 * 60_000; // token NOWPayments ±5 menit
  return j.token;
}

export const payoutReady = (env) => !!(env.NOWPAYMENTS_API_KEY && env.NOWPAYMENTS_EMAIL && env.NOWPAYMENTS_PASSWORD && env.NOWPAYMENTS_2FA_SECRET);

// ---------------------------------------------------------------- konfigurasi & akun
export async function coinCfg(env) {
  const c = (await readJSON(env.STORE, 'cfg/coin.json').catch(() => null)) ?? {};
  return { priceCents: Number.isInteger(c.priceCents) && c.priceCents > 0 ? c.priceCents : DEFAULT_PRICE_CENTS, dexReleased: c.dexReleased === true };
}

const acctKey = (w) => `coin/acct/${w.toLowerCase()}.json`;
const JSONH = { httpMetadata: { contentType: 'application/json' } };

/** Compare-and-swap dengan customMetadata. fn(lama|null) → baru | undefined (tanpa perubahan). */
async function cas(bucket, key, fn, meta, tries = 6) {
  for (let i = 0; i < tries; i += 1) {
    const cur = await getJSON(bucket, key);
    const next = await fn(cur?.value ?? null);
    if (next === undefined) return cur?.value ?? null;
    const onlyIf = cur ? { etagMatches: cur.etag } : { etagDoesNotMatch: '*' };
    const r = await bucket.put(key, JSON.stringify(next), { ...JSONH, customMetadata: meta ? meta(next) : undefined, onlyIf });
    if (r !== null) return next;
    await new Promise((res) => setTimeout(res, 40 * 2 ** i));
  }
  throw new Error(`cas: ${key}`);
}

const emptyAcct = (w) => ({ wallet: w.toLowerCase(), micro: '0', addresses: [], agreements: {}, at: Date.now() });

export async function account(env, wallet) {
  return (await readJSON(env.STORE, acctKey(wallet))) ?? emptyAcct(wallet);
}

/**
 * Tambah/kurangi saldo (mikro). Saldo tidak pernah negatif: debit lebih besar dari saldo → error 'balance'.
 * `ref` (opsional) membuat perubahan idempoten: ref yang sama tidak pernah diterapkan dua kali (500 ref terakhir per akun) —
 * dipakai toko eksklusif & pasar member agar langkah yang diulang setelah gangguan tidak mendebit/mengkredit ganda.
 */
export async function adjust(env, wallet, deltaMicro, ev, ref) {
  const d = BigInt(deltaMicro);
  let applied = false;
  const a = await cas(env.STORE, acctKey(wallet), (cur) => {
    const x = cur ?? emptyAcct(wallet);
    if (ref && (x.refs ?? []).includes(ref)) return undefined;
    const next = BigInt(x.micro) + d;
    if (next < 0n) throw new Error('balance');
    applied = true;
    return { ...x, micro: next.toString(), ...(ref ? { refs: [...(x.refs ?? []), ref].slice(-500) } : {}), at: Date.now() };
  });
  if (ev && applied) await appendLog(env.STORE, 'coin', { ...ev, wallet: wallet.toLowerCase(), micro: d.toString(), ref });
  return a ?? emptyAcct(wallet);
}

// ---------------------------------------------------------------- beli
const MIN_CACHE = new Map();
/** Minimum beli (USD bulat ke atas) untuk satu mata uang: maks($1, minimum jaringan gerbang pembayaran + 10%). Cache 10 menit. */
export async function minUsdFor(env, cur) {
  const c = CURRENCIES[cur];
  if (!c) return LIMITS.minBuyUsd;
  const hit = MIN_CACHE.get(cur);
  if (hit && Date.now() - hit.at < 600_000) return hit.v;
  try {
    const m = await np(env, '/v1/min-amount', { query: { currency_from: c.code, currency_to: c.code, fiat_equivalent: 'usd' } });
    const f = Number(m?.fiat_equivalent);
    if (Number.isFinite(f) && f > 0) {
      const v = Math.max(LIMITS.minBuyUsd, Math.ceil(f * 1.1));
      MIN_CACHE.set(cur, { at: Date.now(), v });
      return v;
    }
  } catch { /* gerbang tidak menjawab: tidak di-cache, gerbang tetap menolak jumlah yang terlalu kecil */ }
  return LIMITS.minBuyUsd;
}

/** Koin presale yang sudah terjual (mikro) — dihitung dari pembayaran yang terkonfirmasi, tidak berkurang saat dijual kembali. */
export async function presaleSold(env) {
  return BigInt((await readJSON(env.STORE, 'coin/presale.json').catch(() => null))?.soldMicro ?? '0');
}

export async function quote(env, { usd, cur }) {
  const c = CURRENCIES[cur];
  const cents = Math.round(Number(usd) * 100);
  if (!c) return { error: 'currency' };
  if (!(cents >= LIMITS.minBuyUsd * 100 && cents <= LIMITS.maxBuyUsd * 100)) return { error: 'amount', min: LIMITS.minBuyUsd, max: LIMITS.maxBuyUsd };
  const { priceCents } = await coinCfg(env);
  const minUsd = await minUsdFor(env, cur);
  const out = { usd: cents / 100, cur, label: c.label, coins: fmtCoins(microForCents(cents, priceCents)), priceUsd: priceCents / 100, minUsd };
  if (cents < minUsd * 100) return { ...out, error: 'amount_min', min: minUsd };
  try {
    const e = await np(env, '/v1/estimate', { query: { amount: cents / 100, currency_from: 'usd', currency_to: c.code } });
    out.estimate = e?.estimated_amount ?? null;
  } catch { out.estimate = null; }
  return out;
}

export async function buy(env, wallet, b, { lang, country, base }) {
  const c = CURRENCIES[b.cur];
  const cents = Math.round(Number(b.usd) * 100);
  if (!c) return { error: 'currency' };
  if (!(cents >= LIMITS.minBuyUsd * 100 && cents <= LIMITS.maxBuyUsd * 100)) return { error: 'amount' };
  const payer = String(b.payer ?? '').trim();
  if (!validAddress(b.cur, payer)) return { error: 'payer_address' };
  if (b.agree !== true || b.agreementV !== AGREEMENT_V) return { error: 'agreement' };
  const minUsd = await minUsdFor(env, b.cur);
  if (cents < minUsd * 100) return { error: 'amount_min', min: minUsd };
  // presale: harga tetap sampai 20.000.000 AXTO terjual (pembayaran yang sudah terkonfirmasi)
  {
    const { priceCents: pc } = await coinCfg(env);
    if ((await presaleSold(env)) + microForCents(cents, pc) > PRESALE_MICRO) return { error: 'presale_closed' };
  }
  // alamat ditanyakan langsung ke NOWPayments (format & jaringan) — sekaligus memastikan pencairan nanti bisa dikirim ke sana
  try { await np(env, '/v1/payout/validate-address', { method: 'POST', body: { address: payer, currency: c.code } }); } catch (e) {
    if (e.status && e.status < 500) return { error: 'payer_address' };
  }
  const { priceCents } = await coinCfg(env);
  const id = `${Date.now().toString(36)}${hex(crypto.getRandomValues(new Uint8Array(5)))}`;
  const agreement = { v: AGREEMENT_V, lang, hash: await agreementHash(lang), at: Date.now() };
  const order = { id, wallet: wallet.toLowerCase(), usdCents: cents, priceCents, coinsMicro: microForCents(cents, priceCents).toString(), cur: b.cur, code: c.code, payer, agreement, country: country ?? null, status: 'creating', creditedMicro: '0', history: [], at: Date.now() };
  const meta = (o) => ({ w: o.wallet, st: o.status, usd: String(o.usdCents), cur: o.cur });
  if (!(await createOnce(env.STORE, `coin/order/${id}.json`, order, meta(order)))) return { error: 'retry' };
  await createOnce(env.STORE, `coin/by/${order.wallet}/o/${id}`, { id });
  let p;
  try {
    p = await np(env, '/v1/payment', { method: 'POST', body: { price_amount: cents / 100, price_currency: 'usd', pay_currency: c.code, ipn_callback_url: `${base}${IPN_PATH}`, order_id: id, order_description: `AXTO coin ${fmtCoins(order.coinsMicro)} AXTO` } });
  } catch (e) {
    await cas(env.STORE, `coin/order/${id}.json`, (o) => ({ ...o, status: 'error', error: e.detail ?? e.message }), meta);
    return { error: 'np', detail: e.detail ?? e.message };
  }
  const np_ = { payment_id: String(p.payment_id), pay_address: p.pay_address, pay_amount: p.pay_amount, pay_currency: p.pay_currency, payin_extra_id: p.payin_extra_id ?? null, valid_until: p.valid_until ?? p.expiration_estimate_date ?? null };
  const saved = await cas(env.STORE, `coin/order/${id}.json`, (o) => ({ ...o, status: p.payment_status ?? 'waiting', np: np_ }), meta);
  await cas(env.STORE, acctKey(wallet), (a) => {
    const x = a ?? emptyAcct(wallet);
    return { ...x, agreements: { ...x.agreements, [AGREEMENT_V]: agreement.at } };
  });
  return { ok: true, order: publicOrder(saved) };
}

export const publicOrder = (o) => ({ id: o.id, at: o.at, usd: o.usdCents / 100, coins: fmtCoins(o.coinsMicro), cur: o.cur, label: CURRENCIES[o.cur]?.label, payer: o.payer, status: o.status, credited: fmtCoins(o.creditedMicro ?? '0'), pay: o.np ? { address: o.np.pay_address, amount: o.np.pay_amount, currency: o.np.pay_currency, extraId: o.np.payin_extra_id, until: o.np.valid_until } : null, txid: o.payinHash ?? null });

/**
 * Terapkan status pembayaran yang SUDAH diperiksa ke API. Idempoten: kredit = target − yang sudah dikreditkan,
 * dihitung di dalam CAS akun dengan penanda per pesanan (credits[orderId]), sehingga IPN berulang tidak menggandakan.
 */
export async function applyPayment(env, orderId, payment) {
  const key = `coin/order/${orderId}.json`;
  const order = await readJSON(env.STORE, key);
  if (!order) return { error: 'order' };
  if (String(order.np?.payment_id ?? '') !== String(payment.payment_id)) return { error: 'payment_mismatch' };
  const target = creditTarget(order, payment, order.priceCents);
  let delta = 0n;
  await cas(env.STORE, acctKey(order.wallet), (a) => {
    const x = a ?? emptyAcct(order.wallet);
    const credits = { ...(x.credits ?? {}) };
    const already = BigInt(credits[orderId] ?? '0');
    delta = target > already ? target - already : 0n;
    if (delta === 0n) return undefined;
    credits[orderId] = target.toString();
    const addresses = x.addresses.some((r) => r.cur === order.cur && r.addr === order.payer) ? x.addresses : [...x.addresses, { cur: order.cur, addr: order.payer, order: orderId, at: Date.now() }];
    return { ...x, micro: (BigInt(x.micro) + delta).toString(), credits, addresses, at: Date.now() };
  });
  const st = String(payment.payment_status ?? order.status);
  await cas(env.STORE, key, (o) => ({
    ...o,
    status: st,
    creditedMicro: (BigInt(o.creditedMicro ?? '0') + delta).toString(),
    payinHash: payment.payin_hash ?? o.payinHash ?? null,
    actuallyPaid: payment.actually_paid ?? o.actuallyPaid ?? null,
    history: [...(o.history ?? []).slice(-30), { st, at: Date.now() }],
  }), (o) => ({ w: o.wallet, st: o.status, usd: String(o.usdCents), cur: o.cur }));
  if (delta > 0n) await update(env.STORE, 'coin/presale.json', (cur) => ({ soldMicro: (BigInt(cur?.soldMicro ?? '0') + delta).toString(), at: Date.now() }));
  if (delta > 0n) await appendLog(env.STORE, 'coin', { ev: 'buy_credit', wallet: order.wallet, micro: delta.toString(), usdCents: order.usdCents, cur: order.cur, order: orderId, payer: order.payer, txid: payment.payin_hash ?? null });
  return { ok: true, credited: delta.toString(), status: st };
}

// ---------------------------------------------------------------- IPN
export async function ipn(request, env) {
  const raw = await request.text();
  if (raw.length > 32_768) return { status: 413, body: { error: 'too_large' } };
  const payload = await verifyIpn(raw, request.headers.get('x-nowpayments-sig'), env.NOWPAYMENTS_IPN_SECRET);
  if (!payload) return { status: 401, body: { error: 'signature' } };
  await appendLog(env.STORE, 'np-ipn', { kind: payload.payment_id ? 'payment' : 'payout', id: String(payload.payment_id ?? payload.id ?? ''), status: String(payload.payment_status ?? payload.status ?? '') });
  if (payload.payment_id && payload.order_id) {
    // status diambil ulang dari API: IPN hanya pemicu, bukan sumber kebenaran
    const p = await np(env, `/v1/payment/${encodeURIComponent(String(payload.payment_id))}`);
    const r = await applyPayment(env, String(payload.order_id), p);
    return { status: 200, body: { ok: true, ...r } };
  }
  if (payload.unique_external_id || payload.batch_withdrawal_id) {
    const r = await payoutUpdate(env, payload);
    return { status: 200, body: { ok: true, ...r } };
  }
  return { status: 200, body: { ok: true, ignored: true } };
}

// ---------------------------------------------------------------- cairkan
export async function requestCashout(env, wallet, b) {
  const micro = parseCoins(b.coins);
  if (!micro) return { error: 'amount' };
  if (b.agree !== true) return { error: 'agreement' };
  const acct = await account(env, wallet);
  const dest = acct.addresses.find((r) => r.cur === b.cur && r.addr === b.addr);
  if (!dest) return { error: 'destination' }; // hanya alamat & mata uang yang pernah dipakai membeli
  const cfg = await coinCfg(env);
  const q = cashoutQuote({ micro, priceCents: cfg.priceCents, released: cfg.dexReleased });
  if (q.payoutCents < LIMITS.minCashoutUsd * 100) return { error: 'minimum', minUsd: LIMITS.minCashoutUsd, ...q };
  const id = `${Date.now().toString(36)}${hex(crypto.getRandomValues(new Uint8Array(5)))}`;
  try {
    await adjust(env, wallet, -micro, { ev: 'cashout', out: id, cur: dest.cur, to: dest.addr, ...q, coinsTo: 'buyback' });
  } catch (e) {
    return { error: e.message === 'balance' ? 'balance' : 'retry' };
  }
  const rec = { id, wallet: wallet.toLowerCase(), micro: micro.toString(), priceCents: cfg.priceCents, ...q, cur: dest.cur, code: CURRENCIES[dest.cur].code, addr: dest.addr, status: payoutReady(env) ? 'queued' : 'awaiting_payout_setup', at: Date.now(), history: [] };
  await createOnce(env.STORE, `coin/out/${id}.json`, rec, { w: rec.wallet, st: rec.status, usd: String(rec.payoutCents) });
  await createOnce(env.STORE, `coin/by/${rec.wallet}/x/${id}`, { id });
  await createOnce(env.STORE, `coin/queue/${id}`, { id });
  return { ok: true, cashout: publicCashout(rec) };
}

export const publicCashout = (o) => ({ id: o.id, at: o.at, coins: fmtCoins(o.micro), valueUsd: o.valueCents / 100, penaltyPct: o.penaltyPct, payoutUsd: o.payoutCents / 100, cur: o.cur, label: CURRENCIES[o.cur]?.label, to: o.addr, status: o.status, sent: o.np?.amount ?? null, txid: o.np?.hash ?? null });

/**
 * Satu putaran antrean payout (cron tiap 5 menit). Tanpa kredensial payout: tetap antre, admin melihatnya.
 * Dua fase dengan kunci tulis-sekali per pencairan, sehingga satu pencairan tidak pernah dibayar dua kali:
 *   queued → (kunci) → batch dibuat (np.batchId disimpan, status 'created') → verifikasi TOTP → 'sending' → IPN 'paid'.
 * Verifikasi gagal → putaran berikutnya hanya memverifikasi ulang batch yang sama, tidak membuat batch baru.
 */
export async function processCashouts(env, max = 10) {
  const q = await listKeys(env.STORE, 'coin/queue/', max);
  if (!q.length) return { processed: 0 };
  if (!payoutReady(env)) return { processed: 0, waiting: q.length, reason: 'payout_credentials_missing' };
  const meta = (x) => ({ w: x.wallet, st: x.status, usd: String(x.payoutCents) });
  const base = env.BASE_URL || 'https://axto.io';
  let done = 0;
  for (const o of q) {
    const id = o.key.slice('coin/queue/'.length);
    const key = `coin/out/${id}.json`;
    const lock = `coin/lock/${id}`;
    if (!(await createOnce(env.STORE, lock, { at: Date.now() }))) {
      const l = await env.STORE.head(lock);
      if (l && Date.now() - l.uploaded.getTime() > 15 * 60_000) await env.STORE.delete(lock); // kunci basi (pekerja mati)
      continue;
    }
    try {
      let rec = await readJSON(env.STORE, key);
      if (!rec || !['queued', 'awaiting_payout_setup', 'retry', 'created', 'waiting_balance'].includes(rec.status)) { await env.STORE.delete(o.key); continue; }
      if (!rec.np?.batchId) {
        const est = await np(env, '/v1/estimate', { query: { amount: rec.payoutCents / 100, currency_from: 'usd', currency_to: rec.code } });
        let amount = Number(est?.estimated_amount);
        const fee = await np(env, '/v1/payout/fee', { query: { currency: rec.code, amount } }).catch(() => null);
        const feeAmt = Number(fee?.fee ?? 0);
        amount = Math.floor((amount - (Number.isFinite(feeAmt) ? feeAmt : 0)) * 1e8) / 1e8;
        if (!(amount > 0)) throw Object.assign(new Error('amount_after_fee'), { status: 422 });
        // Payout NOWPayments dibayar dari saldo akun NOWPayments (dana pembelian member yang disimpan di sana). Bila saldo
        // mata uang ini belum cukup (mis. pembayaran diteruskan otomatis ke wallet setelmen), permintaan MENUNGGU — tidak
        // pernah dibatalkan — dan dicoba lagi tiap cron sampai saldo cukup.
        const bal = await np(env, '/v1/balance').catch(() => null);
        const have = Number(bal?.[rec.code]?.amount ?? bal?.[rec.code.toLowerCase()]?.amount ?? NaN);
        if (Number.isFinite(have) && have < amount + (Number.isFinite(feeAmt) ? feeAmt : 0)) {
          await cas(env.STORE, key, (x) => (x.status === 'waiting_balance' ? undefined : { ...x, status: 'waiting_balance', lastError: `saldo gerbang ${rec.code} ${have} < ${amount}`, history: [...(x.history ?? []).slice(-30), { st: 'waiting_balance', at: Date.now() }] }), meta);
          continue;
        }
        const batch = await np(env, '/v1/payout', { method: 'POST', bearer: true, body: { ipn_callback_url: `${base}${IPN_PATH}`, withdrawals: [{ address: rec.addr, currency: rec.code, amount, unique_external_id: rec.id, ipn_callback_url: `${base}${IPN_PATH}` }] } });
        const batchId = String(batch?.id ?? batch?.batch_withdrawal_id ?? '');
        if (!batchId) throw new Error('batch_id');
        const payoutId = String((batch?.withdrawals ?? [])[0]?.id ?? '');
        rec = await cas(env.STORE, key, (x) => ({ ...x, status: 'created', np: { batchId, payoutId, amount, fee: feeAmt }, history: [...(x.history ?? []), { st: 'created', at: Date.now() }] }), meta);
        if (payoutId) await createOnce(env.STORE, `coin/payout/${payoutId}`, { id: rec.id });
      }
      await np(env, `/v1/payout/${encodeURIComponent(rec.np.batchId)}/verify`, { method: 'POST', bearer: true, body: { verification_code: await totp(env.NOWPAYMENTS_2FA_SECRET) } });
      await cas(env.STORE, key, (x) => ({ ...x, status: 'sending', history: [...(x.history ?? []), { st: 'sending', at: Date.now() }] }), meta);
      await env.STORE.delete(o.key);
      done += 1;
    } catch (e) {
      const cur = await readJSON(env.STORE, key);
      const created = !!cur?.np?.batchId; // batch sudah ada: jangan pernah batal di sini, cukup verifikasi ulang nanti
      // saldo kurang bukan kegagalan permanen: tunggu, jangan batalkan pencairan member
      const lowBalance = /balance|insufficient|not enough|funds/i.test(String(e.detail ?? e.message ?? ''));
      const fatal = !created && !lowBalance && e.status && e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 429;
      await cas(env.STORE, key, (x) => ({ ...x, status: fatal ? 'failed' : created ? 'created' : lowBalance ? 'waiting_balance' : 'retry', lastError: String(e.detail ?? e.message).slice(0, 160), history: [...(x.history ?? []).slice(-30), { st: fatal ? 'failed' : 'retry', at: Date.now(), e: String(e.detail ?? e.message).slice(0, 120) }] }), meta);
      if (fatal) { await refundCashout(env, id); await env.STORE.delete(o.key); }
    } finally {
      await env.STORE.delete(lock);
    }
  }
  return { processed: done, waiting: q.length - done };
}

async function refundCashout(env, id) {
  const rec = await readJSON(env.STORE, `coin/out/${id}.json`);
  if (!rec) return;
  if (!(await createOnce(env.STORE, `coin/refund/${id}`, { at: Date.now() }))) return; // sekali saja
  await adjust(env, rec.wallet, BigInt(rec.micro), { ev: 'cashout_refund', out: id });
  await cas(env.STORE, `coin/out/${id}.json`, (x) => ({ ...x, status: 'refunded' }), (x) => ({ w: x.wallet, st: x.status, usd: String(x.payoutCents) }));
}

/** IPN payout: status akhir dicatat; gagal/ditolak → koin dikembalikan ke member. */
async function payoutUpdate(env, p) {
  let id = String(p.unique_external_id ?? '');
  if (!/^[0-9a-z]{8,40}$/.test(id) && p.id) id = String((await readJSON(env.STORE, `coin/payout/${String(p.id).replace(/[^0-9A-Za-z_-]/g, '')}`))?.id ?? '');
  if (!/^[0-9a-z]{8,40}$/.test(id)) return { error: 'external_id' };
  const key = `coin/out/${id}.json`;
  const rec = await readJSON(env.STORE, key);
  if (!rec) return { error: 'cashout' };
  const st = String(p.status ?? p.payout_status ?? '').toLowerCase();
  await cas(env.STORE, key, (x) => ({ ...x, status: st === 'finished' ? 'paid' : x.status === 'paid' ? 'paid' : st || x.status, np: { ...(x.np ?? {}), hash: p.hash ?? x.np?.hash ?? null }, history: [...(x.history ?? []).slice(-30), { st, at: Date.now() }] }), (x) => ({ w: x.wallet, st: x.status, usd: String(x.payoutCents) }));
  if (st === 'finished' && (await createOnce(env.STORE, `coin/paid/${id}`, { at: Date.now() }))) {
    await appendLog(env.STORE, 'coin', { ev: 'cashout_paid', wallet: rec.wallet, micro: '0', out: id, payoutCents: rec.payoutCents, cur: rec.cur, to: rec.addr, txid: p.hash ?? null });
  }
  if (['failed', 'rejected'].includes(st)) await refundCashout(env, id);
  return { status: st };
}

// ---------------------------------------------------------------- tampilan member & admin
export async function memberView(env, wallet) {
  const a = await account(env, wallet);
  const cfg = await coinCfg(env);
  const w = wallet.toLowerCase();
  const [orders, outs] = await Promise.all([
    listKeys(env.STORE, `coin/by/${w}/o/`, 1000).then((xs) => xs.slice(-50).map((o) => ({ key: `coin/order/${o.key.split('/').pop()}.json` }))),
    listKeys(env.STORE, `coin/by/${w}/x/`, 1000).then((xs) => xs.slice(-50).map((o) => ({ key: `coin/out/${o.key.split('/').pop()}.json` }))),
  ]);
  const read = async (xs) => (await Promise.all(xs.map((o) => readJSON(env.STORE, o.key)))).filter(Boolean);
  return {
    balance: fmtCoins(a.micro),
    priceUsd: cfg.priceCents / 100,
    dexReleased: cfg.dexReleased,
    penaltyPct: cfg.dexReleased ? 0 : PENALTY_BEFORE_DEX,
    destinations: a.addresses.map((r) => ({ cur: r.cur, label: CURRENCIES[r.cur]?.label, addr: r.addr })),
    orders: (await read(orders)).map(publicOrder).reverse(),
    cashouts: (await read(outs)).map(publicCashout).reverse(),
    agreementV: AGREEMENT_V,
    limits: LIMITS,
  };
}

export async function orderStatus(env, wallet, id) {
  if (!/^[0-9a-z]{8,40}$/.test(id)) return null;
  const o = await readJSON(env.STORE, `coin/order/${id}.json`);
  if (!o || o.wallet !== wallet.toLowerCase()) return null;
  // belum ada IPN: tanya API sesekali (tanpa menunggu IPN) lalu terapkan bila sudah selesai
  if (o.np?.payment_id && !['finished', 'failed', 'expired', 'refunded'].includes(o.status) && Date.now() - (o.checkedAt ?? 0) > 20_000) {
    try {
      const p = await np(env, `/v1/payment/${encodeURIComponent(o.np.payment_id)}`);
      await applyPayment(env, id, p);
      await cas(env.STORE, `coin/order/${id}.json`, (x) => ({ ...x, checkedAt: Date.now() }), (x) => ({ w: x.wallet, st: x.status, usd: String(x.usdCents), cur: x.cur }));
    } catch { /* coba lagi nanti */ }
  }
  return publicOrder(await readJSON(env.STORE, `coin/order/${id}.json`));
}

/** Ringkasan seluruh koin untuk portal admin: dari dokumen akun, pesanan, pencairan & log peristiwa. */
export async function adminView(env) {
  const cfg = await coinCfg(env);
  const [accts, orders, outs, queue] = await Promise.all([
    listKeys(env.STORE, 'coin/acct/', 100_000),
    listKeys(env.STORE, 'coin/order/', 100_000),
    listKeys(env.STORE, 'coin/out/', 100_000),
    listKeys(env.STORE, 'coin/queue/', 10_000),
  ]);
  const read = async (xs) => (await Promise.all(xs.map((o) => readJSON(env.STORE, o.key)))).filter(Boolean);
  const accounts = await read(accts);
  const orderDocs = await read(orders.slice(-300));
  const outDocs = await read(outs.slice(-300));
  let held = 0n;
  for (const a of accounts) held += BigInt(a.micro);
  // log peristiwa 60 hari terakhir: total terjual (presale), dibeli kembali (buyback), nilai
  let sold = 0n;
  let returned = 0n; // ke wallet buyback
  let usdIn = 0;
  let usdOut = 0;
  const events = [];
  for (let d = 0; d < 60; d += 1) {
    const day = new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
    for (const o of await listKeys(env.STORE, `log/coin/${day}/`, 10_000)) {
      const e = await readJSON(env.STORE, o.key);
      if (!e) continue;
      if (e.ev === 'buy_credit') { sold += BigInt(e.micro); usdIn += Number(e.usdCents ?? 0); }
      if (e.ev === 'cashout') returned += -BigInt(e.micro);
      if (e.ev === 'cashout_refund') returned -= BigInt(e.micro);
      if (e.ev === 'cashout_paid') usdOut += Number(e.payoutCents ?? 0);
      if (events.length < 300) events.push({ ...e, coins: fmtCoins(BigInt(e.micro ?? '0') < 0n ? -BigInt(e.micro) : BigInt(e.micro ?? '0')), sign: BigInt(e.micro ?? '0') < 0n ? '-' : '+' });
    }
  }
  const priv = (await readJSON(env.STORE, 'private/config.json').catch(() => null)) ?? {};
  let np_ = null;
  try {
    const [status, coins, balance] = await Promise.all([
      np(env, '/v1/status').catch((e) => ({ error: e.message })),
      np(env, '/v1/merchant/coins').catch((e) => ({ error: e.message })),
      np(env, '/v1/balance').catch((e) => ({ error: e.message })),
    ]);
    const enabled = Array.isArray(coins?.selectedCurrencies) ? coins.selectedCurrencies.map((x) => String(x).toLowerCase()) : null;
    np_ = { status, balance, currencies: Object.fromEntries(Object.entries(CURRENCIES).map(([k, c]) => [k, { code: c.code, enabled: enabled ? enabled.includes(c.code) : null }])) };
  } catch (e) { np_ = { error: e.message }; }
  return {
    cfg: { ...cfg, priceUsd: cfg.priceCents / 100, penaltyPct: cfg.dexReleased ? 0 : PENALTY_BEFORE_DEX, agreementV: AGREEMENT_V },
    ipnUrl: `${env.BASE_URL || 'https://axto.io'}${IPN_PATH}`,
    ready: { api: !!env.NOWPAYMENTS_API_KEY, ipn: !!env.NOWPAYMENTS_IPN_SECRET, payout: payoutReady(env) },
    totals: { members: accounts.length, heldByMembers: fmtCoins(held), soldViaGateway: fmtCoins(sold), presaleSold: fmtCoins((await presaleSold(env)).toString()), boughtBack: fmtCoins(returned), usdIn: usdIn / 100, usdPaidOut: usdOut / 100, queue: queue.length },
    // alamat privat (R2 private/config.json, tidak pernah di repo): wallet buyback & alamat setelmen NOWPayments
    buyback: { address: priv.buyback ?? null, coins: fmtCoins(returned) },
    settlement: priv.nowpaymentsSettlement ?? null,
    orders: orderDocs.map((o) => ({ ...publicOrder(o), wallet: o.wallet, country: o.country })).reverse(),
    cashouts: outDocs.map((o) => ({ ...publicCashout(o), wallet: o.wallet, lastError: o.lastError ?? null })).reverse(),
    events,
    np: np_,
  };
}

export async function setCfg(env, admin, b) {
  const cur = await coinCfg(env);
  const priceCents = Number.isInteger(b.priceCents) && b.priceCents >= 1 && b.priceCents <= 1_000_000 ? b.priceCents : cur.priceCents;
  const v = { priceCents, dexReleased: b.dexReleased === true, by: admin, at: new Date().toISOString() };
  await env.STORE.put('cfg/coin.json', JSON.stringify(v), JSONH);
  await appendLog(env.STORE, 'admin', { ev: 'coin-cfg', ...v });
  return v;
}
