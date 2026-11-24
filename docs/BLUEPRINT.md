# AXTO — Blueprint

Blueprint lengkap axto.io (v5, 23 Nov 2026) adalah **rahasia perusahaan** dan tidak disimpan terbuka di repo ini.
Isinya tersegel di `private/blueprint.md.enc` (RSA-OAEP-256 + AES-256-GCM); workflow `private-bundle.yml` membukanya
langsung ke R2 privat, dan pemilik membacanya di **Portal admin → Blueprint**.

Aturan kerja yang terbuka untuk kontributor:
- Penyimpanan: **R2 saja, tidak pernah D1**; KV hanya cache & batas laju.
- Tidak ada alamat wallet perusahaan, kunci, atau rencana bisnis di repo publik — gunakan saluran tersegel
  (`ops/seal-private.mjs`).
- Setiap perubahan teruji (`npm test` di `engine/`, `worker/`, `contracts/`, `market/`, `ops/test`) sebelum push.
- **Tidak ada logo apa pun di dalam karya** (pemilik, 24 Nov 2026: „Hati2, jgn ada logo apapun di semua karya termasuk
  GPU"): tanpa tanda „AXTO", tanda air, merek, tanda tangan atau tulisan buatan mesin — dijaga tes `engine/test` dan
  pemeriksa mesin seri G- (`worker/src/gpu.js`). Karya G- lama yang berlogo disembunyikan & dilukis ulang beranimasi
  dengan nomor seri yang sama; karya G- baru tampil hanya bersama video GPU di player interaktif.
