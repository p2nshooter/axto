# AXTO — Blueprint

Blueprint lengkap axto.io (v5, 23 Nov 2026) adalah **rahasia perusahaan** dan tidak disimpan terbuka di repo ini.
Isinya tersegel di `private/blueprint.md.enc` (RSA-OAEP-256 + AES-256-GCM); workflow `private-bundle.yml` membukanya
langsung ke R2 privat, dan pemilik membacanya di **Portal admin → Blueprint**.

Aturan kerja yang terbuka untuk kontributor:
- Penyimpanan: **R2 saja, tidak pernah D1**; KV hanya cache & batas laju.
- Tidak ada alamat wallet perusahaan, kunci, atau rencana bisnis di repo publik — gunakan saluran tersegel
  (`ops/seal-private.mjs`).
- Setiap perubahan teruji (`npm test` di `engine/`, `worker/`, `contracts/`, `market/`, `ops/test`) sebelum push.
- **Tidak ada logo atau label apa pun di dalam karya** (pemilik, 24 Nov 2026: „Hati2, jgn ada logo apapun di semua karya
  termasuk GPU" · „Hapus aja jgn ada label, biar bersih"): tanpa tanda „AXTO", lencana EXCLUSIVE, lencana kode G-, teks
  petunjuk, tanda air, merek, tanda tangan atau tulisan buatan mesin — dijaga tes `engine/test`, `worker/test` dan pemeriksa
  mesin seri G- (`worker/src/gpu.js`).
- **Seri G- selalu beranimasi** („OS-G-4 masih diem saja, baru yg OS-G-5 yg punya animasi"): karya G- tampil hanya bila lolos
  mutu dan videonya sudah dibuat GPU. Karya lama yang gambar aslinya lolos pemeriksaan mutu langsung dianimasikan; yang tidak
  lolos atau berlogo dilukis ulang dengan nomor seri yang sama.
- **Pembayaran kripto langsung** (pemilik, 24 Nov 2026): semua harga bisa dibayar tanpa koin AXTO — member memilih koin &
  jaringan (stablecoin dianjurkan, jaringan murah lebih dulu), mendapat alamat deposit akun penampung axto.io + jumlah unik +
  QR; pembelian berhasil HANYA setelah pembayaran diterima (`worker/src/pay.js`, kunci API izin lihat — sistem tidak pernah
  menarik dana). Nama penyedia tidak pernah tampil di halaman, JS publik, atau respons API publik.
- **Keranjang** (`worker/src/cart.js`): kumpulkan dulu, beli massal (koin AXTO atau kripto) & WD massal. Keranjang bukan
  pemesanan — barang yang keduluan member lain hilang otomatis dengan pemberitahuan; barang dipesan atomik saat checkout.
- **Gas ditanggung axto.io** dari wallet gas `0x2AB7f55Be9412a42556484Cf38Fd9B91fA34Fed8` (`market/gas-relay.mjs`, kunci
  hanya GitHub Secret `GAS_WALLET_PRIVATE_KEY`): WD member dikirim tanpa gas member; wallet toko diisi ulang dari wallet gas.
  Jual ulang di Pasar Member bebas gas (fee 10%); jual di OpenSea gas oleh pemiliknya, royalti 10% tetap.
- **Semua penerimaan terpusat di akun penampung** (pemilik, 24 Nov 2026: „hasil penjualan di opensea dan penjualan di axto.io
  dan fee nya langsung masuk ke indodax saja … Semua ter central"): pembayaran member masuk ke alamat deposit akun penampung;
  royalti 10% semua koleksi masuk wallet toko sistem lalu, bersama hasil penjualan OpenSea, diteruskan mesin OpenSea ke alamat
  deposit ETH jaringan Base akun penampung (transfer biasa, minimal 0,01 ETH, dicatat `pay/sweep/<tx>` agar tidak dikira
  pembayaran member). Alamat itu belum dibuat → sementara ke treasury. Gas tetap dari wallet gas `0x2AB7…`.
- **Batas gas per transaksi Base** (EIP-7825, 16.777.216 gas sejak upgrade Azul 28 Mei 2026): tiap transaksi deploy diperkirakan
  dulu dan ditolak sebelum dikirim bila > 15 jt gas. Koleksi 1/1 Qur'an, Hadits dan Prangko masing-masing dua kontrak (I & II,
  ±16,7 jt karya, ±11,6 jt gas); total tetap 100 jt karya, desain bagian II melanjutkan nomor bagian I. Deploy lengkap
  terukur 179.393.879 gas (22 koleksi + koin), dana pemilik 0,00145539 ETH cukup pada harga gas ±0,006 gwei.
- **1/1 tambahan 50 jt** (pemilik 25 Nov 2026: „Tambahin aja 50jt lg, jgn 80jt biar cukup"): bagian III Qur'an, Hadits dan
  Prangko (±16,7 jt karya per kontrak, desain melanjutkan bagian II). Dideploy dari sisa dana deployer SETELAH koin + 22
  koleksi inti aktif & terdaftar, satu per satu, hanya bila saldo cukup (batas gas × maxFee + cadangan); terdaftar ke worker
  & dilisting otomatis. Total 1/1 di OpenSea 150 jt karya.
