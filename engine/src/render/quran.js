/**
 * Renderer QURAN: kaligrafi vektor (image) + player 3D dengan bacaan qari pilihan, gulir otomatis, penunjuk kata.
 * Teks diambil APA ADANYA dari dataset (ctx.ar) — renderer tidak pernah mengubah teks ayat.
 */
import { esc, rng, collection } from '../core.js';
import { svgOpen, linear, radial, starPath, polyPath, girihPattern, roundRect, r1, text, exclusiveBadge, hallmark, starfield, lum } from './common.js';
import { AMIRI_WOFF2_B64 } from './font-amiri.js';
import { arabicWidth } from './arabic-metrics.js';
import { stageCss, FIT_JS } from './stage.js';
import { applyMotion } from './motion.js';

export const FONT_FACE = `<style>@font-face{font-family:'AXTO Amiri';src:url(data:font/woff2;base64,${AMIRI_WOFF2_B64}) format('woff2')}</style>`;

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const arNum = (n) => String(n).replace(/\d/g, (x) => AR_DIGITS[Number(x)]);

/** Qari: [id, nama, folder everyayah, id recitation quran.com (0 = tanpa segmen kata)] */
export const RECITERS = [
  ['alafasy', 'Mishary Rashid Alafasy', 'Alafasy_128kbps', 7],
  ['abdulbasit', 'Abdul Basit Abdus Samad', 'Abdul_Basit_Murattal_192kbps', 2],
  ['sudais', 'Abdurrahman As-Sudais', 'Abdurrahmaan_As-Sudais_192kbps', 3],
  ['shatri', 'Abu Bakr Ash-Shatri', 'Abu_Bakr_Ash-Shaatree_128kbps', 4],
  ['rifai', 'Hani Ar-Rifai', 'Hani_Rifai_192kbps', 5],
  ['husary', 'Mahmoud Khalil Al-Husary', 'Husary_128kbps', 6],
  ['minshawi', 'Muhammad Siddiq Al-Minshawi', 'Minshawy_Murattal_128kbps', 9],
  ['shuraim', "Sa'ud Ash-Shuraim", 'Saood_ash-Shuraym_128kbps', 10],
  ['ghamdi', "Sa'ad Al-Ghamdi", 'Ghamadi_40kbps', 0],
  ['muaiqly', 'Maher Al-Muaiqly', 'MaherAlMuaiqly128kbps', 0],
  ['ajamy', 'Ahmed Al-Ajamy', 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net', 0],
  ['dussary', 'Yasser Ad-Dussary', 'Yasser_Ad-Dussary_128kbps', 0],
];

export function illumination(id, kind, gold, seed) {
  switch (kind) {
    case 'girih': case 'star-lattice': case 'zellige': return `<rect width="1000" height="1000" fill="url(#gp)" />`;
    case 'shamsa': return `<g opacity=".28">${Array.from({ length: 48 }, (_, i) => `<path d="M500 500L${r1(500 + 700 * Math.cos((i / 48) * Math.PI * 2))} ${r1(500 + 700 * Math.sin((i / 48) * Math.PI * 2))}" stroke="${gold}" stroke-width="${i % 2 ? 1 : 3}"/>`).join('')}</g>`;
    case 'muqarnas': return `<g fill="none" stroke="${gold}" stroke-opacity=".3" stroke-width="2">${Array.from({ length: 6 }, (_, row) => Array.from({ length: row + 2 }, (__, k) => { const w = 1000 / (row + 2); return `<path d="M${r1(k * w)} ${80 + row * 26}Q${r1(k * w + w / 2)} ${40 + row * 26} ${r1((k + 1) * w)} ${80 + row * 26}"/>`; }).join('')).join('')}</g>`;
    case 'arabesque': case 'rumi': case 'cloud-band': {
      const r = rng(seed);
      let s = `<g fill="none" stroke="${gold}" stroke-opacity=".28" stroke-width="2">`;
      for (let i = 0; i < 14; i += 1) {
        const x = r() * 1000, y = r() * 1000, R = 40 + r() * 90;
        s += `<path d="M${r1(x)} ${r1(y)}c${r1(R)} ${r1(-R)} ${r1(R * 2)} ${r1(R)} ${r1(R * 3)} 0s${r1(R)} ${r1(-R * 1.2)} ${r1(R * 0.4)} ${r1(-R * 1.6)}"/><circle cx="${r1(x + R * 3)}" cy="${r1(y)}" r="${r1(R * 0.18)}"/>`;
      }
      return `${s}</g>`;
    }
    case 'tazhib-gold': return `<g fill="${gold}" opacity=".22">${Array.from({ length: 24 }, (_, i) => `<path d="${starPath(i % 2 ? 60 : 940, 60 + i * 38, 16, 7, 8)}"/>`).join('')}</g>`;
    default: return '';
  }
}

function compositionPath(kind) {
  // box = kotak aman teks DI DALAM bentuk, sudah diberi jarak ≥ 26 px dari garis (perintah pemilik #52)
  switch (kind) {
    case 'circle': case 'tughra': return { clip: '<circle cx="500" cy="470" r="330"/>', box: [262, 288, 476, 364] }; // tali busur pada y±182 → lebar 2·√(330²−182²)=550, dikurangi jarak
    case 'mihrab': case 'lantern': return { clip: '<path d="M210 860V420Q210 170 500 110Q790 170 790 420V860Z"/>', box: [266, 300, 468, 520] }; // tepi lengkung di y=300 ≈ x 238
    case 'dome': return { clip: '<path d="M170 820V520Q170 210 500 160Q830 210 830 520V820Z"/>', box: [240, 350, 520, 440] };
    case 'ship': return { clip: '<path d="M120 560H880L780 820H220Z"/><path d="M500 140V560H180Z"/><path d="M520 180V560H820Z"/>', box: [222, 228, 556, 504], panel: [196, 202, 608, 556] }; // panel menutup garis layar di belakang teks
    case 'star8': return { clip: `<path d="${starPath(500, 480, 410, 330, 8)}"/>`, box: [282, 304, 436, 352] }; // lingkaran dalam bintang r≈305
    case 'kufi-square': return { clip: '<rect x="170" y="150" width="660" height="660"/>', box: [200, 182, 600, 596] };
    default: return { clip: '<rect x="130" y="150" width="740" height="660" rx="30"/>', box: [162, 182, 676, 596] };
  }
}

/** Ukuran font & pembungkusan teks Arab ke dalam kotak (lebar huruf terukur, cadangan 15%). */
export function layoutArabic(ar, w, h, { maxFs = 78, minFs = 12, lhK = 1.9 } = {}) {
  const words = String(ar).split(/\s+/).filter(Boolean);
  const target = w / 1.15;
  for (let fs = maxFs; fs >= minFs; fs *= 0.94) {
    const sp = arabicWidth(' ', fs);
    const lines = [];
    let cur = [];
    let cw = 0;
    for (const wd of words) {
      const ww = arabicWidth(wd, fs);
      if (cur.length && cw + sp + ww > target) { lines.push({ t: cur.join(' '), w: cw }); cur = []; cw = 0; }
      cw += (cur.length ? sp : 0) + ww;
      cur.push(wd);
    }
    if (cur.length) lines.push({ t: cur.join(' '), w: cw });
    const lh = fs * lhK;
    if ((lines.length - 1) * lh + 2.4 * fs <= h && lines.every((l) => l.w <= target)) return { fs, lines: lines.map((l) => l.t), widths: lines.map((l) => l.w), lh, w };
  }
  // sangat panjang: ukuran minimum, baris dipotong pada tinggi kotak oleh pemanggil
  const fs = minFs;
  const sp = arabicWidth(' ', fs);
  const lines = [];
  let cur = [];
  let cw = 0;
  for (const wd of words) { const ww = arabicWidth(wd, fs); if (cur.length && cw + sp + ww > target) { lines.push({ t: cur.join(' '), w: cw }); cur = []; cw = 0; } cw += (cur.length ? sp : 0) + ww; cur.push(wd); }
  if (cur.length) lines.push({ t: cur.join(' '), w: cw });
  return { fs, lines: lines.map((l) => l.t), widths: lines.map((l) => l.w), lh: fs * lhK, w };
}

/** Garis dasar baris pertama agar tinta (tanda tinggi s.d. ±1,6 em, turun ±0,8 em — terukur) tetap di dalam kotak [y, y+h]. */
export function firstBaseline(y, h, n, lh, fs) {
  return y + (h - ((n - 1) * lh + 2.4 * fs)) / 2 + 1.6 * fs;
}

/** Atribut pengunci panjang baris: baris panjang dikunci ke perkiraan lebarnya (≤ kotak) agar tak pernah keluar garis. */
export function lockLen(estW, boxW) {
  return estW * 1.6 > boxW ? ` textLength="${r1(Math.min(estW, boxW / 1.15))}" lengthAdjust="spacingAndGlyphs"` : '';
}

/**
 * SVG statis. ctx (disiapkan pemanggil dari data Qur'an):
 *  ayah  → {ar, surahAr, surahLt, surah, ayah}
 *  page  → {page, juz, lines: string[]}   juz → {juz, ar (ayat pembuka), surahLt}   mushaf → {}
 */
export function quranSvg(d, ctx, opts = {}) {
  const [comp, illum, mat, bg, , frame, finish] = d.pick;
  const gold = '#e9c46a';
  const [, , , , m1, m2] = mat;
  const [, , , , b1, b2] = bg;
  const darkBg = !['parchment', 'ivory', 'sage'].includes(bg[0]);
  const textFill = darkBg ? 'url(#mat)' : lum(m2) > 0.25 ? '#1a1a1a' : m2;
  const defs = `<defs>${opts.embedFont === false ? '' : FONT_FACE}${radial('bgq', b1, b2, 0.5, 0.42, 0.8)}${linear('mat', [m1, m2, m1], 0, 0, 0, 1)}${girihPattern('gp', gold, illum[0] === 'zellige' ? 50 : 90, 0.22)}<filter id="soft"><feGaussianBlur stdDeviation="8"/></filter></defs>`;
  let body = '';
  const series = d.series.series;
  const font = `font-family="'AXTO Amiri','Amiri Quran','Amiri','Scheherazade New','Noto Naskh Arabic',serif"`;
  const depth = (x, y, s, fs, anchor = 'middle', lock = '') => {
    let out = '';
    for (let i = 5; i >= 1; i -= 1) out += `<text x="${r1(x + i * 0.9)}" y="${r1(y + i * 1.1)}" ${font} font-size="${r1(fs)}" text-anchor="${anchor}" direction="rtl" fill="${m2}" opacity="${r1(0.12 + i * 0.05)}"${lock}>${esc(s)}</text>`;
    return `${out}<text x="${r1(x)}" y="${r1(y)}" ${font} font-size="${r1(fs)}" text-anchor="${anchor}" direction="rtl" fill="${textFill}" stroke="${darkBg ? '#000' : '#fff'}" stroke-opacity=".25" stroke-width="${r1(fs * 0.02)}"${lock}>${esc(s)}</text>`;
  };
  if (series === 'ayah') {
    const { clip, box, panel } = compositionPath(comp[0]);
    const [x, y, w, h] = box;
    const L = layoutArabic(ctx.ar, w, h);
    const maxLines = Math.max(1, Math.floor((h - 2.4 * L.fs) / L.lh) + 1);
    const lines = L.lines.slice(0, maxLines);
    const top = firstBaseline(y, h, lines.length, L.lh, L.fs);
    const cx = x + w / 2;
    body += `<g fill="${darkBg ? '#000' : '#fff'}" fill-opacity=".28" stroke="${gold}" stroke-width="3">${clip}</g>`;
    if (panel) body += `<rect x="${panel[0]}" y="${panel[1]}" width="${panel[2]}" height="${panel[3]}" rx="22" fill="${b2}" fill-opacity=".82" stroke="${gold}" stroke-opacity=".7" stroke-width="2"/>`;
    body += lines.map((ln, i) => depth(cx, top + i * L.lh, ln, L.fs, 'middle', lockLen(L.widths[i], w))).join('');
    body += text(500, 905, `${ctx.surahLt} · ${ctx.surah}:${ctx.ayah}`, `text-anchor="middle" font-family="Georgia,serif" font-size="24" fill="${gold}" letter-spacing="1"`);
    body += `<text x="500" y="955" text-anchor="middle" ${font} font-size="30" fill="${gold}">${esc(`سورة ${ctx.surahAr} ۝${arNum(ctx.ayah)}`)}</text>`;
  } else if (series === 'page') {
    // halaman mushaf: tiap baris rata kanan-kiri selebar kotak (seperti mushaf cetak), jarak ≥ 28 px dari bingkai
    const lines = ctx.lines ?? [];
    const BW = 724;
    const lh = Math.min(740 / Math.max(8, lines.length), 70);
    const est1 = Math.max(1, ...lines.map((ln) => arabicWidth(ln, 1)));
    const pfs = Math.min(34, lh * 0.62, (BW / 1.05) / est1);
    const top0 = 500 - (lines.length * lh) / 2 + lh * 0.7;
    body += `<path d="${roundRect(110, 90, 780, 820, 18)}" fill="${darkBg ? '#000' : '#fff'}" fill-opacity=".3" stroke="${gold}" stroke-width="4"/>`;
    lines.forEach((ln, i) => { const ew = arabicWidth(ln, pfs); body += depth(500, top0 + i * lh, ln, pfs, 'middle', ew > BW * 0.6 ? ` textLength="${r1(Math.min(BW, ew * 1.15))}" lengthAdjust="spacingAndGlyphs"` : ''); });
    body += text(500, 950, `Mushaf Utsmani · Page ${ctx.page} · Juz ${ctx.juz}`, `text-anchor="middle" font-family="Georgia,serif" font-size="24" fill="${gold}"`);
  } else if (series === 'juz') {
    body += `<path d="${starPath(500, 450, 380, 300, 12)}" fill="${darkBg ? '#000' : '#fff'}" fill-opacity=".3" stroke="${gold}" stroke-width="4"/>`;
    body += `<text x="500" y="430" text-anchor="middle" ${font} font-size="120" fill="url(#mat)">${esc(`الجزء ${arNum(ctx.juz)}`)}</text>`;
    const J = layoutArabic(ctx.ar ?? '', 430, 150, { maxFs: 34 });
    J.lines.slice(0, 3).forEach((ln, i) => { body += depth(500, 540 + i * J.lh, ln, J.fs, 'middle', lockLen(J.widths[i], 430)); });
    body += text(500, 930, `Juz ${ctx.juz} · ${ctx.surahLt ?? ''}`, `text-anchor="middle" font-family="Georgia,serif" font-size="30" fill="${gold}"`);
  } else {
    body += `<path d="${roundRect(200, 120, 600, 760, 24)}" fill="${m2}" fill-opacity=".55" stroke="${gold}" stroke-width="10"/><path d="${starPath(500, 470, 210, 160, 16)}" fill="none" stroke="${gold}" stroke-width="4"/><path d="${polyPath(500, 470, 130, 8, Math.PI / 8)}" fill="${gold}" fill-opacity=".15" stroke="${gold}" stroke-width="3"/>`;
    body += `<text x="500" y="495" text-anchor="middle" ${font} font-size="76" fill="url(#mat)">القرآن الكريم</text>`;
    body += text(500, 830, 'The Complete Mushaf · 604 pages · zoomable', `text-anchor="middle" font-family="Georgia,serif" font-size="24" fill="${gold}"`);
  }
  const frameSvg = { 'gold-frame': `<rect x="24" y="24" width="952" height="952" fill="none" stroke="${gold}" stroke-width="10"/>`, 'double-rule': `<rect x="30" y="30" width="940" height="940" fill="none" stroke="${gold}" stroke-width="3"/><rect x="44" y="44" width="912" height="912" fill="none" stroke="${gold}" stroke-width="1.5"/>`, 'floral-border': `<g fill="${gold}" opacity=".7">${Array.from({ length: 40 }, (_, i) => `<circle cx="${r1(25 + (i % 20) * 50)}" cy="${i < 20 ? 25 : 975}" r="7"/>`).join('')}</g>`, 'star-border': `<g fill="${gold}" opacity=".6">${Array.from({ length: 20 }, (_, i) => `<path d="${starPath(30, 30 + i * 49, 12, 5, 8)}"/><path d="${starPath(970, 30 + i * 49, 12, 5, 8)}"/>`).join('')}</g>`, manuscript: `<rect x="40" y="40" width="920" height="920" fill="none" stroke="${gold}" stroke-width="16" stroke-opacity=".5"/><rect x="62" y="62" width="876" height="876" fill="none" stroke="#2c5aa0" stroke-width="4"/>`, 'arch-frame': `<path d="M60 960V360Q60 60 500 40Q940 60 940 360V960Z" fill="none" stroke="${gold}" stroke-width="6"/>`, 'medallion-ring': `<circle cx="500" cy="500" r="480" fill="none" stroke="${gold}" stroke-width="6" stroke-dasharray="2 12"/>` }[frame[0]] ?? '';
  const ex = d.exclusive ? exclusiveBadge(1000, d.tokenId, collection(d.key).max, finish[1]) : '';
  const cosmic = bg[0] === 'cosmos' ? starfield(d.seed, 1000, 1000, 120) : '';
  return `${svgOpen(1000, 1000)}${defs}<rect width="1000" height="1000" fill="url(#bgq)"/>${cosmic}${illumination('il', illum[0], gold, d.seed)}<g class="mxf">${frameSvg}</g><g class="mxo">${body}</g>${ex}${hallmark(1000, 1000, gold)}</svg>`;
}

const PLAYER_JS = `
const Q=window.__Q;const $=s=>document.querySelector(s);const AR='٠١٢٣٤٥٦٧٨٩';const an=n=>String(n).replace(/\\d/g,x=>AR[+x]);
const sel=$('#rc');Q.reciters.forEach((r,i)=>{const o=document.createElement('option');o.value=i;o.textContent=r[1];sel.appendChild(o)});
try{const k=localStorage.getItem('axto-qari');if(k)sel.value=k}catch(e){}
sel.onchange=()=>{try{localStorage.setItem('axto-qari',sel.value)}catch(e){};stop()};
const au=new Audio();au.preload='auto';let queue=[],qi=0,seg=null,words=[],playing=false;
const pad3=n=>String(n).padStart(3,'0');
async function src(key){const r=Q.reciters[sel.value];const[s,a]=key.split(':');let url='https://everyayah.com/data/'+r[2]+'/'+pad3(s)+pad3(a)+'.mp3',segs=null;
 if(r[3]){try{const j=await (await fetch('https://api.quran.com/api/v4/recitations/'+r[3]+'/by_ayah/'+key)).json();const f=j.audio_files&&j.audio_files[0];if(f){if(f.url)url=f.url.startsWith('http')?f.url:'https://verses.quran.com/'+f.url;if(f.segments&&f.segments.length)segs=f.segments.map(x=>x.length>=4?[x[1],x[2],x[3]]:[x[0],x[1],x[2]])}}catch(e){}}
 return{url,segs}}
function mark(key,i){document.querySelectorAll('.w.on').forEach(e=>e.classList.remove('on'));const el=document.querySelectorAll('.w[data-k="'+key+'"]')[i];if(el){el.classList.add('on');if(Q.scroll)el.scrollIntoView({block:'center',behavior:'smooth'})}}
au.ontimeupdate=()=>{if(!queue.length)return;const key=queue[qi];const n=document.querySelectorAll('.w[data-k="'+key+'"]').length;if(!n)return;let i;const t=au.currentTime*1000;
 if(seg){i=0;for(const s of seg){if(t>=s[1])i=Math.max(0,s[0]-1)}}else if(au.duration){i=Math.min(n-1,Math.floor(t/(au.duration*1000)*n))}mark(key,i)};
au.onended=()=>{qi++;if(qi<queue.length)playAt();else stop()};
async function playAt(){const key=queue[qi];const{url,segs}=await src(key);seg=segs;au.src=url;try{await au.play()}catch(e){stop()}}
function stop(){playing=false;au.pause();$('#pl').textContent='▶';document.querySelectorAll('.w.on').forEach(e=>e.classList.remove('on'))}
$('#pl').onclick=()=>{if(playing){stop();return}playing=true;$('#pl').textContent='❚❚';queue=[...new Set([...document.querySelectorAll('.w')].map(e=>e.dataset.k))];qi=0;playAt()};
`;

/** Player. ctx sama seperti quranSvg, ditambah untuk ayah: words; page/juz/mushaf: pages (nomor halaman). */
export function quranPlayer(d, meta, ctx, opts = {}) {
  const [comp, , mat, bg, anim] = d.pick;
  const n = opts.nonce ? ` nonce="${opts.nonce}"` : '';
  const [, , , , m1, m2] = mat;
  const [, , , , b1, b2] = bg;
  const mo = applyMotion(d, quranSvg(d, ctx, { embedFont: false }).replace(/<text[^>]*>.*?<\/text>/g, '')); // genom gerak (#43); tanpa tulisan latar (#52)
  const art = mo.svg;
  const series = d.series.series;
  const animCss = {
    float: '@keyframes A{0%{transform:perspective(900px) rotateX(8deg) translateY(0)}100%{transform:perspective(900px) rotateX(-6deg) translateY(-10px)}}#tx{animation:A 5s ease-in-out infinite alternate}',
    rotate3d: '@keyframes A{0%{transform:perspective(900px) rotateY(-14deg)}100%{transform:perspective(900px) rotateY(14deg)}}#tx{animation:A 7s ease-in-out infinite alternate}',
    reveal: '@keyframes A{from{clip-path:inset(0 0 0 100%)}to{clip-path:inset(0 0 0 0)}}#tx{animation:A 3.5s ease-out both}',
    shimmer: '@keyframes A{to{background-position:200% 0}}#tx .w{background:linear-gradient(100deg,var(--m1) 40%,#fff 50%,var(--m1) 60%);background-size:200% 100%;-webkit-background-clip:text;color:transparent;animation:A 4s linear infinite}',
    particles: '@keyframes A{to{transform:translateY(-100vh)}}.pt{position:fixed;bottom:-10px;width:3px;height:3px;border-radius:50%;background:var(--m1);animation:A linear infinite}',
    orbit: '@keyframes A{to{transform:rotate(360deg)}}#orb{position:fixed;inset:10%;border-radius:50%;border:1px dashed var(--m1);opacity:.4;animation:A 40s linear infinite}',
    ripple: '@keyframes A{0%{box-shadow:0 0 0 0 var(--m1)}100%{box-shadow:0 0 0 40px transparent}}#tx{border-radius:24px;animation:A 3s ease-out infinite}',
    dawnrise: '@keyframes A{from{filter:brightness(.3)}to{filter:brightness(1)}}body{animation:A 6s ease-out both}',
  }[anim[0]] ?? '';
  let content = '';
  let scroll = false;
  if (series === 'ayah') {
    content = `<div id="tx" class="ay" dir="rtl" lang="ar">${ctx.ar.split(/\s+/).filter(Boolean).map((w) => `<span class="w" data-k="${ctx.surah}:${ctx.ayah}">${esc(w)}</span>`).join(' ')} <span class="no">۝${arNum(ctx.ayah)}</span></div><p class="ref">${esc(ctx.surahLt)} · ${ctx.surah}:${ctx.ayah}</p>${ctx.tr ? `<p class="tr" lang="id">${esc(ctx.tr)}</p>` : ''}`;
  } else {
    scroll = true;
    content = `<div id="tx" class="mush" dir="rtl" lang="ar" data-pages="${esc(JSON.stringify(ctx.pages ?? []))}"></div>`;
  }
  const loader = series === 'ayah' ? '' : `
(async()=>{const box=document.getElementById('tx');const pages=JSON.parse(box.dataset.pages);let html='';for(const p of pages){const j=await (await fetch('/quran/h/'+p+'.json')).json();html+='<section class="pg"><header>'+p+'</header>';for(const b of j.baris){if(b.t==='surat'){html+='<div class="sr">سورة</div>';continue}if(b.t!=='b'){html+='<div class="ln bs">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</div>';continue}html+='<div class="ln">'+b.k.map(w=>'<span class="w" data-k="'+w[1]+'">'+w[0].replace(/[<>&]/g,'')+'</span>'+(w[2]?'<span class="no">۝'+an(w[2])+'</span>':'')).join(' ')+'</div>'}html+='</section>';if(pages.length>40&&p%20===0){box.innerHTML=html}}box.innerHTML=html})();
let z=1;const sf=document.getElementById('safe');document.getElementById('zi').onclick=()=>{z=Math.min(4,z*1.2);sf.dataset.z=z;axFit()};document.getElementById('zo').onclick=()=>{z=Math.max(.5,z/1.2);sf.dataset.z=z;axFit()};`;
  const particles = anim[0] === 'particles' ? Array.from({ length: 30 }, (_, i) => `<i class="pt" style="left:${(i * 37) % 100}%;animation-duration:${6 + (i % 7)}s;animation-delay:${-(i % 9)}s"></i>`).join('') : '';
  // #52: teks hanya di dalam kotak aman bingkai, ukuran menyesuaikan, tidak tertutup tombol; tulisan latar dihapus
  const safeBox = series === 'ayah' ? compositionPath(comp[0]).box : series === 'page' ? [136, 116, 728, 724] : [150, 150, 700, 690];
  const k = series === 'ayah' ? 0.06 : 0.03;
  return `<!doctype html><html lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.name)}</title><style${n}>@font-face{font-family:'Amiri Quran';src:url(/fonts/amiri-quran-arabic.woff2) format('woff2');font-display:swap}:root{--m1:${m1};--m2:${m2}}body{background:radial-gradient(circle at 50% 40%,${b1},${b2});color:${m1};font-family:system-ui}${stageCss(safeBox)}#tx{font-family:'Amiri Quran','Amiri',serif;font-size:1em;line-height:2.1;text-align:center;color:var(--m1);text-shadow:1px 1px 0 var(--m2),2px 2px 0 var(--m2),3px 4px 6px #0009;width:100%}.mush{text-shadow:1px 1px 0 var(--m2)!important}.pg{margin:0 0 1.2em;padding:.6em;border:1px solid #e9c46a55;border-radius:10px;background:#0003}.pg header{font:12px system-ui;opacity:.6;text-align:center}.ln{text-align:justify;text-align-last:center}.sr,.bs{text-align:center;color:#e9c46a}.w{transition:color .15s,background .15s;border-radius:6px;padding:0 1px}.w.on{color:#fff;background:#e9c46a55}.no{color:#e9c46a;font-size:.8em}.ref{font-family:Georgia,serif;font-size:.42em;color:#e9c46a;margin:.4em 0 .2em}.tr{font-family:system-ui;font-size:.36em;line-height:1.5;color:#fff;opacity:.85;text-align:center;margin:.2em 0}.bar{position:fixed;left:50%;bottom:8px;transform:translateX(-50%);display:flex;gap:6px;background:#000c;border:1px solid #fff3;border-radius:12px;padding:6px;z-index:5;max-width:96vw}.bar select,.bar button{background:transparent;color:#fff;border:1px solid #fff4;border-radius:8px;padding:5px 9px;font:13px system-ui;max-width:52vw}.bar option{color:#000}${animCss}${mo.css}@media(prefers-reduced-motion:reduce){*{animation:none!important}}</style></head><body><div id="stage"><div id="art">${art}</div><div id="safe" data-k="${k}" data-min="11"${scroll ? ' data-scroll="1"' : ''}>${content}</div></div>${anim[0] === 'orbit' ? '<div id="orb"></div>' : ''}${particles}<div class="bar"><button id="pl" type="button" aria-label="Play">▶</button><select id="rc" aria-label="Qari"></select>${scroll ? '<button id="zo" type="button">−</button><button id="zi" type="button">+</button>' : ''}</div><script${n}>window.__Q=${JSON.stringify({ reciters: RECITERS, scroll })};${PLAYER_JS}${loader}${FIT_JS}</script></body></html>`;
}
