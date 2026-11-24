/**
 * Diagnosis pembayaran kripto (pemilik, 24 Nov 2026): kenapa worker belum bisa membaca alamat deposit akun penampung.
 * Mencetak HANYA status & kode galat (tanpa alamat, saldo, nama, email, kunci):
 *   1. pay/sync.json & pay/cfg.json di R2 (galat terakhir dari worker),
 *   2. getInfo langsung dari runner GitHub dengan kunci yang sama (apakah kuncinya sah),
 *   3. ticker publik dari runner.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmac } from 'node:crypto';

const tmp = mkdtempSync(join(tmpdir(), 'pay-'));
const r2 = (k) => { const f = join(tmp, 'o'); try { execFileSync('npx', ['--yes', 'wrangler@4.156.1', 'r2', 'object', 'get', `axto-nft-data/${k}`, '--file', f, '--remote'], { stdio: 'pipe' }); return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };
const sync = r2('pay/sync.json');
const cfg = r2('pay/cfg.json');
console.log('R2 pay/sync.json:', sync ? JSON.stringify({ ok: sync.ok, error: sync.error ?? null, at: sync.at ? new Date(sync.at).toISOString() : null }) : 'tidak ada');
console.log('R2 pay/cfg.json:', cfg ? `ada (${cfg.opts?.length ?? 0} koin)` : 'tidak ada');
const key = process.env.PAY_API_KEY;
const secret = process.env.PAY_API_SECRET;
console.log('kunci di runner:', key ? `ada (${key.length} karakter)` : 'TIDAK ADA', '· secret:', secret ? `ada (${secret.length} karakter)` : 'TIDAK ADA');
if (key && secret) {
  const body = new URLSearchParams({ method: 'getInfo', timestamp: String(Date.now()), recvWindow: '15000' }).toString();
  const sign = createHmac('sha512', secret).update(body).digest('hex');
  const r = await fetch('https://indodax.com/tapi', { method: 'POST', headers: { Key: key, Sign: sign, 'content-type': 'application/x-www-form-urlencoded' }, body });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch { j = null; }
  console.log('getInfo dari runner: HTTP', r.status, '· success', j?.success ?? '-', '· error_code', j?.error_code ?? '-', '· error', String(j?.error ?? (j ? '' : t.slice(0, 80))).slice(0, 120));
  if (j?.success === 1) {
    const net = j.return?.network ?? {};
    const coins = ['usdt', 'usdc', 'eth', 'btc', 'bnb', 'sol', 'trx', 'pol', 'matic', 'doge', 'ltc'];
    for (const c of coins) if (j.return?.address?.[c]) console.log(`  ${c}: jaringan ${JSON.stringify(net[c] ?? null)} · bentuk alamat ${typeof j.return.address[c]}`);
  }
}
const p = await fetch('https://indodax.com/api/ticker_all');
console.log('ticker publik dari runner: HTTP', p.status);
