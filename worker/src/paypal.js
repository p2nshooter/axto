/**
 * PayPal → koin AXTO. Worker publik hanya meneruskan: pembuatan order, capture, dan webhook diverifikasi oleh vault
 * (kredensial PayPal & kunci signer voucher hanya di vault). Koin dikirim ke wallet member lewat voucher yang
 * member klaim sendiri di AxtoSale.claimPaid (member membayar gas).
 * Saklar PAYPAL_COIN_SALE harus "on" (hanya setelah PayPal menyetujui penjualan aset kripto untuk akun ini).
 */
import { appendLog } from './r2.js';
import { vault } from './vault.js';

const MAX_COINS_PER_ORDER = 5_000;

export async function createOrder(env, wallet, coins) {
  if (env.PAYPAL_COIN_SALE !== 'on') return { ok: false, error: 'paypal_off' };
  const n = Number(coins);
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_COINS_PER_ORDER) return { ok: false, error: 'amount' };
  const r = await vault(env, 'paypalCreateOrder', { wallet, coins: n });
  await appendLog(env.STORE, 'paypal', { ev: 'create', wallet, coins: n, order: r.id });
  return { ok: true, id: r.id };
}

export async function captureOrder(env, wallet, orderId) {
  if (env.PAYPAL_COIN_SALE !== 'on') return { ok: false, error: 'paypal_off' };
  if (!/^[A-Z0-9]{10,24}$/.test(String(orderId))) return { ok: false, error: 'order' };
  const r = await vault(env, 'paypalCapture', { wallet, orderId });
  await appendLog(env.STORE, 'paypal', { ev: 'capture', wallet, order: orderId, ok: r.ok });
  return r; // {ok, voucher:{to, amount, ref, deadline, sig}} — dikirim member ke AxtoSale.claimPaid
}

/** Webhook PayPal: body mentah + header transmisi diteruskan apa adanya; vault memverifikasi ke PayPal. */
export async function webhook(request, env) {
  const raw = await request.text();
  if (raw.length > 256_000) return new Response('too large', { status: 413 });
  const h = {};
  for (const k of ['paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id', 'paypal-transmission-sig', 'paypal-transmission-time']) h[k] = request.headers.get(k);
  if (Object.values(h).some((v) => !v)) return new Response('missing headers', { status: 400 });
  const r = await vault(env, 'paypalWebhook', { headers: h, body: raw });
  await appendLog(env.STORE, 'paypal', { ev: 'webhook', id: h['paypal-transmission-id'], verified: Boolean(r.verified), type: r.type ?? null });
  return new Response(r.verified ? 'ok' : 'rejected', { status: r.verified ? 200 : 400 });
}
