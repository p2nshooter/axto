# Izin model (wajib sebelum koleksi MODEL diproduksi)

Koleksi MODEL memakai potret orang nyata dari luaja.com. Engine **tidak akan memproduksi** satu pun NFT MODEL
sebelum berkas izin ada di folder ini.

1. Minta *model release* tertulis (tanda tangan basah/digital) yang mencakup: pembuatan karya turunan & animasi,
   penjualan NFT komersial di axto.io dan OpenSea, tanpa batas jumlah, beserta imbalan yang disepakati.
   Bila model di bawah 18 tahun, tanda tangan **wali** wajib.
2. Simpan dokumen aslinya di tempat aman (bukan di repo publik ini).
3. Buat `luaja-1.json` di folder ini dengan isi ringkasan (tanpa data pribadi sensitif):

```json
{ "model": "luaja-1", "granted": true, "scope": ["derivative-art", "nft-commercial"], "guardian": false, "signedAt": "2026-12-01", "ref": "nomor arsip dokumen" }
```

Mencabut izin: ubah `granted` menjadi `false` → produksi & lelang koleksi MODEL berhenti pada run berikutnya.
