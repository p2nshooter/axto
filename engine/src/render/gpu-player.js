/**
 * Player HIDUP seri G- (pemilik, 23 Nov 2026: „Masa GPU cuma ngehasilin gambar … harusnya animasinya jarum jam bergerak dll").
 *
 * GPU gratis hanya menghasilkan gambar diam (model video tidak ada yang gratis), maka lukisan GPU dihidupkan di peramban —
 * tanpa biaya, tanpa server tambahan:
 *  - semua koleksi: kamera bergerak pelan (lukisan + hiasan bergerak bersama), sapuan cahaya, kilau berkedip, vignette;
 *  - Jam: kaca safir di tengah dial + jarum jam/menit/detik yang bergerak menurut waktu nyata (zona waktu bisa dipilih);
 *  - Prangko: cap pos bertanggal hari ini yang „tercap" berulang di sudut prangko;
 *  - Kaligrafi Al-Qur'an & Hadits: teks Arab ASLI dari dataset (tidak pernah dibuat mesin) di panel kosong lukisan, kata
 *    demi kata berpendar seperti dibaca, rujukan di bawahnya.
 * Satu berkas HTML mandiri (gambar dari /gpu/<c>/<id>.png, font dari /fonts/).
 */
import { esc, rng } from '../core.js';

const KACA = { time: { x: 50, y: 52, r: 17 } }; // pusat dial (persen kanvas) & jari-jari kaca safir

function kilau(seed, n = 22) {
  const r = rng(seed ^ 0x9e3779b9);
  let s = '';
  for (let i = 0; i < n; i += 1) {
    const z = 6 + Math.round(r() * 16);
    s += `<i class="sp" style="left:${(4 + r() * 92).toFixed(1)}%;top:${(4 + r() * 92).toFixed(1)}%;--z:${z}px;--d:${(2.4 + r() * 3.6).toFixed(1)}s;--l:${(r() * 6).toFixed(1)}s"></i>`;
  }
  return s;
}

