# AXTO — axto.io

Museum digital 1/1 yang hidup: 4 koleksi publik × 2.000.000 (jam, prangko, kaligrafi Al-Qur'an, model) + 3 × 50.000
edisi eksklusif. Lelang 72 jam **mulai $1 tanpa kecuali**, royalti jual kembali 10%, koin AXTO (10 jt, tanpa burn).

| Folder | Isi | Tes |
|---|---|---|
| `docs/BLUEPRINT.md` | Rancangan lengkap + status (§18) + runbook (§19) | — |
| `engine/` | DNA bijektif, renderer SVG/player, QA, logika lelang; produksi tiap jam (`.github/workflows/engine.yml`) | `npm test` |
| `contracts/` | AxtoCollection (ERC-721C, 2981), AuctionHouse (EIP-712), Token, Sale, Vesting, Lock + `scripts/deploy.mjs` | `node scripts/compile.mjs && node --test test/*.test.mjs` |
| `worker/` | axto-web: situs ID/EN, SEO, AdSense 3 akun, SIWE, Ledger DO (R2), marketplace eksklusif, PayPal relay | `npm test`, `npm run check` |

Penyimpanan: **R2 saja** (tidak pernah D1); KV hanya cache pendek. Kunci signer & PayPal hanya di vault privat
(repo `coinaxto`, worker `axto-vault` tanpa URL publik).
