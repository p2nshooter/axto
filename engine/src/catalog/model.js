/**
 * Katalog MODEL v2 (perintah pemilik #33): figur ilustrasi 2D bergerak gaya pemandu luaja.com — hanya wajah + kerudung
 * yang berasal dari foto; busana, tangan, properti, latar dan gerak digambar ulang per seri.
 * Potret disimpan PRIVAT (R2 axto-nft-data `model/<id>/<berkas>-s.webp`), tidak di repo publik ini. Wajah hanya dirender
 * bila izin tercatat: engine/consent/<id>.json (produksi) dan MODEL_CONSENT di worker (tampilan). Tanpa izin → kepala
 * ilustrasi netral.
 */
export const MODELS = [
  // id, nama tampilan, pose: [kunci, berkas, rasio w/h, pusat wajah x, dagu y, warna kerudung]
  {
    id: 'luaja-1',
    name: 'Pemandu LUAJA',
    poses: [
      ['senyum', 'p1', 0.85, 0.5, 0.76, '#f2f0ea'],
      ['tenang', 'p2', 0.7611, 0.541, 0.76, '#f2f0ea'],
      ['berdiri', 'p3', 0.6125, 0.566, 0.76, '#f2f0ea'],
      ['ceria', 'p4', 0.9375, 0.511, 0.731, '#f2f0ea'],
      ['samping', 'p5', 0.5528, 0.551, 0.76, '#f2f0ea'],
    ],
  },
  {
    id: 'model-2',
    name: 'Model AXTO 2',
    poses: [
      ['kerudung-cokelat', 'p1', 0.7667, 0.42, 0.692, '#3e2a22'],
      ['kerudung-putih', 'p2', 0.5278, 0.466, 0.76, '#f3f0e8'],
      ['senyum', 'p3', 0.65, 0.516, 0.76, '#f3f0e8'],
      ['miring', 'p4', 0.6625, 0.532, 0.747, '#f3f0e8'],
    ],
  },
];

/** Pose (gabungan model × pose) dibangun dari MODELS: [kunci, EN, ID, poin, modelId, pose]. */
export const POSES = MODELS.flatMap((m) => m.poses.map((p) => [`${m.id}:${p[0]}`, `${m.name} — ${p[0]}`, `${m.name} — ${p[0]}`, 0, m.id, p]));

/*
 * Seri: [id, EN, ID, poin, busana[4], properti[4], latar[3]]
 *  busana: [id, EN, ID, gaya, utama, bayang, list, aksen]   gaya = bentuk detail busana di renderer
 *  properti: [id, EN, ID]
 *  latar: [id, EN, ID, langit atas, langit bawah, tanah, efek]
 */
