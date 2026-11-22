/** Isi halaman axto.io (server-rendered, dua bahasa manual). */
import { T, PATHS } from './i18n.js';
import { esc, altPath } from './html.js';
import { COLLECTIONS } from '../../engine/src/core.js';
import { seriesOptions } from '../../engine/src/metadata.js';
import { OPENSEA_PRICE_USD } from '../../engine/src/core.js';
import { seriesLabel, surahInfo, BREAD } from './seo.js';

const PUBLIC = ['time', 'stamp', 'quran', 'model', 'hadith'];
const EXCL = ['ex-time', 'ex-stamp', 'ex-quran', 'ex-model', 'ex-hadith'];
const fmt = (n, lang) => Number(n ?? 0).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US');
export const money = (units, cur, lang) => (cur === 'USDC' ? `$${(units / 100).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${(units / 1000).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { maximumFractionDigits: 3 })} AXTO`);
const nftPath = (lang, c, id) => `/${lang}/nft/${c}/${id}`;
const IMGV = 'v=7';
const img = (c, id) => `/img/${c}/${id}.svg?${IMGV}`;
/** Lencana jenis karya: publik (USDC, OpenSea, MetaMask) atau eksklusif (koin AXTO, kustodi axto.io, WD). */
export const badge = (lang, c, long = false) => {
  const k = T[lang].kind;
  const ex = c.startsWith('ex-');
  return `<span class="badge ${ex ? 'ex' : 'pub'}" title="${esc(ex ? k.exLong : k.pubLong)}">${esc(long ? (ex ? k.exLong : k.pubLong) : ex ? k.exShort : k.pubShort)}</span>`;
};
const collName = (lang, c) => {
  const base = c.replace('ex-', '');
  const n = T[lang].collections[base][0];
  return c.startsWith('ex-') ? `${lang === 'id' ? 'Eksklusif' : 'Exclusive'} · ${n}` : n;
};

/** Banner animatif interaktif: kanvas (orbit, jam hidup, partikel prangko, kaligrafi), mengikuti kursor. */
const BANNER_JS = `
const cv=document.getElementById('hero-canvas');if(cv){const g=cv.getContext('2d');let W,H,mx=.5,my=.5,t0=performance.now();const dpr=Math.min(2,devicePixelRatio||1);
const R=()=>{const r=cv.getBoundingClientRect();W=cv.width=r.width*dpr;H=cv.height=r.height*dpr};R();addEventListener('resize',R);
addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();mx=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));my=Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))});
const stars=Array.from({length:120},()=>({x:Math.random(),y:Math.random(),z:Math.random()*.9+.1}));
const glyph=['ب','س','م','ا','ل','ه','ر','ح','ن','ي','✦','◷'];
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
function frame(now){const t=(now-t0)/1000;g.clearRect(0,0,W,H);
for(const s of stars){const x=((s.x+(mx-.5)*.05*s.z+t*.003*s.z)%1)*W,y=((s.y+(my-.5)*.05*s.z)%1)*H;g.globalAlpha=.25+.6*s.z*(.6+.4*Math.sin(t*2+s.x*40));g.fillStyle='#b4c8ff';g.fillRect(x,y,1.8*s.z*dpr,1.8*s.z*dpr)}g.globalAlpha=1;
const cx=W*(.5+(mx-.5)*.04),cy=H*(.5+(my-.5)*.04),r=Math.min(W,H)*.36;
const P=(i,a)=>{const rx=r*(1+i*.16),ry=r*(.3+i*.07),k=-.35;return[cx+Math.cos(a)*rx*Math.cos(k)-Math.sin(a)*ry*Math.sin(k),cy+Math.cos(a)*rx*Math.sin(k)+Math.sin(a)*ry*Math.cos(k)]};
for(let i=0;i<4;i++){g.beginPath();g.ellipse(cx,cy,r*(1+i*.16),r*(.3+i*.07),-.35,0,7);g.strokeStyle='rgba(212,175,55,'+(.4-i*.08)+')';g.lineWidth=dpr;g.stroke();
const [x,y]=P(i,t*(.45-i*.08)+i*1.7);g.beginPath();g.arc(x,y,(3.5+i)*dpr,0,7);g.fillStyle=['#d4af37','#7fb3ff','#e8e8f0','#9be3c4'][i];g.shadowColor=g.fillStyle;g.shadowBlur=12*dpr;g.fill();g.shadowBlur=0}
g.font=(22*dpr)+'px serif';g.textAlign='center';g.textBaseline='middle';
for(let i=0;i<glyph.length;i++){const [x,y]=P(3,t*.18+i/glyph.length*Math.PI*2);g.fillStyle='rgba(212,175,55,'+(.3+.35*Math.sin(t+i))+')';g.fillText(glyph[i],x,y)}
if(!still)requestAnimationFrame(frame)}requestAnimationFrame(frame)}
document.querySelectorAll('[data-count]').forEach(el=>{const v=+el.dataset.count;let i=0;const step=()=>{i=Math.min(v,i+Math.ceil(v/40)||1);el.textContent=i.toLocaleString(document.documentElement.lang);if(i<v)requestAnimationFrame(step)};step()});`;

