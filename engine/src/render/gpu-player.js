/**
 * Player seri G- — animasi 100% buatan GPU yang INTERAKTIF (pemilik, 24 Nov 2026: „Series G- wajib sudah dengan animasi saat
 * produksi, jd 100% di buatkan GPU" · „hasil NFT 100% sudah keluar dengan animasi yg interaktif").
 *
 * Gerak karya = video buatan GPU dari lukisan G- (Wan 2.2 I2V / LTX-Video). Peramban TIDAK menambah animasi tiruan; ia hanya
 * memberi kendali atas video GPU itu:
 *   · miringkan — kartu condong mengikuti jari/tetikus atau kemiringan ponsel (3D),
 *   · geser kiri/kanan — memutar maju/mundur bingkai video GPU,
 *   · ketuk — jeda/putar · ketuk dua kali — layar penuh · papan tik: spasi, ← →, F.
 * Tanpa label apa pun di atas karya (pemilik: „jgn ada label, biar bersih"): bilah posisi tipis hanya muncul saat digeser/dijeda.
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
  // pemilik, 24 Nov 2026: „Hapus aja jgn ada label, biar bersih" — tidak ada lencana kode, teks petunjuk, atau tulisan apa
  // pun di atas karya; petunjuk hanya untuk pembaca layar (aria-label).
  const hint = 'Geser untuk memutar · ketuk untuk jeda · ketuk dua kali untuk layar penuh';
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.name)} — ${esc(o.kode ?? `G-${o.g}`)}</title><style${n}>html,body{margin:0;height:100%;background:#05060c;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
#s{position:absolute;left:50%;top:50%;width:100vmin;height:100vmin;transform:translate(-50%,-50%);perspective:1100px;cursor:grab}
#s:active{cursor:grabbing}
#k{position:absolute;inset:3%;transform-style:preserve-3d;transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .35s cubic-bezier(.2,.7,.2,1);border-radius:14px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.55)}
video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;pointer-events:none}
.bar{position:absolute;left:8%;right:8%;bottom:1.2%;height:3px;border-radius:3px;background:rgba(255,255,255,.14);pointer-events:none;opacity:0;transition:opacity .4s}
.bar i{display:block;height:100%;width:0;border-radius:3px;background:#e9c46a}
.ubah .bar,.jeda .bar{opacity:1}
@media (prefers-reduced-motion:reduce){#k{transition:none}}
${css}</style></head><body><div id="s" tabindex="0" role="application" aria-label="${esc(meta.name)} — ${esc(o.kode ?? `G-${o.g}`)}. ${hint}"><div id="k"><video id="v" src="${esc(o.video)}" poster="${esc(o.img)}" autoplay muted loop playsinline preload="auto"></video>${panel}</div><div class="bar"><i id="pr"></i></div></div>
<script${n}>(()=>{const S=document.getElementById('s'),K=document.getElementById('k'),V=document.getElementById('v'),PR=document.getElementById('pr'),PN=document.getElementById('pn');
const diam=matchMedia('(prefers-reduced-motion: reduce)').matches;
const miring=(x,y)=>{if(diam)return;K.style.setProperty('--ry',(x*16).toFixed(2)+'deg');K.style.setProperty('--rx',(-y*16).toFixed(2)+'deg')};
const lurus=()=>{K.style.setProperty('--rx','0deg');K.style.setProperty('--ry','0deg')};
function letak(){if(!PN)return;const p=PN.dataset.p.split(',').map(Number),W=K.clientWidth,H=K.clientHeight,vw=V.videoWidth||1,vh=V.videoHeight||1,s=Math.min(W/vw,H/vh),w=vw*s,h=vh*s,ox=(W-w)/2,oy=(H-h)/2;
Object.assign(PN.style,{left:ox+p[0]*w+'px',top:oy+p[1]*h+'px',width:(p[2]-p[0])*w+'px',height:(p[3]-p[1])*h+'px'});
const A=document.getElementById('ar');let f=Math.min(W,H)*0.075;A.style.fontSize=f+'px';let i=0;while((PN.scrollHeight>PN.clientHeight+1||A.scrollWidth>A.clientWidth+1)&&i<70){f*=0.93;A.style.fontSize=f+'px';i++}}
letak();V.addEventListener('loadedmetadata',letak);addEventListener('resize',letak);document.fonts&&document.fonts.ready.then(letak);
V.addEventListener('timeupdate',()=>{if(V.duration)PR.style.width=(100*V.currentTime/V.duration)+'%'});
const keadaan=()=>{S.classList.toggle('jeda',V.paused)};
const putar=()=>{V.paused?V.play().catch(()=>{}):V.pause();keadaan()};
const layar=()=>{document.fullscreenElement?document.exitFullscreen().catch(()=>{}):S.requestFullscreen&&S.requestFullscreen().catch(()=>{})};
let tekan=null,ketukAkhir=0;
S.addEventListener('pointermove',(e)=>{const r=S.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-0.5,y=(e.clientY-r.top)/r.height-0.5;
if(tekan){const dx=e.clientX-tekan.x;if(Math.abs(dx)>6)tekan.geser=true;if(tekan.geser&&V.duration){V.currentTime=Math.min(V.duration-0.01,Math.max(0,tekan.t+dx/r.width*V.duration*1.2));PR.style.width=(100*V.currentTime/V.duration)+'%'}}
miring(x,y)});
S.addEventListener('pointerleave',()=>{if(!tekan)lurus()});
S.addEventListener('pointerdown',(e)=>{S.setPointerCapture(e.pointerId);S.classList.add('ubah');tekan={x:e.clientX,t:V.currentTime,main:!V.paused,geser:false,at:Date.now()};if(!V.paused)V.pause()});
const lepas=(e)=>{if(!tekan)return;const t=tekan;tekan=null;S.classList.remove('ubah');if(t.geser){if(t.main)V.play().catch(()=>{});keadaan();if(e.pointerType!=='mouse')lurus();return}
if(t.main)V.play().catch(()=>{});const now=Date.now();if(now-ketukAkhir<320){ketukAkhir=0;layar();return}ketukAkhir=now;setTimeout(()=>{if(ketukAkhir===now){putar()}},330);if(e.pointerType!=='mouse')lurus()};
S.addEventListener('pointerup',lepas);S.addEventListener('pointercancel',lepas);
S.addEventListener('keydown',(e)=>{if(e.key===' '||e.key==='k'){e.preventDefault();putar()}else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){V.currentTime=Math.max(0,V.currentTime+(e.key==='ArrowRight'?0.2:-0.2))}else if(e.key==='f'){layar()}});
addEventListener('deviceorientation',(e)=>{if(tekan||e.gamma==null)return;miring(Math.max(-0.5,Math.min(0.5,e.gamma/60)),Math.max(-0.5,Math.min(0.5,(e.beta-45)/60)))});
V.play().catch(()=>{});})();</script></body></html>`;
}

/**
 * Karya G- LAMA (pemilik, 24 Nov 2026: „Series G- yg sudah terlanjur di buat, kembalikan ke gambar aslinya tanpa animasi"):
 * hanya lukisan GPU aslinya, diam — tanpa video, tanpa skrip, tanpa jarum/panel/teks tempelan.
 */