export const SERIES = [
  ['education', 'Education', 'Pendidikan', 0,
    [['school', 'School Uniform', 'Seragam Sekolah', 'uniform', '#f4f6fa', '#cfd6e2', '#2f5d9b', '#c0392b'],
      ['graduate', 'Graduation Gown', 'Toga Wisuda', 'gown', '#1b2440', '#0e1428', '#d4af37', '#f5f5f5'],
      ['cardigan', 'Study Cardigan', 'Kardigan Belajar', 'coat', '#e8b4bf', '#c98e9c', '#2c3a73', '#f6ecd8'],
      ['blazer', 'Academy Blazer', 'Blazer Akademi', 'blazer', '#13306a', '#0b1f4d', '#f5b301', '#ffd766']],
    [['book', 'Book', 'Buku'], ['globe', 'Globe', 'Bola Dunia'], ['notebook', 'Pencil & Notebook', 'Pensil & Buku Catatan'], ['diploma', 'Diploma', 'Ijazah']],
    [['classroom', 'Classroom', 'Ruang Kelas', '#efe3c8', '#e2d1ac', '#a97c4f', 'chalk'],
      ['library', 'Library', 'Perpustakaan', '#3a2614', '#22150a', '#5a3a22', 'motes'],
      ['schoolyard', 'Schoolyard', 'Halaman Sekolah', '#6fb0ea', '#dff0fb', '#7fb069', 'clouds']]],
  ['space', 'Space', 'Antariksa', 3,
    [['astro-white', 'Astronaut Suit', 'Baju Astronaut', 'astro', '#eef1f5', '#c3cad6', '#e0632a', '#2f6fd1'],
      ['astro-navy', 'Deep-Space Suit', 'Baju Antariksa Dalam', 'astro', '#1e2a4a', '#111a33', '#d4af37', '#7fb3ff'],
      ['flight', 'Flight Suit', 'Baju Terbang', 'pilot', '#3a5a40', '#26402c', '#e9c46a', '#f1f1f1'],
      ['star-robe', 'Star Robe', 'Jubah Bintang', 'robe', '#241a52', '#150f33', '#f2cf6b', '#9be3ff']],
    [['telescope', 'Telescope', 'Teleskop'], ['rocket', 'Rocket Model', 'Model Roket'], ['planet', 'Ringed Planet', 'Planet Bercincin'], ['starmap', 'Star Map', 'Peta Bintang']],
    [['orbit', 'Earth Orbit', 'Orbit Bumi', '#050b24', '#0d1f4d', '#2a6fd1', 'stars'],
      ['moon', 'Moon Surface', 'Permukaan Bulan', '#02040c', '#0b1430', '#b9bcc6', 'stars'],
      ['mars', 'Mars Base', 'Pangkalan Mars', '#5a1e10', '#c4562a', '#a8401c', 'dust']]],
  ['science', 'Science', 'Sains', 2,
    [['labcoat', 'Lab Coat', 'Jas Lab', 'labcoat', '#ffffff', '#d9e2ea', '#3aa0a0', '#2c3a73'],
      ['labcoat-blue', 'Research Coat', 'Jas Peneliti', 'labcoat', '#f4f8ff', '#cfdcef', '#2f6fd1', '#7a3b8f'],
      ['field', 'Field Scientist', 'Ilmuwan Lapangan', 'vest', '#6b7a3a', '#4e5a28', '#d9a441', '#efe6cf'],
      ['engineer', 'Engineer Overall', 'Baju Insinyur', 'uniform', '#f0a020', '#c07a10', '#1b2a4a', '#ffffff']],
    [['flask', 'Flask', 'Labu Kimia'], ['microscope', 'Microscope', 'Mikroskop'], ['atom', 'Atom Model', 'Model Atom'], ['tablet', 'Tablet', 'Tablet']],
    [['laboratory', 'Laboratory', 'Laboratorium', '#e6f3f3', '#c4dede', '#8fb7b7', 'bubbles'],
      ['observatory', 'Observatory', 'Observatorium', '#060b20', '#172a5c', '#2b3550', 'stars'],
      ['greenhouse', 'Greenhouse', 'Rumah Kaca', '#dff2d8', '#b6dca6', '#5b8f45', 'motes']]],
  ['culture', 'Culture', 'Budaya', 1,
    [['batik', 'Batik Dress', 'Busana Batik', 'batik', '#7a3b1e', '#5a2a14', '#e2b04a', '#f5e6c8'],
      ['kebaya', 'Kebaya', 'Kebaya', 'kebaya', '#f3e4d0', '#d9c3a6', '#b8860b', '#8a1c2b'],
      ['songket', 'Songket', 'Songket', 'batik', '#5a0f2e', '#3d0a1f', '#e8c46a', '#f6dfa0'],
      ['tenun', 'Woven Ikat', 'Tenun Ikat', 'batik', '#1f3d5a', '#142a40', '#e07a3a', '#f3e1c0']],
    [['fan', 'Hand Fan', 'Kipas'], ['flowers', 'Flower Bouquet', 'Buket Bunga'], ['lantern', 'Lantern', 'Lentera'], ['kite', 'Kite', 'Layang-layang']],
    [['pendopo', 'Pavilion', 'Pendopo', '#f6e6c4', '#e9cf98', '#8a5a2b', 'lanterns'],
      ['terrace', 'Rice Terrace', 'Sawah Terasering', '#9fd3f0', '#e8f6fd', '#6aa84f', 'clouds'],
      ['festival', 'Night Festival', 'Festival Malam', '#140c2e', '#3a1f55', '#2a1a3a', 'fireflies']]],
  ['sport', 'Sport', 'Olahraga', 1,
    [['sportswear', 'Sportswear', 'Baju Olahraga', 'sport', '#1f6fd1', '#1653a0', '#ffffff', '#ffd166'],
      ['tracksuit', 'Track Suit', 'Baju Lari', 'sport', '#c0392b', '#902a20', '#ffffff', '#1b2a4a'],
      ['football', 'Football Kit', 'Kostum Sepak Bola', 'sport', '#1e8a4a', '#146436', '#ffffff', '#f5b301'],
      ['badminton', 'Badminton Kit', 'Kostum Bulu Tangkis', 'sport', '#f4f6fa', '#cfd6e2', '#d4243a', '#1f3d8a']],
    [['ball', 'Ball', 'Bola'], ['racket', 'Racket', 'Raket'], ['trophy', 'Trophy', 'Piala'], ['medal', 'Medal', 'Medali']],
    [['stadium', 'Stadium', 'Stadion', '#0d1838', '#26407a', '#2e7d32', 'confetti'],
      ['track', 'Running Track', 'Lintasan Lari', '#7cc0ef', '#e6f4fc', '#c0532f', 'clouds'],
      ['court', 'Indoor Court', 'Lapangan Indoor', '#e8dcc8', '#d4c3a6', '#3f7d58', 'confetti']]],
  ['profession', 'Professions', 'Profesi', 1,
    [['doctor', 'Doctor Scrubs', 'Baju Dokter', 'scrubs', '#5fb0a8', '#43877f', '#ffffff', '#2c3a73'],
      ['pilot', 'Pilot Uniform', 'Seragam Pilot', 'pilot', '#1b2440', '#0e1428', '#d4af37', '#ffffff'],
      ['chef', 'Chef Coat', 'Baju Koki', 'chef', '#ffffff', '#dde3ea', '#1b2a4a', '#c0392b'],
      ['architect', 'Architect Vest', 'Rompi Arsitek', 'vest', '#f0a020', '#c07a10', '#e8e8e8', '#2c3a73']],
    [['stethoscope', 'Stethoscope', 'Stetoskop'], ['plane', 'Aircraft Model', 'Model Pesawat'], ['whisk', 'Whisk & Bowl', 'Pengocok & Mangkuk'], ['blueprint', 'Blueprint', 'Cetak Biru']],
    [['hospital', 'Hospital', 'Rumah Sakit', '#e9f3f7', '#cfe3ea', '#9fb8c2', 'heartbeat'],
      ['airport', 'Airport', 'Bandara', '#7cc0ef', '#e6f4fc', '#7d8590', 'plane'],
      ['studio', 'Studio', 'Studio', '#20202c', '#3a3a4e', '#2a2a36', 'sparkles']]],
  ['seasons', 'Seasons', 'Musim', 1,
    [['spring', 'Spring Cardigan', 'Kardigan Musim Semi', 'coat', '#e8b4bf', '#c98e9c', '#2c3a73', '#f7b6c8'],
      ['autumn', 'Autumn Trench', 'Mantel Musim Gugur', 'trench', '#c9955a', '#9a6a36', '#7a5f3d', '#e0a63a'],
      ['winter', 'Winter Coat', 'Mantel Musim Dingin', 'coat', '#2f5d50', '#1d3f36', '#c0392b', '#e8d5c0'],
      ['summer', 'Summer Dress', 'Gaun Musim Panas', 'robe', '#f2c94c', '#c9a030', '#2f80c0', '#ffffff']],
    [['umbrella', 'Umbrella', 'Payung'], ['flowers', 'Flower Bouquet', 'Buket Bunga'], ['cocoa', 'Cocoa Cup', 'Cangkir Cokelat'], ['leaf', 'Maple Leaf', 'Daun Maple']],
    [['sakura', 'Sakura Garden', 'Taman Sakura', '#f4cfdc', '#fff7f9', '#efe4e3', 'petals'],
      ['autumn-park', 'Autumn Park', 'Taman Musim Gugur', '#e9b97e', '#fbf0dd', '#d9b98a', 'leaves'],
      ['snowfield', 'Snowfield', 'Padang Salju', '#a9b8d0', '#f1f4f9', '#f4f7fb', 'snow']]],
  ['cities', 'World Cities', 'Kota Dunia', 2,
    [['camel', 'Camel Coat', 'Mantel Unta', 'trench', '#c9955a', '#9a6a36', '#1b2a4a', '#e0a63a'],
      ['navy', 'Travel Coat', 'Mantel Perjalanan', 'coat', '#23407a', '#162a56', '#e8d5c0', '#d9c3a0'],
      ['denim', 'City Jacket', 'Jaket Kota', 'blazer', '#3d5a80', '#2a4060', '#e0fbfc', '#ee6c4d'],
      ['scarf-coat', 'Scarf Coat', 'Mantel Syal', 'coat', '#7a2e3a', '#5a1f28', '#f2c94c', '#f6ecd8']],
    [['map', 'City Map', 'Peta Kota'], ['camera', 'Camera', 'Kamera'], ['coffee', 'Coffee Cup', 'Cangkir Kopi'], ['books', 'Tote of Books', 'Tas Buku']],
    [['city-night', 'City Night', 'Kota Malam', '#050b24', '#1b2a5c', '#0a0e1e', 'windows'],
      ['riverside', 'Riverside Sunset', 'Senja Tepi Sungai', '#3b2a6e', '#fbc46a', '#241a36', 'birds'],
      ['rain-street', 'Rainy Street', 'Jalan Hujan', '#4e5b6e', '#a9b4c0', '#3a4452', 'rain']]],
  ['worship', 'Worship', 'Ibadah', 2,
    [['abaya', 'Abaya', 'Abaya', 'robe', '#1d1d24', '#101016', '#c9a35a', '#f5e6c8'],
      ['gamis', 'Gamis', 'Gamis', 'robe', '#2f5d50', '#1d3f36', '#e8d5c0', '#f2cf6b'],
      ['white-robe', 'White Robe', 'Jubah Putih', 'robe', '#f6f3ec', '#d8d2c4', '#c9a35a', '#2f5d50'],
      ['royal', 'Embroidered Robe', 'Jubah Bersulam', 'kebaya', '#4a1a5a', '#2e0f3a', '#e8c46a', '#f6dfa0']],
    [['quran', 'Mushaf', 'Mushaf'], ['tasbih', 'Prayer Beads', 'Tasbih'], ['lantern', 'Lantern', 'Lentera'], ['dates', 'Dates Bowl', 'Mangkuk Kurma']],
    [['mosque', 'Mosque Courtyard', 'Halaman Masjid', '#f6eedb', '#e8d9b0', '#d8c08a', 'lanterns'],
      ['ramadan', 'Ramadan Night', 'Malam Ramadan', '#050b24', '#1a2a5e', '#121a36', 'stars'],
      ['dawn', 'Dawn Prayer', 'Subuh', '#2a2f6b', '#f3b98a', '#3a2a4e', 'clouds']]],
  ['adventure', 'Adventure', 'Petualangan', 2,
    [['explorer', 'Explorer Gear', 'Perlengkapan Penjelajah', 'vest', '#6b7a3a', '#4e5a28', '#d9a441', '#efe6cf'],
      ['hiker', 'Hiking Jacket', 'Jaket Mendaki', 'coat', '#c0392b', '#902a20', '#1b2a4a', '#f2c94c'],
      ['safari', 'Safari Vest', 'Rompi Safari', 'vest', '#c8b27a', '#a08a56', '#5a3a22', '#f6ecd8'],
      ['poncho', 'Rain Poncho', 'Ponco Hujan', 'robe', '#f2c94c', '#c9a030', '#1b2a4a', '#ffffff']],
    [['compass', 'Compass', 'Kompas'], ['map', 'Treasure Map', 'Peta Harta'], ['flag', 'Summit Flag', 'Bendera Puncak'], ['binoculars', 'Binoculars', 'Teropong']],
    [['mountain', 'Mountain Peak', 'Puncak Gunung', '#7cc0ef', '#e6f4fc', '#6d7f9b', 'clouds'],
      ['jungle', 'Jungle', 'Hutan Tropis', '#0f3a22', '#2e6b3f', '#1d4a2a', 'fireflies'],
      ['desert', 'Desert Dunes', 'Gurun Pasir', '#f6c27a', '#fde7c0', '#e0a85a', 'dust']]],
  ['ocean', 'Ocean', 'Samudra', 2,
    [['diver', 'Diving Suit', 'Baju Selam', 'diver', '#14394f', '#0c2636', '#3ad1d1', '#f2c94c'],
      ['sailor', 'Sailor Uniform', 'Seragam Pelaut', 'sailor', '#ffffff', '#d9e2ea', '#1f3d8a', '#c0392b'],
      ['marine', 'Marine Biologist', 'Ahli Biologi Laut', 'labcoat', '#e6f6f7', '#c2dfe2', '#1a8a9a', '#f2994a'],
      ['surf', 'Surf Wear', 'Baju Selancar', 'sport', '#ff6b6b', '#d04a4a', '#ffffff', '#3ad1d1']],
    [['shell', 'Seashell', 'Kerang'], ['fishjar', 'Fish Jar', 'Toples Ikan'], ['coral', 'Coral', 'Karang'], ['binoculars', 'Binoculars', 'Teropong']],
    [['underwater', 'Underwater', 'Bawah Laut', '#0d4a6a', '#02121e', '#c2a878', 'bubbles'],
      ['beach', 'Beach', 'Pantai', '#7cc8ef', '#e8f7fd', '#f3dca0', 'waves'],
      ['reef', 'Coral Reef', 'Terumbu Karang', '#1a7a9a', '#063a52', '#e07a5a', 'bubbles']]],
  ['future', 'Future', 'Masa Depan', 3,
    [['neon', 'Neon Suit', 'Baju Neon', 'neon', '#141a33', '#0a0e1e', '#5fd3ff', '#ff4fd8'],
      ['holo-cape', 'Hologram Cape', 'Jubah Hologram', 'robe', '#2a1f5a', '#18113a', '#7cf3ff', '#c6a7ff'],
      ['cyber', 'Cyber Jacket', 'Jaket Siber', 'blazer', '#1b1f2a', '#0e1118', '#39ff9f', '#5fd3ff'],
      ['solar', 'Solar Suit', 'Baju Surya', 'astro', '#f4f6fa', '#cfd6e2', '#f2c94c', '#ff8a3a']],
    [['holotab', 'Hologram Tablet', 'Tablet Hologram'], ['drone', 'Drone', 'Drone'], ['orb', 'Energy Orb', 'Bola Energi'], ['robot', 'Robot Buddy', 'Robot Kawan']],
    [['neon-city', 'Neon City', 'Kota Neon', '#0a0420', '#2a0e52', '#140a2e', 'grid'],
      ['sky-city', 'Sky City', 'Kota Langit', '#8fd3ff', '#f0faff', '#c6e8ff', 'clouds'],
      ['holo-lab', 'Hologram Lab', 'Lab Hologram', '#061226', '#0e2a4a', '#0a1a30', 'rings']]],
];

