/** Isi halaman axto.io (server-rendered, dua bahasa manual). */
import { T, PATHS } from './i18n.js';
import { esc, altPath } from './html.js';
import { COLLECTIONS, kode } from '../../engine/src/core.js';
import { seriesOptions } from '../../engine/src/metadata.js';
import { BANDS, EXCLUSIVE_SUPPLY } from '../../engine/src/editions.js';
import { seriesLabel, surahInfo, BREAD } from './seo.js';

const PUBLIC = ['time', 'stamp', 'quran', 'model', 'hadith'];
const EXCL = ['ex-time', 'ex-stamp', 'ex-quran', 'ex-model', 'ex-hadith'];
const fmt = (n, lang) => Number(n ?? 0).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US');
const nftPath = (lang, c, id) => `/${lang}/nft/${c}/${id}`;
const IMGV = 'v=9';
const img = (c, id) => `/img/${c}/${id}.svg?${IMGV}`;
/** Lencana jenis karya: publik (OpenSea, harga tetap per kelangkaan) atau eksklusif ($1, koin AXTO, kustodi axto.io, WD). */
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

export function home(lang, d) {
  const t = T[lang];
  const pick = (c) => (d.showcase?.[c]?.length ? d.showcase[c][(Date.now() >> 20) % d.showcase[c].length] : 1 + ((Date.now() >> 20) % 1000));
  const exPick = (c) => 1 + ((Date.now() >> 20) % COLLECTIONS[c].max);
  const exWorks = EXCL.reduce((n, c) => n + COLLECTIONS[c].max, 0);
  const show = ['ex-quran', 'ex-time', ...PUBLIC.slice(1, 4), 'ex-hadith'];
  const market = (key, href, cls, c) => `<article class="mkt ${cls}"><a class="art" href="${href}"><img src="${img(c, c.startsWith('ex-') ? exPick(c) : pick(c))}" alt="" loading="lazy" width="400" height="400"></a>
    <h3>${esc(t.markets[key][0])}</h3><p>${esc(t.markets[key][1])}</p><a class="btn ${cls === 'ex' ? 'gold' : ''}" href="${href}">${esc(t.markets.open)} →</a></article>`;
  const card = (c) => `<article class="card is-pub"><a class="art" href="/${lang}/c/${c}"><img src="${img(c, pick(c))}" alt="${esc(collName(lang, c))}" loading="lazy" width="400" height="400"></a>
    <h3>${esc(collName(lang, c))}</h3><p>${esc(t.collections[c][1])}</p>
    <p class="meta"><a class="link" href="/${lang}/c/ex-${c}">${esc(lang === 'id' ? 'Eksklusif $1' : 'Exclusive $1')}</a> · <a class="link" href="/${lang}/c/${c}">OpenSea</a></p></article>`;
  const body = `
<section class="hero">
  <div class="hero-copy">
    <p class="kicker">${esc(t.hero.kicker)}</p>
    <h1>${esc(t.hero.title).replace('\n', '<br>')}</h1>
    <p class="lead">${esc(t.hero.lead)}</p>
    <p class="cta"><a class="btn gold" href="${altPath('exclusive', lang)}">${esc(t.hero.cta)}</a> <a class="btn ghost" href="${altPath('coin', lang)}">${esc(t.hero.cta2)}</a></p>
    <dl class="counters">
      <div><dt>${esc(t.hero.exWorks)}</dt><dd data-count="${exWorks}">0</dd></div>
      <div><dt>${esc(t.hero.exEditions)}</dt><dd data-count="${exWorks * EXCLUSIVE_SUPPLY}">0</dd></div>
      <div><dt>${esc(t.hero.exSold)}</dt><dd data-count="${d.exSold ?? 0}">0</dd></div>
      <div><dt>${esc(t.hero.listings)}</dt><dd data-count="${d.listings ?? 0}">0</dd></div>
    </dl>
  </div>
  <div class="hero-visual" aria-hidden="true">
    <canvas id="hero-canvas"></canvas>
    <div class="showcase">${show.map((c, i) => { const id = c.startsWith('ex-') ? exPick(c) : pick(c); return `<a class="sc" style="--i:${i}" href="${nftPath(lang, c, id)}" tabindex="-1"><img src="${img(c, id)}" alt="" width="400" height="400"><span>${esc(collName(lang, c))}</span></a>`; }).join('')}</div>
  </div>
</section>
${storyBlock(lang)}
<section class="markets"><h2>${esc(t.markets.title)}</h2>
  ${market('ex', altPath('exclusive', lang), 'ex', 'ex-quran')}
  ${market('mk', altPath('market', lang), 'mk', 'ex-time')}
  ${market('os', altPath('opensea', lang), 'os', 'stamp')}
</section>
<section class="grid4"><h2>${esc(t.collections.title)}</h2>${PUBLIC.map(card).join('')}</section>
<section class="how"><h2>${esc(t.how.title)}</h2><ol>${t.how.steps.map(([h, p]) => `<li><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('')}</ol></section>
<section class="duo">
  <article><h2>${esc(t.markets.ex[0])}</h2><p>${esc(t.markets.ex[1])}</p><a class="btn gold" href="${altPath('exclusive', lang)}">${esc(t.nav.exclusive)}</a></article>
  <article><h2>${esc(t.coinBlurb[0])}</h2><p>${esc(t.coinBlurb[1])}</p><a class="btn" href="${altPath('coin', lang)}">${esc(t.nav.coin)}</a></article>
</section>
<section class="faq"><h2>${esc(t.faq.title)}</h2>${t.faq.items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: t.faq.items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  return { body, jsonld: [faq], script: BANNER_JS };
}

