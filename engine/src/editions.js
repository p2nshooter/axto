/**
 * Edisi & harga (keputusan akhir pemilik, 23 Nov 2026):
 *   „NFT yg akan di upload ke open sea … supply nya dari 1-10, harga dari $1-$10k tergantung kelangkaan, unik dll yang
 *    menjadikan harga layak di jual mahal. Harga tetap saja, jgn auction." · „NFT exclusive harganya tetap aja $1 …
 *    Supply 10 setiap NFT".
 *
 * Koleksi OpenSea: token id kontrak = urutan rilis k (1, 2, 3, …) dalam urutan acak etalase (permutasi Feistel ber-salt,
 * showcase.js) → karya = showcaseCandidate(c, k − 1). Jumlah edisi & harga diturunkan dari tier DNA karya itu dan
 * posisinya di dalam tier (persentil): makin langka → makin sedikit edisi → makin mahal. Murni & deterministik: kontrak
 * (rilis), mesin listing OpenSea, metadata dan halaman axto.io menghitung angka yang sama.
 */
import { collection, TIERS } from './core.js';
import { dna } from './dna.js';
import { showcaseCandidate } from './showcase.js';

export const EXCLUSIVE_SUPPLY = 10;
export const EXCLUSIVE_PRICE_USD = 1;
/** Rentang per tier (rank 0..4): edisi [maks → min] dan harga [min → maks] USD. */
export const BANDS = [
  { name: 'Classic', supply: [10, 9], price: [1, 2, 3, 5, 7, 10] },
  { name: 'Rare', supply: [8, 6], price: [15, 20, 25, 35, 50, 75] },
  { name: 'Epic', supply: [5, 4], price: [100, 150, 200, 250, 300, 400] },
  { name: 'Legendary', supply: [3, 2], price: [500, 750, 1000, 1500, 2000, 2500] },
  { name: 'Masterpiece', supply: [1, 1], price: [5000, 6000, 7500, 8500, 10000] },
];

/** Posisi 0..1 sebuah karya di dalam tiernya (0 = paling umum di tier itu, ~1 = paling langka). */
function withinTier(d) {
  const i = TIERS.findIndex((t) => t.rank === d.tier.rank);
  const lo = i > 0 ? TIERS[i - 1].upTo : 0;
  const hi = Math.min(1, TIERS[i].upTo);
  return Math.min(0.999999, Math.max(0, (d.percentile - lo) / Math.max(1e-9, hi - lo)));
}

/** Edisi & harga sebuah KARYA (tokenId desain). Eksklusif: 10 edisi, $1. */
export function edition(key, designId) {
  const c = collection(key);
  const d = dna(key, designId);
  if (c.exclusive) return { supply: EXCLUSIVE_SUPPLY, priceUsd: EXCLUSIVE_PRICE_USD, tier: d.tier.name, rank: d.tier.rank };
  const b = BANDS[d.tier.rank];
  const p = withinTier(d);
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