const idx = (n, pts, prefix, en, id) => Array.from({ length: n }, (_, i) => [`${prefix}-${i + 1}`, `${en} ${i + 1}`, `${id} ${i + 1}`, pts[i], i]);
/** Indeks busana/properti/latar di dalam seri (nama sebenarnya dari seri, lihat modelTraits). */
export const LOOK = idx(4, [0, 1, 1, 2], 'look', 'Look', 'Busana');
export const PROP = idx(4, [0, 1, 1, 2], 'prop', 'Prop', 'Properti');
export const SETTING = idx(3, [0, 1, 2], 'set', 'Setting', 'Latar');
/** Cahaya/suasana: [id, EN, ID, poin] */
export const LIGHT = [
  ['pagi', 'Morning', 'Pagi', 0], ['siang', 'Daylight', 'Siang', 0], ['senja', 'Dusk', 'Senja', 1],
  ['malam', 'Night', 'Malam', 2], ['emas', 'Golden Hour', 'Jam Emas', 1], ['aurora', 'Aurora', 'Aurora', 3],
];
/** Gerak badan */
export const MOTION = [
  ['wave', 'Waving', 'Melambai', 0], ['read', 'Reading', 'Membaca', 0], ['cheer', 'Cheering', 'Bersorak', 1],
  ['float', 'Floating', 'Melayang', 2], ['sway', 'Swaying', 'Bergoyang', 0], ['shine', 'Shining', 'Bersinar', 2],
];
export const ACCESSORY = [
  ['none', 'None', 'Tanpa', 0], ['backpack', 'Backpack', 'Ransel', 1], ['scarf', 'Scarf', 'Syal', 1],
  ['headphones', 'Headphones', 'Headphone', 2], ['satchel', 'Satchel', 'Tas Selempang', 1],
];
/** Palet list/aksen: null = warna asli busana. */
export const PALETTE = [
  ['classic', 'Classic', 'Klasik', 0, null], ['ruby', 'Ruby', 'Merah Delima', 1, '#c0392b'], ['sapphire', 'Sapphire', 'Safir', 1, '#2f6fd1'],
  ['emerald', 'Emerald', 'Zamrud', 1, '#1e8a4a'], ['amber', 'Amber', 'Kuning Ambar', 1, '#f0a020'], ['violet', 'Violet', 'Ungu', 1, '#7a3b8f'],
  ['rose', 'Rose', 'Merah Muda', 1, '#e06a8a'], ['gold', 'Gold', 'Emas', 2, '#d4af37'],
  // #47 (4 × 10 jt): palet tambahan agar ruang kombinasi ≥ 10 jt
  ['teal', 'Teal', 'Hijau Toska', 1, '#178a8a'], ['coral', 'Coral', 'Koral', 1, '#ff6f61'], ['navy', 'Navy', 'Biru Dongker', 1, '#1f3b73'],
];

export const SPACE = [POSES, SERIES, LOOK, PROP, SETTING, LIGHT, MOTION, ACCESSORY, PALETTE];

/** Unsur nyata satu karya: busana/properti/latar dari seri yang terpilih. */
export function modelParts(d) {
  const [pose, series, look, prop, setting, light, motion, acc, pal] = d.pick;
  return { pose, series, look: series[4][look[4]], prop: series[5][prop[4]], setting: series[6][setting[4]], light, motion, acc, pal };
}

/** Nilai sifat (EN) untuk metadata, urut sesuai nama sifat. */
export function modelTraits(d) {
  const p = modelParts(d);
  return [p.pose[1], p.series[1], p.look[1], p.prop[1], p.setting[1], p.light[1], p.motion[1], p.acc[1], p.pal[1]];
}
