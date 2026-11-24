/**
 * Koleksi OpenSea AXTO — keputusan pemilik 24 Nov 2026 (dana deploy hanya ±0,0015 ETH):
 *   „100jt NFT dengan suplly 1-10 per series dan harga $1-$10000" · „Edisi 1 dulu, sisanya otomatis" ·
 *   „5 koleksi seri G- × 10 juta".
 *
 *  - 10 kontrak ERC-721 (AxtoCollection + ERC-2309): 5 koleksi publik (Jam, Prangko, Qur'an, Figur Model, Hadits) dan 5
 *    kembaran seri G- (versi lukisan GPU dari karya yang sama). Masing-masing 10.000.000 karya.
 *  - EDISI 1 setiap karya tercetak saat deploy ke wallet toko (premint) → 100.000.000 NFT langsung ada di OpenSea.
 *  - Edisi berikutnya dicetak otomatis oleh wallet toko saat edisi sebelumnya laku (gas dari hasil penjualan), sampai
 *    jumlah edisi karya itu (1–10 menurut kelangkaan, engine/src/editions.js); harga tetap $1–$250.
 *  - Nomor token: edisi e karya k = (e − 1) × 10.000.000 + k. Tanpa penyimpanan tambahan di rantai atau di R2.
 * Murni: kontrak deploy, worker (metadata) dan mesin listing memakai fungsi yang sama.
 */
import { edition } from './editions.js';
import { STAKE_WORKS, stakeEdition } from './stake.js';
import { ONE_SETS } from './core.js';

export const WORKS = 10_000_000;
export const MAX_EDITIONS = 10;
/** Koleksi publik dasar (karya & DNA) — urutan tetap. */
export const BASE_KEYS = ['time', 'stamp', 'quran', 'model', 'hadith'];
const NAMES = { time: 'Time', stamp: 'Stamp', quran: "Qur'an", model: 'Model', hadith: 'Hadith' };
const SYMS = { time: 'TIME', stamp: 'STAMP', quran: 'QURAN', model: 'MODEL', hadith: 'HADITH' };

/** 10 koleksi kontrak OpenSea: [kunci kontrak, koleksi dasar, seri G-?, nama, simbol]. */
export const OS_COLS = [
  ...BASE_KEYS.map((b) => ({ key: b, base: b, g: false, name: `AXTO ${NAMES[b]}`, symbol: `AX${SYMS[b]}`, works: WORKS, editions: MAX_EDITIONS })),
  ...BASE_KEYS.map((b) => ({ key: `g-${b}`, base: b, g: true, name: `AXTO G- ${NAMES[b]}`, symbol: `AXG${SYMS[b]}`, works: WORKS, editions: MAX_EDITIONS })),
];
export const OS_KEYS = OS_COLS.map((c) => c.key);
/**
 * 100 juta karya 1/1 baru (pemilik 24 Nov 2026, „Ya, 3 koleksi besar"): kaligrafi Al-Qur'an, kaligrafi hadits, prangko —
 * satu edisi per karya, semua tercetak saat deploy, harga tetap menurut tier ($1–$250). Desain unik: engine/src/core.js ONE_SETS.
 * Tiap tema = 2 kontrak (I & II, ±16,7 jt karya) karena batas gas per transaksi Base (EIP-7825, 16.777.216 gas).
 */
const ONE_NAMES = { quran: "AXTO 1/1 Qur'an Calligraphy", hadith: 'AXTO 1/1 Hadith Calligraphy', stamp: 'AXTO 1/1 Stamps' };
const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI'];
const THEME = ['quran', 'hadith', 'stamp'];
/** Bagian I & II (inti) per tema, lalu tambahan berselang tema: III Qur'an, III Hadits, III Prangko, IV … (urutan deploy). */
export const ONE_COLS = Object.values(ONE_SETS)
  .map((s) => ({ key: s.key, base: s.key, g: false, one: true, kind: s.kind, part: s.part, extra: s.extra, name: `${ONE_NAMES[s.kind]}${ROMAN[s.part - 1]}`, symbol: s.symbol, works: s.max, editions: 1 }))
  .sort((a, b) => (a.extra - b.extra) || (a.extra ? a.part - b.part || THEME.indexOf(a.kind) - THEME.indexOf(b.kind) : THEME.indexOf(a.kind) - THEME.indexOf(b.kind) || a.part - b.part));
/** Inti (selalu dideploy) & tambahan (bila sisa dana deployer cukup). */
export const ONE_CORE = ONE_COLS.filter((c) => !c.extra);
export const ONE_EXTRA = ONE_COLS.filter((c) => c.extra);
export const ONE_KEYS = ONE_COLS.map((c) => c.key);
/** Semua koleksi yang dilisting mesin OpenSea (edisi 1–10 + 1/1). */
export const LIST_COLS = [...OS_COLS, ...ONE_COLS];
/** Koleksi hadiah staking — hanya dilisting SETELAH staking ditutup (sisa hadiah dilepas ke pasar; engine/src/stake.js). */
export const STAKE_COL = { key: 'stake', base: 'stake', g: false, one: true, stake: true, name: 'AXTO Staking', symbol: 'AXSTAKE', works: STAKE_WORKS, editions: 1 };
export const osCol = (key) => LIST_COLS.find((c) => c.key === key) ?? (key === STAKE_COL.key ? STAKE_COL : null);

