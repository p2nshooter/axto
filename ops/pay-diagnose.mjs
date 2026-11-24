/**
 * Diagnosis pembayaran kripto (TAPI v2): kunci versi baru hanya berlaku di https://api.indodax.com/api/v2/…
 * Mencetak HANYA status, kode galat, dan nama jaringan yang punya alamat (tanpa alamat, saldo, nama, email, kunci).
 */
import { createHmac } from 'node:crypto';

const key = process.env.PAY_API_KEY;
const secret = process.env.PAY_API_SECRET;
const BASE = 'https://api.indodax.com';
async function call(path, params) {
  const q = new URLSearchParams({ ...params, timestamp: String(Date.now()), recvWindow: '10000' }).toString();
  const sign = createHmac('sha256', secret).update(q).digest('hex');
  const r = await fetch(`${BASE}${path}?${q}`, { headers: { 'X-APIKEY': key, Sign: sign } });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch { j = null; }
  return { status: r.status, j, t };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CAND = {
  USDT: ['BEP20', 'TRC20', 'ERC20', 'POLYGON', 'BASE', 'ARB', 'SOL', 'OP', 'TON'],
  USDC: ['BASE', 'BEP20', 'ERC20', 'POLYGON', 'ARB', 'SOL', 'OP'],
  ETH: ['BASE', 'ARB', 'OP', 'ETH', 'ERC20'],
  BTC: ['BTC'], BNB: ['BEP20', 'BSC'], SOL: ['SOL'], TRX: ['TRC20', 'TRX'], POL: ['POLYGON', 'POL', 'MATIC'], DOGE: ['DOGE'], LTC: ['LTC'],
};
for (const [coin, nets] of Object.entries(CAND)) {
  const got = [];
  for (const n of nets) {
    const r = await call('/api/v2/capital/deposit/address/list', { coin, network: n });
    const row = Array.isArray(r.j) ? r.j[0] : null;
    if (row?.address) got.push(`${n}→${row.network}${row.tag ? '(memo)' : ''}`);
    else if (!Array.isArray(r.j)) got.push(`${n}:HTTP${r.status}:${r.j?.code ?? ''}:${String(r.j?.msg ?? r.t).slice(0, 60)}`);
    await sleep(1300);
  }
  console.log(`${coin}: ${got.join(' · ') || 'tidak ada alamat'}`);
}
const h = await call('/api/v2/capital/deposit/hisrec', { coin: 'USDT', startTime: String(Date.now() - 7 * 86400000), endTime: String(Date.now()), limit: '10' });
console.log('riwayat deposit USDT 7 hari: HTTP', h.status, Array.isArray(h.j) ? `${h.j.length} baris, kolom ${h.j[0] ? Object.keys(h.j[0]).join(',') : '-'}` : `${h.j?.code ?? ''} ${String(h.j?.msg ?? h.t).slice(0, 80)}`);
