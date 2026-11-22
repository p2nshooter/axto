/**
 * Renderer MODEL v2 — figur ilustrasi 2D bergerak gaya pemandu luaja.com (perintah pemilik #33).
 * Hanya wajah + kerudung yang berasal dari foto (ctx.head = {href, ar, cx, chin}); badan, busana, tangan, properti, latar
 * dan seluruh gerak digambar sebagai vektor dengan animasi CSS DI DALAM SVG → bergerak juga sebagai <img> dan di OpenSea.
 * Tanpa ctx.head (belum ada izin) → kepala ilustrasi berkerudung netral.
 */
import { esc, rng } from '../core.js';
import { svgOpen, linear, radial, r1, text, hallmark } from './common.js';
import { modelParts } from '../catalog/model.js';

const SKIN = '#e4b49a';
const SKIN2 = '#c58f78';

/* ------------------------------------------------------------------ gerak (CSS di dalam SVG) */
const CSS = `.fig,.head,.armR,.armL,.fx *,.pr,.acc{transform-box:view-box}
.fig{animation:mb 4s ease-in-out infinite alternate}@keyframes mb{to{transform:translateY(-6px)}}
.head{animation:mt 5s ease-in-out infinite alternate}@keyframes mt{from{transform:rotate(-1.8deg)}to{transform:rotate(1.8deg)}}
.m-wave .armR{animation:mw 1.1s ease-in-out infinite alternate}@keyframes mw{from{transform:rotate(-10deg)}to{transform:rotate(16deg)}}
.m-cheer .fig{animation:mh .9s ease-in-out infinite alternate}@keyframes mh{to{transform:translateY(-18px)}}
.m-cheer .armR{animation:mc .9s ease-in-out infinite alternate}.m-cheer .armL{animation:mc2 .9s ease-in-out infinite alternate}@keyframes mc{to{transform:rotate(-9deg)}}@keyframes mc2{to{transform:rotate(9deg)}}
.m-float .fig{animation:mf 6s ease-in-out infinite alternate}@keyframes mf{from{transform:translateY(12px) rotate(-2.2deg)}to{transform:translateY(-30px) rotate(2.2deg)}}
.m-sway .fig{animation:ms 3.6s ease-in-out infinite alternate}@keyframes ms{from{transform:rotate(-2deg)}to{transform:rotate(2deg)}}
.m-read .page{animation:mp 3.2s ease-in-out infinite}@keyframes mp{0%,40%{transform:scaleX(1)}60%,100%{transform:scaleX(-1)}}
.halo{opacity:0}.m-shine .halo{opacity:1;animation:mo 2.6s ease-in-out infinite}@keyframes mo{50%{opacity:.35;transform:scale(1.07)}}
.bob{animation:bo 2.8s ease-in-out infinite alternate}@keyframes bo{to{transform:translateY(-14px)}}
.spin{animation:sp 8s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}
.flick{animation:fl .18s linear infinite alternate}@keyframes fl{to{opacity:.55;transform:scaleY(.8)}}
.glow{animation:gl 2.2s ease-in-out infinite}@keyframes gl{50%{opacity:.45}}
.swing{animation:sw 2.4s ease-in-out infinite alternate}@keyframes sw{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}
.wavef{animation:wf 1s ease-in-out infinite alternate}@keyframes wf{to{transform:skewY(-6deg) scaleX(.92)}}
.steam{animation:st 3s ease-in-out infinite}@keyframes st{0%{opacity:0;transform:translateY(8px)}50%{opacity:.7}100%{opacity:0;transform:translateY(-26px)}}
.blink{animation:bl 1.4s steps(1) infinite}@keyframes bl{50%{opacity:.2}}
.fall{animation:fa linear infinite}@keyframes fa{from{transform:translate(0,-120px) rotate(0deg)}to{transform:translate(60px,1140px) rotate(400deg)}}
.rain{animation:ra linear infinite}@keyframes ra{from{transform:translate(0,-140px)}to{transform:translate(-40px,1140px)}}
.rise{animation:ri linear infinite}@keyframes ri{from{transform:translateY(80px);opacity:0}15%{opacity:.8}to{transform:translateY(-1000px);opacity:0}}
.drift{animation:dr linear infinite}@keyframes dr{from{transform:translateX(-260px)}to{transform:translateX(1260px)}}
.twk{animation:tw 2.4s ease-in-out infinite}@keyframes tw{50%{opacity:.15}}
.shoot{animation:sh 6s ease-in infinite}@keyframes sh{0%,70%{transform:translate(0,0);opacity:0}72%{opacity:1}100%{transform:translate(-700px,380px);opacity:0}}
.ff{animation:ffm 5s ease-in-out infinite alternate}@keyframes ffm{0%{opacity:.2;transform:translate(0,0)}50%{opacity:1}100%{opacity:.3;transform:translate(30px,-40px)}}
.chalk{stroke-dasharray:420;animation:ch 6s ease-in-out infinite}@keyframes ch{0%{stroke-dashoffset:420}60%,100%{stroke-dashoffset:0}}
.ecg{stroke-dasharray:60 900;animation:ec 2.2s linear infinite}@keyframes ec{from{stroke-dashoffset:960}to{stroke-dashoffset:0}}
.grid{animation:gr 2.4s linear infinite}@keyframes gr{to{transform:translateY(60px)}}
.aur{animation:au 9s ease-in-out infinite alternate}@keyframes au{to{transform:translateX(-120px) skewX(-8deg)}}
.flow{stroke-dasharray:14 10;animation:fw 1.2s linear infinite}@keyframes fw{to{stroke-dashoffset:-48}}
@media(prefers-reduced-motion:reduce){*{animation:none!important}}`;

/* ------------------------------------------------------------------ primitif */
const P = (n) => r1(n);
const sleeve = (x1, y1, x2, y2, w, c) => `<line x1="${P(x1)}" y1="${P(y1)}" x2="${P(x2)}" y2="${P(y2)}" stroke="${c}" stroke-width="${P(w)}" stroke-linecap="round"/>`;
const hand = (x, y, r, rot = 0) => `<g transform="translate(${P(x)} ${P(y)}) rotate(${rot})"><ellipse rx="${P(r)}" ry="${P(r * 1.15)}" fill="${SKIN}"/><ellipse cx="${P(-r * 0.55)}" cy="${P(-r * 0.45)}" rx="${P(r * 0.42)}" ry="${P(r * 0.6)}" fill="${SKIN}"/><path d="M${P(-r * 0.3)} ${P(r * 0.6)}q${P(r * 0.4)} ${P(r * 0.3)} ${P(r * 0.8)} 0" stroke="${SKIN2}" stroke-width="2" fill="none" opacity=".6"/></g>`;
const at = (x, y, s, inner, cls = '', rot = 0, origin = '') => `<g class="${cls}" ${origin ? `style="transform-origin:${P(x)}px ${P(y)}px"` : ''}><g transform="translate(${P(x)} ${P(y)}) scale(${r1(s / 100)}) rotate(${rot})">${inner}</g></g>`;

