/**
 * Genom gerak per NFT (perintah pemilik #43: „CSS dan animasinya bikin lebih unik lg di setiap NFT, jgn pernah ada yg
 * sama, CSS jam digital, prangko, alquranya masih terlalu klasik").
 *
 * Setiap token mendapat kombinasi gerak sendiri: efek utama × lapisan suasana × gerak objek × tempo × kurva easing × arah ×
 * rona cahaya × fase. Kombinasi diambil dari permutasi Feistel BIJEKTIF atas ruang ≥ 11 juta, sehingga dua token dalam satu
 * koleksi TIDAK PERNAH bergerak sama (bukan sekadar „jarang sama"). Posisi partikel, sudut dan amplitudo ditambah jitter
 * kontinu dari hash token. Gaya klasik (satu sapuan cahaya, kedip seragam) diganti efek modern: glitch, hologram, scanline,
 * grid synthwave, radar, hujan matriks untuk jam; foil holografik, emboss, prisma, glitter, kaustik untuk prangko; jejak
 * cahaya emas, mawar iluminasi, sinar nur, aurora dan lentera untuk Al-Qur'an — teks ayat TIDAK PERNAH digerakkan/didistorsi,
 * hanya cahaya di sekitarnya yang hidup.
 *
 * Kait di SVG: kelas `mxo` (objek), `mxf` (bingkai emas Qur'an), `mxb` (isi prangko), clipPath `#mxclip` (kertas prangko),
 * `#digits` (angka jam). Semua animasi berhenti bila pengguna memilih prefers-reduced-motion.
 */
import { collection, permute, decodeRadix, product, rng, hash32 } from '../core.js';

const R = (n) => Math.round(n * 10) / 10;
export const TEMPO = [0.55, 0.65, 0.75, 0.85, 1, 1.15, 1.3, 1.5, 1.75, 2.1];
export const EASE = ['cubic-bezier(.68,-.55,.27,1.55)', 'cubic-bezier(.22,1,.36,1)', 'cubic-bezier(.65,0,.35,1)', 'cubic-bezier(.34,1.56,.64,1)', 'cubic-bezier(.87,0,.13,1)', 'linear', 'cubic-bezier(.45,.05,.55,.95)', 'cubic-bezier(.7,0,.84,0)'];
export const DIR = ['normal', 'reverse', 'alternate', 'alternate-reverse'];

