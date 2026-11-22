/**
 * Katalog QURAN — kaligrafi 1/1 per ayat, per halaman mushaf Utsmani, per juz, dan mushaf lengkap.
 * Peta slot → (seri, unit, varian) deterministik dan bijektif; total tepat = max koleksi.
 */
import { SURAH, JUZ_START, PAGE_START } from './quran-meta.js';

export const TOTAL_AYAH = SURAH.reduce((a, s) => a + s[5], 0); // 6236

/** Rencana seri per koleksi. ayah: {total} dibagi rata; sisanya 1 varian ekstra pada ayat-ayat awal. */
export const PLANS = {
  quran: { ayah: 1_993_805, page: 10, juz: 5, mushaf: 5 },
  'ex-quran': { ayah: 6236, page: 6, juz: 4, mushaf: 20 }, // 10.000 (#44): tiap ayat tepat satu karya
};

export function planTotal(plan) {
  return plan.ayah + 604 * plan.page + 30 * plan.juz + plan.mushaf;
}

/** Nomor ayat global (0-based) → [surah, ayat]. */
const AYAH_OFFSET = (() => {
  const off = [];
  let g = 0;
  for (const s of SURAH) {
    off.push(g);
    g += s[5];
  }
  return off;
})();

export function ayahFromGlobal(g) {
  let lo = 0;
  let hi = SURAH.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (AYAH_OFFSET[mid] <= g) lo = mid;
    else hi = mid - 1;
  }
  return [lo + 1, g - AYAH_OFFSET[lo] + 1];
}

export function globalFromAyah(surah, ayah) {
  return AYAH_OFFSET[surah - 1] + ayah - 1;
}

/** slot ∈ [0, planTotal) → {series, unit, variant, variants} */
export function decodeSlot(plan, slot) {
  const base = Math.floor(plan.ayah / TOTAL_AYAH);
  const extra = plan.ayah - base * TOTAL_AYAH; // ayat 0..extra-1 mendapat base+1 varian
  if (slot < plan.ayah) {
    const big = extra * (base + 1);
    if (slot < big) return { series: 'ayah', unit: Math.floor(slot / (base + 1)), variant: slot % (base + 1), variants: base + 1 };
    const s = slot - big;
    return { series: 'ayah', unit: extra + Math.floor(s / base), variant: s % base, variants: base };
  }
  let s = slot - plan.ayah;
  if (s < 604 * plan.page) return { series: 'page', unit: Math.floor(s / plan.page), variant: s % plan.page, variants: plan.page };
  s -= 604 * plan.page;
  if (s < 30 * plan.juz) return { series: 'juz', unit: Math.floor(s / plan.juz), variant: s % plan.juz, variants: plan.juz };
  s -= 30 * plan.juz;
  return { series: 'mushaf', unit: 0, variant: s, variants: plan.mushaf };
}

