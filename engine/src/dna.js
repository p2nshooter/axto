/**
 * DNA token: tokenId → sifat unik + skor keunikan + tier harga mulai lelang.
 */
import { collection, assertTokenId, permute, decodeRadix, product, percentileTable, tierFor, hash32, TIERS } from './core.js';
import * as TIME from './catalog/time.js';
import * as STAMP from './catalog/stamp.js';
import * as QURAN from './catalog/quran.js';
import * as MODEL from './catalog/model.js';
import * as HADITH from './catalog/hadith.js';

/** Sifat tambahan khusus edisi eksklusif → ruang kombinasi eksklusif terpisah dari publik. */
export const EX_FINISH = [
  ['gold-leaf', 'Gold Leaf Edition', 'Edisi Daun Emas', 3],
  ['platinum', 'Platinum Edition', 'Edisi Platinum', 3],
  ['obsidian', 'Obsidian Edition', 'Edisi Obsidian', 2],
  ['pearl', 'Pearl Edition', 'Edisi Mutiara', 2],
  ['diamond', 'Diamond Edition', 'Edisi Berlian', 4],
];

const TRAIT_NAMES = {
  time: ['Form', 'Theme', 'Digits', 'Motion', 'Gems', 'Backdrop'],
  stamp: ['Realm', 'Series', 'Subject', 'Frame', 'Palette', 'Mode', 'Year', 'Denomination'],
  model: ['Pose', 'Series', 'Outfit', 'Prop', 'Setting', 'Light', 'Motion', 'Accessory', 'Palette'],
  quran: ['Composition', 'Illumination', 'Material', 'Background', 'Animation', 'Frame'],
  hadith: ['Composition', 'Illumination', 'Material', 'Background', 'Animation', 'Frame'],
};
const TRAIT_NAMES_ID = {
  Form: 'Bentuk', Theme: 'Tema', Digits: 'Angka', Motion: 'Gerak', Gems: 'Permata', Backdrop: 'Latar', Realm: 'Penerbit',
  Series: 'Seri', Subject: 'Subjek', Frame: 'Bingkai', Palette: 'Palet', Mode: 'Mode', Year: 'Tahun', Denomination: 'Nominal',
  Pose: 'Pose', Outfit: 'Busana', Prop: 'Properti', Scene: 'Latar', Animation: 'Animasi', Hue: 'Rona', Composition: 'Komposisi',
  Illumination: 'Iluminasi', Material: 'Bahan', Background: 'Latar', Finish: 'Edisi', Setting: 'Latar', Light: 'Cahaya',
  Motion: 'Gerak', Accessory: 'Aksesori', Kitab: 'Kitab', Book: 'Bab', Ayah: 'Ayat', Page: 'Halaman', Surah: 'Surah', Juz: 'Juz', 'Hadith Number': 'Nomor Hadits', 'Price (USD)': 'Harga (USD)', 'Starting Price (USD)': 'Harga Mulai (USD)', 'Uniqueness Score': 'Skor Keunikan', Edition: 'Edisi', Gallery: 'Galeri', Tier: 'Tingkat', Edition: 'Edisi', Collection: 'Koleksi',
};
export const traitNameId = (n) => TRAIT_NAMES_ID[n] ?? n;

function spaceFor(c) {
  const base = { time: TIME.SPACE, stamp: STAMP.SPACE, model: MODEL.SPACE, quran: QURAN.STYLE_SPACE, hadith: QURAN.STYLE_SPACE }[c.kind];
  return c.exclusive ? [...base, EX_FINISH] : base;
}

const pctCache = new Map();
function percentileFn(c) {
  const k = `${c.kind}:${c.exclusive}`;
  if (!pctCache.has(k)) pctCache.set(k, percentileTable(spaceFor(c).map((opts) => opts.map((o) => o[3]))));
  return pctCache.get(k);
}

/** Ukuran ruang kombinasi (untuk tes & audit). */
export function spaceSize(key) {
  return product(spaceFor(collection(key)).map((o) => o.length));
}

/**
 * Hitung DNA. Hasil murni dari (koleksi, tokenId).
 * @returns {{key:string, kind:string, tokenId:number, exclusive:boolean, digits:number[], pick:any[], series?:any,
 *   score:number, percentile:number, tier:{rank:number,name:string}, seed:number, names:string[]}}
 */
export function dna(key, tokenId) {
  const c = collection(key);
  assertTokenId(c, tokenId);
  const index = tokenId - 1;
  const space = spaceFor(c);
  const radices = space.map((o) => o.length);
  const names = c.exclusive ? [...TRAIT_NAMES[c.kind], 'Finish'] : TRAIT_NAMES[c.kind];
  let digits;
  let series = null;
  if (c.kind === 'quran') {
    const plan = QURAN.PLANS[c.key];
    const slot = permute(index, c.max, `${c.salt}:slot`);
    series = QURAN.decodeSlot(plan, slot);
    const combo = permute(series.variant, product(radices), `${c.salt}:style:${series.series}:${series.unit}`);
    digits = decodeRadix(combo, radices);
  } else if (c.kind === 'hadith') {
    const slot = permute(index, c.max, `${c.salt}:slot`);
    series = HADITH.decodeSlot(c.key, slot, c.salt);
    const combo = permute(series.variant, product(radices), `${c.salt}:style:${series.unit}`);
    digits = decodeRadix(combo, radices);
  } else {
    const combo = permute(index, product(radices), `${c.salt}:combo`);
    digits = decodeRadix(combo, radices);
  }
  const pick = digits.map((d, i) => space[i][d]);
  const score = pick.reduce((a, o) => a + o[3], 0);
  let percentile = percentileFn(c)(score);
  if (series) {
    if (series.series === 'mushaf' || series.series === 'juz') percentile = 0.999;
    else if (series.series === 'page') percentile = Math.max(percentile, 0.95);
    else if (['nawawi', 'qudsi', 'dehlawi'].includes(series.series)) percentile = Math.max(percentile, 0.95); // kumpulan 40 hadits: langka
  }
  const tier = tierFor(percentile);
  const seed = hash32(`${c.salt}:seed:${tokenId}`);
  return { key: c.key, kind: c.kind, tokenId, exclusive: c.exclusive, digits, pick, names, series, score, percentile, tier, seed };
}

/** Indeks tier 0..4 (untuk filter). */
export const tierIndex = (t) => TIERS.findIndex((x) => x.rank === t.rank);

/** Representasi kanonik untuk hash keunikan. */
export function canonical(d) {
  const s = d.series ? `${d.series.series}:${d.series.unit}:` : '';
  return `${d.key}|${s}${d.digits.join('.')}`;
}

export { TIME, STAMP, QURAN, MODEL };
