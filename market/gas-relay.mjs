/**
 * Wallet gas axto.io — pemilik, 24 Nov 2026: „Seluruh gas fee di tanggung axto.io" · „member bisa melakukan WD masal atau
 * di diamkan di axto.io" · „gas fee tetep dari alamat 0x2AB7f55Be9412a42556484Cf38Fd9B91fA34Fed8".
 * Dijalankan workflow gas-relay.yml tiap 10 menit (selesai cepat bila tidak ada pekerjaan):
 *
 *  1. WD tanpa gas: voucher WD member (antrean worker /internal/wd/antre) dikirim wallet gas lewat
 *     AxtoEditions.mintWithVoucher. Penerima tetap wallet member (tertanda tangan di voucher oleh vault); wallet gas hanya
 *     membayar gas. Voucher yang sudah dipakai (member mengirim sendiri) cukup dicatat.
 *  2. Wallet toko sistem (kustodi edisi 1, pencetak edisi berikutnya, pengirim hadiah staking) diisi ulang ETH dari wallet
 *     gas bila menipis — seluruh gas transaksi axto.io bersumber dari wallet gas.
 *  3. Status ringkas → R2 axto-nft-data/cfg/gas.json (portal admin): saldo, antrean, transaksi terakhir.
 *
 * Kunci wallet gas: GitHub Secret GAS_WALLET_PRIVATE_KEY, hanya di runner ini (tidak pernah ke worker, repo atau log).
 * Alamatnya wajib sama dengan GAS_WALLET; kunci lain ditolak. Tanpa kunci: status „menunggu kunci", tidak ada yang dikirim.
 * Uji lokal: test/gas-relay.test.mjs (semua I/O disuntikkan lewat `io`).
 */
import { ethers } from 'ethers';
import { realIO } from './opensea-list.mjs';

export const GAS_WALLET = '0x2AB7f55Be9412a42556484Cf38Fd9B91fA34Fed8';
const RPC = { 8453: 'https://mainnet.base.org', 84532: 'https://sepolia.base.org' };
export const STORE_MIN = ethers.parseEther('0.0008'); // isi ulang wallet toko bila di bawah ini
export const STORE_FILL = ethers.parseEther('0.0012'); // … sampai saldo ini (di bawah ambang terus ke treasury 0,002 ETH)
const ED_ABI = [
  'function mintWithVoucher(address to, uint256[] ids, uint256[] amounts, bytes32 ref, uint256 deadline, bytes sig)',
  'function voucherUsed(bytes32 ref) view returns (bool)',
];

export async function run({ io = realIO(), chainId: chainIn = Number(process.env.CHAIN_ID || 8453), rpc, key = process.env.GAS_WALLET_PRIVATE_KEY, gasWallet = GAS_WALLET, now = () => Math.floor(Date.now() / 1000), log = console.log } = {}) {
  const status = { at: new Date().toISOString(), wallet: gasWallet };
  const put = (extra) => { try { io.r2put('axto-nft-data/cfg/gas.json', JSON.stringify({ ...status, ...extra })); } catch { /* status saja */ } };
  if (!key) { put({ step: 'menunggu kunci wallet gas (GAS_WALLET_PRIVATE_KEY)' }); log('Kunci wallet gas belum diisi — tidak ada yang dikirim.'); return { waiting: 'key' }; }
  const provider = new ethers.JsonRpcProvider(rpc ?? RPC[chainIn], undefined, { cacheTimeout: -1 });
  const chainId = Number((await provider.getNetwork()).chainId);
  const wallet = new ethers.Wallet(key, provider);
  if (wallet.address.toLowerCase() !== gasWallet.toLowerCase()) throw new Error('kunci wallet gas tidak cocok dengan alamat yang ditetapkan pemilik');
  const fee = await provider.getFeeData();
  const tip = fee.maxPriorityFeePerGas ?? 1_000_000n;
  const maxFee = (fee.maxFeePerGas ?? fee.gasPrice ?? 10_000_000n) * 2n;
  let nonce = await provider.getTransactionCount(wallet.address, 'pending');
  const sent = [];
  let waitingBalance = false;

  // 1) WD tanpa gas
  const q = (await io.api('GET', '/internal/wd/antre').catch(() => null))?.items ?? [];
  for (const it of q) {
    const v = it.voucher;
    if (!ethers.isAddress(it.contract ?? '') || !v?.sig) continue;
    const C = new ethers.Contract(it.contract, ED_ABI, wallet);
    if (await C.voucherUsed(v.ref)) { await io.api('POST', '/internal/wd/terkirim', { ref: it.ref, tx: null }); continue; }
    if (Number(v.deadline) <= now()) { log(`Voucher ${it.ref} kedaluwarsa — dilewati`); continue; }
    const args = [v.to, v.ids.map(BigInt), v.amounts.map(BigInt), v.ref, BigInt(v.deadline), v.sig];
    let gas;
    try { gas = ((await C.mintWithVoucher.estimateGas(...args)) * 12n) / 10n; } catch (e) { log(`Voucher ${it.ref} ditolak kontrak: ${String(e.shortMessage ?? e.message).slice(0, 120)}`); continue; }
    if ((await provider.getBalance(wallet.address)) < gas * maxFee) { waitingBalance = true; break; }
    const tx = await C.mintWithVoucher(...args, { gasLimit: gas, maxFeePerGas: maxFee, maxPriorityFeePerGas: tip, nonce: nonce++ });
    await tx.wait();
    await io.api('POST', '/internal/wd/terkirim', { ref: it.ref, tx: tx.hash });
    sent.push({ ref: it.ref, tx: tx.hash });
    log(`WD ${it.ref} terkirim tanpa gas member (${tx.hash})`);
  }

  // 2) isi ulang wallet toko
  let topup = null;
  let store = null;
  try { store = JSON.parse(io.r2get(`axto-nft-data/cfg/contracts-${chainId}.json`) || 'null')?.store ?? null; } catch { store = null; }
  if (store && ethers.isAddress(store) && !waitingBalance) {
    const sb = await provider.getBalance(store);
    if (sb < STORE_MIN) {
      const amount = STORE_FILL - sb;
      const need = amount + 21_000n * maxFee;
      if ((await provider.getBalance(wallet.address)) >= need) {
        const tx = await wallet.sendTransaction({ to: store, value: amount, gasLimit: 21_000n, maxFeePerGas: maxFee, maxPriorityFeePerGas: tip, nonce: nonce++ });
        await tx.wait();
        topup = { to: store, eth: ethers.formatEther(amount), tx: tx.hash };
        log(`Wallet toko diisi ${topup.eth} ETH (${tx.hash})`);
      } else waitingBalance = true;
    }
  }
  const balance = ethers.formatEther(await provider.getBalance(wallet.address));
  put({ step: waitingBalance ? 'menunggu saldo ETH (Base) di wallet gas' : 'berjalan', chainId, balanceEth: balance, queue: q.length, sent, topup });
  return { sent, topup, waitingBalance, queue: q.length, balance };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => console.log(JSON.stringify({ sent: r.sent?.length ?? 0, topup: Boolean(r.topup), waiting: r.waiting ?? (r.waitingBalance ? 'balance' : null) }))).catch((e) => { console.error(String(e.message ?? e).slice(0, 300)); process.exit(1); });
}
