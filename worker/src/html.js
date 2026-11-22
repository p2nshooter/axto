/** Layout HTML server-side axto.io: SEO (canonical, hreflang, OG, JSON-LD), AdSense 3 akun, CSP ber-nonce. */
import { T, PATHS } from './i18n.js';
import { adsenseHead } from './adsense.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function nonce() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...b));
}

/** Path halaman dalam bahasa lain (untuk hreflang & tombol bahasa). */
export function altPath(page, lang, rest = '') {
  if (!page || page === 'home') return `/${lang}${rest}`;
  const slug = PATHS[page]?.[lang];
  return slug ? `/${lang}/${slug}${rest}` : `/${lang}${rest}`;
}

export function securityHeaders(n, { frame = false } = {}) {
  const csp = [
    "default-src 'self'",
    `script-src 'nonce-${n}' 'strict-dynamic' https:`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' https://everyayah.com https://verses.quran.com https://audio.qurancdn.com",
    "connect-src 'self' https://mainnet.base.org https://api.quran.com https://*.google.com https://*.googlesyndication.com https://*.doubleclick.net https://*.adtrafficquality.google",
    "frame-src 'self' https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://www.paypal.com",
    `frame-ancestors ${frame ? '*' : "'none'"}`,
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'self' https://www.paypal.com",
  ].join('; ');
  const h = {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': csp,
    'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(self "https://www.paypal.com")',
    'cross-origin-opener-policy': 'same-origin-allow-popups',
  };
  if (!frame) h['x-frame-options'] = 'DENY';
  return h;
}

/**
 * Halaman lengkap.
 * opts: {lang, page, rest, title, desc, body, base, n, jsonld[], image, noindex, ads(default true), script}
 */
export function page(opts) {
  const { lang, page: pg = 'home', rest = '', title, desc, body, base, n, jsonld = [], image, noindex = false, ads = true, script = '' } = opts;
  const t = T[lang];
  const other = lang === 'id' ? 'en' : 'id';
  const url = `${base}${altPath(pg, lang, rest)}`;
  const fullTitle = title ? `${title} · AXTO` : `AXTO — ${t.tagline}`;
  const description = desc ?? t.metaDesc;
  const og = image ?? `${base}/logo-512.png`;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'AXTO', url: base, logo: `${base}/logo-512.png` },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'AXTO', url: base, inLanguage: t.htmlLang },
    ...jsonld,
  ];
  const nav = [['gallery', t.nav.gallery], ['auction', t.nav.auction], ['waiting', t.nav.waiting], ['exclusive', t.nav.exclusive], ['coin', t.nav.coin], ['member', t.nav.member]];
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
<link rel="canonical" href="${esc(url)}">
<link rel="alternate" hreflang="id" href="${esc(base + altPath(pg, 'id', rest))}">
<link rel="alternate" hreflang="en" href="${esc(base + altPath(pg, 'en', rest))}">
<link rel="alternate" hreflang="x-default" href="${esc(base + altPath(pg, 'en', rest))}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AXTO">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(og)}">
<meta property="og:locale" content="${lang === 'id' ? 'id_ID' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b0b10">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/logo-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="stylesheet" href="/app.css">
${ads ? adsenseHead().replace('<script async', `<script nonce="${n}" async`) : ''}
${ld.map((x) => `<script type="application/ld+json" nonce="${n}">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
<header class="top">
  <a class="brand" href="/${lang}" aria-label="AXTO"><img src="/logo-192.png" width="36" height="36" alt=""><span>AXTO</span></a>
  <nav>${nav.map(([k, label]) => `<a href="${altPath(k, lang)}"${k === pg ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('')}</nav>
  <div class="actions">
    <a class="lang" href="/lang/${other}?to=${encodeURIComponent(altPath(pg, other, rest))}" hreflang="${other}">${esc(t.langSwitch)}</a>
    <button class="btn" id="connect" type="button">${esc(t.nav.connect)}</button>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="foot">
  <p>${esc(t.footer.rights)}</p>
  <p>© ${new Date().getUTCFullYear()} AXTO · axto.io</p>
</footer>
<script type="module" nonce="${n}" src="/app.js"></script>
${script ? `<script type="module" nonce="${n}">${script}</script>` : ''}
</body>
</html>`;
}
