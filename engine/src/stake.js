/**
 * Staking koin AXTO & koleksi hadiahnya „AXTO Staking" (pemilik, 24 Nov 2026):
 *   „Buatkan Staking axto coin … berlaku kelipatan. Setiap 1 axto coin yg di lock berlaku: Lock 3 Bulan 3 NFT Classic ·
 *    6 Bulan 8 NFT Classic · 1 thn 20 NFT Classic · Stacking 10 Axto + 3 NFT Rare (1 thn penuh, kelipatan) · 100 Axto
 *    + 40 Rare · 1000 Axto + 400 Rare & 100 Epic & 50 Masterpiece · 10000 Axto + 4000 Rare & 1000 Epic & 500 Masterpiece."
 *   „Free Gass Fee langsung di WD ke address yg di cantumkan saat kontract selesai, saat di lock maka langsung tampilkan
 *    hadiahnya secara random … tp blm bisa di WD sampai contract selesai … tidak bisa di beli."
 *   „buatkan husus untuk hadiah staking, jgn versi G-, bikin versi OS aja … bikin aja 10jt dulu … Supply 1/1 aja husus
 *    Stacking Komunis biar lebih VVIP."
 *
 * Koleksi: satu kontrak ERC-721 „AXTO Staking", 10 jt karya 1/1 tercetak (ERC-2309) ke wallet toko saat deploy, tidak
 * pernah di-listing (tidak bisa dibeli). Token t → salah satu dari tiga himpunan STAKE_SETS (kaligrafi Al-Qur'an, kaligrafi
 * hadits, prangko) secara bergiliran; setiap desain dijamin berbeda dari semua karya lain (engine/src/core.js STAKE_SETS).
 * Tier karya = tier DNA-nya (Classic/Rare/Epic/Legendary/Masterpiece).
 *
 * Hadiah acak tanpa daftar stok: setiap tier punya urutan acaknya sendiri (permutasi Feistel atas 1..STAKE_WORKS) dan
 * HANYA mengambil token yang tier DNA-nya sama → dua tier tidak pernah berebut token, dan satu posisi staking cukup
 * menyimpan rentang posisi [from, to) per tier (idnya dihitung ulang kapan saja). Murni & deterministik.
 */
import { permute, unpermute, STAKE_SETS, TIERS } from './core.js';
import { edition } from './editions.js';
import { dna } from './dna.js';
import { metadata } from './metadata.js';

export const STAKE_KEY = 'stake';
/** Karya yang tercetak saat deploy (1/1 masing-masing). */
export const STAKE_WORKS = 10_000_000;
/** Batas kontrak; karya di atas STAKE_WORKS dicetak wallet toko bila suatu saat stok tier habis. */
export const STAKE_MAX = 50_000_000;
/** Urutan himpunan untuk token 1, 2, 3, … — kaligrafi Al-Qur'an & hadits lebih dulu (ceruk terkuat komunitas). */
export const STAKE_ORDER = ['st-quran', 'st-hadith', 'st-stamp'];

/** Token staking t → himpunan & nomor karya di dalamnya. */
export function stakeDesign(t) {
  if (!Number.isSafeInteger(t) || t < 1 || t > STAKE_MAX) throw new RangeError(`token staking ${t} di luar 1..${STAKE_MAX}`);
  const i = t - 1;
  return { key: STAKE_ORDER[i % STAKE_ORDER.length], id: Math.floor(i / STAKE_ORDER.length) + 1 };
}
export const stakeDna = (t) => { const s = stakeDesign(t); return dna(s.key, s.id); };
export const stakeTier = (t) => stakeDna(t).tier.rank;
export const validStake = (t) => Number.isSafeInteger(t) && t >= 1 && t <= STAKE_WORKS;
/** Kode NFT hadiah staking (versi OS, 1/1): OS-ST-<nomor token>. */
export const stakeKode = (t) => `OS-ST-${t}`;

