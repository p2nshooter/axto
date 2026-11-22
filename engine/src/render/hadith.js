/**
 * Renderer HADITS (perintah pemilik #49): kaligrafi hadits + rujukan lengkap (kitab, bab, nomor), player dengan suara Arab
 * perangkat dan terjemahan sesuai bahasa/negara pengunjung (terjemahan manusia bila ada, selain itu mesin penerjemah
 * Workers AI lewat /api/hadith/tr) — suara terjemahan memakai logat lokal pengunjung (en-GB, es-MX, pt-BR, …).
 * Teks Arab diambil APA ADANYA dari data ulyah.com — renderer tidak pernah mengubahnya.
 */
import { esc } from '../core.js';
import { svgOpen, linear, radial, girihPattern, r1, text, exclusiveBadge, hallmark, starfield, lum } from './common.js';
import { layoutArabic, arNum, illumination, FONT_FACE } from './quran.js';
import { applyMotion } from './motion.js';
import { HADITH_KITAB, hadithAt, bookOf } from '../catalog/hadith.js';
import { collection } from '../core.js';

/** Rujukan hadits sebuah token (tanpa teks). */
export function hadithRef(d) {
  const h = hadithAt(d.series.unit);
  const k = HADITH_KITAB[h.kitab];
  const book = bookOf(h.key, h.number);
  return { key: h.key, number: h.number, index: h.index, nameId: k.nameId, nameAr: k.nameAr, nameEn: k.nameEn, author: k.author, source: k.source, book: book ? { no: book[0], name: book[1] } : null, langs: k.langs };
}

const ARFONT = `font-family="'AXTO Amiri','Amiri Quran','Amiri','Scheherazade New','Noto Naskh Arabic',serif"`;

/** SVG statis. ctx: {ar, b, bh, an, g} dari data hadits (blok JSON). */
export function hadithSvg(d, ctx = {}, opts = {}) {
  const [, illum, mat, bg, , frame, finish] = d.pick;
  const gold = '#e9c46a';
  const [, , , , m1, m2] = mat;
  const [, , , , b1, b2] = bg;
  const darkBg = !['parchment', 'ivory', 'sage'].includes(bg[0]);
  // keterbacaan: tinta gelap di latar gelap → krem; latar terang → tinta gelap & aksen cokelat emas
  const textFill = darkBg ? (lum(m1) < 0.35 ? '#f3e3bf' : 'url(#mat)') : lum(m2) > 0.25 ? '#1a1a1a' : m2;
  const ink = darkBg ? '#e9c46a' : '#6b4e0e';
  const ref = hadithRef(d);
  const defs = `<defs>${opts.embedFont === false ? '' : FONT_FACE}${radial('bgq', b1, b2, 0.5, 0.42, 0.8)}${linear('mat', [m1, m2, m1], 0, 0, 0, 1)}${girihPattern('gp', gold, illum[0] === 'zellige' ? 50 : 90, 0.2)}</defs>`;
  // teks Arab: dimuat sebanyak mungkin; bila terlalu panjang dipotong dengan „…" (teks lengkap di player)
  const ar = (ctx.ar ?? '').replace(/\s+/g, ' ').trim();
  let body = '';
  if (ar) {
    const L = layoutArabic(ar, 700, 560);
    const maxLines = Math.floor(560 / L.lh);
    const lines = L.lines.length > maxLines ? [...L.lines.slice(0, maxLines - 1), `${L.lines[maxLines - 1]} …`] : L.lines;
    const top = 215 + (560 - lines.length * L.lh) / 2 + L.fs * 1.15;
    body = lines.map((ln, i) => `<text x="500" y="${r1(top + i * L.lh)}" ${ARFONT} font-size="${r1(L.fs)}" text-anchor="middle" direction="rtl" fill="${textFill}" stroke="${darkBg ? '#000' : '#fff'}" stroke-opacity=".22" stroke-width="${r1(L.fs * 0.02)}">${esc(ln)}</text>`).join('');
  }
  const head = `<text x="500" y="112" ${ARFONT} font-size="46" text-anchor="middle" direction="rtl" fill="${ink}">${esc(ref.nameAr)}</text>${text(500, 152, `${ref.nameEn} · Hadith ${ref.number}`, `text-anchor="middle" font-family="Georgia,serif" font-size="24" fill="${ink}" letter-spacing="1"`)}`;
  const bookLine = ref.book ? `Book ${ref.book.no}: ${ref.book.name}` : ref.nameEn;
  const foot = `${text(500, 852, bookLine.length > 64 ? `${bookLine.slice(0, 62)}…` : bookLine, `text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="${ink}"`)}${text(500, 888, `No. ${ref.number}${ctx.b && ctx.bh ? ` · (${ctx.b}:${ctx.bh})` : ''}${ctx.g ? ` · ${String(ctx.g).slice(0, 40)}` : ''}`, `text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="18" fill="${ink}" opacity=".9"`)}<text x="500" y="935" ${ARFONT} font-size="26" text-anchor="middle" direction="rtl" fill="${ink}">${esc(`الحديث رقم ${arNum(ref.number)}`)}</text>`;
  const frameSvg = { 'gold-frame': `<rect x="24" y="24" width="952" height="952" fill="none" stroke="${gold}" stroke-width="10"/>`, 'double-rule': `<rect x="30" y="30" width="940" height="940" fill="none" stroke="${gold}" stroke-width="3"/><rect x="44" y="44" width="912" height="912" fill="none" stroke="${gold}" stroke-width="1.5"/>` }[frame[0]] ?? `<rect x="34" y="34" width="932" height="932" rx="26" fill="none" stroke="${gold}" stroke-width="4"/><rect x="50" y="50" width="900" height="900" rx="18" fill="none" stroke="${gold}" stroke-opacity=".5" stroke-width="1.5"/>`;
  const panel = `<rect x="110" y="190" width="780" height="610" rx="22" fill="${darkBg ? '#000' : '#fff'}" fill-opacity=".26" stroke="${gold}" stroke-opacity=".6" stroke-width="2"/>`;
  const ex = d.exclusive ? exclusiveBadge(1000, d.tokenId, collection(d.key).max, finish[1]) : '';
  const cosmic = bg[0] === 'cosmos' ? starfield(d.seed, 1000, 1000, 120) : '';
  return `${svgOpen(1000, 1000)}${defs}<rect width="1000" height="1000" fill="url(#bgq)"/>${cosmic}${illumination('il', illum[0], gold, d.seed)}<g class="mxf">${frameSvg}</g>${panel}<g class="mxo">${head}${body}${foot}</g>${ex}${hallmark(1000, 1000, gold)}</svg>`;
}

