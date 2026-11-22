/**
 * Renderer TIME: SVG statis (image) + player hidup (animation_url). Angka digambar oleh digitsSvg() yang
 * mandiri (tanpa impor) sehingga sumbernya bisa disisipkan ke player dan dipakai ulang di browser tiap detik.
 */
import { esc, rng } from '../core.js';
import { svgOpen, linear, radial, starPath, polyPath, polarPath, roundRect, starfield, girihPattern, r1, exclusiveBadge, hallmark, lum } from './common.js';

/** Gambar angka "HH:MM" + detik. Mandiri: semua helper di dalam fungsi. */
export function digitsSvg(style, hhmm, ss, x, y, w, h, on, off, seed) {
  const R = (n) => Math.round(n * 10) / 10;
  const SEG = [[1,1,1,0,1,1,1],[0,0,1,0,0,1,0],[1,0,1,1,1,0,1],[1,0,1,1,0,1,1],[0,1,1,1,0,1,0],[1,1,0,1,0,1,1],[1,1,0,1,1,1,1],[1,0,1,0,0,1,0],[1,1,1,1,1,1,1],[1,1,1,1,0,1,1]];
  const DOT = ['01110100011001110101110011000101110', '00100011000010000100001000010001110', '01110100010000100010001000100011111', '11111000100010000010000011000101110', '00010001100101010010111110001000010', '11111100001111000001000011000101110', '00110010001000011110100011000101110', '11111000010001000100010000100001000', '01110100011000101110100011000101110', '01110100011000101111000010001001100'];
  const digits = hhmm.replace(':', '').split('').map(Number);
  const cw = w / 4.6;
  const xs = [x, x + cw * 1.08, x + cw * 2.5, x + cw * 3.58];
  const colon = x + cw * 2.15;
  let s = '';
  const glow = `filter="url(#glow)"`;
  if (style === 'seg7' || style === 'liquid') {
    const t = cw * 0.16;
    const seg = (a, b, e, d) => {
      if (a === e) return `M${R(a)} ${R(b)}l${R(t / 2)} ${R(t / 2)}V${R(d - t / 2)}l${R(-t / 2)} ${R(t / 2)}l${R(-t / 2)} ${R(-t / 2)}V${R(b + t / 2)}Z`;
      return `M${R(a)} ${R(b)}l${R(t / 2)} ${R(-t / 2)}H${R(e - t / 2)}l${R(t / 2)} ${R(t / 2)}l${R(-t / 2)} ${R(t / 2)}H${R(a + t / 2)}Z`;
    };
    digits.forEach((n, i) => {
      const X = xs[i], Y = y, W = cw * 0.86, H = h, g = t * 0.6, m = H / 2;
      const P = [[X + g, Y, X + W - g, Y], [X, Y + g, X, Y + m - g], [X + W, Y + g, X + W, Y + m - g], [X + g, Y + m, X + W - g, Y + m], [X, Y + m + g, X, Y + H - g], [X + W, Y + m + g, X + W, Y + H - g], [X + g, Y + H, X + W - g, Y + H]];
      P.forEach((p, k) => { s += `<path d="${seg(...p)}" fill="${SEG[n][k] ? on : off}" ${SEG[n][k] ? glow : 'opacity=".22"'}/>`; });
    });
    if (style === 'liquid') s = `<g filter="url(#soft)">${s}</g>`;
  } else if (style === 'dot') {
    const cs = Math.min(cw * 0.86 / 5, h / 7);
    digits.forEach((n, i) => {
      for (let k = 0; k < 35; k += 1) {
        const lit = DOT[n][k] === '1';
        s += `<circle cx="${R(xs[i] + (k % 5) * cs + cs / 2)}" cy="${R(y + Math.floor(k / 5) * cs + cs / 2)}" r="${R(cs * 0.38)}" fill="${lit ? on : off}" ${lit ? glow : 'opacity=".22"'}/>`;
      }
    });
  } else if (style === 'nixie' || style === 'flip') {
    digits.forEach((n, i) => {
      if (style === 'flip') {
        s += `<rect x="${R(xs[i])}" y="${R(y)}" width="${R(cw * 0.9)}" height="${R(h)}" rx="${R(cw * 0.08)}" fill="${off}"/><line x1="${R(xs[i])}" y1="${R(y + h / 2)}" x2="${R(xs[i] + cw * 0.9)}" y2="${R(y + h / 2)}" stroke="#000" stroke-opacity=".55" stroke-width="3"/>`;
      } else {
        s += `<rect x="${R(xs[i] + cw * 0.05)}" y="${R(y - h * 0.08)}" width="${R(cw * 0.8)}" height="${R(h * 1.16)}" rx="${R(cw * 0.4)}" fill="${off}" fill-opacity=".55" stroke="${on}" stroke-opacity=".25"/>`;
      }
      s += `<text x="${R(xs[i] + cw * 0.45)}" y="${R(y + h * 0.83)}" text-anchor="middle" font-family="${style === 'flip' ? 'Helvetica,Arial,sans-serif' : 'Georgia,serif'}" font-weight="700" font-size="${R(h * 0.95)}" fill="${on}" ${style === 'nixie' ? glow : ''}>${n}</text>`;
    });
  } else if (style === 'binary') {
    const cs = h / 4.6;
    digits.forEach((n, i) => {
      for (let b = 0; b < 4; b += 1) {
        const lit = (n >> (3 - b)) & 1;
        s += `<rect x="${R(xs[i] + cw * 0.2)}" y="${R(y + b * cs * 1.15)}" width="${R(cs)}" height="${R(cs)}" rx="${R(cs * 0.25)}" fill="${lit ? on : off}" ${lit ? glow : 'opacity=".22"'}/>`;
      }
    });
  } else {
    // orbit & hybrid: lingkaran waktu + angka kecil
    const cx = x + w / 2, cy = y + h / 2, rr = Math.min(w, h * 1.4) / 2;
    const hh = digits[0] * 10 + digits[1], mm = digits[2] * 10 + digits[3], sec = Number(ss);
    const ang = (f) => -Math.PI / 2 + f * Math.PI * 2;
    if (style === 'orbit') {
      [[rr, hh % 12 / 12, 10], [rr * 0.72, mm / 60, 8], [rr * 0.46, sec / 60, 6]].forEach(([r, f, d]) => {
        s += `<circle cx="${R(cx)}" cy="${R(cy)}" r="${R(r)}" fill="none" stroke="${off}" stroke-width="3"/><circle cx="${R(cx + r * Math.cos(ang(f)))}" cy="${R(cy + r * Math.sin(ang(f)))}" r="${d}" fill="${on}" ${glow}/>`;
      });
    } else {
      for (let k = 0; k < 12; k += 1) s += `<line x1="${R(cx + rr * 0.86 * Math.cos(ang(k / 12)))}" y1="${R(cy + rr * 0.86 * Math.sin(ang(k / 12)))}" x2="${R(cx + rr * Math.cos(ang(k / 12)))}" y2="${R(cy + rr * Math.sin(ang(k / 12)))}" stroke="${on}" stroke-width="4"/>`;
      const hand = (f, l, wd) => `<line x1="${R(cx)}" y1="${R(cy)}" x2="${R(cx + l * Math.cos(ang(f)))}" y2="${R(cy + l * Math.sin(ang(f)))}" stroke="${on}" stroke-width="${wd}" stroke-linecap="round" ${glow}/>`;
      s += hand((hh % 12 + mm / 60) / 12, rr * 0.5, 9) + hand(mm / 60, rr * 0.78, 6) + hand(sec / 60, rr * 0.86, 2);
    }
    s += `<text x="${R(cx)}" y="${R(cy + rr * 0.22)}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-weight="700" font-size="${R(rr * 0.3)}" fill="${on}" opacity=".9">${hhmm}</text>`;
    return s;
  }
  if (style !== 'orbit' && style !== 'hybrid') {
    s += `<circle cx="${R(colon)}" cy="${R(y + h * 0.3)}" r="${R(cw * 0.07)}" fill="${on}" ${glow} class="blink"/><circle cx="${R(colon)}" cy="${R(y + h * 0.7)}" r="${R(cw * 0.07)}" fill="${on}" ${glow} class="blink"/>`;
    s += `<text x="${R(x + w + cw * 0.15)}" y="${R(y + h)}" font-family="Helvetica,Arial,sans-serif" font-weight="700" font-size="${R(h * 0.32)}" fill="${on}" opacity=".85">${ss}</text>`;
  }
  return s;
}

