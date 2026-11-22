/**
 * Etalase axto.io untuk koleksi publik (perintah pemilik #45): „hanya random 5000 NFT setiap jenisnya, jd total 20rb NFT
 * yg random dari opensea di harga tetap". Urutan acak deterministik = permutasi Feistel ber-salt atas seluruh koleksi;
 * etalase = 5.000 calon pertama yang BELUM terjual. Yang terjual di OpenSea otomatis diganti calon berikutnya, jadi stok
 * selalu 5.000 per jenis. Murni (tanpa I/O): mesin listing & worker menghitung hasil yang sama.
 */
import { collection, permute, OPENSEA_PRICE_USD } from './core.js';
import { dna } from './dna.js';

export const SHOWCASE_N = 5000;
export const SHOWCASE_KEYS = ['time', 'stamp', 'quran', 'model'];

/** Calon ke-k (0-based) dalam urutan acak etalase → tokenId. */
export function showcaseCandidate(key, k) {
  const c = collection(key);
  return permute(k, c.max, `${c.salt}:showcase`) + 1;
}

/**
 * Daftar etalase: `n` tokenId pertama dalam urutan acak yang tidak ada di `sold`.
 * @param {string} key koleksi publik
 * @param {{has(id:number):boolean}} [sold]
 * @returns {{ids:number[], scanned:number}} scanned = jumlah calon yang diperiksa (cursor untuk pengganti)
 */
export function showcaseIds(key, sold = new Set(), n = SHOWCASE_N) {
  const c = collection(key);
  if (c.exclusive) throw new Error('etalase hanya untuk koleksi publik');
  const ids = [];
  let k = 0;
  for (; ids.length < n && k < c.max; k += 1) {
    const id = showcaseCandidate(key, k);
    if (!sold.has(id)) ids.push(id);
  }
  return { ids, scanned: k };
}

/** Harga tetap OpenSea (USD) untuk sebuah token publik, dari tier DNA-nya. */
export function priceUsd(key, tokenId) {
  return OPENSEA_PRICE_USD[dna(key, tokenId).tier.rank];
}
