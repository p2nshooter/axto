# Izin model (wajib sebelum koleksi MODEL diproduksi)

Koleksi MODEL memakai potret orang nyata (wajah + kerudung). Engine **tidak memproduksi** satu pun NFT MODEL, dan
worker tidak menampilkan wajahnya (`MODEL_CONSENT`), sebelum berkas izin **setiap** model di katalog ada di folder ini.

Model di katalog (`engine/src/catalog/model.js`): `luaja-1` (Pemandu LUAJA, 5 pose) dan `model-2` (4 pose).

1. Minta *model release* tertulis (tanda tangan basah/digital) yang mencakup: pembuatan karya turunan & animasi,
   penjualan NFT komersial di axto.io dan OpenSea, tanpa batas jumlah, beserta imbalan yang disepakati.
   Bila model di bawah 18 tahun, tanda tangan **orang tua/wali** wajib.
2. Simpan dokumen aslinya di tempat aman (bukan di repo publik ini).
3. Buat `<id>.json` di folder ini (tanpa data pribadi sensitif), misalnya `luaja-1.json`:

```json
{ "model": "luaja-1", "granted": true, "scope": ["derivative-art", "nft-commercial"], "adult": true, "guardian": false, "signedAt": "2026-12-01", "ref": "nomor arsip dokumen" }
```

   Model di bawah 18 tahun: `"adult": false, "guardian": true` (izin ditandatangani orang tua/wali).
4. Tambahkan id model ke `MODEL_CONSENT` di `worker/wrangler.toml` (mis. `"luaja-1,model-2"`).

Potret hasil potongan disimpan privat (repo `coinaxto/models/` → R2 `axto-data/model/<id>/`), tidak di repo publik.
Mencabut izin: ubah `granted` menjadi `false` → produksi & lelang koleksi MODEL berhenti pada run berikutnya.
