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
// #47 (pemilik, 22 Nov 2026): publik 4 × 10.000.000 = 40 jt NFT, langsung tercetak ke wallet toko → OpenSea
export const COLLECTIONS = {
  time: { key: 'time', kind: 'time', max: 10_000_000, salt: 'axto/time/v1', exclusive: false, symbol: 'AXTIME' },
  stamp: { key: 'stamp', kind: 'stamp', max: 10_000_000, salt: 'axto/stamp/v1', exclusive: false, symbol: 'AXSTAMP' },
  quran: { key: 'quran', kind: 'quran', max: 10_000_000, salt: 'axto/quran/v1', exclusive: false, symbol: 'AXQURAN' },
  model: { key: 'model', kind: 'model', max: 10_000_000, salt: 'axto/model/v1', exclusive: false, symbol: 'AXMODEL', requiresConsent: true },
  // #49: kaligrafi hadits (12 kitab, 38.144 hadits)
  hadith: { key: 'hadith', kind: 'hadith', max: 10_000_000, salt: 'axto/hadith/v1', exclusive: false, symbol: 'AXHADITH' },
  // perintah pemilik #44: eksklusif (dibayar koin AXTO, dilelang & berputar di axto.io) cukup 10.000 per koleksi × 4 = 40.000
  'ex-time': { key: 'ex-time', kind: 'time', max: 10_000, salt: 'axto/ex-time/v1', exclusive: true, symbol: 'AXXTIME' },
  'ex-stamp': { key: 'ex-stamp', kind: 'stamp', max: 10_000, salt: 'axto/ex-stamp/v1', exclusive: true, symbol: 'AXXSTAMP' },
  'ex-quran': { key: 'ex-quran', kind: 'quran', max: 10_000, salt: 'axto/ex-quran/v1', exclusive: true, symbol: 'AXXQURAN' },
  'ex-model': { key: 'ex-model', kind: 'model', max: 10_000, salt: 'axto/ex-model/v1', exclusive: true, symbol: 'AXXMODEL', requiresConsent: true },
  'ex-hadith': { key: 'ex-hadith', kind: 'hadith', max: 10_000, salt: 'axto/ex-hadith/v1', exclusive: true, symbol: 'AXXHADITH' },
};

/**
 * Kode NFT (pemilik 24 Nov 2026: „NFT exclusive yg transaksi dengan axto coin kasih nama depanya AC, klo di bikin pake GPU
 * AC-G-?, klo bukan make GPU langsung AC-?; yg langsung ke opensea OS-?, yg make GPU OS-G-?" — ? = nomor urut NFT itu
 * lahir/keluar dari produksi): karya biasa = nomor karya; karya GPU = nomor seri G- (urutan lukisan GPU).
 */
export function kode(key, id, g = 0) {
  const pre = COLLECTIONS[key]?.exclusive ? 'AC' : 'OS';
  return g ? `${pre}-G-${g}` : `${pre}-${id}`;
}

/**
 * Koleksi hadiah staking koin AXTO (pemilik, 24 Nov 2026: „buatkan husus untuk hadiah staking, jgn versi G-, bikin versi OS
 * aja … bikin aja 10jt dulu … Supply 1/1 aja husus Stacking Komunis biar lebih VVIP" · „Pastikan tidak ada karya yg sama").
 * Satu kontrak „AXTO Staking"; token t dipetakan ke salah satu himpunan di bawah (engine/src/stake.js). Sengaja DI LUAR
 * COLLECTIONS: tidak dijual, tidak masuk galeri/etalase/sitemap publik.
 *
 * Tidak pernah sama dengan karya lain — dijamin oleh konstruksi, bukan kebetulan: desain diambil dari urutan acak (permutasi
 * bijektif) yang SAMA dengan koleksi publiknya (`after`), tetapi pada nomor SESUDAH jatah koleksi publik itu:
 *   · Qur'an: ayat ke-(k mod 6.236) dengan nomor gaya sesudah ±1.602 gaya publik ayat itu;
 *   · hadits: hadits ke-(k mod 38.144) dengan nomor gaya sesudah gaya publik hadits itu;
 *   · prangko: kombinasi ke-(10.000.000 + k) dari 1,4 miliar kombinasi.
 * Jam & model tidak dipakai: ruang sifatnya (±10,3 jt) sudah hampir habis dipakai 10 jt karya publik. Karya eksklusif
 * membawa sifat Finish sehingga juga tidak pernah identik.
 */
