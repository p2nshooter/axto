/**
 * Player seri G- — animasi 100% buatan GPU yang INTERAKTIF (pemilik, 24 Nov 2026: „Series G- wajib sudah dengan animasi saat
 * produksi, jd 100% di buatkan GPU" · „hasil NFT 100% sudah keluar dengan animasi yg interaktif").
 *
 * Gerak karya = video buatan GPU dari lukisan G- (Wan 2.2 I2V / LTX-Video). Peramban TIDAK menambah animasi tiruan; ia hanya
 * memberi kendali atas video GPU itu:
 *   · miringkan — kartu condong mengikuti jari/tetikus atau kemiringan ponsel (3D),
 *   · geser kiri/kanan — memutar maju/mundur bingkai video GPU,
 *   · ketuk — jeda/putar · ketuk dua kali — layar penuh · papan tik: spasi, ← →, F.
 *
 * Satu-satunya yang bukan buatan GPU: teks Arab ASLI ayat/hadits (aturan tetap: teks Al-Qur'an & hadits tidak pernah dibuat
 * mesin). Teks diletakkan TEPAT di panel kosong lukisan — posisi panel diukur pemeriksa mutu dari lukisan itu sendiri
 * (`qa.panel`, pecahan lebar/tinggi) — tanpa kotak tempelan; warna teks mengikuti terang/gelapnya panel.
 */
import { esc } from '../core.js';

