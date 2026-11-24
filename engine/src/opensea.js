/**
 * Koleksi OpenSea AXTO — keputusan pemilik 24 Nov 2026 (dana deploy hanya ±0,0015 ETH):
 *   „100jt NFT dengan suplly 1-10 per series dan harga $1-$10000" · „Edisi 1 dulu, sisanya otomatis" ·
 *   „5 koleksi seri G- × 10 juta".
 *
 *  - 10 kontrak ERC-721 (AxtoCollection + ERC-2309): 5 koleksi publik (Jam, Prangko, Qur'an, Figur Model, Hadits) dan 5
 *    kembaran seri G- (versi lukisan GPU dari karya yang sama). Masing-masing 10.000.000 karya.
 *  - EDISI 1 setiap karya tercetak saat deploy ke wallet toko (premint) → 100.000.000 NFT langsung ada di OpenSea.
 *  - Edisi berikutnya dicetak otomatis oleh wallet toko saat edisi sebelumnya laku (gas dari hasil penjualan), sampai
 *    jumlah edisi karya itu (1–10 menurut kelangkaan, engine/src/editions.js); harga tetap $1–$10.000.
 *  - Nomor token: edisi e karya k = (e − 1) × 10.000.000 + k. Tanpa penyimpanan tambahan di rantai atau di R2.
 * Murni: kontrak deploy, worker (metadata) dan mesin listing memakai fungsi yang sama.
 */
import { edition } from './editions.js';

export const WORKS = 10_000_000;
export const MAX_EDITIONS = 10;
/** Koleksi publik dasar (karya & DNA) — urutan tetap. */
export const BASE_KEYS = ['time', 'stamp', 'quran', 'model', 'hadith'];
const NAMES = { time: 'Time', stamp: 'Stamp', quran: "Qur'an", model: 'Model', hadith: 'Hadith' };
const SYMS = { time: 'TIME', stamp: 'STAMP', quran: 'QURAN', model: 'MODEL', hadith: 'HADITH' };

/** 10 koleksi kontrak OpenSea: [kunci kontrak, koleksi dasar, seri G-?, nama, simbol]. */
export const OS_COLS = [
  ...BASE_KEYS.map((b) => ({ key: b, base: b, g: false, name: `AXTO ${NAMES[b]}`, symbol: `AX${SYMS[b]}` })),
  ...BASE_KEYS.map((b) => ({ key: `g-${b}`, base: b, g: true, name: `AXTO G- ${NAMES[b]}`, symbol: `AXG${SYMS[b]}` })),
];
export const OS_KEYS = OS_COLS.map((c) => c.key);
export const osCol = (key) => OS_COLS.find((c) => c.key === key) ?? null;

/** Token id untuk edisi `e` (1..10) karya `k` (1..WORKS). */
export function tokenOf(k, e = 1) {
  if (!Number.isSafeInteger(k) || k < 1 || k > WORKS || !Number.isSafeInteger(e) || e < 1 || e > MAX_EDITIONS) throw new RangeError('karya/edisi di luar rentang');
  return (e - 1) * WORKS + k;
}

/** Karya, edisi, jumlah edisi & harga dari token id; null bila token tidak sah untuk karya itu (edisi > jumlah edisinya). */
export function tokenInfo(key, tokenId) {
  const c = osCol(key);
  const t = Number(tokenId);
  if (!c || !Number.isSafeInteger(t) || t < 1 || t > WORKS * MAX_EDITIONS) return null;
  const k = ((t - 1) % WORKS) + 1;
  const e = Math.floor((t - 1) / WORKS) + 1;
  const ed = edition(c.base, k);
  if (e > ed.supply) return null;
  return { key, base: c.base, g: c.g, work: k, edition: e, supply: ed.supply, priceUsd: ed.priceUsd, tier: ed.tier, rank: ed.rank };
}

/** Edisi berikutnya yang boleh dicetak setelah edisi `e` karya `k` laku; null bila sudah edisi terakhir. */
export function nextToken(key, tokenId) {
  const i = tokenInfo(key, tokenId);
  if (!i || i.edition >= i.supply) return null;
  return tokenOf(i.work, i.edition + 1);
}

/**
 * Metadata token OpenSea (tokenURI = /api/token/<koleksi>/<token>). `meta` = metadata karya dasar (engine/src/metadata.js),
 * `gpu` = {img, anim} bila karya itu sudah dilukis GPU (hanya untuk seri G-). Seri G- yang belum dilukis memakai karya
 * aslinya dulu dan berganti otomatis ke lukisan GPU begitu jadi (pemilik 24 Nov 2026).
 */
export function tokenMetadata(info, meta, base = 'https://axto.io', gpu = null) {
  const g = info.g;
  const attrs = [
    ...meta.attributes,
    { display_type: 'number', trait_type: 'Edition', value: info.edition },
    { trait_type: 'Series G-', value: g ? (gpu ? 'Painted by GPU' : 'GPU painting in progress') : 'No' },
  ];
  return {
    ...meta,
    // kode di depan (pemilik 24 Nov 2026): OS-? koleksi publik; OS-G-? kembaran GPU (? = nomor seri lukisan GPU, lahir saat
    // dilukis) — yang belum dilukis bertanda „OS-G“ saja sampai nomor lahirnya ada
    name: `${g ? `${gpu?.serial ? `OS-G-${gpu.serial}` : 'OS-G'} · ${meta.name.replace(/^OS-\d+ · /, '')}` : meta.name} · Edition ${info.edition}/${info.supply}`,
    image: g && gpu?.img ? gpu.img : meta.image,
    animation_url: g && gpu?.anim ? gpu.anim : meta.animation_url,
    external_url: `${base}/en/nft/${info.base}/${info.work}${g ? '?v=g' : ''}`,
    attributes: attrs,
  };
}

/** Metadata koleksi (contractURI) untuk kembaran seri G-. */
export function gContractMetadata(baseMeta, key, base = 'https://axto.io') {
  return {
    ...baseMeta,
    name: `AXTO G- ${baseMeta.name.replace(/^AXTO /, "")}`,
    description: `G- series: the GPU-painted twin of ${baseMeta.name}. ${WORKS.toLocaleString('en-US')} works, each issued in 1 to 10 editions (the rarer, the fewer) at a fixed price from $1 to $10,000. Until a work is painted by GPU it shows its original living artwork. / Seri G-: kembaran lukisan GPU dari ${baseMeta.name}; ${WORKS.toLocaleString('id-ID')} karya, 1–10 edisi per karya, harga tetap $1–$10.000.`,
    external_link: `${base}/en/c/${key.replace(/^g-/, '')}?maker=gpu`,
  };
}