/** Siluet & hiasan bentuk. Mengembalikan {frame, extra, panel:[x,y,w,h]} dalam kanvas 1000×1000. */
function silhouette(shape, cat, k) {
  const C = 500;
  let frame = '';
  let panel = [200, 380, 600, 240];
  switch (shape) {
    case 'circle': frame = `<circle cx="${C}" cy="${C}" r="330"/>`; panel = [255, 400, 490, 200]; break;
    case 'square': frame = `<path d="${roundRect(170, 170, 660, 660, 70)}"/>`; break;
    case 'tonneau': frame = '<path d="M230 190Q500 120 770 190Q860 500 770 810Q500 880 230 810Q140 500 230 190Z"/>'; panel = [230, 390, 540, 220]; break;
    case 'band': frame = `<path d="${roundRect(110, 330, 780, 340, 170)}"/>`; panel = [210, 400, 580, 200]; break;
    case 'ring': frame = '<circle cx="500" cy="520" r="300"/>'; panel = [280, 430, 440, 180]; break;
    case 'drop': frame = '<path d="M500 140C640 300 820 420 820 600A320 320 0 0 1 180 600C180 420 360 300 500 140Z"/>'; panel = [270, 500, 460, 190]; break;
    case 'twin': frame = '<circle cx="300" cy="520" r="230"/><circle cx="700" cy="520" r="230"/>'; panel = [140, 450, 720, 150]; break;
    case 'octagon': frame = `<path d="${polyPath(C, C, 350, 8, Math.PI / 8)}"/>`; break;
    case 'glasses': frame = `<path d="${roundRect(90, 380, 360, 260, 120)}"/><path d="${roundRect(550, 380, 360, 260, 120)}"/><path d="M450 470Q500 430 550 470" fill="none" stroke-width="26"/>`; panel = [130, 445, 740, 140]; break;
    case 'tag': frame = `<path d="M260 180H740Q800 180 800 240V760Q800 820 740 820H260Q200 820 200 760V240Q200 180 260 180Z"/><circle cx="500" cy="250" r="34" fill="#000" fill-opacity=".55"/>`; panel = [240, 420, 520, 220]; break;
    case 'wide': frame = `<path d="${roundRect(90, 300, 820, 400, 60)}"/>`; panel = [150, 390, 700, 220]; break;
    case 'shield': frame = '<path d="M500 150L820 250V520Q820 760 500 870Q180 760 180 520V250Z"/>'; panel = [250, 400, 500, 210]; break;
    case 'alarm': frame = '<circle cx="500" cy="540" r="300"/><circle cx="270" cy="250" r="90"/><circle cx="730" cy="250" r="90"/>'; panel = [270, 460, 460, 180]; break;
    case 'tall': frame = `<path d="${roundRect(300, 90, 400, 820, 60)}"/><path d="M500 40L640 140H360Z"/>`; panel = [320, 300, 360, 160]; break;
    case 'polar': frame = `<path d="${polarPath(C, C, 300, 5 + (k % 4), 0.12)}"/>`; panel = [250, 410, 500, 190]; break;
    case 'star': frame = `<path d="${starPath(C, C, 400, 300, 8 + (k % 5) * 2)}"/>`; panel = [255, 410, 490, 190]; break;
    case 'hex': frame = `<path d="${polyPath(C, C, 360, 6, 0)}"/>`; break;
    default: frame = `<circle cx="${C}" cy="${C}" r="330"/>`;
  }
  let extra = '';
  if (cat === 'wrist') extra = '<path d="M390 40H610L590 210H410Z" fill="url(#strap)"/><path d="M410 790H590L610 960H390Z" fill="url(#strap)"/>';
  if (cat === 'bag') extra = '<circle cx="500" cy="95" r="60" fill="none" stroke="url(#frameG)" stroke-width="18"/><path d="M500 155V185" stroke="url(#frameG)" stroke-width="14"/>';
  if (cat === 'apparel') extra = '<g fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-dasharray="14 10"><use href="#sil" transform="translate(500 500) scale(.94) translate(-500 -500)"/></g>';
  if (cat === 'home' && shape !== 'tall') extra = '<path d="M330 860L300 940H700L670 860Z" fill="url(#frameG)" opacity=".9"/>';
  if (cat === 'vehicle') extra = '<path d="M120 760Q500 640 880 760" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="10"/>';
  if (cat === 'public') extra = '<path d="M250 900H750V960H250Z" fill="url(#frameG)"/>';
  return { frame, extra, panel };
}

