/**
 * Metadata token (standar OpenSea) + konteks render. Semua deterministik dari dna().
 */
import { collection, START_USD, OPENSEA_PRICE_USD } from './core.js';
import { dna, traitNameId } from './dna.js';
import { SURAH, juzStart, pageStart, globalFromAyah, ayahFromGlobal } from './catalog/quran.js';
import { timeSvg, timePlayer, TIME_ANIM_CSS } from './render/time.js';
import { stampSvg, stampPlayer, ANIM_CSS as STAMP_ANIM_CSS } from './render/stamp.js';
import { quranSvg, quranPlayer } from './render/quran.js';
import { modelSvg, modelPlayer } from './render/model.js';
import { modelTraits } from './catalog/model.js';
import * as MODEL_PARTS from './catalog/model.js';
import { hadithSvg, hadithPlayer, hadithRef } from './render/hadith.js';
import { edition as editionOf } from './editions.js';
import { HADITH_KITAB } from './catalog/hadith.js';
import { applyMotion } from './render/motion.js';

/** Seri koleksi TIME = kategori bentuk (untuk saringan OpenSea & penjelajah). [id, EN, ID] */
export const TIME_SERIES = [['wrist', 'Wristwear', 'Jam Tangan'], ['body', 'Jewelry & Wearables', 'Perhiasan'], ['bag', 'Bags & Charms', 'Tas & Charm'], ['apparel', 'Apparel', 'Busana'], ['home', 'Home', 'Rumah'], ['vehicle', 'Vehicle', 'Kendaraan'], ['public', 'Public Spaces', 'Ruang Publik'], ['digital', 'Digital Screens', 'Layar Digital'], ['novel', 'Novelty', 'Unik']];
const TIME_SERIES_NAME = Object.fromEntries(TIME_SERIES.map((x) => [x[0], x[1]]));
const QURAN_SERIES_NAME = { ayah: 'Ayah', page: 'Mushaf Page', juz: 'Juz', mushaf: 'Complete Mushaf' };
const GALLERY_KIND = { time: 'Time', stamp: 'Stamps', quran: "Qur'an", model: 'Models', hadith: 'Hadith' };

/** Nama seri (EN) sebuah token — dipakai sifat „Series" & „Gallery" agar NFT tersusun rapi dan mudah dicari di OpenSea. */
export function seriesName(d) {
  if (d.kind === 'time') return TIME_SERIES_NAME[d.pick[0][4]] ?? 'Other';
  if (d.kind === 'quran') return QURAN_SERIES_NAME[d.series.series];
  if (d.kind === 'hadith') return hadithRef(d).nameEn;
  return d.pick[1][1];
}

const KIND_NAME = { time: 'AXTO Time', stamp: 'AXTO Stamps', quran: 'AXTO Quran Calligraphy', model: 'AXTO Models', hadith: 'AXTO Hadith Calligraphy' };
const KIND_NAME_ID = { time: 'AXTO Jam', stamp: 'AXTO Prangko', quran: 'AXTO Kaligrafi Al-Qur\'an', model: 'AXTO Model', hadith: 'AXTO Kaligrafi Hadits' };