/* ------------------------------------------------------------------ properti (pusat 0,0; ukuran ±60) */
function propSvg(id, c, a) {
  switch (id) {
    case 'book': case 'quran': {
      const cover = id === 'quran' ? '#1e5a3c' : c;
      return `<g transform="rotate(-8)"><rect x="-52" y="-38" width="104" height="76" rx="4" fill="#0003" transform="translate(5 5)"/><rect x="-52" y="-38" width="104" height="76" rx="4" fill="${cover}"/><rect x="-52" y="-38" width="12" height="76" fill="#0004"/><rect x="-30" y="-24" width="66" height="5" rx="2" fill="${id === 'quran' ? '#e9c46a' : '#fff'}" opacity=".9"/><rect x="-30" y="-12" width="40" height="5" rx="2" fill="#fff" opacity=".6"/>${id === 'quran' ? '<path d="M8 6l6 12 13 2-9 9 2 13-12-6-12 6 2-13-9-9 13-2z" fill="#e9c46a" transform="scale(.7) translate(10 -2)"/>' : ''}<path d="M50 -35v70" stroke="#fff" stroke-width="3" opacity=".9"/></g>`;
    }
    case 'notebook': return `<g transform="rotate(-6)"><rect x="-50" y="-40" width="100" height="80" rx="4" fill="#fbf6ea"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M-38 ${-24 + i * 12}h76" stroke="#9db" stroke-width="2"/>`).join('')}<path d="M-50 -40v80" stroke="${c}" stroke-width="8"/><g transform="translate(30 -6) rotate(35)"><rect x="-6" y="-46" width="12" height="70" fill="#f2c94c"/><path d="M-6 24l6 14 6-14z" fill="#e8c9a0"/><path d="M-2 34l2 4 2-4z" fill="#333"/></g></g>`;
    case 'diploma': return `<g transform="rotate(-18)"><rect x="-60" y="-14" width="120" height="28" rx="14" fill="#f6ecd8"/><ellipse cx="-60" cy="0" rx="8" ry="14" fill="#e8dcc0"/><rect x="-8" y="-16" width="16" height="32" fill="${c}"/><path d="M0 16l-10 24 10-6 10 6z" fill="${c}"/></g>`;
    case 'globe': return `<g><circle r="46" fill="#3a8fd1"/><clipPath id="gc"><circle r="46"/></clipPath><g clip-path="url(#gc)"><g class="drift" style="animation-duration:14s"><path d="M-300 -20q30 -30 60 0q-10 30 -40 26zM-180 10q30 -14 50 6q-20 26 -50 -6zM-90 -30q30 -10 40 20q-30 8 -40 -20zM20 -20q30 -30 60 0q-10 30 -40 26zM140 10q30 -14 50 6q-20 26 -50 -6z" fill="#5fbf6a" transform="translate(-120 0) scale(.5)"/></g></g><circle r="46" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><path d="M-50 -10a52 52 0 0 0 100 20" stroke="#c9a35a" stroke-width="5" fill="none"/><path d="M0 50v22M-26 74h52" stroke="#8a6516" stroke-width="7" stroke-linecap="round"/></g>`;
    case 'telescope': return `<g transform="rotate(-32)"><rect x="-80" y="-14" width="150" height="28" rx="8" fill="#d3d8e0"/><rect x="58" y="-19" width="30" height="38" rx="6" fill="#8a96a8"/><rect x="-92" y="-9" width="18" height="18" rx="4" fill="#5a667a"/><path d="M-10 14l-30 60M10 14l30 60" stroke="#5a3a22" stroke-width="6"/></g>`;
    case 'rocket': return `<g transform="rotate(18)"><path d="M0 -62c22 22 22 70 12 92h-24c-10 -22 -10 -70 12 -92z" fill="#eef1f5"/><circle cy="-14" r="10" fill="#5fd3ff" stroke="#2f6fd1" stroke-width="3"/><path d="M-12 22l-16 20h16zM12 22l16 20h-16z" fill="${c}"/><path class="flick" style="transform-origin:0px 32px" d="M-8 32q8 34 16 0z" fill="#ffb03a"/></g>`;
    case 'planet': return `<g class="bob"><circle r="40" fill="${a}"/><circle cx="-12" cy="-12" r="14" fill="#fff" opacity=".18"/><g class="spin" style="transform-origin:0px 0px;animation-duration:12s"><ellipse rx="70" ry="16" fill="none" stroke="${c}" stroke-width="6" transform="rotate(-18)"/></g></g>`;
    case 'starmap': return `<g transform="rotate(-8)"><rect x="-62" y="-42" width="124" height="84" rx="6" fill="#0b1a3a" stroke="#d4af37" stroke-width="3"/>${[[-40, -20], [-10, -28], [20, -6], [44, -22], [6, 22], [-30, 18]].map(([x, y], i) => `<circle class="twk" style="animation-delay:${-i * 0.4}s" cx="${x}" cy="${y}" r="3.5" fill="#fff"/>`).join('')}<path d="M-40 -20L-10 -28L20 -6L44 -22M20 -6L6 22L-30 18" stroke="#9be3ff" stroke-width="1.5" fill="none" opacity=".7"/></g>`;
    case 'flask': return `<g><path d="M-12 -56h24v34l34 62q6 14 -10 14h-72q-16 0 -10 -14l34 -62z" fill="#e8f6ff" fill-opacity=".85" stroke="#9fc9c9" stroke-width="3"/><path d="M-38 30h76l8 16q3 8 -6 8h-80q-9 0 -6 -8z" fill="${a}" opacity=".85"/>${[0, 1, 2].map((i) => `<circle class="rise" style="animation-duration:${2.4 + i * 0.6}s;animation-delay:${-i * 0.7}s" cx="${-14 + i * 14}" cy="40" r="${4 + i}" fill="#fff" opacity=".7"/>`).join('')}</g>`;
    case 'microscope': return `<g><rect x="-44" y="44" width="88" height="14" rx="5" fill="#3a3f4a"/><path d="M-10 44v-30h20v30" fill="#5a6070"/><g transform="rotate(-24)"><rect x="-10" y="-70" width="22" height="70" rx="6" fill="#d3d8e0"/><rect x="-14" y="-78" width="30" height="12" rx="4" fill="#3a3f4a"/></g><rect x="-30" y="8" width="60" height="8" rx="3" fill="#8a96a8"/><circle class="glow" cx="0" cy="12" r="5" fill="${a}"/></g>`;
    case 'atom': return `<g><circle r="10" fill="${c}"/>${[0, 60, 120].map((r, i) => `<g class="spin" style="transform-origin:0px 0px;animation-duration:${4 + i}s"><ellipse rx="56" ry="18" fill="none" stroke="${a}" stroke-width="3" transform="rotate(${r})"/><circle cx="56" cy="0" r="5" fill="#fff" transform="rotate(${r})"/></g>`).join('')}</g>`;
    case 'tablet': case 'holotab': return `<g transform="rotate(-6)"><rect x="-46" y="-60" width="92" height="120" rx="12" fill="#1b1f2a"/><rect x="-38" y="-50" width="76" height="98" rx="5" fill="${id === 'holotab' ? '#5fd3ff' : '#9fd8ff'}" opacity=".85"/>${id === 'holotab' ? `<g class="bob"><path d="M-30 -70l30 -26 30 26z" fill="#7cf3ff" opacity=".45"/><circle cx="0" cy="-96" r="12" fill="none" stroke="#7cf3ff" stroke-width="3" class="glow"/></g>` : ''}<rect class="blink" x="-28" y="-36" width="56" height="6" rx="3" fill="#fff" opacity=".8"/><rect x="-28" y="-22" width="40" height="6" rx="3" fill="#fff" opacity=".6"/></g>`;
    case 'fan': return `<g transform="rotate(-20)"><path d="M0 40L-62 -26A90 90 0 0 1 62 -26z" fill="${c}"/>${[-48, -24, 0, 24, 48].map((x) => `<path d="M0 40L${x} -40" stroke="${a}" stroke-width="2.5" opacity=".9"/>`).join('')}<path d="M-56 -22A84 84 0 0 1 56 -22" stroke="${a}" stroke-width="4" fill="none"/><circle cy="40" r="6" fill="#5a3a22"/></g>`;
    case 'flowers': return `<g>${[[-24, -30, '#ff6aa2'], [8, -44, '#ffd166'], [28, -22, '#e06a8a'], [-6, -16, '#ffffff']].map(([x, y, col], i) => `<g class="swing" style="transform-origin:${x}px 20px;animation-delay:${-i * 0.5}s"><path d="M${x} ${y}L0 40" stroke="#3f8a3a" stroke-width="4"/>${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="${x}" cy="${y - 10}" rx="7" ry="11" fill="${col}" transform="rotate(${r} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="6" fill="#f2c94c"/></g>`).join('')}<path d="M-26 30l26 36 26 -36z" fill="${c}"/></g>`;
    case 'lantern': return `<g class="swing" style="transform-origin:0px -70px"><path d="M0 -70v20" stroke="#c9a35a" stroke-width="4"/><path d="M-30 -50h60l-10 96h-40z" fill="${c}" opacity=".95"/><ellipse class="glow" cy="0" rx="18" ry="30" fill="#fff6c2"/><path d="M-30 -50h60M-20 46h40" stroke="#c9a35a" stroke-width="5"/></g>`;
    case 'kite': return `<g class="bob"><path d="M-120 -150l46 -40 40 46 -46 40z" fill="${c}"/><path d="M-74 -190l-6 86M-120 -150l86 6" stroke="${a}" stroke-width="3"/><path d="M-80 -104q20 30 0 60q-20 30 0 60" stroke="${a}" stroke-width="3" fill="none"/><path d="M-80 -104L0 10" stroke="#fff" stroke-width="1.5" opacity=".7"/></g>`;
    case 'ball': return `<g class="bob" style="animation-duration:.8s"><circle r="40" fill="#fff"/><path d="M0 -14l13 9-5 15h-16l-5-15zM0 -40v26M13 -5l25 -8M8 10l16 22M-8 10l-16 22M-13 -5l-25 -8" stroke="#222" stroke-width="3" fill="#222"/></g>`;
    case 'racket': return `<g transform="rotate(-24)"><ellipse cy="-36" rx="34" ry="44" fill="none" stroke="${c}" stroke-width="7"/>${[-20, -8, 4, 16].map((x) => `<path d="M${x} -76v80" stroke="#fff" stroke-width="1.5" opacity=".7"/>`).join('')}${[-60, -44, -28, -12].map((y) => `<path d="M-30 ${y}h60" stroke="#fff" stroke-width="1.5" opacity=".7"/>`).join('')}<rect x="-5" y="8" width="10" height="60" rx="4" fill="#3a3f4a"/></g>`;
    case 'trophy': return `<g><path d="M-34 -54h68v30a34 34 0 0 1 -68 0z" fill="#e9c46a"/><path d="M-34 -46q-26 0 -20 22q6 16 20 12M34 -46q26 0 20 22q-6 16 -20 12" stroke="#e9c46a" stroke-width="6" fill="none"/><rect x="-7" y="8" width="14" height="26" fill="#e9c46a"/><rect x="-30" y="34" width="60" height="14" rx="3" fill="#c9a35a"/><path class="glow" d="M-20 -46l10 30" stroke="#fff" stroke-width="5" opacity=".7"/></g>`;
    case 'medal': return `<g class="swing" style="transform-origin:0px -60px"><path d="M-24 -64l18 44M24 -64l-18 44" stroke="${c}" stroke-width="12"/><circle cy="10" r="30" fill="#e9c46a" stroke="#c9a35a" stroke-width="5"/><path d="M0 -6l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" fill="#fff6c2"/></g>`;
    case 'stethoscope': return `<g><circle cy="30" r="16" fill="#c9ced6" stroke="#5a6070" stroke-width="4"/><path d="M0 14v-30" stroke="#3a3f4a" stroke-width="6"/></g>`;
    case 'plane': return `<g transform="rotate(-14)" class="bob"><path d="M-66 0q0 -12 14 -12h96q22 0 22 12t-22 12h-96q-14 0 -14 -12z" fill="#eef1f5"/><path d="M-4 -10l-30 -44h18l40 44zM-4 10l-30 44h18l40 -44z" fill="${c}"/><path d="M-60 -10l-14 -24h12l20 24z" fill="${c}"/>${[0, 1, 2, 3].map((i) => `<circle cx="${10 + i * 12}" cy="-3" r="3" fill="#5fd3ff"/>`).join('')}</g>`;
    case 'whisk': return `<g><path d="M-50 10h100q-6 46 -50 46t-50 -46z" fill="${c}"/><ellipse cy="10" rx="50" ry="10" fill="#f6ecd8"/><g transform="rotate(30)" class="swing" style="transform-origin:0px 0px"><path d="M0 -10v-70" stroke="#8a96a8" stroke-width="6"/><path d="M0 -10q-16 -24 0 -40q16 16 0 40zM0 -10q-8 -24 0 -40q8 16 0 40" stroke="#c9ced6" stroke-width="2.5" fill="none"/></g></g>`;
    case 'blueprint': return `<g transform="rotate(-10)"><rect x="-64" y="-44" width="128" height="88" rx="4" fill="#1f4e8a"/><path d="M-50 -30h50v40h-50zM10 -30h40v24h-40zM-50 20h100" stroke="#cfe3ff" stroke-width="2" fill="none"/><path class="chalk" d="M10 0h40v24" stroke="#fff" stroke-width="2.5" fill="none"/><ellipse cx="-64" cy="0" rx="8" ry="44" fill="#173d6e"/></g>`;
    case 'umbrella': return `<g><path d="M-120 0A120 120 0 0 1 120 0z" fill="${c}"/>${[-90, -30, 30, 90].map((x) => `<path d="M${x - 30} 0q30 -14 60 0" fill="${a}" opacity=".5"/>`).join('')}<path d="M0 0v130q0 18 16 18" stroke="#2b2b2b" stroke-width="5" fill="none" stroke-linecap="round"/><circle cy="-122" r="5" fill="#2b2b2b"/></g>`;
    case 'cocoa': case 'coffee': return `<g><path d="M-30 -24h60l-6 56h-48z" fill="${id === 'cocoa' ? c : '#f6ecd8'}"/><path d="M30 -14q22 0 20 16q-2 14 -22 12" stroke="${id === 'cocoa' ? c : '#f6ecd8'}" stroke-width="6" fill="none"/><ellipse cy="-24" rx="30" ry="7" fill="#6b3f1e"/>${[0, 1].map((i) => `<path class="steam" style="animation-delay:${-i * 1.4}s" d="M${-8 + i * 16} -34q8 -12 0 -24q-8 -12 0 -24" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>`).join('')}</g>`;
    case 'leaf': return `<g class="swing" style="transform-origin:0px 40px"><path d="M0 -60l12 26 24 -10 -8 26 24 4 -22 18 6 22 -26 -12 -10 26 -10 -26 -26 12 6 -22 -22 -18 24 -4 -8 -26 24 10z" fill="#d9541f"/><path d="M0 -40v80" stroke="#8a2f10" stroke-width="3"/></g>`;
    case 'map': return `<g transform="rotate(-6)"><path d="M-64 -40l42 -8 42 8 44 -8v80l-44 8 -42 -8 -42 8z" fill="#f3e1b0"/><path d="M-22 -48v80M20 -40v80" stroke="#c9a35a" stroke-width="2"/><path class="chalk" d="M-50 20q20 -40 40 -10t50 -20" stroke="#c0392b" stroke-width="3" stroke-dasharray="6 6" fill="none"/><path d="M34 -16l8 8M42 -16l-8 8" stroke="#c0392b" stroke-width="4"/></g>`;
    case 'camera': return `<g><rect x="-48" y="-30" width="96" height="62" rx="9" fill="#22252e"/><rect x="-20" y="-40" width="40" height="14" rx="4" fill="#22252e"/><circle r="20" fill="#5a6fa8" stroke="#c9ced6" stroke-width="5"/><circle cx="-6" cy="-6" r="6" fill="#fff" opacity=".5"/><rect class="blink" x="30" y="-24" width="10" height="7" rx="2" fill="#fff6c2"/></g>`;
    case 'books': return `<g><path d="M-48 -20h96l-8 70h-80z" fill="${c}"/><path d="M-24 -20q24 -34 48 0" stroke="${a}" stroke-width="5" fill="none"/>${[['#2f5d9b', -36], ['#c0392b', -14], ['#e9c46a', 8]].map(([col, x]) => `<rect x="${x}" y="-44" width="18" height="30" fill="${col}"/>`).join('')}</g>`;
    case 'tasbih': return `<g class="swing" style="transform-origin:0px -50px">${Array.from({ length: 18 }, (_, i) => { const t = (i / 18) * Math.PI * 2; return `<circle cx="${P(Math.sin(t) * 30)}" cy="${P(-10 + Math.cos(t) * 40)}" r="6" fill="${i % 6 ? '#8a5a2b' : '#e9c46a'}"/>`; }).join('')}<path d="M0 30v22" stroke="#e9c46a" stroke-width="4"/><circle cy="56" r="6" fill="#e9c46a"/></g>`;
    case 'dates': return `<g><path d="M-52 0h104q-8 40 -52 40t-52 -40z" fill="${c}"/>${[-30, -12, 6, 24, -20, 2, 18].map((x, i) => `<ellipse cx="${x}" cy="${i > 3 ? -14 : -4}" rx="11" ry="7" fill="#6b2f12"/>`).join('')}</g>`;
    case 'compass': return `<g><circle r="40" fill="#e9c46a"/><circle r="32" fill="#fbf6ea"/><g class="swing" style="transform-origin:0px 0px;animation-duration:1.6s"><path d="M0 -28l7 28h-14z" fill="#c0392b"/><path d="M0 28l7 -28h-14z" fill="#2f3d5c"/></g><circle r="4" fill="#333"/></g>`;
    case 'flag': return `<g><path d="M0 70V-90" stroke="#5a3a22" stroke-width="6"/><g class="wavef" style="transform-origin:0px -90px"><path d="M0 -90h80l-16 24 16 24H0z" fill="${c}"/><path d="M14 -76l6 12 12 2-9 8 2 12-11-6-11 6 2-12-9-8 12-2z" fill="#fff" transform="translate(16 2) scale(.6)"/></g></g>`;
    case 'binoculars': return `<g><rect x="-44" y="-24" width="34" height="58" rx="12" fill="#22252e"/><rect x="10" y="-24" width="34" height="58" rx="12" fill="#22252e"/><rect x="-12" y="-14" width="24" height="18" fill="#3a3f4a"/><circle cx="-27" cy="26" r="12" fill="#5a6fa8"/><circle cx="27" cy="26" r="12" fill="#5a6fa8"/><circle class="glow" cx="-30" cy="22" r="4" fill="#fff"/></g>`;
    case 'shell': return `<g><path d="M0 40L-48 -10a52 52 0 0 1 96 0z" fill="#ffd1c2"/>${[-36, -18, 0, 18, 36].map((x) => `<path d="M0 40L${x} -28" stroke="#e07a5a" stroke-width="3"/>`).join('')}<circle class="glow" cx="0" cy="24" r="6" fill="#fff"/></g>`;
    case 'fishjar': return `<g><path d="M-40 -40h80v8q20 24 14 54q-8 34 -54 34t-54 -34q-6 -30 14 -54z" fill="#bfe6ff" fill-opacity=".55" stroke="#9fd0ff" stroke-width="3"/><g class="ff" style="animation-duration:3s"><path d="M-14 10q14 -14 28 0q-14 14 -28 0zM14 10l12 -8v16z" fill="${a}"/></g>${[0, 1].map((i) => `<circle class="rise" style="animation-duration:${3 + i}s;animation-delay:${-i}s" cx="${10 + i * 8}" cy="20" r="3" fill="#fff"/>`).join('')}</g>`;
    case 'coral': return `<g class="swing" style="transform-origin:0px 50px">${[[-30, '#ff6b6b'], [0, '#f2994a'], [28, '#e06a8a']].map(([x, col]) => `<path d="M${x} 50v-40m0 14l-16 -22m16 10l14 -26m-14 2v-30" stroke="${col}" stroke-width="9" stroke-linecap="round" fill="none"/>`).join('')}</g>`;
    case 'drone': return `<g class="bob"><rect x="-26" y="-10" width="52" height="20" rx="8" fill="#22252e"/><path d="M-26 -4h-30M26 -4h30" stroke="#22252e" stroke-width="5"/>${[-56, 56].map((x) => `<ellipse class="spin" style="transform-origin:${x}px -12px;animation-duration:.25s" cx="${x}" cy="-12" rx="22" ry="4" fill="#9aa4b4"/>`).join('')}<circle class="blink" cy="14" r="5" fill="${a}"/></g>`;
    case 'orb': return `<g class="bob"><circle r="44" fill="${a}" opacity=".25" class="glow"/><circle r="30" fill="${a}"/><circle cx="-10" cy="-10" r="10" fill="#fff" opacity=".6"/><g class="spin" style="transform-origin:0px 0px;animation-duration:5s"><ellipse rx="52" ry="12" fill="none" stroke="${c}" stroke-width="3"/></g></g>`;
    case 'robot': return `<g class="bob"><rect x="-30" y="-34" width="60" height="46" rx="12" fill="#d3d8e0"/><rect x="-22" y="-24" width="44" height="22" rx="8" fill="#1b1f2a"/><circle class="blink" cx="-10" cy="-13" r="5" fill="${a}"/><circle class="blink" cx="10" cy="-13" r="5" fill="${a}"/><path d="M0 -34v-14" stroke="#8a96a8" stroke-width="4"/><circle cy="-50" r="5" fill="${c}" class="glow"/><rect x="-22" y="14" width="44" height="34" rx="8" fill="#b9c0cc"/></g>`;
    default: return `<circle r="30" fill="${c}"/>`;
  }
}

/* ------------------------------------------------------------------ busana */
function outfitDetail(style, look, trim, accent, g, seed) {
  const { cx, ys, S, F, hem } = g;
  const [, , , , main, shade] = look;
  const yb = hem;
  switch (style) {
    case 'uniform': return `<path d="M${P(cx - 0.36 * F)} ${P(ys + 0.1 * F)}L${cx} ${P(ys + 0.7 * F)}L${P(cx + 0.36 * F)} ${P(ys + 0.1 * F)}" fill="#fff" stroke="#0002"/><path d="M${P(cx - 0.1 * F)} ${P(ys + 0.5 * F)}h${P(0.2 * F)}l${P(-0.05 * F)} ${P(1.1 * F)}l${P(-0.05 * F)} ${P(0.18 * F)}l${P(-0.05 * F)} ${P(-0.18 * F)}z" fill="${trim}"/><rect x="${P(cx + 0.35 * F)}" y="${P(ys + 0.95 * F)}" width="${P(0.4 * F)}" height="${P(0.32 * F)}" rx="4" fill="${shade}"/><circle cx="${P(cx + 0.55 * F)}" cy="${P(ys + 1.08 * F)}" r="${P(0.09 * F)}" fill="${accent}"/>${[1.5, 1.9, 2.3].map((k) => `<circle cx="${cx}" cy="${P(ys + k * F)}" r="${P(0.04 * F)}" fill="${trim}"/>`).join('')}`;
    case 'gown': return `${[-1, 1].map((s) => `<path d="M${P(cx + s * 0.32 * F)} ${P(ys + 0.1 * F)}L${P(cx + s * 0.42 * F)} ${P(yb)}" stroke="${trim}" stroke-width="${P(0.26 * F)}"/>`).join('')}<path d="M${P(cx - 0.3 * F)} ${P(ys + 0.1 * F)}L${cx} ${P(ys + 0.55 * F)}L${P(cx + 0.3 * F)} ${P(ys + 0.1 * F)}" fill="${accent}"/>`;
    case 'coat': case 'trench': return `<path d="M${P(cx - 0.22 * F)} ${P(ys + 0.5 * F)}L${P(cx - 0.3 * F)} ${P(yb)}H${P(cx + 0.3 * F)}L${P(cx + 0.22 * F)} ${P(ys + 0.5 * F)}z" fill="${trim}"/>${[0.9, 1.4, 1.9, 2.4].map((k) => `<circle cx="${P(cx - 0.34 * F)}" cy="${P(ys + k * F)}" r="${P(0.05 * F)}" fill="${accent}"/>`).join('')}${style === 'trench' ? `<rect x="${P(cx - 1.1 * F)}" y="${P(ys + 2 * F)}" width="${P(2.2 * F)}" height="${P(0.16 * F)}" rx="4" fill="${shade}"/><rect x="${P(cx - 0.12 * F)}" y="${P(ys + 1.98 * F)}" width="${P(0.24 * F)}" height="${P(0.2 * F)}" rx="4" fill="#2b2420" opacity=".8"/>` : ''}`;
    case 'blazer': return `<path d="M${P(cx - 0.3 * F)} ${P(ys + 0.1 * F)}L${cx} ${P(ys + 1.2 * F)}L${P(cx + 0.3 * F)} ${P(ys + 0.1 * F)}" fill="${accent}"/><path d="M${P(cx - 0.3 * F)} ${P(ys + 0.1 * F)}L${P(cx - 0.05 * F)} ${P(ys + 1.25 * F)}L${P(cx - 0.55 * F)} ${P(ys + 0.6 * F)}z" fill="${shade}"/><path d="M${P(cx + 0.3 * F)} ${P(ys + 0.1 * F)}L${P(cx + 0.05 * F)} ${P(ys + 1.25 * F)}L${P(cx + 0.55 * F)} ${P(ys + 0.6 * F)}z" fill="${shade}"/><circle cx="${P(cx + 0.62 * F)}" cy="${P(ys + 0.95 * F)}" r="${P(0.12 * F)}" fill="${trim}"/><text x="${P(cx + 0.62 * F)}" y="${P(ys + 1.0 * F)}" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="${P(0.14 * F)}" fill="${main}">A</text>${[1.5, 1.85].map((k) => `<circle cx="${cx}" cy="${P(ys + k * F)}" r="${P(0.045 * F)}" fill="${trim}"/>`).join('')}`;
    case 'astro': return `<rect x="${P(cx - 0.42 * F)}" y="${P(ys + 0.8 * F)}" width="${P(0.84 * F)}" height="${P(0.5 * F)}" rx="8" fill="${shade}"/>${[0, 1, 2].map((i) => `<circle class="blink" style="animation-delay:${-i * 0.45}s" cx="${P(cx - 0.24 * F + i * 0.24 * F)}" cy="${P(ys + 0.98 * F)}" r="${P(0.06 * F)}" fill="${['#ff4a3a', '#39ff9f', '#5fd3ff'][i]}"/>`).join('')}<rect x="${P(cx - 0.3 * F)}" y="${P(ys + 1.14 * F)}" width="${P(0.6 * F)}" height="${P(0.07 * F)}" rx="3" fill="#fff" opacity=".6"/>${[-1, 1].map((s) => `<path d="M${P(cx + s * 0.62 * F)} ${P(ys + 0.1 * F)}L${P(cx + s * 0.45 * F)} ${P(yb)}" stroke="${trim}" stroke-width="${P(0.1 * F)}"/>`).join('')}<circle cx="${P(cx - 0.7 * F)}" cy="${P(ys + 0.7 * F)}" r="${P(0.16 * F)}" fill="${accent}" stroke="#fff" stroke-width="3"/><path d="M${P(cx - 0.7 * F)} ${P(ys + 0.6 * F)}l${P(0.04 * F)} ${P(0.08 * F)} ${P(0.09 * F)} ${P(0.01 * F)}-${P(0.07 * F)} ${P(0.06 * F)} ${P(0.02 * F)} ${P(0.09 * F)}-${P(0.08 * F)}-${P(0.05 * F)}-${P(0.08 * F)} ${P(0.05 * F)} ${P(0.02 * F)}-${P(0.09 * F)}-${P(0.07 * F)}-${P(0.06 * F)} ${P(0.09 * F)}-${P(0.01 * F)}z" fill="#fff"/>`;
    case 'pilot': return `<path d="M${P(cx - 0.6 * F)} ${P(ys + 0.05 * F)}Q${cx} ${P(ys + 0.5 * F)} ${P(cx + 0.6 * F)} ${P(ys + 0.05 * F)}" stroke="#e9dcc4" stroke-width="${P(0.22 * F)}" fill="none" stroke-linecap="round"/><path d="M${cx} ${P(ys + 0.4 * F)}V${P(yb)}" stroke="${shade}" stroke-width="4"/><g transform="translate(${P(cx + 0.55 * F)} ${P(ys + 0.9 * F)}) scale(${r1(F / 240)})"><path d="M-40 0q20 -12 40 -4q20 -8 40 4q-20 8 -40 2q-20 6 -40 -2z" fill="${trim}"/><circle r="9" fill="${trim}"/></g>`;
    case 'robe': return `${[-1, 1].map((s) => `<path d="M${P(cx + s * 0.18 * F)} ${P(ys + 0.4 * F)}L${P(cx + s * 0.3 * F)} ${P(yb)}" stroke="${trim}" stroke-width="${P(0.07 * F)}"/>`).join('')}${Array.from({ length: 9 }, (_, i) => `<circle cx="${cx}" cy="${P(ys + (0.6 + i * 0.32) * F)}" r="${P(0.03 * F)}" fill="${trim}"/>`).join('')}<path d="M${P(cx - 0.3 * F)} ${P(ys + 0.15 * F)}Q${cx} ${P(ys + 0.4 * F)} ${P(cx + 0.3 * F)} ${P(ys + 0.15 * F)}" stroke="${trim}" stroke-width="${P(0.05 * F)}" fill="none"/>`;
    case 'labcoat': return `<path d="M${P(cx - 0.24 * F)} ${P(ys + 0.1 * F)}L${cx} ${P(ys + 0.9 * F)}L${P(cx + 0.24 * F)} ${P(ys + 0.1 * F)}L${P(cx + 0.2 * F)} ${P(yb)}H${P(cx - 0.2 * F)}z" fill="${trim}"/><path d="M${P(cx - 0.24 * F)} ${P(ys + 0.1 * F)}L${P(cx - 0.1 * F)} ${P(ys + 1 * F)}L${P(cx - 0.5 * F)} ${P(ys + 0.55 * F)}z" fill="${shade}"/><path d="M${P(cx + 0.24 * F)} ${P(ys + 0.1 * F)}L${P(cx + 0.1 * F)} ${P(ys + 1 * F)}L${P(cx + 0.5 * F)} ${P(ys + 0.55 * F)}z" fill="${shade}"/><rect x="${P(cx + 0.4 * F)}" y="${P(ys + 1.1 * F)}" width="${P(0.38 * F)}" height="${P(0.3 * F)}" rx="3" fill="${shade}"/>${[0, 1, 2].map((i) => `<rect x="${P(cx + 0.46 * F + i * 0.1 * F)}" y="${P(ys + 0.96 * F)}" width="${P(0.05 * F)}" height="${P(0.22 * F)}" rx="2" fill="${[accent, '#c0392b', '#2b2b2b'][i]}"/>`).join('')}`;
    case 'vest': return `<path d="M${P(cx - 0.5 * F)} ${P(ys + 0.2 * F)}L${P(cx - 0.12 * F)} ${P(ys + 0.9 * F)}V${P(yb)}H${P(cx + 0.12 * F)}V${P(ys + 0.9 * F)}L${P(cx + 0.5 * F)} ${P(ys + 0.2 * F)}" fill="${accent}"/>${[-1, 1].map((s) => `<rect x="${P(cx + s * 0.55 * F - 0.2 * F)}" y="${P(ys + 1.2 * F)}" width="${P(0.4 * F)}" height="${P(0.34 * F)}" rx="4" fill="${shade}" stroke="${trim}" stroke-width="2" stroke-dasharray="5 4"/>`).join('')}`;
    case 'batik': {
      const id = `bt${seed % 997}`;
      return `<defs><pattern id="${id}" width="${P(0.36 * F)}" height="${P(0.36 * F)}" patternUnits="userSpaceOnUse"><circle cx="${P(0.18 * F)}" cy="${P(0.18 * F)}" r="${P(0.12 * F)}" fill="none" stroke="${trim}" stroke-width="3"/><circle cx="${P(0.18 * F)}" cy="${P(0.18 * F)}" r="${P(0.04 * F)}" fill="${accent}"/><path d="M0 0l${P(0.36 * F)} ${P(0.36 * F)}" stroke="${trim}" stroke-width="1.5" opacity=".5"/></pattern></defs><path d="${g.torso}" fill="url(#${id})" opacity=".75"/><path d="M${P(cx - 1.05 * F)} ${P(ys + 1.9 * F)}H${P(cx + 1.05 * F)}" stroke="${trim}" stroke-width="${P(0.14 * F)}"/>`;
    }
    case 'kebaya': return `${Array.from({ length: 14 }, (_, i) => `<circle cx="${P(cx + (i % 2 ? 0.12 : -0.12) * F)}" cy="${P(ys + (0.35 + i * 0.16) * F)}" r="${P(0.035 * F)}" fill="${trim}"/>`).join('')}<circle class="glow" cx="${cx}" cy="${P(ys + 0.6 * F)}" r="${P(0.09 * F)}" fill="${trim}"/><path d="M${P(cx - 1.1 * F)} ${P(ys + 2.2 * F)}H${P(cx + 1.1 * F)}" stroke="${accent}" stroke-width="${P(0.2 * F)}"/>`;
    case 'sport': return `${[-1, 1].map((s) => `<path d="M${P(cx + s * 0.95 * F)} ${P(ys + 0.4 * F)}L${P(cx + s * 1.08 * F)} ${P(yb)}" stroke="${trim}" stroke-width="${P(0.08 * F)}"/>`).join('')}<path d="M${P(cx - 0.22 * F)} ${P(ys + 0.05 * F)}Q${cx} ${P(ys + 0.35 * F)} ${P(cx + 0.22 * F)} ${P(ys + 0.05 * F)}" stroke="${trim}" stroke-width="${P(0.06 * F)}" fill="none"/><text x="${cx}" y="${P(ys + 1.45 * F)}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-weight="800" font-size="${P(0.55 * F)}" fill="${trim}">${(seed % 98) + 1}</text>`;
    case 'scrubs': return `<path d="M${P(cx - 0.3 * F)} ${P(ys + 0.1 * F)}L${cx} ${P(ys + 0.7 * F)}L${P(cx + 0.3 * F)} ${P(ys + 0.1 * F)}" fill="${shade}"/><rect x="${P(cx - 0.8 * F)}" y="${P(ys + 1 * F)}" width="${P(0.4 * F)}" height="${P(0.3 * F)}" rx="4" fill="${shade}"/><path d="M${P(cx - 0.5 * F)} ${P(ys + 0.15 * F)}Q${P(cx - 0.6 * F)} ${P(ys + 1.1 * F)} ${P(cx - 0.05 * F)} ${P(ys + 1.25 * F)}Q${P(cx + 0.5 * F)} ${P(ys + 1.1 * F)} ${P(cx + 0.5 * F)} ${P(ys + 0.15 * F)}" stroke="#3a3f4a" stroke-width="${P(0.05 * F)}" fill="none"/><circle cx="${P(cx - 0.05 * F)}" cy="${P(ys + 1.3 * F)}" r="${P(0.09 * F)}" fill="#c9ced6" stroke="#5a6070" stroke-width="3"/>`;
    case 'chef': return `${[-1, 1].map((s) => [0.8, 1.2, 1.6, 2.0].map((k) => `<circle cx="${P(cx + s * 0.26 * F)}" cy="${P(ys + k * F)}" r="${P(0.05 * F)}" fill="${trim}"/>`).join('')).join('')}<path d="M${P(cx - 0.34 * F)} ${P(ys + 0.15 * F)}L${cx} ${P(ys + 0.55 * F)}L${P(cx + 0.34 * F)} ${P(ys + 0.15 * F)}" fill="${accent}"/>`;
    case 'diver': return `<path d="M${cx} ${P(ys + 0.2 * F)}V${P(yb)}" stroke="${trim}" stroke-width="${P(0.05 * F)}" stroke-dasharray="6 4"/>${[-1, 1].map((s) => `<path d="M${P(cx + s * 0.4 * F)} ${P(ys + 0.1 * F)}Q${P(cx + s * 0.9 * F)} ${P(ys + 0.4 * F)} ${P(cx + s * 1.0 * F)} ${P(ys + 1.0 * F)}" stroke="${trim}" stroke-width="${P(0.1 * F)}" fill="none"/>`).join('')}<rect x="${P(cx - 0.9 * F)}" y="${P(ys + 1.7 * F)}" width="${P(1.8 * F)}" height="${P(0.14 * F)}" fill="${accent}"/>`;
    case 'sailor': return `<path d="M${P(cx - 0.75 * F)} ${P(ys + 0.05 * F)}L${cx} ${P(ys + 0.8 * F)}L${P(cx + 0.75 * F)} ${P(ys + 0.05 * F)}L${P(cx + 0.85 * F)} ${P(ys + 0.5 * F)}L${cx} ${P(ys + 1.0 * F)}L${P(cx - 0.85 * F)} ${P(ys + 0.5 * F)}z" fill="${trim}"/><path d="M${P(cx - 0.7 * F)} ${P(ys + 0.4 * F)}L${cx} ${P(ys + 0.9 * F)}L${P(cx + 0.7 * F)} ${P(ys + 0.4 * F)}" stroke="#fff" stroke-width="4" fill="none"/><path d="M${P(cx - 0.18 * F)} ${P(ys + 0.85 * F)}l${P(0.18 * F)} ${P(0.12 * F)} ${P(0.18 * F)} ${P(-0.12 * F)}v${P(0.3 * F)}l${P(-0.18 * F)} ${P(-0.12 * F)} ${P(-0.18 * F)} ${P(0.12 * F)}z" fill="${accent}"/>`;
    case 'neon': return `${[-1, 1].map((s) => `<path class="flow" d="M${P(cx + s * 0.3 * F)} ${P(ys + 0.1 * F)}L${P(cx + s * 0.55 * F)} ${P(ys + 1.2 * F)}L${P(cx + s * 0.35 * F)} ${P(yb)}" stroke="${trim}" stroke-width="${P(0.05 * F)}" fill="none"/>`).join('')}<circle class="glow" cx="${cx}" cy="${P(ys + 1.0 * F)}" r="${P(0.14 * F)}" fill="${accent}"/><path class="flow" d="M${P(cx - 1.0 * F)} ${P(ys + 1.9 * F)}H${P(cx + 1.0 * F)}" stroke="${accent}" stroke-width="${P(0.04 * F)}"/>`;
    default: return '';
  }
}

