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
