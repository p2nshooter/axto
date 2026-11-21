/**
 * Renderer MODEL: figur ilustrasi + potret model berizin. ctx.head = {href, ar, cx, chin} (href data-URI/URL;
 * worker menyisipkan data-URI agar tampil di OpenSea). Tanpa ctx.head → siluet kepala netral (untuk QA).
 */
import { esc } from '../core.js';
import { svgOpen, linear, radial, starfield, starPath, roundRect, r1, text, hallmark } from './common.js';

const SKIN = '#c08a6c';

function prop(id, x, y, c) {
  switch (id) {
    case 'book': return `<g transform="translate(${x} ${y}) rotate(-12)"><rect x="-46" y="-34" width="92" height="68" rx="4" fill="${c}"/><rect x="-46" y="-34" width="12" height="68" fill="#0003"/></g>`;
    case 'globe': return `<g transform="translate(${x} ${y})"><circle r="40" fill="#3a8fd1"/><path d="M-20 -22q18 10 6 30q-18 -4 -6 -30zM8 4q20 0 14 22q-14 -6 -14 -22z" fill="#5fbf6a"/><path d="M0 40v26M-24 66h48" stroke="#8a6516" stroke-width="6"/></g>`;
    case 'telescope': return `<g transform="translate(${x} ${y}) rotate(-30)"><rect x="-70" y="-14" width="140" height="28" rx="8" fill="#c9ced6"/><rect x="50" y="-18" width="28" height="36" rx="6" fill="#8a96a8"/></g>`;
    case 'flag': return `<g transform="translate(${x} ${y})"><path d="M0 60V-70" stroke="#5a3a22" stroke-width="6"/><path class="fl" d="M0 -70h70l-14 22l14 22H0z" fill="${c}"/></g>`;
    case 'tablet': return `<g transform="translate(${x} ${y})"><rect x="-42" y="-56" width="84" height="112" rx="10" fill="#1b1f2a"/><rect x="-34" y="-46" width="68" height="88" rx="4" fill="#5fd3ff" opacity=".8"/></g>`;
    case 'flower': return `<g transform="translate(${x} ${y})"><path d="M0 60V0" stroke="#3f8a3a" stroke-width="5"/>${[0, 72, 144, 216, 288].map((a) => `<ellipse cy="-16" rx="10" ry="18" fill="#ff6aa2" transform="rotate(${a})"/>`).join('')}<circle r="9" fill="#ffd166"/></g>`;
    case 'lantern': return `<g transform="translate(${x} ${y})"><path d="M0 -70v14" stroke="#c9a35a" stroke-width="4"/><path d="M-26 -56h52l-8 90h-36z" fill="#e9c46a" opacity=".9"/><ellipse class="gl" cy="-10" rx="16" ry="26" fill="#fff6c2"/></g>`;
    case 'trophy': return `<g transform="translate(${x} ${y})"><path d="M-30 -50h60v26a30 30 0 0 1-60 0z" fill="#e9c46a"/><rect x="-6" y="6" width="12" height="26" fill="#e9c46a"/><rect x="-26" y="32" width="52" height="12" fill="#c9a35a"/></g>`;
    case 'camera': return `<g transform="translate(${x} ${y})"><rect x="-44" y="-28" width="88" height="56" rx="8" fill="#22252e"/><circle r="18" fill="#5a6fa8" stroke="#ccc" stroke-width="4"/></g>`;
    default: return `<g transform="translate(${x} ${y}) rotate(20)"><path d="M0 -60c18 18 18 60 10 80h-20c-8-20-8-62 10-80z" fill="#eef1f5"/><path d="M-10 20l-14 18h14zM10 20l14 18h-14z" fill="#e0632a"/><path class="fl" d="M-6 22q6 26 12 0z" fill="#ffb03a"/></g>`;
  }
}

