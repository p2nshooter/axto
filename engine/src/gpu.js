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
/**
 * Variasi per karya (pemilik, 25 Nov 2026: „jgn ada 1 pun yg sama, hususunya perangko, krn gambar statis bikin yg banyak
 * setiap harinya"). Sifat DNA saja terlalu sedikit (prangko: bingkai × subjek × seri × palet ≈ 90 rb kombinasi untuk 10 jt
 * karya), jadi setiap karya mendapat kombinasi tambahan dari kumpulan di bawah, dipilih tetap dari (koleksi, karya, putaran).
 * Tanpa unsur huruf/angka (pemeriksa menolak tulisan). Prompt lengkap dijaga unik oleh worker (tanda tangan sekali-tulis R2);
 * bila kebetulan sama, `putaran` naik dan kombinasi lain dipakai.
 */
const VARIASI = {
  time: [
    ['soft golden-hour window light', 'cool moonlit glow', 'warm candlelight', 'crisp museum spotlight', 'diffused overcast daylight', 'dramatic chiaroscuro side light', 'gentle sunrise rim light', 'luminous studio softbox light'],
    ['resting on a polished walnut desk', 'resting on white Carrara marble', 'resting on dark slate stone', 'resting on a velvet cushion', 'resting on an engraved brass tray', 'resting on a lacquered ebony table', 'resting on a glass shelf', 'resting on a carved sandstone ledge', 'resting on a mosaic tile table', 'resting on a leather-bound book'],
    ['delicate filigree scrollwork', 'fine guilloché engraving', 'enamel cloisonné panels', 'tiny seed-pearl inlay', 'hand-chased acanthus leaves', 'geometric girih inlay', 'mother-of-pearl marquetry', 'subtle hammered texture', 'etched starburst rays', 'twisted rope gadrooning'],
    ['softly blurred library shelves behind', 'a hazy arched window behind', 'a dim gallery wall behind', 'dust motes floating in a sunbeam behind', 'a quiet garden seen through glass behind', 'deep gradient shadows behind', 'a moonlit balcony behind', 'draped silk behind'],
    ['champagne', 'rose gold', 'antique bronze', 'platinum', 'emerald enamel', 'sapphire enamel', 'ivory', 'onyx'],
  ],
  stamp: [
    ['with rolling hills behind', 'under a crescent moon', 'beside a calm harbour', 'framed by palm fronds', 'with mountains on the horizon', 'among drifting clouds', 'on a winding river bank', 'with a lighthouse in the distance', 'under a starry sky', 'in a blooming meadow', 'beside an old stone bridge', 'with migrating birds overhead', 'at a desert oasis', 'in gently falling snow', 'with a rising sun behind', 'amid autumn leaves'],
    ['fine cross-hatched line engraving', 'delicate stipple engraving', 'bold woodcut-style lines', 'copperplate etching', 'lithographic tonal shading', 'guilloché background pattern', 'art deco geometric linework', 'art nouveau flowing linework'],
    ['cream', 'ivory', 'pale blue-tinted', 'soft grey', 'warm buff', 'pale green-tinted', 'light rose-tinted', 'chalk white'],
    ['dark velvet', 'a black leather album page', 'navy linen', 'charcoal felt', 'deep green baize', 'burgundy velvet'],
    ['soft even light', 'gentle side light', 'warm lamp light', 'cool daylight'],
    ['the subject seen in profile', 'the subject seen head-on', 'the subject in three-quarter view', 'the subject from a low angle', 'the subject from above', 'the subject in close-up', 'the subject in the middle distance'],
  ],
  naskah: [
    ['interlaced eight-point stars', 'arabesque vine scrolls', 'tulip and carnation borders', 'cloud-collar motifs', 'muqarnas-inspired cells', 'braided strapwork bands', 'lotus palmettes', 'pomegranate medallions', 'hexagonal girih tiles', 'peacock-feather arabesques'],
    ['lapis lazuli blue', 'malachite green', 'carnelian red', 'turquoise', 'deep indigo', 'saffron', 'ivory and gold', 'ruby and gold', 'emerald and gold', 'violet'],
    ['corner medallions', 'quarter-rosette corners', 'gilded spandrels', 'cartouche corners', 'floral corner sprays'],
    ['burnished gold leaf', 'punched gold dots', 'fine gold hairlines', 'raised gesso gilding', 'silver highlights'],
    ['soft museum light', 'warm candle light', 'cool daylight', 'gentle raking light'],
    ['wide margins with tiny floral sprigs', 'narrow margins', 'marbled paper margins', 'margins with gold rulings', 'plain toned margins'],
  ],
};

/** Hash 32-bit tetap (FNV-1a) — murni, sama di worker, engine dan tes. */
export function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/** Kalimat variasi karya ini (kombinasi tetap dari kumpulan VARIASI). */
export function variasiFor(key, id, putaran = 0) {
  const c = key.replace(/^ex-/, '');
  const pools = VARIASI[c === 'quran' || c === 'hadith' ? 'naskah' : c];
  let x = hash32(`${key}:${id}:${putaran}`) ^ Math.imul(hash32(`v2:${id}:${putaran}:${key}`), 2654435761);
  const pick = pools.map((pool) => { const v = pool[(x >>> 0) % pool.length]; x = Math.floor((x >>> 0) / pool.length) ^ hash32(`${v}:${id}`); return v; });
  if (c === 'time') return `${pick[0]}, ${pick[1]}, case details of ${pick[2]}, ${pick[3]}, ${pick[4]} accents`;
  if (c === 'stamp') return `the engraved scene ${pick[0]}, ${pick[5]}, ${pick[1]}, ${pick[2]} paper, resting on ${pick[3]}, ${pick[4]}`;
  return `ornament of ${pick[0]} in ${pick[1]}, ${pick[2]}, ${pick[3]}, ${pick[5]}, ${pick[4]}`;
}

/** Seed tetap per karya & putaran (1..2^31-1) — lukisan karya berbeda tidak pernah berangkat dari derau yang sama. */
export const seedFor = (key, id, putaran = 0) => (hash32(`seed:${key}:${id}:${putaran}`) % 2147483646) + 1;

export function promptFor(key, id, putaran = 0) {
  return `${promptDasar(key, id)}, ${variasiFor(key, id, putaran)}`;
}

/** Prompt dari sifat DNA saja (tanpa variasi). */
export function promptDasar(key, id) {
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
