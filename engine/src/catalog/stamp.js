/**
 * Katalog STAMP — prangko dari negeri/semesta imajiner (bukan negara/lambang nyata).
 */
export const REALMS = [
  'Republic of Aurelia', 'Kepulauan Nirwana', 'Orbital Union', 'Kingdom of Solmara', 'Free State of Veridia',
  'Lunar Commonwealth', 'Archipelago of Tirta', 'Federation of Kalingga', 'Duchy of Ambergris', 'Empire of Zephyra',
  'Nusa Cahaya', 'Martian Concord', 'Principality of Lumen', 'Union of Azure Isles', 'Sultanate of Nur', 'Celestia',
  'Republic of Borealis', 'Tanah Sejahtera', 'Coral Provinces', 'Highlands of Kaira', 'Free City of Meridian',
  'Andromeda Outpost', 'Saturnine Republic', 'Kingdom of Elara', 'Delta of Saraswati', 'Isles of Mirage',
  'Republic of Terraverde', 'Jovian Assembly', 'Grand Duchy of Selene', 'Bumi Lestari', 'Commonwealth of Arcadia',
  'Nebula Free Port', 'Kingdom of Ardent', 'Valley of Seroja', 'Republic of Ionia', 'Sunda Raya', 'Polaris Station',
  'Emerald Coast', 'Cloud Kingdom of Awan', 'Republic of Cascadia', 'Dominion of Orion', 'Bayu Archipelago',
  'Crystal Plateau', 'Free State of Halcyon', 'Velorian Isles', 'Kingdom of Mahameru', 'Titan Colony', 'Rinjani Federation',
  'Republic of Lyra', 'Garnet Sultanate', 'Pacifica Union', 'Aurora Isles', 'Kingdom of Teratai', 'Vega Outpost',
  'Dewata Commonwealth', 'Republic of Equinox', 'Coralline States', 'Europa Settlement', 'Kingdom of Zamrud',
  'Silverleaf Union', 'Ganymede Republic', 'Pelangi Isles', 'Obsidian Coast', 'Republic of Kenari',
].map((name, i) => [`realm-${i}`, name, name, i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0]);

/** Seri: [id, EN, ID, poin, subjek[]] — subjek digambar prosedural oleh renderer (lihat render/stamp.js). */
export const SERIES = [
  ['space', 'Space Exploration', 'Antariksa', 2, ['ringed-planet', 'rocket', 'astronaut', 'moon', 'comet', 'galaxy', 'satellite', 'sun']],
  ['flora', 'Flora', 'Flora', 1, ['lotus', 'orchid', 'sunflower', 'rose', 'fern', 'cactus', 'tulip', 'bamboo']],
  ['fauna', 'Fauna', 'Fauna', 2, ['butterfly', 'bird', 'fish', 'turtle', 'whale', 'deer', 'owl', 'cat']],
  ['culture', 'Culture', 'Kebudayaan', 1, ['batik', 'kite', 'drum', 'mask', 'boat', 'lantern', 'pottery', 'weave']],
  ['education', 'Education', 'Pendidikan', 1, ['book', 'pencil', 'globe', 'graduation', 'abacus', 'microscope', 'library', 'chalkboard']],
  ['architecture', 'Architecture & Mosques', 'Arsitektur & Masjid', 2, ['mosque', 'minaret', 'bridge', 'tower', 'temple-gate', 'lighthouse', 'dome', 'arch']],
  ['technology', 'Technology', 'Teknologi', 1, ['chip', 'robot', 'drone', 'antenna', 'battery', 'solar', 'circuit', 'vr']],
  ['ai', 'Artificial Intelligence', 'Kecerdasan Buatan', 2, ['neural', 'robot', 'chip', 'eye', 'brain', 'circuit', 'data', 'spark']],
  ['ocean', 'Ocean Life', 'Kehidupan Laut', 2, ['whale', 'coral', 'fish', 'jellyfish', 'turtle', 'shell', 'wave', 'seahorse']],
  ['transport', 'Transport', 'Transportasi', 1, ['train', 'airship', 'boat', 'plane', 'bicycle', 'balloon', 'tram', 'ship']],
  ['sport', 'Sport', 'Olahraga', 0, ['ball', 'racket', 'trophy', 'bicycle', 'medal', 'shuttle', 'kite', 'sail']],
  ['music', 'Traditional Music', 'Musik Tradisional', 1, ['drum', 'angklung', 'flute', 'gong', 'lute', 'harp', 'bell', 'kecapi']],
  ['science', 'Science', 'Sains', 1, ['atom', 'dna', 'telescope', 'magnet', 'prism', 'flask', 'crystal', 'microscope']],
  ['cities', 'World Cities', 'Kota Dunia', 1, ['skyline', 'bridge', 'tower', 'tram', 'dome', 'lighthouse', 'clock-tower', 'harbor']],
  ['nature', 'Natural Wonders', 'Keajaiban Alam', 2, ['volcano', 'waterfall', 'mountain', 'aurora', 'canyon', 'rainbow', 'island', 'desert']],
  ['tomorrow', 'World of Tomorrow', 'Dunia Esok', 3, ['floating-city', 'hyperloop', 'mars-base', 'vertical-farm', 'robot', 'airship', 'solar', 'neural']],
];

