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
};
const PRICE = { id: 'harga tetap $10–$1.000 per tingkat kelangkaan', en: 'fixed prices from $10 to $1,000 by rarity tier' };
const fmt = (n, lang) => Number(n).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US');

export const surahInfo = (n) => SURAH[n - 1];
export const seriesLabel = (c, key, lang) => {
  const s = seriesOptions(c).find((x) => x[0] === key);
  return s ? (lang === 'id' ? s[2] : s[1]) : key;
};

/** Halaman koleksi publik (etalase 5.000). */
export function collectionSeo(lang, c, count) {
  const k = KIND[c][lang];
  if (lang === 'id') {
    return {
      title: `${k[0]} — ${fmt(count, lang)} karya 1/1 di OpenSea`,
      desc: `Beli ${k[0].toLowerCase()} di jaringan Base: ${fmt(count, lang)} karya 1/1 pilihan, ${k[1]}, ${PRICE.id}. Telusuri per galeri & seri, lalu beli langsung di OpenSea.`,
      h1: k[0],
      intro: `${fmt(count, lang)} karya ${k[2]} 1/1 pilihan acak dari koleksi AXTO di blockchain Base — ${k[1]}. Setiap karya lahir dari DNA unik, tidak pernah dicetak ulang, dan dijual dengan ${PRICE.id} langsung di OpenSea. Karya yang terjual otomatis diganti karya berikutnya.`,
    };
  }
  return {
    title: `${k[0]} — ${fmt(count, lang)} 1/1 works on OpenSea`,
    desc: `Buy ${k[0].toLowerCase()} on the Base network: ${fmt(count, lang)} hand-picked 1/1 works, ${k[1]}, ${PRICE.en}. Browse by gallery and series, then buy straight on OpenSea.`,
    h1: k[0],
    intro: `${fmt(count, lang)} randomly picked 1/1 ${k[2]}s from the AXTO collection on the Base blockchain — ${k[1]}. Every work is born from a unique DNA, never reprinted, and sold at ${PRICE.en} directly on OpenSea. Sold works are replaced automatically.`,
  };
}

/** Halaman galeri seri. */
export function seriesSeo(lang, c, key, count) {
  const k = KIND[c][lang];
  const s = seriesLabel(c, key, lang);
  if (lang === 'id') {
    const h1 = `${k[0]} · Seri ${s}`;
    return { title: `${h1} — ${fmt(count, lang)} karya`, desc: `Galeri ${k[2]} seri ${s}: ${fmt(count, lang)} karya 1/1 di jaringan Base, ${PRICE.id}. Lihat animasinya, sifat lengkap, lalu beli di OpenSea.`, h1, intro: `Galeri seri ${s} berisi ${fmt(count, lang)} karya ${k[2]} 1/1 — ${k[1]}. Saring menurut tingkat kelangkaan, buka player untuk melihat geraknya, dan beli langsung di OpenSea.` };
  }
  const h1 = `${k[0]} · ${s} series`;
  return { title: `${h1} — ${fmt(count, lang)} works`, desc: `The ${s} gallery of ${k[2]}s: ${fmt(count, lang)} 1/1 works on Base, ${PRICE.en}. See them move, check every trait, then buy on OpenSea.`, h1, intro: `The ${s} series gallery holds ${fmt(count, lang)} 1/1 ${k[2]}s — ${k[1]}. Filter by rarity, open the player to see the motion, and buy straight on OpenSea.` };
}

/** Halaman surah (kaligrafi Al-Qur'an per surah). */
export function surahSeo(lang, n, count) {
  const [, ar, lt, en, idn, ayahs, place] = surahInfo(n);
  const where = { id: place === 'makki' ? 'Makkiyah' : 'Madaniyah', en: place === 'makki' ? 'Meccan' : 'Medinan' }[lang];
  if (lang === 'id') {
    const h1 = `NFT Kaligrafi Surah ${lt} (${ar})`;
    return { title: `${h1} — ${fmt(count, lang)} karya`, desc: `Kaligrafi Al-Qur'an Surah ${lt} (${idn}), surah ke-${n}, ${ayahs} ayat, ${where}: ${fmt(count, lang)} karya NFT 1/1 dengan bacaan qari, ${PRICE.id} di OpenSea.`, h1, intro: `Surah ${lt} — ${idn} — adalah surah ke-${n} dalam Al-Qur'an, ${ayahs} ayat, golongan ${where}. Di sini ada ${fmt(count, lang)} karya kaligrafi 1/1 dari ayat-ayatnya; teks disalin apa adanya dari mushaf Utsmani riwayat Hafs, dibacakan qari pilihan dengan penunjuk tiap kata.` };
  }
  const h1 = `Surah ${lt} (${ar}) Calligraphy NFTs`;
  return { title: `${h1} — ${fmt(count, lang)} works`, desc: `Qur'an calligraphy of Surah ${lt} (${en}), surah ${n}, ${ayahs} ayahs, ${where}: ${fmt(count, lang)} 1/1 NFTs with recitation, ${PRICE.en} on OpenSea.`, h1, intro: `Surah ${lt} — ${en} — is surah ${n} of the Qur'an, ${ayahs} ayahs, ${where}. Here are ${fmt(count, lang)} one-of-one calligraphy works of its ayahs; the text is reproduced exactly from the Uthmani Hafs mushaf and recited by the reciter of your choice with word-by-word highlighting.` };
}

/** Halaman induk galeri (semua galeri & seri). */
export function hubSeo(lang) {
  return lang === 'id'
    ? { title: 'Galeri NFT AXTO — jam digital, prangko, kaligrafi Al-Qur\'an & figur', desc: 'Semua galeri dan seri NFT AXTO di jaringan Base: jam digital hidup, prangko digital, kaligrafi Al-Qur\'an per surah, figur animasi, dan edisi eksklusif koin AXTO.', h1: 'Galeri & seri NFT AXTO' }
    : { title: 'AXTO NFT galleries — digital clocks, stamps, Qur\'an calligraphy & figures', desc: 'Every AXTO NFT gallery and series on Base: living digital clocks, digital stamps, Qur\'an calligraphy by surah, animated figures and AXTO coin exclusive editions.', h1: 'AXTO NFT galleries & series' };
}

export const BREAD = { id: { home: 'Beranda', hub: 'Galeri' }, en: { home: 'Home', hub: 'Galleries' } };
export function breadcrumb(base, items) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${base}${path}` })) };
}
export function itemList(base, lang, c, items, name) {
  return { '@context': 'https://schema.org', '@type': 'ItemList', name, numberOfItems: items.length, itemListElement: items.slice(0, 48).map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: `${base}/${lang}/nft/${c}/${it.id}`, name: it.name })) };
}
