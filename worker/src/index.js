/**
 * axto-web — Worker publik axto.io.
 * Generatif tanpa R2: /api/meta, /img/*.svg, /play/* (dihitung dari DNA tiap permintaan, di-cache di tepi).
 * Tiga pasar terpisah (pemilik 23 Nov 2026): toko eksklusif axto.io ($1/edisi, koin AXTO) · pasar member (koin AXTO,
 * fee 10%) · OpenSea (koleksi publik, hanya ditampilkan). Data toko/pasar/kustodi/WD: R2 (shop.js). Kunci privat hanya
 * di vault (Service Binding).
 */
import { dna } from '../../engine/src/dna.js';
import { metadata, contractMetadata, renderCtx, animatedSvg, renderPlayerLive, attributesId, attributesFor, hadithBlurb, browse, browseList, listFacets, seriesKey, seriesOptions, quranRef } from '../../engine/src/metadata.js';
import { showcaseIds, SHOWCASE_KEYS, priceUsd } from '../../engine/src/showcase.js';
import { edition, designOf } from '../../engine/src/editions.js';
import { hadithRef } from '../../engine/src/render/hadith.js';
import { collectionSeo, seriesSeo, surahSeo, hubSeo, breadcrumb, itemList, seriesLabel, surahInfo, BREAD } from './seo.js';
import { COLLECTIONS, sha256Hex } from '../../engine/src/core.js';
import { canonical } from '../../engine/src/dna.js';
import { MODELS } from '../../engine/src/catalog/model.js';
import { LANGS, T, PATHS, LEGACY, pickLang, pageFromSlug } from './i18n.js';
import { page, nonce, securityHeaders, esc } from './html.js';
import * as P from './pages.js';
import { ADS_TXT } from './adsense.js';
import { session, siweStart, siweFinish, logout, saveProfile, publicProfile, loadMember, rateLimit, hmac } from './auth.js';
import { createOrder, captureOrder, webhook } from './paypal.js';
import { dailyBackup, appendLog, readJSON, listKeys } from './r2.js';
import { ownerOf, isAddress } from './eth.js';
import { Ledger, KEYS } from './ledger.js';
import { withCfg, saveContracts, NETWORKS } from './config.js';
import { vault } from './vault.js';
import * as COIN from './coin.js';
import * as SHOP from './shop.js';
import { hadithItem, translateHadith } from './translate.js';

export { Ledger };

/** Nama EIP-712 kontrak eksklusif (harus sama dengan nama saat deploy, contracts/scripts/deploy.mjs). */
export const EX_NAMES = { 'ex-time': 'AXTO Exclusive Time', 'ex-stamp': 'AXTO Exclusive Stamp', 'ex-quran': "AXTO Exclusive Qur'an", 'ex-model': 'AXTO Exclusive Model', 'ex-hadith': 'AXTO Exclusive Hadith' };

const IMMUTABLE = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';
const json = (v, status = 200, extra = {}) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra } });
const ledger = (env) => env.LEDGER.get(env.LEDGER.idFromName('main'));

/**
 * Etalase publik (perintah pemilik #45): 5.000 karya acak per jenis yang belum terjual, ditulis mesin listing ke R2
 * (os/showcase-<c>.json) tiap jam. Sebelum ada (kontrak belum aktif) dihitung langsung dari urutan acak yang sama.
 */
const SHOW = new Map();
async function showcase(env, c) {
  const hit = SHOW.get(c);
  if (hit && Date.now() - hit.at < 300_000) return hit;
  let ids = null;
  try { ids = (await readJSON(env.STORE, `os/showcase-${c}.json`))?.ids ?? null; } catch { ids = null; }
  if (!Array.isArray(ids) || !ids.length) ids = showcaseIds(c).ids;
  const v = { at: Date.now(), ids, set: new Set(ids), facets: null };
  SHOW.set(c, v);
  return v;
}
const facetsOf = (c, sc) => (sc.facets ??= listFacets(c, sc.ids));
/** Koleksi OpenSea aktif (kontrak edisi sudah dideploy) — sebelum itu halaman jujur menyebut „segera hadir di OpenSea". */
const osLive = (env) => /^0x[0-9a-fA-F]{40}$/.test(env.COLLECTION_TIME ?? '');
const colAddrOf = (env) => (c) => env[`COLLECTION_${c.replace('-', '_').toUpperCase()}`] ?? '';
/** Karya GPU (seri G-) per koleksi publik: R2 os/gpu-<c>.json {ids:[…]} ditulis pipeline GPU; kosong sampai produksi. */
const GPU = new Map();
async function gpuIds(env, c) {
  const hit = GPU.get(c);
  if (hit && Date.now() - hit.at < 300_000) return hit.ids;
  let ids = [];
  try { ids = (await readJSON(env.STORE, `os/gpu-${c}.json`))?.ids ?? []; } catch { ids = []; }
  const v = { at: Date.now(), ids: Array.isArray(ids) ? ids.filter((x) => Number.isSafeInteger(x) && x >= 1 && x <= COLLECTIONS[c].max) : [] };
  GPU.set(c, v);
  return v.ids;
}
/** Edisi eksklusif terjual per karya (cache 60 dtk per isolate). */
const SOLD = new Map();
async function soldOf(env, c) {
  const hit = SOLD.get(c);
  if (hit && Date.now() - hit.at < 60_000) return hit.map;
  const map = await SHOP.soldMap(env, c);
  SOLD.set(c, { at: Date.now(), map });
  return map;
}
const validToken = (c, id) => COLLECTIONS[c] && Number.isSafeInteger(id) && id >= 1 && id <= COLLECTIONS[c].max;