/* ------------------------------------------------------------------ latar */
function backdrop(set, light, seed, W = 1000) {
  const [id, , , top, bottom, ground, fx] = set;
  const r = rng(seed ^ 0x5eed);
  let s = `<rect width="${W}" height="${W}" fill="url(#sky)"/>`;
  const sun = (x, y, rr, col) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${col}" opacity=".85"/>`;
  const hills = (y, col, amp = 40) => `<path d="M0 ${y}Q250 ${y - amp} 500 ${y}T1000 ${y}V1000H0Z" fill="${col}"/>`;
  const skyline = (y, col, win) => {
    let out = '';
    for (let x = -10; x < W; x += 0) {
      const w = 40 + Math.floor(r() * 60);
      const h = 120 + Math.floor(r() * 260);
      out += `<rect x="${x}" y="${y - h}" width="${w}" height="${h + 400}" fill="${col}"/>`;
      if (win) for (let k = 0; k < 6; k += 1) out += `<rect class="${r() < 0.35 ? 'blink' : ''}" style="animation-delay:${-r() * 3}s" x="${x + 8 + Math.floor(r() * (w - 20))}" y="${y - h + 14 + Math.floor(r() * (h - 30))}" width="8" height="11" fill="${win}" opacity="${r1(0.5 + r() * 0.5)}"/>`;
      x += w + 4;
    }
    return out;
  };
  const mosque = (y, col) => `<g fill="${col}"><path d="M330 ${y}V${y - 150}A170 170 0 0 1 670 ${y - 150}V${y}Z"/><rect x="230" y="${y - 330}" width="34" height="330"/><rect x="736" y="${y - 330}" width="34" height="330"/><path d="M226 ${y - 330}l21 -50 21 50zM732 ${y - 330}l21 -50 21 50zM500 ${y - 330}v-46"/><circle cx="500" cy="${y - 382}" r="9"/></g>`;
  switch (id) {
    case 'classroom': s += `<rect x="90" y="110" width="820" height="360" rx="10" fill="#2f4f3a" stroke="#8a6516" stroke-width="16"/><path class="chalk" d="M140 190q40 -30 80 0t80 0M140 260h220M140 330q60 -40 120 0M600 190l40 80 40 -80M720 300a40 40 0 1 1 1 0" stroke="#f4f1e6" stroke-width="6" fill="none" stroke-linecap="round"/>${hills(860, ground, 0)}`; break;
    case 'library': for (let i = 0; i < 6; i += 1) { s += `<rect x="40" y="${90 + i * 150}" width="920" height="16" fill="#5a3a22"/>`; for (let k = 0; k < 24; k += 1) s += `<rect x="${50 + k * 38}" y="${20 + i * 150}" width="30" height="${60 + (k * 7 + i * 3) % 14}" fill="hsl(${(k * 47 + i * 30) % 360},45%,38%)"/>`; } break;
    case 'schoolyard': s += sun(820, 150, 60, '#fff1b8') + hills(760, '#9cc58a', 60) + `<rect x="80" y="520" width="60" height="240" fill="#6b4a2a"/><circle cx="110" cy="480" r="110" fill="#4f8f45"/>` + hills(840, ground, 20); break;
    case 'orbit': s += `<circle cx="760" cy="1180" r="520" fill="${ground}"/><path d="M300 1000a520 520 0 0 1 900 -380" fill="#5fbf6a" opacity=".45"/><circle cx="760" cy="1180" r="530" fill="none" stroke="#9fd8ff" stroke-width="14" opacity=".35"/>`; break;
    case 'moon': s += `<circle cx="800" cy="200" r="70" fill="#2a6fd1"/><path d="M760 170q30 -10 40 20q-20 10 -40 -20z" fill="#5fbf6a"/>${hills(820, ground, 30)}${[[180, 880, 40], [520, 930, 26], [800, 870, 34]].map(([x, y, rr]) => `<ellipse cx="${x}" cy="${y}" rx="${rr}" ry="${rr * 0.3}" fill="#8a8e98"/>`).join('')}`; break;
    case 'mars': s += sun(180, 180, 40, '#ffd9a0') + hills(780, '#c4562a', 50) + `<path d="M640 780v-60a90 90 0 0 1 180 0v60z" fill="#d3d8e0" opacity=".9"/><rect x="700" y="700" width="40" height="30" rx="6" fill="#5fd3ff"/>` + hills(860, ground, 24); break;
    case 'laboratory': s += `<rect x="0" y="620" width="1000" height="380" fill="#dfe8ea"/><rect x="0" y="620" width="1000" height="24" fill="#9fb8bf"/>${[120, 260, 760, 880].map((x, i) => `<path d="M${x} 560h30v30l28 30h-86l28-30z" fill="${['#ff6aa2', '#5fd3ff', '#f2c94c', '#39ff9f'][i]}" opacity=".7"/>`).join('')}<rect x="60" y="180" width="220" height="14" fill="#9fb8bf"/><rect x="720" y="180" width="220" height="14" fill="#9fb8bf"/>`; break;
    case 'observatory': s += `<path d="M120 1000V700a380 380 0 0 1 760 0v300z" fill="${ground}"/><path d="M460 700l220 -260" stroke="#c9ced6" stroke-width="40"/>`; break;
    case 'greenhouse': s += `${Array.from({ length: 7 }, (_, i) => `<path d="M${i * 160} 0v1000" stroke="#fff" stroke-width="6" opacity=".6"/>`).join('')}<path d="M0 300h1000" stroke="#fff" stroke-width="6" opacity=".6"/>${Array.from({ length: 9 }, (_, i) => `<path class="swing" style="transform-origin:${60 + i * 115}px 860px;animation-delay:${-i * 0.3}s" d="M${60 + i * 115} 860q-30 -90 0 -160q30 70 0 160" fill="#5b8f45"/>`).join('')}${hills(860, ground, 0)}`; break;
    case 'pendopo': s += `<path d="M40 260L500 80l460 180z" fill="#6b3f1e"/><rect x="40" y="260" width="920" height="20" fill="#8a5a2b"/>${[100, 300, 700, 900].map((x) => `<rect x="${x - 18}" y="280" width="36" height="560" fill="#7a4a24"/>`).join('')}${hills(840, ground, 0)}`; break;
    case 'terrace': s += sun(840, 160, 50, '#fff1b8') + [700, 770, 840, 910].map((y, i) => `<path d="M0 ${y}Q500 ${y - 50 - i * 10} 1000 ${y}V1000H0Z" fill="hsl(${100 + i * 8},45%,${48 - i * 5}%)"/><path d="M0 ${y}Q500 ${y - 50 - i * 10} 1000 ${y}" stroke="#d9f2c4" stroke-width="3" fill="none"/>`).join(''); break;
    case 'festival': s += `<path d="M0 140Q250 220 500 150T1000 160" stroke="#c9a35a" stroke-width="3" fill="none"/>${[80, 220, 360, 520, 680, 830, 950].map((x, i) => `<g class="swing" style="transform-origin:${x}px 170px;animation-delay:${-i * 0.4}s"><path d="M${x - 22} 180h44l-8 60h-28z" fill="${['#e0632a', '#f2c94c', '#c0392b'][i % 3]}"/><ellipse class="glow" cx="${x}" cy="210" rx="12" ry="20" fill="#fff6c2"/></g>`).join('')}${hills(880, ground, 20)}`; break;
    case 'stadium': s += `<path d="M0 520Q500 380 1000 520V700H0Z" fill="#1b2a4a"/>${Array.from({ length: 60 }, () => `<circle cx="${Math.floor(r() * 1000)}" cy="${470 + Math.floor(r() * 200)}" r="4" fill="hsl(${Math.floor(r() * 360)},60%,60%)"/>`).join('')}${[160, 840].map((x) => `<rect x="${x - 6}" y="120" width="12" height="400" fill="#8a96a8"/><rect class="glow" x="${x - 50}" y="100" width="100" height="40" rx="6" fill="#fff6c2"/>`).join('')}${hills(760, ground, 0)}`; break;
    case 'track': s += hills(700, '#9cc58a', 30) + `<path d="M0 760H1000V1000H0Z" fill="${ground}"/>${[800, 860, 930].map((y) => `<path d="M0 ${y}H1000" stroke="#fff" stroke-width="5"/>`).join('')}`; break;
    case 'court': s += `<rect y="660" width="1000" height="340" fill="${ground}"/><path d="M100 1000L260 660H740L900 1000" stroke="#fff" stroke-width="6" fill="none"/><path d="M180 820H820" stroke="#fff" stroke-width="5"/><rect x="0" y="540" width="1000" height="8" fill="#fff" opacity=".5"/>`; break;
    case 'hospital': s += `<rect x="0" y="640" width="1000" height="360" fill="#cfe0e6"/><rect x="70" y="160" width="250" height="180" rx="12" fill="#0e1a22"/><path d="M90 250h60l14 -40 18 80 16 -60 12 20h90" class="ecg" stroke="#39ff9f" stroke-width="5" fill="none"/><path d="M760 180h40v-40h40v40h40v40h-40v40h-40v-40h-40z" fill="#e0505a" opacity=".85"/>`; break;
    case 'airport': s += `<rect x="0" y="560" width="1000" height="440" fill="#5a6270"/>${Array.from({ length: 6 }, (_, i) => `<path d="M${i * 180 + 40} 820h80" stroke="#f2c94c" stroke-width="10"/>`).join('')}<g class="drift" style="animation-duration:16s"><path d="M0 220q0 -10 12 -10h120q20 0 20 10t-20 10h-120q-12 0 -12 -10zM60 212l-30 -36h18l40 36zM60 228l-30 36h18l40 -36z" fill="#eef1f5"/></g>`; break;
    case 'studio': s += `${[180, 820].map((x) => `<path d="M${x} 120l-120 440h240z" fill="#fff6c2" opacity=".12" class="glow"/><circle cx="${x}" cy="110" r="30" fill="#3a3a4e"/>`).join('')}<rect y="780" width="1000" height="220" fill="${ground}"/>`; break;
    case 'sakura': s += `<path d="M0 260Q200 180 380 120" stroke="#5f4b5a" stroke-width="22" fill="none"/>${Array.from({ length: 26 }, () => `<circle cx="${Math.floor(r() * 420)}" cy="${80 + Math.floor(r() * 200)}" r="${16 + Math.floor(r() * 26)}" fill="#f7b6c8" opacity=".85"/>`).join('')}${hills(840, ground, 20)}`; break;
    case 'autumn-park': s += `${[120, 860].map((x) => `<rect x="${x - 16}" y="420" width="32" height="420" fill="#5a3f2a"/><circle cx="${x}" cy="380" r="130" fill="#d9541f" opacity=".9"/><circle cx="${x + 60}" cy="440" r="90" fill="#e39b2d" opacity=".9"/>`).join('')}${hills(840, ground, 20)}`; break;
    case 'snowfield': s += hills(720, '#dfe8f4', 60) + `${[120, 220, 820, 900].map((x) => `<path d="M${x} 560l50 140h-100z" fill="#2f5d50"/><path d="M${x} 540l30 70h-60z" fill="#fff"/>`).join('')}` + hills(820, ground, 30); break;
    case 'city-night': s += `<circle cx="820" cy="150" r="50" fill="#fff6c2" opacity=".9"/>${skyline(760, '#0e1530', '#ffd766')}<rect y="760" width="1000" height="240" fill="${ground}"/>`; break;
    case 'riverside': s += sun(500, 560, 120, '#ffd27a') + skyline(600, '#3a2a52') + `<rect y="600" width="1000" height="400" fill="#4a3b6e"/>${Array.from({ length: 10 }, (_, i) => `<path d="M${200 + i * 60} ${640 + i * 30}h${120 - i * 8}" stroke="#ffd27a" stroke-width="5" opacity=".6"/>`).join('')}`; break;
    case 'rain-street': s += skyline(720, '#2f3847', '#e6ebf1') + `<rect y="720" width="1000" height="280" fill="${ground}"/>${[120, 880].map((x) => `<rect x="${x - 6}" y="380" width="12" height="340" fill="#22252e"/><circle class="glow" cx="${x}" cy="370" r="22" fill="#fff6c2"/>`).join('')}`; break;
    case 'mosque': s += mosque(820, '#fff') + `<g opacity=".55">${mosque(820, ground)}</g>` + hills(820, ground, 0); break;
    case 'ramadan': s += `<path d="M800 120a70 70 0 1 0 50 120a56 56 0 1 1 -50 -120z" fill="#fff6c2"/>${mosque(840, '#0a1230')}<rect y="840" width="1000" height="160" fill="${ground}"/>`; break;
    case 'dawn': s += sun(500, 760, 140, '#ffd29a') + mosque(800, '#3a2a4e') + `<rect y="800" width="1000" height="200" fill="${ground}"/>`; break;
    case 'mountain': s += `<path d="M-50 860L260 300l180 260 160 -340 450 640z" fill="${ground}"/><path d="M600 220l-60 100 50 -20 30 40 40 -60z" fill="#fff"/><path d="M260 300l-50 90 40 -10 20 30z" fill="#fff"/>${hills(900, '#5a7a4a', 30)}`; break;
    case 'jungle': s += Array.from({ length: 14 }, (_, i) => `<path class="swing" style="transform-origin:${i * 75}px 1000px;animation-delay:${-i * 0.3}s" d="M${i * 75} 1000q-80 -300 30 -560q40 200 -30 560" fill="hsl(${120 + (i % 4) * 10},45%,${18 + (i % 3) * 6}%)"/>`).join(''); break;
    case 'desert': s += sun(780, 200, 80, '#fff1b8') + [700, 800, 900].map((y, i) => `<path d="M-100 ${y}Q300 ${y - 120} 600 ${y}T1200 ${y}V1000H-100Z" fill="hsl(${34 - i * 3},70%,${70 - i * 8}%)"/>`).join(''); break;
    case 'underwater': s += `${[200, 450, 700].map((x) => `<path d="M${x} 0l-120 1000h80z" fill="#fff" opacity=".06"/>`).join('')}${Array.from({ length: 8 }, (_, i) => `<path class="swing" style="transform-origin:${60 + i * 125}px 1000px;animation-delay:${-i * 0.4}s" d="M${60 + i * 125} 1000q-30 -120 0 -240q30 -80 0 -160" stroke="#2e8a5a" stroke-width="16" fill="none" stroke-linecap="round"/>`).join('')}${hills(920, ground, 20)}`; break;
    case 'beach': s += sun(800, 180, 60, '#fff1b8') + `<rect y="560" width="1000" height="200" fill="#3aa0d1"/><g class="drift" style="animation-duration:12s">${Array.from({ length: 8 }, (_, i) => `<path d="M${i * 160} 600q40 -14 80 0" stroke="#fff" stroke-width="5" fill="none" opacity=".7"/>`).join('')}</g>${hills(760, ground, 20)}`; break;
    case 'reef': s += Array.from({ length: 12 }, (_, i) => `<path class="swing" style="transform-origin:${40 + i * 85}px 1000px;animation-delay:${-i * 0.3}s" d="M${40 + i * 85} 1000v-${120 + (i % 4) * 40}m0 40l-30 -40m30 20l26 -50" stroke="hsl(${(i * 37) % 60},75%,62%)" stroke-width="18" stroke-linecap="round" fill="none"/>`).join('') + hills(950, ground, 10); break;
    case 'neon-city': s += skyline(700, '#140a2e', '#ff4fd8') + `<g class="grid"><path d="${Array.from({ length: 12 }, (_, i) => `M0 ${700 + i * 60}H1000`).join('')}${Array.from({ length: 21 }, (_, i) => `M${500 + (i - 10) * 50} 700L${500 + (i - 10) * 200} 1400`).join('')}" stroke="#5fd3ff" stroke-width="2" opacity=".6"/></g>`; break;
    case 'sky-city': s += [[160, 640], [520, 760], [840, 600]].map(([x, y], i) => `<g class="bob" style="animation-delay:${-i}s;animation-duration:${4 + i}s"><path d="M${x - 110} ${y}h220l-60 90h-100z" fill="#8a6a4a"/><rect x="${x - 90}" y="${y - 40}" width="180" height="40" rx="10" fill="#5fbf6a"/>${[0, 1].map((k) => `<rect x="${x - 60 + k * 70}" y="${y - 140}" width="50" height="100" rx="8" fill="#f4f8ff"/>`).join('')}</g>`).join(''); break;
    case 'holo-lab': s += `<rect y="760" width="1000" height="240" fill="${ground}"/>${[0, 1, 2].map((i) => `<g class="spin" style="transform-origin:500px 520px;animation-duration:${10 + i * 4}s"><ellipse cx="500" cy="520" rx="${380 - i * 60}" ry="${120 - i * 20}" fill="none" stroke="#7cf3ff" stroke-width="3" stroke-dasharray="20 14" opacity=".5"/></g>`).join('')}`; break;
    default: s += hills(840, ground, 20);
  }
  // efek bergerak
  let f = '';
  const N = (n, make) => Array.from({ length: n }, (_, i) => make(i)).join('');
  const rnd = () => r();
  switch (fx) {
    case 'stars': f = N(70, () => `<circle class="twk" style="animation-delay:${r1(-rnd() * 3)}s;animation-duration:${r1(1.6 + rnd() * 2)}s" cx="${Math.floor(rnd() * 1000)}" cy="${Math.floor(rnd() * 640)}" r="${r1(1 + rnd() * 2.4)}" fill="#fff"/>`) + `<path class="shoot" d="M900 80l90 -40" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`; break;
    case 'snow': f = N(60, () => `<circle class="fall" style="animation-duration:${r1(8 + rnd() * 8)}s;animation-delay:${r1(-rnd() * 14)}s" cx="${Math.floor(rnd() * 1000)}" cy="0" r="${r1(2 + rnd() * 4)}" fill="#fff" opacity=".9"/>`); break;
    case 'petals': f = N(34, () => `<path class="fall" style="animation-duration:${r1(8 + rnd() * 8)}s;animation-delay:${r1(-rnd() * 14)}s" transform="translate(${Math.floor(rnd() * 1000)} 0)" d="M0 -10c5-4 11-2 11 4 0 5-5 9-8 14-2-2-4-3-6-4C-6 0-9 -3-8 -7c1-4 5-6 8-3z" fill="#f7b6c8"/>`); break;
    case 'leaves': f = N(26, (i) => `<path class="fall" style="animation-duration:${r1(7 + rnd() * 8)}s;animation-delay:${r1(-rnd() * 12)}s" transform="translate(${Math.floor(rnd() * 1000)} 0)" d="M0 -12c7 0 13 6 13 12 0 6-6 12-13 12C-7 12-13 6-13 0c0-6 6-12 13-12z" fill="${['#e39b2d', '#c9701f', '#b8451c', '#f1c06b'][i % 4]}"/>`); break;
    case 'rain': f = N(70, () => { const x = Math.floor(rnd() * 1040); return `<line class="rain" style="animation-duration:${r1(0.8 + rnd() * 0.7)}s;animation-delay:${r1(-rnd() * 2)}s" x1="${x}" y1="0" x2="${x - 8}" y2="34" stroke="#dfe6ee" stroke-width="2" opacity=".55"/>`; }); break;
    case 'bubbles': f = N(28, () => `<circle class="rise" style="animation-duration:${r1(5 + rnd() * 6)}s;animation-delay:${r1(-rnd() * 10)}s" cx="${Math.floor(rnd() * 1000)}" cy="1000" r="${r1(3 + rnd() * 9)}" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>`); break;
    case 'confetti': f = N(46, (i) => `<rect class="fall" style="animation-duration:${r1(5 + rnd() * 5)}s;animation-delay:${r1(-rnd() * 10)}s" x="${Math.floor(rnd() * 1000)}" y="0" width="10" height="16" fill="hsl(${(i * 47) % 360},80%,60%)"/>`); break;
    case 'dust': case 'motes': f = N(30, () => `<circle class="ff" style="animation-duration:${r1(4 + rnd() * 5)}s;animation-delay:${r1(-rnd() * 6)}s" cx="${Math.floor(rnd() * 1000)}" cy="${Math.floor(rnd() * 1000)}" r="${r1(1.5 + rnd() * 3)}" fill="${fx === 'dust' ? '#ffd9a0' : '#fff6c2'}"/>`); break;
    case 'fireflies': f = N(26, () => `<circle class="ff" style="animation-duration:${r1(3 + rnd() * 4)}s;animation-delay:${r1(-rnd() * 6)}s" cx="${Math.floor(rnd() * 1000)}" cy="${Math.floor(300 + rnd() * 600)}" r="${r1(3 + rnd() * 3)}" fill="#fff38a"/>`); break;
    case 'clouds': f = N(4, (i) => `<g class="drift" style="animation-duration:${30 + i * 9}s;animation-delay:${-i * 11}s"><g transform="translate(0 ${80 + i * 70}) scale(${r1(0.7 + (i % 2) * 0.4)})"><ellipse cx="60" cy="20" rx="70" ry="26" fill="#fff" opacity=".85"/><ellipse cx="110" cy="8" rx="48" ry="30" fill="#fff" opacity=".85"/></g></g>`); break;
    case 'lanterns': f = `<path d="M0 60Q500 150 1000 60" stroke="#c9a35a" stroke-width="3" fill="none"/>` + N(7, (i) => { const x = 70 + i * 145; return `<g class="swing" style="transform-origin:${x}px 90px;animation-delay:${-i * 0.5}s"><path d="M${x - 20} 100h40l-7 54h-26z" fill="${['#c0392b', '#e9c46a', '#2f6fd1'][i % 3]}"/><ellipse class="glow" cx="${x}" cy="128" rx="10" ry="18" fill="#fff6c2"/></g>`; }); break;
    case 'heartbeat': case 'sparkles': f = N(16, () => `<path class="twk" style="animation-delay:${r1(-rnd() * 3)}s" transform="translate(${Math.floor(rnd() * 1000)} ${Math.floor(rnd() * 700)}) scale(${r1(0.5 + rnd())})" d="M0 -14l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" fill="#fff6c2"/>`); break;
    case 'plane': f = `<g class="drift" style="animation-duration:22s;animation-delay:-6s"><path d="M0 110l40 0 20 -14 6 14 30 0 -30 6 -6 14 -20 -14z" fill="#fff" opacity=".85"/></g>`; break;
    case 'windows': f = ''; break;
    case 'birds': f = N(5, (i) => `<g class="drift" style="animation-duration:${18 + i * 3}s;animation-delay:${-i * 4}s"><path d="M0 ${140 + i * 30}q10 -10 20 0q10 -10 20 0" stroke="#241a36" stroke-width="3" fill="none"/></g>`); break;
    case 'waves': f = ''; break;
    case 'grid': case 'rings': case 'chalk': f = N(14, () => `<circle class="twk" style="animation-delay:${r1(-rnd() * 3)}s" cx="${Math.floor(rnd() * 1000)}" cy="${Math.floor(rnd() * 600)}" r="2" fill="#7cf3ff"/>`); break;
    default: break;
  }
  return { back: s, front: `<g class="fx">${f}</g>` };
}

