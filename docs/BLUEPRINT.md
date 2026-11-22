# AXTO — Blueprint Induk (axto.io)

Versi 1.0 · 21 Nov 2026 · Bahasa kerja: Indonesia. Dokumen ini adalah **satu-satunya sumber kebenaran** untuk
pembangunan axto.io, mesin produksi NFT, lelang, koin AXTO, dan portal member/admin. Setiap perubahan perintah pemilik
dicatat di §1 dan diperiksa ulang lewat §2 sebelum kode diubah.

Tanda status di §18: `[x]` selesai dan teruji di repo · `[~]` kode ada, belum diuji di lingkungan nyata ·
`[ ]` belum · `[P]` butuh tindakan pemilik (kunci, dana gas, akun, legal).

---

## 0. Ringkasan satu halaman

| Bagian | Keputusan final |
|---|---|
| Domain | **axto.io** (sementara jalan di `*.workers.dev`; domain otomatis terpasang saat zona axto.io masuk Cloudflare) |
| Repo | `p2nshooter/axto` (situs, engine, kontrak) · `p2nshooter/coinaxto` (privat, vault koin tanpa domain) · `ulyah.com` hanya sumber aset (Al-Qur'an, potret model luaja) |
| Jaringan | **Base** (EVM L2, didukung OpenSea, gas murah). Alamat admin/treasury sama di semua EVM (Ethereum, Base, Arbitrum, OP, Polygon, Linea, BNB, Monad) |
| Koleksi publik (terhubung OpenSea) | **TIME** (jam digital hidup), **STAMP** (prangko), **QURAN** (kaligrafi), **MODEL** (figur model) — masing-masing **2.000.000** NFT 1/1 → total **8.000.000** |
| Koleksi eksklusif (hanya axto.io, bayar AXTO) | **EX-TIME, EX-STAMP, EX-QURAN** — masing-masing **50.000** NFT 1/1 → total **150.000** |
| Supply per karya | **1** (ERC-721, 1/1). Satu desain = satu token = satu pemilik, tidak pernah dicetak ulang |
| Penjualan | **Semua lewat lelang 72 jam** (English auction) di axto.io. OpenSea sudah menghapus English auction (OS2), jadi lelang berjalan di axto.io dan diselesaikan on-chain; NFT yang sudah diklaim tampil & diperdagangkan di OpenSea |
| Ukuran ronde | **10% dari stok siap** per koleksi, ronde 72 jam bersambung tanpa jeda; jumlah lot **dikunci 1 jam sebelum live** |
| Harga mulai | **$1 untuk semua lelang, tanpa kecuali** (publik, eksklusif, AXTO); tier = label kelangkaan saja (#26) |
| Kenaikan | Otomatis **+10%** (tombol & proxy-bid); manual bebas asal > tawaran tertinggi |
| Dana tawaran | **Tetap di wallet member** (allowance ERC-20). Hold dihitung sistem; outbid → hold dilepas; saldo kurang → ditolak |
| Gas | **Ditanggung pemenang/pembeli** (pemenang mengirim transaksi klaim). Produksi & listing: **$0** (lazy mint) |
| Royalti jual kembali | **10%** (ERC-2981) + kait **ERC-721C** agar bisa ditegakkan di OpenSea |
| Fee marketplace eksklusif | **10%** untuk axto.io (hanya transaksi antarmember sebelum WD) |
| Koin | **AXTO**, ERC-20 di Base, supply **10.000.000**, **tanpa burn, tanpa mint tambahan** |
| Pembagian koin | 20% (2 jt) dijual di axto.io @ **$10 stabil** sampai habis · 30% (3 jt) cadangan DEX, listing mulai **$10** · 30% (3 jt) tim, rilis **10%/tahun** setelah listing DEX · 20% (2 jt) **dikunci 5 tahun** |
| Pembayaran | PayPal (top-up AXTO, webhook terverifikasi) · USDC/ETH dari wallet mana pun (MetaMask, Trust Wallet) · lelang publik dibayar USDC, lelang eksklusif dibayar AXTO |
| Penyimpanan | NFT publik **tanpa R2** (generatif: metadata & gambar dihitung dari tokenId). Data member/lelang/eksklusif: **R2 saja (tidak pernah D1)**, Durable Object hanya koordinator |
| Bahasa | IP Indonesia → **Bahasa Indonesia penuh**, selain itu **Inggris**; bisa diganti manual. Terjemahan manual, bukan mesin |
| Operasi | **Zero-hand**: cron + GitHub Actions + Durable Object; admin hanya memantau & tombol darurat |

---

## 1. Rekap perintah pemilik (urutan kronologis → keputusan final)

Perintah yang lebih baru **menggantikan** yang lama bila bertentangan.

| # | Perintah | Status |
|---|---|---|
| 1 | Jam digital hidup dalam semua bentuk (jam tangan, tas, baju, dinding, bentuk baru) | **Berlaku** (katalog bentuk §4.1) |
| 2 | Engine GitHub otomatis, push OpenSea, website menarik dari OpenSea, lelang terjadwal | **Berlaku, disesuaikan**: OpenSea OS2 tidak punya lelang → lelang di axto.io; website membaca chain + ledger sendiri, OpenSea dipakai untuk pasar sekunder & statistik (§13) |
| 3 | Fee jual kembali 10% di OpenSea dan di mana pun | **Berlaku**: ERC-2981 10% + ERC-721C (OpenSea hanya menegakkan royalti untuk kontrak ERC-721C) |
| 4 | Hanya pemilik yang bisa mengeluarkan NFT | **Berlaku**: mint hanya lewat AuctionHouse/voucher bertanda tangan signer yang ditunjuk owner (§9) |
| 5 | NFT langsung ke wallet tanpa R2 | **Berlaku untuk koleksi publik** (generatif). Eksklusif tetap di R2 selama belum terjual/belum WD (perintah #22) |
| 6 | Premium bisa di-zoom tanpa pecah (peta dunia, galaksi) | **Berlaku**: renderer vektor/prosedural, zoom tak terbatas tanpa piksel (§4.2) |
| 7 | Prangko seluruh dunia & seluruh tema, sebagian bergerak | **Berlaku**: negara/semesta **imajiner** (bukan lambang negara asli, lihat §16) |
| 8 | Supply 5–10 / 1–5, lalu 20 di $2 | **Diganti** oleh #13 dan #24 (1/1) |
| 9 | ascan.es khusus Al-Qur'an, kaligrafi 3D, per ayat/halaman/juz/mushaf, bacaan imam, penunjuk kata | **Berlaku**, domain → axto.io (#14, #16) |
| 10 | Alamat sama di Linea/Arbitrum/BNB/Base/Monad/OP/Polygon | **Berlaku** |
| 11 | wherem.com | **Diganti** → ascan.es → **axto.io** |
| 12 | Model wajah dari luaja.com, ±1000 model, seri pendidikan/antariksa | **Berlaku dengan syarat izin tertulis** (§16.2). Stok akhir 2 jt (#24) |
| 13 | Setiap karya supply 1, harga contoh $100–$500 jam, $50–$300 prangko | **Diganti sebagian**: supply 1 tetap; harga ditentukan lelang dengan start #24 |
| 14 | Lazy minting, biaya nol, bebas R2, produksi 24 jam | **Berlaku** (§5, §15) |
| 15 | Domain axto.io, koin AXTO, PayPal, portal member | **Berlaku** |
| 16 | Koin: 10 jt, $10, tanpa burn, tim 30% (10%/thn), DEX 3 jt, kunci 20% 5 thn | **Berlaku** |
| 17 | Edisi khusus 3 × 50.000 dibayar AXTO, hanya axto.io, WD dengan fee member, marketplace BN/BID/auction fee 10% | **Berlaku** (§7) |
| 18 | Koin tidak bisa diuangkan, hanya untuk transaksi NFT | **Berlaku sebagai kebijakan axto.io** (tidak ada fitur tukar ke uang). Catatan: setelah listing DEX, token tetap bisa diperdagangkan di DEX — itu sifat token publik (§8.4) |
| 19 | Repo axto; coinaxto privat, worker tanpa domain | **Berlaku** (§3, §12) |
| 20 | Pakai kunci OpenSea akun `axto-io` (rate limit 120/60/60 per menit) | **Berlaku** (§13); kunci lama di chat **wajib diputar ulang** |
| 21 | Semua penjualan lelang 72 jam | **Berlaku** |
| 22 | Ronde 2000 NFT start $1 | **Diganti**: ukuran ronde oleh #24 (10% stok siap); start $1 kembali berlaku lewat #26 |
| 23 | Harga koin berjenjang rahasia 10/15/20/25/30 | **Dibatalkan pemilik** → stabil $10 sampai 2 jt terjual, DEX mulai $10 |
| 24 | Start $5–$100 sesuai keunikan, +10% otomatis, manual bebas, ronde 10% stok siap, kunci jumlah 1 jam sebelum live, 2 jt per koleksi (jam, prangko, Qur'an, model) | **Berlaku, kecuali harga start** → diganti #26 |
| 26 | „Auction star $1 semuanya tanpa kecuali" | **Berlaku (final)**: semua lot mulai $1 (USDC) / setara $1 dalam AXTO; tier tetap sebagai label kelangkaan & penentu fitur player |
| 27 | AdSense: hanya 3 akun, juga di axto.io (6560360898389273, 4906992051458194, 5928074389292014) | **Berlaku** (§10.5) |
| 28 | (22 Nov 2026) axto.io sebelumnya dipakai dashboard AXTO (repo guardian-ai, Pages `axto-dashboard`); pemilik memilih **„Ganti axto.io“** | **Berlaku**: worker `axto-web` memegang axto.io & www.axto.io; dashboard tetap di `axto-dashboard.pages.dev`. Bucket NFT dipisah: `axto-nft-data` (bucket `axto-data` milik dashboard tidak disentuh). Deploy lewat jembatan `deploy-axto-io.yml` di repo ulyah.com (memakai secret Cloudflare yang sudah ada) sampai repo axto punya secret sendiri |
| 29 | (22 Nov 2026) Wallet admin `0x38Cd3F76a132f70b12C9E4ea6aDAFaCF62483166`: „seluruh NFT hanya di produksi dr alamat itu“; koin AXTO di wallet `0x6918A3C9a58E71B3bca993e8cDD2630D2DDB6469` | **Berlaku**: owner AuctionHouse + 7 koleksi = admin (satu-satunya yang menunjuk minter/signer); owner AxtoToken + AxtoSale = wallet koin (10 jt dicetak ke sana, vesting tim ke sana). Deploy lewat tombol 3 fase di portal admin (`/id/admin`), hasil diverifikasi on-chain sebelum dipakai |
| 25 | Gas ditanggung pemenang | **Berlaku** |

---

## 2. Pemeriksaan logika — tiga putaran

### Putaran 1 — konflik antar-perintah

1. **"Lelang wajib tampil di OpenSea" vs OpenSea OS2 tanpa lelang & token belum ada sebelum di-mint.**
   OpenSea hanya menampilkan token yang sudah ada on-chain dan tidak lagi punya format English auction.
   → Lelang berjalan di axto.io dan diselesaikan oleh kontrak `AxtoAuctionHouse`. Dua mode, dipilih per koleksi:
   - `lazy` (default, biaya $0): token di-mint saat pemenang klaim → langsung muncul di OpenSea, royalti 10% berlaku.
   - `premint` (opsional): lot ronde di-mint massal ke kontrak AuctionHouse sebelum live sehingga tampil di OpenSea
     dengan metadata status "Live auction di axto.io". Biaya ±US$0,02–0,05 per 1.000 token di Base (ERC721A-style),
     dibayar dompet keeper. Dinyalakan dengan `PREMINT_<KOLEKSI>=1`.
2. **"Dana ditahan di wallet member sendiri" vs "hanya saldo cukup yang boleh menawar".**
   → Model *allowance*: member memberi izin (approve/permit) USDC atau AXTO ke AuctionHouse; dana **tidak pindah**.
   Sistem menghitung `tersedia = min(saldo, allowance) − total hold aktif member` saat menawar, dan memeriksa ulang
   saat pemenang klaim. Bila pemenang ternyata kosong → hak beli turun ke penawar berikutnya (cascade, §6.6).
3. **"Gas ditanggung pemenang" vs "zero-hand".** → Pemenang sendiri mengirim `claim()`; sistem tidak perlu dompet
   panas untuk menyelesaikan lelang. Cron hanya mengatur jendela klaim dan cascade.
4. **"Koin tidak bisa diuangkan" vs "dijual di DEX".** → axto.io tidak pernah membeli kembali/menukar ke uang.
   Sebelum listing DEX, transfer antar-pengguna dikunci (hanya boleh ke/dari kontrak resmi). Setelah `enableTrading()`
   (satu arah, tidak bisa dimatikan lagi — anti-honeypot) token bebas seperti token publik lain.
5. **"Hanya pemilik yang bisa mint" vs "zero-hand mint otomatis".** → Owner (MetaMask admin) tetap pemilik kontrak.
   Owner menunjuk satu alamat **signer** yang kuncinya hanya ada di vault (coinaxto). Signer hanya bisa menandatangani
   voucher/attestasi; tidak bisa memindahkan dana, mengubah owner, atau mint melebihi `maxSupply`. Owner bisa
   mengganti/mencabut signer kapan saja.
6. **"R2 saja, tidak pernah D1" (aturan tetap pemilik) vs lelang real-time.** → Durable Object (bukan D1) menjadi
   pengunci urutan tawaran; setiap kejadian ditulis ke **log R2** (sumber kebenaran) dan snapshot R2. KV hanya cache.
7. **"Eksklusif tidak dijual di OpenSea" vs "bisa WD ke OpenSea".** → Selama di kustodi axto.io, eksklusif tidak
   di-mint (tidak ada di chain). Setelah WD, member memegang ERC-721 biasa; jika member sendiri menjual di OpenSea,
   royalti 10% berlaku. axto.io tidak pernah me-listing eksklusif di OpenSea.

### Putaran 2 — kasus tepi & kegagalan

1. **Penghitung stok harus kuat.** Satu Durable Object `Ledger` per koleksi (single-threaded, transaksional) memegang
   `produced`, `ready`, `inRound`, `sold`; nomor token dibagikan berurutan → tidak bisa ganda. Desain unik dijamin
   matematis: indeks → permutasi Feistel → kombinasi sifat (bijektif), jadi **tidak mungkin ada dua NFT kembar** (§4.0).
2. **Produksi gagal di tengah jalan.** Batch atomik dengan checkpoint. GitHub Actions mengambil `produced` dari
   ledger, membuat batch `[produced, produced+n)`, menjalankan QA, lalu commit. Gagal → tidak ada yang tercatat;
   run berikutnya **melanjutkan** dari checkpoint yang sama (tidak mulai dari nol). Commit idempoten (batch id + root
   hash): commit ganda dengan isi sama dianggap sukses, isi beda ditolak.
3. **Jumlah lot dikunci 1 jam sebelum live.** Cron tiap menit: pada `start − 60 menit`, ledger menyegel ronde:
   `lot = floor(ready × 10%)` (min 1 bila ready > 0, maks `ROUND_CAP` = 20.000/koleksi untuk menjaga batas sistem),
   daftar token dibekukan, ditandatangani vault, ditulis ke R2. Stok yang selesai diproduksi setelah segel masuk ronde
   berikutnya.
4. **Ronde bersambung.** `start(k) = genesis + k × 72 jam`. Perpanjangan anti-sniping per lot (+10 menit bila ada
   tawaran di 10 menit terakhir, maksimum +60 menit) tidak menggeser jadwal ronde berikutnya.
5. **Tidak ada penawar.** Lot kembali ke antrean "menunggu" dengan posisi depan; tidak dicetak ulang, tidak dihapus.
6. **Penawaran di stok menunggu.** Member boleh menawar NFT yang belum masuk ronde mulai dari harga start-nya; hold
   sama seperti lelang. Saat segel, NFT dengan penawaran tertinggi didahulukan masuk ronde dan penawaran itu menjadi
   tawaran pembuka.
7. **Reorg/RPC lambat.** Pemeriksaan saldo memakai `eth_call` di blok `latest` + cache 15 detik; klaim on-chain tetap
   memverifikasi ulang (`transferFrom` gagal → revert, cascade).
8. **PayPal chargeback.** Koin dari PayPal dikirim sebagai voucher klaim; dispute yang dibuka sebelum klaim membatalkan
   voucher (`cancelVoucher`). Setelah klaim, member diblokir dari lelang sampai dispute selesai.
9. **Signer bocor.** Batas harian on-chain (`dailyCap`) di AxtoSale, owner bisa `pause()` dan `setSigner()`.
   Attestasi lelang mengikat `lotId, tokenId, harga, pemenang, deadline` + tanda tangan penawar (EIP-712) sehingga
   signer tidak bisa memalsukan tawaran member.

### Putaran 3 — keamanan, biaya, hukum

1. Kunci OpenSea & PayPal yang pernah dikirim lewat chat dianggap bocor → **putar ulang** dan simpan hanya di
   GitHub Secrets / Cloudflare secrets.
2. "Biaya nol" yang jujur: produksi & listing $0; mint & gas dibayar pembeli; Cloudflare gratis cukup untuk tahap awal
   (lihat §15 untuk batasnya); paket Workers Paid $5/bulan disarankan saat trafik naik.
3. Koin yang dipromosikan sebagai "investasi" berisiko dianggap penawaran efek/investasi ilegal (OJK di Indonesia,
   SEC di AS). Materi promosi di `docs/PROMOSI.md` sengaja ditulis sebagai **utilitas** (akses lelang eksklusif) tanpa
   janji keuntungan. PayPal mensyaratkan persetujuan khusus untuk transaksi kripto → fitur PayPal-ke-koin memakai
   saklar `PAYPAL_COIN_SALE=1` dan hanya dinyalakan setelah persetujuan PayPal (§16.3).
4. Model wajah asli: hanya diproduksi bila ada izin tertulis model (dan wali bila di bawah 18 tahun). Tanpa berkas izin,
   koleksi MODEL otomatis berhenti di QA (§16.2).
5. Al-Qur'an: teks Uthmani dari dataset berlisensi CC BY 4.0 (salinan tanpa perubahan + atribusi), tanpa musik, tanpa
   gambar makhluk bernyawa. Yang dijual adalah karya seni dan token koleksinya, **bukan** hak atas ayat (§16.1).

Semua temuan di atas sudah tercermin di bagian-bagian berikut.

---

## 3. Arsitektur

```
                     ┌──────────────── GitHub (p2nshooter/axto) ────────────────┐
                     │  engine/ (generator deterministik, renderer, QA)          │
                     │  .github/workflows/engine.yml  ← cron tiap jam            │
                     │  .github/workflows/deploy.yml  ← push main / manual       │
                     └──────────────┬───────────────────────────────────────────┘
                                    │ commit batch (HMAC)            deploy (wrangler)
                                    ▼
 Pengunjung ──► axto.io  ═══ Worker "axto-web" (publik) ═══════════════════════════════
                 │  halaman ID/EN, SEO, banner, portal member/admin, API metadata
                 │  /api/meta, /img/*.svg, /play/* (animation_url) ← generatif, tanpa R2
                 │  Durable Objects: Ledger (stok), Round (lelang per ronde)
                 │  R2 "axto-nft-data": log, dokumen member, kustodi eksklusif, snapshot
                 │  KV "axto-nft-cache": cache OpenSea/RPC/sesi pendek
                 │
                 └──(Service Binding, tanpa internet)──► Worker "axto-vault" (repo coinaxto, privat)
                                                         • tanpa route, workers_dev=false → tidak bisa dicari
                                                         • kunci signer (secret terenkripsi)
                                                         • PayPal: buat order, capture, verifikasi webhook
                                                         • voucher koin, attestasi lelang, voucher WD
 Chain (Base) ◄── member (MetaMask/Trust Wallet) mengirim sendiri: approve, claim, buy, withdraw
   AxtoCollection ×4 publik + ×3 eksklusif · AxtoAuctionHouse · AxtoToken · AxtoSale · AxtoVesting · AxtoLock
 OpenSea ◄── membaca kontrak (tokenURI → axto.io/api/meta) · refresh metadata via API (≤ 50/menit)
```

Prinsip: worker publik **tidak pernah memegang kunci privat**. Vault tidak punya alamat publik; satu-satunya jalan
masuk adalah Service Binding dari `axto-web` (RPC `WorkerEntrypoint`), ditambah tanda tangan HMAC per panggilan.

---

## 4. Koleksi, DNA, dan keunikan

### 4.0 Jaminan unik (berlaku untuk semua koleksi)

- `tokenId = index + 1`, `index ∈ [0, maxSupply)`.
- `combo = feistelPermute(index, ruangKombinasi, kunciKoleksi)` dengan *cycle-walking* → **bijektif**: dua indeks
  berbeda selalu memberi kombinasi sifat berbeda. Ruang kombinasi tiap koleksi > 2 jt (dicek oleh tes).
- `combo` diuraikan *mixed-radix* menjadi sifat (bentuk, tema, gaya, palet, gerak, …).
- `seed = sha256(kunciKoleksi ‖ tokenId)` untuk variasi mikro (letak permata, partikel) — tidak memengaruhi keunikan.
- `dnaHash = sha256(json sifat)`; batch QA menolak bila ada hash kembar (sabuk pengaman ganda).
- Tier kelangkaan dari skor sifat: kuantil 50% Classic, 25% Rare, 15% Epic, 8% Legendary, 2% Masterpiece. Tier **bukan**
  harga: semua lelang mulai $1 (#26); tier hanya menentukan label dan fitur player
  (ambang dihitung tes dan dikunci di kode).

### 4.1 TIME — jam digital hidup (2.000.000)

Bentuk (40+): jam tangan bulat/kotak/tonneau/gelang layar, cincin, liontin, anting, bros, kacamata HUD, charm tas,
tag koper, gantungan kunci, dompet, patch jaket, panel punggung, dada kaos, kerah, lidah sepatu, jam dinding, meja,
alarm, bingkai foto, jam lantai, neon, dasbor mobil, panel motor, visor helm, menara, papan flip stasiun, billboard,
skin avatar, + bentuk baru dari DNA (kurva polar dengan simetri n, multi-muka, melayang/melilit).
Tema bahan: 5 tema awal (Emerald Royale, Sapphire Frost, Amethyst Nebula, Ruby Ember, Opal Prism) + baja, titanium,
keramik, kayu, kaca, neon, holografik, cyberpunk, minimal, mewah emas, void hitam-putih, bloodline merah, aureum, quantum.
Gaya angka: tujuh segmen, dot-matrix, nixie, flip, orbit, cair, biner, hibrida analog. Gerak: detak, nadi, parallax,
partikel, putar, gelombang. Jam selalu menampilkan waktu nyata; pemilik bisa memilih zona waktu (`?tz=`).
Tier Masterpiece: **"World Clock Canvas"** — satu kanvas berisi ratusan jam kota dunia (zona waktu nyata), bisa di-zoom/pan
tanpa pecah (vektor).

### 4.2 STAMP — prangko (2.000.000)

Penerbit: 64 negeri/semesta imajiner (mis. *Republic of Aurelia*, *Kepulauan Nirwana*, *Orbital Union*) — tidak
memakai nama/lambang negara nyata atau logo pos resmi. Seri: antariksa, flora, fauna, kebudayaan, pendidikan,
arsitektur & masjid, teknologi, kecerdasan buatan, laut, transportasi, olahraga, musik tradisional, sains, kota dunia
(generik), peristiwa alam, dunia esok. Bingkai: perforasi klasik, souvenir sheet, segitiga, wajik, bulat, heksagon,
airmail, se-tenant, miniatur, booklet. Mode: **statis**, **bergerak** (hewan berjalan, planet berputar, pilot
melambai), **premium zoom** (tier Legendary/Masterpiece: peta galaksi/peta dunia prosedural — tiap titik di-zoom memperlihatkan
planet, bintang, komet dengan nama; vektor, tidak pecah). Setiap prangko punya nomor seri, tahun terbit, nilai nominal,
seri koleksi, album.

### 4.3 QURAN — kaligrafi (2.000.000)

Seri dan jumlah (semua 1/1, setiap varian adalah karya berbeda):
- **Ayat**: 6.236 ayat × ±320 varian kaligrafi (minimal 10 bentuk per ayat sesuai perintah) = 1.993.805
- **Halaman mushaf Utsmani**: 604 × 10 = 6.040
- **Juz**: 30 × 5 = 150
- **Mushaf lengkap** (zoom tanpa pecah): 1 × 5 = 5
- Total tepat **2.000.000** (pembagian varian ayat dihitung deterministik di `engine/src/catalog/quran.js`).
Gaya: komposisi (lingkaran, mihrab, kubah, kapal, gelombang, kotak kufi, medali, cermin), iluminasi (tazhib emas,
arabesque, girih, zellige), bahan 3D (emas, perak, zamrud, marmer, kaca, cahaya), latar. Teks memakai font Amiri Quran
(lisensi OFL, boleh komersial). Player: kaligrafi 3D beranimasi, **bacaan imam pilihan pemilik** (Mishary Alafasy,
Abdul Basit, Sudais, Husary, Minshawi, Ghamdi, Shuraim, Maher Al-Muaiqly, …) dengan **gulir otomatis dan penunjuk tiap
kata** (segmen waktu kata dari API Quran.com bila tersedia, selain itu perkiraan proporsional panjang kata).

### 4.4 MODEL — figur model (2.000.000)

Potret model dari luaja.com (saat ini 1 model, 5 pose: depan, senyum, samping, lembut, ceria) dipasang pada figur
ilustrasi (busana, perlengkapan, latar) dengan seri: pendidikan, antariksa, sains, budaya, olahraga, profesi, musim,
kota dunia, ibadah, petualangan. Animasi: melambai, membaca, melayang (antariksa), berjalan, latar bergerak.
**Wajib izin tertulis** (§16.2); tanpa berkas `engine/consent/<model>.json` koleksi tidak diproduksi.

### 4.5 Eksklusif (3 × 50.000)

EX-TIME, EX-STAMP, EX-QURAN memakai renderer premium (lapisan lebih banyak, bingkai emas, nomor seri "x / 50.000",
sertifikat). Kunci koleksi terpisah dari koleksi publik sehingga tidak ada desain yang sama dengan koleksi publik.
Disimpan di R2 selama belum terjual / belum WD (§7).

---

## 5. Engine produksi (GitHub Actions) — 24 jam, zero-hand

- Workflow `engine.yml` jalan **tiap jam** (dan manual). Untuk setiap koleksi aktif:
  1. `GET /internal/engine/state` → `produced`, `maxSupply`, `enabled`.
  2. Bentuk batch `[produced, produced + BATCH)` (default 5.000 → 120.000/hari/koleksi; 2 jt tercapai ±17 hari).
  3. QA tiap item: DNA unik (hash), SVG valid & < 300 KB, metadata lengkap (judul, deskripsi ID/EN, sifat, tier,
     hak cipta, sertifikat), keterbacaan jam di 00:00:00/12:34:56/23:59:59, teks Qur'an cocok byte-per-byte dengan sumber.
  4. Hitung Merkle root dnaHash batch → `POST /internal/engine/commit` (HMAC-SHA256, stempel waktu ±5 menit).
  5. Ledger: terima hanya bila `from == produced` (atau batch sama persis sudah pernah diterima) → `produced += n`,
     `ready += n`, log R2.
- Kegagalan apa pun → batch tidak tercatat, run berikutnya **melanjutkan** dari checkpoint.
- Eksklusif: commit yang sama, lalu worker menulis artefak SVG + JSON ke R2 `ex/`.
- Laporan run (jumlah, gagal, retry) ditulis ke ringkasan Actions dan `l/engine/…` di R2; dashboard admin membacanya.

---

## 6. Lelang

### 6.1 Aliran ronde
Setiap koleksi punya rantai ronde sendiri (7 rantai: 4 publik + 3 eksklusif). Ronde k: `start = GENESIS + k·72j`,
`end = start + 72j`, segel `start − 1j`.

### 6.2 Segel (1 jam sebelum live)
`n = clamp(floor(ready × 10%), 1, ROUND_CAP)`. Urutan pilih: (a) NFT menunggu dengan penawaran tertinggi, (b) sisanya
urut produksi. Daftar lot ditandatangani vault (`roundSeal`) dan ditulis ke R2 `r/<koleksi>/<k>.json`.

### 6.3 Menawar
- Harga start: **$1 untuk setiap lot tanpa kecuali** (#26) — publik 1 USDC, eksklusif 0,1 AXTO (= $1 pada $10/AXTO).
- Mata uang: **USDC** (publik, harga $), **AXTO** (eksklusif; $ dikonversi dengan harga acuan $10/AXTO selama presale).
- Syarat: member terdaftar, lot live, `jumlah ≥ start` dan `> tertinggi`. Tombol "+10%" dan **proxy-bid** (isi
  maksimum, sistem menaikkan +10% otomatis saat disalip sampai maksimum).
- Member menandatangani **EIP-712 Bid** `{lotId, tokenId, collection, currency, maxAmount, nonce, deadline}` — tanpa
  gas. Tanda tangan inilah yang dipakai kontrak saat klaim, jadi signer platform tidak bisa memalsukan tawaran.
- Hold: `tersedia = min(saldo, allowance) − Σ hold aktif lain`. Kurang → **ditolak** ("saldo tidak cukup").
  Disalip → hold lama **dilepas** seketika.

### 6.4 Penawaran pada stok menunggu
Sama seperti tawaran (hold, tanda tangan). Halaman "Menunggu" menampilkan NFT urut penawaran tertinggi → terendah,
filter koleksi/tier/harga/seri.

### 6.5 Selesai & klaim
Pada `end` (plus perpanjangan) lot ditutup. Vault menerbitkan **attestasi** `{lotId, tokenId, winner, price, bidHash,
deadline}`. Pemenang menekan "Klaim" → wallet mengirim `AuctionHouse.claim(...)` (gas dibayar pemenang):
`transferFrom` dana (USDC/AXTO) → treasury (publik/eksklusif primer) atau 90% penjual + 10% treasury (marketplace
eksklusif) → NFT di-mint ke pemenang (publik) atau dicatat ke kustodi axto.io (eksklusif).

### 6.6 Cascade
Jendela klaim 48 jam. Tidak klaim / gagal (dana kurang) → hak turun ke penawar tertinggi berikutnya yang dananya
masih cukup (jendela 48 jam baru), maksimal 3 kali; lalu lot kembali ke antrean menunggu.

---

## 7. Eksklusif & marketplace axto.io

- Primer: lelang 72 jam berbayar AXTO (aturan §6). PayPal dipakai untuk **membeli AXTO** (top-up), bukan membayar lot
  langsung, sehingga semua hold dan settlement tetap satu jalur.
- Kustodi: NFT eksklusif yang dimenangkan tercatat di R2 `c/ex-own/<id>.json` atas nama wallet member.
- Marketplace (hanya selama belum WD): **Buy Now**, **Bid/penawaran**, **auction 72 jam**; pembayaran **hanya AXTO**;
  fee **10%** ke treasury, 90% ke penjual; settlement lewat `AuctionHouse.claim` (pembeli membayar gas).
- WD: member meminta → vault menerbitkan voucher mint → member mengirim `AxtoCollection(EX).mintWithVoucher` (gas oleh
  member, cara termurah di Base) → artefak R2 dihapus, status `withdrawn` + hash transaksi. Setelah WD tidak bisa
  kembali ke marketplace axto.io.

---

## 8. Koin AXTO

### 8.1 Spesifikasi
ERC-20 + EIP-2612 permit, 18 desimal, Base. Total **10.000.000** dicetak sekali di konstruktor; tidak ada fungsi mint,
burn, pajak transfer, blacklist. `enableTrading()` satu arah.

### 8.2 Pembagian (dicetak langsung ke kontrak/penerima saat deploy)
| Porsi | Jumlah | Tujuan | Aturan |
|---|---|---|---|
| 20% | 2.000.000 | `AxtoSale` | $10 stabil sampai habis; USDC/ETH dari wallet mana pun + voucher PayPal |
| 30% | 3.000.000 | Cadangan DEX (wallet admin) | Listing DEX dimulai $10 setelah presale habis |
| 30% | 3.000.000 | `AxtoVesting` (tim) | Mulai saat `enableTrading`; 10% dari 3 jt per tahun (10 tahun) |
| 20% | 2.000.000 | `AxtoLock` | Terkunci 5 tahun sejak deploy, lalu ke treasury |

### 8.3 Syarat listing DEX
`enableTrading()` hanya bisa setelah `AxtoSale.sold() ≥ 2.000.000` (presale habis), atau — jalan darurat — setelah
365 hari sejak deploy. Sebelum itu transfer hanya boleh dari/ke kontrak resmi (Sale, AuctionHouse, Vesting, Lock) dan
wallet admin → sesuai perintah "untuk sekarang hanya di-hold".

### 8.4 Kebijakan "tidak bisa diuangkan"
axto.io tidak menyediakan penukaran AXTO → uang, tidak menjanjikan pembelian kembali, dan tidak menjanjikan kenaikan
harga. Kegunaan koin: membayar lelang & marketplace eksklusif.

---

## 9. Smart contract (Solidity 0.8.28, OpenZeppelin 5)

| Kontrak | Fungsi utama |
|---|---|
| `AxtoCollection` | ERC-721 + ERC-2981 (10% → treasury) + kait ERC-721C (`setTransferValidator`), `maxSupply`, `tokenURI = baseURI + id`, `contractURI`, `mint` hanya oleh `minters` (AuctionHouse), `mintWithVoucher` (EIP-712, signer), `Ownable2Step`, `pause` |
| `AxtoAuctionHouse` | `claim(Bid, bidSig, Result, resultSig)` verifikasi tanda tangan penawar + attestasi signer, tagih `price ≤ maxAmount` via `transferFrom`, bagi dana (treasury / 90-10), mint/transfer NFT, catat lot selesai (anti-ganda), `pause` |
| `AxtoToken` | ERC-20 + permit, 10 jt, gerbang trading satu arah |
| `AxtoSale` | `buyWithUSDC`, `buyWithETH` (feed Chainlink ETH/USD), `claimPaid(voucher)` (PayPal), `cancelVoucher`, `dailyCap`, `pause`, dana langsung ke treasury |
| `AxtoVesting` | 10%/tahun dari alokasi tim setelah trading dibuka |
| `AxtoLock` | Kunci 5 tahun |

Alamat: owner/admin `0x38Cd3F76a132f70b12C9E4ea6aDAFaCF62483166`, treasury `0xDC39C04E704b1fec2BE648c49c842B2B17AfEBDA`
(sama di semua EVM). Signer: alamat baru khusus vault (bukan MetaMask admin).

---

## 10. Website axto.io

### 10.1 Halaman (semua ada di `/id/…` dan `/en/…`)
| Path | Isi |
|---|---|
| `/` | Deteksi bahasa (cookie → IP `CF-IPCountry`) lalu 302 ke `/id` atau `/en` |
| `/{lang}` | Banner animatif interaktif (kanvas: jam hidup, prangko, kaligrafi, orbit, penghitung live), ronde berjalan, 4 koleksi, eksklusif, koin, cara kerja, FAQ |
| `/{lang}/lelang` | Lot live, filter koleksi/tier/harga/berakhir segera/tawaran tertinggi, hitung mundur |
| `/{lang}/menunggu` | Stok menunggu, urut penawaran tertinggi → terendah, filter |
| `/{lang}/c/{koleksi}` | Galeri koleksi |
| `/{lang}/nft/{koleksi}/{id}` | Player hidup, panel tawar, riwayat, sifat, sertifikat |
| `/{lang}/eksklusif` | Marketplace eksklusif (member) |
| `/{lang}/koin` | AXTO: spesifikasi, pembagian, beli (PayPal/USDC/ETH), disclaimer |
| `/{lang}/member` | Portal member |
| `/{lang}/admin` | Portal admin |
| `/{lang}/verifikasi/{koleksi}/{id}` | Sertifikat & pemilik on-chain |
| `/api/meta/{koleksi}/{id}` | Metadata (tokenURI) |
| `/img/{koleksi}/{id}.svg` | Gambar (image) |
| `/play/{koleksi}/{id}` | Animasi (animation_url) — boleh di-frame OpenSea |

### 10.2 Bahasa
Kamus manual `worker/src/i18n.js` (ID & EN lengkap). IP Indonesia → ID, lainnya → EN; tombol ID/EN menyimpan cookie
`lang` (1 tahun) dan pindah path. Tidak ada mesin terjemah.

### 10.3 SEO
`<title>`/meta description per halaman & bahasa, canonical, `hreflang` id/en/x-default, Open Graph & Twitter Card,
JSON-LD (Organization, WebSite+SearchAction, Product/Offer untuk NFT, FAQPage), `sitemap.xml` (indeks + sitemap per
koleksi, dipecah 50.000 URL), `robots.txt`, `manifest.webmanifest`, ikon. Halaman dirender server (bukan SPA) → cepat
diindeks; cache tepi `s-maxage`.

### 10.4 Identitas
Logo AXTO (koin logam biru) dari pemilik di `worker/public/logo.png`; favicon SVG vektor (cincin logam + "AX") dan
PNG 192/512. Gaya "museum digital premium": gelap, emas/biru logam, tipografi tegas; tanpa logo Ethereum/kata "NFT"
berlebihan di karya.


### 10.5 AdSense (perintah #27)
Hanya 3 akun. Setiap halaman HTML: tiga tag meta `google-adsense-account` + **satu** loader (akun utama axto.io
`ca-pub-5928074389292014`), dari `worker/src/adsense.js`. `worker/public/ads.txt`:
```
google.com, pub-6560360898389273, DIRECT, f08c47fec0942fa0
google.com, pub-4906992051458194, DIRECT, f08c47fec0942fa0
google.com, pub-5928074389292014, DIRECT, f08c47fec0942fa0
```
Sumber yang sama dengan `adsense-stack.json` di repo ulyah.com (primary `axto.io`). Iklan tidak dipasang di halaman
player `/play/...` (di-frame OpenSea) maupun portal admin.
---

## 11. Portal

### 11.1 Member
1. **Hubungkan wallet** (MetaMask/Trust Wallet/WalletConnect) → tanda tangan **SIWE (EIP-4361)** tanpa gas → wallet
   terdaftar sebagai identitas member (inilah "daftar lewat smart contract": bukti kriptografis kepemilikan wallet).
2. Lengkapi **email, username, password** di dalam portal (email diverifikasi lewat tautan; password PBKDF2-SHA256
   100.000 iterasi + salt; email dienkripsi AES-GCM, indeks lewat HMAC).
3. Dasbor: saldo USDC/AXTO & allowance, hold aktif, tawaran, menang (tombol klaim + hitung mundur), kustodi eksklusif,
   WD, marketplace (jual/BN/bid), beli AXTO (PayPal/USDC/ETH), riwayat, sertifikat, 2FA TOTP opsional.

### 11.2 Admin (hanya wallet admin `0x38Cd…3166` + TOTP)
Ringkasan produksi (produced/ready/inRound/sold per koleksi), status run engine & kegagalan, ronde aktif, pendapatan,
penjualan koin, antrean refresh OpenSea, log keamanan, saklar darurat (pause lelang/penjualan koin per koleksi),
rotasi signer (panduan). Semua aksi admin ditandatangani wallet admin dan dicatat di R2.

---

## 12. Keamanan

- **Kunci**: tidak ada kunci privat di repo publik atau worker publik. Signer hanya di vault (secret Cloudflare,
  terenkripsi). Owner kontrak = MetaMask admin (disarankan hardware wallet). `Ownable2Step`.
- **Vault tersembunyi**: `workers_dev = false`, tanpa route/domain → tidak ada URL publik; dipanggil hanya via Service
  Binding + HMAC per pesan + daftar metode yang diizinkan. Vault memvalidasi sendiri (PayPal capture diverifikasi
  langsung ke PayPal; attestasi lelang memeriksa tanda tangan penawar).
- **Web**: CSP ketat dengan nonce, HSTS preload, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `frame-ancestors 'none'` (kecuali `/play` yang boleh di-frame), cookie `__Host-` `Secure; HttpOnly; SameSite=Strict`,
  cek Origin untuk semua POST, rate limit per IP & per wallet, validasi input ketat, tidak ada `innerHTML` dari data
  pengguna (escape semua).
- **Data**: email terenkripsi AES-256-GCM, password PBKDF2, sesi token acak 256-bit disimpan sebagai hash, log
  append-only R2, backup harian 35 hari.
- **Pencurian NFT/koin**: NFT publik belum ada sebelum diklaim pemenang (tidak ada inventaris yang bisa dicuri);
  eksklusif di kustodi tidak on-chain; dana member tidak pernah dipegang axto.io; kontrak memakai `ReentrancyGuard`,
  `SafeERC20`, nonce sekali pakai, deadline, domain EIP-712 per chain & kontrak.
- **Audit**: kontrak wajib diaudit pihak ketiga sebelum mainnet; uji penuh di Base Sepolia.

---

## 13. OpenSea (akun `axto-io`)

Batas: 120 baca, 60 posting order, 60 fulfillment per menit (dibagi semua kunci akun). Pemakaian axto.io:
- Refresh metadata setelah klaim: antrean di DO, dikirim ≤ 50/menit oleh cron.
- Statistik koleksi & harga sekunder: 1 panggilan/koleksi tiap 2 menit, cache KV.
- Tidak ada posting order (lelang di axto.io) → kuota order tidak terpakai.
Pengaturan koleksi di OpenSea (sekali, oleh pemilik): klaim kepemilikan kontrak, nama, banner, royalti 10% ke
treasury, aktifkan ERC-721C enforcement.

---

## 14. PayPal

Order dibuat vault (`intent CAPTURE`, `custom_id = wallet|nonce`), disetujui pembeli lewat PayPal JS SDK, di-capture
vault di server. Webhook `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, `CUSTOMER.DISPUTE.CREATED` masuk ke
`/api/paypal/webhook` → diteruskan ke vault → diverifikasi via `POST /v1/notifications/verify-webhook-signature`
(webhook id disimpan sebagai secret) → idempoten per `event.id`. Hasil: voucher AXTO (klaim dengan gas sendiri) atau
pembatalan voucher.

---

## 15. Biaya

| Komponen | Biaya |
|---|---|
| Produksi 8.150.000 NFT | $0 (deterministik; GitHub Actions gratis untuk repo publik) |
| Penyimpanan karya publik | $0 (tanpa R2) |
| Mint, klaim, WD | Dibayar pembeli/pemenang (Base ±$0,001–0,02 per transaksi) |
| Listing OpenSea | $0 (tidak ada order) |
| Cloudflare | Gratis: 100 rb request/hari, DO SQLite, R2 10 GB; disarankan Workers Paid $5/bulan saat trafik tinggi |
| Deploy kontrak (sekali) | Dibayar owner, ±$1–5 di Base |
| Premint (opsional) | ±$0,02–0,05 per 1.000 token |

---

## 16. Hukum & etika

1. **Al-Qur'an**: teks dari dataset `quran-text` (KFGQPC Uthmanic Hafs, CC BY 4.0) disalin tanpa perubahan dengan
   atribusi; diverifikasi byte-per-byte di QA; font tampilan Amiri Quran (OFL). Tanpa musik, tanpa gambar makhluk
   bernyawa di koleksi Qur'an. Pernyataan di setiap metadata: karya seni kaligrafi & token koleksi, bukan hak atas
   ayat. Audio bacaan diputar dari sumber aslinya dengan atribusi qari; tidak di-hosting ulang.
2. **Model**: foto di luaja.com adalah orang nyata. Wajib *model release* tertulis yang mencakup penjualan NFT
   komersial (dan izin wali bila di bawah 18 tahun) → simpan ringkasannya di `engine/consent/<model>.json`
   (`granted:true`, tanggal, ruang lingkup). Tanpa itu koleksi MODEL tidak diproduksi.
3. **Koin**: konsultasikan dengan ahli hukum (OJK/aset kripto di Indonesia; regulasi di negara target). Jangan
   memasarkan sebagai investasi atau menjanjikan untung. Sediakan syarat & ketentuan, KYC bila diwajibkan.
   PayPal: penjualan kripto butuh persetujuan PayPal → saklar `PAYPAL_COIN_SALE` default mati di live.
4. **Prangko**: tidak memakai Lambang Negara (mis. Garuda Pancasila — dilindungi UU 24/2009), nama negara nyata,
   atau logo pos resmi. **Merek**: tidak ada logo/nama merek jam, tas, pakaian.

---

## 17. Rahasia & konfigurasi

| Nama | Di mana | Isi |
|---|---|---|
| `CLOUDFLARE_API_KEY`, `CLOUDFLARE_EMAIL`, `CLOUDFLARE_ACCOUNT_ID` | GitHub Secrets (axto & coinaxto) | Deploy wrangler |
| `OPENSEA_API_KEY`, `OPENSEA_SCOPED_TOKEN` | GitHub Secrets → secret worker | **Putar ulang dulu** |
| `PAYPAL_LIVE_CLIENT_ID/SECRET`, `PAYPAL_SANDBOX_CLIENT_ID/SECRET` | GitHub Secrets coinaxto → secret vault | |
| `PAYPAL_WEBHOOK_ID` | secret vault | Dari dashboard PayPal |
| `SIGNER_PRIVATE_KEY` | secret vault saja | Dibuat baru, alamatnya didaftarkan owner ke kontrak |
| `VAULT_HMAC_KEY` | secret web + vault | 32 byte acak |
| `ENGINE_HMAC_KEY` | GitHub Secret + secret web | Commit batch |
| `DATA_KEY` | secret web | AES-256 untuk email/rahasia di R2 |
| `SESSION_PEPPER` | secret web | |
| `ADMIN_TOTP_SECRET` | secret web | 2FA admin |
| Variabel | `wrangler.jsonc` | Alamat kontrak, chain id, `GENESIS`, `ROUND_CAP`, saklar fitur |

---

## 18. Tahapan & status

Status diperbarui setiap commit. (Lihat juga README.)

### Tahap A — Fondasi kode (repo)
- [x] Blueprint ini (3 putaran review)
- [x] Engine: Feistel bijektif, DNA, katalog 4 koleksi + eksklusif, tier kelangkaan, metadata ID/EN — teruji
- [x] Renderer SVG + player HTML (jam, prangko + zoom galaksi, kaligrafi 3D + qari + penunjuk kata, model) — teruji QA
- [x] Logika lelang murni (segel 10%, start $1 semua lot, +10%/proxy, hold, cascade, penawaran menunggu) — teruji
- [x] Kontrak Solidity — dikompilasi & teruji (ganache)
- [x] Worker axto-web: router, i18n ID/EN manual, SEO (hreflang, JSON-LD, sitemap), banner kanvas interaktif, AdSense 3 akun,
  SIWE + profil terenkripsi, DO Ledger (segel 10%, lelang $1, hold lintas koleksi, cascade, kustodi, marketplace eksklusif
  BN/auction 90/10, WD), engine commit ber-HMAC, PayPal relay — diuji lokal (wrangler dev) + tes kripto
- [x] Vault axto-vault (repo coinaxto): HMAC per pesan + daftar metode, attestasi Result, voucher koin & WD, PayPal
  order/capture/webhook terverifikasi — tes tanda tangan identik ethers/kontrak
- [x] Workflows CI, deploy (cek AdSense live), engine tiap jam; `contracts/scripts/deploy.mjs` diuji di ganache

### Tahap B — Butuh tindakan pemilik
- [P] Pasang Claude GitHub App di `p2nshooter/axto` & `p2nshooter/coinaxto` (agar kode bisa di-push)
- [P] Putar ulang kunci OpenSea (axto-io) & simpan di secrets; tambahkan `PAYPAL_WEBHOOK_ID`
- [P] Buat signer baru (vault), deploy kontrak di Base Sepolia lalu Base mainnet dari MetaMask admin, isi alamat ke
  `worker/wrangler.toml` (keluaran `contracts/scripts/deploy.mjs`)
- [P] Tambah zona axto.io ke Cloudflare (route otomatis aktif)
- [P] Izin tertulis model; persetujuan PayPal untuk penjualan kripto; nasihat hukum koin
- [P] Audit kontrak

### Tahap C — Peluncuran
- [ ] Uji end-to-end di Base Sepolia (tawar → klaim → muncul di OpenSea testnet → refresh metadata)
- [ ] Genesis ronde pertama (`GENESIS_MS` di wrangler) — engine sudah memproduksi stok
- [ ] Monitoring 7 hari, lalu buka penjualan koin

---

## 19. Runbook singkat

- **Engine macet**: lihat Actions → engine; jalankan manual. Ledger tidak pernah mundur; batch gagal aman diulang.
- **Lelang darurat**: admin → Pause koleksi. Lot yang sedang jalan diperpanjang otomatis sebesar durasi pause.
- **Signer bocor**: owner `setSigner(baru)` di semua kontrak + `pause()` AxtoSale → ganti `SIGNER_PRIVATE_KEY` vault.
- **Rotasi kunci OpenSea/PayPal**: ganti secret di GitHub → jalankan deploy.