// ---------------------------------------------------------------- aturan hadiah (berlaku kelipatan)
/** NFT Classic per 1 AXTO yang dikunci, menurut lama kunci (bulan). */
export const STAKE_TERMS = { 3: 3, 6: 8, 12: 20 };
/** Bonus hanya bila dikunci 12 bulan penuh; jumlah koin dipecah dari kelipatan terbesar (10.000 → 1.000 → 100 → 10). */
export const STAKE_BONUS = [
  [10_000, { rare: 4000, epic: 1000, masterpiece: 500 }],
  [1_000, { rare: 400, epic: 100, masterpiece: 50 }],
  [100, { rare: 40 }],
  [10, { rare: 3 }],
];
/** Nama hadiah → rank tier DNA (engine/src/core.js TIERS). Legendary tidak dipakai sebagai hadiah. */
export const REWARD_TIERS = { classic: 0, rare: 1, epic: 2, masterpiece: 4 };
export const REWARD_NAMES = { classic: 'Classic', rare: 'Rare', epic: 'Epic', masterpiece: 'Masterpiece' };
export const STAKE_MIN_COINS = 1;

/** Hadiah untuk `coins` AXTO (dibulatkan ke bawah ke koin utuh) yang dikunci `months` bulan; null bila tidak sah. */
export function stakeRewards(coins, months) {
  const n = Math.floor(Number(coins));
  const per = STAKE_TERMS[Number(months)];
  if (!per || !Number.isSafeInteger(n) || n < STAKE_MIN_COINS) return null;
  const out = { classic: n * per, rare: 0, epic: 0, masterpiece: 0 };
  if (Number(months) === 12) {
    let rest = n;
    for (const [size, bonus] of STAKE_BONUS) {
      const k = Math.floor(rest / size);
      if (!k) continue;
      rest -= k * size;
      for (const [tier, v] of Object.entries(bonus)) out[tier] += v * k;
    }
  }
  return out;
}
export const rewardTotal = (r) => (r ? r.classic + r.rare + r.epic + r.masterpiece : 0);

// ---------------------------------------------------------------- stok acak per tier
const poolSalt = (tier) => `axto/stake/pool/${tier}/v1`;
/** Posisi p (0..STAKE_WORKS-1) di urutan acak tier → token. */
export const poolToken = (tier, p) => permute(p, STAKE_WORKS, poolSalt(tier)) + 1;

/**
 * Ambil `count` token bertier `tier` mulai posisi `from` di urutan acak tier itu. Mengembalikan posisi sesudahnya (`to`),
 * jumlah yang didapat (`got`, < count bila stok tier habis) dan — bila `collect` — daftar tokennya.
 */
export function scanPool(tier, from, count, { collect = false } = {}) {
  const rank = REWARD_TIERS[tier];
  if (rank === undefined) throw new Error(`tier hadiah tidak dikenal: ${tier}`);
  const ids = collect ? [] : null;
  let p = from;
  let got = 0;
  while (got < count && p < STAKE_WORKS) {
    const t = poolToken(tier, p);
    p += 1;
    if (stakeTier(t) === rank) {
      got += 1;
      if (ids) ids.push(t);
    }
  }
  return { to: p, got, ids };
}

/** Token di rentang posisi [from, to) milik satu staking, dengan halaman (offset, limit) atas token bertier itu. */
export function poolIds(tier, from, to, { offset = 0, limit = Infinity } = {}) {
  const rank = REWARD_TIERS[tier];
  const out = [];
  let seen = 0;
  for (let p = from; p < to && out.length < limit; p += 1) {
    const t = poolToken(tier, p);
    if (stakeTier(t) !== rank) continue;
    if (seen >= offset) out.push(t);
    seen += 1;
  }
  return out;
}

// ---------------------------------------------------------------- sisa hadiah → pasar OpenSea
/**
 * Pemilik, 24 Nov 2026: „Klo 10jt hadiah NFT staking tidak habis, langsung lepas ke pasar opensea, artinya otomatis bisa d
 * beli." Saat staking ditutup, token yang belum pernah diundikan bebas dijual. Token bertier T bebas bila posisinya di urutan
 * acak tier T ≥ kursor stok tier itu (`pools[T]`); Legendary tidak pernah menjadi hadiah sehingga selalu bebas.
 */
export function stakeFree(t, pools) {
  const rank = stakeTier(t);
  const tier = Object.keys(REWARD_TIERS).find((k) => REWARD_TIERS[k] === rank);
  if (!tier) return true;
  return unpermute(t - 1, STAKE_WORKS, poolSalt(tier)) >= Number(pools?.[tier] ?? 0);
}
/** Urutan etalase pasar untuk sisa hadiah staking. */
export const stakeShowcase = (i) => permute(i, STAKE_WORKS, 'axto/stake/showcase/v1') + 1;
/** Satu edisi, harga tetap menurut tier ($1–$250) — sama dengan koleksi 1/1. */
export function stakeEdition(t) {
  const s = stakeDesign(t);
  return edition(s.key, s.id);
}

