/**
 * Katalog TIME — jam digital hidup dalam semua bentuk. Tiap sifat: [id, label EN, label ID, poin keunikan].
 * Ruang kombinasi = hasil kali jumlah opsi (lihat SPACE) dan harus > max koleksi.
 */
export const FORMS = [
  // kategori, bentuk siluet render
  ['wrist-round', 'Round Wristwatch', 'Jam Tangan Bulat', 0, 'wrist', 'circle'],
  ['wrist-square', 'Square Wristwatch', 'Jam Tangan Kotak', 0, 'wrist', 'square'],
  ['wrist-tonneau', 'Tonneau Wristwatch', 'Jam Tangan Tonneau', 1, 'wrist', 'tonneau'],
  ['wrist-band', 'Screen Bangle', 'Gelang Layar', 1, 'wrist', 'band'],
  ['ring', 'Clock Ring', 'Cincin Jam', 2, 'wrist', 'ring'],
  ['pendant', 'Pendant', 'Liontin', 1, 'body', 'drop'],
  ['earring', 'Earring Pair', 'Sepasang Anting', 2, 'body', 'twin'],
  ['brooch', 'Brooch', 'Bros', 1, 'body', 'octagon'],
  ['hud-glasses', 'HUD Glasses', 'Kacamata HUD', 2, 'body', 'glasses'],
  ['bag-charm', 'Bag Charm', 'Charm Tas', 0, 'bag', 'tag'],
  ['luggage-tag', 'Luggage Tag', 'Tag Koper', 0, 'bag', 'tag'],
  ['keychain', 'Keychain', 'Gantungan Kunci', 0, 'bag', 'drop'],
  ['wallet', 'Smart Wallet', 'Dompet Pintar', 1, 'bag', 'wide'],
  ['jacket-patch', 'Jacket Patch', 'Patch Jaket', 0, 'apparel', 'shield'],
  ['back-panel', 'Back Panel', 'Panel Punggung', 1, 'apparel', 'wide'],
  ['tee-chest', 'T-Shirt Chest', 'Dada Kaos', 0, 'apparel', 'square'],
  ['collar', 'Collar', 'Kerah', 1, 'apparel', 'band'],
  ['shoe-tongue', 'Shoe Tongue', 'Lidah Sepatu', 1, 'apparel', 'shield'],
  ['wall', 'Wall Clock', 'Jam Dinding', 0, 'home', 'circle'],
  ['desk', 'Desk Clock', 'Jam Meja', 0, 'home', 'wide'],
  ['alarm', 'Alarm Clock', 'Jam Weker', 0, 'home', 'alarm'],
  ['photo-frame', 'Photo Frame', 'Bingkai Foto', 1, 'home', 'square'],
  ['floor', 'Floor Clock', 'Jam Lantai', 2, 'home', 'tall'],
  ['neon', 'Neon Sign', 'Papan Neon', 1, 'home', 'wide'],
  ['car-dash', 'Car Dashboard', 'Dasbor Mobil', 1, 'vehicle', 'wide'],
  ['moto-panel', 'Motorcycle Panel', 'Panel Motor', 1, 'vehicle', 'shield'],
  ['helmet-visor', 'Helmet Visor', 'Visor Helm', 2, 'vehicle', 'glasses'],
  ['tower', 'Clock Tower', 'Jam Menara', 3, 'public', 'tall'],
  ['flip-board', 'Station Flip Board', 'Papan Flip Stasiun', 2, 'public', 'wide'],
  ['billboard', 'Billboard', 'Billboard', 2, 'public', 'wide'],
  ['avatar-skin', 'Avatar Skin', 'Skin Avatar', 2, 'digital', 'drop'],
  ['metaverse-orb', 'Metaverse Orb', 'Orb Metaverse', 3, 'digital', 'circle'],
  ['dna-polar', 'Novel Form: Polar Bloom', 'Bentuk Baru: Mekar Polar', 4, 'novel', 'polar'],
  ['dna-star', 'Novel Form: Star Core', 'Bentuk Baru: Inti Bintang', 4, 'novel', 'star'],
  ['dna-hex', 'Novel Form: Hex Hive', 'Bentuk Baru: Sarang Heksa', 3, 'novel', 'hex'],
  ['dna-twin', 'Novel Form: Twin Dial', 'Bentuk Baru: Dua Muka', 4, 'novel', 'twin'],
  ['dna-orbit', 'Novel Form: Orbit Ring', 'Bentuk Baru: Cincin Orbit', 5, 'novel', 'ring'],
  ['dna-crystal', 'Novel Form: Crystal Shard', 'Bentuk Baru: Kristal', 5, 'novel', 'octagon'],
  ['dna-wave', 'Novel Form: Wave Scroll', 'Bentuk Baru: Gulungan Ombak', 4, 'novel', 'polar'],
  ['dna-crown', 'Novel Form: Crown', 'Bentuk Baru: Mahkota', 5, 'novel', 'star'],
];

