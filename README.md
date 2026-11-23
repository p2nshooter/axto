# AXTO — axto.io

Museum digital hidup di jaringan Base dengan tiga pasar terpisah: **Eksklusif** (toko axto.io, $1 per edisi dengan koin
AXTO, 10 edisi per karya), **Pasar Member** (jual-beli antar member: harga tetap, lelang, penawaran; fee 10%) dan
**OpenSea** (koleksi publik, edisi 1–10, harga tetap $1–$10.000 menurut kelangkaan). Royalti 10% untuk setiap penjualan
ulang. Seri **G-** dilukis GPU gratis/terbuka dari DNA karya.

| Folder | Isi | Uji |
|---|---|---|
| `engine/` | DNA karya, renderer SVG/player, edisi & harga (`src/editions.js`), produksi tiap jam | `npm test` |
| `contracts/` | `AxtoToken` (100 jt) + `AxtoEditions` (ERC-1155, royalti 10% ditegakkan), deploy otomatis | `npm test` |
| `worker/` | axto-web: situs ID/EN, SEO, toko eksklusif, pasar member, WD, hadiah, koin NOWPayments | `npm test`, `npm run check` |
| `market/` | listing OpenSea harga tetap otomatis (wallet toko sistem) | `npm test` |
| `ops/` | saluran privat tersegel, seri G- (GPU) | `node --test ops/test/*.mjs` |

Penyimpanan: **R2 saja** (tidak pernah D1); KV hanya cache pendek. Kunci signer hanya di vault privat; data perusahaan
hanya lewat saluran tersegel ke R2 privat.