function backdropSvg(id, seed, bg) {
  switch (id) {
    case 'stars': return starfield(seed, 1000, 1000, 140);
    case 'nebula': return `<circle cx="260" cy="300" r="360" fill="#ff46c8" opacity=".14"/><circle cx="760" cy="720" r="420" fill="#4a6bff" opacity=".16"/>${starfield(seed, 1000, 1000, 90)}`;
    case 'grid': return `<g stroke="#fff" stroke-opacity=".07">${Array.from({ length: 21 }, (_, i) => `<path d="M${i * 50} 0V1000M0 ${i * 50}H1000"/>`).join('')}</g>`;
    case 'city': { const r = rng(seed); let s = '<g fill="#000" opacity=".5">'; for (let x = 0; x < 1000; x += 40) { const hh = 120 + r() * 260; s += `<rect x="${x}" y="${1000 - hh}" width="36" height="${r1(hh)}"/>`; } return `${s}</g>`; }
    case 'marble': return `<g fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="3">${Array.from({ length: 9 }, (_, i) => `<path d="M-50 ${i * 120}Q300 ${i * 120 + 80} 520 ${i * 120 - 40}T1050 ${i * 120 + 30}"/>`).join('')}</g>`;
    case 'islamic': return '<rect width="1000" height="1000" fill="url(#girih)"/>';
    case 'radial': return `<circle cx="500" cy="500" r="480" fill="${bg[0]}" opacity=".6" filter="url(#soft)"/>`;
    default: return '';
  }
}