// ------------------------------------------------------------------------------------------------ lapisan suasana (bersama)
const AMB = {
  scanlines: (P) => ({ over: `<defs><pattern id="mxsl" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="2" fill="${P.A}" opacity=".16"/></pattern><linearGradient id="mxsb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.A}" stop-opacity="0"/><stop offset=".5" stop-color="${P.A}" stop-opacity=".22"/><stop offset="1" stop-color="${P.A}" stop-opacity="0"/></linearGradient></defs><g style="mix-blend-mode:screen"><rect class="mxsl" x="0" y="-8" width="1000" height="1016" fill="url(#mxsl)"/><rect class="mxsb" x="0" y="-160" width="1000" height="${R(90 + P.J() * 80)}" fill="url(#mxsb)"/></g>`, css: `.mxsl{animation:mxsl ${R(0.6 * P.T)}s linear infinite}.mxsb{animation:mxsb ${R(5.5 * P.T)}s ${P.E} ${P.ph}s infinite}@keyframes mxsl{to{transform:translateY(8px)}}@keyframes mxsb{to{transform:translateY(1260px)}}` }),
  grid: (P) => {
    let v = '';
    for (let i = -8; i <= 8; i += 1) v += `<path d="M500 560L${R(500 + i * 120)} 1000" />`;
    let h = '';
    for (let i = 0; i < 8; i += 1) h += `<path d="M0 ${R(560 + i * 60)}H1000"/>`;
    return { under: `<g stroke="${P.A}" stroke-opacity=".32" stroke-width="2" fill="none">${v}<g class="mxgr">${h}</g></g><rect x="0" y="540" width="1000" height="40" fill="${P.A}" opacity=".12"/>`, css: `.mxgr{animation:mxgr ${R(2.4 * P.T)}s linear infinite}@keyframes mxgr{to{transform:translateY(60px)}}` };
  },
  rain: (P) => {
    let s = '';
    let css = '';
    for (let i = 0; i < 22; i += 1) {
      const x = R(20 + i * 44 + P.J() * 18);
      const d = R((2.2 + P.J() * 2.6) * P.T);
      s += `<g class="mxr${i}">${Array.from({ length: 6 }, (_, k) => `<rect x="${x}" y="${-k * 26}" width="10" height="16" rx="2" fill="${P.A}" opacity="${R(1 - k * 0.15)}"/>`).join('')}</g>`;
      css += `.mxr${i}{animation:mxr ${d}s linear ${R(-P.J() * 4)}s infinite}`;
    }
    return { under: `<g opacity=".38">${s}</g>`, css: `${css}@keyframes mxr{to{transform:translateY(1150px)}}` };
  },
  radar: (P) => ({ under: `<defs><linearGradient id="mxrg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.A}" stop-opacity="0"/><stop offset="1" stop-color="${P.A}" stop-opacity=".45"/></linearGradient></defs><g fill="none" stroke="${P.A}" stroke-opacity=".22"><circle cx="500" cy="500" r="200"/><circle cx="500" cy="500" r="330"/><circle cx="500" cy="500" r="460"/></g><path class="mxrd" d="M500 500L960 500A460 460 0 0 0 ${R(500 + 460 * Math.cos(-0.7))} ${R(500 + 460 * Math.sin(-0.7))}Z" fill="url(#mxrg)"/>`, css: `.mxrd{transform-origin:500px 500px;animation:mxrd ${R(4.5 * P.T)}s linear infinite ${P.D === 'reverse' || P.D === 'alternate-reverse' ? 'reverse' : 'normal'}}@keyframes mxrd{to{transform:rotate(360deg)}}` }),
  ripple: (P) => ({ under: `<g fill="none" stroke="${P.A}" stroke-width="3">${[0, 1, 2].map((i) => `<circle class="mxrp" cx="500" cy="500" r="300" style="animation-delay:${R(-i * 1.4 * P.T)}s"/>`).join('')}</g>`, css: `.mxrp{transform-origin:500px 500px;opacity:0;animation:mxrp ${R(4.2 * P.T)}s ${P.E} infinite}@keyframes mxrp{0%{transform:scale(.25);opacity:.55}100%{transform:scale(1.7);opacity:0}}` }),
  aurora: (P) => ({ under: `<defs><radialGradient id="mxa1"><stop offset="0" stop-color="${P.A}" stop-opacity=".42"/><stop offset="1" stop-color="${P.A}" stop-opacity="0"/></radialGradient><radialGradient id="mxa2"><stop offset="0" stop-color="${P.B}" stop-opacity=".38"/><stop offset="1" stop-color="${P.B}" stop-opacity="0"/></radialGradient></defs><ellipse class="mxa1" cx="${R(260 + P.J() * 120)}" cy="${R(220 + P.J() * 120)}" rx="520" ry="180" fill="url(#mxa1)"/><ellipse class="mxa2" cx="${R(700 + P.J() * 120)}" cy="${R(760 + P.J() * 100)}" rx="560" ry="200" fill="url(#mxa2)"/>`, css: `.mxa1{transform-origin:500px 300px;animation:mxa1 ${R(9 * P.T)}s ${P.E} ${P.ph}s infinite alternate}.mxa2{transform-origin:500px 700px;animation:mxa2 ${R(11 * P.T)}s ${P.E} infinite alternate}@keyframes mxa1{to{transform:translateX(160px) rotate(${R(8 + P.J() * 10)}deg) scaleY(1.3)}}@keyframes mxa2{to{transform:translateX(-180px) rotate(-${R(6 + P.J() * 10)}deg) scaleY(.8)}}` }),
  sparks: (P) => {
    let s = '';
    let css = '';
    for (let i = 0; i < 7; i += 1) {
      const r = R(300 + P.J() * 170);
      s += `<g class="mxo${i}"><circle cx="${R(500 + r)}" cy="500" r="${R(3 + P.J() * 5)}" fill="${i % 2 ? P.A : P.B}"/><circle cx="${R(500 + r - 14)}" cy="500" r="2" fill="${P.A}" opacity=".5"/></g>`;
      css += `.mxo${i}{transform-origin:500px 500px;animation:mxsp ${R((5 + P.J() * 9) * P.T)}s linear ${R(-P.J() * 10)}s infinite ${i % 2 ? 'reverse' : 'normal'}}`;
    }
    return { over: `<g style="mix-blend-mode:screen">${s}</g>`, css: `${css}@keyframes mxsp{from{transform:rotate(0)}to{transform:rotate(360deg)}}` };
  },
  warp: (P) => {
    let s = '';
    for (let i = 0; i < 32; i += 1) {
      const a = (i / 32) * Math.PI * 2 + P.J() * 0.15;
      s += `<path class="mxw" d="M${R(500 + 60 * Math.cos(a))} ${R(500 + 60 * Math.sin(a))}L${R(500 + 130 * Math.cos(a))} ${R(500 + 130 * Math.sin(a))}" style="animation-delay:${R(-P.J() * 2.5)}s"/>`;
    }
    return { under: `<g stroke="${P.A}" stroke-width="3" stroke-linecap="round">${s}</g>`, css: `.mxw{transform-origin:500px 500px;animation:mxw ${R(2.5 * P.T)}s cubic-bezier(.7,0,.84,0) infinite}@keyframes mxw{0%{transform:scale(1);opacity:0}20%{opacity:.7}100%{transform:scale(6.5);opacity:0}}` };
  },
  dust: (P) => {
    let s = '';
    for (let i = 0; i < 36; i += 1) s += `<rect class="mxd" x="${R(P.J() * 980)}" y="${R(P.J() * 980)}" width="${R(3 + P.J() * 6)}" height="${R(3 + P.J() * 6)}" fill="${i % 3 ? P.A : P.B}" style="animation-delay:${R(-P.J() * 3)}s"/>`;
    return { over: `<g>${s}</g>`, css: `.mxd{transform-box:fill-box;transform-origin:center;animation:mxd ${R(2.6 * P.T)}s ${P.E} infinite}@keyframes mxd{0%,100%{opacity:0;transform:scale(.2)}50%{opacity:.9;transform:scale(1) rotate(45deg)}}` };
  },
  trail: (P) => ({ under: `<path class="mxt" d="M-40 ${R(780 + P.J() * 120)}C250 ${R(560 + P.J() * 200)} 620 ${R(980 - P.J() * 200)} 1040 ${R(160 + P.J() * 200)}" fill="none" stroke="${P.A}" stroke-width="4" stroke-dasharray="18 22" stroke-opacity=".55"/>`, css: `.mxt{animation:mxt ${R(3 * P.T)}s linear infinite ${P.D === 'reverse' ? 'reverse' : 'normal'}}@keyframes mxt{to{stroke-dashoffset:-400}}` }),
  confetti: (P) => {
    let s = '';
    for (let i = 0; i < 26; i += 1) s += `<rect class="mxc" x="${R(P.J() * 980)}" y="-30" width="${R(8 + P.J() * 10)}" height="${R(4 + P.J() * 6)}" fill="${[P.A, P.B, '#fff'][i % 3]}" style="animation-duration:${R((4 + P.J() * 5) * P.T)}s;animation-delay:${R(-P.J() * 8)}s"/>`;
    return { under: `<g opacity=".7">${s}</g>`, css: `.mxc{transform-box:fill-box;transform-origin:center;animation:mxc linear infinite}@keyframes mxc{to{transform:translateY(1080px) rotate(720deg)}}` };
  },
  rays: (P) => {
    let s = '';
    const n = 12 + Math.floor(P.J() * 12);
    for (let i = 0; i < n; i += 1) { const a = (i / n) * Math.PI * 2; const b = a + Math.PI / n; s += `<path d="M500 500L${R(500 + 900 * Math.cos(a))} ${R(500 + 900 * Math.sin(a))}L${R(500 + 900 * Math.cos(b))} ${R(500 + 900 * Math.sin(b))}Z"/>`; }
    return { under: `<g class="mxy" fill="${P.A}" opacity=".08">${s}</g>`, css: `.mxy{transform-origin:500px 500px;animation:mxy ${R(40 * P.T)}s linear infinite ${P.D === 'reverse' || P.D === 'alternate-reverse' ? 'reverse' : 'normal'}}@keyframes mxy{to{transform:rotate(360deg)}}` };
  },
  bokeh: (P) => {
    let s = '';
    for (let i = 0; i < 12; i += 1) s += `<circle class="mxk" cx="${R(P.J() * 1000)}" cy="${R(P.J() * 1000)}" r="${R(30 + P.J() * 70)}" fill="${i % 2 ? P.A : P.B}" style="animation-delay:${R(-P.J() * 5)}s"/>`;
    return { under: `<g opacity=".22">${s}</g>`, css: `.mxk{transform-box:fill-box;transform-origin:center;animation:mxk ${R(5 * P.T)}s ${P.E} infinite alternate}@keyframes mxk{from{opacity:.2;transform:scale(.7)}to{opacity:1;transform:scale(1.15)}}` };
  },
  dotgrid: (P) => {
    let s = '';
    for (let y = 0; y < 10; y += 1) s += `<g class="mxg" style="animation-delay:${R(y * 0.18 * P.T)}s">${Array.from({ length: 10 }, (_, x) => `<circle cx="${50 + x * 100}" cy="${50 + y * 100}" r="4"/>`).join('')}</g>`;
    return { under: `<g fill="${P.A}">${s}</g>`, css: `.mxg{opacity:.1;animation:mxg ${R(2.8 * P.T)}s ${P.E} infinite}@keyframes mxg{50%{opacity:.6}}` };
  },
  comets: (P) => ({ under: `<g stroke="${P.A}" stroke-width="3" stroke-linecap="round">${[0, 1, 2, 3].map((i) => `<path class="mxm" d="M${R(-200 + P.J() * 400)} ${R(P.J() * 600)}l140 70" style="animation-delay:${R(-i * 1.6 * P.T)}s"/>`).join('')}</g>`, css: `.mxm{opacity:0;animation:mxm ${R(6.4 * P.T)}s ${P.E} infinite}@keyframes mxm{0%{transform:translate(0,0);opacity:0}10%{opacity:.8}60%{transform:translate(1100px,550px);opacity:0}100%{opacity:0}}` }),
  rising: (P) => {
    let s = '';
    for (let i = 0; i < 22; i += 1) s += `<circle class="mxu" cx="${R(P.J() * 1000)}" cy="1030" r="${R(2 + P.J() * 5)}" fill="${i % 3 ? P.A : '#fff4c2'}" style="animation-duration:${R((7 + P.J() * 7) * P.T)}s;animation-delay:${R(-P.J() * 14)}s"/>`;
    return { under: `<g>${s}</g>`, css: `.mxu{animation:mxu linear infinite}@keyframes mxu{0%{transform:translate(0,0);opacity:0}15%{opacity:.9}100%{transform:translate(${R(-60 + P.J() * 120)}px,-1080px);opacity:0}}` };
  },
  stars: (P) => {
    let s = '';
    for (let i = 0; i < 60; i += 1) s += `<circle class="mxs" cx="${R(P.J() * 1000)}" cy="${R(P.J() * 1000)}" r="${R(0.8 + P.J() * 2.2)}" fill="#fff" style="animation-delay:${R(-P.J() * 4)}s"/>`;
    return { under: `<g>${s}</g>`, css: `.mxs{animation:mxs ${R(3.2 * P.T)}s ${P.E} infinite}@keyframes mxs{0%,100%{opacity:.15}50%{opacity:1}}` };
  },
  dawn: (P) => ({ under: `<defs><radialGradient id="mxdw" cx=".5" cy="1" r=".9"><stop offset="0" stop-color="${P.A}" stop-opacity=".55"/><stop offset="1" stop-color="${P.A}" stop-opacity="0"/></radialGradient></defs><rect class="mxdw" width="1000" height="1000" fill="url(#mxdw)"/>`, css: `.mxdw{transform-origin:500px 1000px;animation:mxdw ${R(8 * P.T)}s ${P.E} infinite alternate}@keyframes mxdw{from{opacity:.35;transform:scaleY(.7)}to{opacity:1;transform:scaleY(1.15)}}` }),
  mist: (P) => ({ under: `<defs><radialGradient id="mxmi"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>${[0, 1, 2].map((i) => `<ellipse class="mxmi" cx="${R(P.J() * 1000)}" cy="${R(250 + i * 250)}" rx="420" ry="90" fill="url(#mxmi)" style="animation-delay:${R(-i * 5 * P.T)}s"/>`).join('')}`, css: `.mxmi{animation:mxmi ${R(16 * P.T)}s linear infinite alternate}@keyframes mxmi{from{transform:translateX(-260px)}to{transform:translateX(260px)}}` }),
  constellation: (P) => {
    const pts = Array.from({ length: 11 }, () => [R(80 + P.J() * 840), R(80 + P.J() * 840)]);
    const lines = pts.slice(1).map((p, i) => `<path d="M${pts[i][0]} ${pts[i][1]}L${p[0]} ${p[1]}"/>`).join('');
    return { under: `<g stroke="${P.A}" stroke-opacity=".2" stroke-width="1.5">${lines}</g><g fill="${P.A}">${pts.map((p, i) => `<circle class="mxn" cx="${p[0]}" cy="${p[1]}" r="4" style="animation-delay:${R(i * 0.3 * P.T)}s"/>`).join('')}</g>`, css: `.mxn{transform-box:fill-box;transform-origin:center;animation:mxn ${R(3.3 * P.T)}s ${P.E} infinite}@keyframes mxn{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1.8)}}` };
  },
  petals: (P) => {
    const rose = (c) => `<g fill="${c}">${[0, 45, 90, 135].map((a) => `<ellipse rx="3" ry="9" transform="rotate(${a})"/>`).join('')}</g>`;
    let s = '';
    for (let i = 0; i < 14; i += 1) s += `<g transform="translate(${R(P.J() * 1000)} -20)"><g class="mxpe" style="animation-duration:${R((8 + P.J() * 7) * P.T)}s;animation-delay:${R(-P.J() * 15)}s">${rose(i % 2 ? P.A : P.B)}</g></g>`;
    return { under: `<g opacity=".6">${s}</g>`, css: `.mxpe{animation:mxpe linear infinite}@keyframes mxpe{to{transform:translate(${R(-80 + P.J() * 160)}px,1060px) rotate(540deg)}}` };
  },
  halo: (P) => ({ under: `<defs><radialGradient id="mxh"><stop offset="0" stop-color="${P.A}" stop-opacity=".35"/><stop offset=".6" stop-color="${P.B}" stop-opacity=".12"/><stop offset="1" stop-color="${P.B}" stop-opacity="0"/></radialGradient></defs><circle class="mxh" cx="500" cy="480" r="470" fill="url(#mxh)"/>`, css: `.mxh{transform-origin:500px 480px;animation:mxh ${R(6 * P.T)}s ${P.E} infinite alternate}@keyframes mxh{from{transform:scale(.8);opacity:.5}to{transform:scale(1.1);opacity:1}}` }),
  postmark: (P) => {
    const cx = R(760 + P.J() * 80);
    const cy = R(180 + P.J() * 80);
    return { over: `<defs><path id="mxpm" d="M${cx - 70} ${cy}a70 70 0 1 1 140 0a70 70 0 1 1 -140 0"/></defs><g class="mxpm" opacity=".5" fill="none" stroke="${P.A}" stroke-width="3"><circle cx="${cx}" cy="${cy}" r="86"/><circle cx="${cx}" cy="${cy}" r="56"/><text font-family="monospace" font-size="15" fill="${P.A}" stroke="none" letter-spacing="3"><textPath href="#mxpm">AXTO · LIVE · 1/1 · AXTO · LIVE ·</textPath></text></g>`, css: `.mxpm{transform-origin:${cx}px ${cy}px;animation:mxpm ${R(14 * P.T)}s linear infinite ${P.D === 'reverse' ? 'reverse' : 'normal'}}@keyframes mxpm{to{transform:rotate(360deg)}}` };
  },
};

