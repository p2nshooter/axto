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
    metaDesc: 'AXTO: 8 juta karya digital 1/1 yang hidup — jam, prangko, kaligrafi Al-Qur\'an, dan figur model — dilelang 72 jam mulai $1. Edisi eksklusif dengan koin AXTO.',
    nav: { home: 'Beranda', auction: 'Lelang', waiting: 'Menunggu', exclusive: 'Eksklusif', coin: 'Koin AXTO', member: 'Member', connect: 'Hubungkan wallet' },
    hero: {
      kicker: 'Lelang 72 jam · mulai $1 · tanpa kecuali',
      title: 'Setiap karya lahir sekali.\nTidak pernah diulang.',
      lead: 'Empat koleksi, masing-masing 2.000.000 karya 1/1 yang dihasilkan dari DNA matematis unik — jam yang berdetak, prangko yang bergerak, kaligrafi Al-Qur\'an tiga dimensi, dan figur model beranimasi.',
      cta: 'Lihat lelang berjalan',
      cta2: 'Kenali koin AXTO',
      live: 'Lot live', ready: 'Siap lelang', sold: 'Terjual', next: 'Ronde berikutnya',
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
        ['Hubungkan wallet', 'Tanda tangan tanpa gas membuktikan wallet Anda — itulah pendaftaran member.'],
        ['Tawar mulai $1', 'Kenaikan otomatis 10% atau isi sendiri. Dana tetap di wallet Anda; hanya ditahan lewat izin (allowance).'],
        ['Menang, lalu klaim', 'Pemenang mengklaim di chain dan membayar gas sendiri. NFT langsung masuk wallet Anda.'],
      ],
    },
    kind: {
      pub: 'Publik', ex: 'Eksklusif',
      pubShort: 'Publik · USDC · OpenSea', exShort: 'Eksklusif · koin AXTO',
      pubLong: 'Koleksi publik · bayar USDC · tercetak di Base & tampil di OpenSea → setelah menang langsung ke wallet MetaMask Anda',
      exLong: 'Koleksi eksklusif · bayar koin AXTO · disimpan di kustodi axto.io → Anda tarik (WD) manual ke wallet, gas WD Anda bayar',
      pubTitle: 'Koleksi publik — sudah di OpenSea', exTitle: 'Koleksi eksklusif — khusus koin AXTO',
      pubLead: 'TIME, STAMP, QURAN dan MODEL, masing-masing 2.000.000 karya 1/1, dicetak otomatis di blockchain Base dan tampil di OpenSea. Dibayar USDC; setelah menang Anda klaim dan NFT masuk wallet MetaMask Anda.',
      exLead: 'EX-TIME, EX-STAMP dan EX-QURAN, masing-masing 50.000 karya, hanya dijual di axto.io dan hanya dibayar koin AXTO. Karya disimpan di kustodi axto.io; kapan pun Anda mau, tarik (WD) ke wallet — saat itulah karya dicetak dan Anda membayar gasnya.',
      opensea: 'Lihat di OpenSea', admin: 'Admin',
      status: { not_produced: 'Sedang diproduksi', waiting: 'Menunggu ronde — Anda bisa mengajukan penawaran', sealed: 'Tersegel — segera live', live: 'Live', sold: 'Terjual', ended: 'Lelang selesai', claim: 'Menunggu klaim pemenang' },
    },
    exclusiveBlurb: ['Edisi Eksklusif', '3 × 50.000 karya hanya di axto.io, dibayar dengan koin AXTO, disimpan aman di kustodi axto.io sampai Anda menariknya ke wallet.'],
    coinBlurb: ['Koin AXTO', '10.000.000 koin, tanpa burn, harga tetap $10 sampai 2.000.000 terjual. Koin hanya untuk transaksi NFT di axto.io dan tidak dapat diuangkan di axto.io.'],
    faq: {
      title: 'Pertanyaan umum',
      items: [
        ['Berapa harga mulai lelang?', 'Semua lot mulai $1, tanpa kecuali — publik maupun eksklusif.'],
        ['Siapa yang membayar gas?', 'Pemenang membayar gas saat mengklaim. Menawar tidak memerlukan gas.'],
        ['Apakah dana saya dipindahkan saat menawar?', 'Tidak. Dana tetap di wallet Anda; tawaran ditahan lewat allowance dan dilepas otomatis saat Anda disalip.'],
        ['Apakah ada royalti jual kembali?', 'Ya, 10% di OpenSea dan di mana pun (ERC-2981 + ERC-721C).'],
        ['Apakah koin AXTO investasi?', 'Bukan. AXTO adalah token utilitas untuk transaksi NFT di axto.io. Tidak ada janji keuntungan.'],
      ],
    },
    auction: { title: 'Lelang berjalan', empty: 'Belum ada lot live. Ronde berikutnya dimulai', endsIn: 'Berakhir dalam', highest: 'Tawaran tertinggi', start: 'Harga mulai', bid: 'Tawar', bidAuto: 'Naik 10%', bidMax: 'Tawaran maksimum (proxy)', filter: 'Saring', all: 'Semua', sortEnding: 'Segera berakhir', sortHighest: 'Tawaran tertinggi', sortLowest: 'Tawaran terendah', round: 'Ronde', lots: 'lot' },
    waiting: { title: 'Menunggu lelang', lead: 'Karya yang sudah siap tetapi belum masuk ronde. Anda tetap bisa menawar; tawaran tertinggi masuk ronde lebih dulu.', offers: 'Penawaran' },
    nft: { traits: 'Sifat', history: 'Riwayat', certificate: 'Sertifikat', owner: 'Pemilik', edition: 'Edisi 1/1', rarity: 'Kelangkaan', play: 'Buka player', opensea: 'Lihat di OpenSea' },
    exclusive: { title: 'Marketplace eksklusif', lead: 'Hanya di axto.io. Pembayaran hanya koin AXTO. Fee situs 10%.', buyNow: 'Beli sekarang', offer: 'Ajukan penawaran', withdraw: 'Tarik ke wallet', custody: 'Kustodi axto.io' },
    coin: {
      title: 'Koin AXTO', supply: 'Total suplai', price: 'Harga presale', sold: 'Terjual', buyPaypal: 'Beli dengan PayPal', buyUsdc: 'Beli dengan USDC', buyEth: 'Beli dengan ETH',
      split: [['Presale axto.io', '20% · 2.000.000'], ['Tim (rilis 10%/tahun setelah listing DEX)', '30% · 3.000.000'], ['Cadangan DEX', '30% · 3.000.000'], ['Dikunci 5 tahun', '20% · 2.000.000']],
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
    metaDesc: 'AXTO: 8 million living 1/1 digital artworks — clocks, stamps, Qur\'an calligraphy and model figures — in 72-hour auctions starting at $1. Exclusive editions with the AXTO coin.',
    nav: { home: 'Home', auction: 'Auctions', waiting: 'Waiting', exclusive: 'Exclusive', coin: 'AXTO Coin', member: 'Member', connect: 'Connect wallet' },
    hero: {
      kicker: '72-hour auctions · from $1 · no exceptions',
      title: 'Every work is born once.\nNever repeated.',
      lead: 'Four collections of 2,000,000 one-of-one works each, generated from a mathematically unique DNA — clocks that tick, stamps that move, three-dimensional Qur\'an calligraphy, and animated model figures.',
      cta: 'See live auctions',
      cta2: 'Meet the AXTO coin',
      live: 'Live lots', ready: 'Ready', sold: 'Sold', next: 'Next round',
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
        ['Connect your wallet', 'A gas-free signature proves your wallet — that is your membership.'],
        ['Bid from $1', 'Raise 10% automatically or enter any amount. Funds stay in your wallet; they are only held through an allowance.'],
        ['Win, then claim', 'The winner claims on-chain and pays their own gas. The NFT goes straight to your wallet.'],
      ],
    },
    kind: {
      pub: 'Public', ex: 'Exclusive',
      pubShort: 'Public · USDC · OpenSea', exShort: 'Exclusive · AXTO coin',
      pubLong: 'Public collection · paid in USDC · minted on Base & listed on OpenSea → goes straight to your MetaMask wallet after you win',
      exLong: 'Exclusive collection · paid in AXTO coin · kept in axto.io custody → you withdraw (WD) to your wallet yourself and pay the WD gas',
      pubTitle: 'Public collections — already on OpenSea', exTitle: 'Exclusive collections — AXTO coin only',
      pubLead: 'TIME, STAMP, QURAN and MODEL, 2,000,000 one-of-one works each, minted automatically on the Base blockchain and shown on OpenSea. Paid in USDC; after you win you claim and the NFT lands in your MetaMask wallet.',
      exLead: 'EX-TIME, EX-STAMP and EX-QURAN, 50,000 works each, sold only on axto.io and paid only in AXTO coin. Works stay in axto.io custody; whenever you like, withdraw (WD) to your wallet — that is when the work is minted and you pay its gas.',
      opensea: 'View on OpenSea', admin: 'Admin',
      status: { not_produced: 'In production', waiting: 'Waiting for a round — you can make an offer', sealed: 'Sealed — going live soon', live: 'Live', sold: 'Sold', ended: 'Auction ended', claim: 'Awaiting the winner\'s claim' },
    },
    exclusiveBlurb: ['Exclusive Editions', '3 × 50,000 works only on axto.io, paid in AXTO coin and kept safe in axto.io custody until you withdraw them to your wallet.'],
    coinBlurb: ['AXTO Coin', '10,000,000 coins, no burn, a fixed $10 until 2,000,000 are sold. The coin is for NFT transactions on axto.io and cannot be cashed out on axto.io.'],
    faq: {
      title: 'FAQ',
      items: [
        ['What is the starting price?', 'Every lot starts at $1, no exceptions — public and exclusive alike.'],
        ['Who pays gas?', 'The winner pays gas when claiming. Bidding needs no gas.'],
        ['Are my funds moved when I bid?', 'No. Funds stay in your wallet; bids are held through an allowance and released automatically when you are outbid.'],
        ['Is there a resale royalty?', 'Yes, 10% on OpenSea and everywhere else (ERC-2981 + ERC-721C).'],
        ['Is the AXTO coin an investment?', 'No. AXTO is a utility token for NFT transactions on axto.io. No returns are promised.'],
      ],
    },
    auction: { title: 'Live auctions', empty: 'No live lots yet. The next round starts', endsIn: 'Ends in', highest: 'Highest bid', start: 'Starting price', bid: 'Bid', bidAuto: 'Raise 10%', bidMax: 'Maximum bid (proxy)', filter: 'Filter', all: 'All', sortEnding: 'Ending soon', sortHighest: 'Highest bid', sortLowest: 'Lowest bid', round: 'Round', lots: 'lots' },
    waiting: { title: 'Waiting for auction', lead: 'Works that are ready but not yet in a round. You can still make an offer; the highest offers enter a round first.', offers: 'Offers' },
    nft: { traits: 'Traits', history: 'History', certificate: 'Certificate', owner: 'Owner', edition: 'Edition 1/1', rarity: 'Rarity', play: 'Open player', opensea: 'View on OpenSea' },
    exclusive: { title: 'Exclusive marketplace', lead: 'Only on axto.io. Paid in AXTO coin only. 10% site fee.', buyNow: 'Buy now', offer: 'Make an offer', withdraw: 'Withdraw to wallet', custody: 'axto.io custody' },
    coin: {
      title: 'AXTO Coin', supply: 'Total supply', price: 'Presale price', sold: 'Sold', buyPaypal: 'Buy with PayPal', buyUsdc: 'Buy with USDC', buyEth: 'Buy with ETH',
      split: [['axto.io presale', '20% · 2,000,000'], ['Team (10% a year after DEX listing)', '30% · 3,000,000'], ['DEX reserve', '30% · 3,000,000'], ['Locked for 5 years', '20% · 2,000,000']],
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