// ---------------------------------------------------------------- metadata (OpenSea)
const TIER_NAME = Object.fromEntries(TIERS.map((t) => [t.rank, t.name]));

/** Metadata token hadiah staking: karya hidup versi OS, 1/1, tidak dijual. */
export function stakeMetadata(t, base = 'https://axto.io') {
  const s = stakeDesign(t);
  const m = metadata(s.key, s.id, base);
  const d = stakeDna(t);
  const nama = m.name.replace(/^(OS|AC)-\d+ · /, '');
  const drop = new Set(['Price (USD)', 'Edition Size', 'Collection', 'Gallery']);
  const attributes = m.attributes.filter((a) => !drop.has(a.trait_type));
  attributes.unshift({ trait_type: 'Gallery', value: 'AXTO Staking · 1/1' });
  attributes.push({ trait_type: 'Reward', value: 'AXTO coin staking' }, { display_type: 'number', trait_type: 'Edition Size', value: 1 });
  return {
    name: `${stakeKode(t)} · AXTO Staking — ${nama}`,
    description: `A one-of-one living artwork from the AXTO Staking gallery — the VVIP reward of the AXTO community coin. Not sold while staking is open: it is given to members who lock AXTO coin at axto.io, revealed the moment they stake and delivered gas-free when their term completes. Rarity: ${TIER_NAME[d.tier.rank]} · Edition 1/1.\n\nKarya hidup 1/1 dari galeri AXTO Staking — hadiah VVIP koin komunitas AXTO. Tidak dijual selama staking dibuka: diberikan kepada member yang mengunci koin AXTO di axto.io, tampil seketika saat staking dan dikirim tanpa biaya gas begitu masa kontraknya selesai.\n\n© AXTO (axto.io). The owner may display the artwork for personal and promotional use; copyright of the artwork remains with AXTO. Resale royalty 10%.`,
    image: `${base}/img/${STAKE_KEY}/${t}.svg`,
    animation_url: `${base}/play/${STAKE_KEY}/${t}`,
    external_url: `${base}/en/staking`,
    background_color: '0b0b10',
    attributes,
  };
}

/** Metadata koleksi (galeri OpenSea) — sekaligus promosi koin AXTO. */
export function stakeContractMetadata(base = 'https://axto.io') {
  return {
    name: 'AXTO Staking',
    description: `The VVIP gallery of the AXTO community coin. ${STAKE_WORKS.toLocaleString('en-US')} one-of-one living artworks — Qur'an and hadith calligraphy with unaltered text and stamps from imaginary realms, each a design that exists nowhere else — reserved for the members who stake AXTO coin at axto.io — not for sale while staking is open. Lock AXTO for 3, 6 or 12 months: your rewards are revealed the moment you stake and arrive in your wallet gas-free when your term completes. Every 1 AXTO earns 3, 8 or 20 Classic works, and a full year unlocks Rare, Epic and Masterpiece rewards. Staking is open throughout the presale, until all 20,000,000 presale coins are sold and AXTO is released to a DEX; rewards left unclaimed then are released to the OpenSea market. Begin from $1 at axto.io.\n\nGaleri VVIP koin komunitas AXTO: ${STAKE_WORKS.toLocaleString('id-ID')} karya hidup 1/1 — kaligrafi Al-Qur'an & hadits dengan teks asli dan prangko negeri imajiner, masing-masing desain yang tidak ada duanya — khusus bagi member yang men-staking koin AXTO di axto.io — tidak dijual selama staking dibuka. Kunci AXTO 3, 6 atau 12 bulan: hadiah Anda tampil seketika dan masuk ke wallet tanpa biaya gas saat kontrak selesai. Setiap 1 AXTO berbuah 3, 8 atau 20 karya Classic, dan satu tahun penuh membuka hadiah Rare, Epic dan Masterpiece. Staking dibuka selama presale, sampai 20.000.000 koin presale terjual habis dan AXTO dirilis ke DEX; hadiah yang tidak terpakai saat itu dilepas ke pasar OpenSea. Mulai dari $1 di axto.io.`,
    image: `${base}/logo-512.png`,
    banner_image: `${base}/og/${STAKE_KEY}.svg`,
    external_link: `${base}/en/staking`,
    seller_fee_basis_points: 1000,
    fee_recipient: '0xDC39C04E704b1fec2BE648c49c842B2B17AfEBDA',
  };
}

export { STAKE_SETS };