function sceneBg(id, c1, c2, seed) {
  let s = `<rect width="1000" height="1000" fill="url(#scene)"/>`;
  if (id === 'orbit' || id === 'mars') s += starfield(seed, 1000, 1000, 120);
  if (id === 'orbit') s += '<circle cx="820" cy="1100" r="420" fill="#2a6fd1"/><path d="M500 1000a420 420 0 0 1 700 -200" fill="#5fbf6a" opacity=".5"/>';
  if (id === 'mars') s += '<path d="M0 820Q300 760 600 820T1000 800V1000H0Z" fill="#c4562a"/>';
  if (id === 'classroom') s += '<rect x="120" y="120" width="760" height="300" rx="8" fill="#2f4f3a"/><rect x="120" y="120" width="760" height="300" rx="8" fill="none" stroke="#8a6516" stroke-width="14"/>';
  if (id === 'library') s += Array.from({ length: 5 }, (_, i) => `<rect x="60" y="${120 + i * 150}" width="880" height="14" fill="#5a3a22"/>${Array.from({ length: 22 }, (__, k) => `<rect x="${70 + k * 40}" y="${50 + i * 150}" width="30" height="70" fill="hsl(${(k * 47 + i * 30) % 360},45%,40%)"/>`).join('')}`).join('');
  if (id === 'mosque') s += '<path d="M300 700V520A200 200 0 0 1 700 520V700Z" fill="#fff" opacity=".55"/><rect x="200" y="380" width="30" height="320" fill="#fff" opacity=".5"/><rect x="770" y="380" width="30" height="320" fill="#fff" opacity=".5"/>';
  if (id === 'underwater') s += Array.from({ length: 18 }, (_, i) => `<circle cx="${(i * 131) % 1000}" cy="${(i * 277) % 900}" r="${4 + (i % 5) * 3}" fill="#fff" opacity=".2"/>`).join('');
  if (id === 'snow') s += Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 97) % 1000}" cy="${(i * 173) % 1000}" r="${2 + (i % 3)}" fill="#fff"/>`).join('');
  if (id === 'city-night') s += Array.from({ length: 25 }, (_, i) => `<rect x="${i * 40}" y="${520 + ((i * 53) % 200)}" width="36" height="500" fill="#0a0e1e"/>`).join('');
  if (id === 'sunrise') s += '<circle cx="500" cy="760" r="160" fill="#ffd166" opacity=".8"/><path d="M0 820Q500 700 1000 820V1000H0Z" fill="#6aa84f"/>';
  if (id === 'beach') s += '<path d="M0 760Q500 720 1000 760V1000H0Z" fill="#f3dca0"/><path d="M0 700Q500 680 1000 700V760H0Z" fill="#3aa0d1" opacity=".6"/>';
  if (id === 'garden') s += Array.from({ length: 14 }, (_, i) => `<circle cx="${40 + i * 70}" cy="${860 + (i % 3) * 20}" r="26" fill="#ff6aa2" opacity=".7"/>`).join('');
  return s;
}