/** Bingkai: [id, EN, ID, poin] */
export const FRAMES = [
  ['classic', 'Classic Perforated', 'Perforasi Klasik', 0],
  ['souvenir', 'Souvenir Sheet', 'Souvenir Sheet', 2],
  ['triangle', 'Triangle', 'Segitiga', 3],
  ['diamond', 'Diamond', 'Wajik', 2],
  ['round', 'Round', 'Bulat', 2],
  ['hex', 'Hexagon', 'Heksagon', 3],
  ['airmail', 'Airmail', 'Pos Udara', 1],
  ['setenant', 'Se-tenant Pair', 'Pasangan Se-tenant', 2],
  ['miniature', 'Miniature', 'Miniatur', 1],
  ['booklet', 'Booklet Pane', 'Lembar Buklet', 1],
];

/** Palet cetak: [id, EN, ID, poin, kertas, tinta, aksen1, aksen2] */
export const PALETTES = [
  ['vermilion', 'Vermilion', 'Merah Sinabar', 0, '#f7ecd9', '#c62a24', '#f0b84a', '#1d3557'],
  ['emerald', 'Emerald', 'Zamrud', 0, '#eef4e6', '#1f6b45', '#d9b54a', '#0f2a1d'],
  ['sepia', 'Sepia', 'Sepia', 1, '#f1e4c9', '#6b4a2b', '#b8863b', '#3a2714'],
  ['ultramarine', 'Ultramarine', 'Ultramarin', 0, '#eaf0fb', '#1e3a8a', '#e0a93a', '#0b1640'],
  ['violet', 'Royal Violet', 'Ungu Kerajaan', 1, '#f2ecf8', '#5b2a86', '#e6b84d', '#22103a'],
  ['teal', 'Teal & Coral', 'Toska & Koral', 1, '#eaf6f4', '#0f6e6a', '#f26b5b', '#0a2b2a'],
  ['night', 'Night Print', 'Cetak Malam', 2, '#0d1424', '#e9e4d4', '#e0b440', '#3a7bd5'],
  ['gold', 'Gold Foil', 'Foil Emas', 3, '#1b1408', '#f2cf6b', '#fff0b0', '#8a6516'],
  ['pastel', 'Pastel Pop', 'Pastel Ceria', 1, '#fff4f1', '#e2557b', '#4fb3bf', '#ffd166'],
  ['olive', 'Olive', 'Zaitun', 0, '#f0eedb', '#5d6b2a', '#c9772f', '#2b3010'],
  ['indigo-batik', 'Indigo Batik', 'Batik Indigo', 2, '#f3efe6', '#1f2a5a', '#a8492f', '#e2c06b'],
  ['aurora', 'Aurora Ink', 'Tinta Aurora', 3, '#07131c', '#7ef0c3', '#c18cff', '#3fb6ff'],
];

/** Mode: [id, EN, ID, poin] — premium-zoom hanya diaktifkan renderer untuk tier Legendary/Masterpiece. */
export const MODES = [
  ['static', 'Static', 'Statis', 0],
  ['animated', 'Animated', 'Bergerak', 2],
  ['animated-night', 'Animated Night', 'Bergerak Malam', 3],
];

/** Tahun terbit 1996..2035 (40 opsi), nominal 12 opsi. */
export const YEARS = Array.from({ length: 40 }, (_, i) => [`y${1996 + i}`, String(1996 + i), String(1996 + i), 0, 1996 + i]);
export const DENOMS = ['1', '2', '5', '10', '15', '20', '25', '50', '75', '100', '250', '500'].map((d, i) => [`d${d}`, d, d, i > 9 ? 1 : 0, d]);

/** Subjek dipilih per seri dengan indeks 0..7 → sifat sendiri. */
export const SUBJECT_IDX = Array.from({ length: 8 }, (_, i) => [`s${i}`, String(i), String(i), 0, i]);

export const SPACE = [REALMS, SERIES, SUBJECT_IDX, FRAMES, PALETTES, MODES, YEARS, DENOMS];