/** Komposisi: [id, EN, ID, poin] */
export const COMPOSITIONS = [
  ['circle', 'Circular Medallion', 'Medali Lingkaran', 1], ['mihrab', 'Mihrab Arch', 'Lengkung Mihrab', 2],
  ['dome', 'Dome', 'Kubah', 2], ['ship', 'Calligraphic Ship', 'Kapal Kaligrafi', 4], ['wave', 'Wave', 'Gelombang', 1],
  ['kufi-square', 'Square Kufic Grid', 'Kisi Kufi Kotak', 3], ['mirror', 'Mirror Symmetry', 'Simetri Cermin', 3],
  ['scroll', 'Scroll', 'Gulungan', 0], ['tughra', 'Tughra Seal', 'Segel Tughra', 4], ['lantern', 'Lantern', 'Lentera', 2],
  ['star8', 'Eight-Point Star', 'Bintang Delapan', 3], ['panel', 'Illuminated Panel', 'Panel Iluminasi', 0],
];
export const ILLUMINATIONS = [
  ['tazhib-gold', 'Gold Tazhib', 'Tazhib Emas', 3], ['arabesque', 'Arabesque', 'Arabesk', 1], ['girih', 'Girih', 'Girih', 2],
  ['zellige', 'Zellige', 'Zellige', 2], ['rumi', 'Rumi Floral', 'Bunga Rumi', 1], ['cloud-band', 'Cloud Band', 'Pita Awan', 1],
  ['muqarnas', 'Muqarnas', 'Muqarnas', 4], ['minimal', 'Minimal Line', 'Garis Minimal', 0], ['star-lattice', 'Star Lattice', 'Kisi Bintang', 2],
  ['shamsa', 'Shamsa Sun', 'Shamsa Mentari', 3],
];
export const MATERIALS = [
  ['gold', 'Gold Leaf', 'Daun Emas', 3, '#f6d27a', '#8a6516'], ['silver', 'Silver', 'Perak', 2, '#eef3fa', '#7d8aa0'],
  ['emerald', 'Emerald', 'Zamrud', 3, '#6ff2b4', '#0d5a3a'], ['lapis', 'Lapis Lazuli', 'Lapis Lazuli', 3, '#8fb2ff', '#1b2f86'],
  ['marble', 'White Marble', 'Marmer Putih', 1, '#ffffff', '#b9bdc6'], ['ruby', 'Ruby', 'Ruby', 3, '#ff8e9a', '#7a0d1c'],
  ['glass', 'Glass', 'Kaca', 2, '#e6fbff', '#6fb4c9'], ['light', 'Pure Light', 'Cahaya', 4, '#fffbe6', '#ffd36b'],
  ['ink', 'Black Ink', 'Tinta Hitam', 0, '#1a1a1a', '#000000'], ['copper', 'Copper', 'Tembaga', 1, '#f0a77a', '#7a3a18'],
];
export const BACKGROUNDS = [
  ['midnight', 'Midnight Blue', 'Biru Tengah Malam', 1, '#0b1a3a', '#020611'], ['parchment', 'Parchment', 'Perkamen', 0, '#f3e6c4', '#d4bd8a'],
  ['emerald-night', 'Emerald Night', 'Malam Zamrud', 2, '#0d3a2a', '#03100b'], ['crimson', 'Crimson Velvet', 'Beludru Merah', 2, '#4a0b17', '#12020a'],
  ['ivory', 'Ivory', 'Gading', 0, '#fbf6ea', '#e2d7bd'], ['dawn', 'Dawn', 'Fajar', 2, '#3a2a5a', '#f2a65a'],
  ['desert', 'Desert Dusk', 'Senja Gurun', 1, '#5a3a1a', '#140a04'], ['cosmos', 'Cosmos', 'Kosmos', 3, '#12082a', '#000000'],
  ['turquoise', 'Turquoise Tile', 'Ubin Pirus', 2, '#0f5a66', '#04181c'], ['onyx', 'Onyx', 'Oniks', 1, '#141414', '#000000'],
  ['sage', 'Sage', 'Sage', 0, '#e6eadf', '#b8c2a6'], ['royal', 'Royal Purple', 'Ungu Kerajaan', 2, '#2a0f4a', '#0a0216'],
];
export const ANIMATIONS = [
  ['reveal', 'Light Reveal', 'Cahaya Menyingkap', 0], ['float', 'Floating 3D', 'Melayang 3D', 1], ['orbit', 'Orbit Light', 'Cahaya Mengorbit', 2],
  ['shimmer', 'Gold Shimmer', 'Kilau Emas', 1], ['particles', 'Light Particles', 'Partikel Cahaya', 2], ['rotate3d', 'Rotate 3D', 'Putar 3D', 3],
  ['ripple', 'Ripple', 'Riak', 1], ['dawnrise', 'Dawn Rise', 'Terbit Fajar', 3],
];
export const FRAMES = [
  ['none', 'Borderless', 'Tanpa Bingkai', 0], ['gold-frame', 'Gold Frame', 'Bingkai Emas', 2], ['double-rule', 'Double Rule', 'Garis Ganda', 1],
  ['floral-border', 'Floral Border', 'Tepi Bunga', 2], ['star-border', 'Star Border', 'Tepi Bintang', 2], ['manuscript', 'Manuscript', 'Naskah', 3],
  ['arch-frame', 'Arch Frame', 'Bingkai Lengkung', 2], ['medallion-ring', 'Medallion Ring', 'Cincin Medali', 3],
];

export const STYLE_SPACE = [COMPOSITIONS, ILLUMINATIONS, MATERIALS, BACKGROUNDS, ANIMATIONS, FRAMES];

/** Rujukan ayat untuk seri non-ayat. */
export function juzStart(n) { return JUZ_START[n - 1]; }
export function pageStart(n) { return PAGE_START[n - 1]; }
export { SURAH };
