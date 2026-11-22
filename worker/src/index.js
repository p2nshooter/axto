/**
 * axto-web — Worker publik axto.io.
 * Generatif tanpa R2: /api/meta, /img/*.svg, /play/* (dihitung dari DNA tiap permintaan, di-cache di tepi).
 * Data member/lelang/kustodi: R2 (lewat DO Ledger). Kunci privat hanya di vault (Service Binding).
 */
import { dna } from '../../engine/src/dna.js';
import { metadata, contractMetadata, renderCtx, renderSvg, renderPlayer, attributesId } from '../../engine/src/metadata.js';
import { COLLECTIONS, sha256Hex } from '../../engine/src/core.js';
import { canonical } from '../../engine/src/dna.js';
import { MODELS } from '../../engine/src/catalog/model.js';
import { LANGS, T, pickLang, pageFromSlug } from './i18n.js';
import { page, nonce, securityHeaders, esc } from './html.js';
import * as P from './pages.js';
import { ADS_TXT } from './adsense.js';
import { session, siweStart, siweFinish, logout, saveProfile, publicProfile, loadMember, rateLimit, hmac } from './auth.js';
import { createOrder, captureOrder, webhook } from './paypal.js';
import { dailyBackup, appendLog, readJSON, listKeys } from './r2.js';
import { ownerOf, isAddress, encodeClaim } from './eth.js';
import { Ledger, KEYS } from './ledger.js';

export { Ledger };

/** Nama EIP-712 kontrak eksklusif (harus sama dengan nama saat deploy, contracts/scripts/deploy.mjs). */
export const EX_NAMES = { 'ex-time': 'AXTO Exclusive Time', 'ex-stamp': 'AXTO Exclusive Stamp', 'ex-quran': "AXTO Exclusive Qur'an" };

const IMMUTABLE = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';
const json = (v, status = 200, extra = {}) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra } });
const ledger = (env) => env.LEDGER.get(env.LEDGER.idFromName('main'));
const validToken = (c, id) => COLLECTIONS[c] && Number.isSafeInteger(id) && id >= 1 && id <= COLLECTIONS[c].max;