// ------------------------------------------------------------------------------------------------ gerak objek (.mxo)
const OBJ = {
  float: (P) => `.mxo{animation:mxof ${R(4.6 * P.T)}s ${P.E} ${P.ph}s infinite ${P.D}}@keyframes mxof{0%,100%{transform:translateY(0)}50%{transform:translateY(-${R(8 + P.J() * 10)}px)}}`,
  sway: (P) => `.mxo{transform-origin:500px ${R(500 + P.J() * 300)}px;animation:mxow ${R(5.2 * P.T)}s ${P.E} ${P.ph}s infinite ${P.D}}@keyframes mxow{0%,100%{transform:rotate(-${R(1 + P.J() * 2)}deg)}50%{transform:rotate(${R(1 + P.J() * 2)}deg)}}`,
  breathe: (P) => `.mxo{transform-origin:500px 500px;animation:mxob ${R(3.8 * P.T)}s ${P.E} ${P.ph}s infinite ${P.D}}@keyframes mxob{0%,100%{transform:scale(1)}50%{transform:scale(${R(1.015 + P.J() * 0.025)})}}`,
  drift8: (P) => `.mxo{animation:mxo8 ${R(9 * P.T)}s ${P.E} ${P.ph}s infinite ${P.D}}@keyframes mxo8{0%,100%{transform:translate(0,0)}25%{transform:translate(${R(6 + P.J() * 8)}px,-${R(5 + P.J() * 6)}px)}50%{transform:translate(0,0)}75%{transform:translate(-${R(6 + P.J() * 8)}px,-${R(5 + P.J() * 6)}px)}}`,
  tilt: (P) => `.mxo{transform-origin:500px 500px;animation:mxot ${R(6 * P.T)}s ${P.E} ${P.ph}s infinite ${P.D}}@keyframes mxot{0%,100%{transform:skewX(-${R(1 + P.J() * 1.5)}deg)}50%{transform:skewX(${R(1 + P.J() * 1.5)}deg)}}`,
  flutter: (P) => `.mxo{transform-origin:500px 0;animation:mxol ${R(4 * P.T)}s ${P.E} ${P.ph}s infinite ${P.D}}@keyframes mxol{0%,100%{transform:skewY(0) scaleX(1)}50%{transform:skewY(${R(0.8 + P.J() * 1.2)}deg) scaleX(.985)}}`,
};

