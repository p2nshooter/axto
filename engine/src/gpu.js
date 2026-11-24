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

/** Versi mutu seri G- baru: cap `qa[id].v === QA_V` dari pemeriksa mutu (worker/src/gpu.js: lukis FLUX.2 + periksa). Karya G-
 * lama tanpa cap tetap ada dan tampil sebagai lukisan aslinya, diam (pemilik 24 Nov 2026). */
export const QA_V = 2;
/** Versi URL gambar G-: lukisan lolos-mutu (`q2`) berbeda dari lukisan lama (`2`) agar cache peramban/OpenSea tidak menampilkan
 * gambar lama setelah karya dilukis ulang dengan nomor seri yang sama. */
export const vGambar = (lolosMutu) => (lolosMutu ? `q${QA_V}` : '2');

/* Prompt v2. Kata seperti „masterpiece", „8k", „no text" DIHAPUS: model gambar malah menuliskannya sebagai huruf di lukisan
 * (G-22 „8k GIAL MAASTERENDE"). Model gambar tidak paham kalimat negatif, jadi semua permintaan ditulis positif: simetris,
 * di tengah, tampak depan, permukaan polos. Atribut yang mengundang tulisan (angka jam, tahun prangko, gaya kaligrafi) tidak dipakai. */
const GAYA = 'perfectly symmetrical composition, centered, straight-on front view, studio product photography, soft cinematic lighting, rich color, highly detailed, sharp focus';

/** Deskripsi untuk GPU dari DNA karya — tanpa teks, tanpa sosok manusia. */
export function promptFor(key, id) {
  const m = metadata(key, id);
  const a = (k) => attr(m, k).toLowerCase();
  const c = key.replace(/^ex-/, '');
  const bingkai = () => (/borderless/.test(a('Frame')) ? 'a borderless page' : `${a('Frame')} border`);
  if (c === 'time') return `a luxurious ${a('Theme')} themed collectible table clock sculpture, a perfectly round dial in the exact center of the image with a clean plain face, slim elegant hour and minute hands, simple stick hour markers, polished case set with ${a('Gems')}, ${a('Backdrop')} backdrop, ${GAYA}`;
  if (c === 'stamp') return `a single vintage postage stamp lying flat, seen from directly above, ${a('Frame')} shape with crisp perforated edges, an engraved intaglio illustration of a ${a('Subject')} for a ${a('Series')} theme, ${a('Palette')} ink on cream paper with plain blank margins, resting on dark velvet, ${GAYA}`;
  if (c === 'quran') return `an ornate islamic illuminated manuscript page, ${a('Illumination')} ornament in ${a('Material')} and gold leaf on a ${a('Background')} ground, ${bingkai()}, a large smooth plain cream parchment panel in the exact center of the page left completely empty, arabesque and geometric patterns around the panel, ${GAYA}`;
  if (c === 'hadith') return `an ornate islamic illuminated manuscript page, ${a('Illumination')} ornament with ${a('Material')} inlay on a ${a('Background')} ground, ${bingkai()}, a large smooth plain cream parchment cartouche in the exact center left completely empty, arabesque and geometric patterns around it, ${GAYA}`;
  throw new Error(`koleksi ${key} tidak diproduksi GPU`);
}

/** Tambah karya ke dokumen seri G- koleksi (murni): nomor seri berikutnya, tidak dobel. Mengembalikan undefined bila sudah ada. */
export function tambahSeri(doc, id, by, at = new Date().toISOString(), qa = undefined) {
  const d = { ...(doc ?? {}), ids: [...(doc?.ids ?? [])], serial: { ...(doc?.serial ?? {}) }, by: { ...(doc?.by ?? {}) }, qa: { ...(doc?.qa ?? {}) }, at }; // kolom lain (vid) ikut
  if (d.ids.includes(id)) return undefined;
  d.ids.push(id);
  d.serial[id] = Math.max(0, ...Object.values(d.serial).map(Number)) + 1;
  d.by[id] = by;
  if (qa) d.qa[id] = qa;
  return d;
}

/**
 * Prompt GERAK untuk GPU gambar→video (pemilik, 24 Nov 2026: „Series G- wajib sudah dengan animasi saat produksi, jd 100% di
 * buatkan GPU"). Gerak dibuat GPU dari lukisan G- itu sendiri; tanpa teks, tanpa orang.
 */
export function gerakFor(key, id) {
  const c = key.replace(/^ex-/, '');
  const akhir = 'locked-off static camera, no zoom, no camera movement, the object stays exactly centered and in place, smooth seamless loop, high detail';
  if (c === 'time') return `the clock comes alive: the hour and minute hands rotate smoothly around the center of the dial, gemstones sparkle and glint, soft light glides across the polished case, ${akhir}`;
  if (c === 'stamp') return `the vintage postage stamp comes alive: the engraved scene inside moves gently, soft light sweeps across the paper and perforated edges, ${akhir}`;
  if (c === 'quran' || c === 'hadith') return `the illuminated manuscript ornament comes alive: gold leaf shimmers, arabesque patterns glow and pulse softly, light glints travel along the border, the central panel stays plain, empty and perfectly still, ${akhir}`;
  throw new Error(`koleksi ${key} tidak dianimasikan GPU`);
}