export function modelSvg(d, ctx = {}) {
  const [pose, series, outfit, propT, scene, , hue] = d.pick;
  const [, , , , main, accent] = outfit;
  const [, , , , s1, s2] = scene;
  const head = ctx.head;
  const H = 300;
  const p = pose[5];
  const w = H * p[2];
  const hx = 500 - p[3] * w;
  const hy = 140;
  const chinY = hy + p[4] * H;
  const shoulder = chinY + 20;
  const headSvg = head ? `<image href="${esc(head.href)}" x="${r1(hx)}" y="${hy}" width="${r1(w)}" height="${H}" preserveAspectRatio="xMidYMid meet" filter="url(#cerah)"/>` : `<ellipse cx="500" cy="${r1(chinY - 90)}" rx="78" ry="96" fill="${SKIN}"/><path d="M410 ${r1(chinY - 120)}q90-110 180 0v80q-90-40-180 0z" fill="#f4f4f4"/>`;
  const body = `<path d="M370 ${r1(shoulder + 30)}Q500 ${r1(shoulder - 10)} 630 ${r1(shoulder + 30)}L690 880H310Z" fill="${main}" stroke="#0003" stroke-width="3"/><path d="M470 ${r1(shoulder)}L500 ${r1(shoulder + 90)}L530 ${r1(shoulder)}" fill="${accent}"/><path d="M330 880H670L690 930H310Z" fill="${accent}" opacity=".7"/>`;
  const arms = `<g class="armL"><path d="M380 ${r1(shoulder + 40)}Q300 ${r1(shoulder + 160)} 330 ${r1(shoulder + 270)}" stroke="${main}" stroke-width="54" stroke-linecap="round" fill="none"/><circle cx="332" cy="${r1(shoulder + 280)}" r="22" fill="${SKIN}"/></g><g class="armR"><path d="M620 ${r1(shoulder + 40)}Q700 ${r1(shoulder + 160)} 670 ${r1(shoulder + 270)}" stroke="${main}" stroke-width="54" stroke-linecap="round" fill="none"/><circle cx="668" cy="${r1(shoulder + 280)}" r="22" fill="${SKIN}"/></g>`;
  const extra = outfit[0] === 'astronaut' ? `<circle cx="500" cy="${r1(chinY - 70)}" r="190" fill="#bfe6ff" fill-opacity=".18" stroke="#e9edf3" stroke-width="10"/>` : '';
  const badge = `<g><rect x="40" y="40" width="${series[1].length * 15 + 60}" height="52" rx="26" fill="#000" fill-opacity=".55"/>${text(70, 74, series[1].toUpperCase(), 'font-family="Helvetica,Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="2" fill="#fff"')}</g>`;
  const defs = `<defs>${linear('scene', [s1, s2], 0, 0, 0, 1)}<filter id="cerah" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="1.14" intercept=".045"/><feFuncG type="linear" slope="1.12" intercept=".04"/><feFuncB type="linear" slope="1.08" intercept=".03"/></feComponentTransfer></filter><filter id="hue"><feColorMatrix type="hueRotate" values="${hue[4]}"/></filter></defs>`;
  return `${svgOpen(1000, 1000)}${defs}<g filter="url(#hue)">${sceneBg(scene[0], s1, s2, d.seed)}</g><ellipse cx="500" cy="935" rx="220" ry="22" fill="#000" opacity=".2"/><g class="fig">${body}${arms}${headSvg}${extra}${prop(propT[0], 690, r1(shoulder + 250), accent)}</g>${badge}${hallmark(1000, 1000)}</svg>`;
}

export function modelPlayer(d, meta, ctx = {}, opts = {}) {
  const anim = d.pick[5][0];
  const n = opts.nonce ? ` nonce="${opts.nonce}"` : '';
  const css = {
    wave: '.armR{transform-box:fill-box;transform-origin:0 0;animation:a 1.2s ease-in-out infinite alternate}@keyframes a{to{transform:rotate(-38deg)}}',
    read: '.fig{animation:a 4s ease-in-out infinite alternate}@keyframes a{to{transform:translateY(6px)}}',
    float: '.fig{animation:a 5s ease-in-out infinite alternate}@keyframes a{to{transform:translateY(-30px) rotate(1.5deg)}}',
    walk: '.fig{animation:a 1s ease-in-out infinite alternate}@keyframes a{to{transform:translateX(12px) translateY(-6px)}}',
    sparkle: '.fig{animation:a 2s ease-in-out infinite}@keyframes a{50%{filter:brightness(1.25) drop-shadow(0 0 18px #fff)}}',
    spotlight: 'body::after{content:"";position:fixed;inset:0;background:radial-gradient(circle at 50% 40%,transparent 25%,#000c 60%);animation:a 6s ease-in-out infinite alternate}@keyframes a{to{background-position:30px 0}}',
    parallax: 'svg>g:first-of-type{animation:a 8s ease-in-out infinite alternate}@keyframes a{to{transform:translateX(-30px)}}',
    portal: '.fig{animation:a 3s ease-in-out infinite}@keyframes a{50%{filter:drop-shadow(0 0 30px #7cf3ff)}}',
  }[anim] ?? '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.name)}</title><style${n}>html,body{margin:0;height:100%;background:#000;overflow:hidden}svg{width:100vmin;height:100vmin;display:block;margin:auto}.fl{animation:f .3s linear infinite alternate}.gl{animation:g 1.4s ease-in-out infinite}@keyframes f{to{opacity:.6}}@keyframes g{50%{opacity:.5}}${css}@media(prefers-reduced-motion:reduce){*{animation:none!important}}</style></head><body>${modelSvg(d, ctx)}</body></html>`;
}