const parseRef = (r) => r.split(':').map(Number);
/** Halaman mushaf tempat ayat (surah, ayah) berada. */
export function pageOf(surah, ayah) {
  const g = globalFromAyah(surah, ayah);
  let lo = 1;
  let hi = 604;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const [s, a] = parseRef(pageStart(mid));
    if (globalFromAyah(s, a) <= g) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Rujukan Al-Qur'an untuk token QURAN (tanpa teks). */
export function quranRef(d) {
  const { series, unit } = d.series;
  if (series === 'ayah') {
    const [surah, ayah] = ayahFromGlobal(unit);
    const s = SURAH[surah - 1];
    return { series, surah, ayah, surahAr: s[1], surahLt: s[2], surahEn: s[3], surahId: s[4], page: pageOf(surah, ayah) };
  }
  if (series === 'page') {
    const page = unit + 1;
    const [s1, a1] = parseRef(pageStart(page));
    return { series, page, surah: s1, ayah: a1, surahLt: SURAH[s1 - 1][2], juz: juzOf(s1, a1), pages: [page] };
  }
  if (series === 'juz') {
    const juz = unit + 1;
    const [s1, a1] = parseRef(juzStart(juz));
    const p1 = pageOf(s1, a1);
    const p2 = juz < 30 ? pageOf(...parseRef(juzStart(juz + 1))) - 1 : 604;
    return { series, juz, surah: s1, ayah: a1, surahLt: SURAH[s1 - 1][2], pages: range(p1, p2) };
  }
  return { series, pages: range(1, 604) };
}

function juzOf(surah, ayah) {
  const g = globalFromAyah(surah, ayah);
  let j = 1;
  for (let k = 1; k <= 30; k += 1) {
    const [s, a] = parseRef(juzStart(k));
    if (globalFromAyah(s, a) <= g) j = k;
  }
  return j;
}

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/**
 * Lengkapi konteks render. provider: {ayah(s,a) → {ar,tr,lt}, page(p) → {baris}} (async).
 * Untuk koleksi lain mengembalikan objek kosong / head model.
 */
export async function renderCtx(d, provider = {}) {
  if (d.kind === 'quran') {
    const ref = quranRef(d);
    const ctx = { ...ref };
    if (ref.series === 'ayah' || ref.series === 'juz') {
      const t = await provider.ayah(ref.surah, ref.ayah);
      ctx.ar = t.ar;
      ctx.tr = t.tr;
    }
    if (ref.series === 'page') {
      const pg = await provider.page(ref.page);
      ctx.lines = pg.baris.filter((b) => b.t === 'b').map((b) => b.k.map((w) => w[0]).join(' '));
    }
    return ctx;
  }
  if (d.kind === 'hadith' && provider.hadith) {
    const r = hadithRef(d);
    return (await provider.hadith(r.key, r.number)) ?? {};
  }
  if (d.kind === 'model' && provider.head) {
    const p = d.pick[0][5];
    const href = await provider.head(d.pick[0][4], p[1]);
    return href ? { head: { href, ar: p[2], cx: p[3], chin: p[4] } } : {};
  }
  return {};
}

export function title(d, ref) {
  const id = `#${d.tokenId.toLocaleString('en-US')}`;
  const ex = d.exclusive ? 'Exclusive ' : '';
  const p = d.pick;
  switch (d.kind) {
    case 'time': return `${ex}AXTO Time ${id} — ${p[1][1]} ${p[0][1]}`;
    case 'stamp': return `${ex}${p[0][1]} · ${p[1][1]} ${p[6][4]} ${id}`;
    case 'model': { const m = modelTraits(d); return `${ex}AXTO Model ${id} — ${m[1]} · ${m[2]}`; }
    case 'hadith': { const r = hadithRef(d); return `${ex}Hadith ${r.nameEn} ${r.number} — ${p[0][1]} ${id}`; }
    case 'quran': {
      const r = ref ?? quranRef(d);
      if (r.series === 'ayah') return `${ex}Quran ${r.surahLt} ${r.surah}:${r.ayah} — ${p[0][1]} ${id}`;
      if (r.series === 'page') return `${ex}Mushaf Uthmani Page ${r.page} — ${p[0][1]} ${id}`;
      if (r.series === 'juz') return `${ex}Quran Juz ${r.juz} — ${p[0][1]} ${id}`;
      return `${ex}The Complete Quran Mushaf — ${p[2][1]} ${id}`;
    }
    default: return id;
  }
}

function description(d, ref, base) {
  const c = collection(d.key);
  const cert = `${base}/en/verifikasi/${d.key}/${d.tokenId}`;
  const ed = editionOf(d.key, d.tokenId);
  const edition = `Limited edition of ${ed.supply}`;
  const en = {
    time: 'A living digital clock — it shows the real time wherever it is displayed. Choose your time zone in the player.',
    stamp: 'A digital postage stamp from an imaginary realm, engraved in vector so every detail stays sharp at any zoom.',
    quran: 'Quranic calligraphy artwork in 3D motion with a recitation by the reciter of your choice and word-by-word highlighting. The text is reproduced unaltered from the Uthmani Hafs mushaf (KFGQPC, CC BY 4.0). This token represents the artwork and the collectible — not any right over the verses of the Qur\'an.',
    model: 'An animated figure artwork from the AXTO model series, created with the model\'s written permission.',
    hadith: 'Hadith calligraphy artwork in motion. The Arabic text is reproduced unaltered from the hadith collection named below and can be read aloud with an Arabic voice; the translation follows your language and country. References use international hadith numbering. This token represents the artwork and the collectible — not any right over the hadith.',
  }[d.kind];
  const id = {
    time: 'Jam digital hidup — menampilkan waktu nyata di mana pun ditampilkan. Pilih zona waktu di player.',
    stamp: 'Prangko digital dari negeri imajiner, diukir vektor sehingga setiap detail tetap tajam saat di-zoom.',
    quran: 'Karya kaligrafi Al-Qur\'an bergerak 3D dengan bacaan qari pilihan dan penunjuk tiap kata. Teks disalin tanpa perubahan dari mushaf Utsmani Hafs (KFGQPC, CC BY 4.0). Token ini mewakili karya seni dan koleksinya, bukan hak atas ayat Al-Qur\'an.',
    model: 'Karya figur beranimasi dari seri model AXTO, dibuat dengan izin tertulis model.',
    hadith: 'Karya kaligrafi hadits bergerak. Teks Arab disalin tanpa perubahan dari kitab hadits di bawah dan bisa dibacakan dengan suara Arab; terjemahan mengikuti bahasa & negara Anda. Rujukan memakai penomoran hadits internasional. Token ini mewakili karya seni dan koleksinya, bukan hak atas hadits.',
  }[d.kind];
  const only = c.exclusive ? '\n\nExclusive edition — first sold only at axto.io ($1, AXTO coin), made to be gifted and shared; once withdrawn it can be traded anywhere with a 10% royalty. / Edisi eksklusif — pertama kali hanya dijual di axto.io ($1, koin AXTO), cocok untuk hadiah & berbagi; setelah ditarik (WD) bisa diperdagangkan di mana pun dengan royalti 10%.' : '';
  const hr = d.kind === 'hadith' ? hadithRef(d) : null;
  const hadithLine = hr ? `\n\nReference: ${hr.nameEn} (${hr.nameAr}) — Hadith No. ${hr.number}${hr.book ? ` · Book ${hr.book.no}: ${hr.book.name}` : ''} · ${hr.author}` : '';
  const sale = c.exclusive ? 'Fixed price $1 at axto.io (AXTO coin) / Harga tetap $1 di axto.io (koin AXTO)' : `Fixed price $${ed.priceUsd} on OpenSea / Harga tetap $${ed.priceUsd} di OpenSea`;
  if (d.kind === 'hadith') return `${en}${hadithLine}${c.exclusive ? '\n\nExclusive edition — first sold only at axto.io ($1, AXTO coin), made to be gifted and shared; once withdrawn it can be traded anywhere with a 10% royalty.' : ''}\n\nGallery: ${GALLERY_KIND[d.kind]} · ${seriesName(d)} · ${edition} · Rarity: ${d.tier.name} · ${c.exclusive ? 'Fixed price $1 at axto.io (AXTO coin)' : `Fixed price $${ed.priceUsd} on OpenSea`} · Certificate: ${cert}\n\n© AXTO (axto.io). The owner may display the artwork for personal and promotional use; copyright of the artwork remains with AXTO. Resale royalty 10%.`;
  return `${en}\n\n${id}${only}\n\nGallery: ${GALLERY_KIND[d.kind]} · ${seriesName(d)} · ${edition} · Rarity: ${d.tier.name} · ${sale} · Certificate: ${cert}\n\n© AXTO (axto.io). The owner may display the artwork for personal and promotional use; copyright of the artwork remains with AXTO. Resale royalty 10%.`;
}

/** Metadata ERC-721 untuk tokenURI. */
export function metadata(key, tokenId, base = 'https://axto.io') {
  const d = dna(key, tokenId);
  const c = collection(key);
  const ref = d.kind === 'quran' ? quranRef(d) : null;
  const mt = d.kind === 'model' ? modelTraits(d) : null;
  const attrs = d.pick.map((o, i) => ({ trait_type: d.names[i], value: mt ? (mt[i] ?? o[1]) : d.kind === 'stamp' && d.names[i] === 'Subject' ? d.pick[1][4][o[4]] : o[1] }));
  // Galeri & seri (perintah pemilik #44): setiap NFT punya „Gallery" dan „Series" → saringan rapi di OpenSea & axto.io
  const sname = seriesName(d);
  if (d.kind === 'time' || d.kind === 'hadith') attrs.unshift({ trait_type: 'Series', value: sname });
  if (d.kind === 'hadith') {
    const r = hadithRef(d);
    attrs.push({ trait_type: 'Kitab', value: `${r.nameEn} · ${r.nameAr}` }, { display_type: 'number', trait_type: 'Hadith Number', value: r.number });
    if (r.book) attrs.push({ trait_type: 'Book', value: `${r.book.no}. ${r.book.name}` });
  }
  attrs.unshift({ trait_type: 'Gallery', value: `${c.exclusive ? 'Exclusive ' : ''}${GALLERY_KIND[d.kind]} · ${sname}` });
  if (ref) {
    attrs.splice(1, 0, { trait_type: 'Series', value: sname });
    if (ref.series === 'ayah') attrs.push({ trait_type: 'Surah', value: `${ref.surah}. ${ref.surahLt}` }, { display_type: 'number', trait_type: 'Ayah', value: ref.ayah }, { display_type: 'number', trait_type: 'Page', value: ref.page });
    if (ref.series === 'page') attrs.push({ display_type: 'number', trait_type: 'Page', value: ref.page }, { display_type: 'number', trait_type: 'Juz', value: ref.juz });
    if (ref.series === 'juz') attrs.push({ display_type: 'number', trait_type: 'Juz', value: ref.juz });
  }
  attrs.push(
    { trait_type: 'Tier', value: d.tier.name },
    { trait_type: 'Price (USD)', value: String(editionOf(key, tokenId).priceUsd) },
    { display_type: 'number', trait_type: 'Edition Size', value: editionOf(key, tokenId).supply },
    { trait_type: 'Collection', value: c.exclusive ? 'Exclusive' : 'Public' },
    { display_type: 'number', trait_type: 'Uniqueness Score', value: d.score },
  );
  return {
    name: title(d, ref),
    description: description(d, ref, base),
    image: `${base}/img/${key}/${tokenId}.svg`,
    animation_url: `${base}/play/${key}/${tokenId}`,
    external_url: `${base}/en/nft/${key}/${tokenId}`,
    background_color: '0b0b10',
    attributes: attrs,
  };
}

/** Label ID untuk tampilan situs. */
export function attributesId(m) {
  return m.attributes.map((a) => ({ ...a, trait_type: traitNameId(a.trait_type) }));
}

export function contractMetadata(key, base = 'https://axto.io') {
  const c = collection(key);
  const name = `${c.exclusive ? 'AXTO Exclusive — ' : ''}${KIND_NAME[c.kind]}`;
  return {
    name,
    description: `${name}: ${c.max.toLocaleString('en-US')} unique living artworks by AXTO. Every design is generated from a mathematically unique DNA — no duplicate designs, never reprinted — and issued as a limited edition of ${c.exclusive ? '10' : '1 to 10 (the rarer, the fewer)'}. ${c.exclusive ? 'Exclusive edition: fixed price $1 at axto.io in AXTO coin — a meaningful gift, easy to share with a whole community; members resell at axto.io by auction, offer or fixed price, and withdraw to their wallets one by one or in bulk.' : `Browse by Gallery and Series${seriesOptions(key).length ? ` (${seriesOptions(key).map((x) => x[1]).join(', ')})` : ''}. Fixed price by rarity, from $1 (Classic) to $10,000 (Masterpiece).`} / ${KIND_NAME_ID[c.kind]}: ${c.max.toLocaleString('id-ID')} karya unik, edisi terbatas ${c.exclusive ? '10 per karya, harga tetap $1 di axto.io (koin AXTO).' : '1–10 per karya, harga tetap $1–$10.000 menurut kelangkaan; telusuri per Galeri & Seri.'}`,
    image: `${base}/logo-512.png`,
    banner_image: `${base}/og/${key}.svg`,
    external_link: `${base}/en/c/${key}`,
    seller_fee_basis_points: 1000,
    fee_recipient: '0xDC39C04E704b1fec2BE648c49c842B2B17AfEBDA',
  };
}

/** Render image SVG. */
export function renderSvg(d, ctx) {
  switch (d.kind) {
    case 'time': return timeSvg(d);
    case 'stamp': return stampSvg(d);
    case 'quran': return quranSvg(d, ctx);
    case 'model': return modelSvg(d, ctx);
    case 'hadith': return hadithSvg(d, ctx);
    default: throw new Error('kind?');
  }
}

const QURAN_ANIM_CSS = '[stroke="#e9c46a"]{animation:qg 3.4s ease-in-out infinite}@keyframes qg{50%{stroke-opacity:.3}}text[fill="url(#mat)"]{animation:qt 5s ease-in-out infinite alternate}@keyframes qt{to{opacity:.82}}';
const SWEEP_CSS = '.axsw{animation:axsw 7s ease-in-out infinite;pointer-events:none}@keyframes axsw{0%{transform:translateX(0)}55%,100%{transform:translateX(1700px)}}@media(prefers-reduced-motion:reduce){.axsw,[stroke],text{animation:none!important}}';
const SWEEP = '<defs><linearGradient id="axswg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><g transform="rotate(16 500 500)"><rect class="axsw" x="-520" y="-300" width="240" height="1600" fill="url(#axswg)"/></g>';

/**
 * SVG beranimasi untuk <img> dan OpenSea `image`: gaya gerak disisipkan ke dalam SVG (tanpa skrip) + kilau cahaya yang
 * menyapu karya. Model membawa animasinya sendiri di dalam SVG.
 */
export function animatedSvg(d, ctx) {
  if (d.kind === 'model') {
    const s = renderSvg(d, ctx);
    const open = s.indexOf('>', s.indexOf('<svg')) + 1;
    const close = s.lastIndexOf('</svg>');
    return `${s.slice(0, open)}<style>${SWEEP_CSS}</style>${s.slice(open, close)}${SWEEP}${s.slice(close)}`;
  }
  // #43: jam, prangko, Al-Qur'an — genom gerak unik per token (tidak ada dua NFT yang bergerak sama)
  const { svg: s, css: mcss } = applyMotion(d, renderSvg(d, ctx));
  const css = { time: TIME_ANIM_CSS, stamp: STAMP_ANIM_CSS, quran: '', hadith: '' }[d.kind] + mcss;
  const open = s.indexOf('>', s.indexOf('<svg')) + 1;
  return `${s.slice(0, open)}<style>${css}</style>${s.slice(open)}`;
}

/** Render player HTML. */
export function renderPlayer(d, meta, ctx, opts) {
  switch (d.kind) {
    case 'time': return timePlayer(d, meta, opts);
    case 'stamp': return stampPlayer(d, meta, opts);
    case 'quran': return quranPlayer(d, meta, ctx, opts);
    case 'model': return modelPlayer(d, meta, ctx, opts);
    case 'hadith': return hadithPlayer(d, meta, ctx, opts);
    default: throw new Error('kind?');
  }
}

/* ------------------------------------------------------------------ penjelajah koleksi (perintah pemilik #37) */
import { SERIES as STAMP_SERIES } from './catalog/stamp.js';
import { SERIES as MODEL_SERIES } from './catalog/model.js';

const QURAN_SERIES = [['ayah', 'Ayah', 'Ayat'], ['page', 'Mushaf Page', 'Halaman Mushaf'], ['juz', 'Juz', 'Juz'], ['mushaf', 'Complete Mushaf', 'Mushaf Lengkap']];

/** Pilihan saringan seri per koleksi: [kunci, EN, ID]. */
export function seriesOptions(key) {
  const kind = collection(key).kind;
  if (kind === 'stamp') return STAMP_SERIES.map((s) => [s[0], s[1], s[2]]);
  if (kind === 'model') return MODEL_SERIES.map((s) => [s[0], s[1], s[2]]);
  if (kind === 'quran') return QURAN_SERIES;
  if (kind === 'time') return TIME_SERIES;
  if (kind === 'hadith') return HADITH_KITAB.map((k) => [k.key, k.nameEn, k.nameId]);
  return [];
}

export function seriesKey(d) {
  if (d.kind === 'stamp' || d.kind === 'model') return d.pick[1][0];
  if (d.kind === 'quran') return d.series.series;
  if (d.kind === 'time') return d.pick[0][4];
  if (d.kind === 'hadith') return d.series.series;
  return '';
}

/**
 * Ambil karya untuk penjelajah: mulai dari `from`, sampai `n` karya yang cocok dengan saringan (tier, seri),
 * memindai paling banyak `scan` nomor. Murni deterministik (tanpa R2).
 */
export function browse(key, { from = 1, n = 60, tier = null, series = '', produced = 0, scan = 4000 } = {}) {
  const items = [];
  let id = Math.max(1, from);
  const end = Math.min(produced, id + scan - 1);
  for (; id <= end && items.length < n; id += 1) {
    const d = dna(key, id);
    if (tier !== null && d.tier.rank !== tier) continue;
    if (series && seriesKey(d) !== series) continue;
    items.push({ id, name: title(d, d.kind === 'quran' ? quranRef(d) : null), tier: d.tier.rank, series: seriesKey(d) });
  }
  return { items, next: id <= produced ? id : null };
}

/*
 * Lapisan gerak interaktif untuk semua player (perintah pemilik #37: „selain css setiap animasi masih terlalu standar").
 *  - miring 3D mengikuti jari/kursor (dan giroskop di Android); saat diam karya tetap "bernapas" dengan gerak Lissajous
 *  - kilau holografik yang mengikuti titik sentuh
 *  - percikan cahaya emas saat karya disentuh/diklik
 *  - prangko tidak dimiringkan (seret & zoom vektornya tetap presisi)
 */
const INTERACT = `<style>#axfx{position:fixed;inset:0;pointer-events:none;z-index:9}#axsh{position:fixed;inset:0;pointer-events:none;z-index:8;mix-blend-mode:soft-light;opacity:.55;background:radial-gradient(circle at var(--x,50%) var(--y,40%),rgba(255,255,255,.85),rgba(255,230,160,.25) 18%,transparent 46%),linear-gradient(115deg,transparent 30%,rgba(120,200,255,.18) 45%,rgba(255,120,220,.16) 55%,transparent 70%);background-size:100% 100%,240% 240%;background-position:0 0,var(--h,50%) 50%;transition:opacity .4s}@media(prefers-reduced-motion:reduce){#axsh,#axfx{display:none}}</style><div id="axsh"></div><canvas id="axfx"></canvas><script>(()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const T=document.querySelector('#s')||document.querySelector('#art')||document.querySelector('body>svg:not(#w)');const stamp=!!document.querySelector('#st');
const sh=document.getElementById('axsh'),cv=document.getElementById('axfx'),g=cv.getContext('2d');let W,H,dpr=Math.min(2,devicePixelRatio||1);const R=()=>{W=cv.width=innerWidth*dpr;H=cv.height=innerHeight*dpr;cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px'};R();addEventListener('resize',R);
let tx=0,ty=0,cx=0,cy=0,last=0,px=.5,py=.4;const P=[];
const aim=(x,y)=>{px=x/innerWidth;py=y/innerHeight;tx=(px-.5)*2;ty=(py-.5)*2;last=performance.now()};
addEventListener('pointermove',e=>aim(e.clientX,e.clientY),{passive:true});
addEventListener('deviceorientation',e=>{if(e.gamma==null)return;tx=Math.max(-1,Math.min(1,e.gamma/30));ty=Math.max(-1,Math.min(1,(e.beta-40)/30));px=.5+tx/2;py=.5+ty/2;last=performance.now()});
addEventListener('pointerdown',e=>{aim(e.clientX,e.clientY);for(let i=0;i<26;i++){const a=Math.random()*Math.PI*2,v=1.5+Math.random()*4.5;P.push({x:e.clientX*dpr,y:e.clientY*dpr,vx:Math.cos(a)*v*dpr,vy:Math.sin(a)*v*dpr-1.5*dpr,l:1,c:['#f3d77a','#fff6c2','#7fb3ff','#ff9be0'][i%4],r:(1.5+Math.random()*2.5)*dpr})}},{passive:true});
if(T&&!stamp){T.style.transformStyle='preserve-3d';T.style.willChange='transform'}
function f(now){const idle=now-last>2500;if(idle){const t=now/1000;tx=Math.sin(t*.6)*.45;ty=Math.sin(t*.43+1)*.35;px=.5+tx/2;py=.45+ty/2}
cx+=(tx-cx)*.08;cy+=(ty-cy)*.08;if(T&&!stamp)T.style.transform='perspective(1100px) rotateY('+(cx*7).toFixed(2)+'deg) rotateX('+(-cy*6).toFixed(2)+'deg) translateZ(0)';
sh.style.setProperty('--x',(px*100).toFixed(1)+'%');sh.style.setProperty('--y',(py*100).toFixed(1)+'%');sh.style.setProperty('--h',(50+cx*40).toFixed(1)+'%');
g.clearRect(0,0,W,H);for(let i=P.length-1;i>=0;i--){const p=P[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.08*dpr;p.l-=.018;if(p.l<=0){P.splice(i,1);continue}g.globalAlpha=p.l;g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,p.r,0,7);g.fill()}g.globalAlpha=1;requestAnimationFrame(f)}requestAnimationFrame(f)})();</script>`;

/** Player + lapisan gerak interaktif. */
export function renderPlayerLive(d, meta, ctx, opts) {
  const html = renderPlayer(d, meta, ctx, opts);
  const i = html.lastIndexOf('</body>');
  return i < 0 ? html + INTERACT : `${html.slice(0, i)}${INTERACT}${html.slice(i)}`;
}

/**
 * Penjelajah atas daftar tetap (etalase 5.000 acak per jenis, perintah pemilik #45). `from` = posisi 1-based dalam
 * daftar; saringan tier, seri dan surah (kaligrafi Al-Qur'an). Mengembalikan harga tetap OpenSea per karya.
 */
export function browseList(key, ids, { from = 1, n = 60, tier = null, series = '', surah = 0 } = {}) {
  const items = [];
  let i = Math.max(1, from);
  for (; i <= ids.length && items.length < n; i += 1) {
    const id = ids[i - 1];
    const d = dna(key, id);
    if (tier !== null && d.tier.rank !== tier) continue;
    if (series && seriesKey(d) !== series) continue;
    const ref = d.kind === 'quran' ? quranRef(d) : null;
    if (surah && !(ref && ref.series === 'ayah' && ref.surah === surah)) continue;
    const e = editionOf(key, id);
    items.push({ id, name: title(d, ref), tier: d.tier.rank, series: seriesKey(d), usd: e.priceUsd, ed: e.supply });
  }
  return { items, next: i <= ids.length ? i : null };
}

/** Hitung karya per seri / per surah dalam daftar (untuk halaman galeri & tautan internal). */
export function listFacets(key, ids) {
  const series = {};
  const surah = {};
  const tiers = [0, 0, 0, 0, 0];
  for (const id of ids) {
    const d = dna(key, id);
    const k = seriesKey(d);
    series[k] = (series[k] ?? 0) + 1;
    tiers[d.tier.rank] += 1;
    if (d.kind === 'quran') { const r = quranRef(d); if (r.series === 'ayah') surah[r.surah] = (surah[r.surah] ?? 0) + 1; }
  }
  return { series, surah, tiers };
}

/** Deskripsi karya hadits dalam satu bahasa untuk halaman situs (#50: tidak campur bahasa). */
export function hadithBlurb(key, tokenId, lang) {
  const d = dna(key, tokenId);
  const r = hadithRef(d);
  if (lang === 'id') return `Karya kaligrafi hadits bergerak. Teks Arab disalin tanpa perubahan dari ${r.nameId} (${r.nameAr}), hadits nomor ${r.number}${r.book ? `, kitab ke-${r.book.no}` : ''}. Bisa dibacakan dengan suara Arab; terjemahan mengikuti bahasa Anda. Rujukan memakai penomoran hadits internasional. Token ini mewakili karya seni dan koleksinya, bukan hak atas hadits.`;
  return `Hadith calligraphy artwork in motion. The Arabic text is reproduced unaltered from ${r.nameEn} (${r.nameAr}), hadith number ${r.number}${r.book ? `, book ${r.book.no}: ${r.book.name}` : ''}. It can be read aloud with an Arabic voice; the translation follows your language. References use international hadith numbering. This token represents the artwork and the collectible — not any right over the hadith.`;
}

/**
 * Sifat karya dalam satu bahasa untuk halaman situs (#50 „ga konsisten, Inggris campur Indonesia"): di halaman Indonesia
 * nama DAN nilai sifat berbahasa Indonesia bila padanannya ada di katalog (OpenSea tetap memakai metadata Inggris).
 */
export function attributesFor(key, tokenId, lang) {
  const m = metadata(key, tokenId);
  if (lang !== 'id') return m.attributes;
  const d = dna(key, tokenId);
  const c = collection(key);
  const TIER_ID = ['Klasik', 'Langka', 'Epik', 'Legendaris', 'Mahakarya'];
  const idName = {};
  d.pick.forEach((o, i) => { if (Array.isArray(o) && typeof o[2] === 'string') idName[d.names[i]] = o[2]; });
  if (d.kind === 'model') {
    const { modelParts } = MODEL_PARTS;
    const p = modelParts(d);
    Object.assign(idName, { Pose: p.pose[2], Series: p.series[2], Outfit: p.look[2], Prop: p.prop[2], Setting: p.setting[2], Light: p.light[2], Motion: p.motion[2], Accessory: p.acc[2], Palette: p.pal[2] });
  }
  if (d.kind === 'stamp') delete idName.Subject;
  const hr = d.kind === 'hadith' ? hadithRef(d) : null;
  const seriesId = hr ? hr.nameId : d.kind === 'time' ? TIME_SERIES.find((x) => x[0] === d.pick[0][4])?.[2] : d.kind === 'quran' ? { ayah: 'Ayat', page: 'Halaman Mushaf', juz: 'Juz', mushaf: 'Mushaf Lengkap' }[d.series.series] : idName.Series;
  const galleryId = `${c.exclusive ? 'Eksklusif ' : ''}${{ time: 'Jam', stamp: 'Prangko', quran: 'Al-Qur\'an', model: 'Model', hadith: 'Hadits' }[d.kind]} · ${seriesId}`;
  return m.attributes.map((a) => {
    const t = a.trait_type;
    let v = a.value;
    if (t === 'Gallery') v = galleryId;
    else if (t === 'Series' && seriesId) v = seriesId;
    else if (t === 'Tier') v = TIER_ID[d.tier.rank];
    else if (t === 'Collection') v = c.exclusive ? 'Eksklusif' : 'Publik';
    else if (t === 'Kitab' && hr) v = `${hr.nameId} · ${hr.nameAr}`;
    else if (t === 'Book' && hr?.book) v = `Kitab ke-${hr.book.no}`;
    else if (idName[t]) v = idName[t];
    return { ...a, trait_type: traitNameId(t), value: v };
  });
}
