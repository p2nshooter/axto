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
  const d = { ...(doc ?? {}), ids: [...(doc?.ids ?? [])], serial: { ...(doc?.serial ?? {}) }, by: { ...(doc?.by ?? {}) }, at }; // kolom lain (vid) ikut
  if (d.ids.includes(id)) return undefined;
  d.ids.push(id);
  d.serial[id] = Math.max(0, ...Object.values(d.serial).map(Number)) + 1;
  d.by[id] = by;
  return d;
}

/**
 * Prompt GERAK untuk GPU gambar→video (pemilik, 24 Nov 2026: „Series G- wajib sudah dengan animasi saat produksi, jd 100% di
 * buatkan GPU"). Gerak dibuat GPU dari lukisan G- itu sendiri; tanpa teks, tanpa orang.
 */
export function gerakFor(key, id) {
  const c = key.replace(/^ex-/, '');
  const akhir = 'smooth seamless loop, cinematic, high detail, no text, no letters, no people';
  if (c === 'time') return `the watch comes alive: the clock hands rotate smoothly around the dial, the second hand sweeps, gemstones sparkle and glint, light glides across the polished metal, slow camera push-in, ${akhir}`;
  if (c === 'stamp') return `the vintage postage stamp comes alive: the engraved scene inside moves gently, soft light sweeps across the paper and perforated edges, subtle parallax, slow camera drift, ${akhir}`;
  if (c === 'quran' || c === 'hadith') return `the illuminated manuscript ornament comes alive: gold leaf shimmers, arabesque patterns glow and pulse softly, light rays drift across the frame, slow camera push-in, the central panel stays empty, ${akhir}`;
  throw new Error(`koleksi ${key} tidak dianimasikan GPU`);
}