// ------------------------------------------------------------------------------------------------ JAM DIGITAL
const DIGIT = {
  glitch: (P) => `#digits{animation:mxdg ${R(3.4 * P.T)}s steps(1) ${P.ph}s infinite}@keyframes mxdg{0%,84%,100%{transform:none;filter:none}86%{transform:translate(${R(4 + P.J() * 5)}px,-2px) skewX(-${R(4 + P.J() * 6)}deg);filter:drop-shadow(4px 0 0 ${P.A}) drop-shadow(-4px 0 0 ${P.B})}89%{transform:translate(-${R(3 + P.J() * 4)}px,1px);filter:drop-shadow(-3px 0 0 ${P.A}) drop-shadow(3px 0 0 ${P.B})}93%{transform:translate(2px,0) skewX(${R(3 + P.J() * 4)}deg);filter:none}}`,
  neon: (P) => `#digits{animation:mxdn ${R(2.4 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxdn{0%,100%{filter:drop-shadow(0 0 2px ${P.A})}50%{filter:drop-shadow(0 0 ${R(9 + P.J() * 9)}px ${P.A}) drop-shadow(0 0 3px #fff)}}`,
  holo: (P) => `#digits{animation:mxdh ${R(4 * P.T)}s linear infinite}@keyframes mxdh{0%{opacity:1;filter:hue-rotate(0deg)}3%{opacity:.45}6%{opacity:1}48%{opacity:.92}50%{opacity:.6}52%{opacity:1}100%{filter:hue-rotate(${R(90 + P.J() * 270)}deg)}}`,
  beat: (P) => `#digits{transform-box:fill-box;transform-origin:center;animation:mxdb 1s ${P.E} infinite}@keyframes mxdb{0%{transform:scale(1)}12%{transform:scale(${R(1.03 + P.J() * 0.04)})}30%{transform:scale(.99)}45%,100%{transform:scale(1)}}`,
  chroma: (P) => `#digits{animation:mxdc ${R(7 * P.T)}s linear infinite ${P.D === 'reverse' ? 'reverse' : 'normal'}}@keyframes mxdc{to{filter:hue-rotate(360deg)}}`,
  wobble: (P) => `#digits{transform-box:fill-box;transform-origin:center;animation:mxdw ${R(3 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxdw{0%,100%{transform:skewX(0) scaleY(1)}30%{transform:skewX(-${R(4 + P.J() * 5)}deg) scaleY(1.04)}70%{transform:skewX(${R(3 + P.J() * 5)}deg) scaleY(.97)}}`,
  levitate: (P) => `#digits{animation:mxdl ${R(3.6 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxdl{0%,100%{transform:translateY(0);filter:drop-shadow(0 6px 4px rgba(0,0,0,.6))}50%{transform:translateY(-${R(6 + P.J() * 8)}px);filter:drop-shadow(0 16px 10px rgba(0,0,0,.35))}}`,
  split: (P) => `#digits{animation:mxds ${R(2.8 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxds{0%,100%{filter:drop-shadow(${R(1 + P.J() * 2)}px 0 0 ${P.A}) drop-shadow(-${R(1 + P.J() * 2)}px 0 0 ${P.B})}50%{filter:drop-shadow(-3px 1px 0 ${P.A}) drop-shadow(3px -1px 0 ${P.B})}}`,
};
const TIME = {
  primary: DIGIT,
  ambient: ['scanlines', 'grid', 'rain', 'radar', 'ripple', 'aurora', 'sparks', 'warp', 'dust'],
  object: ['float', 'sway', 'breathe', 'drift8', 'tilt', 'rimlight'],
};