/** Bahasa pilihan di player: [kode, nama asli]. Selain yang punya terjemahan manusia, diterjemahkan mesin (Workers AI). */
export const TR_LANGS = [['id', 'Bahasa Indonesia'], ['en', 'English'], ['ms', 'Bahasa Melayu'], ['fr', 'Français'], ['tr', 'Türkçe'], ['ur', 'اردو'], ['bn', 'বাংলা'], ['ru', 'Русский'], ['ta', 'தமிழ்'], ['es', 'Español'], ['pt', 'Português'], ['de', 'Deutsch'], ['it', 'Italiano'], ['nl', 'Nederlands'], ['fa', 'فارسی'], ['hi', 'हिन्दी'], ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어'], ['sw', 'Kiswahili'], ['ha', 'Hausa'], ['so', 'Soomaali'], ['ps', 'پښتو'], ['th', 'ไทย'], ['vi', 'Tiếng Việt'], ['pl', 'Polski'], ['uk', 'Українська'], ['az', 'Azərbaycan'], ['uz', 'Oʻzbek'], ['kk', 'Қазақ']];

const PLAYER_JS = `
const H=window.__H;const $=s=>document.querySelector(s);
const st=$('#st');const say=t=>{st.textContent=t};
// ---- teks Arab per kata (penunjuk kata saat dibacakan)
const words=H.ar.replace(/\\s+/g,' ').trim().split(' ');const box=$('#tx');
box.innerHTML=words.map((w,i)=>'<span class="w" data-i="'+i+'">'+w.replace(/[<>&]/g,'')+'</span>').join(' ');
const spans=[...box.querySelectorAll('.w')];
// ---- suara: pilih suara perangkat sesuai bahasa + logat negara pengunjung
let voices=[];const loadV=()=>{voices=speechSynthesis.getVoices()};if('speechSynthesis' in window){loadV();speechSynthesis.onvoiceschanged=loadV}
const locs=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'en']).map(x=>x.toLowerCase());
function pickVoice(base){const v=voices.filter(x=>x.lang&&x.lang.toLowerCase().replace('_','-').startsWith(base));if(!v.length)return null;
 const want=locs.find(l=>l.startsWith(base+'-'));const pref=want?[want]:(base==='ar'?['ar-sa','ar-eg','ar-ae']:base==='en'?['en-us','en-gb']:base==='es'?['es-es','es-mx']:base==='pt'?['pt-br','pt-pt']:[]);
 for(const p of pref){const m=v.find(x=>x.lang.toLowerCase().replace('_','-')===p);if(m)return m}return v.find(x=>x.localService)||v[0]}
let speaking=false;
function stop(){speaking=false;try{speechSynthesis.cancel()}catch(e){}spans.forEach(s=>s.classList.remove('on'));$('#pa').textContent='▶ عربي';$('#pt').textContent='▶ '+($('#lg').selectedOptions[0]||{}).text}
// ucapan panjang dipecah per kalimat (Chrome menghentikan ucapan > ±15 detik)
function chunks(t){const parts=t.split(/(?<=[.!?؟،,:;])\\s+/);const out=[];let cur='';for(const p of parts){if((cur+' '+p).length>220&&cur){out.push(cur);cur=p}else cur=cur?cur+' '+p:p}if(cur)out.push(cur);return out}
function speak(text,base,onChar){if(!('speechSynthesis' in window)){say(H.i18n.noTts);return}const v=pickVoice(base);if(!v){say(H.i18n.noVoice.replace('%s',base));}
 stop();speaking=true;const cs=chunks(text);let off=0,k=0;const rate=+$('#sp').value;
 const next=()=>{if(!speaking||k>=cs.length){stop();return}const c=cs[k];const u=new SpeechSynthesisUtterance(c);u.lang=v?v.lang:(base==='ar'?'ar-SA':base);if(v)u.voice=v;u.rate=rate;const base0=off;
  u.onboundary=e=>{if(onChar&&e.name!=='sentence')onChar(base0+e.charIndex)};u.onend=()=>{off+=c.length+1;k++;next()};u.onerror=()=>{off+=c.length+1;k++;next()};speechSynthesis.speak(u)};next()}
const starts=[];{let p=0;for(const w of words){starts.push(p);p+=w.length+1}}
function markAt(ci){let i=0;while(i+1<starts.length&&starts[i+1]<=ci)i++;spans.forEach(s=>s.classList.remove('on'));const s=spans[i];if(s){s.classList.add('on');s.scrollIntoView({block:'nearest',behavior:'smooth'})}}
$('#pa').onclick=()=>{if(speaking){stop();return}$('#pa').textContent='❚❚';speak(words.join(' '),'ar',markAt)};
// ---- terjemahan: manusia bila ada (ID/EN dari data ulyah.com, bahasa lain dari edisi penerjemah), selain itu mesin (Workers AI)
const lg=$('#lg');const tr=$('#tr');const tl=$('#tl');
const auto=(()=>{for(const l of locs){const b=l.split('-')[0];if([...lg.options].some(o=>o.value===b))return b}return 'en'})();
try{lg.value=localStorage.getItem('axto-hlang')||auto}catch(e){lg.value=auto}
let trText='';
async function loadTr(){const to=lg.value;try{localStorage.setItem('axto-hlang',to)}catch(e){}
 tl.textContent=H.i18n.loading;tr.textContent='';tr.dir=['ur','fa','ps','ar'].includes(to)?'rtl':'ltr';
 if(to==='id'&&H.id){trText=H.id;tl.textContent=H.i18n.human+' · Bahasa Indonesia';tr.textContent=trText;return}
 if(to==='en'&&H.en){trText=H.en;tl.textContent=H.i18n.human+' · English';tr.textContent=trText;return}
 try{const r=await (await fetch('/api/hadith/tr?c='+H.key+'&n='+H.n+'&to='+to)).json();if(!r.text)throw new Error(r.error||'');trText=r.text;tl.textContent=(r.kind==='human'?H.i18n.human:H.i18n.machine)+' · '+lg.selectedOptions[0].text;tr.textContent=trText}
 catch(e){trText=H.en||H.id||'';tl.textContent=H.i18n.fallback;tr.textContent=trText}}
lg.onchange=()=>{stop();loadTr()};loadTr();
$('#pt').onclick=()=>{if(speaking){stop();return}$('#pt').textContent='❚❚';speak(trText,lg.value,null)};
`;

/** Player hadits. ctx: data hadits {ar, id, en, b, bh, an, g}. */
export function hadithPlayer(d, meta, ctx = {}, opts = {}) {
  const [, , mat, bg] = d.pick;
  const [, , , , m1, m2] = mat;
  const [, , , , b1, b2] = bg;
  const n = opts.nonce ? ` nonce="${opts.nonce}"` : '';
  const ref = hadithRef(d);
  // latar player: tanpa teks (rujukan & teks lengkap ditampilkan HTML di atasnya, tidak bertumpuk)
  const mo = applyMotion(d, hadithSvg(d, ctx, { embedFont: false }).replace(/<text[^>]*>.*?<\/text>/g, ''));
  const I = { loading: 'Memuat terjemahan… / Loading translation…', human: 'Terjemahan penerjemah / Human translation', machine: 'Terjemahan mesin (AI) — rujuk ulama untuk pemahaman / Machine translation (AI)', fallback: 'Terjemahan bahasa ini belum tersedia — ditampilkan bahasa Inggris / Not available — English shown', noTts: 'Perangkat tidak mendukung suara / No speech support on this device', noVoice: 'Suara bahasa „%s" belum terpasang di perangkat — pasang di pengaturan Text-to-Speech. / Install a „%s" voice in your device Text-to-Speech settings.' };
  const data = { key: ref.key, n: ref.number, ar: ctx.ar ?? '', id: ctx.id ?? '', en: ctx.en ?? '', i18n: I };
  const book = ref.book ? `Book ${ref.book.no}: ${esc(ref.book.name)}` : '';
  const refHtml = `<div class="ref"><b class="kar" lang="ar" dir="rtl">${esc(ref.nameAr)}</b><span>${esc(ref.nameEn)} · ${esc(ref.nameId)}</span><span>${book}</span><span>Hadith No. ${ref.number}${ctx.bh && ctx.b ? ` · ${ctx.b}:${ctx.bh}` : ''}${ctx.an ? ` · رقم ${arNum(ctx.an)}` : ''}</span>${ctx.g ? `<span>Grade: ${esc(ctx.g)}</span>` : ''}<small>${esc(ref.author)} · data: ulyah.com (${esc(ref.source)}) · penomoran internasional; halaman cetak berbeda per penerbit</small></div>`;
  return `<!doctype html><html lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.name)}</title><style${n}>@font-face{font-family:'Amiri Quran';src:url(/fonts/amiri-quran-arabic.woff2) format('woff2');font-display:swap}:root{--m1:${m1};--m2:${m2}}html,body{margin:0;min-height:100%;background:radial-gradient(circle at 50% 40%,${b1},${b2});color:${m1};font-family:system-ui}#art{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;opacity:.55;pointer-events:none}#art svg{width:100vmin;height:100vmin}main{position:relative;max-width:900px;margin:0 auto;padding:5vmin 5vmin 120px;box-sizing:border-box}.ref{display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;color:#e9c46a;margin-bottom:14px}.ref .kar{font-family:'Amiri Quran','Amiri',serif;font-size:2rem}.ref span{font:14px Georgia,serif}.ref small{font:11px system-ui;opacity:.7;max-width:560px}#tx{font-family:'Amiri Quran','Amiri',serif;font-size:clamp(18px,3.2vmin,30px);line-height:2.2;text-align:justify;text-align-last:center;color:var(--m1);text-shadow:1px 1px 0 var(--m2),2px 2px 0 var(--m2),3px 4px 8px #0009;background:#0004;border:1px solid #e9c46a55;border-radius:14px;padding:16px}.w{border-radius:6px;padding:0 2px;transition:background .15s,color .15s}.w.on{color:#fff;background:#e9c46a66}#tl{font:12px system-ui;color:#e9c46a;margin:16px 0 4px}#tr{font:16px/1.7 system-ui;color:#fff;background:#0005;border-radius:12px;padding:14px;white-space:pre-wrap}#st{font:12px system-ui;color:#ffd27a;min-height:1em}.bar{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);display:flex;flex-wrap:wrap;justify-content:center;gap:6px;background:#000c;border:1px solid #fff3;border-radius:14px;padding:6px;max-width:96vw}.bar select,.bar button{background:transparent;color:#fff;border:1px solid #fff4;border-radius:8px;padding:6px 10px;font:13px system-ui}.bar option{color:#000}${mo.css}@media(prefers-reduced-motion:reduce){*{animation:none!important}}</style></head><body><div id="art">${mo.svg}</div><main>${refHtml}<div id="tx" dir="rtl" lang="ar"></div><p id="st" role="status"></p><p id="tl"></p><div id="tr"></div></main><div class="bar"><button id="pa" type="button" aria-label="Arabic voice">▶ عربي</button><select id="lg" aria-label="Language">${TR_LANGS.map(([c, nm]) => `<option value="${c}">${esc(nm)}</option>`).join('')}</select><button id="pt" type="button" aria-label="Translation voice">▶</button><select id="sp" aria-label="Speed"><option value=".8">0.8×</option><option value="1" selected>1×</option><option value="1.2">1.2×</option></select></div><script${n}>window.__H=${JSON.stringify(data).replace(/</g, '\\u003c')};${PLAYER_JS}</script></body></html>`;
}