export function home(lang, stats) {
  const t = T[lang];
  const k = t.kind;
  const sum = (key) => PUBLIC.concat(EXCL).reduce((n, c) => n + (stats.collections?.[c]?.[key] ?? 0), 0);
  const nextAt = stats.round ? (Date.now() < stats.round.startAt ? stats.round.startAt : stats.round.endAt) : null;
  const pick = (c) => (stats.showcase?.[c]?.length ? stats.showcase[c][(Date.now() >> 20) % stats.showcase[c].length] : 1 + ((Date.now() >> 20) % Math.max(1, Math.min(1000, stats.collections?.[c]?.produced || 1))));
  const stock = PUBLIC.reduce((n, c) => n + (stats.showcase?.[c]?.length ?? 0), 0);
  const exTotal = EXCL.reduce((n, c) => n + COLLECTIONS[c].max, 0);
  const show = [...PUBLIC, 'ex-quran'];
  void sum;
  const card = (c) => `<article class="card ${c.startsWith('ex-') ? 'is-ex' : 'is-pub'}">
    <a class="art" href="/${lang}/c/${c}"><img src="${img(c, pick(c))}" alt="${esc(collName(lang, c))}" loading="lazy" width="400" height="400"></a>
    ${badge(lang, c)}
    <h3>${esc(collName(lang, c))}</h3><p>${esc(t.collections[c.replace('ex-', '')][1])}</p>
    <p class="meta">${c.startsWith('ex-') ? `${fmt(COLLECTIONS[c].max, lang)} × 1/1 · ${lang === 'id' ? 'lelang koin AXTO' : 'AXTO coin auction'}` : `${fmt(stats.showcase?.[c]?.length ?? 0, lang)} ${lang === 'id' ? 'karya pilihan · $10–$1.000 · OpenSea' : 'picks · $10–$1,000 · OpenSea'}`}</p>
    <a class="link" href="/${lang}/c/${c}">${esc(t.collections.open)} →</a></article>`;
  const body = `
<section class="hero">
  <div class="hero-copy">
    <p class="kicker">${esc(t.hero.kicker)}</p>
    <h1>${esc(t.hero.title).replace('\n', '<br>')}</h1>
    <p class="lead">${esc(t.hero.lead)}</p>
    <p class="cta"><a class="btn gold" href="${altPath('gallery', lang)}">${esc(t.hero.cta)}</a> <a class="btn ghost" href="${altPath('auction', lang)}">${esc(t.nav.auction)}</a></p>
    <dl class="counters">
      <div><dt>${esc(t.hero.stock)}</dt><dd data-count="${stock}">0</dd></div>
      <div><dt>${esc(t.hero.exStock)}</dt><dd data-count="${exTotal}">0</dd></div>
      <div><dt>${esc(t.hero.live)}</dt><dd data-count="${sum('live')}">0</dd></div>
      ${nextAt ? `<div><dt>${esc(t.hero.next)}</dt><dd><time data-countdown="${nextAt}"></time></dd></div>` : ''}
    </dl>
  </div>
  <div class="hero-visual" aria-hidden="true">
    <canvas id="hero-canvas"></canvas>
    <div class="showcase">${show.map((c, i) => `<a class="sc" style="--i:${i}" href="${nftPath(lang, c, pick(c))}" tabindex="-1"><img src="${img(c, pick(c))}" alt="" width="400" height="400"><span>${esc(collName(lang, c))}</span></a>`).join('')}</div>
  </div>
</section>
<section class="kinds">
  <a class="kind pub" href="#publik"><b>${esc(k.pub)}</b><span>${esc(k.pubLong)}</span></a>
  <a class="kind ex" href="#eksklusif"><b>${esc(k.ex)}</b><span>${esc(k.exLong)}</span></a>
</section>
<section class="grid4" id="publik">
  <h2>${esc(k.pubTitle)}</h2><p class="lead wide">${esc(k.pubLead)}</p>
  ${PUBLIC.map(card).join('')}
</section>
<section class="grid3 exsec" id="eksklusif">
  <h2>${esc(k.exTitle)}</h2><p class="lead wide">${esc(k.exLead)}</p>
  ${EXCL.map(card).join('')}
</section>
<section class="how"><h2>${esc(t.how.title)}</h2><ol>${t.how.steps.map(([h, p]) => `<li><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('')}</ol></section>
<section class="duo">
  <article><h2>${esc(t.exclusiveBlurb[0])}</h2><p>${esc(t.exclusiveBlurb[1])}</p><a class="btn" href="${altPath('exclusive', lang)}">${esc(t.nav.exclusive)}</a></article>
  <article><h2>${esc(t.coinBlurb[0])}</h2><p>${esc(t.coinBlurb[1])}</p><a class="btn" href="${altPath('coin', lang)}">${esc(t.nav.coin)}</a></article>
