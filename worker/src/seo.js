/**
 * SEO niche axto.io (perintah pemilik #45 „Jgn lupa niche seo nya yg kuat … supaya banyak pengunjung nya").
 * Judul, deskripsi, H1 dan paragraf pembuka setiap halaman koleksi / galeri seri / surah ditulis untuk orang dulu, kata
 * kunci kedua (NFT jam digital, NFT prangko, NFT kaligrafi Al-Qur'an, NFT Islami, NFT jaringan Base, beli NFT OpenSea).
 * Tidak ada halaman pintu: setiap halaman memuat karya nyata yang bisa dibeli, dan teksnya mengikuti isi halaman.
 */
import { seriesOptions } from '../../engine/src/metadata.js';
import { SURAH } from '../../engine/src/catalog/quran-meta.js';

const KIND = {
  time: { id: ['NFT Jam Digital Hidup', 'jam digital yang menunjukkan waktu nyata', 'NFT jam'], en: ['Living Digital Clock NFTs', 'digital clocks that tell the real time', 'clock NFT'] },
  stamp: { id: ['NFT Prangko Digital', 'prangko digital dari negeri imajiner, diukir vektor', 'NFT prangko'], en: ['Digital Stamp NFTs', 'vector-engraved digital postage stamps from imaginary realms', 'stamp NFT'] },
  quran: { id: ['NFT Kaligrafi Al-Qur\'an', 'kaligrafi Al-Qur\'an 3D dengan bacaan qari dan penunjuk kata', 'NFT kaligrafi Islami'], en: ['Qur\'an Calligraphy NFTs', '3D Qur\'an calligraphy with recitation and word-by-word highlighting', 'Islamic calligraphy NFT'] },
  model: { id: ['NFT Figur Animasi', 'figur beranimasi 2D dalam seri pendidikan, antariksa dan lainnya', 'NFT animasi'], en: ['Animated Figure NFTs', 'animated 2D figures in education, space and more series', 'animated NFT'] },
  hadith: { id: ['NFT Kaligrafi Hadits', 'kaligrafi hadits lengkap dengan nama kitab, bab & nomor, dibacakan suara Arab dan diterjemahkan ke bahasa Anda', 'NFT hadits'], en: ['Hadith Calligraphy NFTs', 'hadith calligraphy with collection, book and number, read aloud in Arabic and translated into your language', 'hadith NFT'] },
};
const PRICE = { id: 'edisi 1–10 per karya, harga tetap $1–$250 menurut kelangkaan', en: '1–10 editions per work at fixed prices from $1 to $250 by rarity' };
// jujur soal status OpenSea (pemilik 23 Nov 2026: „yg tampil dr opensea kan blm ada"): sebelum kontrak aktif = pratinjau
const WHERE = { id: (live) => (live ? 'dijual langsung di OpenSea (jaringan Base)' : 'segera hadir di OpenSea (jaringan Base)'), en: (live) => (live ? 'sold directly on OpenSea (Base network)' : 'coming soon to OpenSea (Base network)') };
const fmt = (n, lang) => Number(n).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US');

export const surahInfo = (n) => SURAH[n - 1];
export const seriesLabel = (c, key, lang) => {
  const s = seriesOptions(c).find((x) => x[0] === key);
  return s ? (lang === 'id' ? s[2] : s[1]) : key;
};

/** Halaman koleksi publik (etalase sampai 5.000 karya). */
export function collectionSeo(lang, c, count, live = false) {
  const k = KIND[c][lang];
  if (lang === 'id') {
    return {
      title: `${k[0]} — ${fmt(count, lang)} karya edisi terbatas`,
      desc: `${k[0]} di jaringan Base: ${fmt(count, lang)} karya pilihan, ${k[1]}, ${PRICE.id}, ${WHERE.id(live)}. Telusuri per galeri & seri.`,
      h1: k[0],
      intro: `${fmt(count, lang)} karya ${k[2]} pilihan acak dari koleksi AXTO di blockchain Base — ${k[1]}. Setiap karya lahir dari DNA unik dan tidak pernah dibuat ulang; terbit ${PRICE.id}, ${WHERE.id(live)}. Karya yang habis otomatis diganti karya berikutnya.`,
    };
  }
  return {
    title: `${k[0]} — ${fmt(count, lang)} limited-edition works`,
    desc: `${k[0]} on the Base network: ${fmt(count, lang)} hand-picked works, ${k[1]}, ${PRICE.en}, ${WHERE.en(live)}. Browse by gallery and series.`,
    h1: k[0],
    intro: `${fmt(count, lang)} randomly picked ${k[2]}s from the AXTO collection on the Base blockchain — ${k[1]}. Every work is born from a unique DNA and never remade; issued in ${PRICE.en}, ${WHERE.en(live)}. Sold-out works are replaced automatically.`,
  };
}