/** Tema bahan: [id, EN, ID, poin, warnaRangka[], warnaDigit, warnaMati, latar[2], hue permata] */
export const THEMES = [
  ['emerald-royale', 'Emerald Royale', 'Emerald Royale', 4, ['#fff3b8', '#d6a834', '#7b5a14', '#f4d46e'], '#4dffb0', '#0b2a1d', ['#114230', '#020806'], 150],
  ['sapphire-frost', 'Sapphire Frost', 'Safir Beku', 4, ['#ffffff', '#9fb0cc', '#e8f0ff', '#6f819f'], '#62e6ff', '#0a2038', ['#0d2c52', '#01040c'], 222],
  ['amethyst-nebula', 'Amethyst Nebula', 'Nebula Amethyst', 4, ['#ffe6da', '#e8a797', '#9c5565', '#f7c7b8'], '#ff7ae0', '#2a1245', ['#2b0d4f', '#04000c'], 280],
  ['ruby-ember', 'Ruby Ember', 'Bara Ruby', 4, ['#6e6e78', '#17171b', '#9a9aa6', '#101013'], '#ff5b3a', '#2b0a0d', ['#3d0812', '#090204'], 352],
  ['opal-prism', 'Opal Prism', 'Prisma Opal', 5, ['#ffffff', '#d6e6f7', '#f6dcf1', '#cdeee4'], '#ffffff', '#16202c', ['#0b2f3a', '#010608'], 190],
  ['black-steel', 'Black Steel', 'Baja Hitam', 0, ['#5c5c66', '#17171b', '#8a8a96', '#0e0e12'], '#e9ecf2', '#1a1c22', ['#15171c', '#050506'], 210],
  ['titanium', 'Titanium', 'Titanium', 1, ['#c9ced6', '#7d838d', '#e6e9ee', '#5c626b'], '#9ff3ff', '#142028', ['#1b2530', '#06090c'], 200],
  ['ceramic-white', 'White Ceramic', 'Keramik Putih', 1, ['#ffffff', '#e8e8ea', '#d2d2d8', '#f6f6f8'], '#1e2a3a', '#d9dde4', ['#eef1f5', '#c7ccd6'], 30],
  ['walnut', 'Walnut Wood', 'Kayu Walnut', 1, ['#8a5a36', '#5b3a22', '#a8774e', '#3f2715'], '#ffcf7a', '#2a1a0e', ['#2a1a10', '#0c0705'], 30],
  ['glass', 'Crystal Glass', 'Kaca Kristal', 2, ['#e8fbff', '#a6dbe8', '#ffffff', '#7fb8c6'], '#ffffff', '#16303a', ['#0d2a33', '#020809'], 190],
  ['neon-cyber', 'Cyberpunk Neon', 'Neon Cyberpunk', 2, ['#ff2fd8', '#2a0b3a', '#29f0ff', '#14031e'], '#29f0ff', '#1a0730', ['#1a0430', '#020008'], 300],
  ['holo', 'Holographic', 'Holografik', 3, ['#ffd6f5', '#c6f3ff', '#e9ffd2', '#ffe9c2'], '#ffffff', '#202838', ['#151a2e', '#03040a'], 260],
  ['minimal', 'Minimal Mono', 'Minimal Mono', 0, ['#f2f2f2', '#bdbdbd', '#ffffff', '#9a9a9a'], '#111111', '#e2e2e2', ['#f7f7f7', '#dcdcdc'], 0],
  ['aureum', 'Aureum Gold', 'Emas Aureum', 3, ['#fff1b0', '#e0b440', '#8a6516', '#f9db78'], '#ffcf5a', '#3a2808', ['#3b2a0a', '#0c0802'], 45],
  ['void', 'Void', 'Void', 1, ['#ffffff', '#222222', '#bbbbbb', '#000000'], '#ffffff', '#141414', ['#0a0a0a', '#000000'], 0],
  ['bloodline', 'Bloodline', 'Bloodline', 2, ['#7a0a14', '#2a0205', '#c2182b', '#150103'], '#ff2a3a', '#2a0508', ['#22030a', '#060001'], 355],
  ['quantum', 'Quantum', 'Kuantum', 5, ['#7cf3ff', '#2b6bff', '#e0b6ff', '#0b1a4a'], '#9ffcff', '#0a1838', ['#071233', '#01020a'], 210],
  ['sakura', 'Sakura Pearl', 'Mutiara Sakura', 2, ['#ffe4ef', '#f3b5cb', '#fff6fa', '#d891ab'], '#ff6aa2', '#3a1222', ['#3a1424', '#0c0306'], 335],
];

