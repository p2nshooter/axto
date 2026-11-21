/**
 * Inti deterministik AXTO: hash, PRNG, permutasi Feistel bijektif, mixed-radix, registri koleksi.
 * Dipakai bersama oleh engine (Node, GitHub Actions) dan worker (Cloudflare). Tanpa dependensi.
 *
 * Jaminan unik: index (0..max-1) → permute(index, P) → kombinasi sifat. permute() adalah bijeksi pada [0, P),
 * jadi dua token berbeda tidak pernah mendapat kombinasi sifat yang sama.
 */

/** Hash 32-bit FNV-1a + finalizer murmur3 untuk string. */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return fmix32(h);
}

export function fmix32(h) {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** PRNG mulberry32 dari seed 32-bit. Mengembalikan fungsi () => [0,1). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** PRNG dari kunci string (mis. "time:123"). */
export const rngFor = (key) => rng(hash32(key));

/**
 * Permutasi bijektif pada [0, n) memakai jaringan Feistel seimbang + cycle-walking.
 * n boleh sampai 2^52. Kunci string menentukan permutasinya.
 */
export function permute(x, n, key) {
  if (!Number.isSafeInteger(x) || x < 0 || x >= n) throw new RangeError(`permute: ${x} di luar [0, ${n})`);
  if (n <= 1) return 0;
  let bits = Math.ceil(Math.log2(n));
  if (bits % 2) bits += 1;
  if (bits < 2) bits = 2;
  const half = bits / 2;
  if (half > 26) throw new RangeError('permute: ruang terlalu besar');
  const size = 2 ** half;
  const mask = size - 1;
  const k = hash32(key);
  const rounds = 4;
  const once = (v) => {
    let L = Math.floor(v / size);
    let R = v % size;
    for (let r = 0; r < rounds; r += 1) {
      const f = fmix32((k ^ Math.imul(r + 1, 0x9e3779b9) ^ R) >>> 0) & mask;
      const nL = R;
      R = (L ^ f) & mask;
      L = nL;
    }
    return L * size + R;
  };
  let y = once(x);
  while (y >= n) y = once(y);
  return y;
}

/** Kebalikan permute (untuk audit/tes). */
export function unpermute(y, n, key) {
  if (n <= 1) return 0;
  let bits = Math.ceil(Math.log2(n));
  if (bits % 2) bits += 1;
  if (bits < 2) bits = 2;
  const half = bits / 2;
  const size = 2 ** half;
  const mask = size - 1;
  const k = hash32(key);
  const back = (v) => {
    let L = Math.floor(v / size);
    let R = v % size;
    for (let r = 3; r >= 0; r -= 1) {
      const pR = L;
      const f = fmix32((k ^ Math.imul(r + 1, 0x9e3779b9) ^ pR) >>> 0) & mask;
      const pL = (R ^ f) & mask;
      L = pL;
      R = pR;
    }
    return L * size + R;
  };
  let x = back(y);
  while (x >= n) x = back(x);
  return x;
}

/** Uraikan bilangan menjadi digit mixed-radix (radix terakhir = paling cepat berubah). */
export function decodeRadix(value, radices) {
  const out = new Array(radices.length);
  let v = value;
  for (let i = radices.length - 1; i >= 0; i -= 1) {
    out[i] = v % radices[i];
    v = Math.floor(v / radices[i]);
  }
  return out;
}

export const product = (radices) => radices.reduce((a, b) => a * b, 1);

/** Registri koleksi. tokenId = index + 1. Salt berbeda → desain publik & eksklusif tidak pernah sama. */
export const COLLECTIONS = {
  time: { key: 'time', kind: 'time', max: 2_000_000, salt: 'axto/time/v1', exclusive: false, symbol: 'AXTIME' },
  stamp: { key: 'stamp', kind: 'stamp', max: 2_000_000, salt: 'axto/stamp/v1', exclusive: false, symbol: 'AXSTAMP' },
  quran: { key: 'quran', kind: 'quran', max: 2_000_000, salt: 'axto/quran/v1', exclusive: false, symbol: 'AXQURAN' },
  model: { key: 'model', kind: 'model', max: 2_000_000, salt: 'axto/model/v1', exclusive: false, symbol: 'AXMODEL', requiresConsent: true },
  'ex-time': { key: 'ex-time', kind: 'time', max: 50_000, salt: 'axto/ex-time/v1', exclusive: true, symbol: 'AXXTIME' },
  'ex-stamp': { key: 'ex-stamp', kind: 'stamp', max: 50_000, salt: 'axto/ex-stamp/v1', exclusive: true, symbol: 'AXXSTAMP' },
  'ex-quran': { key: 'ex-quran', kind: 'quran', max: 50_000, salt: 'axto/ex-quran/v1', exclusive: true, symbol: 'AXXQURAN' },
};

export function collection(key) {
  const c = COLLECTIONS[key];
  if (!c) throw new Error(`Koleksi tidak dikenal: ${key}`);
  return c;
}

export function assertTokenId(c, tokenId) {
  if (!Number.isSafeInteger(tokenId) || tokenId < 1 || tokenId > c.max) {
    throw new RangeError(`tokenId ${tokenId} di luar 1..${c.max} untuk ${c.key}`);
  }
}

/** Tier harga mulai lelang (USD). Persentil skor keunikan → tier. */
export const TIERS = [
  { usd: 5, upTo: 0.5, name: 'Classic' },
  { usd: 10, upTo: 0.75, name: 'Rare' },
  { usd: 20, upTo: 0.9, name: 'Epic' },
  { usd: 50, upTo: 0.98, name: 'Legendary' },
  { usd: 100, upTo: 1.0000001, name: 'Masterpiece' },
];

/**
 * Distribusi skor tepat untuk sifat independen & seragam: konvolusi poin tiap sifat.
 * traitPoints: array per sifat berisi array poin per opsi. Mengembalikan fungsi skor → persentil tengah.
 */
export function percentileTable(traitPoints) {
  let dist = new Map([[0, 1]]);
  for (const pts of traitPoints) {
    const next = new Map();
    const p = 1 / pts.length;
    for (const [s, w] of dist) {
      for (const q of pts) next.set(s + q, (next.get(s + q) ?? 0) + w * p);
    }
    dist = next;
  }
  const scores = [...dist.keys()].sort((a, b) => a - b);
  const table = new Map();
  let below = 0;
  for (const s of scores) {
    const w = dist.get(s);
    table.set(s, below + w / 2);
    below += w;
  }
  return (score) => table.get(score) ?? 0;
}

export function tierFor(percentile) {
  return TIERS.find((t) => percentile < t.upTo) ?? TIERS[TIERS.length - 1];
}

/** SHA-256 hex (WebCrypto; tersedia di Node 20+ dan Workers). */
export async function sha256Hex(data) {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const d = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Pilih elemen dari array dengan rng. */
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

/** Escape teks untuk XML/HTML. */
export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const pad = (n, w = 2) => String(n).padStart(w, '0');