/** Penyedia data Qur'an & foto model dari ASSETS (tanpa R2). */
function assetProvider(env, origin) {
  const get = async (p) => (await env.ASSETS.fetch(new Request(`${origin}/quran/${p}`))).json();
  const prov = {
    async ayah(s, a) { const j = await get(`s/${s}.json`); const v = j.ayat[a - 1]; return { ar: v.ar, tr: v.tr, lt: v.lt }; },
    async page(p) { return get(`h/${p}.json`); },
  };
  // Wajah model hanya disisipkan bila izin tertulis model tercatat (MODEL_CONSENT berisi id model, mis. "luaja-1").
  // Disisipkan sebagai data-URI: SVG yang ditampilkan lewat <img>/OpenSea tidak boleh memuat gambar eksternal.
  const consent = String(env.MODEL_CONSENT ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  if (consent.length) {
    prov.head = async (modelId, file) => {
      const m = MODELS.find((x) => x.id === modelId);
      if (!m || !consent.includes(modelId) || !/^p\d$/.test(file)) return null;
      const r = await fetch(`${m.base}${file}-s.webp`, { cf: { cacheTtl: 604800, cacheEverything: true } });
      if (!r.ok) return null;
      const b = new Uint8Array(await r.arrayBuffer());
      let bin = '';
      for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
      return `data:image/webp;base64,${btoa(bin)}`;
    };
  }
  return prov;
}

async function cached(request, ctx, make) {
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await make();
  if (res.ok) ctx.waitUntil(cache.put(request, res.clone()));
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
  if (method === 'POST' && !p.startsWith('/api/paypal/webhook') && !p.startsWith('/internal/') && !sameOrigin(request, env)) return json({ error: 'origin' }, 403);
  if (!(await rateLimit(env, `ip:${ip}`, method === 'POST' ? 60 : 300))) return json({ error: 'rate_limited' }, 429);

  // metadata (tokenURI) — generatif
  let m = /^\/api\/meta\/([a-z-]+)\/(\d+)$/.exec(p);
  if (m) {
    const [c, id] = [m[1], Number(m[2])];
    if (!validToken(c, id)) return json({ error: 'not_found' }, 404);
    return cached(request, ctx, async () => json(metadata(c, id, env.BASE_URL), 200, { 'cache-control': IMMUTABLE, 'access-control-allow-origin': '*' }));
  }
  m = /^\/api\/contract\/([a-z-]+)$/.exec(p);
  if (m && COLLECTIONS[m[1]]) return json(contractMetadata(m[1], env.BASE_URL), 200, { 'cache-control': IMMUTABLE, 'access-control-allow-origin': '*' });

  if (p === '/api/stats') return json(await ledger(env).stats(), 200, { 'cache-control': 'public, max-age=30' });
  m = /^\/api\/lots\/([a-z-]+)$/.exec(p);
  if (m && COLLECTIONS[m[1]]) return json(await ledger(env).lots(m[1], { sort: url.searchParams.get('sort') ?? 'ending', offset: Number(url.searchParams.get('o') ?? 0) }));
  m = /^\/api\/offers\/([a-z-]+)$/.exec(p);
  if (m && COLLECTIONS[m[1]]) return json(await ledger(env).offers(m[1], { order: url.searchParams.get('order') === 'asc' ? 'asc' : 'desc', offset: Number(url.searchParams.get('o') ?? 0) }));
  m = /^\/api\/lot\/([a-z-]+)\/(\d+)$/.exec(p);
  if (m && validToken(m[1], Number(m[2]))) return json(await ledger(env).lot(m[1], Number(m[2])));

  // konfigurasi publik untuk klien (alamat kontrak, chain)
  if (p === '/api/config') {
    const cols = Object.fromEntries(KEYS.map((c) => [c, env[`COLLECTION_${c.replace('-', '_').toUpperCase()}`] ?? null]));
    return json({ chainId: Number(env.CHAIN_ID), auctionHouse: env.AUCTION_HOUSE ?? null, usdc: env.USDC ?? null, axto: env.AXTO_TOKEN ?? null, sale: env.AXTO_SALE ?? null, collections: cols, paypal: env.PAYPAL_COIN_SALE === 'on' }, 200, { 'cache-control': 'public, max-age=300' });
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
  if (p === '/api/me/profile' && method === 'POST') {
    if (!s) return json({ error: 'auth' }, 401);
    try { return json(await saveProfile(env, s.wallet, await readBody(request))); } catch (e) { return json({ error: String(e.message) }, 400); }
  }

  // ---- lelang ----
  if (p === '/api/bid' && method === 'POST') {
    if (!s) return json({ error: 'auth' }, 401);
    if (!(await rateLimit(env, `bid:${s.wallet}`, 20))) return json({ error: 'rate_limited' }, 429);
    const b = await readBody(request);
    if (!COLLECTIONS[b.c]) return json({ error: 'collection' }, 400);
    const r = await ledger(env).bid({ c: b.c, tokenId: Number(b.tokenId), bidder: s.wallet, kind: b.kind === 'proxy' ? 'proxy' : 'fixed', units: Number(b.units), nonce: String(b.nonce), deadline: String(b.deadline), sig: String(b.sig) });
    return json(r, r.ok ? 200 : 400);
  }
  // ---- marketplace eksklusif & kustodi ----
  m = /^\/api\/market\/([a-z-]+)$/.exec(p);
  if (m && COLLECTIONS[m[1]]?.exclusive && method === 'GET') return json(await ledger(env).marketRows(m[1], { offset: Number(url.searchParams.get('o') ?? 0) }));
  if (p === '/api/market/list' && method === 'POST') {
    if (!s) return json({ error: 'auth' }, 401);
    const b = await readBody(request);
    return json(await ledger(env).marketList({ c: b.c, tokenId: Number(b.tokenId), seller: s.wallet, kind: b.kind, units: Number(b.units) }));
  }
  if (p === '/api/market/cancel' && method === 'POST') {
    if (!s) return json({ error: 'auth' }, 401);
    const b = await readBody(request);
    return json(await ledger(env).marketCancel({ c: b.c, tokenId: Number(b.tokenId), seller: s.wallet }));
  }
  if (p === '/api/market/bid' && method === 'POST') {
    if (!s) return json({ error: 'auth' }, 401);
    if (!(await rateLimit(env, `bid:${s.wallet}`, 20))) return json({ error: 'rate_limited' }, 429);
    const b = await readBody(request);
    const r = await ledger(env).marketBid({ c: b.c, tokenId: Number(b.tokenId), bidder: s.wallet, kind: b.kind, units: Number(b.units), nonce: String(b.nonce), deadline: String(b.deadline), sig: String(b.sig) });
    return json(r, r.ok ? 200 : 400);
  }
  if (p === '/api/me/wins') {
    if (!s) return json({ error: 'auth' }, 401);
    return json({ items: await ledger(env).winsOf(s.wallet) });
  }
  if (p === '/api/me/custody') {
    if (!s) return json({ error: 'auth' }, 401);
    const items = [];
    for (const o of await listKeys(env.STORE, `c/by/${s.wallet.toLowerCase()}/`, 5000)) {
      const ref = await readJSON(env.STORE, o.key);
      const own = ref && (await readJSON(env.STORE, `c/ex-own/${ref.c}/${ref.tokenId}.json`));
      if (own && own.owner.toLowerCase() === s.wallet.toLowerCase()) items.push({ c: ref.c, tokenId: ref.tokenId, status: own.status, since: own.since });
    }
    return json({ items });
  }
  if (p === '/api/wd' && method === 'POST') {
    if (!s) return json({ error: 'auth' }, 401);
    const b = await readBody(request);
    if (!COLLECTIONS[b.c]?.exclusive) return json({ error: 'collection' }, 400);
    return json(await ledger(env).withdraw({ c: b.c, tokenId: Number(b.tokenId), owner: s.wallet, collectionName: EX_NAMES[b.c] }));
  }
  m = /^\/api\/claim\/([a-z-]+)\/(\d+)$/.exec(p);
  if (m) {
    if (!s) return json({ error: 'auth' }, 401);
    if (method === 'POST') return json(await ledger(env).claimed(m[1], Number(m[2])));
    const d = await ledger(env).claimData(m[1], Number(m[2]), s.wallet);
    if (!d) return json({ error: 'not_winner' }, 404);
    // calldata siap kirim: member menandatangani & membayar gas sendiri (eth_sendTransaction)
    return json({ ...d, tx: { to: env.AUCTION_HOUSE, data: encodeClaim(d.bid, d.bidSig, d.result, d.sig) } });
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
  if (p === '/internal/engine/commit' && method === 'POST') {
    const body = await request.text();
    if (!(await engineAuth(request, env, body))) return json({ error: 'auth' }, 401);
    const b = JSON.parse(body);
    // engine: from = jumlah sebelum batch (eksklusif), to = token terakhir (inklusif) → token from+1..to
    try { return json(await ledger(env).commit({ c: b.collection, from: Number(b.from) + 1, to: Number(b.to), root: String(b.root) })); } catch (e) { return json({ error: String(e.message) }, 409); }
  }
  return json({ error: 'not_found' }, 404);
}

async function svg(request, env, ctx, c, id, origin) {
  return cached(request, ctx, async () => {
    const d = dna(c, id);
    const body = renderSvg(d, await renderCtx(d, assetProvider(env, origin)));
    return new Response(body, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': IMMUTABLE, 'access-control-allow-origin': '*', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data: https:", 'x-content-type-options': 'nosniff' } });
  });
}

async function player(request, env, ctx, c, id, origin) {
  return cached(request, ctx, async () => {
    const d = dna(c, id);
    const meta = metadata(c, id, env.BASE_URL);
    const html = renderPlayer(d, meta, await renderCtx(d, assetProvider(env, origin)), { base: env.BASE_URL });
    // /play boleh di-frame (OpenSea animation_url); tanpa iklan
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': IMMUTABLE, 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' } });
  });
}

function sitemap(env, url) {
  const base = env.BASE_URL;
  const m = /^\/sitemap-([a-z-]+)-(\d+)\.xml$/.exec(url.pathname);
  const xml = (inner) => new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${inner}`, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
  if (url.pathname === '/sitemap.xml') {
    const parts = [];
    parts.push(`<sitemap><loc>${base}/sitemap-pages-1.xml</loc></sitemap>`);
    for (const c of KEYS) for (let i = 1; i <= Math.ceil(COLLECTIONS[c].max / 25_000); i += 1) parts.push(`<sitemap><loc>${base}/sitemap-${c}-${i}.xml</loc></sitemap>`);
    return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${parts.join('')}</sitemapindex>`);
  }
  if (!m) return null;
  const alt = (path) => LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${base}/${l}${path}"/>`).join('');
  const urls = [];
  if (m[1] === 'pages') {
    for (const path of ['', '/lelang', '/menunggu', '/eksklusif', '/koin', ...KEYS.map((c) => `/c/${c}`)]) urls.push(`<url><loc>${base}/id${path}</loc>${alt(path)}</url>`);
  } else if (COLLECTIONS[m[1]]) {
    const c = m[1];
    const from = (Number(m[2]) - 1) * 25_000 + 1;
    const to = Math.min(COLLECTIONS[c].max, from + 24_999);
    for (let id = from; id <= to; id += 1) urls.push(`<url><loc>${base}/en/nft/${c}/${id}</loc>${alt(`/nft/${c}/${id}`)}</url>`);
  } else return null;
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`);
}

async function html(request, env, ctx, url) {
  const parts = url.pathname.split('/').filter(Boolean);
  const lang = parts[0];
  const n = nonce();
  const base = env.BASE_URL;
  const out = (o, status = 200, extra = {}) => new Response(page({ lang, base, n, ...o }), { status, headers: { ...securityHeaders(n), 'cache-control': o.private ? 'private, no-store' : 'public, max-age=60', vary: 'cookie', ...extra } });
  const L = ledger(env);
  const stats = await L.stats();
  const sub = parts[1];
  if (!sub) {
    const h = P.home(lang, stats);
    return out({ page: 'home', body: h.body, jsonld: h.jsonld, script: h.script });
  }
  if (sub === 'c' && COLLECTIONS[parts[2]]) {
    const pg = Math.max(1, Number(url.searchParams.get('p') ?? 1) | 0);
    return out({ page: 'home', rest: `/c/${parts[2]}`, title: P.collName(lang, parts[2]), body: P.collectionPage(lang, parts[2], pg, stats) });
  }
  if (sub === 'nft' && validToken(parts[2], Number(parts[3]))) {
    const [c, id] = [parts[2], Number(parts[3])];
    const meta = metadata(c, id, base);
    const lot = await L.lot(c, id);
    const product = { '@context': 'https://schema.org', '@type': 'Product', name: meta.name, image: meta.image, description: meta.description.slice(0, 300), brand: { '@type': 'Brand', name: 'AXTO' }, offers: { '@type': 'Offer', priceCurrency: 'USD', price: (lot.price || lot.start) / (lot.currency === 'USDC' ? 100 : 100), availability: lot.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', url: `${base}/${lang}/nft/${c}/${id}` } };
    return out({ page: 'home', rest: `/nft/${c}/${id}`, title: meta.name, desc: meta.description.split('\n')[0].slice(0, 160), image: meta.image, body: P.nftPage(lang, c, id, meta, lot, attributesId(meta)), jsonld: [product] });
  }
  const key = pageFromSlug(sub);
  if (key === 'auction') {
    const c = COLLECTIONS[url.searchParams.get('c')] ? url.searchParams.get('c') : 'time';
    const sort = ['ending', 'highest', 'lowest'].includes(url.searchParams.get('sort')) ? url.searchParams.get('sort') : 'ending';
    return out({ page: key, title: T[lang].auction.title, body: P.auctionPage(lang, c, await L.lots(c, { sort }), sort, stats) });
  }
  if (key === 'waiting') {
    const c = COLLECTIONS[url.searchParams.get('c')] ? url.searchParams.get('c') : 'time';
    const order = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    return out({ page: key, title: T[lang].waiting.title, body: P.waitingPage(lang, c, await L.offers(c, { order }), order) });
  }
  if (key === 'exclusive') return out({ page: key, title: T[lang].exclusive.title, body: P.exclusivePage(lang, stats) });
  if (key === 'coin') return out({ page: key, title: T[lang].coin.title, body: P.coinPage(lang, await readJSON(env.STORE, 'e/coin/sale.json'), env.PAYPAL_COIN_SALE === 'on') });
  if (key === 'member') return out({ page: key, title: T[lang].member.title, body: P.memberPage(lang), noindex: true, private: true });
  if (key === 'admin') {
    const s = await session(request, env);
    return out({ page: key, title: T[lang].admin.title, body: P.adminPage(lang, s?.admin, stats), noindex: true, ads: false, private: true });
  }
  if (key === 'verify' && validToken(parts[2], Number(parts[3]))) {
    const [c, id] = [parts[2], Number(parts[3])];
    const meta = metadata(c, id, base);
    const hash = await sha256Hex(canonical(dna(c, id)));
    const col = env[`COLLECTION_${c.replace('-', '_').toUpperCase()}`];
    const owner = col && !COLLECTIONS[c].exclusive ? await ownerOf(env.BASE_RPC, col, id) : (await readJSON(env.STORE, `c/ex-own/${c}/${id}.json`))?.owner ?? null;
    return out({ page: key, rest: `/${c}/${id}`, title: `${T[lang].verify.title} · ${meta.name}`, body: P.verifyPage(lang, c, id, meta, hash, owner) });
  }
  return out({ page: 'home', title: '404', body: P.notFound(lang), noindex: true }, 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.hostname === 'www.axto.io') return Response.redirect(`https://axto.io${url.pathname}${url.search}`, 301);
    const p = url.pathname;
    try {
      if (p === '/ads.txt') return new Response(ADS_TXT, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
      if (p === '/robots.txt') return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /internal/\nDisallow: /id/member\nDisallow: /en/member\nDisallow: /id/admin\nDisallow: /en/admin\nSitemap: ${env.BASE_URL}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      if (p.startsWith('/sitemap')) return sitemap(env, url) ?? new Response('not found', { status: 404 });
      if (p.startsWith('/api/') || p.startsWith('/internal/')) return await api(request, env, ctx, url);
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
    ctx.waitUntil(ledger(env).tick(Date.now()).then((r) => appendLog(env.STORE, 'tick', { r })));
  },
};

export { hmac };