</section>
<section class="faq"><h2>${esc(t.faq.title)}</h2>${t.faq.items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: t.faq.items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  return { body, jsonld: [faq], script: BANNER_JS };
}

function lotGrid(lang, c, rows, cur, withEnd) {
  const t = T[lang];
  if (!rows.length) return '';
  return `<ul class="lots">${rows.map((r) => `<li><a href="${nftPath(lang, c, r.tokenId)}">
    <img src="${img(c, r.tokenId)}" alt="${esc(collName(lang, c))} #${r.tokenId}" loading="lazy" width="300" height="300">
    <span class="id">#${r.tokenId}</span>${badge(lang, c)}
    <span class="price">${r.price ? `${esc(t.auction.highest)}: ${money(r.price, cur, lang)}` : `${esc(t.auction.start)}: ${money(r.start ?? 100, cur, lang)}`}</span>
    ${withEnd ? `<time data-countdown="${r.endAt}"></time>` : `<span>${r.bids} ${esc(t.waiting.offers)}</span>`}</a></li>`).join('')}</ul>`;
}

export function auctionPage(lang, c, data, sort, stats) {
  const t = T[lang];
  const tabs = EXCL.map((k) => `<a href="${altPath('auction', lang)}?c=${k}&amp;sort=${sort}"${k === c ? ' aria-current="true"' : ''}>${esc(collName(lang, k))}</a>`).join('');
  const sorts = [['ending', t.auction.sortEnding], ['highest', t.auction.sortHighest], ['lowest', t.auction.sortLowest]].map(([k, l]) => `<a href="${altPath('auction', lang)}?c=${c}&amp;sort=${k}"${k === sort ? ' aria-current="true"' : ''}>${esc(l)}</a>`).join('');
  const empty = !data.rows.length ? `<p class="empty">${esc(t.auction.empty)} ${stats.round ? `<time data-countdown="${stats.round.startAt > Date.now() ? stats.round.startAt : stats.round.endAt}"></time>` : '—'}</p>` : '';
  return `<section class="page"><h1>${esc(t.auction.title)}</h1>
  <nav class="tabs">${tabs}</nav><nav class="tabs small">${sorts}</nav>
  <p class="kindline">${badge(lang, c, true)}</p>
  <p class="meta">${fmt(data.total, lang)} ${esc(t.auction.lots)} · ${esc(t.auction.start)}: ${money(100, data.currency, lang)}</p>
  ${empty}${lotGrid(lang, c, data.rows, data.currency, true)}</section>`;
}

export function waitingPage(lang, c, data, order) {
  const t = T[lang];
  const tabs = EXCL.map((k) => `<a href="${altPath('waiting', lang)}?c=${k}&amp;order=${order}"${k === c ? ' aria-current="true"' : ''}>${esc(collName(lang, k))}</a>`).join('');
  const ord = [['desc', t.auction.sortHighest], ['asc', t.auction.sortLowest]].map(([k, l]) => `<a href="${altPath('waiting', lang)}?c=${c}&amp;order=${k}"${k === order ? ' aria-current="true"' : ''}>${esc(l)}</a>`).join('');
  return `<section class="page"><h1>${esc(t.waiting.title)}</h1><p class="lead">${esc(t.waiting.lead)}</p>
  <nav class="tabs">${tabs}</nav><nav class="tabs small">${ord}</nav><p class="kindline">${badge(lang, c, true)}</p>${lotGrid(lang, c, data.rows, data.currency, false)}</section>`;
}

const TIER_NAMES = { id: ['Klasik', 'Langka', 'Epik', 'Legendaris', 'Mahakarya'], en: ['Classic', 'Rare', 'Epic', 'Legendary', 'Masterpiece'] };

/**
 * Penjelajah koleksi cepat (perintah pemilik #37): tanpa tombol "next" yang lambat. Mozaik rapat yang terus memuat saat
 * digulir, penggeser untuk lompat ke nomor mana pun, saringan tier & seri, tiga tampilan (Mozaik · Galeri · Daftar) dan
 * pratinjau cepat yang bisa digeser antar karya. 60 karya pertama dirender server (SEO + tanpa JS tetap jalan).
 */
