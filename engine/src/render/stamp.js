/**
 * Renderer STAMP: prangko vektor (image) + player (animasi motif, zoom vektor tanpa pecah, galaksi deep-zoom).
 */
import { esc, rng, pad } from '../core.js';
import { collection } from '../core.js';
import { applyMotion } from './motion.js';
import { svgOpen, linear, radial, starPath, polyPath, perforatedRect, starfield, r1, text, exclusiveBadge, hallmark } from './common.js';
import { motif } from './motifs.js';

function outline(frame) {
  // kotak badan prangko di kanvas 1000×1000 → {kind, path, art box, perforation points}
  switch (frame) {
    case 'triangle': return { tri: true, path: 'M500 150L870 800L130 800Z', art: [320, 420, 360, 300] };
    case 'diamond': return { path: 'M500 120L880 500L500 880L120 500Z', art: [340, 340, 320, 320] };
    case 'round': return { path: 'M500 150A350 350 0 1 1 499.9 150Z', art: [330, 300, 340, 340] };
    case 'hex': return { path: `${polyPath(500, 500, 380, 6, 0)}`, art: [320, 310, 360, 360] };
    case 'miniature': return { rect: [330, 300, 340, 420], art: [355, 360, 290, 260] };
    case 'setenant': return { rect: [110, 210, 380, 520], rect2: [510, 210, 380, 520], art: [135, 290, 330, 290], art2: [535, 290, 330, 290] };
    default: return { rect: [190, 120, 620, 760], art: [235, 230, 530, 470] };
  }
}