/** SVG statis untuk `image`. d = hasil dna(). */
export function timeSvg(d, at = '10:08', sec = '42') {
  const [form, theme, digit, motion, gems, backdrop, finish] = d.pick;
  const [, , , , cat, shape] = form;
  const [, , , , frameC, on, off, bg, hue] = theme;
  const { frame, extra, panel } = silhouette(shape, cat, d.seed);
  const [px, py, pw, ph] = panel;
  let gemSvg = '';
  const n = gems[4];
  if (n) {
    const ring = n >= 24 ? 380 : 400;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const gx = 500 + ring * Math.cos(a), gy = 500 + ring * Math.sin(a);
      const gr = n >= 60 ? 7 : n >= 24 ? 11 : 20;
      gemSvg += `<path d="${polyPath(gx, gy, gr, 8, 0.39)}" fill="hsl(${(hue + i * (n > 12 ? 6 : 0)) % 360},80%,55%)" stroke="#fff" stroke-opacity=".6" stroke-width="1.5"/>`;
    }
  }
  const motionFx = { spin: `<circle cx="500" cy="500" r="440" fill="none" stroke="${on}" stroke-opacity=".25" stroke-width="2" stroke-dasharray="4 18" class="spin"/>`, aurora: `<path d="M0 260Q500 120 1000 300V0H0Z" fill="${on}" opacity=".12" class="drift"/>`, supernova: `<circle cx="500" cy="500" r="470" fill="none" stroke="${on}" stroke-opacity=".35" stroke-width="6" class="pulse"/>`, particles: starfield(d.seed ^ 0x55, 1000, 1000, 50, on), wave: `<path d="M0 880Q250 820 500 880T1000 880V1000H0Z" fill="${on}" opacity=".12" class="drift"/>` }[motion[0]] ?? '';
  const defs = `<defs>${radial('bgG', bg[0], bg[1])}${linear('frameG', frameC)}${linear('strap', [frameC[3], frameC[1], frameC[3]], 0, 0, 1, 0)}${girihPattern('girih', on, 80, 0.18)}<filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="soft"><feGaussianBlur stdDeviation="18"/></filter><g id="sil">${frame}</g></defs>`;
  const ex = d.exclusive ? exclusiveBadge(1000, d.tokenId, 50000, finish[1]) + `<use href="#sil" fill="none" stroke="#f2cf6b" stroke-width="6" stroke-dasharray="2 10"/>` : '';
  return `${svgOpen(1000, 1000)}${defs}<rect width="1000" height="1000" fill="url(#bgG)"/>${backdropSvg(backdrop[0], d.seed, bg)}${motionFx}${extra}<g fill="url(#frameG)" stroke="${frameC[2]}" stroke-width="6">${frame}</g><g fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2" transform="translate(500 500) scale(.9) translate(-500 -500)">${frame}</g><path d="${roundRect(px, py, pw, ph, 28)}" fill="${lum(on) < 0.2 ? '#fff' : '#000'}" fill-opacity="${lum(on) < 0.2 ? '.78' : '.62'}"/><g id="digits">${digitsSvg(digit[0], at, sec, px + pw * 0.07, py + ph * 0.18, pw * 0.74, ph * 0.64, on, off, d.seed)}</g>${gemSvg}${ex}${hallmark(1000, 1000, on)}</svg>`;
}