/** Penyedia data Qur'an & foto model dari ASSETS (tanpa R2). */
function assetProvider(env, origin) {
  const get = async (p) => (await env.ASSETS.fetch(new Request(`${origin}/quran/${p}`))).json();
  const prov = {
    async ayah(s, a) { const j = await get(`s/${s}.json`); const v = j.ayat[a - 1]; return { ar: v.ar, tr: v.tr, lt: v.lt }; },
    async page(p) { return get(`h/${p}.json`); },
    async hadith(k, n) { return hadithItem(env, origin, k, n); }, // #49: teks hadits dari aset statis
  };
  // Wajah model hanya disisipkan bila izin tertulis model tercatat (MODEL_CONSENT berisi id model, mis. "luaja-1").
  // Disisipkan sebagai data-URI: SVG yang ditampilkan lewat <img>/OpenSea tidak boleh memuat gambar eksternal.
  const consent = String(env.MODEL_CONSENT ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  if (consent.length) {
    prov.head = async (modelId, file) => {
      if (!MODELS.some((x) => x.id === modelId) || !consent.includes(modelId) || !/^p\d{1,2}$/.test(file)) return null;
      const o = await env.STORE.get(`model/${modelId}/${file}-s.webp`); // potret privat di R2 (diunggah dari repo coinaxto)
      if (!o) return null;
      const b = new Uint8Array(await o.arrayBuffer());
      let bin = '';
      for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
      return `data:image/webp;base64,${btoa(bin)}`;
    };
  }
  return prov;
}

/** Versi render: naikkan saat tampilan karya berubah → cache tepi lama otomatis tidak terpakai. */
const RENDER_V = '11';
async function cached(request, ctx, make) {
  const cache = caches.default;
  const u = new URL(request.url);
  u.searchParams.set('rv', RENDER_V);
  const key = new Request(u.toString(), { method: 'GET' });
  const hit = await cache.match(key);
  if (hit) return hit;
  const res = await make();
  if (res.ok) ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

function sameOrigin(request, env) {
  const o = request.headers.get('origin');
  return o === env.BASE_URL || o === env.BASE_URL.replace('://', '://www.');
}

async function readBody(request, max = 16_384) {
  const t = await request.text();
  if (t.length > max) throw new Error('body_too_large');
  return t ? JSON.parse(t) : {};
}

/** Verifikasi commit engine: HMAC-SHA256(`${ts}.${body}`), jendela 5 menit. */
async function engineAuth(request, env, body) {
  const ts = Number(request.headers.get('x-axto-ts'));
  const sig = request.headers.get('x-axto-sig') ?? '';
  if (!ts || Math.abs(Date.now() - ts) > 300_000) return false;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.ENGINE_HMAC_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const raw = Uint8Array.from((sig.match(/../g) ?? []).map((h) => parseInt(h, 16)));
  return crypto.subtle.verify('HMAC', k, raw, new TextEncoder().encode(`${ts}.${body}`));
}

async function api(request, env, ctx, url) {
  const p = url.pathname;
  const method = request.method;
  const ip = request.headers.get('cf-connecting-ip') ?? '0';
  // IPN NOWPayments: datang dari server NOWPayments (bukan peramban) — dilindungi tanda tangan HMAC-SHA512, bukan Origin
  if (p === COIN.IPN_PATH) {
    if (method !== 'POST') return json({ error: 'method' }, 405);
    try {
      const r = await COIN.ipn(request, env);
      return json(r.body, r.status);
    } catch (e) {
      ctx.waitUntil(appendLog(env.STORE, 'error', { path: p, e: String(e?.message ?? e).slice(0, 500) }));
      return json({ error: 'retry' }, 500); // NOWPayments mengirim ulang
    }
  }
  if (method === 'POST' && !p.startsWith('/api/paypal/webhook') && !p.startsWith('/internal/') && !sameOrigin(request, env)) return json({ error: 'origin' }, 403);
  if (!(await rateLimit(env, `ip:${ip}`, method === 'POST' ? 60 : 300))) return json({ error: 'rate_limited' }, 429);

  // metadata (tokenURI) — generatif
  let m = /^\/api\/meta\/([a-z-]+)\/(\d+)$/.exec(p);
  if (m) {
    const [c, id] = [m[1], Number(m[2])];
    if (!validToken(c, id)) return json({ error: 'not_found' }, 404);
    return cached(request, ctx, async () => json(metadata(c, id, env.BASE_URL), 200, { 'cache-control': IMMUTABLE, 'access-control-allow-origin': '*' }));
  }
  // metadata kontrak edisi ERC-1155 (uri = /api/edition/<koleksi>/<id>): koleksi OpenSea → id = urutan rilis k, karyanya
  // designOf(k); eksklusif → id = karya. Edisi & harga dari engine/src/editions.js (sama dengan kontrak & listing).
  m = /^\/api\/edition\/([a-z-]+)\/(\d+)$/.exec(p);
  if (m && COLLECTIONS[m[1]]) {
    const [c, n] = [m[1], Number(m[2])];
    const ex = COLLECTIONS[c].exclusive;
    if (!Number.isSafeInteger(n) || n < 1 || n > COLLECTIONS[c].max) return json({ error: 'not_found' }, 404);
    const design = ex ? n : designOf(c, n);
    const e = edition(c, design);
    return cached(request, ctx, async () => {
      const meta = metadata(c, design, env.BASE_URL);
      return json({ ...meta, external_url: `${env.BASE_URL}/en/nft/${c}/${design}`, properties: { design, edition_size: e.supply, price_usd: e.priceUsd, tier: e.tier } }, 200, { 'cache-control': IMMUTABLE, 'access-control-allow-origin': '*' });
    });
  }
  m = /^\/api\/contract\/([a-z-]+)$/.exec(p);
  if (m && COLLECTIONS[m[1]]) return json(contractMetadata(m[1], env.BASE_URL), 200, { 'cache-control': IMMUTABLE, 'access-control-allow-origin': '*' });

  // #51: daftar token standar (tokenlists.org) dengan logo AXTO Coin
  if (p === '/api/tokenlist' || p === '/tokenlist.json') {
    const tokens = env.AXTO_TOKEN ? [{ chainId: Number(env.CHAIN_ID), address: env.AXTO_TOKEN, name: 'AXTO Coin', symbol: 'AXTO', decimals: 18, logoURI: `${env.BASE_URL}/brand/axto-coin-256.png` }] : [];
    return json({ name: 'AXTO', logoURI: `${env.BASE_URL}/brand/axto-coin-256.png`, keywords: ['axto'], timestamp: new Date().toISOString(), version: { major: 1, minor: 0, patch: tokens.length }, tokens }, 200, { 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' });
  }
  if (p === '/api/stats') return json(await ledger(env).stats(), 200, { 'cache-control': 'public, max-age=30' });
  // penjelajah koleksi cepat (perintah pemilik #37): karya berikutnya + saringan tier/seri, deterministik
  m = /^\/api\/browse\/([a-z-]+)$/.exec(p);
  if (m && COLLECTIONS[m[1]]) {
    const q = url.searchParams;
    const tier = q.get('tier') === null || q.get('tier') === '' ? null : Number(q.get('tier'));
    const n = Math.min(120, Math.max(1, Number(q.get('n') ?? 60) | 0));
    if (!COLLECTIONS[m[1]].exclusive) {
      const gpu = q.get('maker') === 'gpu';
      const ids = gpu ? await gpuIds(env, m[1]) : (await showcase(env, m[1])).ids;
      const surah = Math.min(114, Math.max(0, Number(q.get('surah') ?? 0) | 0));
      const r = browseList(m[1], ids, { from: Number(q.get('from') ?? 1) | 0, n, tier: Number.isInteger(tier) && tier >= 0 && tier <= 4 ? tier : null, series: String(q.get('series') ?? '').slice(0, 32), surah });
      if (gpu) r.items = r.items.map((it) => ({ ...it, gpu: true }));
      return json(r, 200, { 'cache-control': 'public, max-age=60' });
    }
    // eksklusif: semua 10.000 karya tersedia di toko; kartu memuat $1 + sisa edisi
    const r = browse(m[1], { from: Number(q.get('from') ?? 1) | 0, n, tier: Number.isInteger(tier) && tier >= 0 && tier <= 4 ? tier : null, series: String(q.get('series') ?? '').slice(0, 32), produced: COLLECTIONS[m[1]].max });
    const sold = await soldOf(env, m[1]);
    r.items = r.items.map((it) => ({ ...it, usd: 1, left: 10 - (sold[it.id] ?? 0) }));
    return json(r, 200, { 'cache-control': 'public, max-age=30' });
  }
  // #49: mesin penerjemah hadits (terjemahan penerjemah bila ada, selain itu Workers AI), cache tepi 30 hari
  // Terjemah Al-Qur'an tepercaya dalam bahasa pengunjung (QuranEnc → R2, engine/bin/import-quran-tr.mjs) — pemilik,
  // 22 Nov 2026: „Klo Al-quran mah jgn di terjemah sembarangan … Berlaku jg untu axto.io". Tidak ada terjemahan
  // mesin di sini: bahasa tanpa terjemahan tepercaya menjawab 404 dan player tetap pada terjemah Kemenag.
  if (p === '/api/quran/tr') {
    const l = String(url.searchParams.get('l') ?? '').toLowerCase();
    const s = Number(url.searchParams.get('s'));
    const kind = url.searchParams.get('k') === 'mukhtasar' ? 'mukhtasar' : 'tr';
    if (!/^[a-z]{2}$/.test(l) || !Number.isInteger(s) || s < 1 || s > 114) return json({ error: 'params' }, 400);
    const [meta, file] = await Promise.all([env.STORE.get(`quran/${kind}/${l}/meta.json`), env.STORE.get(`quran/${kind}/${l}/${s}.json`)]);
    if (!meta || !file) return json({ error: 'none' }, 404, { 'cache-control': 'public, max-age=3600' });
    const m = await meta.json();
    const f = await file.json();
    return json(
      { lang: l, kind, credit: `${m.title} · ${m.source} v${m.version}`, url: m.url, ayat: f.ayat },
      200,
      { 'cache-control': 'public, max-age=86400' },
    );
  }
  if (p === '/api/hadith/tr') {
    const q = url.searchParams;
    const to = String(q.get('to') ?? '').toLowerCase().slice(0, 3);
    const n = Number(q.get('n'));
    if (!Number.isSafeInteger(n) || n < 1) return json({ error: 'n' }, 400);
    if (!(await rateLimit(env, `tr:${request.headers.get('cf-connecting-ip') ?? 'x'}`, 40))) return json({ error: 'rate_limited' }, 429);
    const r = await translateHadith(env, url.origin, String(q.get('c') ?? ''), n, to, ctx);
    return json(r, r.error ? 400 : 200, r.error ? {} : { 'cache-control': 'public, max-age=86400' });
  }
  // ---- pasar member (baca, publik) ----
  if (p === '/api/market' && method === 'GET') {
    const c = url.searchParams.get('c');
    const mode = url.searchParams.get('mode');
    return json(await SHOP.openListings(env, { c: SHOP.EX_KEYS.includes(c) ? c : undefined, mode: SHOP.MODES.includes(mode) ? mode : undefined, sort: url.searchParams.get('sort') ?? 'new' }), 200, { 'cache-control': 'public, max-age=15' });
  }
  m = /^\/api\/market\/listing\/(l-[0-9a-f]{18})$/.exec(p);
  if (m) { const L = await SHOP.getListing(env, m[1]); return L ? json(SHOP.publicListing(L)) : json({ error: 'not_found' }, 404); }
  m = /^\/api\/shop\/stock\/([a-z-]+)\/(\d+)$/.exec(p);
  if (m && COLLECTIONS[m[1]]?.exclusive && validToken(m[1], Number(m[2]))) return json({ ...(await SHOP.stockOf(env, m[1], Number(m[2]))), priceCoins: COIN.fmtCoins(await SHOP.editionMicro(env)) }, 200, { 'cache-control': 'no-store' });

  // konfigurasi publik untuk klien (alamat kontrak, chain)
  if (p === '/api/config') {
    const cols = Object.fromEntries(KEYS.map((c) => [c, env[`COLLECTION_${c.replace('-', '_').toUpperCase()}`] ?? null]));
    return json({ chainId: Number(env.CHAIN_ID), standard: env.STANDARD ?? 'erc721', usdc: env.USDC ?? null, axto: env.AXTO_TOKEN ?? null, collections: cols, names: EX_NAMES }, 200, { 'cache-control': 'public, max-age=300' });
  }

  // ---- auth (SIWE) ----
  if (p === '/api/auth/nonce' && method === 'POST') {
    const b = await readBody(request);
    if (!isAddress(b.address)) return json({ error: 'address' }, 400);
    return json(await siweStart(env, b.address, b.lang === 'id' ? 'id' : 'en'));
  }
  if (p === '/api/auth/verify' && method === 'POST') {
    if (!(await rateLimit(env, `login:${ip}`, 10))) return json({ error: 'rate_limited' }, 429);
    try {
      const r = await siweFinish(env, await readBody(request));
      return json({ wallet: r.wallet }, 200, { 'set-cookie': r.cookie });
    } catch (e) { return json({ error: String(e.message) }, 401); }
  }
  const s = await session(request, env);
  if (p === '/api/auth/logout' && method === 'POST') return json({ ok: true }, 200, { 'set-cookie': await logout(env, s) });
  if (p === '/api/me') {
    if (!s) return json({ wallet: null });
    const u = await loadMember(env, s.wallet);
    return json({ ...(u ? await publicProfile(env, u) : { wallet: s.wallet }), admin: s.admin });
  }
  // ---- koin AXTO lewat NOWPayments (beli, status pesanan, cairkan) ----
  if (p === '/api/coin/quote') return json(await COIN.quote(env, { usd: url.searchParams.get('usd'), cur: url.searchParams.get('cur') }), 200, { 'cache-control': 'private, max-age=30' });
  if (p === '/api/coin/agreement') {
    const l = url.searchParams.get('lang') === 'id' ? 'id' : 'en';
    return json({ v: COIN.AGREEMENT_V, lang: l, items: COIN.AGREEMENT[l], hash: await COIN.agreementHash(l), currencies: Object.fromEntries(Object.entries(COIN.CURRENCIES).map(([k, c]) => [k, c.label])), limits: COIN.LIMITS }, 200, { 'cache-control': 'public, max-age=300' });
  }
  if (p === '/api/coin/buy' && method === 'POST') {
    if (!s) return json({ error: 'auth' }, 401);
    if (!(await rateLimit(env, `coinbuy:${s.wallet}`, 10))) return json({ error: 'rate_limited' }, 429);
    const b = await readBody(request, 2048);
    const r = await COIN.buy(env, s.wallet, b, { lang: b.lang === 'id' ? 'id' : 'en', country: request.headers.get('cf-ipcountry'), base: env.BASE_URL || url.origin });
    return json(r, r.ok ? 200 : 400, { 'cache-control': 'private, no-store' });
  }
  if (p === '/api/coin/me') {
    if (!s) return json({ error: 'auth' }, 401);
    return json(await COIN.memberView(env, s.wallet), 200, { 'cache-control': 'private, no-store' });
  }
  m = /^\/api\/coin\/order\/([0-9a-z]{8,40})$/.exec(p);
  if (m) {
    if (!s) return json({ error: 'auth' }, 401);
    const o = await COIN.orderStatus(env, s.wallet, m[1]);
    return o ? json(o, 200, { 'cache-control': 'private, no-store' }) : json({ error: 'not_found' }, 404);
  }
  if (p === '/api/coin/cashout' && method === 'POST') {
    if (!s) return json({ error: 'auth' }, 401);
    if (!(await rateLimit(env, `cashout:${s.wallet}`, 5))) return json({ error: 'rate_limited' }, 429);
    const r = await COIN.requestCashout(env, s.wallet, await readBody(request, 1024));
    if (r.ok) ctx.waitUntil(COIN.processCashouts(env).catch(() => null));
    return json(r, r.ok ? 200 : 400, { 'cache-control': 'private, no-store' });
  }
  if (p === '/api/admin/coin') {
    if (!s?.admin) return json({ error: 'admin_only' }, 403);
    return json(await COIN.adminView(env), 200, { 'cache-control': 'private, no-store' });
  }
  if (p === '/api/admin/coin/cfg' && method === 'POST') {
    if (!s?.admin) return json({ error: 'admin_only' }, 403);
    return json(await COIN.setCfg(env, s.wallet, await readBody(request, 512)), 200, { 'cache-control': 'private, no-store' });
  }
  if (p === '/api/me/profile' && method === 'POST') {
    if (!s) return json({ error: 'auth' }, 401);
    try { return json(await saveProfile(env, s.wallet, await readBody(request))); } catch (e) { return json({ error: String(e.message) }, 400); }
  }

  // ---- portal admin: deploy kontrak dari MetaMask admin ----
  if (p === '/api/admin/setup') {
    if (!s?.admin) return json({ error: 'admin_only' }, 403);
    let signer = null;
    try { signer = (await vault(env, 'signerAddress', {})).address; } catch { signer = null; }
    const coin = { chainId: Number(env.CHAIN_ID), token: env.AXTO_TOKEN || '', sale: env.AXTO_SALE || '', wallets: { bank: env.COIN_WALLET, presale: env.PRESALE_WALLET, vesting: env.VESTING_WALLET, hold: env.HOLD_WALLET, treasury: env.TREASURY } };
    const opensea = { status: await readJSON(env.STORE, 'cfg/opensea.json').catch(() => null), pause: await readJSON(env.STORE, 'cfg/opensea-pause.json').catch(() => null) };
    return json({ admin: env.ADMIN_WALLET, coinWallet: env.COIN_WALLET, treasury: env.TREASURY, signer, networks: NETWORKS, coin, opensea, active: await readJSON(env.STORE, 'cfg/active.json'), deployer: await readJSON(env.STORE, 'cfg/deployer.json') }, 200, { 'cache-control': 'private, no-store' });
  }
  // #48 zero hand: listing OpenSea berjalan sendiri; admin hanya bisa menjeda / melanjutkan
  if (p === '/api/admin/opensea-pause' && method === 'POST') {
    if (!s?.admin) return json({ error: 'admin_only' }, 403);
    if (!(request.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'content_type' }, 415);
    const b = await readBody(request, 512);
    const v = { paused: b.paused === true, by: s.wallet, at: new Date().toISOString() };
    await env.STORE.put('cfg/opensea-pause.json', JSON.stringify(v), { httpMetadata: { contentType: 'application/json' } });
    await appendLog(env.STORE, 'admin', { ev: 'opensea-pause', paused: v.paused, by: s.wallet });
    return json({ ok: true, ...v });
  }
  if (p === '/api/admin/contracts' && method === 'POST') {
    if (!s?.admin) return json({ error: 'admin_only' }, 403);
    const b = await readBody(request, 8192);
    const r = await saveContracts(env, s.wallet, b);
    if (r.ok) {
      try { await vault(env, 'setConfig', { chainId: r.cfg.chainId, standard: r.cfg.standard, auctionHouse: r.cfg.auctionHouse, sale: r.cfg.sale, usdc: r.cfg.usdc, rpc: NETWORKS[r.cfg.chainId].rpc }); } catch (e) { r.vault = String(e.message); }
    }
    return json(r, r.ok ? 200 : 400);
  }

  // ---- lelang ----
  // ---- toko eksklusif, pasar member, kustodi & WD (wajib masuk; R2 lewat shop.js) ----
  const act = async (name, max, fn) => {
    if (!s) return json({ error: 'auth' }, 401);
    if (!(await rateLimit(env, `${name}:${s.wallet}`, max))) return json({ error: 'rate_limited' }, 429);
    const r = await fn(await readBody(request, 8192));
    if (r.ok) SOLD.clear();
    return json(r, r.ok ? 200 : 400, { 'cache-control': 'private, no-store' });
  };
  if (method === 'POST') {
    if (p === '/api/shop/buy') return act('shopbuy', 20, (b) => SHOP.buyExclusive(env, s.wallet, b));
    if (p === '/api/market/create') return act('mklist', 20, (b) => SHOP.createListing(env, s.wallet, b));
    if (p === '/api/market/buy') return act('mkbuy', 20, (b) => SHOP.buyListing(env, s.wallet, b));
    if (p === '/api/market/bid') return act('mkbid', 30, (b) => SHOP.bid(env, s.wallet, b));
    if (p === '/api/market/offer') return act('mkoffer', 20, (b) => SHOP.makeOffer(env, s.wallet, b));
    if (p === '/api/market/accept') return act('mkacc', 20, (b) => SHOP.acceptOffer(env, s.wallet, b));
    if (p === '/api/market/drop') return act('mkdrop', 30, (b) => SHOP.dropOffer(env, s.wallet, b));
    if (p === '/api/market/cancel') return act('mkcancel', 20, (b) => SHOP.cancelListing(env, s.wallet, b));
    if (p === '/api/wd') return act('wd', 10, (b) => SHOP.withdraw(env, s.wallet, b, colAddrOf(env), EX_NAMES));
    if (p === '/api/wd/minted') return act('wdmint', 20, (b) => SHOP.markMinted(env, s.wallet, b));
    if (p === '/api/gift') return act('gift', 20, (b) => SHOP.gift(env, s.wallet, b));
  }
  if (p === '/api/me/nft') {
    if (!s) return json({ error: 'auth' }, 401);
    const [h, hist, wd] = await Promise.all([SHOP.holdings(env, s.wallet), SHOP.history(env, s.wallet), SHOP.myWithdrawals(env, s.wallet, colAddrOf(env))]);
    const mine = [];
    for (const o of await listKeys(env.STORE, `x/by/${s.wallet.toLowerCase()}/l/`, 500)) {
      const L = await SHOP.getListing(env, o.key.split('/').pop());
      if (L && L.status === 'open') mine.push({ ...SHOP.publicListing(L), offersFull: L.offers.filter((x) => x.status === 'open').map((x) => ({ oid: x.oid, qty: x.qty, coins: COIN.fmtCoins(x.micro) })) });
    }
    return json({ ...h, history: hist, withdrawals: wd, listings: mine, contractsLive: Object.fromEntries(SHOP.EX_KEYS.map((c) => [c, !!colAddrOf(env)(c)])), chainId: Number(env.CHAIN_ID) }, 200, { 'cache-control': 'private, no-store' });
  }
  if (p === '/api/admin/shop') {
    if (!s?.admin) return json({ error: 'admin_only' }, 403);
    return json(await SHOP.adminView(env), 200, { 'cache-control': 'private, no-store' });
  }

  // ---- koin (PayPal) ----
  if (p === '/api/paypal/order' && method === 'POST') {
    if (!s) return json({ error: 'auth' }, 401);
    const b = await readBody(request);
    return json(await createOrder(env, s.wallet, b.coins));
  }
  if (p === '/api/paypal/capture' && method === 'POST') {
    if (!s) return json({ error: 'auth' }, 401);
    const b = await readBody(request);
    return json(await captureOrder(env, s.wallet, b.orderId));
  }
  if (p === '/api/paypal/webhook' && method === 'POST') return webhook(request, env);

  // ---- engine (GitHub Actions) ----
  if (p === '/internal/engine/state') {
    const c = url.searchParams.get('c');
    if (!COLLECTIONS[c]) return json({ error: 'collection' }, 400);
    if (!(await engineAuth(request, env, ''))) return json({ error: 'auth' }, 401);
    return json(await ledger(env).engineState(c));
  }
  // deploy otomatis oleh sistem (contracts/scripts/auto-deploy.mjs): simpan alamat setelah diverifikasi on-chain
  if (p === '/internal/contracts' && method === 'POST') {
    const body = await request.text();
    if (!(await engineAuth(request, env, body))) return json({ error: 'auth' }, 401);
    const r = await saveContracts(env, env.ADMIN_WALLET, JSON.parse(body));
    if (r.ok) {
      try { await vault(env, 'setConfig', { chainId: r.cfg.chainId, standard: r.cfg.standard, auctionHouse: r.cfg.auctionHouse, sale: r.cfg.sale, usdc: r.cfg.usdc, rpc: NETWORKS[r.cfg.chainId].rpc }); } catch (e) { r.vault = String(e.message); }
    }
    return json(r, r.ok ? 200 : 400);
  }
  if (p === '/internal/engine/commit' && method === 'POST') {
    const body = await request.text();
    if (!(await engineAuth(request, env, body))) return json({ error: 'auth' }, 401);
    const b = JSON.parse(body);
    // engine: from = jumlah sebelum batch (eksklusif), to = token terakhir (inklusif) → token from+1..to
    try { return json(await ledger(env).commit({ c: b.collection, from: Number(b.from) + 1, to: Number(b.to), root: String(b.root) })); } catch (e) { return json({ error: String(e.message) }, 409); }
  }
  return json({ error: 'not_found' }, 404);
}

/** Tautan OpenSea untuk karya publik bila kontrak koleksi sudah aktif. */
/** Kontrak edisi: karya → token id OpenSea (urutan rilis k), untuk karya yang sudah dirilis. Peta dibuat sekali per isolate. */
const RELEASE_MAP = new Map();
function tokenIdOf(env, c, design) {
  if (env.STANDARD !== 'erc1155') return design;
  const released = Number(JSON.parse(env.RELEASED || '{}')[c] ?? 0);
  let hit = RELEASE_MAP.get(c);
  if (!hit || hit.n !== released) {
    const map = new Map();
    for (let k = 1; k <= released; k += 1) map.set(designOf(c, k), k);
    hit = { n: released, map };
    RELEASE_MAP.set(c, hit);
  }
  return hit.map.get(design) ?? null;
}

function openseaUrl(env, c, id) {
  if (COLLECTIONS[c]?.exclusive) return '';
  const addr = env[`COLLECTION_${c.replace('-', '_').toUpperCase()}`];
  const net = NETWORKS[Number(env.CHAIN_ID)];
  if (!addr || !net) return '';
  const tokenId = tokenIdOf(env, c, id);
  if (tokenId === null) return '';
  return `${Number(env.CHAIN_ID) === 8453 ? 'https://opensea.io' : 'https://testnets.opensea.io'}/assets/${net.opensea}/${addr}/${tokenId}`;
}

async function svg(request, env, ctx, c, id, origin) {
  return cached(request, ctx, async () => {
    const d = dna(c, id);
    const body = animatedSvg(d, await renderCtx(d, assetProvider(env, origin)));
    return new Response(body, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': IMMUTABLE, 'access-control-allow-origin': '*', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data: https:", 'x-content-type-options': 'nosniff' } });
  });
}

async function player(request, env, ctx, c, id, origin) {
  return cached(request, ctx, async () => {
    const d = dna(c, id);
    const meta = metadata(c, id, env.BASE_URL);
    const html = renderPlayerLive(d, meta, await renderCtx(d, assetProvider(env, origin)), { base: env.BASE_URL });
    // /play boleh di-frame (OpenSea animation_url); tanpa iklan
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': IMMUTABLE, 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' } });
  });
}

async function sitemap(env, url) {
  const base = env.BASE_URL;
  const m = /^\/sitemap-([a-z-]+)-(\d+)\.xml$/.exec(url.pathname);
  const xml = (inner) => new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${inner}`, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
  if (url.pathname === '/sitemap.xml') {
    const parts = [];
    parts.push(`<sitemap><loc>${base}/sitemap-pages-1.xml</loc></sitemap>`, `<sitemap><loc>${base}/sitemap-gallery-1.xml</loc></sitemap>`);
    // publik hanya etalase (yang lain noindex); eksklusif seluruhnya (10.000 per koleksi, semuanya dijual di toko)
    for (const c of KEYS) for (let i = 1; i <= (COLLECTIONS[c].exclusive ? Math.ceil(COLLECTIONS[c].max / 25_000) : 1); i += 1) parts.push(`<sitemap><loc>${base}/sitemap-${c}-${i}.xml</loc></sitemap>`);
    return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${parts.join('')}</sitemapindex>`);
  }
  if (!m) return null;
  const alt = (path) => LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${base}/${l}${path}"/>`).join('');
  const urls = [];
  if (m[1] === 'pages') {
    const altP = (k) => LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${base}/${l}${k ? `/${PATHS[k][l]}` : ''}"/>`).join('');
    for (const k of ['', 'exclusive', 'market', 'opensea', 'coin']) urls.push(`<url><loc>${base}/id${k ? `/${PATHS[k].id}` : ''}</loc>${altP(k)}</url>`);
    for (const c of KEYS) urls.push(`<url><loc>${base}/id/c/${c}</loc>${alt(`/c/${c}`)}</url>`);
  } else if (m[1] === 'gallery') {
    for (const c of SHOWCASE_KEYS) {
      const f = listFacets(c, (await showcase(env, c)).ids);
      for (const [k] of seriesOptions(c)) if (f.series[k]) urls.push(`<url><loc>${base}/id/c/${c}/${k}</loc>${alt(`/c/${c}/${k}`)}</url>`);
      if (c === 'quran') for (const n of Object.keys(f.surah)) urls.push(`<url><loc>${base}/id/c/quran/surah/${n}</loc>${alt(`/c/quran/surah/${n}`)}</url>`);
    }
  } else if (COLLECTIONS[m[1]] && !COLLECTIONS[m[1]].exclusive) {
    if (m[2] !== '1') return null;
    for (const id of (await showcase(env, m[1])).ids) urls.push(`<url><loc>${base}/id/nft/${m[1]}/${id}</loc>${alt(`/nft/${m[1]}/${id}`)}</url>`);
  } else if (COLLECTIONS[m[1]]) {
    const c = m[1];
    const from = (Number(m[2]) - 1) * 25_000 + 1;
    const to = Math.min(COLLECTIONS[c].max, from + 24_999);
    for (let id = from; id <= to; id += 1) urls.push(`<url><loc>${base}/id/nft/${c}/${id}</loc>${alt(`/nft/${c}/${id}`)}</url>`);
  } else return null;
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`);
}

async function html(request, env, ctx, url) {
  const parts = url.pathname.split('/').filter(Boolean);
  const lang = parts[0];
  const n = nonce();
  const base = env.BASE_URL;
  const out = (o, status = 200, extra = {}) => new Response(page({ lang, base, n, ...o }), { status, headers: { ...securityHeaders(n), 'cache-control': o.private ? 'private, no-store' : 'public, max-age=60', vary: 'cookie', ...extra } });
  const sub = parts[1];
  const live = osLive(env);
  // alamat lama (galeri, lelang, menunggu) → tiga pasar baru
  if (sub && LEGACY[sub] && !parts[2]) return new Response(null, { status: 301, headers: { location: `/${lang}/${PATHS[LEGACY[sub]][lang]}${url.search}` } });
  if (!sub) {
    const showcaseIds2 = {};
    for (const c of SHOWCASE_KEYS) showcaseIds2[c] = (await showcase(env, c)).ids;
    let exSold = 0;
    for (const c of SHOP.EX_KEYS) exSold += Object.values(await soldOf(env, c)).reduce((a, b) => a + b, 0);
    const h = P.home(lang, { showcase: showcaseIds2, exSold, listings: (await SHOP.openListings(env, { limit: 1 })).total });
    return out({ page: 'home', body: h.body, jsonld: h.jsonld, script: h.script });
  }
  if (sub === 'c' && COLLECTIONS[parts[2]] && !COLLECTIONS[parts[2]].exclusive) {
    const c = parts[2];
    const sc = await showcase(env, c);
    const facets = facetsOf(c, sc);
    const maker = url.searchParams.get('maker') === 'gpu' ? 'gpu' : '';
    const gpu = await gpuIds(env, c);
    let series = String(url.searchParams.get('series') ?? '').slice(0, 32);
    let surah = 0;
    let rest = `/c/${c}`;
    if (c === 'quran' && parts[3] === 'surah' && /^\d{1,3}$/.test(parts[4] ?? '') && Number(parts[4]) >= 1 && Number(parts[4]) <= 114 && !parts[5]) { surah = Number(parts[4]); rest += `/surah/${surah}`; }
    else if (parts[3]) {
      if (parts[4] || !seriesOptions(c).some(([k]) => k === parts[3])) return out({ page: 'home', title: '404', body: P.notFound(lang), noindex: true }, 404);
      series = parts[3];
      rest += `/${series}`;
    }
    const count = surah ? facets.surah[surah] ?? 0 : series ? facets.series[series] ?? 0 : sc.ids.length;
    const seo = surah ? surahSeo(lang, surah, count, live) : parts[3] ? seriesSeo(lang, c, series, count, live) : collectionSeo(lang, c, count, live);
    const from = Math.max(1, Number(url.searchParams.get('from') ?? 1) | 0);
    const tq = url.searchParams.get('tier');
    const tier = tq !== null && tq !== '' && /^[0-4]$/.test(tq) ? Number(tq) : null;
    const first = browseList(c, maker ? gpu : sc.ids, { from, n: 60, tier, series, surah });
    if (maker) first.items = first.items.map((it) => ({ ...it, gpu: true }));
    const crumbs = [[BREAD[lang].home, `/${lang}`], [BREAD[lang].hub, `/${lang}/${PATHS.opensea[lang]}`], [P.collName(lang, c), `/${lang}/c/${c}`]];
    if (surah) crumbs.push([`${surah}. ${surahInfo(surah)[2]}`, `/${lang}${rest}`]);
    else if (parts[3]) crumbs.push([seriesLabel(c, series, lang), `/${lang}${rest}`]);
    const filtered = url.searchParams.has('from') || tier !== null || url.searchParams.has('series') || !!maker;
    return out({ page: 'home', rest, title: seo.title, desc: seo.desc, image: `${base}/img/${c}/${first.items[0]?.id ?? sc.ids[0] ?? 1}.svg`, noindex: filtered || count === 0, jsonld: [breadcrumb(base, crumbs.map(([nm, h]) => [nm, h])), itemList(base, lang, c, first.items, seo.h1)], body: P.collectionPage(lang, c, { produced: maker ? gpu.length : sc.ids.length, from, tier, series, surah, first, facets, seo, crumbs, view: url.searchParams.get('view') ?? 'mosaic', live, maker, gpuCount: gpu.length }) });
  }
  if (sub === 'c' && COLLECTIONS[parts[2]] && !parts[3]) {
    // koleksi eksklusif: semua 10.000 karya dijual di toko axto.io ($1/edisi)
    const c = parts[2];
    const produced = COLLECTIONS[c].max;
    const from = Math.min(Math.max(1, Number(url.searchParams.get('from') ?? 1) | 0), produced);
    const tq = url.searchParams.get('tier');
    const tier = tq !== null && tq !== '' && /^[0-4]$/.test(tq) ? Number(tq) : null;
    const series = String(url.searchParams.get('series') ?? '').slice(0, 32);
    const first = browse(c, { from, n: 60, tier, series, produced });
    const sold = await soldOf(env, c);
    first.items = first.items.map((it) => ({ ...it, usd: 1, left: 10 - (sold[it.id] ?? 0) }));
    const crumbs = [[BREAD[lang].home, `/${lang}`], [BREAD[lang].ex, `/${lang}/${PATHS.exclusive[lang]}`], [P.collName(lang, c), `/${lang}/c/${c}`]];
    const filtered = url.searchParams.has('from') || tier !== null || !!series;
    const name = P.collName(lang, c);
    const desc = lang === 'id' ? `${name}: ${produced.toLocaleString('id-ID')} karya eksklusif, masing-masing 10 edisi, harga tetap $1 per edisi dengan koin AXTO di axto.io.` : `${name}: ${produced.toLocaleString('en-US')} exclusive works, 10 editions each, a fixed $1 per edition in AXTO coin on axto.io.`;
    return out({ page: 'home', rest: `/c/${c}`, title: `${name} — $1`, desc, noindex: filtered, jsonld: [breadcrumb(base, crumbs)], body: P.collectionPage(lang, c, { produced, from, tier, series, first, crumbs, view: url.searchParams.get('view') ?? 'mosaic' }) });
  }
  if (sub === 'nft' && validToken(parts[2], Number(parts[3]))) {
    const [c, id] = [parts[2], Number(parts[3])];
    const meta = metadata(c, id, base);
    if (!COLLECTIONS[c].exclusive) {
      const sc = await showcase(env, c);
      const d = dna(c, id);
      const sk = seriesKey(d);
      const ref = d.kind === 'quran' ? quranRef(d) : null;
      const e = edition(c, id);
      const usd = e.priceUsd;
      const gal = ref && ref.series === 'ayah' ? [`/${lang}/c/quran/surah/${ref.surah}`, `${lang === 'id' ? 'Surah' : 'Surah'} ${ref.surahLt}`] : sk ? [`/${lang}/c/${c}/${sk}`, seriesLabel(c, sk, lang)] : [`/${lang}/c/${c}`, P.collName(lang, c)];
      const crumbs = [[BREAD[lang].home, `/${lang}`], [BREAD[lang].hub, `/${lang}/${PATHS.opensea[lang]}`], [P.collName(lang, c), `/${lang}/c/${c}`], [gal[1], gal[0]]];
      const related = browseList(c, sc.ids, ref && ref.series === 'ayah' ? { surah: ref.surah, n: 9 } : { series: sk, n: 9 }).items.filter((it) => it.id !== id).slice(0, 8);
      const os = openseaUrl(env, c, id);
      const inStock = sc.set.has(id);
      if (d.kind === 'hadith') {
        const hr = hadithRef(d);
        meta.name = lang === 'id' ? `Hadits ${hr.nameId} Nomor ${hr.number} — ${d.pick[0][2]} #${id.toLocaleString('id-ID')}` : meta.name;
      }
      const offer = os ? { '@type': 'Offer', priceCurrency: 'USD', price: usd, availability: 'https://schema.org/InStock', url: os, seller: { '@type': 'Organization', name: 'AXTO' } } : { '@type': 'Offer', priceCurrency: 'USD', price: usd, availability: 'https://schema.org/PreOrder', url: `${base}/${lang}/nft/${c}/${id}`, seller: { '@type': 'Organization', name: 'AXTO' } };
      const product = { '@context': 'https://schema.org', '@type': 'Product', name: meta.name, image: meta.image, description: meta.description.slice(0, 500), sku: `${c}-${id}`, category: gal[1], brand: { '@type': 'Brand', name: 'AXTO' }, offers: offer };
      const desc = `${meta.name}: ${gal[1]} · ${meta.attributes.find((a) => a.trait_type === 'Tier')?.value} · ${e.supply} ${lang === 'id' ? 'edisi' : 'editions'} · $${usd} ${os ? (lang === 'id' ? 'di OpenSea (jaringan Base)' : 'on OpenSea (Base network)') : (lang === 'id' ? '— segera di OpenSea' : '— coming to OpenSea')}.`.slice(0, 160);
      return out({ page: 'home', rest: `/nft/${c}/${id}`, title: `${meta.name} — $${usd}`, desc, image: meta.image, noindex: !inStock, jsonld: [product, breadcrumb(base, [...crumbs, [meta.name, `/${lang}/nft/${c}/${id}`]])], body: P.nftPage(lang, c, id, meta, attributesFor(c, id, lang), os, { usd, ed: e.supply, crumbs, related, galleryHref: gal[0], galleryName: gal[1], desc: c === 'hadith' ? hadithBlurb(c, id, lang) : null }) });
    }
    // eksklusif: toko $1/edisi + listing pasar member untuk karya ini
    const stock = await SHOP.stockOf(env, c, id);
    const listings = [];
    for (const r of (await SHOP.openListings(env, { c, limit: 500 })).rows.filter((x) => x.id === id).slice(0, 20)) {
      const L = await SHOP.getListing(env, r.lid);
      if (L) listings.push(SHOP.publicListing(L));
    }
    const priceCoins = COIN.fmtCoins(await SHOP.editionMicro(env));
    const crumbs = [[BREAD[lang].home, `/${lang}`], [BREAD[lang].ex, `/${lang}/${PATHS.exclusive[lang]}`], [P.collName(lang, c), `/${lang}/c/${c}`]];
    const product = { '@context': 'https://schema.org', '@type': 'Product', name: meta.name, image: meta.image, description: meta.description.slice(0, 300), sku: `${c}-${id}`, brand: { '@type': 'Brand', name: 'AXTO' }, offers: { '@type': 'Offer', priceCurrency: 'USD', price: 1, availability: stock.left > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut', url: `${base}/${lang}/nft/${c}/${id}`, seller: { '@type': 'Organization', name: 'AXTO' } } };
    return out({ page: 'home', rest: `/nft/${c}/${id}`, title: `${meta.name} — $1`, desc: `${meta.name}: ${lang === 'id' ? 'karya eksklusif, 10 edisi, $1 per edisi dengan koin AXTO di axto.io' : 'exclusive work, 10 editions, $1 per edition in AXTO coin on axto.io'}.`.slice(0, 160), image: meta.image, jsonld: [product, breadcrumb(base, [...crumbs, [meta.name, `/${lang}/nft/${c}/${id}`]])], body: P.nftPage(lang, c, id, meta, attributesFor(c, id, lang), '', { stock, listings, priceCoins, crumbs }), script: "const x=document.createElement('script');x.type='module';x.src='/market.js?v=1';document.head.append(x);" });
  }
  const key = pageFromSlug(sub);
  const mk = "const x=document.createElement('script');x.type='module';x.src='/market.js?v=1';document.head.append(x);";
  if (key === 'exclusive' && !parts[2]) {
    const sold = {};
    for (const c of SHOP.EX_KEYS) sold[c] = Object.values(await soldOf(env, c)).reduce((a, b) => a + b, 0);
    return out({ page: key, title: T[lang].exclusive.title, desc: T[lang].exclusive.lead.slice(0, 160), jsonld: [breadcrumb(base, [[BREAD[lang].home, `/${lang}`], [BREAD[lang].ex, `/${lang}/${PATHS.exclusive[lang]}`]])], body: P.exclusivePage(lang, { sold, priceCoins: COIN.fmtCoins(await SHOP.editionMicro(env)) }) });
  }
  if (key === 'market' && !parts[2]) {
    const q = url.searchParams;
    const f = { c: SHOP.EX_KEYS.includes(q.get('c')) ? q.get('c') : '', mode: SHOP.MODES.includes(q.get('mode')) ? q.get('mode') : '', sort: ['new', 'ending', 'low', 'high'].includes(q.get('sort')) ? q.get('sort') : 'new' };
    const data = await SHOP.openListings(env, { c: f.c || undefined, mode: f.mode || undefined, sort: f.sort });
    return out({ page: key, title: T[lang].market.title, desc: T[lang].market.lead.slice(0, 160), noindex: !!(f.c || f.mode || q.has('sort')), jsonld: [breadcrumb(base, [[BREAD[lang].home, `/${lang}`], [BREAD[lang].mk, `/${lang}/${PATHS.market[lang]}`]])], body: P.marketPage(lang, data, f) });
  }
  if (key === 'opensea' && !parts[2]) {
    const facets = {};
    const gpu = {};
    for (const c of SHOWCASE_KEYS) { facets[c] = facetsOf(c, await showcase(env, c)); gpu[c] = (await gpuIds(env, c)).length; }
    const seo = hubSeo(lang, live);
    return out({ page: key, title: seo.title, desc: seo.desc, jsonld: [breadcrumb(base, [[BREAD[lang].home, `/${lang}`], [BREAD[lang].hub, `/${lang}/${PATHS.opensea[lang]}`]])], body: P.openseaPage(lang, facets, seo, live, gpu) });
  }
  if (key === 'coin') {
    // publik hanya kontrak token; wallet internal hanya di Portal admin (perintah pemilik #43)
    const addrs = { token: env.AXTO_TOKEN || '', sale: '' };
    return out({ page: key, title: T[lang].coin.title, image: `${base}/brand/axto-coin-512.png`, jsonld: [P.coinGuideJsonLd(lang, base)], body: P.coinPage(lang, await readJSON(env.STORE, 'e/coin/sale.json'), false, addrs) });
  }
  if (key === 'member') {
    // wallet admin selalu ke Portal admin (perintah pemilik #34)
    if ((await session(request, env))?.admin) return new Response(null, { status: 302, headers: { location: `/${lang}/${PATHS.admin[lang]}`, 'cache-control': 'private, no-store' } });
    return out({ page: key, title: T[lang].member.title, body: P.memberPage(lang), noindex: true, private: true, script: mk });
  }
  if (key === 'admin') {
    const s = await session(request, env);
    const loader = s?.admin ? `${mk}const y=document.createElement('script');y.type='module';y.src='/admin-deploy.js';document.head.append(y);` : '';
    return out({ page: key, title: T[lang].admin.title, body: P.adminPage(lang, s?.admin), noindex: true, ads: false, private: true, script: loader });
  }
  if (key === 'verify' && validToken(parts[2], Number(parts[3]))) {
    const [c, id] = [parts[2], Number(parts[3])];
    const meta = metadata(c, id, base);
    const hash = await sha256Hex(canonical(dna(c, id)));
    const col = env[`COLLECTION_${c.replace('-', '_').toUpperCase()}`];
    const owner = col && !COLLECTIONS[c].exclusive ? await ownerOf(env.BASE_RPC, col, id).catch(() => null) : null;
    return out({ page: key, rest: `/${c}/${id}`, title: `${T[lang].verify.title} · ${meta.name}`, body: P.verifyPage(lang, c, id, meta, hash, owner) });
  }
  return out({ page: 'home', title: '404', body: P.notFound(lang), noindex: true }, 404);
}