export function collectionPage(lang, c, o) {
  const base = c.replace('ex-', '');
  const t = T[lang];
  const L = lang === 'id'
    ? { views: ['Mozaik', 'Galeri', 'Daftar'], jump: 'Lompat ke #', tier: 'Semua tier', series: 'Semua seri', peek: 'Pratinjau cepat', detail: 'Buka detail', prev: 'Sebelumnya', next: 'Berikutnya', close: 'Tutup', found: 'karya', loading: 'Memuat…', none: 'Tidak ada karya yang cocok di rentang ini.', more: 'Muat lebih banyak' }
    : { views: ['Mosaic', 'Gallery', 'List'], jump: 'Jump to #', tier: 'All tiers', series: 'All series', peek: 'Quick look', detail: 'Open details', prev: 'Previous', next: 'Next', close: 'Close', found: 'works', loading: 'Loading…', none: 'No matching works in this range.', more: 'Load more' };
  const opts = seriesOptions(c);
  const view = ['mosaic', 'gallery', 'list'].includes(o.view) ? o.view : 'mosaic';
  const tile = (it) => `<li data-id="${it.id}" data-tier="${it.tier}"><a href="${nftPath(lang, c, it.id)}"><img src="${img(c, it.id)}" alt="${esc(it.name)}" loading="lazy" width="300" height="300"><span class="id">#${fmt(it.id, lang)}</span><span class="nm">${esc(it.name)}</span><span class="tr t${it.tier}">${esc(TIER_NAMES[lang][it.tier])}</span>${it.usd ? `<span class="pr">$${fmt(it.usd, lang)}</span>` : ''}</a></li>`;
  const pub = !COLLECTIONS[c].exclusive;
  const crumbs = o.crumbs ? `<nav class="crumbs" aria-label="breadcrumb">${o.crumbs.map(([n, h], i) => (i < o.crumbs.length - 1 ? `<a href="${h}">${esc(n)}</a>` : `<span aria-current="page">${esc(n)}</span>`)).join(' › ')}</nav>` : '';
  const chips = pub && o.facets ? `<nav class="chips" aria-label="${esc(L.series)}"><a href="/${lang}/c/${c}"${!o.series && !o.surah ? ' aria-current="true"' : ''}>${esc(lang === 'id' ? 'Semua' : 'All')} <small>${fmt(o.produced, lang)}</small></a>${opts.filter(([k]) => o.facets.series[k]).map(([k]) => `<a href="/${lang}/c/${c}/${k}"${o.series === k && !o.surah ? ' aria-current="true"' : ''}>${esc(seriesLabel(c, k, lang))} <small>${fmt(o.facets.series[k], lang)}</small></a>`).join('')}</nav>` : '';
  const surahs = pub && c === 'quran' && o.facets ? `<details class="surahs"${o.surah ? ' open' : ''}><summary>${esc(lang === 'id' ? 'Telusuri per surah (114)' : 'Browse by surah (114)')}</summary><ol>${Object.keys(o.facets.surah).map(Number).sort((a, b) => a - b).map((n) => `<li><a href="/${lang}/c/quran/surah/${n}"${o.surah === n ? ' aria-current="true"' : ''}>${n}. ${esc(surahInfo(n)[2])} <small>${fmt(o.facets.surah[n], lang)}</small></a></li>`).join('')}</ol></details>` : '';
  const priceRow = pub ? `<p class="prices">${TIER_NAMES[lang].map((n, i) => `<span class="tr t${i}">${esc(n)} $${fmt(OPENSEA_PRICE_USD[i], lang)}</span>`).join('')}</p>` : '';
  const qs = (extra) => new URLSearchParams({ ...(o.tier !== null ? { tier: String(o.tier) } : {}), ...(o.series ? { series: o.series } : {}), view, ...extra }).toString().replace(/&/g, '&amp;');
  return `<section class="page explorer" id="explorer" data-c="${c}" data-lang="${lang}" data-produced="${o.produced}" data-next="${o.first.next ?? ''}" data-from="${o.from}" data-surah="${o.surah || ''}">
  ${crumbs}<h1>${esc(o.seo?.h1 ?? collName(lang, c))}</h1><p class="kindline">${badge(lang, c, true)}</p><p class="lead">${esc(o.seo?.intro ?? t.collections[base][1])}</p>${priceRow}${chips}${surahs}
  <div class="xbar">
    <div class="views" role="group" aria-label="View">${['mosaic', 'gallery', 'list'].map((v, i) => `<button type="button" data-view="${v}"${v === view ? ' aria-pressed="true"' : ' aria-pressed="false"'}>${esc(L.views[i])}</button>`).join('')}</div>
    <label class="jump"><span>${esc(L.jump)}<output>${fmt(o.from, lang)}</output></span><input type="range" min="1" max="${Math.max(1, o.produced)}" step="1" value="${o.from}" aria-label="${esc(L.jump)}"></label>
    <select class="ftier" aria-label="Tier"><option value="">${esc(L.tier)}</option>${TIER_NAMES[lang].map((n, i) => `<option value="${i}"${o.tier === i ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
    ${opts.length ? `<select class="fseries" aria-label="Series"><option value="">${esc(L.series)}</option>${opts.map(([k, en, id]) => `<option value="${esc(k)}"${o.series === k ? ' selected' : ''}>${esc(lang === 'id' ? id : en)}</option>`).join('')}</select>` : ''}
    <span class="meta xcount">${pub ? `${fmt(o.produced, lang)} ${lang === 'id' ? 'karya pilihan dari' : 'picks of'} ${fmt(COLLECTIONS[c].max, lang)}` : `${fmt(o.produced, lang)} / ${fmt(COLLECTIONS[c].max, lang)}`}</span>
  </div>
  <ul class="xgrid v-${view}">${o.first.items.map(tile).join('')}</ul>
  ${o.first.items.length ? '' : `<p class="empty">${esc(L.none)}</p>`}
  <p class="xmore"><a class="btn ghost" href="/${lang}/c/${c}?${qs({ from: String(o.first.next ?? o.from) })}" data-more>${esc(L.more)}</a></p>
  <div class="peek" hidden role="dialog" aria-modal="true" aria-label="${esc(L.peek)}">
    <div class="peek-in"><div class="peek-stage"><iframe title="${esc(L.peek)}" allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin"></iframe></div>
    <p class="peek-name"></p>
    <p class="peek-nav"><button type="button" class="btn" data-peek="prev" aria-label="${esc(L.prev)}">←</button><a class="btn gold" data-peek="detail" href="#">${esc(L.detail)}</a><button type="button" class="btn" data-peek="next" aria-label="${esc(L.next)}">→</button><button type="button" class="btn ghost" data-peek="close" aria-label="${esc(L.close)}">✕</button></p></div>
  </div>
  <script type="application/json" id="x-i18n">${JSON.stringify({ tiers: TIER_NAMES[lang], loading: L.loading, none: L.none }).replace(/</g, '\\u003c')}</script>
</section>`;
}

/** Kotak beli karya publik (perintah pemilik #44/#45): harga tetap per tier, tombol langsung ke listing OpenSea. */
function buyBox(lang, c, id, meta, opensea, usd) {
  const t = T[lang];
  const tier = meta.attributes.find((a) => a.trait_type === 'Tier')?.value;
  return `<div class="buybox"><p class="price"><span>${esc(t.kind.fixed)}</span><b>$${fmt(usd, lang)}</b><small>${lang === 'id' ? `dibayar ETH di jaringan Base · tingkat ${esc(TIER_NAMES.id[TIER_NAMES.en.indexOf(tier)] ?? tier)}` : `paid in ETH on Base · ${esc(tier)} tier`}</small></p>
  ${opensea ? `<a class="btn gold big" href="${esc(opensea)}" target="_blank" rel="noopener">${esc(t.kind.buy)} ↗</a>` : `<span class="btn ghost big" aria-disabled="true">${esc(t.kind.soon)}</span>`}
  <p class="meta">${lang === 'id' ? 'Pembayaran dan pengiriman NFT terjadi langsung di OpenSea; NFT masuk ke wallet Anda begitu transaksi selesai. Royalti 10% berlaku pada setiap penjualan ulang.' : 'Payment and delivery happen directly on OpenSea; the NFT lands in your wallet as soon as the transaction completes. A 10% royalty applies to every resale.'}</p></div>`;
}

export function nftPage(lang, c, id, meta, lot, attrsId, opensea = '', pubInfo = null) {
  const t = T[lang];
  const attrs = lang === 'id' ? attrsId : meta.attributes;
  if (pubInfo) return nftPublicPage(lang, c, id, meta, attrs, opensea, pubInfo);
  const live = lot.status === 'live' || lot.status === 'waiting';
  const rarity = meta.attributes.find((a) => a.trait_type === 'Tier')?.value;
  return `<section class="nft">
  <div class="stage"><iframe src="/play/${c}/${id}" title="${esc(meta.name)}" loading="lazy" allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin"></iframe></div>
  <div class="info">
    <p class="kindline">${badge(lang, c, true)}</p>
    <h1>${esc(meta.name)}</h1>
    <p class="meta">${esc(t.nft.edition)} · ${esc(t.nft.rarity)}: ${esc(rarity)}</p>
    <div class="bidbox" data-c="${c}" data-id="${id}" data-currency="${lot.currency}" data-status="${lot.status}" data-min-fixed="${lot.minFixed}" data-min-proxy="${lot.minProxy}">
      <p>${esc(t.auction.start)}: <b>${money(lot.start, lot.currency, lang)}</b> · ${esc(t.auction.highest)}: <b>${lot.price ? money(lot.price, lot.currency, lang) : '—'}</b></p>
      ${lot.endAt ? `<p>${esc(t.auction.endsIn)} <time data-countdown="${lot.endAt}"></time></p>` : ''}
      ${live ? `<p class="bidrow"><button class="btn gold" data-bid="auto" type="button">${esc(t.auction.bidAuto)}</button>
        <input type="number" min="0" step="0.01" inputmode="decimal" aria-label="${esc(t.auction.bidMax)}" placeholder="${esc(t.auction.bidMax)}">
        <button class="btn" data-bid="proxy" type="button">${esc(t.auction.bid)}</button></p><p class="bidmsg" role="status"></p>` : `<p class="status">${esc(t.kind.status[lot.status] ?? lot.status)}</p>`}
    </div>
    <h2>${esc(t.nft.traits)}</h2>
    <dl class="traits">${attrs.map((a) => `<div><dt>${esc(a.trait_type)}</dt><dd>${esc(a.value)}</dd></div>`).join('')}</dl>
    <p><a class="link" href="/play/${c}/${id}" target="_blank" rel="noopener">${esc(t.nft.play)} ↗</a> · <a class="link" href="${altPath('verify', lang, `/${c}/${id}`)}">${esc(t.nft.certificate)}</a>${opensea ? ` · <a class="link" href="${esc(opensea)}" target="_blank" rel="noopener">${esc(t.kind.opensea)} ↗</a>` : ''}</p>
    <details><summary>${esc(t.nft.history)} (${lot.bids.length})</summary><ol class="hist">${lot.bids.slice().reverse().map((b) => `<li>${esc(b.bidder.slice(0, 6))}…${esc(b.bidder.slice(-4))} · ${esc(b.kind)} · <time datetime="${new Date(b.at).toISOString()}">${new Date(b.at).toISOString().slice(0, 16).replace('T', ' ')}</time></li>`).join('')}</ol></details>
    <p class="desc">${esc(meta.description).replace(/\n/g, '<br>')}</p>
  </div></section>`;
}

function nftPublicPage(lang, c, id, meta, attrs, opensea, info) {
  const t = T[lang];
  const rarity = meta.attributes.find((a) => a.trait_type === 'Tier')?.value;
  const crumbs = `<nav class="crumbs" aria-label="breadcrumb">${info.crumbs.map(([n, h]) => `<a href="${h}">${esc(n)}</a>`).join(' › ')}</nav>`;
  const rel = info.related.length ? `<h2>${esc(lang === 'id' ? 'Karya lain di galeri ini' : 'More from this gallery')}</h2><ul class="lots rel">${info.related.map((it) => `<li><a href="${nftPath(lang, c, it.id)}"><img src="${img(c, it.id)}" alt="${esc(it.name)}" loading="lazy" width="300" height="300"><span class="id">#${fmt(it.id, lang)}</span><span class="pr">$${fmt(it.usd, lang)}</span></a></li>`).join('')}</ul>` : '';
  return `<section class="nft">
  <div class="stage"><iframe src="/play/${c}/${id}" title="${esc(meta.name)}" loading="lazy" allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin"></iframe></div>
  <div class="info">
    ${crumbs}
    <p class="kindline">${badge(lang, c, true)}</p>
    <h1>${esc(meta.name)}</h1>
    <p class="meta">${esc(t.nft.edition)} · ${esc(t.nft.rarity)}: ${esc(TIER_NAMES[lang][TIER_NAMES.en.indexOf(rarity)] ?? rarity)} · ${lang === 'id' ? 'Galeri' : 'Gallery'}: <a class="link" href="${info.galleryHref}">${esc(info.galleryName)}</a></p>
    ${buyBox(lang, c, id, meta, opensea, info.usd)}
    <h2>${esc(t.nft.traits)}</h2>
    <dl class="traits">${attrs.map((a) => `<div><dt>${esc(a.trait_type)}</dt><dd>${esc(a.value)}</dd></div>`).join('')}</dl>
    <p><a class="link" href="/play/${c}/${id}" target="_blank" rel="noopener">${esc(t.nft.play)} ↗</a> · <a class="link" href="${altPath('verify', lang, `/${c}/${id}`)}">${esc(t.nft.certificate)}</a>${opensea ? ` · <a class="link" href="${esc(opensea)}" target="_blank" rel="noopener">${esc(t.kind.opensea)} ↗</a>` : ''}</p>
    <p class="desc">${esc(meta.description).replace(/\n/g, '<br>')}</p>
    ${rel}
  </div></section>`;
}

/** Induk galeri: semua galeri & seri (tautan internal untuk pengunjung dan mesin pencari). */
export function galleryHub(lang, facets, seo) {
  const t = T[lang];
  const sec = (c) => {
    const f = facets[c];
    const total = Object.values(f.series).reduce((a, b) => a + b, 0);
    return `<section class="hubsec"><h2><a href="/${lang}/c/${c}">${esc(collName(lang, c))}</a> <small>${fmt(total, lang)}</small></h2><p>${esc(t.collections[c][1])}</p>
    <ul class="chips">${seriesOptions(c).filter(([k]) => f.series[k]).map(([k]) => `<li><a href="/${lang}/c/${c}/${k}">${esc(seriesLabel(c, k, lang))} <small>${fmt(f.series[k], lang)}</small></a></li>`).join('')}</ul>
    ${c === 'quran' ? `<details class="surahs"><summary>${esc(lang === 'id' ? 'Per surah' : 'By surah')}</summary><ol>${Object.keys(f.surah).map(Number).sort((a, b) => a - b).map((n) => `<li><a href="/${lang}/c/quran/surah/${n}">${n}. ${esc(surahInfo(n)[2])} <small>${fmt(f.surah[n], lang)}</small></a></li>`).join('')}</ol></details>` : ''}</section>`;
  };
  return `<section class="page hub"><nav class="crumbs"><a href="/${lang}">${esc(BREAD[lang].home)}</a> › <span aria-current="page">${esc(BREAD[lang].hub)}</span></nav><h1>${esc(seo.h1)}</h1><p class="lead">${esc(seo.desc)}</p>
  ${PUBLIC.map(sec).join('')}
  <section class="hubsec ex"><h2><a href="${altPath('exclusive', lang)}">${esc(t.kind.exTitle)}</a></h2><p>${esc(t.kind.exLead)}</p><ul class="chips">${EXCL.map((c) => `<li><a href="/${lang}/c/${c}">${esc(collName(lang, c))} <small>${fmt(COLLECTIONS[c].max, lang)}</small></a></li>`).join('')}</ul></section></section>`;
}

export function exclusivePage(lang, stats) {
  const t = T[lang];
  return `<section class="page"><h1>${esc(t.exclusive.title)}</h1><p class="kindline">${badge(lang, 'ex-time', true)}</p><p class="lead">${esc(t.kind.exLead)}</p><p class="meta">${esc(t.exclusive.lead)}</p>
  <div class="grid3">${EXCL.map((c) => `<article class="card is-ex"><a class="art" href="/${lang}/c/${c}"><img src="${img(c, 1)}" alt="${esc(collName(lang, c))}" loading="lazy" width="400" height="400"></a>
  <h3>${esc(collName(lang, c))}</h3><p class="meta">${fmt(COLLECTIONS[c].max, lang)} × 1/1 · ${fmt(stats.collections?.[c]?.sold, lang)} ${esc(t.hero.sold)}</p>
  <a class="link" href="${altPath('auction', lang)}?c=${c}">${esc(t.nav.auction)} →</a></article>`).join('')}</div>
  <div id="ex-market" data-lang="${lang}"></div></section>`;
}

export function coinPage(lang, sale, paypalOn, a = {}) {
  const t = T[lang].coin;
  return `<section class="page coin"><h1>${esc(t.title)}</h1>
  <dl class="counters"><div><dt>${esc(t.supply)}</dt><dd>10.000.000</dd></div><div><dt>${esc(t.price)}</dt><dd>$10</dd></div><div><dt>${esc(t.sold)}</dt><dd>${fmt(sale?.sold, lang)} / 2.000.000</dd></div></dl>
  <table class="split"><tbody>${t.split.map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</tbody></table>
  <div class="buy" id="coin-buy"><label>${lang === 'id' ? 'Jumlah koin' : 'Number of coins'} <input type="number" min="1" max="5000" step="1" value="10" id="coin-n"></label>
  <p>${paypalOn ? `<button class="btn gold" type="button" data-buy="paypal">${esc(t.buyPaypal)}</button>` : `<span class="muted">${esc(t.paypalOff)}</span>`}
  <button class="btn" type="button" data-buy="usdc">${esc(t.buyUsdc)}</button> <button class="btn" type="button" data-buy="eth">${esc(t.buyEth)}</button> <button class="btn ghost" type="button" data-watch-axto>${lang === 'id' ? 'Tambahkan AXTO ke MetaMask' : 'Add AXTO to MetaMask'}</button></p><p class="buymsg" role="status"></p></div>
  ${coinWalletBox(lang, a)}
  <p class="disclaimer">${esc(t.disclaimer)}</p></section>`;
}

/** Kotak wallet publik (perintah pemilik #43 „jgn bongkar rahasia perusahaan"): HANYA dua alamat kontrak yang dibutuhkan
 *  pembeli — kontrak token (impor ke wallet) dan kontrak beli (kirim ETH = beli). Wallet internal perusahaan (bank,
 *  presale, vesting, hold, treasury) beserta saldonya hanya tampil di Portal admin. */
function coinWalletBox(lang, a) {
  const id = lang === 'id';
  if (!a.token) return `<p class="muted">${id ? 'Alamat kontrak koin tampil di sini begitu kontrak aktif.' : 'The coin contract address appears here once the contract is live.'}</p>`;
  const row = (label, x) => `<tr><th>${esc(label)}</th><td><code>${esc(x)}</code> <button class="btn ghost sm" type="button" data-copy="${esc(x)}">${id ? 'Salin' : 'Copy'}</button></td></tr>`;
  return `<section class="coin-wallet"><h2>${id ? 'Tambahkan AXTO di wallet Anda' : 'Add AXTO to your wallet'}</h2>
  <p class="meta">${id ? 'Jaringan Base · simbol AXTO · 18 desimal' : 'Base network · symbol AXTO · 18 decimals'}</p>
  <table class="split cw"><tbody>${row(id ? 'Kontrak token (impor manual)' : 'Token contract (manual import)', a.token)}${a.sale ? row(id ? 'Kontrak beli (kirim ETH = beli AXTO $10)' : 'Purchase contract (send ETH = buy AXTO at $10)', a.sale) : ''}</tbody></table></section>`;
}

export function memberPage(lang) {
  const t = T[lang].member;
  return `<section class="page"><h1>${esc(t.title)}</h1><div id="member" data-lang="${lang}"><p>${esc(t.connectFirst)}</p></div></section>`;
}

export function adminPage(lang, ok, stats) {
  const t = T[lang].admin;
  if (!ok) return `<section class="page"><h1>${esc(t.title)}</h1><p>${esc(t.denied)}</p></section>`;
  const rows = Object.entries(stats.collections).map(([c, s]) => `<tr><th>${esc(c)}</th><td>${fmt(s.produced, lang)}</td><td>${fmt(s.ready, lang)}</td><td>${fmt(s.live, lang)}</td><td>${fmt(s.sold, lang)}</td></tr>`).join('');
  return `<section class="page"><h1>${esc(t.title)}</h1><table class="split"><thead><tr><th></th><th>produced</th><th>ready</th><th>live</th><th>sold</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="meta">genesis: ${stats.genesis ? new Date(stats.genesis).toISOString() : '—'}</p>
  <h2>${lang === 'id' ? 'Kontrak (deploy otomatis oleh sistem)' : 'Contracts (deployed automatically by the system)'}</h2>
  <p>${lang === 'id' ? 'Sistem mendeploy semua kontrak sendiri dari wallet deployer khusus; pemilik AuctionHouse & 8 koleksi langsung wallet produksi, pemilik koin AXTO langsung wallet koin. 4 koleksi publik (40.000.000 NFT) tercetak saat deploy ke wallet toko sistem dan tampil di OpenSea; 4 koleksi eksklusif (40.000) dicetak saat member WD.' : 'The system deploys every contract itself from a dedicated deployer wallet; ownership goes straight to the production and coin wallets. The 4 public collections (40,000,000 NFTs) are minted at deploy to the system store wallet and show on OpenSea; the 4 exclusive collections (40,000) are minted when members withdraw.'}</p>
  <div id="deploy" data-lang="${lang}"><p class="muted">…</p></div></section>`;
}

export function verifyPage(lang, c, id, meta, hash, owner) {
  const t = T[lang].verify;
  return `<section class="page"><h1>${esc(t.title)}</h1><p class="ok">✓ ${esc(t.ok)}</p>
  <h2>${esc(meta.name)}</h2><p class="kindline">${badge(lang, c, true)}</p><p><img src="${img(c, id)}" alt="" width="320" height="320"></p>
  <dl class="traits"><div><dt>${esc(t.hash)}</dt><dd><code>${esc(hash)}</code></dd></div><div><dt>${esc(T[lang].nft.owner)}</dt><dd>${owner ? `<code>${esc(owner)}</code>` : '—'}</dd></div></dl></section>`;
}

export function notFound(lang) {
  const t = T[lang].errors;
  return `<section class="page"><h1>404 — ${esc(t.notFound)}</h1><p><a class="btn" href="/${lang}">${esc(t.back)}</a></p></section>`;
}

export { PUBLIC, EXCL, PATHS, collName, TIER_NAMES };
