/**
 * Renderer QURAN: kaligrafi vektor (image) + player 3D dengan bacaan qari pilihan, gulir otomatis, penunjuk kata.
 * Teks diambil APA ADANYA dari dataset (ctx.ar) — renderer tidak pernah mengubah teks ayat.
 */
import { esc, rng, collection } from '../core.js';
import { svgOpen, linear, radial, starPath, polyPath, girihPattern, roundRect, r1, text, exclusiveBadge, hallmark, starfield, lum } from './common.js';
import { AMIRI_WOFF2_B64 } from './font-amiri.js';
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
  switch (kind) {
    case 'circle': case 'tughra': return { clip: '<circle cx="500" cy="470" r="330"/>', box: [230, 230, 540, 480] };
    case 'mihrab': case 'lantern': return { clip: '<path d="M210 860V420Q210 170 500 110Q790 170 790 420V860Z"/>', box: [250, 260, 500, 560] };
    case 'dome': return { clip: '<path d="M170 820V520Q170 210 500 160Q830 210 830 520V820Z"/>', box: [220, 300, 560, 480] };
    case 'ship': return { clip: '<path d="M120 560H880L780 820H220Z"/><path d="M500 140V560H180Z"/><path d="M520 180V560H820Z"/>', box: [200, 200, 600, 560] };
    case 'star8': return { clip: `<path d="${starPath(500, 480, 410, 330, 8)}"/>`, box: [240, 240, 520, 480] };
    case 'kufi-square': return { clip: '<rect x="170" y="150" width="660" height="660"/>', box: [200, 190, 600, 580] };
    default: return { clip: '<rect x="130" y="150" width="740" height="660" rx="30"/>', box: [170, 190, 660, 580] };
  }
}