function perfDots(path, n, r, fill) {
  // titik perforasi diambil dari path poligon sederhana (sudut-sudut M/L)
  const pts = [...path.matchAll(/[ML]\s*(-?[\d.]+)[ ,](-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  if (pts.length < 3) return '';
  let s = '';
  for (let i = 0; i < pts.length; i += 1) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    const len = Math.hypot(bx - ax, by - ay);
    const k = Math.max(3, Math.round(len / (r * 2.6)));
    for (let j = 0; j < k; j += 1) s += `<circle cx="${r1(ax + ((bx - ax) * j) / k)}" cy="${r1(ay + ((by - ay) * j) / k)}" r="${r}" fill="${fill}"/>`;
  }
  return s;
}

function circlePerf(cx, cy, R, r, fill) {
  let s = '';
  const n = Math.round((2 * Math.PI * R) / (r * 2.6));
  for (let i = 0; i < n; i += 1) s += `<circle cx="${r1(cx + R * Math.cos((i / n) * 2 * Math.PI))}" cy="${r1(cy + R * Math.sin((i / n) * 2 * Math.PI))}" r="${r}" fill="${fill}"/>`;
  return s;
}

function guilloche(x, y, w, h, color, seed) {
  const r = rng(seed);
  const cx = x + w / 2;
  const cy = y + h / 2;
  let s = '';
  const k = 3 + Math.floor(r() * 5);
  for (let i = 0; i < 9; i += 1) {
    let d = '';
    const R = (Math.min(w, h) / 2) * (0.35 + i * 0.07);
    for (let t = 0; t <= 180; t += 1) {
      const a = (t / 180) * Math.PI * 2;
      const rr = R * (1 + 0.06 * Math.sin(k * a + i));
      d += `${t ? 'L' : 'M'}${r1(cx + rr * Math.cos(a))} ${r1(cy + rr * Math.sin(a) * (h / w))}`;
    }
    s += `<path d="${d}Z" fill="none" stroke="${color}" stroke-opacity=".12" stroke-width="1"/>`;
  }
  return s;
}

function artPanel(box, subject, c, seed, k, series, night) {
  const [x, y, w, h] = box;
  const sky = night ? [c.ink, '#000814'] : [c.a2, c.paper];
  const id = `sky${k}`;
  let s = `<defs>${linear(id, sky, 0, 0, 0, 1)}<clipPath id="clip${k}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#clip${k})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})" opacity="${night ? 1 : 0.55}"/>`;
  if (series === 'space' || night) s += starfield(seed, w, h, 60, '#fff').replace(/cx="([\d.]+)" cy="([\d.]+)"/g, (_, a, b) => `cx="${r1(x + Number(a))}" cy="${r1(y + Number(b))}"`);
  s += guilloche(x, y, w, h, c.ink, seed);
  s += `<g transform="translate(${r1(x + w / 2)} ${r1(y + h / 2)})">${motif(subject, Math.min(w, h) * 0.95, c, k)}</g></g>`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${c.ink}" stroke-width="3"/>`;
  return s;
}

/** SVG statis. */
export function stampSvg(d) {
  const [realm, series, subj, frame, pal, mode, year, denom, finish] = d.pick;
  const subject = series[4][subj[4]];
  const subject2 = series[4][(subj[4] + 3) % series[4].length];
  const [, , , , paper, ink, a1, a2] = pal;
  const c = { paper, ink, a1, a2 };
  const night = mode[0] === 'animated-night' || pal[0] === 'night' || pal[0] === 'aurora' || pal[0] === 'gold';
  const bgPage = '#14110d';
  const o = outline(frame[0]);
  const serial = `${pad(d.tokenId, 7)}`;
  let body = '';
  const label = (x, y, w, h) => {
    const t = `${text(x + w / 2, y + 62, realm[1].toUpperCase(), `text-anchor="middle" font-family="Georgia,serif" font-size="${realm[1].length > 22 ? 24 : 30}" font-weight="700" letter-spacing="3" fill="${ink}"`)}`;
    const dn = text(x + w - 26, y + h - 30, denom[4], `text-anchor="end" font-family="Georgia,serif" font-size="72" font-weight="700" fill="${ink}"`);
    const yr = text(x + 26, y + h - 30, year[4], `font-family="Georgia,serif" font-size="26" fill="${ink}" opacity=".85"`);
    const se = text(x + w / 2, y + h - 92, series[1], `text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="20" letter-spacing="2" fill="${ink}"`);
    const micro = `<text x="${x + 20}" y="${y + h - 10}" font-family="monospace" font-size="4.2" fill="${ink}" opacity=".7">${esc(`AXTO·${realm[1]}·${series[1]}·No.${serial}·`.repeat(8))}</text>`;
    return t + dn + yr + se + micro;
  };
  if (o.rect) {
    const [x, y, w, h] = o.rect;
    const hole = 9;
    body += `<path d="${perforatedRect(x, y, w, h, hole)}" fill="${paper}"/>`;
    body += `<rect x="${x + 22}" y="${y + 22}" width="${w - 44}" height="${h - 44}" fill="none" stroke="${ink}" stroke-width="2" opacity=".7"/>`;
    body += artPanel(o.art, subject, c, d.seed, 0, series[0], night);
    body += label(x + 22, y + 22, w - 44, h - 44);
    if (o.rect2) {
      const [x2, y2, w2, h2] = o.rect2;
      body += `<path d="${perforatedRect(x2, y2, w2, h2, hole)}" fill="${paper}"/><rect x="${x2 + 22}" y="${y2 + 22}" width="${w2 - 44}" height="${h2 - 44}" fill="none" stroke="${ink}" stroke-width="2" opacity=".7"/>`;
      body += artPanel(o.art2, subject2, c, d.seed ^ 0x9e37, 1, series[0], night);
      body += label(x2 + 22, y2 + 22, w2 - 44, h2 - 44);
    }
  } else {
    body += `<path d="${o.path}" fill="${paper}"/>`;
    body += frame[0] === 'round' ? circlePerf(500, 500, 350, 9, bgPage) : perfDots(o.path, 0, 9, bgPage);
    body += `<path d="${o.path}" fill="none" stroke="${ink}" stroke-width="2" opacity=".5" transform="translate(500 500) scale(.92) translate(-500 -500)"/>`;
    body += artPanel(o.art, subject, c, d.seed, 0, series[0], night);
    const [ax, ay, aw, ah] = o.art;
    body += text(500, ay - 24, realm[1].toUpperCase(), `text-anchor="middle" font-family="Georgia,serif" font-size="22" font-weight="700" letter-spacing="2" fill="${ink}"`);
    body += text(500, ay + ah + 46, `${series[1]} · ${year[4]}`, `text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="18" fill="${ink}"`);
    body += text(500, ay + ah + 100, denom[4], `text-anchor="middle" font-family="Georgia,serif" font-size="56" font-weight="700" fill="${ink}"`);
  }
  let margin = '';
  if (frame[0] === 'souvenir' || frame[0] === 'booklet' || frame[0] === 'miniature') {
    margin = `<rect x="60" y="40" width="880" height="920" rx="6" fill="${paper}" opacity=".96"/><rect x="80" y="60" width="840" height="880" fill="none" stroke="${a1}" stroke-width="3"/>${text(500, 100, `${series[1]} — ${realm[1]}`, `text-anchor="middle" font-family="Georgia,serif" font-size="26" font-style="italic" fill="${ink}"`)}${text(500, 925, `Souvenir · ${year[4]} · No. ${serial}`, `text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="${ink}"`)}`;
  }
  if (frame[0] === 'airmail') margin = `<g>${Array.from({ length: 40 }, (_, i) => `<path d="M${i * 50 - 50} 0l25 0l-40 60h-25z" fill="${i % 2 ? '#c62a24' : '#1e3a8a'}"/><path d="M${i * 50 - 50} 1000l25 0l-40 -60h-25z" fill="${i % 2 ? '#1e3a8a' : '#c62a24'}"/>`).join('')}</g>`;
  const ex = d.exclusive ? exclusiveBadge(1000, d.tokenId, collection(d.key).max, finish[1]) : '';
  const cancel = mode[0] === 'static' && d.seed % 5 === 0 ? `<g fill="none" stroke="#222" stroke-opacity=".35" stroke-width="3"><circle cx="760" cy="300" r="90"/><circle cx="760" cy="300" r="72"/>${[0, 1, 2, 3].map((i) => `<path d="M560 ${360 + i * 18}q50 -16 100 0t100 0"/>`).join('')}</g>` : '';
  // kait genom gerak (#43): bentuk kertas untuk kilau permukaan (#mxclip) & cahaya tepi (#mxpaper)
  const paperD = o.rect ? [o.rect, o.rect2].filter(Boolean).map(([x, y, w, h]) => perforatedRect(x, y, w, h, 9)).join(' ') : o.path;
  return `${svgOpen(1000, 1000)}<defs>${radial('page', '#2a241b', bgPage)}<clipPath id="mxclip"><path d="${paperD}"/></clipPath><path id="mxpaper" d="${paperD}"/></defs><rect width="1000" height="1000" fill="url(#page)"/>${margin}<g class="mxo"><g filter="drop-shadow(0 10px 14px rgba(0,0,0,.45))"><g class="mxb">${body}</g></g></g>${cancel}${ex}${hallmark(1000, 1000, '#e9dcc0')}</svg>`;
}

export const ANIM_CSS = '.m-spin-slow{transform-box:fill-box;transform-origin:center;animation:ms 30s linear infinite}.m-float{animation:mf 4s ease-in-out infinite alternate}.m-sway{transform-box:fill-box;transform-origin:50% 100%;animation:mw 5s ease-in-out infinite alternate}.m-flap{transform-box:fill-box;transform-origin:center;animation:mfl .5s ease-in-out infinite alternate}.m-swim{animation:msw 6s ease-in-out infinite alternate}.m-twinkle,.m-blink{animation:mt 1.6s ease-in-out infinite}.m-pulse{animation:mt 2.2s ease-in-out infinite}.m-flame{transform-box:fill-box;transform-origin:50% 0;animation:mfl .18s linear infinite alternate}.m-arm{transform-box:fill-box;transform-origin:0 100%;animation:mw 1s ease-in-out infinite alternate}.m-wing{transform-box:fill-box;transform-origin:50% 100%;animation:mfl .4s ease-in-out infinite alternate}@keyframes ms{to{transform:rotate(360deg)}}@keyframes mf{to{transform:translateY(-14px)}}@keyframes mw{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}@keyframes mfl{to{transform:scaleX(.55)}}@keyframes msw{to{transform:translateX(26px)}}@keyframes mt{50%{opacity:.35}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}';

/** Galaksi deep-zoom prosedural: setiap tingkat zoom memunculkan objek baru bernama (planet, bintang, komet). */
const GALAXY_JS = `function galaxy(cv,seed,pal){const c=cv.getContext('2d');let W,H,cx=0,cy=0,z=1;const N=['Kepler','Nova','Aurel','Lyra','Vega','Orion','Sirr','Nur','Tirta','Bayu','Selene','Zephyr','Ardent','Halcy','Ionia','Meru'];const T=['rocky planet','gas giant','ice world','lava world','ocean world','ringed giant','red dwarf','blue star','comet','binary star'];const TC=['#c9a27a','#e3b16b','#bfe6ff','#ff6a3a','#3a8fff','#e8d49a','#ff4a3a','#9fd0ff','#e9f4ff','#fff0b0'];
function h(a,b,l){let x=(a*73856093)^(b*19349663)^(l*83492791)^seed;x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return((x^(x>>>16))>>>0)/4294967296}
function size(){W=cv.width=cv.clientWidth*devicePixelRatio;H=cv.height=cv.clientHeight*devicePixelRatio}
function draw(){c.fillStyle='#02030a';c.fillRect(0,0,W,H);const s=Math.min(W,H)*z;const L0=Math.floor(Math.log2(z));for(let L=Math.max(0,L0-1);L<=L0+3;L++){const cell=1/Math.pow(2,L);const px=cell*s;if(px<6)continue;const x0=Math.floor((cx-W/2/s)/cell),x1=Math.ceil((cx+W/2/s)/cell),y0=Math.floor((cy-H/2/s)/cell),y1=Math.ceil((cy+H/2/s)/cell);if((x1-x0)*(y1-y0)>4000)continue;for(let i=x0;i<=x1;i++)for(let j=y0;j<=y1;j++){const r=h(i,j,L);if(r>0.35)continue;const ox=(i+h(i,j,L+99))*cell,oy=(j+h(i,j,L+77))*cell;const X=(ox-cx)*s+W/2,Y=(oy-cy)*s+H/2;const t=Math.floor(h(i,j,L+5)*T.length);const rad=Math.max(0.6,px*0.04*(0.3+h(i,j,L+3)));c.beginPath();c.fillStyle=TC[t];c.globalAlpha=Math.min(1,px/60);c.arc(X,Y,rad,0,7);c.fill();if(t===5&&rad>4){c.strokeStyle=TC[t];c.lineWidth=rad*0.15;c.beginPath();c.ellipse(X,Y,rad*2,rad*0.6,-0.4,0,7);c.stroke()}if(t===8&&rad>3){c.globalAlpha*=0.5;c.beginPath();c.moveTo(X,Y);c.lineTo(X-rad*8,Y+rad*3);c.lineTo(X-rad*8,Y+rad*1);c.fill()}if(rad>9){c.globalAlpha=Math.min(1,(rad-9)/10);c.fillStyle='#fff';c.font=(12*devicePixelRatio)+'px system-ui';c.fillText(N[Math.floor(h(i,j,L+11)*N.length)]+'-'+(i&255)+(j&255)+' · '+T[t],X+rad+6,Y+4)}c.globalAlpha=1}}c.fillStyle=pal;c.font=(12*devicePixelRatio)+'px system-ui';c.fillText('zoom ×'+z.toFixed(1),12,H-14)}
size();addEventListener('resize',()=>{size();draw()});cv.addEventListener('wheel',e=>{e.preventDefault();const k=e.deltaY<0?1.2:1/1.2;const s=Math.min(W,H)*z;const mx=(e.offsetX*devicePixelRatio-W/2)/s+cx,my=(e.offsetY*devicePixelRatio-H/2)/s+cy;z=Math.min(1e7,Math.max(0.5,z*k));const s2=Math.min(W,H)*z;cx=mx-(e.offsetX*devicePixelRatio-W/2)/s2;cy=my-(e.offsetY*devicePixelRatio-H/2)/s2;draw()},{passive:false});let d=null;cv.addEventListener('pointerdown',e=>d=[e.clientX,e.clientY]);addEventListener('pointerup',()=>d=null);addEventListener('pointermove',e=>{if(!d)return;const s=Math.min(W,H)*z;cx-=(e.clientX-d[0])*devicePixelRatio/s;cy-=(e.clientY-d[1])*devicePixelRatio/s;d=[e.clientX,e.clientY];draw()});(function a(){if(!d)draw();requestAnimationFrame(a)})()}`;

/** Zoom vektor untuk SVG (tidak pecah): pan + zoom viewBox. */
export const VECTOR_ZOOM_JS = `function vzoom(svg){let vb=svg.viewBox.baseVal;let v=[vb.x,vb.y,vb.width,vb.height];const set=()=>svg.setAttribute('viewBox',v.join(' '));let d=null;svg.addEventListener('wheel',e=>{e.preventDefault();const r=svg.getBoundingClientRect();const fx=(e.clientX-r.left)/r.width,fy=(e.clientY-r.top)/r.height;const k=e.deltaY<0?1/1.25:1.25;const nw=Math.min(4000,Math.max(2,v[2]*k)),nh=nw*v[3]/v[2];v=[v[0]+(v[2]-nw)*fx,v[1]+(v[3]-nh)*fy,nw,nh];set()},{passive:false});svg.addEventListener('pointerdown',e=>d=[e.clientX,e.clientY]);addEventListener('pointerup',()=>d=null);addEventListener('pointermove',e=>{if(!d)return;const r=svg.getBoundingClientRect();v[0]-=(e.clientX-d[0])*v[2]/r.width;v[1]-=(e.clientY-d[1])*v[3]/r.height;d=[e.clientX,e.clientY];set()});let p=[];svg.addEventListener('touchmove',e=>{if(e.touches.length===2){e.preventDefault();const t=[...e.touches].map(x=>[x.clientX,x.clientY]);const dist=Math.hypot(t[0][0]-t[1][0],t[0][1]-t[1][1]);if(p.length){const k=p[0]/dist;const nw=Math.min(4000,Math.max(2,v[2]*k));const nh=nw*v[3]/v[2];v=[v[0]+(v[2]-nw)/2,v[1]+(v[3]-nh)/2,nw,nh];set()}p=[dist]}},{passive:false});svg.addEventListener('touchend',()=>p=[])}`;

export function stampPlayer(d, meta, opts = {}) {
  const [, series, , , pal, mode] = d.pick;
  const n = opts.nonce ? ` nonce="${opts.nonce}"` : '';
  const animated = mode[0] !== 'static' || d.exclusive || d.tier.rank >= 2;
  const galaxy = d.tier.rank >= 3 && (series[0] === 'space' || d.tier.rank >= 4);
  const mo = applyMotion(d, stampSvg(d)); // genom gerak unik per token (#43)
  const svg = mo.svg.replace('<svg ', '<svg id="st" ');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.name)}</title><style${n}>html,body{margin:0;height:100%;background:#0a0806;overflow:hidden;font-family:system-ui}#st{width:100vmin;height:100vmin;display:block;margin:auto;touch-action:none;cursor:grab}#g{position:fixed;inset:0;width:100%;height:100%;display:none;touch-action:none}.b{position:fixed;right:8px;bottom:8px;display:flex;gap:6px}.b button{background:#000a;color:#fff;border:1px solid #fff4;border-radius:8px;padding:6px 10px;font:12px system-ui}${animated ? ANIM_CSS : ''}${mo.css}</style></head><body>${svg}<canvas id="g"></canvas><div class="b"><button id="zr" type="button">1:1</button>${galaxy ? '<button id="gx" type="button">Galaxy</button>' : ''}</div><script${n}>${VECTOR_ZOOM_JS};${galaxy ? GALAXY_JS : ''}
const s=document.getElementById('st');vzoom(s);document.getElementById('zr').onclick=()=>s.setAttribute('viewBox','0 0 1000 1000');
${galaxy ? `let on=false;document.getElementById('gx').onclick=()=>{on=!on;const g=document.getElementById('g');g.style.display=on?'block':'none';s.style.display=on?'none':'block';if(on&&!g.dataset.i){g.dataset.i=1;galaxy(g,${d.seed},${JSON.stringify(pal[6])})}};` : ''}
</script></body></html>`;
}