/** Kota untuk "World Clock Canvas" (tier Masterpiece). */
export const WORLD = [['Jakarta', 'Asia/Jakarta'], ['Makkah', 'Asia/Riyadh'], ['Tokyo', 'Asia/Tokyo'], ['Seoul', 'Asia/Seoul'], ['Beijing', 'Asia/Shanghai'], ['Singapore', 'Asia/Singapore'], ['Kuala Lumpur', 'Asia/Kuala_Lumpur'], ['Bangkok', 'Asia/Bangkok'], ['Delhi', 'Asia/Kolkata'], ['Dubai', 'Asia/Dubai'], ['Istanbul', 'Europe/Istanbul'], ['Cairo', 'Africa/Cairo'], ['Nairobi', 'Africa/Nairobi'], ['Lagos', 'Africa/Lagos'], ['Johannesburg', 'Africa/Johannesburg'], ['Moscow', 'Europe/Moscow'], ['Berlin', 'Europe/Berlin'], ['Paris', 'Europe/Paris'], ['London', 'Europe/London'], ['Madrid', 'Europe/Madrid'], ['Rome', 'Europe/Rome'], ['Amsterdam', 'Europe/Amsterdam'], ['Reykjavik', 'Atlantic/Reykjavik'], ['New York', 'America/New_York'], ['Toronto', 'America/Toronto'], ['Chicago', 'America/Chicago'], ['Denver', 'America/Denver'], ['Los Angeles', 'America/Los_Angeles'], ['Mexico City', 'America/Mexico_City'], ['Bogotá', 'America/Bogota'], ['Lima', 'America/Lima'], ['São Paulo', 'America/Sao_Paulo'], ['Buenos Aires', 'America/Argentina/Buenos_Aires'], ['Santiago', 'America/Santiago'], ['Honolulu', 'Pacific/Honolulu'], ['Anchorage', 'America/Anchorage'], ['Sydney', 'Australia/Sydney'], ['Perth', 'Australia/Perth'], ['Auckland', 'Pacific/Auckland'], ['Manila', 'Asia/Manila'], ['Hong Kong', 'Asia/Hong_Kong'], ['Karachi', 'Asia/Karachi'], ['Tehran', 'Asia/Tehran'], ['Baghdad', 'Asia/Baghdad'], ['Casablanca', 'Africa/Casablanca'], ['Athens', 'Europe/Athens'], ['Stockholm', 'Europe/Stockholm'], ['Kyiv', 'Europe/Kyiv'], ['Dhaka', 'Asia/Dhaka'], ['Kathmandu', 'Asia/Kathmandu'], ['Yangon', 'Asia/Yangon'], ['Ho Chi Minh', 'Asia/Ho_Chi_Minh'], ['Taipei', 'Asia/Taipei'], ['Jayapura', 'Asia/Jayapura'], ['Makassar', 'Asia/Makassar'], ['Fiji', 'Pacific/Fiji'], ['Cape Verde', 'Atlantic/Cape_Verde'], ['Azores', 'Atlantic/Azores'], ['Vancouver', 'America/Vancouver'], ['Havana', 'America/Havana']];

