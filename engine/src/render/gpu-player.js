/**
 * Player seri G- — 100% animasi buatan GPU (pemilik, 24 Nov 2026: „Series G- wajib sudah dengan animasi saat produksi, jd
 * 100% di buatkan GPU"). Lukisan G- dibuat GPU (gambar), lalu GPU yang sama-sama gratis (ZeroGPU, Wan 2.2 I2V / LTX-Video)
 * mengubahnya menjadi video; player ini hanya memutar video itu berulang — tanpa animasi tiruan di peramban.
 *
 * Satu-satunya yang bukan buatan GPU: teks Arab ASLI ayat/hadits pada koleksi Kaligrafi Al-Qur'an & Hadits (aturan tetap:
 * teks Al-Qur'an & hadits tidak pernah dibuat mesin), ditampilkan diam di panel kosong lukisan. Jam & Prangko tanpa teks.
 */
import { esc } from '../core.js';

/** @param d dna · @param meta metadata · @param ctx renderCtx (teks ayat/hadits) · @param o {img, video, g, ref} */
export function gpuPlayer(d, meta, ctx, o) {
  const kind = d.kind;
  const n = o.nonce ? ` nonce="${o.nonce}"` : '';
  let panel = '';
  let css = '';
  if (kind === 'quran' || kind === 'hadith') {
    const ar = String(ctx.ar ?? (ctx.lines ?? []).slice(0, 3).join(' ')).replace(/\s+/g, ' ').trim();
    if (ar) {
      css = `@font-face{font-family:'Amiri Quran';src:url(/fonts/amiri-quran-arabic.woff2) format('woff2');font-display:swap}
.panel{position:absolute;left:19%;right:19%;top:30%;bottom:30%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2%;padding:3%;border-radius:18px;background:rgba(10,12,24,.72);border:1.5px solid rgba(233,196,106,.75)}
#ar{font-family:'Amiri Quran',serif;direction:rtl;text-align:center;line-height:1.9;color:#f3dfa2;max-height:84%;overflow:hidden}
.ruj{font:600 clamp(9px,2.2vmin,16px) Georgia,serif;color:#e9c46a;letter-spacing:.06em}`;
      panel = `<div class="panel"><div id="ar" lang="ar">${esc(ar)}</div>${o.ref ? `<div class="ruj">${esc(o.ref)}</div>` : ''}</div><script${n}>const A=document.getElementById('ar'),P=A.parentElement;function pas(){let f=Math.min(innerWidth,innerHeight)*0.07;A.style.fontSize=f+'px';let i=0;while((A.scrollHeight>P.clientHeight*0.84||A.scrollWidth>P.clientWidth*0.96)&&i<60){f*=0.93;A.style.fontSize=f+'px';i++}}pas();addEventListener('resize',pas);document.fonts&&document.fonts.ready.then(pas);</script>`;
    }
  }
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.name)} — G-${o.g}</title><style${n}>html,body{margin:0;height:100%;background:#05060c;overflow:hidden}
#s{position:absolute;left:50%;top:50%;width:100vmin;height:100vmin;transform:translate(-50%,-50%);overflow:hidden}
video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000}
.g{position:absolute;left:2.5%;top:2.5%;padding:.25em .75em;border-radius:999px;background:rgba(13,42,32,.86);color:#9be3c4;font:700 clamp(10px,2.4vmin,15px) system-ui;border:1px solid #2a5a52}
${css}</style></head><body><div id="s"><video src="${esc(o.video)}" poster="${esc(o.img)}" autoplay muted loop playsinline preload="auto" aria-label="${esc(meta.name)} — G-${o.g}"></video>${panel}<span class="g">G-${o.g}</span></div></body></html>`;
}