/** Cahaya/suasana: lapisan warna + aurora/bintang. */
function lightLayer(light, seed) {
  switch (light[0]) {
    case 'pagi': return '<rect width="1000" height="1000" fill="#ffcfa8" opacity=".14"/>';
    case 'senja': return '<rect width="1000" height="1000" fill="url(#dusk)" opacity=".38"/>';
    case 'malam': return `<rect width="1000" height="1000" fill="#050b24" opacity=".42"/>${Array.from({ length: 30 }, (_, i) => `<circle class="twk" style="animation-delay:${-((i * 37) % 30) / 10}s" cx="${(i * 331 + seed) % 1000}" cy="${(i * 97) % 420}" r="1.8" fill="#fff"/>`).join('')}`;
    case 'emas': return '<rect width="1000" height="1000" fill="#ffc35a" opacity=".2"/>';
    case 'aurora': return '<rect width="1000" height="1000" fill="#061226" opacity=".3"/><g class="aur" opacity=".55"><path d="M-100 260Q200 120 500 240T1100 180V60Q800 160 500 80T-100 140Z" fill="url(#aur)"/></g>';
    default: return '';
  }
}

const TONE = {
  senja: '<feColorMatrix type="matrix" values="1.04 0 0 0 0.02  0 0.98 0 0 0  0 0 0.9 0 -0.02  0 0 0 1 0"/>',
  emas: '<feColorMatrix type="matrix" values="1.05 0 0 0 0.03  0 1 0 0 0.01  0 0 0.88 0 -0.02  0 0 0 1 0"/>',
  malam: '<feColorMatrix type="matrix" values="0.82 0 0 0 0  0 0.84 0 0 0.01  0 0 0.92 0 0.04  0 0 0 1 0"/>',
  aurora: '<feColorMatrix type="matrix" values="0.94 0 0 0 0  0 0.98 0 0 0.01  0 0 1.03 0 0.03  0 0 0 1 0"/>',
};
const CERAH = '<feComponentTransfer><feFuncR type="linear" slope="1.12" intercept="0.04"/><feFuncG type="linear" slope="1.1" intercept="0.035"/><feFuncB type="linear" slope="1.06" intercept="0.03"/></feComponentTransfer>';