/** Token id untuk edisi `e` (1..10) karya `k` (1..works koleksi; bawaan 10 jt). */
export function tokenOf(k, e = 1, works = WORKS) {
  if (!Number.isSafeInteger(k) || k < 1 || k > works || !Number.isSafeInteger(e) || e < 1 || e > MAX_EDITIONS) throw new RangeError('karya/edisi di luar rentang');
  return (e - 1) * works + k;
}
/** Token id untuk karya `k` edisi `e` di koleksi `key` (memakai jumlah karya koleksi itu). */
export const tokenOfCol = (key, k, e = 1) => tokenOf(k, e, osCol(key)?.works ?? WORKS);

/** Karya, edisi, jumlah edisi & harga dari token id; null bila token tidak sah untuk karya itu (edisi > jumlah edisinya). */
export function tokenInfo(key, tokenId) {
  const c = osCol(key);
  const t = Number(tokenId);
  if (!c || !Number.isSafeInteger(t) || t < 1 || t > c.works * c.editions) return null;
  const k = ((t - 1) % c.works) + 1;
  const e = Math.floor((t - 1) / c.works) + 1;
  const ed = c.stake ? stakeEdition(k) : edition(c.base, k);
  if (e > ed.supply) return null;
  return { key, base: c.base, g: c.g, one: Boolean(c.one), work: k, edition: e, supply: ed.supply, priceUsd: ed.priceUsd, tier: ed.tier, rank: ed.rank };
}

/** Edisi berikutnya yang boleh dicetak setelah edisi `e` karya `k` laku; null bila sudah edisi terakhir. */
export function nextToken(key, tokenId) {
  const i = tokenInfo(key, tokenId);
  if (!i || i.edition >= i.supply) return null;
  return tokenOfCol(key, i.work, i.edition + 1);
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
    external_url: info.one ? `${base}/en/opensea` : `${base}/en/nft/${info.base}/${info.work}${g ? '?v=g' : ''}`,
    attributes: attrs,
  };
}

/** Metadata koleksi (contractURI) untuk koleksi 1/1 — sekaligus promosi koin komunitas AXTO. */
export function oneContractMetadata(key, base = 'https://axto.io') {
  const c = osCol(key);
  const what = { quran: ["Qur'an calligraphy", 'kaligrafi Al-Qur\'an'], hadith: ['hadith calligraphy', 'kaligrafi hadits'], stamp: ['stamps from imaginary realms', 'prangko negeri imajiner'] }[c.kind];
  return {
    name: c.name,
    description: `${c.works.toLocaleString('en-US')} one-of-one living artworks of ${what[0]} by AXTO — every design exists once, never repeated in any other AXTO collection${c.kind === 'stamp' ? '' : ', with the sacred text reproduced unaltered'}. A single edition each, at a fixed price by rarity from $1 (Classic) to $250 (Masterpiece). Part of the axto.io NFT museum and its community coin AXTO, open from $1. / ${c.works.toLocaleString('id-ID')} karya hidup 1/1 ${what[1]} oleh AXTO — setiap desain hanya ada sekali dan tidak pernah terulang di koleksi AXTO mana pun. Satu edisi per karya, harga tetap menurut kelangkaan $1–$250. Bagian dari museum NFT axto.io dan koin komunitasnya, AXTO, mulai dari $1.`,
    image: `${base}/logo-512.png`,
    banner_image: `${base}/og/${key}.svg`,
    external_link: `${base}/en/opensea`,
    seller_fee_basis_points: 1000,
    fee_recipient: '0xDC39C04E704b1fec2BE648c49c842B2B17AfEBDA',
  };
}

/** Metadata koleksi (contractURI) untuk kembaran seri G-. */
export function gContractMetadata(baseMeta, key, base = 'https://axto.io') {
  return {
    ...baseMeta,
    name: `AXTO G- ${baseMeta.name.replace(/^AXTO /, "")}`,
    description: `G- series: the GPU-painted twin of ${baseMeta.name}. ${WORKS.toLocaleString('en-US')} works, each issued in 1 to 10 editions (the rarer, the fewer) at a fixed price from $1 to $250. Until a work is painted by GPU it shows its original living artwork. / Seri G-: kembaran lukisan GPU dari ${baseMeta.name}; ${WORKS.toLocaleString('id-ID')} karya, 1–10 edisi per karya, harga tetap $1–$250.`,
    external_link: `${base}/en/c/${key.replace(/^g-/, '')}?maker=gpu`,
  };
}
