/**
 * Edisi & harga (keputusan akhir pemilik, 23 Nov 2026):
 *   „NFT yg akan di upload ke open sea … supply nya dari 1-10 … Harga tetap saja, jgn auction." · „NFT exclusive harganya
 *    tetap aja $1 … Supply 10 setiap NFT". Harga OpenSea dipadatkan 24 Nov 2026 menjadi $1–$250 (lihat BANDS).
 *
 * Koleksi OpenSea: token id kontrak = urutan rilis k (1, 2, 3, …) dalam urutan acak etalase (permutasi Feistel ber-salt,
 * showcase.js) → karya = showcaseCandidate(c, k − 1). Jumlah edisi & harga diturunkan dari tier DNA karya itu dan
 * posisinya di dalam tier (persentil): makin langka → makin sedikit edisi → makin mahal. Murni & deterministik: kontrak
 * (rilis), mesin listing OpenSea, metadata dan halaman axto.io menghitung angka yang sama.
 */
import { collection, TIERS } from './core.js';
import { dna, spreadPercentile } from './dna.js';
import { showcaseCandidate } from './showcase.js';

export const EXCLUSIVE_SUPPLY = 10;
export const EXCLUSIVE_PRICE_USD = 1;
/**
 * Rentang per tier (rank 0..4): edisi [maks → min] dan harga [min → maks] USD. Pemilik, 24 Nov 2026 (memadatkan rentang
 * harga agar realistis untuk kolektor awal): Classic $1–5 · Rare $10–25 · Epic $30–75 · Legendary / Masterpiece $100–250
 * („hingga volume penjualan koleksi mulai terbentuk"). Jumlah edisi tetap 1–10 menurut kelangkaan.
 */
export const BANDS = [
  { name: 'Classic', supply: [10, 9], price: [1, 2, 3, 4, 5] },
  { name: 'Rare', supply: [8, 6], price: [10, 12, 15, 18, 20, 25] },
  { name: 'Epic', supply: [5, 4], price: [30, 40, 50, 60, 75] },
  { name: 'Legendary', supply: [3, 2], price: [100, 125, 150, 175] },
  { name: 'Masterpiece', supply: [1, 1], price: [200, 225, 250] },
];
/** Harga terendah & tertinggi di OpenSea (untuk teks promosi & halaman). */
export const PRICE_MIN_USD = BANDS[0].price[0];
export const PRICE_MAX_USD = BANDS[BANDS.length - 1].price[BANDS[BANDS.length - 1].price.length - 1];

/**
 * Posisi 0..1 sebuah karya di dalam tiernya (0 = paling umum di tier itu, ~1 = paling langka). Karya berskor sama disebar
 * merata di rentang persentil skornya (seed unik) sehingga setiap titik harga tier terisi — penting untuk saringan harga.
 */
function withinTier(d) {
  const i = TIERS.findIndex((t) => t.rank === d.tier.rank);
  const lo = i > 0 ? TIERS[i - 1].upTo : 0;
  const hi = Math.min(1, TIERS[i].upTo);
  const pct = d.series && ['mushaf', 'juz', 'page'].includes(d.series.series) ? d.percentile : spreadPercentile(d);
  return Math.min(0.999999, Math.max(0, (pct - lo) / Math.max(1e-9, hi - lo)));
}

/** Edisi & harga sebuah KARYA (tokenId desain). Eksklusif: 10 edisi, $1. */
export function edition(key, designId) {
  const c = collection(key);
  const d = dna(key, designId);
  if (c.exclusive) return { supply: EXCLUSIVE_SUPPLY, priceUsd: EXCLUSIVE_PRICE_USD, tier: d.tier.name, rank: d.tier.rank };
  const b = BANDS[d.tier.rank];
  const p = withinTier(d);
  if (c.one || c.stake) return { supply: 1, priceUsd: b.price[Math.floor(p * b.price.length)], tier: d.tier.name, rank: d.tier.rank }; // 1/1 & hadiah staking
  const [maxS, minS] = b.supply;
  const supply = maxS - Math.floor(p * (maxS - minS + 1));
  const priceUsd = b.price[Math.floor(p * b.price.length)];
  return { supply, priceUsd, tier: d.tier.name, rank: d.tier.rank };
}

/** Koleksi OpenSea: karya untuk token id kontrak k (1-based). */
export const designOf = (key, k) => showcaseCandidate(key, k - 1);

/** Jumlah edisi untuk rilis token id `from`..`from+count-1` (satu bita per id, untuk AxtoEditions.release). */
export function releaseSupplies(key, from, count) {
  const out = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) out[i] = edition(key, designOf(key, from + i)).supply;
  return out;
}

/** Baris lengkap untuk token id kontrak k: karya, edisi, harga (untuk metadata & listing). */
export function openseaItem(key, k) {
  const id = designOf(key, k);
  return { k, designId: id, ...edition(key, id) };
}
