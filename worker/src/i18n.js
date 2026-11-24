/**
 * Kamus manual ID/EN (perintah pemilik: jangan auto-translate). IP Indonesia → ID, lainnya → EN; tombol ID/EN menyimpan
 * cookie `lang` satu tahun.
 */
export const LANGS = ['id', 'en'];

export const T = {
  id: {
    htmlLang: 'id-ID',
    siteName: 'AXTO',
    tagline: 'Museum digital hidup — karya bergerak, edisi terbatas',
    metaDesc: 'NFT eksklusif $1 untuk hadiah & komunitas: kaligrafi Al-Qur\'an & hadits, jam digital hidup, prangko & figur di jaringan Base. Bayar koin AXTO, kirim ke banyak wallet tanpa gas, WD satuan atau massal. Pasar member & koleksi publik $1–$10.000 di OpenSea.',
    nav: { home: 'Beranda', exclusive: 'Eksklusif', market: 'Pasar Member', opensea: 'OpenSea', coin: 'Koin AXTO', member: 'Member', connect: 'Hubungkan wallet' },
    hero: {
      kicker: 'Karya hidup di jaringan Base · edisi terbatas · tiga pasar terpisah',
      title: 'Setiap karya lahir sekali.\nTidak pernah diulang.',
      lead: 'Jam digital yang berdetak, prangko yang bergerak, kaligrafi Al-Qur\'an & hadits tiga dimensi dan figur model beranimasi — setiap karya lahir dari DNA matematis unik. Beli edisi eksklusif $1 dengan koin AXTO, jual-beli antar member, atau temukan koleksi publik di OpenSea.',
      cta: 'Belanja edisi eksklusif $1',
      cta2: 'Kenali koin AXTO',
      exWorks: 'Karya eksklusif', exEditions: 'Edisi eksklusif', exSold: 'Edisi terjual', listings: 'Listing pasar member',
    },
    markets: {
      title: 'Tiga pasar, aturan masing-masing',
      ex: ['Marketplace Eksklusif', 'Toko resmi axto.io: 5 koleksi × 10.000 karya, setiap karya 10 edisi, $1 per edisi dengan koin AXTO. Cocok untuk hadiah dan berbagi ke komunitas — kirim ke banyak wallet tanpa gas, lalu tarik (WD) satuan atau massal kapan saja.'],
      mk: ['Pasar Member', 'Member menjual edisi eksklusif miliknya ke member lain dengan harga tetap, lelang, penawaran, atau harga tetap + penawaran. Dibayar koin AXTO; penjual menerima 90%, fee situs 10%.'],
      os: ['Marketplace OpenSea', 'Koleksi publik Jam, Prangko, Kaligrafi Al-Qur\'an, Figur Model & Kaligrafi Hadits. Edisi 1–10 per karya, harga tetap $1–$10.000 menurut kelangkaan, dibeli langsung di OpenSea (jaringan Base).'],
      open: 'Masuk',
    },
    collections: {
      title: 'Lima jenis karya',
      time: ['Jam Hidup', 'Jam digital yang menunjukkan waktu nyata di mana pun ia dipajang — jam tangan, tas, baju, dinding, hingga bentuk yang belum pernah ada.'],
      stamp: ['Prangko Semesta', 'Prangko dari negeri imajiner dengan seluruh tema dunia; sebagian bergerak, yang premium bisa di-zoom sampai planet dan komet.'],
      quran: ['Kaligrafi Al-Qur\'an', 'Setiap ayat, halaman mushaf Utsmani, juz, dan mushaf lengkap dalam kaligrafi 3D, dibacakan qari pilihan dengan penunjuk tiap kata.'],
      model: ['Figur Model', 'Figur beranimasi dalam seri pendidikan, antariksa, dan lainnya — dibuat hanya dengan izin tertulis model.'],
      hadith: ['Kaligrafi Hadits', 'Hadits dari 12 kitab (Bukhari, Muslim, Abu Dawud, Tirmidzi, Nasa\'i, Ibnu Majah, Malik, Ahmad, Darimi, Arba\'in Nawawi, Hadits Qudsi, Arba\'in Dehlawi) dengan nama kitab, bab & nomor hadits; dibacakan suara Arab dan diterjemahkan sesuai bahasa Anda.'],
      open: 'Buka koleksi',
    },
    how: {
      title: 'Cara kerjanya',
      steps: [
        ['Isi saldo koin AXTO', 'Beli koin AXTO ($10/koin) dengan USDT, USDC, BTC atau BNB lewat NOWPayments. Koin masuk ke saldo akun Anda di axto.io.'],
        ['Belanja edisi eksklusif', 'Pilih karya di Marketplace Eksklusif — $1 per edisi (0,1 AXTO), maksimal 10 edisi per karya. Edisi langsung masuk kustodi Anda.'],
        ['Hadiahkan, jual, atau tarik ke wallet', 'Kirim sebagai hadiah ke satu atau banyak wallet (gratis, tanpa gas), jual di Pasar Member (harga tetap, lelang, penawaran), atau tarik (WD) satuan maupun massal — WD massal hemat gas. Setelah ditarik, karya bisa dijual di OpenSea atau marketplace lain.'],
      ],
    },
    kind: {
      pub: 'Publik', ex: 'Eksklusif',
      pubShort: 'Publik · OpenSea', exShort: 'Eksklusif · $1 · koin AXTO',
      pubLong: 'Koleksi publik · edisi 1–10 · harga tetap $1–$10.000 menurut kelangkaan · dibeli di OpenSea (jaringan Base)',
      exLong: 'Koleksi eksklusif · 10 edisi per karya · $1 per edisi, dibayar koin AXTO di axto.io · disimpan di kustodi sampai Anda tarik (WD) ke wallet',
      opensea: 'Lihat di OpenSea', buy: 'Beli di OpenSea', soon: 'Segera hadir di OpenSea', fixed: 'Harga tetap', admin: 'Admin',
    },
    story: {
      kicker: 'Hadiah kecil, makna yang abadi',
      title: 'Satu dolar. Satu karya yang hidup selamanya.',
      lead: 'NFT eksklusif AXTO diciptakan untuk dibagikan. Dengan $1 saja Anda memiliki karya bergerak yang tak pernah punya kembaran — kaligrafi ayat yang dilantunkan qari, hadits penyejuk hati, jam yang berdetak di zona waktu orang tersayang, atau prangko dari negeri imajiner. Sepuluh edisi untuk setiap karya: satu karya yang sama bisa menjadi tanda kebersamaan bagi sepuluh hati.',
      points: [
        ['Hadiah yang bermakna', 'Ulang tahun, wisuda, pernikahan, Ramadan, Idulfitri — hadiahkan ayat pilihan, hadits, atau jam dengan zona waktu orang tersayang. Lebih personal dari kartu ucapan, dan abadi di blockchain.'],
        ['Berbagi untuk komunitas', 'Satu karya untuk satu kelas, majelis, tim, atau komunitas. Kirim ke puluhan wallet sekaligus — gratis, instan, tanpa gas — sebagai identitas bersama yang membanggakan.'],
        ['Murah meriah', 'Hanya $1 per edisi (0,1 AXTO). Belanja di axto.io tanpa biaya gas dan selesai seketika.'],
        ['Mudah ditarik ke wallet', 'Tarik (WD) satuan atau massal ke wallet NFT Anda — satu transaksi per koleksi di jaringan Base yang hemat gas. Setelah itu bebas dipajang, dikirim, atau dijual di OpenSea.'],
      ],
      cta: 'Pilih hadiah pertama Anda',
    },
    tiersTitle: 'Kelangkaan, edisi & harga di OpenSea',
    soonBanner: 'Belum dijual di OpenSea. Kontrak koleksi publik sedang disiapkan; karya di bawah adalah pratinjau. Begitu aktif, setiap karya dijual dengan harga tetap di OpenSea.',
    liveBanner: 'Dijual di OpenSea (jaringan Base) dengan harga tetap. Tombol Beli membuka listing-nya; NFT langsung masuk wallet Anda.',
    faq: {
      title: 'Pertanyaan umum',
      items: [
        ['Berapa harga NFT eksklusif AXTO?', 'Harga tetap $1 per edisi, dibayar koin AXTO (0,1 AXTO pada harga $10/AXTO). Setiap karya eksklusif punya 10 edisi; Anda boleh membeli 1–10 edisi.'],
        ['Berapa harga koleksi publik di OpenSea?', 'Harga tetap menurut kelangkaan: Klasik $1–$10 (9–10 edisi), Langka $15–$75 (6–8 edisi), Epik $100–$400 (4–5 edisi), Legendaris $500–$2.500 (2–3 edisi), Mahakarya $5.000–$10.000 (1 edisi). Dibayar ETH di jaringan Base.'],
        ['Bisakah NFT eksklusif dijadikan hadiah atau dibagikan ke komunitas?', 'Bisa, dan memang untuk itu ia diciptakan. Dari Portal member, kirim edisi ke satu atau banyak alamat wallet sekaligus — gratis, instan, tanpa gas. Saat membeli pun Anda bisa langsung mengisi alamat penerima. Penerima cukup menghubungkan wallet-nya untuk melihat, menjual, atau menarik (WD) karyanya.'],
        ['Apa itu Pasar Member?', 'Tempat member menjual edisi eksklusif miliknya ke member lain: harga tetap, lelang, penawaran, atau harga tetap + penawaran. Dibayar koin AXTO; penjual menerima 90%, fee situs 10%. Tawaran dan penawaran menahan koin dan dikembalikan otomatis bila tidak menang.'],
        ['Bagaimana menarik (WD) NFT ke wallet?', 'Dari Portal member, pilih edisi lalu tarik satuan atau massal. axto.io menerbitkan voucher; Anda mengirim satu transaksi dari wallet (gas di jaringan Base Anda bayar sendiri, WD massal lebih hemat). Setelah ditarik, karya tidak lagi di database axto.io dan dijual di OpenSea atau marketplace lain.'],
        ['Apakah teks Al-Qur\'an diubah?', 'Tidak. Teks disalin apa adanya dari mushaf Utsmani riwayat Hafs (KFGQPC); karya NFT mewakili seni kaligrafinya, bukan hak atas ayat Al-Qur\'an.'],
        ['Apakah ada royalti jual kembali?', 'Ya, 10% (ERC-2981) pada penjualan ulang di OpenSea dan marketplace lain.'],
        ['Apakah koin AXTO investasi?', 'Bukan. AXTO adalah token utilitas untuk transaksi NFT di axto.io. Tidak ada janji keuntungan.'],
      ],
    },
    exclusive: { title: 'Marketplace Eksklusif axto.io', lead: 'Toko resmi axto.io: 5 koleksi × 10.000 karya, setiap karya 10 edisi. Harga tetap $1 per edisi, dibayar koin AXTO — hadiah kecil yang bermakna, mudah dibagikan ke banyak wallet, dan bisa ditarik (WD) satuan atau massal. Tanpa lelang di toko ini; lelang dan penawaran ada di Pasar Member.', price: 'Harga per edisi', left: 'Sisa edisi', buy: 'Beli dengan koin AXTO', qty: 'Jumlah edisi', soldOut: 'Habis', needCoins: 'Isi saldo koin AXTO', custody: 'Edisi disimpan di kustodi axto.io sampai Anda tarik (WD) ke wallet.', works: 'karya', editions: 'edisi', sold: 'terjual' },
    market: { title: 'Pasar Member', lead: 'Jual-beli edisi eksklusif antar member dengan koin AXTO. Penjual memilih: harga tetap, lelang, penawaran, atau harga tetap + penawaran. Penjual menerima 90%, fee situs 10%. Karya yang sudah ditarik (WD) ke wallet tidak bisa dijual di sini.', empty: 'Belum ada listing. Beli edisi di Marketplace Eksklusif, lalu jual dari Portal member.', modes: { fixed: 'Harga tetap', auction: 'Lelang', offer: 'Penawaran', fixed_offer: 'Harga tetap + penawaran' }, all: 'Semua', sort: { new: 'Terbaru', ending: 'Segera berakhir', low: 'Harga terendah', high: 'Harga tertinggi' }, buy: 'Beli', bid: 'Tawar', offer: 'Ajukan penawaran', endsIn: 'Berakhir dalam', top: 'Tawaran tertinggi', start: 'Harga awal', price: 'Harga per edisi', min: 'Penawaran minimum', left: 'tersedia', seller: 'Penjual' },
    opensea: { title: 'Marketplace OpenSea', lead: 'Koleksi publik AXTO di jaringan Base: Jam Hidup, Prangko Semesta, Kaligrafi Al-Qur\'an, Figur Model dan Kaligrafi Hadits. Setiap koleksi 10 juta karya, ditambah kembaran seri G- (versi lukisan GPU) — 100 juta karya. Setiap karya terbit 1–10 edisi — makin langka makin sedikit — dengan harga tetap $1–$10.000; edisi berikutnya muncul otomatis begitu edisi sebelumnya terjual. Pembelian terjadi langsung di OpenSea; axto.io hanya menampilkan.', gpu: 'Karya GPU (seri G-)', gpuNone: 'Belum ada karya G- di koleksi ini. Karya yang dibuat dengan GPU diberi nomor seri berawalan G- dan tampil di sini begitu produksinya selesai.' },
    nft: { traits: 'Sifat', history: 'Riwayat', certificate: 'Sertifikat', owner: 'Pemilik', edition: 'Edisi', editionOf: 'edisi', rarity: 'Kelangkaan', play: 'Buka player', opensea: 'Lihat di OpenSea' },
    coin: {
      title: 'Koin AXTO', supply: 'Total suplai', price: 'Harga presale', sold: 'Terjual',
      split: [['Presale axto.io ($10)', '20% · 20.000.000'], ['Likuiditas DEX (setelah presale ditutup atau 365 hari)', '30% · 30.000.000'], ['Cadangan jangka panjang (5 tahun)', '30% · 30.000.000'], ['Perusahaan', '20% · 20.000.000']],
      disclaimer: 'AXTO adalah token utilitas untuk transaksi NFT di axto.io, bukan produk investasi dan tidak dijamin nilainya. Pencairan hanya ke alamat & mata uang pembelian, dipotong 50% sebelum koin dirilis ke DEX. Pastikan Anda memahami risikonya dan aturan di negara Anda.',
    },
    coinBlurb: ['Koin AXTO', '100.000.000 koin, tanpa burn, harga tetap $10 sampai 20.000.000 terjual. Beli dengan USDT, USDC, BTC atau BNB lewat NOWPayments; bisa dicairkan kembali ke alamat pembelian (dipotong 50% sebelum rilis DEX).'],
    member: { title: 'Portal member', connectFirst: 'Hubungkan wallet dan tanda tangani pesan masuk terlebih dahulu.', profile: 'Profil', email: 'Email', username: 'Nama pengguna', password: 'Kata sandi', save: 'Simpan', logout: 'Keluar', balance: 'Saldo' },
    admin: { title: 'Portal admin', denied: 'Hanya wallet admin.' },
    verify: { title: 'Verifikasi karya', ok: 'Karya asli AXTO', hash: 'Sidik DNA' },
    footer: { rights: 'Hak cipta karya tetap milik AXTO. Pemilik token boleh memajang karya untuk penggunaan pribadi dan promosi.', terms: 'Ketentuan', privacy: 'Privasi', contact: 'Kontak' },
    errors: { notFound: 'Halaman tidak ditemukan', back: 'Kembali ke beranda' },
    langSwitch: 'English',
  },
  en: {
    htmlLang: 'en',
    siteName: 'AXTO',
    tagline: 'A living digital museum — moving works, limited editions',
    metaDesc: '$1 exclusive NFTs for gifts & communities: Qur\'an & hadith calligraphy, living digital clocks, stamps & figures on Base. Pay in AXTO coin, send to many wallets with no gas, withdraw one by one or in bulk. A member market & public collections from $1 to $10,000 on OpenSea.',
    nav: { home: 'Home', exclusive: 'Exclusive', market: 'Member Market', opensea: 'OpenSea', coin: 'AXTO Coin', member: 'Member', connect: 'Connect wallet' },
    hero: {
      kicker: 'Living works on Base · limited editions · three separate markets',
      title: 'Every work is born once.\nNever repeated.',
      lead: 'Clocks that tick, stamps that move, three-dimensional Qur\'an & hadith calligraphy and animated model figures — every work is born from a mathematically unique DNA. Buy $1 exclusive editions with AXTO coin, trade with other members, or find the public collections on OpenSea.',
      cta: 'Shop $1 exclusive editions',
      cta2: 'Meet the AXTO coin',
      exWorks: 'Exclusive works', exEditions: 'Exclusive editions', exSold: 'Editions sold', listings: 'Member market listings',
    },
    markets: {
      title: 'Three markets, each with its own rules',
      ex: ['Exclusive Marketplace', 'The official axto.io shop: 5 collections × 10,000 works, 10 editions each, $1 per edition in AXTO coin. Made for gifts and for sharing with a community — send to many wallets with no gas, then withdraw (WD) one by one or in bulk whenever you like.'],
      mk: ['Member Market', 'Members sell the exclusive editions they own to other members at a fixed price, by auction, by offer, or fixed price + offers. Paid in AXTO coin; the seller receives 90%, the site fee is 10%.'],
      os: ['OpenSea Marketplace', 'The public Clock, Stamp, Qur\'an Calligraphy, Model Figure & Hadith Calligraphy collections. 1–10 editions per work, fixed prices from $1 to $10,000 by rarity, bought directly on OpenSea (Base network).'],
      open: 'Enter',
    },
    collections: {
      title: 'Five kinds of works',
      time: ['Living Clocks', 'Digital clocks that tell the real time wherever they are shown — wristwatches, bags, apparel, walls and shapes never seen before.'],
      stamp: ['Stamps of the Realms', 'Stamps from imaginary nations across every theme; some move, and premium ones zoom down to planets and comets.'],
      quran: ['Qur\'an Calligraphy', 'Every ayah, every Uthmani mushaf page, every juz and the complete mushaf in 3D calligraphy, recited by the reciter of your choice with word-by-word highlighting.'],
      model: ['Model Figures', 'Animated figures in education, space and other series — made only with the model\'s written consent.'],
      hadith: ['Hadith Calligraphy', 'Hadith from 12 collections (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa\'i, Ibn Majah, Malik, Ahmad, Darimi, Nawawi\'s Forty, Hadith Qudsi, Dehlawi\'s Forty) with collection, book and hadith number; read aloud in Arabic and translated into your language.'],
      open: 'Open collection',
    },
    how: {
      title: 'How it works',
      steps: [
        ['Top up AXTO coins', 'Buy AXTO coins ($10 per coin) with USDT, USDC, BTC or BNB through NOWPayments. Coins land in your axto.io account balance.'],
        ['Shop exclusive editions', 'Pick a work in the Exclusive Marketplace — $1 per edition (0.1 AXTO), up to 10 editions per work. Editions go straight into your custody.'],
        ['Gift, sell, or withdraw to your wallet', 'Send it as a gift to one or many wallets (free, no gas), sell it in the Member Market (fixed price, auction, offers), or withdraw (WD) one by one or in bulk — bulk WD saves gas. Once withdrawn, the work can be sold on OpenSea or other marketplaces.'],
      ],
    },
    kind: {
      pub: 'Public', ex: 'Exclusive',
      pubShort: 'Public · OpenSea', exShort: 'Exclusive · $1 · AXTO coin',
      pubLong: 'Public collection · 1–10 editions · fixed prices from $1 to $10,000 by rarity · bought on OpenSea (Base network)',
      exLong: 'Exclusive collection · 10 editions per work · $1 per edition, paid in AXTO coin on axto.io · kept in custody until you withdraw (WD) to your wallet',
      opensea: 'View on OpenSea', buy: 'Buy on OpenSea', soon: 'Coming to OpenSea soon', fixed: 'Fixed price', admin: 'Admin',
    },
    story: {
      kicker: 'A small gift, a lasting meaning',
      title: 'One dollar. One work that lives forever.',
      lead: 'AXTO exclusive NFTs are made to be shared. For just $1 you own a moving work that has no twin — an ayah in calligraphy recited by a qari, a hadith that soothes the heart, a clock ticking in a loved one’s time zone, or a stamp from an imaginary realm. Ten editions of every work: the very same piece can become a bond shared by ten hearts.',
      points: [
        ['A gift that means something', 'Birthdays, graduations, weddings, Ramadan, Eid — give a chosen ayah, a hadith, or a clock set to a loved one’s time zone. More personal than a greeting card, and lasting on the blockchain.'],
        ['Shared by a community', 'One work for a class, a study circle, a team or a community. Send it to dozens of wallets at once — free, instant, no gas — as an identity you share with pride.'],
        ['Affordable for everyone', 'Just $1 per edition (0.1 AXTO). Shopping on axto.io costs no gas and completes instantly.'],
        ['Easy to withdraw', 'Withdraw (WD) one by one or in bulk to your NFT wallet — one transaction per collection on the low-gas Base network. Then display it, send it, or sell it on OpenSea.'],
      ],
      cta: 'Choose your first gift',
    },
    tiersTitle: 'Rarity, editions & prices on OpenSea',
    soonBanner: 'Not on sale on OpenSea yet. The public collection contracts are being prepared; the works below are a preview. Once live, every work is sold at a fixed price on OpenSea.',
    liveBanner: 'On sale on OpenSea (Base network) at fixed prices. The Buy button opens its listing; the NFT lands in your wallet right away.',
    faq: {
      title: 'FAQ',
      items: [
        ['How much is an AXTO exclusive NFT?', 'A fixed $1 per edition, paid in AXTO coin (0.1 AXTO at $10 per AXTO). Every exclusive work has 10 editions; you may buy 1 to 10.'],
        ['How much are the public collections on OpenSea?', 'Fixed prices by rarity: Classic $1–$10 (9–10 editions), Rare $15–$75 (6–8 editions), Epic $100–$400 (4–5 editions), Legendary $500–$2,500 (2–3 editions), Masterpiece $5,000–$10,000 (1 edition). Paid in ETH on the Base network.'],
        ['Can an exclusive NFT be a gift or be shared with a community?', 'Yes — that is what it was made for. From the Member portal, send editions to one or many wallet addresses at once — free, instant, no gas. You can even enter the recipient right when you buy. Recipients just connect their wallet to view, sell, or withdraw (WD) the work.'],
        ['What is the Member Market?', 'Where members sell the exclusive editions they own to other members: fixed price, auction, offers, or fixed price + offers. Paid in AXTO coin; the seller receives 90%, the site fee is 10%. Bids and offers hold coins and are returned automatically if they do not win.'],
        ['How do I withdraw (WD) an NFT to my wallet?', 'From the Member portal, pick editions and withdraw one by one or in bulk. axto.io issues a voucher; you send one transaction from your wallet (you pay the Base gas, bulk WD is cheaper). Once withdrawn, the work is no longer in the axto.io database and is sold on OpenSea or other marketplaces.'],
        ['Is the Qur\'an text changed?', 'No. The text is reproduced exactly from the Uthmani Hafs mushaf (KFGQPC); the NFT represents the calligraphy artwork, not any right over the verses.'],
        ['Is there a resale royalty?', 'Yes, 10% (ERC-2981) on resales on OpenSea and other marketplaces.'],
        ['Is the AXTO coin an investment?', 'No. AXTO is a utility token for NFT transactions on axto.io. No returns are promised.'],
      ],
    },
    exclusive: { title: 'axto.io Exclusive Marketplace', lead: 'The official axto.io shop: 5 collections × 10,000 works, 10 editions each. A fixed $1 per edition, paid in AXTO coin — a small gift with real meaning, easy to share with many wallets, and withdrawable (WD) one by one or in bulk. No auctions in this shop; auctions and offers live in the Member Market.', price: 'Price per edition', left: 'Editions left', buy: 'Buy with AXTO coin', qty: 'Editions', soldOut: 'Sold out', needCoins: 'Top up AXTO coins', custody: 'Editions stay in axto.io custody until you withdraw (WD) them to your wallet.', works: 'works', editions: 'editions', sold: 'sold' },
    market: { title: 'Member Market', lead: 'Members trade exclusive editions with AXTO coin. Sellers choose: fixed price, auction, offers, or fixed price + offers. The seller receives 90%, the site fee is 10%. Works withdrawn (WD) to a wallet cannot be sold here.', empty: 'No listings yet. Buy editions in the Exclusive Marketplace, then sell from the Member portal.', modes: { fixed: 'Fixed price', auction: 'Auction', offer: 'Offers', fixed_offer: 'Fixed price + offers' }, all: 'All', sort: { new: 'Newest', ending: 'Ending soon', low: 'Lowest price', high: 'Highest price' }, buy: 'Buy', bid: 'Bid', offer: 'Make an offer', endsIn: 'Ends in', top: 'Highest bid', start: 'Starting price', price: 'Price per edition', min: 'Minimum offer', left: 'available', seller: 'Seller' },
    opensea: { title: 'OpenSea Marketplace', lead: 'The public AXTO collections on the Base network: Living Clocks, Stamps of the Realms, Qur\'an Calligraphy, Model Figures and Hadith Calligraphy — 10 million works each, plus their G- series twins (the GPU-painted versions): 100 million works. Every work is issued in 1–10 editions — the rarer, the fewer — at fixed prices from $1 to $10,000; the next edition appears automatically as soon as the previous one sells. Purchases happen directly on OpenSea; axto.io only displays them.', gpu: 'GPU works (G- series)', gpuNone: 'No G- works in this collection yet. Works made with GPUs carry a serial starting with G- and appear here once their production is done.' },
    nft: { traits: 'Traits', history: 'History', certificate: 'Certificate', owner: 'Owner', edition: 'Edition', editionOf: 'editions', rarity: 'Rarity', play: 'Open player', opensea: 'View on OpenSea' },
    coin: {
      title: 'AXTO Coin', supply: 'Total supply', price: 'Presale price', sold: 'Sold',
      split: [['axto.io presale ($10)', '20% · 20,000,000'], ['DEX liquidity (after the presale closes or 365 days)', '30% · 30,000,000'], ['Long-term reserve (5 years)', '30% · 30,000,000'], ['Company', '20% · 20,000,000']],
      disclaimer: 'AXTO is a utility token for NFT transactions on axto.io. It is not an investment product and its value is not guaranteed. Cash-outs go only to your purchase address & currency, reduced by 50% before the DEX release. Make sure you understand the risks and the rules in your country.',
    },
    coinBlurb: ['AXTO Coin', '100,000,000 coins, no burn, a fixed $10 until 20,000,000 are sold. Buy with USDT, USDC, BTC or BNB through NOWPayments; cash out back to your purchase address (50% reduction before the DEX release).'],
    member: { title: 'Member portal', connectFirst: 'Connect your wallet and sign the sign-in message first.', profile: 'Profile', email: 'Email', username: 'Username', password: 'Password', save: 'Save', logout: 'Sign out', balance: 'Balance' },
    admin: { title: 'Admin portal', denied: 'Admin wallet only.' },
    verify: { title: 'Verify a work', ok: 'Genuine AXTO work', hash: 'DNA fingerprint' },
    footer: { rights: 'Copyright of the artwork remains with AXTO. Token holders may display the work for personal and promotional use.', terms: 'Terms', privacy: 'Privacy', contact: 'Contact' },
    errors: { notFound: 'Page not found', back: 'Back to home' },
    langSwitch: 'Bahasa Indonesia',
  },
};

/** Path per bahasa (slug dalam bahasa masing-masing). */
export const PATHS = {
  exclusive: { id: 'eksklusif', en: 'exclusive' },
  market: { id: 'pasar-member', en: 'member-market' },
  opensea: { id: 'opensea', en: 'opensea' },
  coin: { id: 'koin', en: 'coin' },
  member: { id: 'member', en: 'member' },
  admin: { id: 'admin', en: 'admin' },
  verify: { id: 'verifikasi', en: 'verify' },
};

/** Alamat lama (sebelum desain akhir 23 Nov 2026) → halaman baru (301). */
export const LEGACY = { galeri: 'opensea', gallery: 'opensea', lelang: 'market', auctions: 'market', menunggu: 'exclusive', waiting: 'exclusive' };

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
