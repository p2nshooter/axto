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
  // #47 (4 × 10 jt): 24 tema baru agar ruang kombinasi ≥ 10 jt
  ['coral-reef', 'Coral Reef', 'Terumbu Karang', 2, ['#fa6742', '#45340c', '#fb5687', '#210d08'], '#ff6c47', '#29100a', ['#39250e', '#0b0504'], 12],
  ['glacier', 'Glacier', 'Gletser', 2, ['#ffffff', '#c8e5ef', '#eaf3f6', '#9fc4d1'], '#1e5567', '#d7e5ea', ['#e2eff3', '#a9c7d1'], 195],
  ['desert-dune', 'Desert Dune', 'Bukit Pasir', 1, ['#efdec8', '#c69453', '#6f512a', '#e2bd8d'], '#6ea9f7', '#2e210f', ['#433119', '#0e0b06'], 34],
  ['jade-temple', 'Jade Temple', 'Kuil Giok', 3, ['#c8efdb', '#53c68c', '#2a6f4d', '#8de2b8'], '#f76eb3', '#0f2e1f', ['#19432e', '#060e0a'], 150],
  ['lava-core', 'Lava Core', 'Inti Lava', 3, ['#8f6756', '#211612', '#bb9281', '#140d0b'], '#f6895a', '#24150f', ['#26140d', '#070403'], 18],
  ['arctic-aurora', 'Arctic Aurora', 'Aurora Arktik', 4, ['#42facc', '#0c3745', '#56fb7f', '#08211b'], '#47ffd1', '#0a2921', ['#0e3639', '#040b0a'], 165],
  ['rose-gold', 'Rose Gold', 'Emas Mawar', 3, ['#efd1c8', '#c67053', '#6f3b2a', '#e2a28d'], '#6ed5f7', '#2e170f', ['#432419', '#0e0806'], 15],
  ['cobalt-pulse', 'Cobalt Pulse', 'Denyut Kobalt', 2, ['#427ffa', '#160c45', '#56dffb', '#081021'], '#4785ff', '#0a1429', ['#0e0e39', '#04060b'], 220],
  ['matcha', 'Matcha', 'Matcha', 1, ['#ffffff', '#d8efc8', '#eff6ea', '#b3d19f'], '#3c671e', '#dfead7', ['#e9f3e2', '#b9d1a9'], 95],
  ['midnight-ink', 'Midnight Ink', 'Tinta Tengah Malam', 1, ['#565b8f', '#121321', '#8186bb', '#0b0b14'], '#5a67f6', '#0f1124', ['#0d0f26', '#030307'], 235],
  ['sunset-strip', 'Sunset Strip', 'Senja Jalanan', 2, ['#fa9842', '#45430c', '#fb565b', '#211408'], '#ff9d47', '#29180a', ['#39310e', '#0b0704'], 28],
  ['lilac-mist', 'Lilac Mist', 'Kabut Lilac', 2, ['#ffffff', '#dfc8ef', '#f1eaf6', '#bc9fd1'], '#481e67', '#e2d7ea', ['#ece2f3', '#c0a9d1'], 275],
  ['copper-patina', 'Copper Patina', 'Patina Tembaga', 3, ['#c8efec', '#53c6bc', '#2a6f69', '#8de2db'], '#f76e79', '#0f2e2b', ['#19433f', '#060e0e'], 175],
  ['toxic-lime', 'Toxic Lime', 'Limau Toksik', 2, ['#adfa42', '#11450c', '#fbed56', '#162108'], '#b2ff47', '#1c290a', ['#19390e', '#080b04'], 85],
  ['deep-ocean', 'Deep Ocean', 'Samudra Dalam', 2, ['#56788f', '#121b21', '#81a3bb', '#0b1014'], '#5ab5f6', '#0f1b24', ['#0d1c26', '#030507'], 205],
  ['honeycomb', 'Honeycomb', 'Sarang Madu', 2, ['#efe3c8', '#c6a353', '#6f5a2a', '#e2c98d'], '#6e97f7', '#2e250f', ['#433619', '#0e0c06'], 42],
  ['ultraviolet', 'Ultraviolet', 'Ultraungu', 4, ['#8f42fa', '#410c45', '#5664fb', '#120821'], '#9447ff', '#170a29', ['#2e0e39', '#07040b'], 265],
  ['mint-chrome', 'Mint Chrome', 'Krom Mint', 3, ['#c8efe1', '#53c69c', '#2a6f56', '#8de2c3'], '#f76ea0', '#0f2e23', ['#194333', '#060e0b'], 158],
  ['blush-porcelain', 'Blush Porcelain', 'Porselen Merona', 2, ['#ffffff', '#efc8d1', '#f6eaed', '#d19fab'], '#671e30', '#ead7dc', ['#f3e2e7', '#d1a9b3'], 345],
  ['storm-graphite', 'Storm Graphite', 'Grafit Badai', 1, ['#566e8f', '#121821', '#8199bb', '#0b0f14'], '#5a9bf6', '#0f1824', ['#0d1726', '#030507'], 215],
  ['solar-flare', 'Solar Flare', 'Suar Surya', 5, ['#fabd42', '#3c450c', '#fb7156', '#211808'], '#ffc247', '#291f0a', ['#39390e', '#0b0904'], 40],
  ['peacock', 'Peacock', 'Merak', 4, ['#c8ecef', '#53bcc6', '#2a696f', '#8ddbe2'], '#f7796e', '#0f2b2e', ['#193f43', '#060e0e'], 185],
  ['ivory-noir', 'Ivory Noir', 'Gading Hitam', 2, ['#ffffff', '#efe2c8', '#f6f2ea', '#d1c09f'], '#674e1e', '#eae3d7', ['#f3ede2', '#d1c3a9'], 40],
  ['blackberry', 'Blackberry', 'Beri Hitam', 2, ['#8f568f', '#211221', '#bb81bb', '#140b14'], '#f65af6', '#240f24', ['#260d26', '#070307'], 300],
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
  // #47: pola permata tambahan
  ['duo', 'Twin Gems', 'Permata Kembar', 1, 2],
  ['trinity', 'Trinity Gems', 'Permata Trinitas', 1, 3],
  ['hexa', 'Hexa Gems', 'Permata Heksa', 2, 6],
  ['compass', 'Compass Gems', 'Permata Kompas', 3, 16],
  ['orbit', 'Orbit Ring', 'Cincin Orbit', 3, 36],
  ['galaxy', 'Galaxy Ring', 'Cincin Galaksi', 5, 48],
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
