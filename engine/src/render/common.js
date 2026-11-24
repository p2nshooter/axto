/** Utilitas renderer SVG bersama. */
import { esc, rng } from '../core.js';

export const r1 = (n) => Math.round(n * 10) / 10;

export function svgOpen(w, h, extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${extra}>`;
}

export function linear(id, stops, x1 = 0, y1 = 0, x2 = 1, y2 = 1) {
  const s = stops.map((c, i) => `<stop offset="${r1((i / Math.max(1, stops.length - 1)) * 100)}%" stop-color="${c}"/>`).join('');
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${s}</linearGradient>`;
}

export function radial(id, inner, outer, cx = 0.5, cy = 0.5, r = 0.75) {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0%" stop-color="${inner}"/><stop offset="100%" stop-color="${outer}"/></radialGradient>`;
}

/** Bintang n-sudut. */
export function starPath(cx, cy, ro, ri, n, rot = -Math.PI / 2) {
  let d = '';
  for (let i = 0; i < n * 2; i += 1) {
    const r = i % 2 ? ri : ro;
    const a = rot + (i * Math.PI) / n;
    d += `${i ? 'L' : 'M'}${r1(cx + r * Math.cos(a))} ${r1(cy + r * Math.sin(a))}`;
  }
  return `${d}Z`;
}

/** Poligon beraturan. */
export function polyPath(cx, cy, r, n, rot = -Math.PI / 2) {
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const a = rot + (i * 2 * Math.PI) / n;
    d += `${i ? 'L' : 'M'}${r1(cx + r * Math.cos(a))} ${r1(cy + r * Math.sin(a))}`;
  }
  return `${d}Z`;
}

/** Kurva polar "bentuk baru": r(θ) = R(1 + a·cos(kθ)). */
export function polarPath(cx, cy, R, k, a, steps = 240) {
  let d = '';
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const r = R * (1 + a * Math.cos(k * t));
    d += `${i ? 'L' : 'M'}${r1(cx + r * Math.cos(t))} ${r1(cy + r * Math.sin(t))}`;
  }
  return `${d}Z`;
}

/** Kotak membulat sebagai path. */
export function roundRect(x, y, w, h, r) {
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

/** Bidang bintang acak (deterministik). */
export function starfield(seed, w, h, n, color = '#fff') {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i += 1) {
    s += `<circle cx="${r1(r() * w)}" cy="${r1(r() * h)}" r="${r1(0.4 + r() * 1.8)}" fill="${color}" opacity="${r1(0.25 + r() * 0.7)}"/>`;
  }
  return s;
}

/** Pola geometri Islam (bintang 8 dalam kisi) sebagai <pattern>. */
export function girihPattern(id, stroke, size = 60, opacity = 0.35) {
  const c = size / 2;
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g fill="none" stroke="${stroke}" stroke-width="1.2" opacity="${opacity}"><path d="${starPath(c, c, c * 0.92, c * 0.55, 8, 0)}"/><path d="${polyPath(c, c, c * 0.38, 8, Math.PI / 8)}"/><path d="M0 0L${size} ${size}M${size} 0L0 ${size}" opacity=".5"/></g></pattern>`;
}

/** Bingkai perforasi prangko: path lubang setengah lingkaran di tepi. */
export function perforatedRect(x, y, w, h, hole) {
  const step = hole * 2.6;
  const nx = Math.max(2, Math.round(w / step));
  const ny = Math.max(2, Math.round(h / step));
  const sx = w / nx;
  const sy = h / ny;
  let d = `M${x} ${y}`;
  for (let i = 0; i < nx; i += 1) d += `L${r1(x + i * sx + sx / 2 - hole)} ${y}a${hole} ${hole} 0 0 0 ${hole * 2} 0`;
  d += `L${x + w} ${y}`;
  for (let i = 0; i < ny; i += 1) d += `L${x + w} ${r1(y + i * sy + sy / 2 - hole)}a${hole} ${hole} 0 0 0 0 ${hole * 2}`;
  d += `L${x + w} ${y + h}`;
  for (let i = nx - 1; i >= 0; i -= 1) d += `L${r1(x + i * sx + sx / 2 + hole)} ${y + h}a${hole} ${hole} 0 0 0 ${-hole * 2} 0`;
  d += `L${x} ${y + h}`;
  for (let i = ny - 1; i >= 0; i -= 1) d += `L${x} ${r1(y + i * sy + sy / 2 + hole)}a${hole} ${hole} 0 0 0 0 ${-hole * 2}`;
  return `${d}Z`;
}

/** Bungkus teks berdasarkan perkiraan lebar karakter. */
export function wrapWords(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur.length + 1 + w.length) > maxChars) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

export const text = (x, y, s, attrs = '') => `<text x="${r1(x)}" y="${r1(y)}" ${attrs}>${esc(s)}</text>`;

/**
 * Dulu lencana „EXCLUSIVE · … · n / max" di atas karya eksklusif. Pemilik, 24 Nov 2026: „Hapus aja jgn ada label, biar
 * bersih" — karya tanpa label; status eksklusif & nomor edisi ada di kode AC-…, metadata dan halaman karya.
 */
export function exclusiveBadge() {
  return '';
}

/**
 * Dulu tanda kecil „AXTO" di pojok karya. Pemilik, 24 Nov 2026: „Hati2, jgn ada logo apapun di semua karya" — karya tidak
 * lagi membawa tanda/logo apa pun (nama & nomor karya ada di metadata dan halaman, bukan di dalam gambar).
 */
export function hallmark() {
  return '';
}

/** Luminans relatif warna hex (0..1). */
export function lum(hex) {
  const h = hex.replace('#', '');
  const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