export function gpuGambar(meta, o) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.name)} — ${esc(o.kode ?? `G-${o.g}`)}</title><style${o.nonce ? ` nonce="${o.nonce}"` : ''}>html,body{margin:0;height:100%;background:#05060c;overflow:hidden}
img{position:absolute;left:50%;top:50%;width:100vmin;height:100vmin;transform:translate(-50%,-50%);object-fit:contain}
</style></head><body><img src="${esc(o.img)}" alt="${esc(meta.name)} — ${esc(o.kode ?? `G-${o.g}`)}"></body></html>`;
}

/**
 * Seri G- STATIS (pemilik, 25 Nov 2026: „series G- produksi statik aja kaya di awal, ga usah ada animasi, tp jg jgn ada tanda
 * air, bersih aja" · „cukup gambar statik berkualitas"): lukisan GPU diam, tanpa video, tanpa gerak, tanpa label. Untuk
 * Qur'an & hadits, teks Arab ASLI diletakkan tepat di panel kosong lukisan (`qa.panel`, pecahan lebar/tinggi; lukisan
 * persegi mengisi panggung persegi sehingga posisi cukup dengan persen). Skrip hanya mengecilkan huruf agar muat — sekali,
 * tanpa animasi.
 * @param d dna · @param meta metadata · @param ctx renderCtx (teks ayat/hadits) · @param o {img, g, kode, ref, qa, nonce}
 */
export function gpuStatis(d, meta, ctx, o) {
  const n = o.nonce ? ` nonce="${o.nonce}"` : '';
  const pnl = Array.isArray(o.qa?.panel) && o.qa.panel.length === 4 ? o.qa.panel.map(Number) : null;
  const gelap = o.qa?.nada === 'gelap';
  let panel = '';
  let css = '';
  let fit = '';
  if ((d.kind === 'quran' || d.kind === 'hadith') && pnl) {
    const ar = String(ctx.ar ?? (ctx.lines ?? []).slice(0, 3).join(' ')).replace(/\s+/g, ' ').trim();
    if (ar) {
      const pct = (v) => `${(v * 100).toFixed(3)}%`;
      css = `@font-face{font-family:'Amiri Quran';src:url(/fonts/amiri-quran-arabic.woff2) format('woff2');font-display:swap}
#pn{position:absolute;left:${pct(pnl[0])};top:${pct(pnl[1])};width:${pct(pnl[2] - pnl[0])};height:${pct(pnl[3] - pnl[1])};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3%;padding:5% 6%;box-sizing:border-box;overflow:hidden}
#ar{font-family:'Amiri Quran',serif;direction:rtl;text-align:center;line-height:1.9;font-size:7vmin;color:${gelap ? '#f3dfa2' : '#2e1d0c'};text-shadow:${gelap ? '0 1px 2px rgba(0,0,0,.55)' : '0 1px 0 rgba(255,250,235,.6)'}}
.ruj{font:600 clamp(8px,2vmin,15px) Georgia,serif;letter-spacing:.06em;color:${gelap ? '#e9c46a' : '#6b4a1c'}}`;
      panel = `<div id="pn"><div id="ar" lang="ar">${esc(ar)}</div>${o.ref ? `<div class="ruj">${esc(o.ref)}</div>` : ''}</div>`;
      fit = `<script${n}>(()=>{const P=document.getElementById('pn'),A=document.getElementById('ar');function muat(){let f=Math.min(innerWidth,innerHeight)*0.07,i=0;A.style.fontSize=f+'px';while((P.scrollHeight>P.clientHeight+1||A.scrollWidth>A.clientWidth+1)&&i<70){f*=0.93;A.style.fontSize=f+'px';i++}}muat();addEventListener('resize',muat);document.fonts&&document.fonts.ready.then(muat)})();</script>`;
    }
  }
  const nama = `${meta.name} — ${o.kode ?? `G-${o.g}`}`;
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(nama)}</title><style${n}>html,body{margin:0;height:100%;background:#05060c;overflow:hidden}
#k{position:absolute;left:50%;top:50%;width:100vmin;height:100vmin;transform:translate(-50%,-50%)}
#k img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
${css}</style></head><body><div id="k" role="img" aria-label="${esc(nama)}"><img src="${esc(o.img)}" alt="${esc(nama)}">${panel}</div>${fit}</body></html>`;
}