/** Narasi hadiah & berbagi (pemilik 23 Nov 2026): hadiah, komunitas, murah meriah, WD satuan/massal. */
function storyBlock(lang, withCta = true) {
  const st = T[lang].story;
  const icons = ['🎁', '🤝', '✨', '⇩'];
  return `<section class="story"><p class="kicker">${esc(st.kicker)}</p><h2>${esc(st.title)}</h2><p class="lead">${esc(st.lead)}</p>
  <ul class="story-points">${st.points.map(([h, p], i) => `<li style="--i:${i}"><span class="ico" aria-hidden="true">${icons[i]}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('')}</ul>
  ${withCta ? `<p><a class="btn gold" href="${altPath('exclusive', lang)}">${esc(st.cta)} →</a></p>` : ''}</section>`;
}

/** Tabel kelangkaan → edisi → harga (OpenSea) dari engine/src/editions.js — satu sumber dengan kontrak & listing. */
function tierTable(lang) {
  const t = T[lang];
  const usd = (n) => `$${fmt(n, lang)}`;
  return `<table class="split tiers"><caption>${esc(t.tiersTitle)}</caption><thead><tr><th>${esc(t.nft.rarity)}</th><th>${esc(t.nft.edition)}</th><th>${esc(T[lang].kind.fixed)}</th></tr></thead><tbody>${BANDS.map((b, i) => `<tr><th><span class="tr t${i}">${esc(TIER_NAMES[lang][i])}</span></th><td>${b.supply[0] === b.supply[1] ? b.supply[0] : `${b.supply[1]}–${b.supply[0]}`}</td><td>${usd(b.price[0])}–${usd(b.price.at(-1))}</td></tr>`).join('')}</tbody></table>`;
}

/** 1. Marketplace Eksklusif axto.io — harga tetap $1 per edisi, koin AXTO, 10 edisi per karya. */
export function exclusivePage(lang, d) {
  const t = T[lang];
  const x = t.exclusive;
  const total = (c) => COLLECTIONS[c].max * EXCLUSIVE_SUPPLY;
  return `<section class="page shop"><nav class="crumbs"><a href="/${lang}">${esc(BREAD[lang].home)}</a> › <span aria-current="page">${esc(BREAD[lang].ex)}</span></nav>
  <h1>${esc(x.title)}</h1><p class="kindline">${badge(lang, 'ex-time', true)}</p><p class="lead">${esc(x.lead)}</p>
  <dl class="counters"><div><dt>${esc(x.price)}</dt><dd>$1 · ${esc(d.priceCoins)} AXTO</dd></div><div><dt>${esc(t.hero.exWorks)}</dt><dd>${fmt(EXCL.reduce((n, c) => n + COLLECTIONS[c].max, 0), lang)}</dd></div><div><dt>${esc(t.hero.exSold)}</dt><dd>${fmt(Object.values(d.sold ?? {}).reduce((a, b) => a + b, 0), lang)}</dd></div></dl>
  ${storyBlock(lang, false)}
  <div class="grid3">${EXCL.map((c) => `<article class="card is-ex"><a class="art" href="/${lang}/c/${c}"><img src="${img(c, 1 + ((Date.now() >> 20) % COLLECTIONS[c].max))}" alt="${esc(collName(lang, c))}" loading="lazy" width="400" height="400"></a>
  <h3>${esc(collName(lang, c))}</h3><p class="meta">${fmt(COLLECTIONS[c].max, lang)} ${esc(x.works)} × ${EXCLUSIVE_SUPPLY} ${esc(x.editions)} · ${fmt(d.sold?.[c] ?? 0, lang)} / ${fmt(total(c), lang)} ${esc(x.sold)}</p>
  ${c !== 'ex-model' ? `<p class="meta"><a class="link gchip-l" href="/${lang}/c/${c}?maker=gpu">${esc(t.opensea.gpu)} · ${fmt(d.gpu?.[c] ?? 0, lang)} ${esc(x.works)} →</a></p>` : ''}
  <a class="btn gold" href="/${lang}/c/${c}">${esc(t.collections.open)} →</a></article>`).join('')}</div>
  <p class="meta">${esc(x.custody)} <a class="link" href="${altPath('coin', lang)}#beli-koin">${esc(x.needCoins)} →</a> · <a class="link" href="${altPath('market', lang)}">${esc(t.nav.market)} →</a></p></section>`;
}

/** 2. Pasar Member — listing antar member (koin AXTO, fee 10%). Dirender server; aksi lewat /market.js. */
export function marketPage(lang, data, f) {
  const t = T[lang];
  const m = t.market;
  const q = (o) => { const p = new URLSearchParams({ ...(f.c ? { c: f.c } : {}), ...(f.mode ? { mode: f.mode } : {}), sort: f.sort, ...o }); for (const [k, v] of [...p]) if (!v) p.delete(k); return p.toString().replace(/&/g, '&amp;'); };
  const tabs = [['', m.all], ...EXCL.map((c) => [c, collName(lang, c)])].map(([c, l]) => `<a href="${altPath('market', lang)}?${q({ c })}"${(f.c ?? '') === c ? ' aria-current="true"' : ''}>${esc(l)}</a>`).join('');
  const modes = [['', m.all], ...Object.entries(m.modes)].map(([k, l]) => `<a href="${altPath('market', lang)}?${q({ mode: k })}"${(f.mode ?? '') === k ? ' aria-current="true"' : ''}>${esc(l)}</a>`).join('');
  const sorts = Object.entries(m.sort).map(([k, l]) => `<a href="${altPath('market', lang)}?${q({ sort: k })}"${f.sort === k ? ' aria-current="true"' : ''}>${esc(l)}</a>`).join('');
  const row = (r) => `<li data-lid="${esc(r.lid)}"><a href="${nftPath(lang, r.c, r.id)}#pasar">
    <img src="${img(r.c, r.id)}" alt="${esc(collName(lang, r.c))} ${kode(r.c, r.id)}" loading="lazy" width="300" height="300">
    <span class="id">${kode(r.c, r.id)}</span><span class="mode m-${esc(r.mode)}">${esc(m.modes[r.mode] ?? r.mode)}</span>
    <span class="price">${esc(r.mode === 'auction' ? m.top : r.mode === 'offer' ? m.min : m.price)}: ${esc(r.price)} AXTO</span>
    <span class="meta">${fmt(r.qty, lang)} ${esc(m.left)} · ${esc(m.seller)} ${esc(r.seller)}</span>
    ${r.mode === 'auction' ? `<time data-countdown="${r.ends}"></time>` : ''}</a></li>`;
  return `<section class="page market"><nav class="crumbs"><a href="/${lang}">${esc(BREAD[lang].home)}</a> › <span aria-current="page">${esc(BREAD[lang].mk)}</span></nav>
  <h1>${esc(m.title)}</h1><p class="kindline">${badge(lang, 'ex-time', false)}</p><p class="lead">${esc(m.lead)}</p>
  <nav class="tabs">${tabs}</nav><nav class="tabs small">${modes}</nav><nav class="tabs small">${sorts}</nav>
  <p class="meta">${fmt(data.total, lang)} listing</p>
  ${data.rows.length ? `<ul class="lots">${data.rows.map(row).join('')}</ul>` : `<p class="empty">${esc(m.empty)} <a class="link" href="${altPath('exclusive', lang)}">${esc(t.nav.exclusive)} →</a></p>`}</section>`;
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
  const pub = !COLLECTIONS[c].exclusive;
  // harga di kartu: eksklusif = $1 + sisa edisi (dari 10); publik = harga tetap OpenSea + jumlah edisi
  const tag = (it) => (pub ? `${it.usd ? `<span class="pr">$${fmt(it.usd, lang)}</span>` : ''}${it.ed ? `<span class="ed">${it.ed}×</span>` : ''}` : `<span class="pr">$1</span><span class="ed${it.left === 0 ? ' out' : ''}">${it.left ?? EXCLUSIVE_SUPPLY}/${EXCLUSIVE_SUPPLY}</span>`);
  const tile = (it) => `<li data-id="${it.id}" data-tier="${it.tier}"${it.gpu ? ` class="g" data-g="${it.g}"` : ''}><a href="${nftPath(lang, c, it.id)}${it.gpu ? '?v=g' : ''}"><img src="${it.gpu ? `/gpu/${c}/${it.id}.png?v=2` : img(c, it.id)}" alt="${esc(it.name)}" loading="lazy" width="300" height="300"><span class="id">${it.gpu ? kode(c, it.id, it.g) : kode(c, it.id)}</span><span class="nm">${esc(it.name.replace(/^(OS|AC)-\d+ · /, ''))}</span><span class="tr t${it.tier}">${esc(TIER_NAMES[lang][it.tier])}</span>${tag(it)}</a></li>`;
  const crumbs = o.crumbs ? `<nav class="crumbs" aria-label="breadcrumb">${o.crumbs.map(([n, h], i) => (i < o.crumbs.length - 1 ? `<a href="${h}">${esc(n)}</a>` : `<span aria-current="page">${esc(n)}</span>`)).join(' › ')}</nav>` : '';
  const gpuChip = !/model$/.test(c) ? `<a href="/${lang}/c/${c}?maker=gpu"${o.maker === 'gpu' ? ' aria-current="true"' : ''} class="gchip">${esc(t.opensea.gpu)} <small>${fmt(o.gpuCount ?? 0, lang)}</small></a>` : '';
  const exChips = !pub && gpuChip ? `<nav class="chips" aria-label="G-"><a href="/${lang}/c/${c}"${o.maker !== 'gpu' ? ' aria-current="true"' : ''}>${esc(lang === 'id' ? 'Semua' : 'All')} <small>${fmt(COLLECTIONS[c].max, lang)}</small></a>${gpuChip}</nav>` : '';
  const chips = pub && o.facets ? `<nav class="chips" aria-label="${esc(L.series)}"><a href="/${lang}/c/${c}"${!o.series && !o.surah && o.maker !== 'gpu' ? ' aria-current="true"' : ''}>${esc(lang === 'id' ? 'Semua' : 'All')} <small>${fmt(o.produced, lang)}</small></a>${gpuChip}${opts.filter(([k]) => o.facets.series[k]).map(([k]) => `<a href="/${lang}/c/${c}/${k}"${o.series === k && !o.surah ? ' aria-current="true"' : ''}>${esc(seriesLabel(c, k, lang))} <small>${fmt(o.facets.series[k], lang)}</small></a>`).join('')}</nav>` : '';
  const surahs = pub && c === 'quran' && o.facets ? `<details class="surahs"${o.surah ? ' open' : ''}><summary>${esc(lang === 'id' ? 'Telusuri per surah (114)' : 'Browse by surah (114)')}</summary><ol>${Object.keys(o.facets.surah).map(Number).sort((a, b) => a - b).map((n) => `<li><a href="/${lang}/c/quran/surah/${n}"${o.surah === n ? ' aria-current="true"' : ''}>${n}. ${esc(surahInfo(n)[2])} <small>${fmt(o.facets.surah[n], lang)}</small></a></li>`).join('')}</ol></details>` : '';
  // pub: status OpenSea jujur (belum aktif = pratinjau) + rentang edisi & harga per kelangkaan; eksklusif: $1 saja
  const priceRow = pub
    ? `<p class="osstate ${o.live ? 'live' : 'soon'}">${esc(o.live ? t.liveBanner : t.soonBanner)}</p><p class="prices">${BANDS.map((b, i) => `<span class="tr t${i}">${esc(TIER_NAMES[lang][i])} $${fmt(b.price[0], lang)}–$${fmt(b.price.at(-1), lang)} · ${b.supply[0] === b.supply[1] ? b.supply[0] : `${b.supply[1]}–${b.supply[0]}`} ${esc(t.nft.editionOf)}</span>`).join('')}</p>`
    : `<p class="prices"><span class="tr ex">$1 · ${EXCLUSIVE_SUPPLY} ${esc(t.nft.editionOf)} · ${esc(lang === 'id' ? 'koin AXTO' : 'AXTO coin')}</span> <a class="link" href="${altPath('exclusive', lang)}">${esc(t.nav.exclusive)} →</a></p>`;
  const gpuNote = o.maker === 'gpu' && !o.first.items.length ? `<p class="empty">${esc(t.opensea.gpuNone)}</p>` : '';
  const qs = (extra) => new URLSearchParams({ ...(o.tier !== null ? { tier: String(o.tier) } : {}), ...(o.series ? { series: o.series } : {}), view, ...extra }).toString().replace(/&/g, '&amp;');
  return `<section class="page explorer" id="explorer" data-c="${c}" data-lang="${lang}" data-produced="${o.produced}" data-maker="${o.maker === 'gpu' ? 'gpu' : ''}" data-next="${o.first.next ?? ''}" data-from="${o.from}" data-surah="${o.surah || ''}">
  ${crumbs}<h1>${esc(o.seo?.h1 ?? collName(lang, c))}</h1><p class="kindline">${badge(lang, c, true)}</p><p class="lead">${esc(o.seo?.intro ?? t.collections[base][1])}</p>${priceRow}${chips}${exChips}${surahs}${gpuNote}
  <div class="xbar">
    <div class="views" role="group" aria-label="View">${['mosaic', 'gallery', 'list'].map((v, i) => `<button type="button" data-view="${v}"${v === view ? ' aria-pressed="true"' : ' aria-pressed="false"'}>${esc(L.views[i])}</button>`).join('')}</div>
    <label class="jump"><span>${esc(L.jump)}<output>${fmt(o.from, lang)}</output></span><input type="range" min="1" max="${Math.max(1, o.produced)}" step="1" value="${o.from}" aria-label="${esc(L.jump)}"></label>
    <select class="ftier" aria-label="Tier"><option value="">${esc(L.tier)}</option>${TIER_NAMES[lang].map((n, i) => `<option value="${i}"${o.tier === i ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
    ${opts.length ? `<select class="fseries" aria-label="Series"><option value="">${esc(L.series)}</option>${opts.map(([k, en, id]) => `<option value="${esc(k)}"${o.series === k ? ' selected' : ''}>${esc(lang === 'id' ? id : en)}</option>`).join('')}</select>` : ''}
    <span class="meta xcount">${pub ? `${fmt(o.produced, lang)} ${lang === 'id' ? 'karya pilihan dari' : 'picks of'} ${fmt(COLLECTIONS[c].max, lang)}` : `${fmt(o.produced, lang)} ${esc(T[lang].exclusive.works)} × ${EXCLUSIVE_SUPPLY} ${esc(T[lang].exclusive.editions)} · $1`}</span>
  </div>
  <ul class="xgrid v-${view}">${o.first.items.map(tile).join('')}</ul>
  ${o.first.items.length || gpuNote ? '' : `<p class="empty">${esc(L.none)}</p>`}
  <p class="xmore"><a class="btn ghost" href="/${lang}/c/${c}?${qs({ from: String(o.first.next ?? o.from) })}" data-more>${esc(L.more)}</a></p>
  <div class="peek" hidden role="dialog" aria-modal="true" aria-label="${esc(L.peek)}">
    <div class="peek-in"><div class="peek-stage"><iframe title="${esc(L.peek)}" allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin"></iframe><img class="peek-g" alt="" width="768" height="768" hidden></div>
    <p class="peek-name"></p>
    <p class="peek-nav"><button type="button" class="btn" data-peek="prev" aria-label="${esc(L.prev)}">←</button><a class="btn gold" data-peek="detail" href="#">${esc(L.detail)}</a><button type="button" class="btn" data-peek="next" aria-label="${esc(L.next)}">→</button><button type="button" class="btn ghost" data-peek="close" aria-label="${esc(L.close)}">✕</button></p></div>
  </div>
  <script type="application/json" id="x-i18n">${JSON.stringify({ tiers: TIER_NAMES[lang], loading: L.loading, none: o.maker === 'gpu' ? t.opensea.gpuNone : L.none, ex: !pub, cap: EXCLUSIVE_SUPPLY }).replace(/</g, '\\u003c')}</script>
</section>`;
}

/** Kotak beli karya publik: harga tetap & jumlah edisi; tombol ke listing OpenSea bila kontrak sudah aktif. */
function buyBox(lang, c, id, meta, opensea, info) {
  const t = T[lang];
  const tier = meta.attributes.find((a) => a.trait_type === 'Tier')?.value;
  const tierName = TIER_NAMES[lang][TIER_NAMES.en.indexOf(tier)] ?? tier;
  return `<div class="buybox"><p class="price"><span>${esc(t.kind.fixed)}</span><b>$${fmt(info.usd, lang)}</b><small>${lang === 'id' ? `per edisi · ${info.ed} edisi · tingkat ${esc(tierName)} · dibayar ETH di jaringan Base` : `per edition · ${info.ed} editions · ${esc(tierName)} tier · paid in ETH on Base`}</small></p>
  ${opensea ? `<a class="btn gold big" href="${esc(opensea)}" target="_blank" rel="noopener">${esc(t.kind.buy)} ↗</a>` : `<span class="btn ghost big" aria-disabled="true">${esc(t.kind.soon)}</span>`}
  <p class="meta">${esc(opensea ? t.liveBanner : t.soonBanner)} ${lang === 'id' ? 'Royalti 10% untuk axto.io berlaku pada setiap penjualan ulang di marketplace mana pun.' : 'A 10% royalty to axto.io applies to every resale on any marketplace.'}</p></div>`;
}

/** Karya eksklusif: kotak toko ($1/edisi, koin AXTO) + listing pasar member untuk karya ini. */
/** Panggung karya: seri G- yang dibuka dari kartu G- menampilkan lukisan GPU yang SAMA dengan kartunya (pemilik, 23 Nov
 * 2026: „Series G- semuanya dari luar bagus, saat di klik ga bagus dalamnya"); tab untuk berpindah ke animasi asli. */
/** Versi G- di bawah karya: karya G- baru = video animasi buatan GPU; karya G- lama = lukisan GPU aslinya, diam
 * (pemilik 24 Nov 2026: „Series G- yg sudah terlanjur di buat, kembalikan ke gambar aslinya tanpa animasi"). */
function gpuFigure(lang, c, id, meta, info) {
  const al = `${esc(meta.name)} — ${kode(c, id, info.gpuSerial)}`;
  const media = info.gpuAnim
    ? `<video src="/gpu/${c}/${id}.mp4?v=2" poster="/gpu/${c}/${id}.png?v=2" autoplay muted loop playsinline preload="metadata" width="768" height="768" aria-label="${al}"></video>`
    : `<img src="/gpu/${c}/${id}.png?v=2" alt="${al}" width="768" height="768" loading="lazy">`;
  const kata = info.gpuAnim ? (lang === 'id' ? 'Versi GPU — dilukis & dianimasikan GPU dari DNA karya ini' : 'GPU version — painted & animated by GPU from this work’s DNA') : (lang === 'id' ? 'Versi GPU — dilukis GPU dari DNA karya ini' : 'GPU version — painted by GPU from this work’s DNA');
  return `<figure class="gpuv"><a href="?v=g">${media}</a><figcaption><b>${kode(c, id, info.gpuSerial)}</b> · ${esc(kata)}</figcaption></figure>`;
}

function stageHtml(lang, c, id, meta, info) {
  const play = `<iframe src="/play/${c}/${id}" title="${esc(meta.name)}" loading="lazy" allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin"></iframe>`;
  if (!info?.gpuSerial) return `<div class="stage">${play}</div>`;
  const g = Boolean(info.gpuFirst);
  const gl = kode(c, id, info.gpuSerial);
  const tabs = `<nav class="stagetabs" aria-label="${esc(lang === 'id' ? 'Versi karya' : 'Artwork version')}"><a href="?v=g"${g ? ' aria-current="true"' : ''}>${esc(gl)} · ${esc(info.gpuAnim ? (lang === 'id' ? 'Animasi GPU' : 'GPU animation') : (lang === 'id' ? 'Lukisan GPU' : 'GPU painting'))}</a><a href="?v=a"${g ? '' : ' aria-current="true"'}>${esc(lang === 'id' ? 'Animasi asli' : 'Original animation')}</a></nav>`;
  const hidup = `<iframe src="/gplay/${c}/${id}" title="${esc(meta.name)} — ${esc(gl)}" loading="lazy" allow="fullscreen" sandbox="allow-scripts allow-same-origin"></iframe>`;
  return `<div class="stage${g ? ' gstage' : ''}">${g ? hidup : play}</div>${tabs}`;
}

export function nftPage(lang, c, id, meta, attrsId, opensea = '', info = null) {
  if (!COLLECTIONS[c].exclusive) return nftPublicPage(lang, c, id, meta, attrsId, opensea, info);
  const t = T[lang];
  const x = t.exclusive;
  const m = t.market;
  const attrs = lang === 'id' ? attrsId : meta.attributes;
  const rarity = meta.attributes.find((a) => a.trait_type === 'Tier')?.value;
  const st = info.stock;
  const crumbs = `<nav class="crumbs" aria-label="breadcrumb">${info.crumbs.map(([n, h]) => `<a href="${h}">${esc(n)}</a>`).join(' › ')}</nav>`;
  const opts = Array.from({ length: st.left }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
  const lrow = (l) => `<li data-lid="${esc(l.lid)}" data-mode="${esc(l.mode)}" data-left="${l.left}"><b>${esc(m.modes[l.mode] ?? l.mode)}</b> · ${fmt(l.left, lang)} ${esc(m.left)} · ${esc(l.mode === 'auction' ? `${m.top}: ${l.top?.micro ?? '—'} AXTO (${m.start} ${l.start})` : l.mode === 'offer' ? `${m.min}: ${l.min ?? '0,01'} AXTO` : `${m.price}: ${l.price} AXTO`)} · ${esc(m.seller)} ${esc(l.seller)}${l.mode === 'auction' ? ` · ${esc(m.endsIn)} <time data-countdown="${l.endsAt}"></time>` : ''} <span class="mk-act"></span></li>`;
  return `<section class="nft">
  ${stageHtml(lang, c, id, meta, info)}
  <div class="info">
    ${crumbs}
    <p class="kindline">${badge(lang, c, true)}</p>
    <h1>${esc(meta.name)}</h1>
    <p class="meta">${esc(t.nft.rarity)}: ${esc(TIER_NAMES[lang][TIER_NAMES.en.indexOf(rarity)] ?? rarity)} · ${EXCLUSIVE_SUPPLY} ${esc(t.nft.editionOf)}</p>
    ${info.gpuSerial && !info.gpuFirst ? gpuFigure(lang, c, id, meta, info) : ''}
    <div class="buybox shopbox" data-mk="shop" data-c="${c}" data-id="${id}" data-left="${st.left}">
      <p class="price"><span>${esc(x.price)}</span><b>$1</b><small>${esc(info.priceCoins)} AXTO · ${esc(x.left)}: ${st.left}/${EXCLUSIVE_SUPPLY}</small></p>
      ${st.left > 0 ? `<p class="bidrow"><label>${esc(x.qty)} <select name="qty">${opts}</select></label> <button class="btn gold big" type="button" data-mk-buy>${esc(x.buy)}</button></p>` : `<p class="status">${esc(x.soldOut)}</p>`}
      <p class="mk-msg" role="status"></p>
      <p class="meta">${esc(x.custody)} <a class="link" href="${altPath('coin', lang)}#beli-koin">${esc(x.needCoins)} →</a></p>
    </div>
    <section id="pasar" class="mk-list" data-mk="listings"><h2>${esc(m.title)}</h2>
      ${info.listings.length ? `<ul>${info.listings.map(lrow).join('')}</ul>` : `<p class="muted">${esc(lang === 'id' ? 'Belum ada member yang menjual karya ini.' : 'No member is selling this work yet.')}</p>`}
    </section>
    <h2>${esc(t.nft.traits)}</h2>
    <dl class="traits">${attrs.map((a) => `<div><dt>${esc(a.trait_type)}</dt><dd>${esc(a.value)}</dd></div>`).join('')}</dl>
    <p><a class="link" href="/play/${c}/${id}" target="_blank" rel="noopener">${esc(t.nft.play)} ↗</a> · <a class="link" href="${altPath('verify', lang, `/${c}/${id}`)}">${esc(t.nft.certificate)}</a></p>
    <p class="desc">${esc(meta.description).replace(/\n/g, '<br>')}</p>
  </div></section>
  <script type="application/json" id="mk-i18n">${JSON.stringify({ modes: m.modes, buy: m.buy, bid: m.bid, offer: m.offer }).replace(/</g, '\\u003c')}</script>`;
}

function nftPublicPage(lang, c, id, meta, attrs, opensea, info) {
  const t = T[lang];
  const rarity = meta.attributes.find((a) => a.trait_type === 'Tier')?.value;
  const crumbs = `<nav class="crumbs" aria-label="breadcrumb">${info.crumbs.map(([n, h]) => `<a href="${h}">${esc(n)}</a>`).join(' › ')}</nav>`;
  const rel = info.related.length ? `<h2>${esc(lang === 'id' ? 'Karya lain di galeri ini' : 'More from this gallery')}</h2><ul class="lots rel">${info.related.map((it) => `<li><a href="${nftPath(lang, c, it.id)}"><img src="${img(c, it.id)}" alt="${esc(it.name)}" loading="lazy" width="300" height="300"><span class="id">#${fmt(it.id, lang)}</span><span class="pr">$${fmt(it.usd, lang)}</span></a></li>`).join('')}</ul>` : '';
  return `<section class="nft">
  ${stageHtml(lang, c, id, meta, info)}
  <div class="info">
    ${crumbs}
    <p class="kindline">${badge(lang, c, true)}</p>
    <h1>${esc(meta.name)}</h1>
    <p class="meta">${esc(t.nft.rarity)}: ${esc(TIER_NAMES[lang][TIER_NAMES.en.indexOf(rarity)] ?? rarity)} · ${info.ed} ${esc(t.nft.editionOf)} · ${lang === 'id' ? 'Galeri' : 'Gallery'}: <a class="link" href="${info.galleryHref}">${esc(info.galleryName)}</a></p>
    ${info.gpuSerial && !info.gpuFirst ? gpuFigure(lang, c, id, meta, info) : ''}
    ${buyBox(lang, c, id, meta, opensea, info)}
    <h2>${esc(t.nft.traits)}</h2>
    <dl class="traits">${attrs.map((a) => `<div><dt>${esc(a.trait_type)}</dt><dd>${esc(a.value)}</dd></div>`).join('')}</dl>
    <p><a class="link" href="/play/${c}/${id}" target="_blank" rel="noopener">${esc(t.nft.play)} ↗</a> · <a class="link" href="${altPath('verify', lang, `/${c}/${id}`)}">${esc(t.nft.certificate)}</a>${opensea ? ` · <a class="link" href="${esc(opensea)}" target="_blank" rel="noopener">${esc(t.kind.opensea)} ↗</a>` : ''}</p>
    <p class="desc">${esc(info.desc ?? meta.description).replace(/\n/g, '<br>')}</p>
    ${rel}
  </div></section>`;
}

/** 3. Marketplace OpenSea: koleksi publik, galeri & seri, filter karya GPU (G-), status OpenSea jujur. */
export function openseaPage(lang, facets, seo, live, gpu = {}) {
  const t = T[lang];
  const sec = (c) => {
    const f = facets[c];
    const total = Object.values(f.series).reduce((a, b) => a + b, 0);
    return `<section class="hubsec"><h2><a href="/${lang}/c/${c}">${esc(collName(lang, c))}</a> <small>${fmt(total, lang)}</small></h2><p>${esc(t.collections[c][1])}</p>
    <ul class="chips">${c === 'model' ? '' : `<li><a class="gchip" href="/${lang}/c/${c}?maker=gpu">${esc(t.opensea.gpu)} <small>${fmt(gpu[c] ?? 0, lang)}</small></a></li>`}${seriesOptions(c).filter(([k]) => f.series[k]).map(([k]) => `<li><a href="/${lang}/c/${c}/${k}">${esc(seriesLabel(c, k, lang))} <small>${fmt(f.series[k], lang)}</small></a></li>`).join('')}</ul>
    ${c === 'quran' ? `<details class="surahs"><summary>${esc(lang === 'id' ? 'Per surah' : 'By surah')}</summary><ol>${Object.keys(f.surah).map(Number).sort((a, b) => a - b).map((n) => `<li><a href="/${lang}/c/quran/surah/${n}">${n}. ${esc(surahInfo(n)[2])} <small>${fmt(f.surah[n], lang)}</small></a></li>`).join('')}</ol></details>` : ''}</section>`;
  };
  return `<section class="page hub"><nav class="crumbs"><a href="/${lang}">${esc(BREAD[lang].home)}</a> › <span aria-current="page">${esc(BREAD[lang].hub)}</span></nav><h1>${esc(seo.h1)}</h1>
  <p class="kindline">${badge(lang, 'time', true)}</p><p class="lead">${esc(t.opensea.lead)}</p>
  <p class="osstate ${live ? 'live' : 'soon'}">${esc(live ? t.liveBanner : t.soonBanner)}</p>
  ${tierTable(lang)}
  ${PUBLIC.map(sec).join('')}</section>`;
}

export function coinPage(lang, sale, paypalOn, a = {}) {
  const t = T[lang].coin;
  const id = lang === 'id';
  // logo per baris alokasi (#51): presale & perusahaan = AXTO Coin, listing DEX = AXTO Vesting, cadangan 5 tahun = AXTO Hold
  const LOGO = ['coin', 'vesting', 'hold', 'coin'];
  const logo = (k, sz = 64, cls = '') => `<img src="/brand/axto-${k}-${sz}.png" alt="AXTO ${k === 'coin' ? 'Coin' : k === 'vesting' ? 'Vesting' : 'Hold'}" width="${sz}" height="${sz}" loading="lazy" class="${cls}">`;
  return `<section class="page coin"><div class="coinhead">${logo('coin', 256, 'coinlogo')}<div><h1>${esc(t.title)}</h1><p class="meta">${id ? 'Token AXTO di jaringan Base · simbol AXTO · 18 desimal' : 'AXTO token on the Base network · symbol AXTO · 18 decimals'}</p></div></div>
  <dl class="counters"><div><dt>${esc(t.supply)}</dt><dd>${fmt(100_000_000, lang)}</dd></div><div><dt>${esc(t.price)}</dt><dd>$10</dd></div><div><dt>${esc(t.sold)}</dt><dd>${fmt(sale?.sold, lang)} / ${fmt(20_000_000, lang)}</dd></div></dl>
  <table class="split alloc"><tbody>${t.split.map(([x, y], i) => `<tr><th>${logo(LOGO[i] ?? 'coin', 64)}<span>${esc(x)}</span></th><td>${esc(y)}</td></tr>`).join('')}</tbody></table>
  <section class="np" id="beli-koin"><h2>${id ? 'Beli koin AXTO dengan kripto' : 'Buy AXTO coins with crypto'}</h2>
  <p class="lead">${id ? 'USDT (TRON), USDC (BSC), Bitcoin atau BNB (BSC) — diproses otomatis oleh NOWPayments. Koin masuk ke saldo Anda begitu pembayaran selesai; pencairan hanya ke alamat & mata uang yang Anda pakai membeli.' : 'USDT (TRON), USDC (BSC), Bitcoin or BNB (BSC) — processed automatically by NOWPayments. Coins reach your balance as soon as the payment finishes; cash-outs go only to the address & currency you bought with.'}</p>
  <div data-np="buy"><p class="muted">…</p></div>
  <p><button class="btn ghost" type="button" data-watch-axto>${id ? 'Tambahkan AXTO ke wallet' : 'Add AXTO to wallet'}</button></p></section>
  <section class="np-buyback"><img src="/brand/axto-buyback-256.png" alt="AXTO Coin Buyback" width="128" height="128" loading="lazy"><div><h2>AXTO Coin Buyback</h2>
  <p>${id ? 'Koin AXTO bisa Anda jual kembali ke axto.io kapan saja dari Portal member. Pembayaran otomatis lewat NOWPayments ke alamat & mata uang yang Anda pakai saat membeli; sebelum koin dirilis ke DEX nilainya dipotong 50%. Koin yang dibeli kembali masuk ke wallet buyback axto.io — tidak kembali ke stok presale.' : 'You can sell AXTO coins back to axto.io at any time from the Member portal. Payment is automatic through NOWPayments to the address & currency you bought with; before the coin is released to a DEX the value is reduced by 50%. Coins bought back go to the axto.io buyback wallet — they never return to the presale stock.'}</p></div></section>
  ${coinWalletBox(lang, a)}
  ${coinGuide(lang, a)}
  <p class="disclaimer">${esc(t.disclaimer)}</p></section>`;
}

/** Panduan manual menampilkan koin AXTO di wallet (perintah pemilik #51). Satu bahasa per halaman. */
export const COIN_GUIDE = {
  id: {
    title: 'Cara menampilkan koin AXTO di wallet Anda',
    lead: 'Koin AXTO hidup di jaringan Base. Wallet tidak menampilkannya otomatis — tambahkan sekali saja dengan data di bawah, saldo AXTO Anda langsung terlihat.',
    data: 'Data yang diperlukan',
    rows: [['Jaringan', 'Base'], ['Chain ID', '8453'], ['RPC', 'https://mainnet.base.org'], ['Penjelajah blok', 'https://basescan.org'], ['Simbol', 'AXTO'], ['Desimal', '18']],
    contract: 'Alamat kontrak token',
    pending: 'tampil di sini begitu kontrak aktif',
    auto: 'Cara tercepat: tekan tombol „Tambahkan AXTO ke wallet" di atas dari browser wallet Anda — AXTO beserta logonya langsung masuk.',
    wallets: [
      ['MetaMask', ['Buka MetaMask, pilih jaringan Base (bila belum ada: Pengaturan → Jaringan → Tambah jaringan → Base).', 'Di tab Token, ketuk „Impor token" → „Token kustom".', 'Tempel alamat kontrak AXTO. Simbol AXTO dan desimal 18 terisi otomatis.', 'Ketuk „Berikutnya" → „Impor". AXTO tampil di daftar token.']],
      ['Trust Wallet', ['Ketuk ikon pengaturan di halaman utama → „Tambah token kustom".', 'Pilih jaringan Base.', 'Tempel alamat kontrak AXTO; isi Nama „AXTO Coin", Simbol „AXTO", Desimal „18".', 'Ketuk „Simpan". AXTO tampil di halaman utama.']],
      ['Coinbase Wallet', ['Buka tab Aset → „Kelola" → „Tambah token kustom".', 'Pilih jaringan Base.', 'Tempel alamat kontrak AXTO, lalu ketuk „Tambah".']],
      ['OKX Wallet, Bitget Wallet & wallet lain', ['Cari menu „Tambah token" / „Impor token" / „Token kustom".', 'Pilih jaringan Base (Chain ID 8453).', 'Tempel alamat kontrak AXTO, pastikan simbol AXTO dan desimal 18, lalu simpan.']],
    ],
    warn: 'Waspada token palsu: siapa pun bisa membuat token bernama AXTO. Pakai HANYA alamat kontrak yang tertera di halaman resmi axto.io ini.',
    copy: 'Salin',
  },
  en: {
    title: 'How to show the AXTO coin in your wallet',
    lead: 'The AXTO coin lives on the Base network. Wallets do not show it automatically — add it once with the details below and your AXTO balance appears.',
    data: 'Details you need',
    rows: [['Network', 'Base'], ['Chain ID', '8453'], ['RPC', 'https://mainnet.base.org'], ['Block explorer', 'https://basescan.org'], ['Symbol', 'AXTO'], ['Decimals', '18']],
    contract: 'Token contract address',
    pending: 'shown here once the contract is live',
    auto: 'Fastest way: press "Add AXTO to wallet" above from your wallet browser — AXTO and its logo are added instantly.',
    wallets: [
      ['MetaMask', ['Open MetaMask and select the Base network (if missing: Settings → Networks → Add network → Base).', 'On the Tokens tab, tap "Import tokens" → "Custom token".', 'Paste the AXTO contract address. Symbol AXTO and 18 decimals fill in automatically.', 'Tap "Next" → "Import". AXTO appears in your token list.']],
      ['Trust Wallet', ['Tap the settings icon on the home screen → "Add custom token".', 'Choose the Base network.', 'Paste the AXTO contract address; enter Name "AXTO Coin", Symbol "AXTO", Decimals "18".', 'Tap "Save". AXTO appears on your home screen.']],
      ['Coinbase Wallet', ['Open the Assets tab → "Manage" → "Add custom token".', 'Choose the Base network.', 'Paste the AXTO contract address and tap "Add".']],
      ['OKX Wallet, Bitget Wallet & other wallets', ['Look for "Add token" / "Import token" / "Custom token".', 'Choose the Base network (Chain ID 8453).', 'Paste the AXTO contract address, check symbol AXTO and 18 decimals, then save.']],
    ],
    warn: 'Beware of fake tokens: anyone can create a token called AXTO. Use ONLY the contract address shown on this official axto.io page.',
    copy: 'Copy',
  },
};

function coinGuide(lang, a) {
  const g = COIN_GUIDE[lang] ?? COIN_GUIDE.en;
  const val = (v) => `<code>${esc(v)}</code> <button class="btn ghost sm" type="button" data-copy="${esc(v)}">${esc(g.copy)}</button>`;
  return `<section class="coin-guide" id="panduan-wallet"><h2>${esc(g.title)}</h2><p class="lead">${esc(g.lead)}</p>
  <h3>${esc(g.data)}</h3><table class="split cw"><tbody>${g.rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${val(v)}</td></tr>`).join('')}<tr><th>${esc(g.contract)}</th><td>${a.token ? val(a.token) : `<span class="muted">${esc(g.pending)}</span>`}</td></tr></tbody></table>
  <p class="ok">${esc(g.auto)}</p>
  <div class="wguide">${g.wallets.map(([w, steps]) => `<details><summary>${esc(w)}</summary><ol>${steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></details>`).join('')}</div>
  <p class="warn">${esc(g.warn)}</p></section>`;
}

/** JSON-LD HowTo untuk panduan wallet (SEO). */
export function coinGuideJsonLd(lang, base) {
  const g = COIN_GUIDE[lang] ?? COIN_GUIDE.en;
  return { '@context': 'https://schema.org', '@type': 'HowTo', name: g.title, description: g.lead, image: `${base}/brand/axto-coin-512.png`, step: g.wallets[0][1].map((x, i) => ({ '@type': 'HowToStep', position: i + 1, text: x })) };
}

/** Kotak wallet publik (perintah pemilik #43 „jgn bongkar rahasia perusahaan"): HANYA dua alamat kontrak yang dibutuhkan
 *  pembeli — kontrak token (impor ke wallet) dan kontrak beli (kirim ETH = beli). Wallet internal perusahaan (bank,
 *  presale, vesting, hold, treasury) beserta saldonya hanya tampil di Portal admin. */
function coinWalletBox(lang, a) {
  const id = lang === 'id';
  if (!a.token) return `<p class="muted">${id ? 'Alamat kontrak koin tampil di sini begitu kontrak aktif.' : 'The coin contract address appears here once the contract is live.'}</p>`;
  const row = (label, x) => `<tr><th>${esc(label)}</th><td><code>${esc(x)}</code> <button class="btn ghost sm" type="button" data-copy="${esc(x)}">${id ? 'Salin' : 'Copy'}</button></td></tr>`;
  return `<section class="coin-wallet"><h2><img src="/brand/axto-coin-64.png" alt="" width="32" height="32" class="inl"> ${id ? 'Alamat kontrak resmi AXTO' : 'Official AXTO contract addresses'}</h2>
  <p class="meta">${id ? 'Jaringan Base · simbol AXTO · 18 desimal' : 'Base network · symbol AXTO · 18 decimals'}</p>
  <table class="split cw"><tbody>${row(id ? 'Kontrak token (impor manual)' : 'Token contract (manual import)', a.token)}${a.sale ? row(id ? 'Kontrak beli (kirim ETH = beli AXTO $10)' : 'Purchase contract (send ETH = buy AXTO at $10)', a.sale) : ''}</tbody></table></section>`;
}

export function memberPage(lang) {
  const t = T[lang].member;
  const id = lang === 'id';
  return `<section class="page"><h1>${esc(t.title)}</h1><div id="member" data-lang="${lang}"><p>${esc(t.connectFirst)}</p></div>
  <section class="np" data-np="member"></section>
  <section class="mk-portal" data-mk="portal" data-lang="${lang}"><h2>${id ? 'Koleksi eksklusif saya' : 'My exclusive collection'}</h2><p class="muted">…</p></section></section>`;
}

export function adminPage(lang, ok) {
  const t = T[lang].admin;
  const id = lang === 'id';
  if (!ok) return `<section class="page"><h1>${esc(t.title)}</h1><p>${esc(t.denied)}</p></section>`;
  return `<section class="page"><h1>${esc(t.title)}</h1>
  <details class="bp" data-mk="blueprint"><summary>${id ? 'Blueprint (rahasia perusahaan — hanya dari R2 privat)' : 'Blueprint (company secret — from private R2 only)'}</summary><pre class="bp-text">…</pre></details>
  <h2>${id ? 'Toko eksklusif & pasar member' : 'Exclusive shop & member market'}</h2>
  <div data-mk="admin" data-lang="${lang}"><p class="muted">…</p></div>
  <h2>${id ? 'Kontrak (deploy otomatis oleh sistem)' : 'Contracts (deployed automatically by the system)'}</h2>
  <p>${id ? 'Sistem mendeploy koin AXTO dan 15 koleksi dari wallet deployer khusus; kepemilikan langsung ke wallet pemilik. 10 koleksi OpenSea (ERC-721): 5 publik + 5 seri G-, masing-masing 10 juta karya — edisi 1 semua karya (100 juta NFT) tercetak ke wallet toko sistem saat deploy, edisi berikutnya (1–10 per karya menurut kelangkaan, harga tetap $1–$10.000) dicetak otomatis saat edisi sebelumnya laku dan dilisting otomatis. 5 koleksi eksklusif (ERC-1155): dijual $1/edisi di axto.io, tercetak saat member WD. Royalti 10% ke treasury ditegakkan di rantai untuk semua koleksi.' : 'The system deploys the AXTO coin and 15 collections from a dedicated deployer wallet; ownership goes straight to the owner wallets. 10 OpenSea collections (ERC-721): 5 public + 5 G- series, 10 million works each — edition 1 of every work (100 million NFTs) is minted to the system store wallet at deploy, later editions (1–10 per work by rarity, fixed $1–$10,000) are minted automatically when the previous one sells and are listed automatically. 5 exclusive collections (ERC-1155): sold at $1/edition on axto.io, minted when members withdraw. A 10% royalty to the treasury is enforced on-chain for every collection.'}</p>
  <div id="deploy" data-lang="${lang}"><p class="muted">…</p></div>
  <section class="np" data-np="admin"><p class="muted">…</p></section></section>`;
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

export { PUBLIC, EXCL, PATHS, collName, TIER_NAMES, tierTable };
