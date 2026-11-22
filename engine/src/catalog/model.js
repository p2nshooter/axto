/**
 * Katalog MODEL — figur ilustrasi dengan potret model terdaftar (wajah + kerudung, latar dibuang).
 * Potret disimpan PRIVAT (repo coinaxto → R2 axto-data `model/<id>/<berkas>.webp`), tidak di repo publik ini.
 * Wajah hanya dirender bila izin tertulis model tercatat: engine/consent/<id>.json (granted: true) untuk produksi dan
 * MODEL_CONSENT di worker untuk tampilan. Tanpa izin → siluet netral.
 */
export const MODELS = [
  // id, nama tampilan, pose: [kunci, berkas, rasio w/h, pusat wajah x, dagu y]
  {
    id: 'luaja-1',
    name: 'Pemandu LUAJA',
    poses: [
      ['senyum', 'p1', 0.85, 0.5, 0.76],
      ['tenang', 'p2', 0.7611, 0.541, 0.76],
      ['berdiri', 'p3', 0.6125, 0.566, 0.76],
      ['ceria', 'p4', 0.9375, 0.511, 0.731],
      ['samping', 'p5', 0.5528, 0.551, 0.76],
    ],
  },
  {
    id: 'model-2',
    name: 'Model AXTO 2',
    poses: [
      ['kerudung-cokelat', 'p1', 0.7667, 0.42, 0.692],
      ['kerudung-putih', 'p2', 0.5278, 0.466, 0.76],
      ['senyum', 'p3', 0.65, 0.516, 0.76],
      ['miring', 'p4', 0.6625, 0.532, 0.747],
    ],
  },
];

/** Pose (gabungan model × pose) dibangun dari MODELS. */
export const POSES = MODELS.flatMap((m) => m.poses.map((p) => [`${m.id}:${p[0]}`, `${m.name} — ${p[0]}`, `${m.name} — ${p[0]}`, 0, m.id, p]));

export const SERIES = [
  ['education', 'Education', 'Pendidikan', 1], ['space', 'Space', 'Antariksa', 3], ['science', 'Science', 'Sains', 2],
  ['culture', 'Culture', 'Budaya', 1], ['sport', 'Sport', 'Olahraga', 1], ['profession', 'Professions', 'Profesi', 1],
  ['seasons', 'Seasons', 'Musim', 1], ['cities', 'World Cities', 'Kota Dunia', 2], ['worship', 'Worship', 'Ibadah', 2],
  ['adventure', 'Adventure', 'Petualangan', 2], ['ocean', 'Ocean', 'Samudra', 2], ['future', 'Future', 'Masa Depan', 3],
];
/** Busana: [id, EN, ID, poin, warna utama, warna aksen] */
export const OUTFITS = [
  ['school', 'School Uniform', 'Seragam Sekolah', 0, '#f4f4f4', '#2f5d9b'], ['astronaut', 'Astronaut Suit', 'Baju Astronaut', 3, '#e9edf3', '#e0632a'],
  ['lab', 'Lab Coat', 'Jas Lab', 1, '#ffffff', '#3aa0a0'], ['batik', 'Batik Dress', 'Busana Batik', 2, '#7a3b1e', '#e2b04a'],
  ['sport', 'Sportswear', 'Baju Olahraga', 0, '#1f6fd1', '#ffffff'], ['abaya', 'Abaya', 'Abaya', 1, '#1d1d24', '#c9a35a'],
  ['winter', 'Winter Coat', 'Mantel Musim Dingin', 1, '#9b2f3a', '#f0e6d8'], ['explorer', 'Explorer Gear', 'Perlengkapan Penjelajah', 2, '#6b7a3a', '#d9a441'],
  ['diver', 'Diving Suit', 'Baju Selam', 2, '#14394f', '#3ad1d1'], ['pilot', 'Pilot Jacket', 'Jaket Pilot', 2, '#5a3a22', '#e9d8b8'],
  ['doctor', 'Doctor Scrubs', 'Baju Dokter', 1, '#5fb0a8', '#ffffff'], ['royal', 'Royal Kebaya', 'Kebaya Agung', 3, '#4a1a5a', '#e8c46a'],
];
export const PROPS = [
  ['book', 'Book', 'Buku', 0], ['globe', 'Globe', 'Bola Dunia', 1], ['telescope', 'Telescope', 'Teleskop', 2], ['flag', 'Flag', 'Bendera', 1],
  ['tablet', 'Tablet', 'Tablet', 1], ['flower', 'Flower', 'Bunga', 0], ['lantern', 'Lantern', 'Lentera', 1], ['trophy', 'Trophy', 'Piala', 2],
  ['camera', 'Camera', 'Kamera', 1], ['rocket-model', 'Rocket Model', 'Model Roket', 3],
];
export const SCENES = [
  ['classroom', 'Classroom', 'Ruang Kelas', 0, '#f3ead8', '#c9b48a'], ['orbit', 'Earth Orbit', 'Orbit Bumi', 3, '#081633', '#000208'],
  ['lab', 'Laboratory', 'Laboratorium', 1, '#e6f3f3', '#9fc9c9'], ['garden', 'Garden', 'Taman', 0, '#dff2d8', '#8fc27a'],
  ['city-night', 'City Night', 'Kota Malam', 2, '#141a33', '#05070f'], ['beach', 'Beach', 'Pantai', 1, '#bfe9f7', '#f3dca0'],
  ['snow', 'Snowfield', 'Padang Salju', 1, '#eef4fb', '#c4d4e6'], ['mosque', 'Mosque Courtyard', 'Halaman Masjid', 2, '#f6eedb', '#d8c08a'],
  ['library', 'Library', 'Perpustakaan', 1, '#3a2614', '#140b04'], ['mars', 'Mars Base', 'Pangkalan Mars', 3, '#8a3a1e', '#2a0e06'],
  ['underwater', 'Underwater', 'Bawah Laut', 2, '#0d4a6a', '#02121e'], ['sunrise', 'Sunrise Hill', 'Bukit Fajar', 1, '#ffd29a', '#e2785a'],
];
export const ANIMS = [
  ['wave', 'Waving', 'Melambai', 0], ['read', 'Reading', 'Membaca', 0], ['float', 'Floating', 'Melayang', 2], ['walk', 'Walking', 'Berjalan', 1],
  ['sparkle', 'Sparkle', 'Berkilau', 1], ['spotlight', 'Spotlight', 'Sorot Cahaya', 2], ['parallax', 'Parallax', 'Parallax', 1], ['portal', 'Portal', 'Portal', 3],
];
export const PALETTE_SHIFT = Array.from({ length: 12 }, (_, i) => [`hue${i * 30}`, `Hue ${i * 30}°`, `Rona ${i * 30}°`, i % 4 === 0 ? 1 : 0, i * 30]);

export const SPACE = [POSES, SERIES, OUTFITS, PROPS, SCENES, ANIMS, PALETTE_SHIFT];
