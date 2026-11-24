/**
 * Alamat kontrak aktif dibaca dari R2 `cfg/active.json` (disimpan halaman admin setelah deploy kontrak dari MetaMask
 * admin) dan menimpa variabel wrangler. Cache 60 detik per isolate. Tanpa berkas → nilai wrangler.toml.
 */
import { readJSON, putJSON, appendLog } from './r2.js';
import { isAddress, ethCall } from './eth.js';
import { ONE_KEYS } from '../../engine/src/opensea.js';

export const NETWORKS = {
  84532: { name: 'Base Sepolia (uji)', rpc: 'https://sepolia.base.org', usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', feed: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1', opensea: 'base_sepolia', explorer: 'https://sepolia.basescan.org' },
  8453: { name: 'Base', rpc: 'https://mainnet.base.org', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', feed: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70', opensea: 'base', explorer: 'https://basescan.org' },
};
export const COL_KEYS = ['time', 'stamp', 'quran', 'model', 'ex-time', 'ex-stamp', 'ex-quran', 'ex-model', 'hadith', 'ex-hadith', 'g-time', 'g-stamp', 'g-quran', 'g-model', 'g-hadith', 'stake', ...ONE_KEYS];
/** Koleksi yang ditambahkan belakangan (#49) boleh belum ada saat kontrak pertama disimpan — deployer menambahkannya bertahap. */
export const LATE_KEYS = ['hadith', 'ex-hadith', 'g-time', 'g-stamp', 'g-quran', 'g-model', 'g-hadith', 'stake', ...ONE_KEYS];
const colVar = (c) => `COLLECTION_${c.replaceAll('-', '_').toUpperCase()}`;

let cache = { at: 0, cfg: null };

export async function withCfg(env) {
  if (Date.now() - cache.at > 60_000) {
    cache = { at: Date.now(), cfg: await readJSON(env.STORE, 'cfg/active.json').catch(() => null) };
  }
  const c = cache.cfg;
  if (!c) return env;
  const out = { ...env, CHAIN_ID: String(c.chainId), BASE_RPC: NETWORKS[c.chainId]?.rpc ?? env.BASE_RPC, AUCTION_HOUSE: c.auctionHouse ?? '', AXTO_TOKEN: c.token, AXTO_SALE: c.sale ?? '', USDC: c.usdc, STANDARD: c.standard ?? 'erc721', RELEASED: JSON.stringify(c.released ?? {}) };
  // lelang langsung jalan begitu kontrak aktif (perintah pemilik #38): genesis dari cfg bila wrangler tidak menetapkan
  if (!Number(env.GENESIS_MS) && c.genesis) out.GENESIS_MS = String(c.genesis);
  for (const k of COL_KEYS) out[colVar(k)] = c.collections?.[k] ?? '';
  return out;
}

/** Simpan alamat hasil deploy setelah diverifikasi on-chain: ada kode & owner() = wallet admin. */
export async function saveContracts(env, admin, body) {
  const chainId = Number(body.chainId);
  const net = NETWORKS[chainId];
  if (!net) return { ok: false, error: 'chain' };
  // vesting/lock opsional: sejak perintah #39 seluruh koin di wallet koin pemilik (dibagi sendiri)
  const keys = COL_KEYS.filter((k) => !LATE_KEYS.includes(k) || body.collections?.[k]);
  // desain akhir: hanya token + koleksi; AuctionHouse/AxtoSale tidak lagi dideploy. 23 Nov 2026: ERC-1155 edisi;
  // 24 Nov 2026: 10 koleksi OpenSea ERC-721 (edisi 1 tercetak saat deploy) + 5 eksklusif ERC-1155 = 'erc721-editions'
  const editions = body.standard === 'erc1155' || body.standard === 'erc721-editions';
  const all = [body.token, ...(editions ? [] : [body.sale, body.auctionHouse]), ...(body.vesting ? [body.vesting] : []), ...(body.lock ? [body.lock] : []), ...keys.map((k) => body.collections?.[k])];
  if (!all.every(isAddress)) return { ok: false, error: 'address' };
  const rpc = async (method, params) => {
    const r = await fetch(net.rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
    return (await r.json()).result;
  };
  for (const a of all) {
    const code = await rpc('eth_getCode', [a, 'latest']);
    if (!code || code === '0x') return { ok: false, error: `no_code ${a}` };
  }
  // owner(): NFT (AuctionHouse + koleksi) = wallet admin; koin (Token + Sale) = wallet koin
  const owners = [...(editions ? [] : [[body.auctionHouse, admin], [body.sale, env.COIN_WALLET]]), ...keys.map((k) => [body.collections[k], admin]), [body.token, env.COIN_WALLET]];
  for (const [a, want] of owners) {
    const o = await ethCall(net.rpc, a, '0x8da5cb5b');
    if (`0x${o.slice(-40)}`.toLowerCase() !== String(want).toLowerCase()) return { ok: false, error: `owner ${a}` };
  }
  const prev = await readJSON(env.STORE, 'cfg/active.json').catch(() => null);
  // ronde pertama: segel saat ini juga, live 1 jam kemudian (lelang 72 jam mulai $1) — tidak diubah bila disimpan ulang
  const genesis = prev?.chainId === chainId && prev?.genesis ? prev.genesis : Math.ceil((Date.now() + 65 * 60_000) / 60_000) * 60_000;
  const released = Object.fromEntries(Object.entries(body.released ?? {}).filter(([k, v]) => COL_KEYS.includes(k) && Number.isSafeInteger(v) && v >= 0));
  const cfg = { chainId, standard: editions ? body.standard : 'erc721', works: Number.isSafeInteger(body.works) ? body.works : null, released, token: body.token, sale: editions ? null : body.sale, auctionHouse: editions ? null : body.auctionHouse, store: isAddress(body.store) ? body.store : null, vesting: body.vesting ?? null, lock: body.lock ?? null, usdc: net.usdc, collections: Object.fromEntries(keys.map((k) => [k, body.collections[k]])), genesis, savedAt: Date.now(), by: admin };
  await putJSON(env.STORE, `cfg/contracts-${chainId}.json`, cfg);
  await putJSON(env.STORE, 'cfg/active.json', cfg);
  await appendLog(env.STORE, 'admin', { ev: 'contracts', chainId, by: admin });
  cache = { at: 0, cfg: null };
  return { ok: true, cfg };
}