export const STAKE_SETS = {
  'st-quran': { key: 'st-quran', kind: 'quran', max: 100_000_000, salt: 'axto/stake-quran/v1', exclusive: false, stake: true, after: 'quran', symbol: 'AXSTAKE' },
  'st-hadith': { key: 'st-hadith', kind: 'hadith', max: 100_000_000, salt: 'axto/stake-hadith/v1', exclusive: false, stake: true, after: 'hadith', symbol: 'AXSTAKE' },
  'st-stamp': { key: 'st-stamp', kind: 'stamp', max: 100_000_000, salt: 'axto/stake-stamp/v1', exclusive: false, stake: true, after: 'stamp', symbol: 'AXSTAKE' },
};

/**
 * 100 juta karya 1/1 baru di OpenSea (pemilik, 24 Nov 2026: „klo bikin 100jt lg 1/1 ke opensea" → 3 koleksi besar). Sama
 * seperti STAKE_SETS, desain diambil SESUDAH jatah publik dalam permutasi yang sama, dan sesudah 20 jt nomor pertama yang
 * dicadangkan untuk staking (`skip`) → tidak pernah sama dengan karya publik, hadiah staking, atau sesamanya.
 *
 * Tiap tema dibagi DUA kontrak (±16,7 jt karya): jaringan Base menolak transaksi di atas 16.777.216 gas (EIP-7825, upgrade
 * Azul 28 Mei 2026), sedangkan premint 33,3 jt karya dalam satu konstruktor butuh ±20,2 jt gas. Bagian II memakai nomor
 * desain SESUDAH bagian I (`skip` + jumlah karya bagian I) → tetap satu urutan, tidak ada desain kembar.
 */
const ONE_HALF = { quran: [16_666_667, 16_666_667], hadith: [16_666_667, 16_666_666], stamp: [16_666_667, 16_666_666] };
const ONE_SYM = { quran: 'AX1QURAN', hadith: 'AX1HADITH', stamp: 'AX1STAMP' };
export const ONE_SETS = Object.fromEntries(Object.entries(ONE_HALF).flatMap(([kind, [a, b]]) => [
  [`one-${kind}`, { key: `one-${kind}`, kind, max: a, salt: `axto/one-${kind}/v1`, exclusive: false, one: true, after: kind, skip: 20_000_000, symbol: ONE_SYM[kind] }],
  [`one-${kind}-2`, { key: `one-${kind}-2`, kind, max: b, salt: `axto/one-${kind}/v1`, exclusive: false, one: true, after: kind, skip: 20_000_000 + a, symbol: `${ONE_SYM[kind]}2` }],
]));
/** Batas gas per transaksi di Base (EIP-7825). Setiap transaksi deploy harus jauh di bawahnya. */
export const TX_GAS_CAP = 16_777_216;
/** Nomor „sesudah publik" yang dicadangkan untuk koleksi staking (kontrak staking maks. 50 jt → ≤ 16,7 jt per himpunan). */
export const STAKE_RESERVED = 20_000_000;

export function collection(key) {
  const c = COLLECTIONS[key] ?? STAKE_SETS[key] ?? ONE_SETS[key];
  if (!c) throw new Error(`Koleksi tidak dikenal: ${key}`);
  return c;
}

export function assertTokenId(c, tokenId) {
  if (!Number.isSafeInteger(tokenId) || tokenId < 1 || tokenId > c.max) {
    throw new RangeError(`tokenId ${tokenId} di luar 1..${c.max} untuk ${c.key}`);
  }
}

/** Pemilik: „Auction star $1 semuanya tanpa kecuali" — setiap lot (publik & eksklusif) mulai $1. */
export const START_USD = 1;

/** Tier kelangkaan (bukan harga). Persentil skor keunikan → tier; rank menentukan fitur player. */
/** Harga „Buy now" OpenSea per tier untuk koleksi publik, USD (perintah pemilik #44); dikonversi ke ETH saat listing. */
export const OPENSEA_PRICE_USD = [10, 25, 75, 250, 1000];

export const TIERS = [
  { rank: 0, upTo: 0.5, name: 'Classic' },
  { rank: 1, upTo: 0.75, name: 'Rare' },
  { rank: 2, upTo: 0.9, name: 'Epic' },
  { rank: 3, upTo: 0.98, name: 'Legendary' },
  { rank: 4, upTo: 1.0000001, name: 'Masterpiece' },
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
  const ranges = new Map();
  let below = 0;
  for (const s of scores) {
    const w = dist.get(s);
    table.set(s, below + w / 2);
    ranges.set(s, [below, w]);
    below += w;
  }
  const fn = (score) => table.get(score) ?? 0;
  /** Rentang persentil [bawah, lebar] milik satu skor — untuk menyebar karya berskor sama secara merata. */
  fn.range = (score) => ranges.get(score) ?? [0, 0];
  return fn;
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