/** Halaman galeri seri. */
export function seriesSeo(lang, c, key, count, live = false) {
  const k = KIND[c][lang];
  const s = seriesLabel(c, key, lang);
  if (lang === 'id') {
    const h1 = `${k[0]} · Seri ${s}`;
    return { title: `${h1} — ${fmt(count, lang)} karya`, desc: `Galeri ${k[2]} seri ${s}: ${fmt(count, lang)} karya di jaringan Base, ${PRICE.id}, ${WHERE.id(live)}.`, h1, intro: `Galeri seri ${s} berisi ${fmt(count, lang)} karya ${k[2]} — ${k[1]}. Saring menurut tingkat kelangkaan dan buka player untuk melihat geraknya; ${WHERE.id(live)}.` };
  }
  const h1 = `${k[0]} · ${s} series`;
  return { title: `${h1} — ${fmt(count, lang)} works`, desc: `The ${s} gallery of ${k[2]}s: ${fmt(count, lang)} works on Base, ${PRICE.en}, ${WHERE.en(live)}.`, h1, intro: `The ${s} series gallery holds ${fmt(count, lang)} ${k[2]}s — ${k[1]}. Filter by rarity and open the player to see the motion; ${WHERE.en(live)}.` };
}

/** Halaman surah (kaligrafi Al-Qur'an per surah). */
export function surahSeo(lang, n, count, live = false) {
  const [, ar, lt, en, idn, ayahs, place] = surahInfo(n);
  const where = { id: place === 'makki' ? 'Makkiyah' : 'Madaniyah', en: place === 'makki' ? 'Meccan' : 'Medinan' }[lang];
  if (lang === 'id') {
    const h1 = `NFT Kaligrafi Surah ${lt} (${ar})`;
    return { title: `${h1} — ${fmt(count, lang)} karya`, desc: `Kaligrafi Al-Qur'an Surah ${lt} (${idn}), surah ke-${n}, ${ayahs} ayat, ${where}: ${fmt(count, lang)} karya NFT dengan bacaan qari, ${PRICE.id}, ${WHERE.id(live)}.`, h1, intro: `Surah ${lt} — ${idn} — adalah surah ke-${n} dalam Al-Qur'an, ${ayahs} ayat, golongan ${where}. Di sini ada ${fmt(count, lang)} karya kaligrafi dari ayat-ayatnya; teks disalin apa adanya dari mushaf Utsmani riwayat Hafs, dibacakan qari pilihan dengan penunjuk tiap kata.` };
  }
  const h1 = `Surah ${lt} (${ar}) Calligraphy NFTs`;
  return { title: `${h1} — ${fmt(count, lang)} works`, desc: `Qur'an calligraphy of Surah ${lt} (${en}), surah ${n}, ${ayahs} ayahs, ${where}: ${fmt(count, lang)} NFTs with recitation, ${PRICE.en}, ${WHERE.en(live)}.`, h1, intro: `Surah ${lt} — ${en} — is surah ${n} of the Qur'an, ${ayahs} ayahs, ${where}. Here are ${fmt(count, lang)} calligraphy works of its ayahs; the text is reproduced exactly from the Uthmani Hafs mushaf and recited by the reciter of your choice with word-by-word highlighting.` };
}

/** Marketplace OpenSea (induk koleksi publik, galeri & seri). */
export function hubSeo(lang, live = false) {
  return lang === 'id'
    ? { title: 'Marketplace OpenSea AXTO — NFT jam, prangko, kaligrafi Al-Qur\'an & hadits, figur', desc: `Koleksi publik NFT AXTO di jaringan Base: jam digital hidup, prangko, kaligrafi Al-Qur'an per surah, kaligrafi hadits & figur animasi — ${PRICE.id}, ${WHERE.id(live)}.`, h1: 'Marketplace OpenSea AXTO' }
    : { title: 'AXTO OpenSea Marketplace — clock, stamp, Qur\'an & hadith calligraphy, figure NFTs', desc: `The public AXTO NFT collections on Base: living digital clocks, stamps, Qur'an calligraphy by surah, hadith calligraphy & animated figures — ${PRICE.en}, ${WHERE.en(live)}.`, h1: 'AXTO OpenSea Marketplace' };
}

export const BREAD = { id: { home: 'Beranda', hub: 'OpenSea', ex: 'Eksklusif', mk: 'Pasar Member' }, en: { home: 'Home', hub: 'OpenSea', ex: 'Exclusive', mk: 'Member Market' } };
export function breadcrumb(base, items) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${base}${path}` })) };
}
export function itemList(base, lang, c, items, name) {
  return { '@context': 'https://schema.org', '@type': 'ItemList', name, numberOfItems: items.length, itemListElement: items.slice(0, 48).map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: `${base}/${lang}/nft/${c}/${it.id}`, name: it.name })) };
}
