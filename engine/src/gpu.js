/**
 * Seri G- (karya GPU) — bagian bersama worker axto.io (produksi tiap 5 menit lewat Cron Trigger + Workers AI) dan
 * ops/gpu-sync.mjs (GitHub Actions, penyedia GPU gratis lain). Deskripsi dari DNA karya, SELALU tanpa
 * teks (teks Al-Qur'an & hadits tidak pernah dibuat mesin), tanpa sosok orang (Figur Model tidak dilukis GPU).
 */
import { metadata } from './metadata.js';
import { showcaseIds } from './showcase.js';

export const GPU_KEYS = ['time', 'stamp', 'quran', 'hadith', 'ex-time', 'ex-stamp', 'ex-quran', 'ex-hadith'];
/** Urutan karya kandidat: etalase acak (publik) atau permutasi tetap 1..10.000 (eksklusif, langkah prima → semua karya terjangkau). */
export function candidates(c) {
  if (!c.startsWith('ex-')) return showcaseIds(c).ids;
  const n = 10_000;
  return Array.from({ length: n }, (_, k) => ((k * 7919) % n) + 1);
}
export const NEGATIVE = 'text, letters, words, writing, calligraphy, arabic script, numbers, watermark, signature, logo, person, face, blurry, lowres, deformed';

const attr = (m, k) => String(m.attributes.find((a) => a.trait_type === k)?.value ?? '').replace(/[^\p{L}\p{N} ,'-]/gu, ' ').trim();

/** Deskripsi untuk GPU dari DNA karya — tanpa teks, tanpa sosok manusia. */
export function promptFor(key, id) {
  const m = metadata(key, id);
  const a = (k) => attr(m, k);
  const c = key.replace(/^ex-/, '');
  const base = 'masterpiece collectible digital artwork, ultra detailed, cinematic lighting, rich color, 8k, no text, no letters, no watermark';
  if (c === 'time') return `luxury fantasy timepiece sculpture, ${a('Form')} shape, ${a('Theme')} theme, ${a('Digits')} style dial glow, ${a('Gems')} gemstones, ${a('Backdrop')} background, ${base}`;
  if (c === 'stamp') return `vintage postage stamp of the imaginary ${a('Realm')}, ${a('Series')} theme featuring a ${a('Subject')}, ${a('Frame')} shaped stamp with perforated edges, engraved intaglio illustration, ${a('Palette')} ink palette, year ${a('Year')}, ${base}`;
  if (c === 'quran') return `ornate islamic manuscript illumination, ${a('Illumination')} ornament, ${a('Composition')} composition, ${a('Material')} and gold leaf, ${a('Background')} background, ${a('Frame')}, empty central panel, arabesque and geometric patterns, ${base}`;
  if (c === 'hadith') return `ornate islamic manuscript illumination, ${a('Illumination')} ornament, ${a('Composition')} composition, ${a('Material')} inlay, ${a('Background')} paper, ${a('Frame')}, empty central cartouche, arabesque and geometric patterns, ${base}`;
  throw new Error(`koleksi ${key} tidak diproduksi GPU`);
}

/** Tambah karya ke dokumen seri G- koleksi (murni): nomor seri berikutnya, tidak dobel. Mengembalikan undefined bila sudah ada. */
export function tambahSeri(doc, id, by, at = new Date().toISOString()) {
  const d = { ids: [...(doc?.ids ?? [])], serial: { ...(doc?.serial ?? {}) }, by: { ...(doc?.by ?? {}) }, at };
  if (d.ids.includes(id)) return undefined;
  d.ids.push(id);
  d.serial[id] = Math.max(0, ...Object.values(d.serial).map(Number)) + 1;
  d.by[id] = by;
  return d;
}
