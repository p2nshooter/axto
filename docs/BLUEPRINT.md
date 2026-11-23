# AXTO — Blueprint

Blueprint lengkap axto.io (v5, 23 Nov 2026) adalah **rahasia perusahaan** dan tidak disimpan terbuka di repo ini.
Isinya tersegel di `private/blueprint.md.enc` (RSA-OAEP-256 + AES-256-GCM); workflow `private-bundle.yml` membukanya
langsung ke R2 privat, dan pemilik membacanya di **Portal admin → Blueprint**.

Aturan kerja yang terbuka untuk kontributor:
- Penyimpanan: **R2 saja, tidak pernah D1**; KV hanya cache & batas laju.
- Tidak ada alamat wallet perusahaan, kunci, atau rencana bisnis di repo publik — gunakan saluran tersegel
  (`ops/seal-private.mjs`).
- Setiap perubahan teruji (`npm test` di `engine/`, `worker/`, `contracts/`, `market/`, `ops/test`) sebelum push.