export default {
  async fetch(request, env0, ctx) {
    const env = await withCfg(env0); // alamat kontrak aktif dari R2 (hasil deploy dari portal admin)
    const url = new URL(request.url);
    if (url.hostname === 'www.axto.io') return Response.redirect(`https://axto.io${url.pathname}${url.search}`, 301);
    const p = url.pathname;
    try {
      if (p === '/ads.txt') return new Response(ADS_TXT, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
      if (p === '/robots.txt') return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /internal/\nDisallow: /id/member\nDisallow: /en/member\nDisallow: /id/admin\nDisallow: /en/admin\nSitemap: ${env.BASE_URL}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      if (p.startsWith('/sitemap')) return (await sitemap(env, url)) ?? new Response('not found', { status: 404 });
      if (p.startsWith('/api/') || p.startsWith('/internal/') || p === '/tokenlist.json') return await api(request, env, ctx, url);
      let m = /^\/img\/([a-z-]+)\/(\d+)\.svg$/.exec(p);
      if (m && validToken(m[1], Number(m[2]))) return await svg(request, env, ctx, m[1], Number(m[2]), url.origin);
      m = /^\/play\/([a-z-]+)\/(\d+)$/.exec(p);
      if (m && validToken(m[1], Number(m[2]))) return await player(request, env, ctx, m[1], Number(m[2]), url.origin);
      m = /^\/lang\/(id|en)$/.exec(p);
      if (m) {
        const to = url.searchParams.get('to') ?? `/${m[1]}`;
        const safe = /^\/(id|en)(\/[\w\-/]*)?$/.test(to) ? to : `/${m[1]}`;
        return new Response(null, { status: 302, headers: { location: safe, 'set-cookie': `lang=${m[1]}; Path=/; Max-Age=31536000; Secure; SameSite=Lax` } });
      }
      if (p === '/') return new Response(null, { status: 302, headers: { location: `/${pickLang(request)}`, vary: 'cookie, cf-ipcountry', 'cache-control': 'private, no-store' } });
      const first = p.split('/')[1];
      if (LANGS.includes(first)) return await html(request, env, ctx, url);
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
      return new Response(null, { status: 302, headers: { location: `/${pickLang(request)}` } });
    } catch (e) {
      ctx.waitUntil(appendLog(env.STORE, 'error', { path: p, e: String(e?.stack ?? e).slice(0, 2000) }));
      return new Response(`<!doctype html><meta charset="utf-8"><title>AXTO</title><p>${esc('Terjadi gangguan sementara / Temporary error')}</p>`, { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
  },

  async scheduled(event, env, ctx) {
    if (event.cron === '17 2 * * *') {
      ctx.waitUntil(dailyBackup(env.STORE));
      return;
    }
    // pasar member: lelang berakhir diselesaikan, pekerjaan terputus dilanjutkan (toko/pasar/WD)
    const e2 = await withCfg(env);
    ctx.waitUntil(SHOP.settleDue(e2).catch((e) => appendLog(env.STORE, 'error', { path: 'cron:settle', e: String(e?.message ?? e).slice(0, 300) })));
    ctx.waitUntil(SHOP.recover(e2, colAddrOf(e2), EX_NAMES).catch((e) => appendLog(env.STORE, 'error', { path: 'cron:recover', e: String(e?.message ?? e).slice(0, 300) })));
    ctx.waitUntil(COIN.processCashouts(env).catch((e) => appendLog(env.STORE, 'error', { path: 'cron:cashout', e: String(e?.message ?? e).slice(0, 300) })));
  },
};

export { hmac };
