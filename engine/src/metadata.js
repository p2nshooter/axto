/**
 * Metadata token (standar OpenSea) + konteks render. Semua deterministik dari dna().
 */
import { collection } from './core.js';
import { dna, traitNameId } from './dna.js';
import { SURAH, juzStart, pageStart, globalFromAyah, ayahFromGlobal } from './catalog/quran.js';
import { timeSvg, timePlayer } from './render/time.js';
import { stampSvg, stampPlayer } from './render/stamp.js';
import { quranSvg, quranPlayer } from './render/quran.js';
import { modelSvg, modelPlayer } from './render/model.js';

const KIND_NAME = { time: 'AXTO Time', stamp: 'AXTO Stamps', quran: 'AXTO Quran Calligraphy', model: 'AXTO Models' };
const KIND_NAME_ID = { time: 'AXTO Jam', stamp: 'AXTO Prangko', quran: 'AXTO Kaligrafi Al-Qur\'an', model: 'AXTO Model' };

const parseRef = (r) => r.split(':').map(Number);
/** Halaman mushaf tempat ayat (surah, ayah) berada. */
export function pageOf(surah, ayah) {
  const g = globalFromAyah(surah, ayah);
  let lo = 1;
  let hi = 604;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const [s, a] = parseRef(pageStart(mid));
    if (globalFromAyah(s, a) <= g) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Rujukan Al-Qur'an untuk token QURAN (tanpa teks). */
export function quranRef(d) {
  const { series, unit } = d.series;
  if (series === 'ayah') {
    const [surah, ayah] = ayahFromGlobal(unit);
    const s = SURAH[surah - 1];
    return { series, surah, ayah, surahAr: s[1], surahLt: s[2], surahEn: s[3], surahId: s[4], page: pageOf(surah, ayah) };
  }
  if (series === 'page') {
    const page = unit + 1;
    const [s1, a1] = parseRef(pageStart(page));
    return { series, page, surah: s1, ayah: a1, surahLt: SURAH[s1 - 1][2], juz: juzOf(s1, a1), pages: [page] };
  }
  if (series === 'juz') {
    const juz = unit + 1;
    const [s1, a1] = parseRef(juzStart(juz));
    const p1 = pageOf(s1, a1);
    const p2 = juz < 30 ? pageOf(...parseRef(juzStart(juz + 1))) - 1 : 604;
    return { series, juz, surah: s1, ayah: a1, surahLt: SURAH[s1 - 1][2], pages: range(p1, p2) };
  }
  return { series, pages: range(1, 604) };
}

function juzOf(surah, ayah) {
  const g = globalFromAyah(surah, ayah);
  let j = 1;
  for (let k = 1; k <= 30; k += 1) {
    const [s, a] = parseRef(juzStart(k));
    if (globalFromAyah(s, a) <= g) j = k;
  }
  return j;
}

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/**
 * Lengkapi konteks render. provider: {ayah(s,a) → {ar,tr,lt}, page(p) → {baris}} (async).
 * Untuk koleksi lain mengembalikan objek kosong / head model.
 */
export async function renderCtx(d, provider = {}) {
  if (d.kind === 'quran') {
    const ref = quranRef(d);
    const ctx = { ...ref };
    if (ref.series === 'ayah' || ref.series === 'juz') {
      const t = await provider.ayah(ref.surah, ref.ayah);
      ctx.ar = t.ar;
      ctx.tr = t.tr;
    }
    if (ref.series === 'page') {
      const pg = await provider.page(ref.page);
      ctx.lines = pg.baris.filter((b) => b.t === 'b').map((b) => b.k.map((w) => w[0]).join(' '));
    }
    return ctx;
  }
  if (d.kind === 'model' && provider.head) {
    const p = d.pick[0][5];
    return { head: { href: await provider.head(d.pick[0][4], p[1]), ar: p[2], cx: p[3], chin: p[4] } };
  }
  return {};
}

export function title(d, ref) {
  const id = `#${d.tokenId.toLocaleString('en-US')}`;
  const ex = d.exclusive ? 'Exclusive ' : '';
  const p = d.pick;
  switch (d.kind) {
    case 'time': return `${ex}AXTO Time ${id} — ${p[1][1]} ${p[0][1]}`;
    case 'stamp': return `${ex}${p[0][1]} · ${p[1][1]} ${p[6][4]} ${id}`;
    case 'model': return `${ex}AXTO Model ${id} — ${p[1][1]} · ${p[2][1]}`;
    case 'quran': {
      const r = ref ?? quranRef(d);
      if (r.series === 'ayah') return `${ex}Quran ${r.surahLt} ${r.surah}:${r.ayah} — ${p[0][1]} ${id}`;
      if (r.series === 'page') return `${ex}Mushaf Uthmani Page ${r.page} — ${p[0][1]} ${id}`;
      if (r.series === 'juz') return `${ex}Quran Juz ${r.juz} — ${p[0][1]} ${id}`;
      return `${ex}The Complete Quran Mushaf — ${p[2][1]} ${id}`;
    }
    default: return id;
  }
}

function description(d, ref, base) {
  const c = collection(d.key);
  const cert = `${base}/en/verifikasi/${d.key}/${d.tokenId}`;
  const edition = '1 of 1';
  const en = {
    time: 'A living digital clock — it shows the real time wherever it is displayed. Choose your time zone in the player.',
    stamp: 'A digital postage stamp from an imaginary realm, engraved in vector so every detail stays sharp at any zoom.',
    quran: 'Quranic calligraphy artwork in 3D motion with a recitation by the reciter of your choice and word-by-word highlighting. The text is reproduced unaltered from the Uthmani Hafs mushaf (KFGQPC, CC BY 4.0). This token represents the artwork and the collectible — not any right over the verses of the Qur\'an.',
    model: 'An animated figure artwork from the AXTO model series, created with the model\'s written permission.',
  }[d.kind];
  const id = {
    time: 'Jam digital hidup — menampilkan waktu nyata di mana pun ditampilkan. Pilih zona waktu di player.',
    stamp: 'Prangko digital dari negeri imajiner, diukir vektor sehingga setiap detail tetap tajam saat di-zoom.',
    quran: 'Karya kaligrafi Al-Qur\'an bergerak 3D dengan bacaan qari pilihan dan penunjuk tiap kata. Teks disalin tanpa perubahan dari mushaf Utsmani Hafs (KFGQPC, CC BY 4.0). Token ini mewakili karya seni dan koleksinya, bukan hak atas ayat Al-Qur\'an.',
    model: 'Karya figur beranimasi dari seri model AXTO, dibuat dengan izin tertulis model.',
  }[d.kind];
  const only = c.exclusive ? '\n\nExclusive edition — sold only on axto.io. / Edisi eksklusif — hanya dijual di axto.io.' : '';
  return `${en}\n\n${id}${only}\n\nEdition ${edition} · Starting tier: ${d.tier.name} ($${d.tier.usd}) · Certificate: ${cert}\n\n© AXTO (axto.io). The owner may display the artwork for personal and promotional use; copyright of the artwork remains with AXTO. Resale royalty 10%.`;
}

/** Metadata ERC-721 untuk tokenURI. */
export function metadata(key, tokenId, base = 'https://axto.io') {
  const d = dna(key, tokenId);
  const c = collection(key);
  const ref = d.kind === 'quran' ? quranRef(d) : null;
  const attrs = d.pick.map((o, i) => ({ trait_type: d.names[i], value: d.kind === 'stamp' && d.names[i] === 'Subject' ? d.pick[1][4][o[4]] : o[1] }));
  if (ref) {
    attrs.unshift({ trait_type: 'Series', value: { ayah: 'Ayah', page: 'Mushaf Page', juz: 'Juz', mushaf: 'Complete Mushaf' }[ref.series] });
    if (ref.series === 'ayah') attrs.push({ trait_type: 'Surah', value: `${ref.surah}. ${ref.surahLt}` }, { display_type: 'number', trait_type: 'Ayah', value: ref.ayah }, { display_type: 'number', trait_type: 'Page', value: ref.page });
    if (ref.series === 'page') attrs.push({ display_type: 'number', trait_type: 'Page', value: ref.page }, { display_type: 'number', trait_type: 'Juz', value: ref.juz });
    if (ref.series === 'juz') attrs.push({ display_type: 'number', trait_type: 'Juz', value: ref.juz });
  }
  attrs.push(
    { trait_type: 'Tier', value: d.tier.name },
    { trait_type: 'Starting Price (USD)', value: String(d.tier.usd) },
    { trait_type: 'Edition', value: '1/1' },
    { trait_type: 'Collection', value: c.exclusive ? 'Exclusive' : 'Public' },
    { display_type: 'number', trait_type: 'Uniqueness Score', value: d.score },
  );
  return {
    name: title(d, ref),
    description: description(d, ref, base),
    image: `${base}/img/${key}/${tokenId}.svg`,
    animation_url: `${base}/play/${key}/${tokenId}`,
    external_url: `${base}/en/nft/${key}/${tokenId}`,
    background_color: '0b0b10',
    attributes: attrs,
  };
}

/** Label ID untuk tampilan situs. */
export function attributesId(m) {
  return m.attributes.map((a) => ({ ...a, trait_type: traitNameId(a.trait_type) }));
}

export function contractMetadata(key, base = 'https://axto.io') {
  const c = collection(key);
  const name = `${c.exclusive ? 'AXTO Exclusive — ' : ''}${KIND_NAME[c.kind]}`;
  return {
    name,
    description: `${name}: ${c.max.toLocaleString('en-US')} unique 1/1 living artworks by AXTO. Every token is generated from a mathematically unique DNA — no duplicates, never reprinted. Live 72-hour auctions at axto.io. / ${KIND_NAME_ID[c.kind]}: ${c.max.toLocaleString('id-ID')} karya 1/1 unik, lelang 72 jam di axto.io.`,
    image: `${base}/logo-512.png`,
    banner_image: `${base}/og/${key}.svg`,
    external_link: `${base}/en/c/${key}`,
    seller_fee_basis_points: 1000,
    fee_recipient: '0xDC39C04E704b1fec2BE648c49c842B2B17AfEBDA',
  };
}

/** Render image SVG. */
export function renderSvg(d, ctx) {
  switch (d.kind) {
    case 'time': return timeSvg(d);
    case 'stamp': return stampSvg(d);
    case 'quran': return quranSvg(d, ctx);
    case 'model': return modelSvg(d, ctx);
    default: throw new Error('kind?');
  }
}

/** Render player HTML. */
export function renderPlayer(d, meta, ctx, opts) {
  switch (d.kind) {
    case 'time': return timePlayer(d, meta, opts);
    case 'stamp': return stampPlayer(d, meta, opts);
    case 'quran': return quranPlayer(d, meta, ctx, opts);
    case 'model': return modelPlayer(d, meta, ctx, opts);
    default: throw new Error('kind?');
  }
}
