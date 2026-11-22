/** Isi halaman axto.io (server-rendered, dua bahasa manual). */
import { T, PATHS } from './i18n.js';
import { esc, altPath } from './html.js';
import { COLLECTIONS } from '../../engine/src/core.js';

const PUBLIC = ['time', 'stamp', 'quran', 'model'];
const EXCL = ['ex-time', 'ex-stamp', 'ex-quran'];
const fmt = (n, lang) => Number(n ?? 0).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US');
export const money = (units, cur, lang) => (cur === 'USDC' ? `$${(units / 100).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${(units / 1000).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { maximumFractionDigits: 3 })} AXTO`);
const nftPath = (lang, c, id) => `/${lang}/nft/${c}/${id}`;
const collName = (lang, c) => {
  const base = c.replace('ex-', '');
  const n = T[lang].collections[base][0];
  return c.startsWith('ex-') ? `${lang === 'id' ? 'Eksklusif' : 'Exclusive'} · ${n}` : n;
};

/** Banner animatif interaktif: kanvas (orbit, jam hidup, partikel prangko, kaligrafi), mengikuti kursor. */
const BANNER_JS = `
const cv=document.getElementById('hero-canvas');if(cv){const g=cv.getContext('2d');let W,H,mx=.5,my=.5,t0=performance.now();
const R=()=>{const r=cv.getBoundingClientRect();W=cv.width=r.width*devicePixelRatio;H=cv.height=r.height*devicePixelRatio};R();addEventListener('resize',R);
cv.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();mx=(e.clientX-r.left)/r.width;my=(e.clientY-r.top)/r.height});
const stars=Array.from({length:180},()=>({x:Math.random(),y:Math.random(),z:Math.random()*.9+.1}));
const glyph=['ب','س','م','ا','ل','ه','ر','ح','ن','ي'];
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
function frame(now){const t=(now-t0)/1000;g.clearRect(0,0,W,H);
for(const s of stars){const x=((s.x+(mx-.5)*.04*s.z+t*.004*s.z)%1)*W,y=((s.y+(my-.5)*.04*s.z)%1)*H;g.fillStyle='rgba(180,200,255,'+(.25+.6*s.z)+')';g.fillRect(x,y,1.6*s.z*devicePixelRatio,1.6*s.z*devicePixelRatio)}
const cx=W*(.68+(mx-.5)*.05),cy=H*(.5+(my-.5)*.05),r=Math.min(W,H)*.32;
for(let i=0;i<4;i++){g.beginPath();g.ellipse(cx,cy,r*(1+i*.22),r*(.34+i*.08),-.35,0,7);g.strokeStyle='rgba(212,175,55,'+(.35-i*.07)+')';g.lineWidth=devicePixelRatio;g.stroke();
const a=t*(.4-i*.07)+i*1.7;g.beginPath();g.arc(cx+Math.cos(a)*r*(1+i*.22)*Math.cos(-.35)-Math.sin(a)*r*(.34+i*.08)*Math.sin(-.35),cy+Math.cos(a)*r*(1+i*.22)*Math.sin(-.35)+Math.sin(a)*r*(.34+i*.08)*Math.cos(-.35),(4+i)*devicePixelRatio,0,7);g.fillStyle=['#d4af37','#7fb3ff','#e8e8f0','#9be3c4'][i];g.fill()}
const d=new Date(),h=d.getHours()%12,m=d.getMinutes(),s=d.getSeconds()+d.getMilliseconds()/1000;
g.beginPath();g.arc(cx,cy,r*.62,0,7);const gr=g.createRadialGradient(cx-r*.2,cy-r*.2,r*.05,cx,cy,r*.62);gr.addColorStop(0,'#2a3c66');gr.addColorStop(1,'#0e1428');g.fillStyle=gr;g.fill();g.strokeStyle='#d4af37';g.lineWidth=3*devicePixelRatio;g.stroke();
for(let i=0;i<60;i++){const a=i/60*Math.PI*2,l=i%5?.94:.86;g.beginPath();g.moveTo(cx+Math.sin(a)*r*.58,cy-Math.cos(a)*r*.58);g.lineTo(cx+Math.sin(a)*r*.58*l,cy-Math.cos(a)*r*.58*l);g.strokeStyle=i%5?'rgba(255,255,255,.35)':'#d4af37';g.lineWidth=(i%5?1:2.5)*devicePixelRatio;g.stroke()}
const hand=(a,l,w,c)=>{g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.sin(a)*r*l,cy-Math.cos(a)*r*l);g.strokeStyle=c;g.lineWidth=w*devicePixelRatio;g.lineCap='round';g.stroke()};
hand((h+m/60)/12*Math.PI*2,.32,5,'#e8e8f0');hand((m+s/60)/60*Math.PI*2,.46,3.5,'#e8e8f0');hand(s/60*Math.PI*2,.52,1.5,'#d4af37');
g.font=(28*devicePixelRatio)+'px serif';g.textAlign='center';
for(let i=0;i<glyph.length;i++){const a=t*.25+i/glyph.length*Math.PI*2;g.fillStyle='rgba(212,175,55,'+(.35+.35*Math.sin(t+i))+')';g.fillText(glyph[i],cx+Math.cos(a)*r*1.55,cy+Math.sin(a)*r*.62+10)}
if(!still)requestAnimationFrame(frame)}requestAnimationFrame(frame)}
document.querySelectorAll('[data-count]').forEach(el=>{const v=+el.dataset.count;let i=0;const step=()=>{i=Math.min(v,i+Math.ceil(v/40)||1);el.textContent=i.toLocaleString(document.documentElement.lang);if(i<v)requestAnimationFrame(step)};step()});`;