/* ------------------------------------------------------------------ figur */
export function modelSvg(d, ctx = {}) {
  const p = modelParts(d);
  const { pose, series, look, prop, setting, light, motion, acc, pal } = p;
  const [, , , style, main, shade, trim0, accent0] = look;
  const trim = pal[4] ?? trim0;
  const accent = accent0;
  const mo = motion[0];
  const full = mo === 'float';
  const F = full ? 168 : 290;
  const chinY = full ? 310 : 450;
  const cx = 500;
  const ys = chinY + 0.2 * F;
  const S = 0.6 * F;
  const hem = full ? ys + 3.7 * F : 1030;
  const torso = full
    ? `M${P(cx - S)} ${P(ys + 20)}Q${cx} ${P(ys - 30)} ${P(cx + S)} ${P(ys + 20)}C${P(cx + S + 10)} ${P(ys + 1.2 * F)} ${P(cx + S + 0.3 * F)} ${P(ys + 2.6 * F)} ${P(cx + S + 0.55 * F)} ${P(hem)}Q${cx} ${P(hem + 26)} ${P(cx - S - 0.55 * F)} ${P(hem)}C${P(cx - S - 0.3 * F)} ${P(ys + 2.6 * F)} ${P(cx - S - 10)} ${P(ys + 1.2 * F)} ${P(cx - S)} ${P(ys + 20)}Z`
    : `M${P(cx - S)} ${P(ys + 20)}Q${cx} ${P(ys - 30)} ${P(cx + S)} ${P(ys + 20)}C${P(cx + S + 20)} ${P(ys + 0.6 * F)} ${P(cx + S + 30)} ${P(ys + 1.4 * F)} ${P(cx + S + 50)} 1030H${P(cx - S - 50)}C${P(cx - S - 30)} ${P(ys + 1.4 * F)} ${P(cx - S - 20)} ${P(ys + 0.6 * F)} ${P(cx - S)} ${P(ys + 20)}Z`;
  const g = { cx, ys, S, F, hem, torso };

  // lengan: titik bahu, siku, tangan per gerak
  const Aw = 0.3 * F;
  const sh = { L: [cx - S * 0.86, ys + 0.22 * F], R: [cx + S * 0.86, ys + 0.22 * F] };
  let L = { e: [cx - S * 1.06, ys + 1.25 * F], h: [cx - 0.38 * F, ys + 1.45 * F] };
  let R = { e: [cx + S * 1.06, ys + 1.25 * F], h: [cx + 0.38 * F, ys + 1.42 * F] };
  let propAt = [cx, ys + 1.3 * F, 0.95 * F];
  if (mo === 'wave') { R = { e: [cx + S * 1.38, ys + 0.5 * F], h: [cx + S * 1.5, ys - 0.5 * F] }; L.h = [cx - 0.15 * F, ys + 1.42 * F]; propAt = [cx - 0.05 * F, ys + 1.28 * F, 0.95 * F]; }
  if (mo === 'cheer') { R = { e: [cx + S * 1.32, ys + 0.3 * F], h: [cx + S * 1.15, ys - 0.75 * F] }; L = { e: [cx - S * 1.32, ys + 0.3 * F], h: [cx - S * 1.15, ys - 0.75 * F] }; propAt = [cx + S * 1.15, ys - 1.05 * F, 0.85 * F]; }
  if (full) { R = { e: [cx + S * 1.36, ys + 0.75 * F], h: [cx + S * 1.78, ys + 0.5 * F] }; L = { e: [cx - S * 1.36, ys + 0.75 * F], h: [cx - S * 1.78, ys + 0.5 * F] }; propAt = [cx + S * 2.3, ys + 0.1 * F, 0.9 * F]; }
  const arm = (side, a, cls) => `<g class="${cls}" style="transform-origin:${P(sh[side][0])}px ${P(sh[side][1])}px">${sleeve(sh[side][0], sh[side][1], a.e[0], a.e[1], Aw, main)}${sleeve(a.e[0], a.e[1], a.h[0], a.h[1], Aw * 0.9, main)}${sleeve(a.e[0] + (a.h[0] - a.e[0]) * 0.78, a.e[1] + (a.h[1] - a.e[1]) * 0.78, a.e[0] + (a.h[0] - a.e[0]) * 0.84, a.e[1] + (a.h[1] - a.e[1]) * 0.84, Aw * 0.95, trim)}${hand(a.h[0], a.h[1], 0.085 * F, side === 'L' ? -12 : 12)}</g>`;

  // kepala: foto (izin) atau ilustrasi netral
  const head = ctx.head;
  const tone = TONE[light[0]] ?? '';
  let headSvg;
  let faceTop;
  let hw = 1.2 * F;
  if (head) {
    const H = F / head.chin;
    const w = H * head.ar;
    const x = cx - head.cx * w;
    const y = chinY - head.chin * H;
    faceTop = y;
    hw = w;
    headSvg = `<image href="${esc(head.href)}" x="${P(x)}" y="${P(y)}" width="${P(w)}" height="${P(H)}" preserveAspectRatio="xMidYMid meet" filter="url(#cerah)"/>`;
  } else {
    faceTop = chinY - 1.12 * F;
    headSvg = `<path d="M${P(cx - 0.62 * F)} ${P(chinY + 0.3 * F)}Q${P(cx - 0.72 * F)} ${P(chinY - 1.12 * F)} ${cx} ${P(chinY - 1.12 * F)}Q${P(cx + 0.72 * F)} ${P(chinY - 1.12 * F)} ${P(cx + 0.62 * F)} ${P(chinY + 0.3 * F)}Q${cx} ${P(chinY + 0.42 * F)} ${P(cx - 0.62 * F)} ${P(chinY + 0.3 * F)}Z" fill="#f3efe6"/><ellipse cx="${cx}" cy="${P(chinY - 0.47 * F)}" rx="${P(0.36 * F)}" ry="${P(0.47 * F)}" fill="${SKIN}"/><path d="M${P(cx - 0.4 * F)} ${P(chinY - 0.62 * F)}Q${cx} ${P(chinY - 1.18 * F)} ${P(cx + 0.4 * F)} ${P(chinY - 0.62 * F)}" stroke="#f3efe6" stroke-width="${P(0.2 * F)}" fill="none"/><circle cx="${P(cx - 0.13 * F)}" cy="${P(chinY - 0.52 * F)}" r="${P(0.035 * F)}" fill="#3a2a22"/><circle cx="${P(cx + 0.13 * F)}" cy="${P(chinY - 0.52 * F)}" r="${P(0.035 * F)}" fill="#3a2a22"/><path d="M${P(cx - 0.1 * F)} ${P(chinY - 0.25 * F)}q${P(0.1 * F)} ${P(0.08 * F)} ${P(0.2 * F)} 0" stroke="#a0524a" stroke-width="3" fill="none"/>`;
  }
  const faceMidY = chinY - 0.5 * F;
  // kerudung menjuntai menutup bahu (warna kerudung pose) → tepi bawah potret tidak terlihat terpotong
  const hc = head ? pose[5][5] ?? '#f2f0ea' : '#f3efe6';
  const dt = 0.4 * hw;
  const db = Math.max(0.5 * hw, 0.56 * F);
  const yT = chinY - 0.18 * F;
  const yB = ys + 0.36 * F;
  const did = `dr${d.seed % 9973}`;
  const drape = `<defs><linearGradient id="${did}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hc}"/><stop offset="1" stop-color="${hc}" stop-opacity=".92"/></linearGradient></defs><path d="M${P(cx - dt)} ${P(yT)}C${P(cx - dt - 0.08 * F)} ${P(chinY + 0.12 * F)} ${P(cx - db)} ${P(yB - 0.2 * F)} ${P(cx - db)} ${P(yB)}Q${cx} ${P(yB + 0.22 * F)} ${P(cx + db)} ${P(yB)}C${P(cx + db)} ${P(yB - 0.2 * F)} ${P(cx + dt + 0.08 * F)} ${P(chinY + 0.12 * F)} ${P(cx + dt)} ${P(yT)}Z" fill="url(#${did})"/><path d="M${P(cx - db * 0.55)} ${P(yB - 0.05 * F)}Q${P(cx - db * 0.3)} ${P(chinY + 0.25 * F)} ${P(cx - dt * 0.5)} ${P(chinY + 0.05 * F)}M${P(cx + db * 0.55)} ${P(yB - 0.05 * F)}Q${P(cx + db * 0.3)} ${P(chinY + 0.25 * F)} ${P(cx + dt * 0.5)} ${P(chinY + 0.05 * F)}" stroke="#000" stroke-opacity=".07" stroke-width="${P(0.035 * F)}" fill="none" stroke-linecap="round"/><path d="M${P(cx - db)} ${P(yB)}Q${cx} ${P(yB + 0.22 * F)} ${P(cx + db)} ${P(yB)}" stroke="#000" stroke-opacity=".1" stroke-width="3" fill="none"/>`;

  // aksesori di belakang / depan
  let behind = '';
  let front = '';
  if (acc[0] === 'backpack') { behind += `<rect x="${P(cx - S - 0.3 * F)}" y="${P(ys + 0.1 * F)}" width="${P(0.5 * F)}" height="${P(1.6 * F)}" rx="${P(0.2 * F)}" fill="${shade}"/><rect x="${P(cx + S - 0.2 * F)}" y="${P(ys + 0.1 * F)}" width="${P(0.5 * F)}" height="${P(1.6 * F)}" rx="${P(0.2 * F)}" fill="${shade}"/>`; front += `<path d="M${P(cx - 0.55 * F)} ${P(ys + 0.05 * F)}Q${P(cx - 0.72 * F)} ${P(ys + 0.9 * F)} ${P(cx - 0.6 * F)} ${P(ys + 1.6 * F)}M${P(cx + 0.55 * F)} ${P(ys + 0.05 * F)}Q${P(cx + 0.72 * F)} ${P(ys + 0.9 * F)} ${P(cx + 0.6 * F)} ${P(ys + 1.6 * F)}" stroke="${trim}" stroke-width="${P(0.1 * F)}" fill="none" stroke-linecap="round"/>`; }
  if (acc[0] === 'satchel') front += `<path d="M${P(cx - 0.6 * F)} ${P(ys + 0.05 * F)}L${P(cx + 0.9 * F)} ${P(ys + 1.9 * F)}" stroke="${trim}" stroke-width="${P(0.08 * F)}"/><rect x="${P(cx + 0.6 * F)}" y="${P(ys + 1.75 * F)}" width="${P(0.6 * F)}" height="${P(0.45 * F)}" rx="10" fill="${shade}" stroke="${trim}" stroke-width="3"/>`;
  if (acc[0] === 'scarf') front += `<path d="M${P(cx - 0.7 * F)} ${P(ys + 0.3 * F)}Q${cx} ${P(ys + 0.75 * F)} ${P(cx + 0.7 * F)} ${P(ys + 0.3 * F)}" stroke="${trim}" stroke-width="${P(0.18 * F)}" fill="none" stroke-linecap="round"/><path class="swing" style="transform-origin:${P(cx + 0.4 * F)}px ${P(ys + 0.5 * F)}px" d="M${P(cx + 0.3 * F)} ${P(ys + 0.5 * F)}q${P(0.1 * F)} ${P(0.5 * F)} 0 ${P(1.0 * F)}l${P(-0.16 * F)} 0q0 ${P(-0.5 * F)} ${P(0.04 * F)} ${P(-0.95 * F)}z" fill="${trim}"/>`;
  let over = '';
  if (acc[0] === 'headphones') over += `<path d="M${P(cx - 0.62 * F)} ${P(faceMidY)}A${P(0.62 * F)} ${P(0.68 * F)} 0 0 1 ${P(cx + 0.62 * F)} ${P(faceMidY)}" stroke="#22252e" stroke-width="${P(0.07 * F)}" fill="none" stroke-linecap="round"/>${[-1, 1].map((s) => `<rect x="${P(cx + s * 0.62 * F - 0.09 * F)}" y="${P(faceMidY - 0.12 * F)}" width="${P(0.18 * F)}" height="${P(0.28 * F)}" rx="${P(0.07 * F)}" fill="#22252e"/><rect x="${P(cx + s * 0.62 * F - 0.05 * F)}" y="${P(faceMidY - 0.08 * F)}" width="${P(0.1 * F)}" height="${P(0.2 * F)}" rx="5" fill="${trim}"/>`).join('')}`;
  if (look[0] === 'graduate') over += `<g transform="translate(${cx} ${P(faceTop + 0.06 * F)})"><path d="M${P(-0.75 * F)} 0L0 ${P(-0.24 * F)}L${P(0.75 * F)} 0L0 ${P(0.24 * F)}z" fill="#141a2e"/><rect x="${P(-0.34 * F)}" y="${P(0.05 * F)}" width="${P(0.68 * F)}" height="${P(0.22 * F)}" rx="4" fill="#141a2e"/><g class="swing" style="transform-origin:0px 0px"><path d="M0 0L${P(0.6 * F)} ${P(0.12 * F)}V${P(0.5 * F)}" stroke="${trim}" stroke-width="4" fill="none"/><rect x="${P(0.56 * F)}" y="${P(0.48 * F)}" width="10" height="${P(0.16 * F)}" fill="${trim}"/></g></g>`;
  if (style === 'astro') { behind += `<rect x="${P(cx - S * 0.9)}" y="${P(ys - 0.1 * F)}" width="${P(S * 1.8)}" height="${P(1.4 * F)}" rx="${P(0.2 * F)}" fill="${shade}"/>`; over += `<circle cx="${cx}" cy="${P(faceMidY - 0.05 * F)}" r="${P(0.95 * F)}" fill="#bfe6ff" fill-opacity=".14" stroke="#e9edf3" stroke-width="${P(0.07 * F)}"/><path d="M${P(cx - 0.6 * F)} ${P(faceMidY - 0.55 * F)}A${P(0.85 * F)} ${P(0.85 * F)} 0 0 1 ${P(cx + 0.2 * F)} ${P(faceMidY - 0.92 * F)}" stroke="#fff" stroke-width="${P(0.05 * F)}" fill="none" opacity=".6" stroke-linecap="round"/>`; }

  // properti: payung & layang-layang di belakang, robot di samping, lainnya dipegang
  const pid = prop[0];
  const propEl = (() => {
    if (pid === 'umbrella') return at(cx + 0.45 * F, faceTop + 0.2 * F, 1.3 * F, propSvg(pid, trim, accent));
    if (pid === 'kite') return at(propAt[0], propAt[1], propAt[2], propSvg(pid, trim, accent));
    if (pid === 'robot' || pid === 'drone') return at(full ? propAt[0] : cx + S * 1.6, full ? propAt[1] : (pid === 'drone' ? ys - 0.4 * F : ys + 2.2 * F), propAt[2], propSvg(pid, trim, accent));
    if (pid === 'stethoscope') return '';
    const isBook = pid === 'book' || pid === 'quran';
    if (mo === 'read' && isBook) {
      const [x, y, s] = propAt;
      return `<g transform="translate(${P(x)} ${P(y)}) scale(${r1(s / 100)})"><path d="M-74 -40Q0 -56 74 -40V40Q0 26 -74 40z" fill="${pid === 'quran' ? '#1e5a3c' : trim}"/><path d="M-68 -36Q-34 -48 0 -38V34Q-34 26 -68 34z" fill="#fbf6ea"/><g class="page" style="transform-origin:${P(x)}px ${P(y)}px"><path d="M68 -36Q34 -48 0 -38V34Q34 26 68 34z" fill="#f4eee0"/></g>${[0, 1, 2, 3].map((i) => `<path d="M-58 ${-24 + i * 14}h46M12 ${-24 + i * 14}h46" stroke="#8a8073" stroke-width="3" opacity=".5"/>`).join('')}</g>`;
    }
    return at(propAt[0], propAt[1], propAt[2], propSvg(pid, trim, accent), full ? 'pr bob' : 'pr');
  })();
  const behindProp = pid === 'umbrella' || pid === 'kite' ? propEl : '';
  const steth = `<path d="M${P(cx - 0.5 * F)} ${P(ys + 0.15 * F)}Q${P(cx - 0.6 * F)} ${P(ys + 1.1 * F)} ${P(cx - 0.05 * F)} ${P(ys + 1.25 * F)}Q${P(cx + 0.5 * F)} ${P(ys + 1.1 * F)} ${P(cx + 0.5 * F)} ${P(ys + 0.15 * F)}" stroke="#3a3f4a" stroke-width="${P(0.05 * F)}" fill="none"/><circle cx="${P(cx - 0.05 * F)}" cy="${P(ys + 1.3 * F)}" r="${P(0.09 * F)}" fill="#c9ced6" stroke="#5a6070" stroke-width="3"/>`;
  const handProp = behindProp ? '' : propEl;

  const bg = backdrop(setting, light, d.seed);
  const shadow = `<ellipse cx="${cx}" cy="${P(full ? hem + 40 : 990)}" rx="${P(full ? 1.6 * F : 2.4 * F)}" ry="${P(0.16 * F)}" fill="#000" opacity="${full ? 0.12 : 0.18}"/>`;
  const halo = `<circle class="halo" style="transform-origin:${cx}px ${P(faceMidY)}px" cx="${cx}" cy="${P(faceMidY)}" r="${P(1.3 * F)}" fill="url(#halo)"/>`;
  const shoes = full ? `<ellipse cx="${P(cx - 0.32 * F)}" cy="${P(hem + 8)}" rx="${P(0.26 * F)}" ry="${P(0.1 * F)}" fill="#2b2420"/><ellipse cx="${P(cx + 0.32 * F)}" cy="${P(hem + 8)}" rx="${P(0.26 * F)}" ry="${P(0.1 * F)}" fill="#2b2420"/>` : '';
  const figure = `<g class="fig" style="transform-origin:${cx}px ${P(full ? hem : 1000)}px">${halo}${behindProp}${behind}${shoes}<path d="${torso}" fill="${main}"/><path d="M${P(cx + 0.15 * S)} ${P(ys - 10)}L${P(cx + S)} ${P(ys + 20)}C${P(cx + S + 20)} ${P(ys + 0.6 * F)} ${P(cx + S + 30)} ${P(ys + 1.4 * F)} ${P(cx + S + 50)} ${P(full ? hem : 1030)}H${P(cx + 0.25 * S)}Z" fill="${shade}" opacity=".35"/>${outfitDetail(style, look, trim, accent, g, d.seed)}${pid === 'stethoscope' && style !== 'scrubs' ? steth : ''}${front}${arm('L', L, 'armL')}${handProp}${arm('R', R, 'armR')}<g class="head" style="transform-origin:${cx}px ${P(chinY + 0.1 * F)}px">${drape}${headSvg}${over}</g></g>`;

  const badge = `<g><rect x="36" y="36" width="${series[1].length * 15 + series[2].length * 12 + 90}" height="50" rx="25" fill="#000" fill-opacity=".5"/>${text(64, 69, `${series[1].toUpperCase()} · ${series[2]}`, 'font-family="Helvetica,Arial,sans-serif" font-size="19" font-weight="700" letter-spacing="1.5" fill="#fff"')}</g>`;
  const defs = `<defs>${linear('sky', [setting[3], setting[4]], 0, 0, 0, 1)}${linear('dusk', ['#3b2a6e', '#e8625a', '#fbc46a'], 0, 0, 0, 1)}${linear('aur', ['#39ff9f', '#5fd3ff', '#c6a7ff'], 0, 0, 1, 0)}${radial('halo', '#fff6c2', '#fff6c200', 0.5, 0.5, 0.5)}<filter id="cerah" color-interpolation-filters="sRGB">${CERAH}${tone}</filter></defs>`;
  return `${svgOpen(1000, 1000)}<style>${CSS}</style>${defs}<g class="m-${mo}">${bg.back}${lightLayer(light, d.seed)}${shadow}${figure}${bg.front}</g>${badge}${hallmark(1000, 1000)}</svg>`;
}

export function modelPlayer(d, meta, ctx = {}, opts = {}) {
  const n = opts.nonce ? ` nonce="${opts.nonce}"` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.name)}</title><style${n}>html,body{margin:0;height:100%;background:#000;overflow:hidden}svg{width:100vmin;height:100vmin;display:block;margin:auto}</style></head><body>${modelSvg(d, ctx)}</body></html>`;
}