// ------------------------------------------------------------------------------------------------ PRANGKO (permukaan dalam #mxclip)
const SURF = {
  foil: (P) => ({ over: `<defs><linearGradient id="mxfo" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="#ff4fd8"/><stop offset=".2" stop-color="#4fd2ff"/><stop offset=".4" stop-color="#7dff8a"/><stop offset=".6" stop-color="#ffe94f"/><stop offset=".8" stop-color="#ff7a4f"/><stop offset="1" stop-color="#ff4fd8"/></linearGradient></defs><g clip-path="url(#mxclip)" style="mix-blend-mode:color-dodge" opacity="${R(0.18 + P.J() * 0.14)}"><rect class="mxfo" x="-2000" y="0" width="3000" height="1000" fill="url(#mxfo)" transform="rotate(${R(-20 + P.J() * 40)} 500 500)"/></g>`, css: `.mxfo{animation:mxfo ${R(6 * P.T)}s ${P.E} ${P.ph}s infinite ${P.D}}@keyframes mxfo{to{transform:translateX(2000px)}}` }),
  emboss: (P) => ({ over: `<defs><radialGradient id="mxem"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><g clip-path="url(#mxclip)" style="mix-blend-mode:soft-light"><circle class="mxem" cx="500" cy="500" r="${R(200 + P.J() * 120)}" fill="url(#mxem)"/></g>`, css: `.mxem{animation:mxem ${R(8 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxem{0%{transform:translate(-260px,-220px)}33%{transform:translate(240px,-120px)}66%{transform:translate(120px,240px)}100%{transform:translate(-260px,-220px)}}` }),
  prism: (P) => ({ over: `<defs><pattern id="mxpr" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(${R(20 + P.J() * 50)})"><rect width="20" height="60" fill="${P.A}"/><rect x="20" width="10" height="60" fill="${P.B}"/></pattern></defs><g clip-path="url(#mxclip)" style="mix-blend-mode:screen" opacity=".12"><rect class="mxpr" x="-60" y="0" width="1120" height="1000" fill="url(#mxpr)"/></g>`, css: `.mxpr{animation:mxpr ${R(3 * P.T)}s linear infinite ${P.D === 'reverse' ? 'reverse' : 'normal'}}@keyframes mxpr{to{transform:translateX(60px)}}` }),
  glitter: (P) => {
    let s = '';
    for (let i = 0; i < 34; i += 1) { const x = R(120 + P.J() * 760); const y = R(120 + P.J() * 760); const r = R(4 + P.J() * 7); s += `<path class="mxgl" d="M${x} ${y - r}L${R(x + r / 4)} ${R(y - r / 4)}L${R(x + r)} ${y}L${R(x + r / 4)} ${R(y + r / 4)}L${x} ${R(y + r)}L${R(x - r / 4)} ${R(y + r / 4)}L${R(x - r)} ${y}L${R(x - r / 4)} ${R(y - r / 4)}Z" style="animation-delay:${R(-P.J() * 3)}s"/>`; }
    return { over: `<g clip-path="url(#mxclip)" fill="#fff">${s}</g>`, css: `.mxgl{transform-box:fill-box;transform-origin:center;animation:mxgl ${R(2.2 * P.T)}s ${P.E} infinite}@keyframes mxgl{0%,100%{opacity:0;transform:scale(.2) rotate(0)}50%{opacity:1;transform:scale(1) rotate(90deg)}}` };
  },
  inkshift: (P) => ({ css: `.mxb{animation:mxik ${R(7 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxik{0%,100%{filter:hue-rotate(0deg) saturate(1)}50%{filter:hue-rotate(${R(25 + P.J() * 60)}deg) saturate(${R(1.1 + P.J() * 0.5)})}}` }),
  leak: (P) => ({ over: `<defs><radialGradient id="mxlk"><stop offset="0" stop-color="${P.A}" stop-opacity=".55"/><stop offset="1" stop-color="${P.A}" stop-opacity="0"/></radialGradient><radialGradient id="mxlk2"><stop offset="0" stop-color="${P.B}" stop-opacity=".45"/><stop offset="1" stop-color="${P.B}" stop-opacity="0"/></radialGradient></defs><g clip-path="url(#mxclip)" style="mix-blend-mode:screen"><circle class="mxlk" cx="180" cy="200" r="330" fill="url(#mxlk)"/><circle class="mxlk2" cx="820" cy="820" r="300" fill="url(#mxlk2)"/></g>`, css: `.mxlk{animation:mxlk ${R(9 * P.T)}s ${P.E} infinite alternate}.mxlk2{animation:mxlk ${R(11 * P.T)}s ${P.E} infinite alternate-reverse}@keyframes mxlk{to{transform:translate(${R(200 + P.J() * 200)}px,${R(150 + P.J() * 200)}px)}}` }),
  caustics: (P) => ({ over: `<g clip-path="url(#mxclip)" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="3" style="mix-blend-mode:overlay">${[0, 1, 2, 3, 4].map((i) => `<ellipse class="mxca" cx="${R(200 + P.J() * 600)}" cy="${R(200 + P.J() * 600)}" rx="${R(60 + P.J() * 120)}" ry="${R(30 + P.J() * 60)}" style="animation-delay:${R(-i * P.T)}s"/>`).join('')}</g>`, css: `.mxca{transform-box:fill-box;transform-origin:center;animation:mxca ${R(5 * P.T)}s ${P.E} infinite alternate}@keyframes mxca{from{transform:rotate(0) scale(.8)}to{transform:rotate(${R(40 + P.J() * 80)}deg) scale(1.25)}}` }),
  spotlight: (P) => ({ over: `<defs><radialGradient id="mxsp"><stop offset=".25" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs><g clip-path="url(#mxclip)"><rect class="mxspt" x="-500" y="-500" width="2000" height="2000" fill="url(#mxsp)"/></g>`, css: `.mxspt{animation:mxspt ${R(10 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxspt{0%,100%{transform:translate(-180px,-140px)}50%{transform:translate(180px,160px)}}` }),
};
const STAMP = {
  primary: SURF,
  ambient: ['dust', 'postmark', 'trail', 'ripple', 'confetti', 'rays', 'bokeh', 'dotgrid', 'comets'],
  object: ['float', 'sway', 'breathe', 'flutter', 'tilt', 'perfglow'],
};

