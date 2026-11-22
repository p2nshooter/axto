/**
 * Katalog HADITS (perintah pemilik #49) — 12 kitab, 38.144 hadits (lihat hadith-meta.js).
 * Peta slot → (kitab, hadits, varian) deterministik & bijektif; publik 10 jt (±262 gaya per hadits), eksklusif 10.000
 * (10.000 hadits berbeda, masing-masing satu karya). Gaya visual memakai ruang gaya kaligrafi Al-Qur'an.
 */
import { HADITH_KITAB, TOTAL_HADITH } from './hadith-meta.js';
import { permute } from '../core.js';

export { HADITH_KITAB, TOTAL_HADITH };

/** Nomor hadits per kitab (urut), dibuka dari kompresi selisih base36. */
const NUMS = HADITH_KITAB.map((k) => {
  let p = 0;
  return k.nums.split(',').map((x, i) => { const v = parseInt(x, 36); p = i ? p + v : v; return p; });
});
const OFFSET = (() => { const o = []; let g = 0; for (const n of NUMS) { o.push(g); g += n.length; } return o; })();
export const KITAB_BY_KEY = Object.fromEntries(HADITH_KITAB.map((k, i) => [k.key, i]));

/** Indeks global (0-based) → {kitab, key, number, index}. */
export function hadithAt(g) {
  let lo = 0;
  let hi = NUMS.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (OFFSET[mid] <= g) lo = mid; else hi = mid - 1; }
  const index = g - OFFSET[lo];
  return { kitab: lo, key: HADITH_KITAB[lo].key, number: NUMS[lo][index], index };
}

/** Posisi hadits (kitab, nomor) dalam daftar — untuk mencari blok data. -1 bila tidak ada. */
export function indexOfNumber(key, n) {
  const arr = NUMS[KITAB_BY_KEY[key]];
  if (!arr) return -1;
  let lo = 0;
  let hi = arr.length - 1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (arr[mid] === n) return mid; if (arr[mid] < n) lo = mid + 1; else hi = mid - 1; }
  return -1;
}

/** Kitab/bab (book) tempat hadits nomor n berada: [nomor, nama EN] atau null. */
export function bookOf(key, n) {
  const k = HADITH_KITAB[KITAB_BY_KEY[key]];
  for (const [no, name, a, b] of k?.sections ?? []) if (n >= a && n <= b) return [no, name];
  return null;
}

export const PLANS = { hadith: { total: 10_000_000 }, 'ex-hadith': { total: 10_000 } };

/** slot → {series (kunci kitab), unit (indeks global hadits), variant, variants}. */
export function decodeSlot(key, slot, salt) {
  if (key === 'ex-hadith') {
    const g = permute(slot, TOTAL_HADITH, `${salt}:pick`);
    return { series: hadithAt(g).key, unit: g, variant: 0, variants: 1 };
  }
  const total = PLANS[key].total;
  const base = Math.floor(total / TOTAL_HADITH);
  const extra = total - base * TOTAL_HADITH;
  const big = extra * (base + 1);
  let unit;
  let variant;
  let variants;
  if (slot < big) { unit = Math.floor(slot / (base + 1)); variant = slot % (base + 1); variants = base + 1; }
  else { const s = slot - big; unit = extra + Math.floor(s / base); variant = s % base; variants = base; }
  return { series: hadithAt(unit).key, unit, variant, variants };
}