/** @param d dna · @param meta metadata · @param ctx renderCtx (teks ayat/hadits) · @param o {img, video, g, ref, qa, nonce} */
export function gpuPlayer(d, meta, ctx, o) {
  const kind = d.kind;
  const n = o.nonce ? ` nonce="${o.nonce}"` : '';
  const pnl = Array.isArray(o.qa?.panel) && o.qa.panel.length === 4 ? o.qa.panel.map(Number) : null;
  const gelap = o.qa?.nada === 'gelap';
  let panel = '';
  let css = '';
  if ((kind === 'quran' || kind === 'hadith') && pnl) {
    const ar = String(ctx.ar ?? (ctx.lines ?? []).slice(0, 3).join(' ')).replace(/\s+/g, ' ').trim();
    if (ar) {
      css = `@font-face{font-family:'Amiri Quran';src:url(/fonts/amiri-quran-arabic.woff2) format('woff2');font-display:swap}
#pn{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3%;padding:5% 6%;box-sizing:border-box;pointer-events:none;overflow:hidden}
#ar{font-family:'Amiri Quran',serif;direction:rtl;text-align:center;line-height:1.9;color:${gelap ? '#f3dfa2' : '#2e1d0c'};text-shadow:${gelap ? '0 1px 2px rgba(0,0,0,.55)' : '0 1px 0 rgba(255,250,235,.6)'}}
.ruj{font:600 clamp(8px,2vmin,15px) Georgia,serif;letter-spacing:.06em;color:${gelap ? '#e9c46a' : '#6b4a1c'}}`;
      panel = `<div id="pn" data-p="${pnl.join(',')}"><div id="ar" lang="ar">${esc(ar)}</div>${o.ref ? `<div class="ruj">${esc(o.ref)}</div>` : ''}</div>`;
    }
  }
  const hint = 'Geser untuk memutar · ketuk untuk jeda';
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.name)} — G-${o.g}</title><style${n}>html,body{margin:0;height:100%;background:#05060c;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
#s{position:absolute;left:50%;top:50%;width:100vmin;height:100vmin;transform:translate(-50%,-50%);perspective:1100px;cursor:grab}
#s:active{cursor:grabbing}
#k{position:absolute;inset:3%;transform-style:preserve-3d;transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .35s cubic-bezier(.2,.7,.2,1);border-radius:14px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.55)}
video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;pointer-events:none}
.g{position:absolute;left:4.5%;top:4.5%;padding:.25em .75em;border-radius:999px;background:rgba(13,42,32,.86);color:#9be3c4;font:700 clamp(10px,2.4vmin,15px) system-ui;border:1px solid #2a5a52;pointer-events:none}
.bar{position:absolute;left:8%;right:8%;bottom:1.2%;height:3px;border-radius:3px;background:rgba(255,255,255,.14);pointer-events:none}
.bar i{display:block;height:100%;width:0;border-radius:3px;background:#e9c46a}
.ht{position:absolute;left:50%;bottom:5%;transform:translateX(-50%);padding:.35em .9em;border-radius:999px;background:rgba(5,6,12,.72);color:#e8e6df;font:500 clamp(10px,2.2vmin,14px) system-ui;pointer-events:none;transition:opacity .6s;white-space:nowrap}
.jeda .ht::after{content:' · dijeda'}
@media (prefers-reduced-motion:reduce){#k{transition:none}}
${css}</style></head><body><div id="s" tabindex="0" role="application" aria-label="${esc(meta.name)} — G-${o.g}. ${hint}"><div id="k"><video id="v" src="${esc(o.video)}" poster="${esc(o.img)}" autoplay muted loop playsinline preload="auto"></video>${panel}</div><span class="g">G-${o.g}</span><div class="bar"><i id="pr"></i></div><div class="ht" id="ht">${hint}</div></div>
<script${n}>(()=>{const S=document.getElementById('s'),K=document.getElementById('k'),V=document.getElementById('v'),PR=document.getElementById('pr'),HT=document.getElementById('ht'),PN=document.getElementById('pn');
const diam=matchMedia('(prefers-reduced-motion: reduce)').matches;
const miring=(x,y)=>{if(diam)return;K.style.setProperty('--ry',(x*16).toFixed(2)+'deg');K.style.setProperty('--rx',(-y*16).toFixed(2)+'deg')};
const lurus=()=>{K.style.setProperty('--rx','0deg');K.style.setProperty('--ry','0deg')};
function letak(){if(!PN)return;const p=PN.dataset.p.split(',').map(Number),W=K.clientWidth,H=K.clientHeight,vw=V.videoWidth||1,vh=V.videoHeight||1,s=Math.min(W/vw,H/vh),w=vw*s,h=vh*s,ox=(W-w)/2,oy=(H-h)/2;
Object.assign(PN.style,{left:ox+p[0]*w+'px',top:oy+p[1]*h+'px',width:(p[2]-p[0])*w+'px',height:(p[3]-p[1])*h+'px'});
const A=document.getElementById('ar');let f=Math.min(W,H)*0.075;A.style.fontSize=f+'px';let i=0;while((PN.scrollHeight>PN.clientHeight+1||A.scrollWidth>A.clientWidth+1)&&i<70){f*=0.93;A.style.fontSize=f+'px';i++}}
letak();V.addEventListener('loadedmetadata',letak);addEventListener('resize',letak);document.fonts&&document.fonts.ready.then(letak);
V.addEventListener('timeupdate',()=>{if(V.duration)PR.style.width=(100*V.currentTime/V.duration)+'%'});
setTimeout(()=>{HT.style.opacity='0'},2800);
const keadaan=()=>{S.classList.toggle('jeda',V.paused);HT.style.opacity=V.paused?'1':'0'};
const putar=()=>{V.paused?V.play().catch(()=>{}):V.pause();keadaan()};
const layar=()=>{document.fullscreenElement?document.exitFullscreen().catch(()=>{}):S.requestFullscreen&&S.requestFullscreen().catch(()=>{})};
let tekan=null,ketukAkhir=0;
S.addEventListener('pointermove',(e)=>{const r=S.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-0.5,y=(e.clientY-r.top)/r.height-0.5;
if(tekan){const dx=e.clientX-tekan.x;if(Math.abs(dx)>6)tekan.geser=true;if(tekan.geser&&V.duration){V.currentTime=Math.min(V.duration-0.01,Math.max(0,tekan.t+dx/r.width*V.duration*1.2));PR.style.width=(100*V.currentTime/V.duration)+'%'}}
miring(x,y)});
S.addEventListener('pointerleave',()=>{if(!tekan)lurus()});
S.addEventListener('pointerdown',(e)=>{S.setPointerCapture(e.pointerId);tekan={x:e.clientX,t:V.currentTime,main:!V.paused,geser:false,at:Date.now()};if(!V.paused)V.pause()});
const lepas=(e)=>{if(!tekan)return;const t=tekan;tekan=null;if(t.geser){if(t.main)V.play().catch(()=>{});keadaan();if(e.pointerType!=='mouse')lurus();return}
if(t.main)V.play().catch(()=>{});const now=Date.now();if(now-ketukAkhir<320){ketukAkhir=0;layar();return}ketukAkhir=now;setTimeout(()=>{if(ketukAkhir===now){putar()}},330);if(e.pointerType!=='mouse')lurus()};
S.addEventListener('pointerup',lepas);S.addEventListener('pointercancel',lepas);
S.addEventListener('keydown',(e)=>{if(e.key===' '||e.key==='k'){e.preventDefault();putar()}else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){V.currentTime=Math.max(0,V.currentTime+(e.key==='ArrowRight'?0.2:-0.2))}else if(e.key==='f'){layar()}});
addEventListener('deviceorientation',(e)=>{if(tekan||e.gamma==null)return;miring(Math.max(-0.5,Math.min(0.5,e.gamma/60)),Math.max(-0.5,Math.min(0.5,(e.beta-45)/60)))});
V.play().catch(()=>{});})();</script></body></html>`;
}