export function home(lang, stats) {
  const t = T[lang];
  const sum = (k) => PUBLIC.concat(EXCL).reduce((n, c) => n + (stats.collections?.[c]?.[k] ?? 0), 0);
  const nextAt = stats.round ? (Date.now() < stats.round.startAt ? stats.round.startAt : stats.round.endAt) : null;
  const body = `
<section class="hero">
  <canvas id="hero-canvas" aria-hidden="true"></canvas>
  <div class="hero-copy">
    <p class="kicker">${esc(t.hero.kicker)}</p>
    <h1>${esc(t.hero.title).replace('\n', '<br>')}</h1>
    <p class="lead">${esc(t.hero.lead)}</p>
    <p class="cta"><a class="btn gold" href="${altPath('auction', lang)}">${esc(t.hero.cta)}</a> <a class="btn ghost" href="${altPath('coin', lang)}">${esc(t.hero.cta2)}</a></p>
    <dl class="counters">
      <div><dt>${esc(t.hero.live)}</dt><dd data-count="${sum('live')}">0</dd></div>
      <div><dt>${esc(t.hero.ready)}</dt><dd data-count="${sum('ready')}">0</dd></div>
      <div><dt>${esc(t.hero.sold)}</dt><dd data-count="${sum('sold')}">0</dd></div>
      ${nextAt ? `<div><dt>${esc(t.hero.next)}</dt><dd><time data-countdown="${nextAt}"></time></dd></div>` : ''}
    </dl>
  </div>
</section>
<section class="grid4">
  <h2>${esc(t.collections.title)}</h2>
  ${PUBLIC.map((c) => `<article class="card">
    <a href="/${lang}/c/${c}"><img src="/img/${c}/${1 + (Date.now() >> 20) % 1000}.svg" alt="${esc(t.collections[c][0])}" loading="lazy" width="400" height="400"></a>
    <h3>${esc(t.collections[c][0])}</h3><p>${esc(t.collections[c][1])}</p>
    <p class="meta">${fmt(COLLECTIONS[c].max, lang)} × 1/1 · ${fmt(stats.collections?.[c]?.produced, lang)} ${lang === 'id' ? 'diproduksi' : 'produced'}</p>
    <a class="link" href="/${lang}/c/${c}">${esc(t.collections.open)} →</a></article>`).join('')}
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
    <img src="/img/${c}/${r.tokenId}.svg" alt="${esc(collName(lang, c))} #${r.tokenId}" loading="lazy" width="300" height="300">
    <span class="id">#${r.tokenId}</span>
    <span class="price">${r.price ? `${esc(t.auction.highest)}: ${money(r.price, cur, lang)}` : `${esc(t.auction.start)}: ${money(r.start ?? 100, cur, lang)}`}</span>
    ${withEnd ? `<time data-countdown="${r.endAt}"></time>` : `<span>${r.bids} ${esc(t.waiting.offers)}</span>`}</a></li>`).join('')}</ul>`;
}

export function auctionPage(lang, c, data, sort, stats) {
  const t = T[lang];
  const all = [...PUBLIC, ...EXCL];
  const tabs = all.map((k) => `<a href="${altPath('auction', lang)}?c=${k}&amp;sort=${sort}"${k === c ? ' aria-current="true"' : ''}>${esc(collName(lang, k))}</a>`).join('');
  const sorts = [['ending', t.auction.sortEnding], ['highest', t.auction.sortHighest], ['lowest', t.auction.sortLowest]].map(([k, l]) => `<a href="${altPath('auction', lang)}?c=${c}&amp;sort=${k}"${k === sort ? ' aria-current="true"' : ''}>${esc(l)}</a>`).join('');
  const empty = !data.rows.length ? `<p class="empty">${esc(t.auction.empty)} ${stats.round ? `<time data-countdown="${stats.round.startAt > Date.now() ? stats.round.startAt : stats.round.endAt}"></time>` : '—'}</p>` : '';
  return `<section class="page"><h1>${esc(t.auction.title)}</h1>
  <nav class="tabs">${tabs}</nav><nav class="tabs small">${sorts}</nav>
  <p class="meta">${fmt(data.total, lang)} ${esc(t.auction.lots)} · ${esc(t.auction.start)}: ${money(100, data.currency, lang)}</p>
  ${empty}${lotGrid(lang, c, data.rows, data.currency, true)}</section>`;
}

export function waitingPage(lang, c, data, order) {
  const t = T[lang];
  const tabs = [...PUBLIC, ...EXCL].map((k) => `<a href="${altPath('waiting', lang)}?c=${k}&amp;order=${order}"${k === c ? ' aria-current="true"' : ''}>${esc(collName(lang, k))}</a>`).join('');
  const ord = [['desc', t.auction.sortHighest], ['asc', t.auction.sortLowest]].map(([k, l]) => `<a href="${altPath('waiting', lang)}?c=${c}&amp;order=${k}"${k === order ? ' aria-current="true"' : ''}>${esc(l)}</a>`).join('');
  return `<section class="page"><h1>${esc(t.waiting.title)}</h1><p class="lead">${esc(t.waiting.lead)}</p>
  <nav class="tabs">${tabs}</nav><nav class="tabs small">${ord}</nav>${lotGrid(lang, c, data.rows, data.currency, false)}</section>`;
}

export function collectionPage(lang, c, page, stats) {
  const per = 48;
  const produced = stats.collections?.[c]?.produced ?? 0;
  const from = (page - 1) * per + 1;
  const to = Math.min(produced, from + per - 1);
  const ids = [];
  for (let i = from; i <= to; i += 1) ids.push(i);
  const base = c.replace('ex-', '');
  const t = T[lang];
  const pages = Math.max(1, Math.ceil(produced / per));
  return `<section class="page"><h1>${esc(collName(lang, c))}</h1><p class="lead">${esc(t.collections[base][1])}</p>
  <p class="meta">${fmt(produced, lang)} / ${fmt(COLLECTIONS[c].max, lang)}</p>
  <ul class="lots">${ids.map((id) => `<li><a href="${nftPath(lang, c, id)}"><img src="/img/${c}/${id}.svg" alt="${esc(collName(lang, c))} #${id}" loading="lazy" width="300" height="300"><span class="id">#${id}</span></a></li>`).join('')}</ul>
  <nav class="pager">${page > 1 ? `<a rel="prev" href="/${lang}/c/${c}?p=${page - 1}">←</a>` : ''}<span>${page} / ${pages}</span>${page < pages ? `<a rel="next" href="/${lang}/c/${c}?p=${page + 1}">→</a>` : ''}</nav></section>`;
}

export function nftPage(lang, c, id, meta, lot, attrsId) {
  const t = T[lang];
  const attrs = lang === 'id' ? attrsId : meta.attributes;
  const live = lot.status === 'live' || lot.status === 'waiting';
  const rarity = meta.attributes.find((a) => a.trait_type === 'Tier')?.value;
  return `<section class="nft">
  <div class="stage"><iframe src="/play/${c}/${id}" title="${esc(meta.name)}" loading="lazy" allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin"></iframe></div>
  <div class="info">
    <h1>${esc(meta.name)}</h1>
    <p class="meta">${esc(t.nft.edition)} · ${esc(t.nft.rarity)}: ${esc(rarity)}</p>
    <div class="bidbox" data-c="${c}" data-id="${id}" data-currency="${lot.currency}" data-status="${lot.status}" data-min-fixed="${lot.minFixed}" data-min-proxy="${lot.minProxy}">
      <p>${esc(t.auction.start)}: <b>${money(lot.start, lot.currency, lang)}</b> · ${esc(t.auction.highest)}: <b>${lot.price ? money(lot.price, lot.currency, lang) : '—'}</b></p>
      ${lot.endAt ? `<p>${esc(t.auction.endsIn)} <time data-countdown="${lot.endAt}"></time></p>` : ''}
      ${live ? `<p class="bidrow"><button class="btn gold" data-bid="auto" type="button">${esc(t.auction.bidAuto)}</button>
        <input type="number" min="0" step="0.01" inputmode="decimal" aria-label="${esc(t.auction.bidMax)}" placeholder="${esc(t.auction.bidMax)}">
        <button class="btn" data-bid="proxy" type="button">${esc(t.auction.bid)}</button></p><p class="bidmsg" role="status"></p>` : `<p class="status">${esc(lot.status)}</p>`}
    </div>
    <h2>${esc(t.nft.traits)}</h2>
    <dl class="traits">${attrs.map((a) => `<div><dt>${esc(a.trait_type)}</dt><dd>${esc(a.value)}</dd></div>`).join('')}</dl>
    <p><a class="link" href="/play/${c}/${id}" target="_blank" rel="noopener">${esc(t.nft.play)} ↗</a> · <a class="link" href="${altPath('verify', lang, `/${c}/${id}`)}">${esc(t.nft.certificate)}</a></p>
    <details><summary>${esc(t.nft.history)} (${lot.bids.length})</summary><ol class="hist">${lot.bids.slice().reverse().map((b) => `<li>${esc(b.bidder.slice(0, 6))}…${esc(b.bidder.slice(-4))} · ${esc(b.kind)} · <time datetime="${new Date(b.at).toISOString()}">${new Date(b.at).toISOString().slice(0, 16).replace('T', ' ')}</time></li>`).join('')}</ol></details>
    <p class="desc">${esc(meta.description).replace(/\n/g, '<br>')}</p>
  </div></section>`;
}

export function exclusivePage(lang, stats) {
  const t = T[lang];
  return `<section class="page"><h1>${esc(t.exclusive.title)}</h1><p class="lead">${esc(t.exclusive.lead)}</p>
  <div class="grid3">${EXCL.map((c) => `<article class="card"><a href="/${lang}/c/${c}"><img src="/img/${c}/1.svg" alt="${esc(collName(lang, c))}" loading="lazy" width="400" height="400"></a>
  <h3>${esc(collName(lang, c))}</h3><p class="meta">${fmt(COLLECTIONS[c].max, lang)} × 1/1 · ${fmt(stats.collections?.[c]?.sold, lang)} ${esc(t.hero.sold)}</p>
  <a class="link" href="${altPath('auction', lang)}?c=${c}">${esc(t.nav.auction)} →</a></article>`).join('')}</div>
  <div id="ex-market" data-lang="${lang}"></div></section>`;
}

export function coinPage(lang, sale, paypalOn) {
  const t = T[lang].coin;
  return `<section class="page coin"><h1>${esc(t.title)}</h1>
  <dl class="counters"><div><dt>${esc(t.supply)}</dt><dd>10.000.000</dd></div><div><dt>${esc(t.price)}</dt><dd>$10</dd></div><div><dt>${esc(t.sold)}</dt><dd>${fmt(sale?.sold, lang)} / 2.000.000</dd></div></dl>
  <table class="split"><tbody>${t.split.map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</tbody></table>
  <div class="buy" id="coin-buy"><label>${lang === 'id' ? 'Jumlah koin' : 'Number of coins'} <input type="number" min="1" max="5000" step="1" value="10" id="coin-n"></label>
  <p>${paypalOn ? `<button class="btn gold" type="button" data-buy="paypal">${esc(t.buyPaypal)}</button>` : `<span class="muted">${esc(t.paypalOff)}</span>`}
  <button class="btn" type="button" data-buy="usdc">${esc(t.buyUsdc)}</button> <button class="btn" type="button" data-buy="eth">${esc(t.buyEth)}</button></p><p class="buymsg" role="status"></p></div>
  <p class="disclaimer">${esc(t.disclaimer)}</p></section>`;
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
  <p class="meta">genesis: ${stats.genesis ? new Date(stats.genesis).toISOString() : '—'}</p><div id="admin" data-lang="${lang}"></div></section>`;
}

export function verifyPage(lang, c, id, meta, hash, owner) {
  const t = T[lang].verify;
  return `<section class="page"><h1>${esc(t.title)}</h1><p class="ok">✓ ${esc(t.ok)}</p>
  <h2>${esc(meta.name)}</h2><p><img src="/img/${c}/${id}.svg" alt="" width="320" height="320"></p>
  <dl class="traits"><div><dt>${esc(t.hash)}</dt><dd><code>${esc(hash)}</code></dd></div><div><dt>${esc(T[lang].nft.owner)}</dt><dd>${owner ? `<code>${esc(owner)}</code>` : '—'}</dd></div></dl></section>`;
}

export function notFound(lang) {
  const t = T[lang].errors;
  return `<section class="page"><h1>404 — ${esc(t.notFound)}</h1><p><a class="btn" href="/${lang}">${esc(t.back)}</a></p></section>`;
}

export { PUBLIC, EXCL, PATHS, collName };
