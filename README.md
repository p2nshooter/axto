# AXTO — axto.io

Museum digital hidup di jaringan Base dengan tiga pasar terpisah: **Eksklusif** (toko axto.io, $1 per edisi dengan koin
AXTO atau langsung kripto, 10 edisi per karya), **Pasar Member** (jual-beli antar member: harga tetap, lelang, penawaran;
fee 10%, tanpa gas) dan **OpenSea** (koleksi publik, edisi 1–10, harga tetap $1–$250 menurut kelangkaan; 100 juta karya
1/1; galeri hadiah AXTO Staking). Keranjang untuk beli & WD massal; gas transaksi axto.io ditanggung axto.io. Royalti 10%
untuk setiap penjualan ulang. Seri **G-** dilukis GPU dari DNA karya dan dianimasikan GPU sebelum tampil.

| Folder | Isi | Uji |
|---|---|---|
| `engine/` | DNA karya, renderer SVG/player, edisi & harga (`src/editions.js`), produksi tiap jam | `npm test` |
| `contracts/` | `AxtoToken` (100 jt) + `AxtoEditions` (ERC-1155, royalti 10% ditegakkan), deploy otomatis | `npm test` |
| `worker/` | axto-web: situs ID/EN, SEO, toko eksklusif, pasar member, keranjang, pembayaran kripto, WD, hadiah, koin & staking AXTO | `npm test`, `npm run check` |
| `market/` | listing OpenSea harga tetap otomatis (wallet toko sistem), wallet gas (WD tanpa gas member) | `npm test` |
| `ops/` | saluran privat tersegel, seri G- (video GPU dirender axto.io) | `node --test ops/test/*.mjs` |

Penyimpanan: **R2 saja** (tidak pernah D1); KV hanya cache pendek. Kunci signer hanya di vault privat; data perusahaan
hanya lewat saluran tersegel ke R2 privat.