/** Gaya angka: [id, EN, ID, poin] */
export const DIGITS = [
  ['seg7', 'Seven-Segment', 'Tujuh Segmen', 0],
  ['dot', 'Dot Matrix', 'Dot Matrix', 1],
  ['nixie', 'Nixie Tube', 'Tabung Nixie', 3],
  ['flip', 'Flip Cards', 'Kartu Flip', 2],
  ['orbit', 'Orbit Dial', 'Dial Orbit', 3],
  ['liquid', 'Liquid Glow', 'Cair Bercahaya', 2],
  ['binary', 'Binary Lights', 'Lampu Biner', 3],
  ['hybrid', 'Hybrid Analog', 'Hibrida Analog', 2],
];

/** Gerak: [id, EN, ID, poin] */
export const MOTIONS = [
  ['pulse', 'Pulse', 'Detak', 0],
  ['tick', 'Tick Glow', 'Detik Bercahaya', 0],
  ['parallax', 'Parallax', 'Parallax', 1],
  ['particles', 'Particle Storm', 'Badai Partikel', 2],
  ['spin', 'Spinning Rings', 'Cincin Berputar', 2],
  ['wave', 'Wave Field', 'Medan Gelombang', 2],
  ['aurora', 'Aurora', 'Aurora', 3],
  ['supernova', 'Supernova', 'Supernova', 4],
];

/** Permata: [id, EN, ID, poin, jumlah] */
export const GEMS = [
  ['none', 'No Gems', 'Tanpa Permata', 0, 0],
  ['corner', 'Corner Gems', 'Permata Sudut', 1, 4],
  ['crown', 'Crown Gems', 'Permata Mahkota', 2, 8],
  ['seconds', 'Seconds Track', 'Jejak Detik', 3, 12],
  ['halo', 'Full Halo', 'Halo Penuh', 4, 60],
  ['constellation', 'Constellation', 'Rasi Bintang', 4, 24],
];

/** Latar: [id, EN, ID, poin] */
export const BACKDROPS = [
  ['studio', 'Studio', 'Studio', 0],
  ['radial', 'Radial Glow', 'Cahaya Radial', 0],
  ['grid', 'Tech Grid', 'Kisi Teknologi', 1],
  ['stars', 'Starfield', 'Ladang Bintang', 1],
  ['city', 'Night City', 'Kota Malam', 2],
  ['marble', 'Marble', 'Marmer', 2],
  ['nebula', 'Nebula', 'Nebula', 3],
  ['islamic', 'Geometric Star', 'Geometri Bintang', 2],
];

export const SPACE = [FORMS, THEMES, DIGITS, MOTIONS, GEMS, BACKDROPS];
