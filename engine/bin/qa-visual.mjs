#!/usr/bin/env node
/**
 * QA visual (perintah pemilik #52 „banyak yg keluar garis, banyak yg nempel garis"): render sampel NFT semua koleksi di
 * Chromium, ukur kotak setiap teks (getBBox) dan pastikan berada DI DALAM bingkainya dengan jarak ≥ 10 px.
 *   node bin/qa-visual.mjs [jumlah per koleksi=120]
 * Keluar dengan kode 1 bila ada pelanggaran (dipakai CI).
 */
import { createRequire } from 'node:module';
import { dna } from '../src/dna.js';
import { renderCtx, renderSvg } from '../src/metadata.js';
import { fsProvider } from '../src/provider-fs.js';
import { panelOf } from '../src/render/time.js';
import { COLLECTIONS, permute } from '../src/core.js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const N = Number(process.argv[2] || 120);
const PAD = 10;

const items = [];
for (const key of ['quran', 'ex-quran', 'hadith', 'ex-hadith', 'time', 'stamp']) {
  const c = COLLECTIONS[key];
  for (let k = 0; k < N; k += 1) {
    const id = permute(k, c.max, `qa-visual:${key}`) + 1;
    const d = dna(key, id);
    const ctx = await renderCtx(d, fsProvider);
    const svg = renderSvg(d, ctx);
    const spec = { key, id, kind: d.kind };
    if (d.kind === 'time') spec.panel = panelOf(d);
    if (d.kind === 'quran') spec.series = d.series.series;
    items.push({ spec, svg });
  }
}
const b = await chromium.launch();
const bad = [];
for (let off = 0; off < items.length; off += 120) {
const part = items.slice(off, off + 120);
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0">${part.map((it, i) => `<div class="it" data-i="${i}" style="width:1000px;height:1000px">${it.svg}</div>`).join('')}</body>`;
const p = await b.newPage({ viewport: { width: 1000, height: 1000 } });
await p.setContent(html, { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);
const specs = part.map((x) => x.spec);
bad.push(...await p.evaluate(({ specs, PAD }) => {
  const out = [];
  const cv = document.createElement('canvas').getContext('2d');
  // kotak TINTA sebuah <text> Arab (lebar mengikuti textLength bila ada), dalam koordinat SVG
  const ink = (t) => {
    const fs = Number(t.getAttribute('font-size'));
    cv.font = `${fs}px "AXTO Amiri"`;
    cv.direction = 'rtl';
    const m = cv.measureText(t.textContent);
    const adv = m.width || 1;
    const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    const tl = Number(t.getAttribute('textLength')) || 0;
    const w = tl ? tl * (inkW / adv) : inkW;
    const x = Number(t.getAttribute('x'));
    const y = Number(t.getAttribute('y'));
    return { x: x - w / 2, y: y - m.actualBoundingBoxAscent, width: w, height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
  };
  const inside = (el, x, y) => { const pt = el.ownerSVGElement.createSVGPoint(); pt.x = x; pt.y = y; return el.isPointInFill(pt); };
  const corners = (bb, pad) => [[bb.x - pad, bb.y - pad], [bb.x + bb.width + pad, bb.y - pad], [bb.x - pad, bb.y + bb.height + pad], [bb.x + bb.width + pad, bb.y + bb.height + pad]];
  document.querySelectorAll('.it').forEach((div, i) => {
    const s = specs[i];
    const svg = div.querySelector('svg');
    const fail = (why) => out.push(`${s.key}#${s.id} ${why}`);
    if (s.kind === 'quran' || s.kind === 'hadith') {
      const texts = [...svg.querySelectorAll('text[direction="rtl"][stroke-opacity]')];
      let shape = null;
      if (s.kind === 'quran' && s.series === 'ayah') shape = svg.querySelector('g[fill-opacity=".28"]')?.firstElementChild;
      const panelRect = svg.querySelector('rect[rx="22"][fill-opacity=".82"]');
      if (panelRect) shape = panelRect;
      for (const t of texts) {
        const bb = ink(t);
        if (!bb.width) continue;
        if (s.kind === 'hadith') { if (bb.x < 110 + PAD || bb.x + bb.width > 890 - PAD || bb.y < 190 + PAD || bb.y + bb.height > 800 - PAD) fail(`teks keluar panel x=${bb.x | 0}..${(bb.x + bb.width) | 0} y=${bb.y | 0}..${(bb.y + bb.height) | 0}`); continue; }
        if (s.series === 'page') { if (bb.x < 110 + PAD || bb.x + bb.width > 890 - PAD || bb.y < 90 + PAD || bb.y + bb.height > 910 - PAD) fail(`baris halaman keluar panel x=${bb.x | 0}..${(bb.x + bb.width) | 0}`); continue; }
        if (shape && corners(bb, PAD).some(([x, y]) => !inside(shape, x, y))) fail(`ayat keluar/menempel bentuk ${shape.tagName} x=${bb.x | 0}..${(bb.x + bb.width) | 0} y=${bb.y | 0}..${(bb.y + bb.height) | 0}`);
        if (s.series === 'juz') { if (bb.x < 120 || bb.x + bb.width > 880) fail(`juz keluar x=${bb.x | 0}..${(bb.x + bb.width) | 0}`); }
      }
    } else if (s.kind === 'time') {
      const g = svg.querySelector('#digits');
      const bb = g.getBBox();
      const [px, py, pw, ph] = s.panel;
      if (bb.x < px + 4 || bb.x + bb.width > px + pw - 4 || bb.y < py + 4 || bb.y + bb.height > py + ph - 4) fail(`angka keluar panel x=${bb.x | 0}..${(bb.x + bb.width) | 0} (panel ${px}..${px + pw}) y=${bb.y | 0}..${(bb.y + bb.height) | 0} (panel ${py}..${py + ph})`);
    } else if (s.kind === 'stamp') {
      const paper = svg.querySelector('#mxpaper');
      for (const t of svg.querySelectorAll('text')) {
        if (t.closest('defs') || t.getAttribute('font-size') === '4.2') continue; // mikroteks sengaja menyentuh tepi kotak
        const bb = t.getBBox();
        if (!bb.width || bb.y > 960 || t.textContent === 'AXTO') continue; // tanda pojok AXTO di luar kertas (sengaja)
        const sheet = svg.querySelector('rect[x="60"][y="40"]'); // lembar suvenir: teks judul/kaki ada di lembar, bukan di prangko
        const inSheet = sheet && bb.x >= 80 && bb.x + bb.width <= 920 && bb.y >= 60 && bb.y + bb.height <= 940;
        if (paper && !inSheet && corners(bb, 4).some(([x, y]) => !inside(paper, x, y))) fail(`teks prangko keluar kertas „${t.textContent.slice(0, 24)}" x=${bb.x | 0}..${(bb.x + bb.width) | 0} y=${bb.y | 0}..${(bb.y + bb.height) | 0}`);
      }
    }
  });
  return out;
}, { specs, PAD }));
await p.close();
}
await b.close();
console.log(`QA visual: ${items.length} karya, ${bad.length} pelanggaran`);
for (const x of bad.slice(0, 60)) console.log('  ✗', x);
process.exit(bad.length ? 1 : 0);
