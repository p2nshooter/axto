/**
 * Deploy seluruh kontrak AXTO ke Base (atau Base Sepolia) lalu distribusi koin persis seperti tes.
 * Dijalankan pemilik dari komputernya sendiri (kunci tidak pernah masuk repo / CI):
 *   RPC=https://sepolia.base.org DEPLOYER_KEY=0x… SIGNER=0x… TREASURY=0x… [TEAM_WALLET=0x…] [USDC=0x…] [ETH_USD_FEED=0x…] \
 *   node scripts/compile.mjs && node scripts/deploy.mjs
 * DEPLOYER = owner semua kontrak (wallet admin). Keluaran: alamat (JSON) + baris [vars] untuk worker/wrangler.toml.
 */
import { readFileSync } from 'node:fs';
import { ethers } from 'ethers';

const need = (k) => { const v = process.env[k]; if (!v) throw new Error(`${k} wajib`); return v; };
const provider = new ethers.JsonRpcProvider(need('RPC'));
const owner = new ethers.Wallet(need('DEPLOYER_KEY'), provider);
const SIGNER = need('SIGNER'); // alamat signer vault (bukan kuncinya)
const TREASURY = need('TREASURY');
const TEAM = process.env.TEAM_WALLET || owner.address;
const chainId = (await provider.getNetwork()).chainId;
const USDC = process.env.USDC || (chainId === 8453n ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' : need('USDC'));
const FEED = process.env.ETH_USD_FEED || (chainId === 8453n ? '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70' : need('ETH_USD_FEED')); // Chainlink ETH/USD Base — periksa ulang di data.chain.link
const BASE = process.env.BASE_URL || 'https://axto.io';
const E = (n) => ethers.parseEther(String(n));

const art = (n) => JSON.parse(readFileSync(new URL(`../out/${n}.json`, import.meta.url), 'utf8'));
async function deploy(name, ...args) {
  const a = art(name);
  const c = await new ethers.ContractFactory(a.abi, a.bytecode, owner).deploy(...args);
  await c.waitForDeployment();
  console.error(`${name} → ${await c.getAddress()}`);
  return c;
}
const wait = async (p) => (await p).wait();

const COLS = [
  ['time', 'AXTO Time', 'AXTIME', 10_000_000], ['stamp', 'AXTO Stamp', 'AXSTAMP', 10_000_000], ['quran', "AXTO Qur'an", 'AXQURAN', 10_000_000], ['model', 'AXTO Model', 'AXMODEL', 10_000_000],
  ['ex-time', 'AXTO Exclusive Time', 'AXXTIME', 50_000], ['ex-stamp', 'AXTO Exclusive Stamp', 'AXXSTAMP', 50_000], ['ex-quran', "AXTO Exclusive Qur'an", 'AXXQURAN', 50_000],
];

const token = await deploy('AxtoToken', owner.address);
const sale = await deploy('AxtoSale', owner.address, await token.getAddress(), USDC, FEED, TREASURY, SIGNER);
const house = await deploy('AxtoAuctionHouse', owner.address, TREASURY, SIGNER);
const vest = await deploy('AxtoVesting', await token.getAddress(), TEAM, E(3_000_000));
const lock = await deploy('AxtoLock', await token.getAddress(), TREASURY);
const out = { chainId: Number(chainId), token: await token.getAddress(), sale: await sale.getAddress(), auctionHouse: await house.getAddress(), vesting: await vest.getAddress(), lock: await lock.getAddress(), usdc: USDC, collections: {} };

for (const [key, name, sym, max] of COLS) {
  const col = await deploy('AxtoCollection', name, sym, max, owner.address, TREASURY, `${BASE}/api/meta/${key}/`, `${BASE}/api/contract/${key}`);
  out.collections[key] = await col.getAddress();
  if (key.startsWith('ex-')) await wait(col.setSigner(SIGNER)); // WD: member mint sendiri dengan voucher vault
  else await wait(col.setMinter(await house.getAddress(), true)); // lelang publik: mint saat klaim
}

// distribusi 10 jt: presale 2 jt, tim 3 jt (vesting), kunci 5 thn 2 jt, sisa 3 jt cadangan DEX di wallet admin
await wait(token.setSale(await sale.getAddress()));
for (const a of [await house.getAddress(), await vest.getAddress(), await lock.getAddress(), TREASURY]) await wait(token.setTrusted(a, true));
await wait(token.transfer(await sale.getAddress(), E(2_000_000)));
await wait(token.transfer(await vest.getAddress(), E(3_000_000)));
await wait(token.transfer(await lock.getAddress(), E(2_000_000)));
await wait(house.setCurrency(USDC, true));
await wait(house.setCurrency(await token.getAddress(), true));

console.log(JSON.stringify(out, null, 2));
console.log('\n# worker/wrangler.toml [vars]');
console.log(`CHAIN_ID = "${out.chainId}"\nAUCTION_HOUSE = "${out.auctionHouse}"\nAXTO_TOKEN = "${out.token}"\nAXTO_SALE = "${out.sale}"\nUSDC = "${out.usdc}"`);
for (const [k, v] of Object.entries(out.collections)) console.log(`COLLECTION_${k.replace('-', '_').toUpperCase()} = "${v}"`);