/** Player hidup. opts: {nonce} */
export function timePlayer(d, meta, opts = {}) {
  const [form, theme, digit, motion] = d.pick;
  const [, , , , , on, off] = theme;
  const svg = timeSvg(d, '00:00', '00');
  const world = d.tier.rank >= 4;
  const n = opts.nonce ? ` nonce="${opts.nonce}"` : '';
  const anim = `.spin{transform-origin:500px 500px;animation:sp 24s linear infinite}.drift{animation:dr 9s ease-in-out infinite alternate}.pulse{transform-origin:500px 500px;animation:pu 2.4s ease-in-out infinite}.blink{animation:bl 1s steps(1) infinite}@keyframes sp{to{transform:rotate(360deg)}}@keyframes dr{to{transform:translateY(40px)}}@keyframes pu{50%{transform:scale(1.04);opacity:.4}}@keyframes bl{50%{opacity:.25}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(meta.name)}</title><style${n}>html,body{margin:0;height:100%;background:#000;overflow:hidden}#s{width:100vmin;height:100vmin;margin:auto;display:block;touch-action:none}#s svg{width:100%;height:100%}#w{position:fixed;inset:0;display:none}#tz{position:fixed;right:8px;bottom:8px;font:12px system-ui;color:#fff;background:#0008;border:1px solid #fff3;border-radius:8px;padding:4px}${anim}</style></head><body><div id="s">${svg}</div><svg id="w" viewBox="0 0 1600 1000"></svg><select id="tz" aria-label="Time zone"></select><script${n}>
const DIG=${digitsSvg.toString()};
const ST=${JSON.stringify(digit[0])},ON=${JSON.stringify(on)},OFF=${JSON.stringify(off)},SEED=${d.seed},WORLD=${world ? JSON.stringify(WORLD) : 'null'};
const g=document.querySelector('#digits');
const q=new URLSearchParams(location.search);let tz=q.get('tz')||Intl.DateTimeFormat().resolvedOptions().timeZone;
const sel=document.getElementById('tz');for(const z of (Intl.supportedValuesOf?Intl.supportedValuesOf('timeZone'):[tz])){const o=document.createElement('option');o.value=o.textContent=z;if(z===tz)o.selected=true;sel.appendChild(o)}
sel.onchange=()=>{tz=sel.value;try{localStorage.setItem('axto-tz',tz)}catch(e){}};try{const s=localStorage.getItem('axto-tz');if(s&&!q.get('tz')){tz=s;sel.value=s}}catch(e){}
const parts=(z)=>{const p=new Intl.DateTimeFormat('en-GB',{timeZone:z,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date());const v=t=>p.find(x=>x.type===t).value;return[v('hour').replace('24','00'),v('minute'),v('second')]};
function tick(){const[h,m,s]=parts(tz);if(g)g.innerHTML=DIG(ST,h+':'+m,s,PX,PY,PW,PH,ON,OFF,SEED);if(WORLD)world()}
const P=${JSON.stringify(panelOf(d))};const PX=P[0]+P[2]*0.07,PY=P[1]+P[3]*0.18,PW=P[2]*0.74,PH=P[3]*0.64;
let vb=[0,0,1600,1000];const W=document.getElementById('w');
function world(){if(!W.dataset.on){W.dataset.on=1;W.style.display='block';document.getElementById('s').style.display='none'}let s='<rect x="-5000" y="-5000" width="11600" height="11000" fill="#05060c"/>';WORLD.forEach(([c,z],i)=>{const cx=110+(i%10)*155,cy=110+Math.floor(i/10)*160;const[h,m,se]=parts(z);const a=f=>-Math.PI/2+f*Math.PI*2;const hh=+h,mm=+m,ss=+se;s+='<g><circle cx="'+cx+'" cy="'+cy+'" r="58" fill="'+OFF+'" stroke="'+ON+'" stroke-opacity=".5" stroke-width="2"/>'+'<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+30*Math.cos(a((hh%12+mm/60)/12)))+'" y2="'+(cy+30*Math.sin(a((hh%12+mm/60)/12)))+'" stroke="'+ON+'" stroke-width="5" stroke-linecap="round"/>'+'<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+46*Math.cos(a(mm/60)))+'" y2="'+(cy+46*Math.sin(a(mm/60)))+'" stroke="'+ON+'" stroke-width="3" stroke-linecap="round"/>'+'<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+50*Math.cos(a(ss/60)))+'" y2="'+(cy+50*Math.sin(a(ss/60)))+'" stroke="#fff" stroke-width="1"/>'+'<text x="'+cx+'" y="'+(cy+80)+'" text-anchor="middle" font-family="system-ui" font-size="13" fill="#fff">'+c+'</text><text x="'+cx+'" y="'+(cy+96)+'" text-anchor="middle" font-family="monospace" font-size="12" fill="'+ON+'">'+h+':'+m+':'+se+'</text></g>'});W.innerHTML=s;W.setAttribute('viewBox',vb.join(' '))}
if(WORLD){let drag=null;W.addEventListener('wheel',e=>{e.preventDefault();const k=e.deltaY>0?1.15:1/1.15;const r=W.getBoundingClientRect();const fx=(e.clientX-r.left)/r.width,fy=(e.clientY-r.top)/r.height;const nw=Math.min(8000,Math.max(40,vb[2]*k)),nh=nw*0.625;vb=[vb[0]+(vb[2]-nw)*fx,vb[1]+(vb[3]-nh)*fy,nw,nh];W.setAttribute('viewBox',vb.join(' '))},{passive:false});W.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY]});addEventListener('pointerup',()=>drag=null);addEventListener('pointermove',e=>{if(!drag)return;const r=W.getBoundingClientRect();vb[0]-=(e.clientX-drag[0])*vb[2]/r.width;vb[1]-=(e.clientY-drag[1])*vb[3]/r.height;drag=[e.clientX,e.clientY];W.setAttribute('viewBox',vb.join(' '))})}
tick();setInterval(tick,1000);
</script></body></html>`;
}

/** Panel angka (dipakai player untuk menggambar ulang di tempat yang sama). */
export function panelOf(d) {
  const [form] = d.pick;
  return silhouette(form[5], form[4], d.seed).panel;
}
