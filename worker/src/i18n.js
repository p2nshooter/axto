/**
 * Kamus manual ID/EN (perintah pemilik: jangan auto-translate). IP Indonesia → ID, lainnya → EN; tombol ID/EN menyimpan
 * cookie `lang` satu tahun.
 */
export const LANGS = ['id', 'en'];

export const T = {
  id: {
    htmlLang: 'id-ID',
    siteName: 'AXTO',
    tagline: 'Museum digital hidup — karya 1/1 yang tidak pernah sama',
    metaDesc: 'NFT jam digital hidup, NFT prangko, NFT kaligrafi Al-Qur\'an & figur model di jaringan Base — 20.000 karya 1/1 pilihan harga tetap di OpenSea, dan 40.000 edisi eksklusif dilelang dengan koin AXTO.',
    nav: { home: 'Beranda', gallery: 'Galeri', auction: 'Lelang AXTO', waiting: 'Menunggu', exclusive: 'Eksklusif', coin: 'Koin AXTO', member: 'Member', connect: 'Hubungkan wallet' },
    hero: {
      kicker: 'NFT 1/1 hidup di jaringan Base · harga tetap di OpenSea · lelang eksklusif koin AXTO',
      title: 'Setiap karya lahir sekali.\nTidak pernah diulang.',
      lead: 'Jam digital yang berdetak, prangko yang bergerak, kaligrafi Al-Qur\'an tiga dimensi dan figur model beranimasi — setiap karya lahir dari DNA matematis unik. 20.000 karya pilihan siap dibeli di OpenSea dengan harga tetap; 40.000 edisi eksklusif dilelang dengan koin AXTO.',
      cta: 'Lihat 20.000 karya pilihan',
      cta2: 'Kenali koin AXTO',
      live: 'Lot eksklusif live', ready: 'Siap lelang', sold: 'Terjual', next: 'Ronde berikutnya', stock: 'Karya pilihan', exStock: 'Edisi eksklusif',
    },
    collections: {
      title: 'Empat koleksi publik',
      time: ['Jam Hidup', 'Jam digital yang menunjukkan waktu nyata di mana pun ia dipajang — jam tangan, tas, baju, dinding, hingga bentuk yang belum pernah ada.'],
      stamp: ['Prangko Semesta', 'Prangko dari negeri imajiner dengan seluruh tema dunia; sebagian bergerak, yang premium bisa di-zoom sampai planet dan komet.'],
      quran: ['Kaligrafi Al-Qur\'an', 'Setiap ayat, halaman mushaf Utsmani, juz, dan mushaf lengkap dalam kaligrafi 3D, dibacakan qari pilihan dengan penunjuk tiap kata.'],
      model: ['Figur Model', 'Figur beranimasi dalam seri pendidikan, antariksa, dan lainnya — dibuat hanya dengan izin tertulis model.'],
      open: 'Buka koleksi',
    },
    how: {
      title: 'Cara kerjanya',
      steps: [
        ['Pilih karya', 'Telusuri 20.000 karya pilihan per galeri, seri, surah atau tingkat kelangkaan — semuanya bergerak dan bisa dibuka di player.'],
        ['Beli di OpenSea', 'Harga tetap per tingkat: Klasik $10, Langka $25, Epik $75, Legendaris $250, Mahakarya $1.000. Tombol Beli langsung membuka listing-nya di OpenSea.'],
        ['Atau ikut lelang eksklusif', 'Edisi eksklusif hanya dilelang dengan koin AXTO di axto.io; pemenang menarik (WD) karyanya ke wallet dan membayar gasnya sendiri.'],
      ],
    },
    kind: {
      pub: 'Publik', ex: 'Eksklusif',
      pubShort: 'Publik · harga tetap · OpenSea', exShort: 'Eksklusif · lelang koin AXTO',
      pubLong: 'Koleksi publik · harga tetap per tingkat · dijual di OpenSea (jaringan Base) → setelah dibeli langsung masuk wallet Anda',
      exLong: 'Koleksi eksklusif · lelang koin AXTO di axto.io · disimpan di kustodi axto.io → Anda tarik (WD) ke wallet, gas WD Anda bayar',
      pubTitle: '20.000 karya pilihan — beli di OpenSea', exTitle: '40.000 edisi eksklusif — lelang koin AXTO',
      pubLead: 'Dari 8.000.000 karya 1/1 di blockchain Base, axto.io memajang 5.000 karya acak per jenis — Jam, Prangko, Kaligrafi Al-Qur\'an dan Model. Harga tetap sesuai tingkat kelangkaan; tombol Beli membawa Anda langsung ke listing-nya di OpenSea. Karya yang terjual otomatis diganti karya berikutnya.',
      exLead: 'Eksklusif Jam, Prangko, Kaligrafi Al-Qur\'an dan Model, masing-masing 10.000 karya, hanya dilelang di axto.io dan hanya dibayar koin AXTO. Karya disimpan di kustodi axto.io dan bisa diperjualbelikan lagi antar member; kapan pun Anda mau, tarik (WD) ke wallet — saat itulah karya dicetak dan Anda membayar gasnya.',
      opensea: 'Lihat di OpenSea', buy: 'Beli di OpenSea', soon: 'Segera tersedia di OpenSea', fixed: 'Harga tetap', admin: 'Admin',
      status: { not_produced: 'Sedang diproduksi', waiting: 'Menunggu ronde — Anda bisa mengajukan penawaran', sealed: 'Tersegel — segera live', live: 'Live', sold: 'Terjual', ended: 'Lelang selesai', claim: 'Menunggu klaim pemenang' },
    },
    exclusiveBlurb: ['Edisi Eksklusif', '4 × 10.000 karya hanya di axto.io, dilelang dengan koin AXTO, disimpan aman di kustodi axto.io sampai Anda menariknya ke wallet.'],
    coinBlurb: ['Koin AXTO', '10.000.000 koin, tanpa burn, harga tetap $10 sampai 2.000.000 terjual. Koin hanya untuk transaksi NFT di axto.io dan tidak dapat diuangkan di axto.io.'],
    faq: {
      title: 'Pertanyaan umum',
      items: [
        ['Berapa harga NFT AXTO di OpenSea?', 'Harga tetap per tingkat kelangkaan: Klasik $10, Langka $25, Epik $75, Legendaris $250, Mahakarya $1.000 (dibayar ETH di jaringan Base).'],
        ['Bagaimana cara membeli NFT AXTO?', 'Pilih karya di axto.io, tekan Beli di OpenSea, hubungkan wallet (MetaMask, Coinbase Wallet, dll.) di jaringan Base, lalu konfirmasi. NFT langsung masuk wallet Anda.'],
        ['Apa itu lelang eksklusif?', 'Edisi eksklusif (4 × 10.000) hanya dilelang di axto.io dengan koin AXTO, mulai $1. Menawar tanpa gas; pemenang membayar gas saat menarik (WD) karyanya ke wallet.'],
        ['Apakah teks Al-Qur\'an diubah?', 'Tidak. Teks disalin apa adanya dari mushaf Utsmani riwayat Hafs (KFGQPC); karya NFT mewakili seni kaligrafinya, bukan hak atas ayat Al-Qur\'an.'],
        ['Apakah dana saya dipindahkan saat menawar?', 'Tidak. Dana tetap di wallet Anda; tawaran ditahan lewat allowance dan dilepas otomatis saat Anda disalip.'],
        ['Apakah ada royalti jual kembali?', 'Ya, 10% di OpenSea dan di mana pun (ERC-2981 + ERC-721C).'],
        ['Apakah koin AXTO investasi?', 'Bukan. AXTO adalah token utilitas untuk transaksi NFT di axto.io. Tidak ada janji keuntungan.'],
      ],
    },
    auction: { title: 'Lelang eksklusif koin AXTO', empty: 'Belum ada lot live. Ronde berikutnya dimulai', endsIn: 'Berakhir dalam', highest: 'Tawaran tertinggi', start: 'Harga mulai', bid: 'Tawar', bidAuto: 'Naik 10%', bidMax: 'Tawaran maksimum (proxy)', filter: 'Saring', all: 'Semua', sortEnding: 'Segera berakhir', sortHighest: 'Tawaran tertinggi', sortLowest: 'Tawaran terendah', round: 'Ronde', lots: 'lot' },
    waiting: { title: 'Menunggu lelang', lead: 'Karya yang sudah siap tetapi belum masuk ronde. Anda tetap bisa menawar; tawaran tertinggi masuk ronde lebih dulu.', offers: 'Penawaran' },
    nft: { traits: 'Sifat', history: 'Riwayat', certificate: 'Sertifikat', owner: 'Pemilik', edition: 'Edisi 1/1', rarity: 'Kelangkaan', play: 'Buka player', opensea: 'Lihat di OpenSea' },
    exclusive: { title: 'Marketplace eksklusif', lead: 'Hanya di axto.io. Pembayaran hanya koin AXTO. Fee situs 10%.', buyNow: 'Beli sekarang', offer: 'Ajukan penawaran', withdraw: 'Tarik ke wallet', custody: 'Kustodi axto.io' },
    coin: {
      title: 'Koin AXTO', supply: 'Total suplai', price: 'Harga presale', sold: 'Terjual', buyPaypal: 'Beli dengan PayPal', buyUsdc: 'Beli dengan USDC', buyEth: 'Beli dengan ETH',
      split: [['Presale axto.io ($10)', '20% · 2.000.000'], ['Likuiditas DEX (setelah presale)', '30% · 3.000.000'], ['Cadangan jangka panjang (5 tahun)', '30% · 3.000.000'], ['Perusahaan', '20% · 2.000.000']],
      disclaimer: 'AXTO adalah token utilitas untuk transaksi NFT di axto.io, bukan produk investasi dan tidak dijamin nilainya. Koin yang dibeli tidak dapat diuangkan di axto.io. Pastikan Anda memahami risikonya dan aturan di negara Anda.',
      paypalOff: 'Pembelian lewat PayPal belum dibuka.',
    },
    member: { title: 'Portal member', connectFirst: 'Hubungkan wallet dan tanda tangani pesan masuk terlebih dahulu.', profile: 'Profil', email: 'Email', username: 'Nama pengguna', password: 'Kata sandi', save: 'Simpan', holds: 'Hold aktif', bids: 'Tawaran', wins: 'Menang', claim: 'Klaim', logout: 'Keluar', balance: 'Saldo' },
    admin: { title: 'Portal admin', denied: 'Hanya wallet admin.' },
    verify: { title: 'Verifikasi karya', ok: 'Karya asli AXTO', hash: 'Sidik DNA' },
    footer: { rights: 'Hak cipta karya tetap milik AXTO. Pemilik token boleh memajang karya untuk penggunaan pribadi dan promosi.', terms: 'Ketentuan', privacy: 'Privasi', contact: 'Kontak' },
    errors: { notFound: 'Halaman tidak ditemukan', back: 'Kembali ke beranda' },
    langSwitch: 'English',
  },
  en: {
    htmlLang: 'en',
    siteName: 'AXTO',
    tagline: 'A living digital museum — 1/1 works that are never the same',
    metaDesc: 'Living digital clock NFTs, stamp NFTs, Qur\'an calligraphy NFTs and model figures on Base — 20,000 hand-picked 1/1 works at fixed prices on OpenSea, plus 40,000 exclusive editions auctioned in AXTO coin.',
    nav: { home: 'Home', gallery: 'Gallery', auction: 'AXTO auctions', waiting: 'Waiting', exclusive: 'Exclusive', coin: 'AXTO Coin', member: 'Member', connect: 'Connect wallet' },
    hero: {
      kicker: 'Living 1/1 NFTs on Base · fixed prices on OpenSea · exclusive AXTO coin auctions',
      title: 'Every work is born once.\nNever repeated.',
      lead: 'Clocks that tick, stamps that move, three-dimensional Qur\'an calligraphy and animated model figures — every work is born from a mathematically unique DNA. 20,000 hand-picked works are ready to buy on OpenSea at fixed prices; 40,000 exclusive editions are auctioned in AXTO coin.',
      cta: 'Browse 20,000 picks',
      cta2: 'Meet the AXTO coin',
      live: 'Live exclusive lots', ready: 'Ready', sold: 'Sold', next: 'Next round', stock: 'Picked works', exStock: 'Exclusive editions',
    },
    collections: {
      title: 'Four public collections',
      time: ['Living Clocks', 'Digital clocks that tell the real time wherever they are shown — wristwatches, bags, apparel, walls and shapes never seen before.'],
      stamp: ['Stamps of the Realms', 'Stamps from imaginary nations across every theme; some move, and premium ones zoom down to planets and comets.'],
      quran: ['Qur\'an Calligraphy', 'Every ayah, every Uthmani mushaf page, every juz and the complete mushaf in 3D calligraphy, recited by the reciter of your choice with word-by-word highlighting.'],
      model: ['Model Figures', 'Animated figures in education, space and other series — made only with the model\'s written consent.'],
      open: 'Open collection',
    },
    how: {
      title: 'How it works',
      steps: [
        ['Pick a work', 'Browse 20,000 picks by gallery, series, surah or rarity tier — every one moves and opens in the player.'],
        ['Buy on OpenSea', 'Fixed price per tier: Classic $10, Rare $25, Epic $75, Legendary $250, Masterpiece $1,000. The Buy button opens its listing on OpenSea.'],
        ['Or join an exclusive auction', 'Exclusive editions are auctioned only in AXTO coin on axto.io; winners withdraw (WD) the work to their wallet and pay its gas.'],
      ],
    },
    kind: {
      pub: 'Public', ex: 'Exclusive',
      pubShort: 'Public · fixed price · OpenSea', exShort: 'Exclusive · AXTO coin auction',
      pubLong: 'Public collection · fixed price per tier · sold on OpenSea (Base network) → lands in your wallet as soon as you buy',
      exLong: 'Exclusive collection · AXTO coin auction on axto.io · kept in axto.io custody → you withdraw (WD) to your wallet and pay the WD gas',
      pubTitle: '20,000 picks — buy on OpenSea', exTitle: '40,000 exclusive editions — AXTO coin auctions',
      pubLead: 'Out of 8,000,000 one-of-one works on the Base blockchain, axto.io shows 5,000 random works of each kind — Clocks, Stamps, Qur\'an Calligraphy and Models. Fixed prices by rarity; the Buy button takes you straight to the listing on OpenSea. Sold works are replaced automatically.',
      exLead: 'Exclusive Clocks, Stamps, Qur\'an Calligraphy and Models, 10,000 works each, auctioned only on axto.io and paid only in AXTO coin. Works stay in axto.io custody and can be resold between members; whenever you like, withdraw (WD) to your wallet — that is when the work is minted and you pay its gas.',
      opensea: 'View on OpenSea', buy: 'Buy on OpenSea', soon: 'Coming to OpenSea soon', fixed: 'Fixed price', admin: 'Admin',
      status: { not_produced: 'In production', waiting: 'Waiting for a round — you can make an offer', sealed: 'Sealed — going live soon', live: 'Live', sold: 'Sold', ended: 'Auction ended', claim: 'Awaiting the winner\'s claim' },
    },
    exclusiveBlurb: ['Exclusive Editions', '4 × 10,000 works only on axto.io, auctioned in AXTO coin and kept safe in axto.io custody until you withdraw them to your wallet.'],
    coinBlurb: ['AXTO Coin', '10,000,000 coins, no burn, a fixed $10 until 2,000,000 are sold. The coin is for NFT transactions on axto.io and cannot be cashed out on axto.io.'],
    faq: {
      title: 'FAQ',
      items: [
        ['How much is an AXTO NFT on OpenSea?', 'A fixed price per rarity tier: Classic $10, Rare $25, Epic $75, Legendary $250, Masterpiece $1,000 (paid in ETH on the Base network).'],
        ['How do I buy an AXTO NFT?', 'Pick a work on axto.io, press Buy on OpenSea, connect a wallet (MetaMask, Coinbase Wallet, …) on Base and confirm. The NFT lands in your wallet right away.'],
        ['What is an exclusive auction?', 'Exclusive editions (4 × 10,000) are auctioned only on axto.io in AXTO coin, from $1. Bidding is gas-free; the winner pays gas when withdrawing (WD) the work to a wallet.'],
        ['Is the Qur\'an text changed?', 'No. The text is reproduced exactly from the Uthmani Hafs mushaf (KFGQPC); the NFT represents the calligraphy artwork, not any right over the verses.'],
        ['Are my funds moved when I bid?', 'No. Funds stay in your wallet; bids are held through an allowance and released automatically when you are outbid.'],
        ['Is there a resale royalty?', 'Yes, 10% on OpenSea and everywhere else (ERC-2981 + ERC-721C).'],
        ['Is the AXTO coin an investment?', 'No. AXTO is a utility token for NFT transactions on axto.io. No returns are promised.'],
      ],
    },
    auction: { title: 'Exclusive AXTO coin auctions', empty: 'No live lots yet. The next round starts', endsIn: 'Ends in', highest: 'Highest bid', start: 'Starting price', bid: 'Bid', bidAuto: 'Raise 10%', bidMax: 'Maximum bid (proxy)', filter: 'Filter', all: 'All', sortEnding: 'Ending soon', sortHighest: 'Highest bid', sortLowest: 'Lowest bid', round: 'Round', lots: 'lots' },
    waiting: { title: 'Waiting for auction', lead: 'Works that are ready but not yet in a round. You can still make an offer; the highest offers enter a round first.', offers: 'Offers' },
    nft: { traits: 'Traits', history: 'History', certificate: 'Certificate', owner: 'Owner', edition: 'Edition 1/1', rarity: 'Rarity', play: 'Open player', opensea: 'View on OpenSea' },
    exclusive: { title: 'Exclusive marketplace', lead: 'Only on axto.io. Paid in AXTO coin only. 10% site fee.', buyNow: 'Buy now', offer: 'Make an offer', withdraw: 'Withdraw to wallet', custody: 'axto.io custody' },
    coin: {
      title: 'AXTO Coin', supply: 'Total supply', price: 'Presale price', sold: 'Sold', buyPaypal: 'Buy with PayPal', buyUsdc: 'Buy with USDC', buyEth: 'Buy with ETH',
      split: [['axto.io presale ($10)', '20% · 2,000,000'], ['DEX liquidity (after the presale)', '30% · 3,000,000'], ['Long-term reserve (5 years)', '30% · 3,000,000'], ['Company', '20% · 2,000,000']],
      disclaimer: 'AXTO is a utility token for NFT transactions on axto.io. It is not an investment product and its value is not guaranteed. Coins you buy cannot be cashed out on axto.io. Make sure you understand the risks and the rules in your country.',
      paypalOff: 'PayPal purchases are not open yet.',
    },
    member: { title: 'Member portal', connectFirst: 'Connect your wallet and sign the sign-in message first.', profile: 'Profile', email: 'Email', username: 'Username', password: 'Password', save: 'Save', holds: 'Active holds', bids: 'Bids', wins: 'Wins', claim: 'Claim', logout: 'Sign out', balance: 'Balance' },
    admin: { title: 'Admin portal', denied: 'Admin wallet only.' },
    verify: { title: 'Verify a work', ok: 'Genuine AXTO work', hash: 'DNA fingerprint' },
    footer: { rights: 'Copyright of the artwork remains with AXTO. Token holders may display the work for personal and promotional use.', terms: 'Terms', privacy: 'Privacy', contact: 'Contact' },
    errors: { notFound: 'Page not found', back: 'Back to home' },
    langSwitch: 'Bahasa Indonesia',
  },
};

/** Path per bahasa (slug dalam bahasa masing-masing). */
export const PATHS = {
  auction: { id: 'lelang', en: 'auctions' },
  waiting: { id: 'menunggu', en: 'waiting' },
  exclusive: { id: 'eksklusif', en: 'exclusive' },
  coin: { id: 'koin', en: 'coin' },
  member: { id: 'member', en: 'member' },
  admin: { id: 'admin', en: 'admin' },
  verify: { id: 'verifikasi', en: 'verify' },
  gallery: { id: 'galeri', en: 'gallery' },
};

/** Cari kunci halaman dari slug (bahasa mana pun). */
export function pageFromSlug(slug) {
  for (const [k, v] of Object.entries(PATHS)) if (v.id === slug || v.en === slug) return k;
  return null;
}

export function pickLang(request) {
  const cookie = request.headers.get('cookie') ?? '';
  const m = /(?:^|;\s*)lang=(id|en)\b/.exec(cookie);
  if (m) return m[1];
  return (request.cf?.country ?? request.headers.get('cf-ipcountry')) === 'ID' ? 'id' : 'en';
}