// ------------------------------------------------------------------------------------------------ AL-QUR'AN (teks diam)
const GOLD = {
  framerun: (P) => ({ over: `<rect class="mxfr" x="24" y="24" width="952" height="952" fill="none" stroke="${P.A}" stroke-width="6" stroke-dasharray="${R(160 + P.J() * 200)} 3808" stroke-linecap="round" style="filter:drop-shadow(0 0 6px ${P.A})"/>`, css: `.mxfr{animation:mxfr ${R(7 * P.T)}s linear infinite ${P.D === 'reverse' || P.D === 'alternate-reverse' ? 'reverse' : 'normal'}}@keyframes mxfr{to{stroke-dashoffset:-3808}}` }),
  shimmer: (P) => ({ css: `.mxf{animation:mxfs ${R(4 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxfs{0%,100%{filter:brightness(1)}50%{filter:brightness(${R(1.35 + P.J() * 0.4)}) drop-shadow(0 0 6px ${P.A})}}` }),
  rosettes: (P) => {
    const star = (x, y) => `<g transform="translate(${x} ${y})"><g class="mxro"><path d="M0 -44L10 -10L44 0L10 10L0 44L-10 10L-44 0L-10 -10Z" fill="${P.A}" opacity=".65"/><circle r="9" fill="${P.B}"/></g></g>`;
    return { over: `${star(90, 90)}${star(910, 90)}${star(90, 910)}${star(910, 910)}`, css: `.mxro{animation:mxro ${R(6 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxro{0%,100%{transform:rotate(0) scale(.8)}50%{transform:rotate(${R(90 + P.J() * 90)}deg) scale(1.15)}}` };
  },
  girih: (P) => {
    const n = 12 + 4 * Math.floor(P.J() * 3);
    const pts = Array.from({ length: n * 2 }, (_, i) => { const r = i % 2 ? 300 : 440; const a = (i / (n * 2)) * Math.PI * 2; return `${R(500 + r * Math.cos(a))} ${R(500 + r * Math.sin(a))}`; }).join('L');
    return { under: `<path class="mxgi" d="M${pts}Z" fill="none" stroke="${P.A}" stroke-opacity=".28" stroke-width="2"/>`, css: `.mxgi{transform-origin:500px 500px;animation:mxgi ${R(60 * P.T)}s linear infinite ${P.D === 'reverse' ? 'reverse' : 'normal'}}@keyframes mxgi{to{transform:rotate(360deg)}}` };
  },
  lightpass: (P) => ({ over: `<defs><radialGradient id="mxlp"><stop offset="0" stop-color="${P.A}" stop-opacity=".35"/><stop offset="1" stop-color="${P.A}" stop-opacity="0"/></radialGradient></defs><g style="mix-blend-mode:overlay"><circle class="mxlp" cx="500" cy="500" r="${R(240 + P.J() * 120)}" fill="url(#mxlp)"/></g>`, css: `.mxlp{animation:mxlp ${R(9 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxlp{0%{transform:translate(-420px,-300px)}50%{transform:translate(420px,120px)}100%{transform:translate(-420px,-300px)}}` }),
  nur: (P) => {
    let s = '';
    for (let i = 0; i < 9; i += 1) { const x = R(500 + (i - 4) * (60 + P.J() * 30)); s += `<path d="M500 -40L${x - 20} 1000H${x + 20}Z"/>`; }
    return { under: `<g class="mxnu" fill="${P.A}" opacity=".07">${s}</g>`, css: `.mxnu{transform-origin:500px 0;animation:mxnu ${R(8 * P.T)}s ${P.E} infinite alternate}@keyframes mxnu{from{opacity:.04;transform:rotate(-${R(2 + P.J() * 3)}deg)}to{opacity:.13;transform:rotate(${R(2 + P.J() * 3)}deg)}}` };
  },
  haloring: (P) => ({ under: `<circle class="mxhr" cx="500" cy="480" r="380" fill="none" stroke="${P.A}" stroke-width="3"/>`, css: `.mxhr{transform-origin:500px 480px;animation:mxhr ${R(4.5 * P.T)}s ${P.E} infinite}@keyframes mxhr{0%{transform:scale(.85);opacity:0}30%{opacity:.5}100%{transform:scale(1.25);opacity:0}}` }),
  startrace: (P) => {
    const pts = Array.from({ length: 16 }, (_, i) => { const r = i % 2 ? 300 : 420; const a = (i / 16) * Math.PI * 2 - Math.PI / 2; return `${R(500 + r * Math.cos(a))} ${R(480 + r * Math.sin(a))}`; }).join('L');
    return { under: `<path class="mxst" d="M${pts}Z" fill="none" stroke="${P.A}" stroke-width="3" stroke-opacity=".5" stroke-dasharray="5200" stroke-dashoffset="5200"/>`, css: `.mxst{animation:mxst ${R(10 * P.T)}s ${P.E} infinite alternate}@keyframes mxst{to{stroke-dashoffset:0}}` };
  },
};
const GLOW = {
  steady: () => '',
  gold: (P) => `.mxo{animation:mxqg ${R(4 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxqg{0%,100%{filter:drop-shadow(0 0 0 #e9c46a)}50%{filter:drop-shadow(0 0 ${R(5 + P.J() * 6)}px #e9c46a)}}`,
  accent: (P) => `.mxo{animation:mxqa ${R(5 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxqa{0%,100%{filter:drop-shadow(0 0 1px ${P.A})}50%{filter:drop-shadow(0 0 ${R(6 + P.J() * 6)}px ${P.A})}}`,
  luminous: (P) => `.mxo{animation:mxql ${R(5.5 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxql{0%,100%{opacity:1}50%{opacity:${R(0.86 + P.J() * 0.08)}}}`,
  bright: (P) => `.mxo{animation:mxqb ${R(4.4 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxqb{0%,100%{filter:brightness(1)}50%{filter:brightness(${R(1.12 + P.J() * 0.12)})}}`,
  ember: (P) => `.mxo{animation:mxqe ${R(6 * P.T)}s ${P.E} infinite ${P.D}}@keyframes mxqe{0%,100%{filter:drop-shadow(0 0 4px ${P.A})}50%{filter:drop-shadow(0 0 7px ${P.B})}}`,
};
const QURAN = {
  primary: GOLD,
  ambient: ['aurora', 'rising', 'stars', 'dawn', 'ripple', 'mist', 'constellation', 'petals', 'halo'],
  object: GLOW,
};