/** @param d dna · @param meta metadata · @param ctx renderCtx (teks ayat/hadits) · @param o {img, g, ref} */
export function gpuPlayer(d, meta, ctx, o) {
  const kind = d.kind;
  const n = o.nonce ? ` nonce="${o.nonce}"` : '';
  const k = KACA[kind];
  let hias = '';
  let css = '';
  let js = '';
  if (kind === 'time') {
    css = `.kaca{position:absolute;left:${k.x - k.r}%;top:${k.y - k.r}%;width:${k.r * 2}%;height:${k.r * 2}%;border-radius:50%;backdrop-filter:blur(7px) saturate(1.35) brightness(1.08);-webkit-backdrop-filter:blur(7px) saturate(1.35) brightness(1.08);background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.28),rgba(255,255,255,.06) 38%,rgba(0,0,0,.18) 72%);box-shadow:inset 0 0 0 2px rgba(255,255,255,.35),inset 0 -8px 24px rgba(0,0,0,.35),0 6px 24px rgba(0,0,0,.35)}
#jr{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.tz{position:absolute;right:2%;bottom:2%;font:12px system-ui;background:rgba(0,0,0,.55);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:3px 6px;max-width:46%}`;
    const C = [k.x * 10, k.y * 10], R = k.r * 10;
    let tanda = '';
    for (let i = 0; i < 60; i += 1) {
      const a = (i / 60) * Math.PI * 2, b = i % 5 === 0 ? 0.84 : 0.9;
      tanda += `<line x1="${(C[0] + Math.sin(a) * R * b).toFixed(1)}" y1="${(C[1] - Math.cos(a) * R * b).toFixed(1)}" x2="${(C[0] + Math.sin(a) * R * 0.96).toFixed(1)}" y2="${(C[1] - Math.cos(a) * R * 0.96).toFixed(1)}" stroke="#fff" stroke-opacity="${i % 5 === 0 ? 0.9 : 0.45}" stroke-width="${i % 5 === 0 ? 3 : 1.4}" stroke-linecap="round"/>`;
    }
    hias = `<div class="kaca"></div><svg id="jr" viewBox="0 0 1000 1000" aria-hidden="true"><defs><linearGradient id="lg" x1="0" x2="1"><stop offset="0" stop-color="#fff8e1"/><stop offset=".5" stop-color="#e9c46a"/><stop offset="1" stop-color="#9a7b2f"/></linearGradient><filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${tanda}<g filter="url(#gl)"><path id="hh" d="M${C[0] - 7} ${C[1] + 14}L${C[0]} ${C[1] - R * 0.5}L${C[0] + 7} ${C[1] + 14}Z" fill="url(#lg)" stroke="#5a4515" stroke-width="1.2"/><path id="mm" d="M${C[0] - 5} ${C[1] + 18}L${C[0]} ${C[1] - R * 0.78}L${C[0] + 5} ${C[1] + 18}Z" fill="url(#lg)" stroke="#5a4515" stroke-width="1.2"/><g id="ss"><line x1="${C[0]}" y1="${C[1] + R * 0.18}" x2="${C[0]}" y2="${C[1] - R * 0.88}" stroke="#ff5a6e" stroke-width="2.4" stroke-linecap="round"/><circle cx="${C[0]}" cy="${C[1] + R * 0.12}" r="5" fill="#ff5a6e"/></g><circle cx="${C[0]}" cy="${C[1]}" r="9" fill="url(#lg)" stroke="#5a4515" stroke-width="1.5"/></g></svg>`;
    js = `const C=[${C}];const q=new URLSearchParams(location.search);let tz=q.get('tz')||Intl.DateTimeFormat().resolvedOptions().timeZone;try{const s=localStorage.getItem('axto-tz');if(s&&!q.get('tz'))tz=s}catch(e){}
const sel=document.getElementById('tz');for(const z of(Intl.supportedValuesOf?Intl.supportedValuesOf('timeZone'):[tz])){const o=document.createElement('option');o.value=o.textContent=z;if(z===tz)o.selected=true;sel.appendChild(o)}sel.onchange=()=>{tz=sel.value;try{localStorage.setItem('axto-tz',tz)}catch(e){}};
const rot=(id,deg)=>document.getElementById(id).setAttribute('transform','rotate('+deg.toFixed(2)+' '+C[0]+' '+C[1]+')');
function t(){const now=new Date();const p=new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(now);const v=x=>Number(p.find(y=>y.type===x).value);const h=v('hour')%12,m=v('minute'),s=v('second')+now.getMilliseconds()/1000;rot('ss',s*6);rot('mm',(m+s/60)*6);rot('hh',(h+m/60)*30);requestAnimationFrame(t)}t();`;
    hias += '<select id="tz" class="tz" aria-label="Zona waktu"></select>';
  } else if (kind === 'stamp') {
    css = `.cap{position:absolute;right:7%;bottom:8%;width:34%;height:34%;opacity:0;animation:cap 9s ease-out infinite;transform-origin:50% 50%}
@keyframes cap{0%,8%{opacity:0;transform:scale(1.6) rotate(-18deg)}13%{opacity:.88;transform:scale(.96) rotate(-12deg)}16%{transform:scale(1) rotate(-12deg)}82%{opacity:.82;transform:scale(1) rotate(-12deg)}100%{opacity:0;transform:scale(1) rotate(-12deg)}}`;
    hias = `<svg class="cap" viewBox="0 0 200 200" aria-hidden="true"><defs><path id="lk" d="M100 100m-74 0a74 74 0 1 1 148 0a74 74 0 1 1-148 0"/><filter id="tinta"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4"/></filter></defs><g fill="none" stroke="#1d1b3a" stroke-opacity=".85" filter="url(#tinta)"><circle cx="100" cy="100" r="92" stroke-width="5"/><circle cx="100" cy="100" r="58" stroke-width="3"/><path d="M-60 70q30-14 60 0t60 0t60 0t60 0M-60 100q30-14 60 0t60 0t60 0t60 0M-60 130q30-14 60 0t60 0t60 0t60 0" stroke-width="4" transform="translate(-150 0)"/></g><text font-family="Georgia,serif" font-size="17" font-weight="700" fill="#1d1b3a" fill-opacity=".85" letter-spacing="3"><textPath href="#lk">AXTO · POS · ${esc(String(meta.attributes.find((a) => a.trait_type === 'Realm')?.value ?? 'AXTO').toUpperCase().slice(0, 18))} ·</textPath></text><text id="tgl" x="100" y="108" text-anchor="middle" font-family="Georgia,serif" font-size="22" font-weight="700" fill="#1d1b3a" fill-opacity=".9"></text></svg>`;
    js = "document.getElementById('tgl').textContent=new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase();";
  } else {
    // quran / hadith: teks Arab asli di panel kosong lukisan
    const ar = String(ctx.ar ?? (ctx.lines ?? []).slice(0, 3).join(' ')).replace(/\s+/g, ' ').trim();
    const kata = ar.split(' ').filter(Boolean);
    css = `.panel{position:absolute;left:19%;right:19%;top:30%;bottom:30%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2%;padding:3%;border-radius:18px;background:radial-gradient(ellipse at 50% 40%,rgba(10,12,24,.62),rgba(10,12,24,.78));border:1.5px solid rgba(233,196,106,.75);box-shadow:0 0 0 6px rgba(233,196,106,.12),0 10px 40px rgba(0,0,0,.45);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
@font-face{font-family:'Amiri Quran';src:url(/fonts/amiri-quran-arabic.woff2) format('woff2');font-display:swap}
#ar{font-family:'Amiri Quran',serif;direction:rtl;text-align:center;line-height:1.9;color:#f3dfa2;text-shadow:0 0 12px rgba(233,196,106,.45);max-height:84%;overflow:hidden;word-spacing:.08em}
#ar .w{transition:color .4s,text-shadow .4s}#ar .w.on{color:#fffbe8;text-shadow:0 0 14px #ffd76a,0 0 28px rgba(255,215,106,.7)}
.ruj{font:600 clamp(9px,2.2vmin,16px) Georgia,serif;color:#e9c46a;letter-spacing:.06em}`;
    hias = `<div class="panel"><div id="ar" lang="ar">${kata.map((w) => `<span class="w">${esc(w)}</span>`).join(' ')}</div>${o.ref ? `<div class="ruj">${esc(o.ref)}</div>` : ''}</div>`;
    js = `const A=document.getElementById('ar'),P=A.parentElement;let f=Math.min(window.innerWidth,window.innerHeight)*0.07;function pas(){A.style.fontSize=f+'px';let i=0;while((A.scrollHeight>P.clientHeight*0.84||A.scrollWidth>P.clientWidth*0.96)&&i<60){f*=0.93;A.style.fontSize=f+'px';i++}}pas();addEventListener('resize',()=>{f=Math.min(innerWidth,innerHeight)*0.07;pas()});document.fonts&&document.fonts.ready.then(pas);
const W=[...A.querySelectorAll('.w')];let j=0;setInterval(()=>{W.forEach(x=>x.classList.remove('on'));if(W.length){W[j%W.length].classList.add('on');j++}},${Math.max(450, Math.min(1100, Math.round(14000 / Math.max(1, kata.length))))});`;
  }
  const fokus = k ? `${k.x}% ${k.y}%` : '50% 50%';
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.name)} — G-${o.g}</title><style${n}>html,body{margin:0;height:100%;background:#05060c;overflow:hidden}
#s{position:absolute;left:50%;top:50%;width:100vmin;height:100vmin;transform:translate(-50%,-50%);overflow:hidden;border-radius:2px}
.cam{position:absolute;inset:0;transform-origin:${fokus};animation:kb 28s ease-in-out infinite alternate}
@keyframes kb{from{transform:scale(1.015)}to{transform:scale(1.09) translate(-.8%,.6%)}}
.img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sheen{position:absolute;inset:-30%;background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.2) 50%,transparent 58%);mix-blend-mode:screen;animation:sh 8s ease-in-out infinite;pointer-events:none}
@keyframes sh{0%{transform:translateX(-60%)}55%,100%{transform:translateX(60%)}}
.sp{position:absolute;width:var(--z);height:var(--z);margin:calc(var(--z)/-2) 0 0 calc(var(--z)/-2);opacity:0;animation:tw var(--d) ease-in-out var(--l) infinite;pointer-events:none;background:radial-gradient(circle,#fff 0,rgba(255,255,255,.7) 18%,transparent 55%)}
.sp::before,.sp::after{content:'';position:absolute;left:50%;top:-40%;bottom:-40%;width:1.2px;margin-left:-.6px;background:linear-gradient(transparent,#fff,transparent)}.sp::after{transform:rotate(90deg)}
@keyframes tw{0%,100%{opacity:0;transform:scale(.2) rotate(0)}50%{opacity:1;transform:scale(1) rotate(45deg)}}
.vig{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,transparent 58%,rgba(0,0,0,.42));pointer-events:none}
.g{position:absolute;left:2.5%;top:2.5%;padding:.25em .75em;border-radius:999px;background:rgba(13,42,32,.86);color:#9be3c4;font:700 clamp(10px,2.4vmin,15px) system-ui;border:1px solid #2a5a52}
${css}
@media(prefers-reduced-motion:reduce){.cam,.sheen,.sp,.cap{animation:none!important}.sp{opacity:.6}.cap{opacity:.85}}
</style></head><body><div id="s"><div class="cam"><img class="img" src="${esc(o.img)}" alt="${esc(meta.name)} — G-${o.g}">${kind === 'time' ? hias.replace(/<select[\s\S]*<\/select>/, '') : hias}${kilau(d.seed)}<div class="sheen"></div></div><div class="vig"></div><span class="g">G-${o.g}</span>${kind === 'time' ? '<select id="tz" class="tz" aria-label="Zona waktu"></select>' : ''}</div><script${n}>${js}</script></body></html>`;
}