/** Ukuran font & pembungkusan teks Arab ke dalam kotak. */
export function layoutArabic(ar, w, h) {
  const words = ar.split(/\s+/).filter(Boolean);
  const base = ar.replace(/[ً-ٰٟۖ-ۭ\s]/g, '').length || 1;
  let fs = Math.sqrt((w * h) / (base * 0.62 * 1.9));
  fs = Math.max(13, Math.min(78, fs));
  for (let iter = 0; iter < 30; iter += 1) {
    const perLine = Math.max(4, Math.floor(w / (fs * 0.5)));
    const lines = [];
    let cur = [];
    let len = 0;
    for (const wd of words) {
      const L = wd.replace(/[ً-ٰٟۖ-ۭ]/g, '').length + 1;
      if (cur.length && len + L > perLine) { lines.push(cur.join(' ')); cur = []; len = 0; }
      cur.push(wd); len += L;
    }
    if (cur.length) lines.push(cur.join(' '));
    if (lines.length * fs * 1.9 <= h || fs <= 13) return { fs, lines, lh: fs * 1.9 };
    fs *= 0.92;
  }
  return { fs: 13, lines: [ar], lh: 25 };
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
  const depth = (x, y, s, fs, anchor = 'middle') => {
    let out = '';
    for (let i = 5; i >= 1; i -= 1) out += `<text x="${r1(x + i * 0.9)}" y="${r1(y + i * 1.1)}" ${font} font-size="${r1(fs)}" text-anchor="${anchor}" direction="rtl" fill="${m2}" opacity="${r1(0.12 + i * 0.05)}">${esc(s)}</text>`;
    return `${out}<text x="${r1(x)}" y="${r1(y)}" ${font} font-size="${r1(fs)}" text-anchor="${anchor}" direction="rtl" fill="${textFill}" stroke="${darkBg ? '#000' : '#fff'}" stroke-opacity=".25" stroke-width="${r1(fs * 0.02)}">${esc(s)}</text>`;
  };
  if (series === 'ayah') {
    const { clip, box } = compositionPath(comp[0]);
    const [x, y, w, h] = box;
    const { fs, lines, lh } = layoutArabic(ctx.ar, w, h - 40);
    const top = y + (h - 40 - lines.length * lh) / 2 + fs * 1.2;
    body += `<g fill="${darkBg ? '#000' : '#fff'}" fill-opacity=".28" stroke="${gold}" stroke-width="3">${clip}</g>`;
    body += lines.map((ln, i) => depth(500, top + i * lh, ln, fs)).join('');
    body += text(500, 905, `${ctx.surahLt} · ${ctx.surah}:${ctx.ayah}`, `text-anchor="middle" font-family="Georgia,serif" font-size="24" fill="${gold}" letter-spacing="1"`);
    body += `<text x="500" y="955" text-anchor="middle" ${font} font-size="30" fill="${gold}">${esc(`سورة ${ctx.surahAr} ۝${arNum(ctx.ayah)}`)}</text>`;
  } else if (series === 'page') {
    const lines = ctx.lines ?? [];
    const lh = Math.min(760 / Math.max(8, lines.length), 70);
    const top0 = 500 - (lines.length * lh) / 2 + lh * 0.7;
    body += `<path d="${roundRect(110, 90, 780, 820, 18)}" fill="${darkBg ? '#000' : '#fff'}" fill-opacity=".3" stroke="${gold}" stroke-width="4"/>`;
    lines.forEach((ln, i) => { body += depth(500, top0 + i * lh, ln, Math.min(34, lh * 0.62)); });
    body += text(500, 950, `Mushaf Utsmani · Page ${ctx.page} · Juz ${ctx.juz}`, `text-anchor="middle" font-family="Georgia,serif" font-size="24" fill="${gold}"`);
  } else if (series === 'juz') {
    body += `<path d="${starPath(500, 450, 380, 300, 12)}" fill="${darkBg ? '#000' : '#fff'}" fill-opacity=".3" stroke="${gold}" stroke-width="4"/>`;
    body += `<text x="500" y="430" text-anchor="middle" ${font} font-size="120" fill="url(#mat)">${esc(`الجزء ${arNum(ctx.juz)}`)}</text>`;
    const { fs, lines } = layoutArabic(ctx.ar ?? '', 480, 140);
    lines.slice(0, 3).forEach((ln, i) => { body += depth(500, 520 + i * fs * 1.8, ln, Math.min(fs, 34)); });
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
  const mo = applyMotion(d, quranSvg(d, ctx, { embedFont: false }).replace(/<text[^>]*direction="rtl"[^>]*>.*?<\/text>/g, '')); // genom gerak (#43)
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
let z=1;document.getElementById('zi').onclick=()=>{z=Math.min(6,z*1.25);document.getElementById('tx').style.fontSize=(z*1.5)+'rem'};document.getElementById('zo').onclick=()=>{z=Math.max(.5,z/1.25);document.getElementById('tx').style.fontSize=(z*1.5)+'rem'};`;
  const particles = anim[0] === 'particles' ? Array.from({ length: 30 }, (_, i) => `<i class="pt" style="left:${(i * 37) % 100}%;animation-duration:${6 + (i % 7)}s;animation-delay:${-(i % 9)}s"></i>`).join('') : '';
  return `<!doctype html><html lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.name)}</title><style${n}>@font-face{font-family:'Amiri Quran';src:url(/fonts/amiri-quran-arabic.woff2) format('woff2');font-display:swap}:root{--m1:${m1};--m2:${m2}}html,body{margin:0;min-height:100%;background:radial-gradient(circle at 50% 40%,${b1},${b2});color:${m1};font-family:system-ui;overflow:${scroll ? 'auto' : 'hidden'}}#art{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;opacity:.9;pointer-events:none}#art svg{width:100vmin;height:100vmin}main{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8vmin 6vmin 80px;box-sizing:border-box}#tx{font-family:'Amiri Quran','Amiri',serif;font-size:1.5rem;line-height:2.4;text-align:center;max-width:70vmin;color:var(--m1);text-shadow:1px 1px 0 var(--m2),2px 2px 0 var(--m2),3px 3px 0 var(--m2),4px 5px 8px #0009}.ay{font-size:clamp(18px,${r1(Math.max(2.2, 6 - ctx.ar?.length / 120 || 3))}vmin,64px)!important}.mush{max-width:860px!important;text-shadow:1px 1px 0 var(--m2)!important}.pg{margin:0 0 40px;padding:20px;border:1px solid #e9c46a55;border-radius:12px;background:#0003}.pg header{font:12px system-ui;opacity:.6;text-align:center}.ln{text-align:justify;text-align-last:center}.sr,.bs{text-align:center;color:#e9c46a}.w{transition:color .15s,background .15s;border-radius:6px;padding:0 2px}.w.on{color:#fff;background:#e9c46a55}.no{color:#e9c46a;font-size:.8em}.ref{font:14px Georgia,serif;color:#e9c46a}.tr{font:14px system-ui;color:#fff;opacity:.8;max-width:60vmin;text-align:center}.bar{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:6px;background:#000a;border:1px solid #fff3;border-radius:12px;padding:6px}.bar select,.bar button{background:transparent;color:#fff;border:1px solid #fff4;border-radius:8px;padding:5px 9px;font:13px system-ui}.bar option{color:#000}${animCss}${mo.css}@media(prefers-reduced-motion:reduce){*{animation:none!important}}</style></head><body><div id="art">${art}</div>${anim[0] === 'orbit' ? '<div id="orb"></div>' : ''}${particles}<main>${content}</main><div class="bar"><button id="pl" type="button" aria-label="Play">▶</button><select id="rc" aria-label="Qari"></select>${scroll ? '<button id="zo" type="button">−</button><button id="zi" type="button">+</button>' : ''}</div><script${n}>window.__Q=${JSON.stringify({ reciters: RECITERS, scroll })};${PLAYER_JS}${loader}</script></body></html>`;
}