const KINDS = { time: TIME, stamp: STAMP, quran: QURAN, hadith: QURAN }; // hadits: teks diam, cahaya hidup (#49)

/** Radix genom: [efek utama, suasana, objek, tempo, easing, arah, rona, fase]. Hasil kali ≥ 10 juta. */
export function radices(kind) {
  const K = KINDS[kind];
  return [Object.keys(K.primary).length, K.ambient.length, Array.isArray(K.object) ? K.object.length : Object.keys(K.object).length, TEMPO.length, EASE.length, DIR.length, 16, 5];
}

/** Genom gerak token: digit unik (bijektif) per koleksi + jitter kontinu. */
export function motionGenome(d) {
  const K = KINDS[d.kind];
  if (!K) return null;
  const c = collection(d.key);
  const rad = radices(d.kind);
  const N = product(rad);
  const g = decodeRadix(permute(d.tokenId - 1, N, `${c.salt}:motion`), rad);
  return { kind: d.kind, digits: g, key: g.join('.') };
}

/**
 * Hasilkan lapisan gerak: { css, under, over } untuk disisipkan ke SVG karya.
 * @param {object} d hasil dna()
 */
export function motionLayers(d) {
  const K = KINDS[d.kind];
  if (!K) return { css: '', under: '', over: '', key: '' };
  const { digits: [pi, ai, oi, ti, ei, di, hi, phi], key } = motionGenome(d);
  const J = rng(hash32(`${collection(d.key).salt}:mj:${d.tokenId}`));
  const hue = (hi * 22.5 + J() * 14) % 360;
  const P = { T: TEMPO[ti], E: EASE[ei], D: DIR[di], A: `hsl(${R(hue)},92%,${R(58 + J() * 12)}%)`, B: `hsl(${R((hue + 140 + J() * 80) % 360)},88%,${R(56 + J() * 14)}%)`, J, ph: R(-phi * 0.7) };
  const primName = Object.keys(K.primary)[pi];
  const prim = K.primary[primName](P);
  const amb = AMB[K.ambient[ai]](P);
  let objCss = '';
  let objOver = '';
  if (d.kind === 'quran' || d.kind === 'hadith') objCss = Object.values(K.object)[oi](P);
  else {
    const oname = K.object[oi];
    if (oname === 'rimlight') objOver = `<use href="#sil" class="mxrim" fill="none" stroke="${P.A}" stroke-width="5" stroke-dasharray="${R(90 + J() * 120)} ${R(260 + J() * 300)}" stroke-linecap="round"/>`;
    else if (oname === 'perfglow') objOver = `<use href="#mxpaper" class="mxrim" fill="none" stroke="${P.A}" stroke-width="5" stroke-dasharray="${R(30 + J() * 60)} ${R(40 + J() * 80)}" stroke-linecap="round" style="filter:drop-shadow(0 0 5px ${P.A})"/>`;
    else objCss = OBJ[oname](P);
    if (objOver) objCss = `.mxrim{animation:mxrim ${R(5 * P.T)}s linear infinite ${P.D === 'reverse' || P.D === 'alternate-reverse' ? 'reverse' : 'normal'}}@keyframes mxrim{to{stroke-dashoffset:-1200}}`;
  }
  const primCss = typeof prim === 'string' ? prim : prim.css ?? '';
  const css = `${primCss}${amb.css ?? ''}${objCss}@media(prefers-reduced-motion:reduce){*{animation:none!important}}`;
  return { css, under: `${amb.under ?? ''}${typeof prim === 'object' ? prim.under ?? '' : ''}`, over: `${typeof prim === 'object' ? prim.over ?? '' : ''}${amb.over ?? ''}${objOver}`, key };
}

/** Penanda tempat sisip lapisan „di bawah" (tepat setelah latar) per jenis karya. */
const UNDER_AT = { time: 'fill="url(#bgG)"/>', stamp: 'fill="url(#page)"/>', quran: 'fill="url(#bgq)"/>', hadith: 'fill="url(#bgq)"/>' };

/** Sisipkan lapisan gerak ke string SVG; kembalikan {svg, css} (CSS dipasang pemanggil: <style> di SVG atau di player). */
export function applyMotion(d, svg) {
  const m = motionLayers(d);
  if (!m.key) return { svg, css: '' };
  let s = svg;
  const at = s.indexOf(UNDER_AT[d.kind]);
  if (at >= 0) { const k = at + UNDER_AT[d.kind].length; s = `${s.slice(0, k)}${m.under}${s.slice(k)}`; }
  const close = s.lastIndexOf('</svg>');
  s = `${s.slice(0, close)}${m.over}${s.slice(close)}`;
  return { svg: s, css: m.css, key: m.key };
}
