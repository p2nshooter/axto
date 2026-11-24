// Pembayaran kripto axto.io (pemilik, 24 Nov 2026): member memilih koin & jaringan (stablecoin dianjurkan, jaringan murah
// lebih dulu), lalu mendapat alamat + jumlah tepat + QR. Pembelian berhasil begitu pembayaran diterima — halaman memeriksa
// otomatis. Tanpa innerHTML dari data.
const lang = document.documentElement.lang.startsWith('id') ? 'id' : 'en';
const ID = lang === 'id';
export const PT = ID
  ? { coin: 'Bayar dengan', net: 'Jaringan', rec: 'disarankan', cheap: 'biaya murah', send: 'Kirim TEPAT', to: 'ke alamat', via: 'lewat jaringan', warn: 'Hanya kirim lewat jaringan di atas. Jaringan atau koin lain tidak bisa diterima dan dananya bisa hilang. Jumlah unik ini membuat pembayaran Anda dikenali otomatis — jangan dibulatkan; bila mengirim dari bursa, tambahkan biaya penarikannya.', until: 'Berlaku sampai', left: 'sisa', copy: 'Salin', copied: 'Tersalin', wallet: 'Bayar dengan wallet browser', tx: 'Hash transaksi (opsional, mempercepat pencocokan)', check: 'Saya sudah membayar — cek', status: { await: 'Menunggu pembayaran', partial: 'Diterima sebagian — kirim kekurangannya', paid: 'Pembayaran diterima — memproses', done: 'Berhasil ✓', credited: 'Selesai — nilai yang diterima masuk saldo koin AXTO', expired: 'Kedaluwarsa — tidak ada pembayaran' }, received: 'Diterima', noWallet: 'Wallet browser tidak ditemukan', off: 'Pembayaran kripto belum tersedia, coba lagi nanti.', close: 'Tutup', title: 'Pembayaran', qr: 'Pindai alamat dengan aplikasi wallet' }
  : { coin: 'Pay with', net: 'Network', rec: 'recommended', cheap: 'low fee', send: 'Send EXACTLY', to: 'to the address', via: 'on the network', warn: 'Only send on the network above. Other networks or coins cannot be received and the funds may be lost. This unique amount lets your payment be recognised automatically — do not round it; when sending from an exchange, add its withdrawal fee.', until: 'Valid until', left: 'left', copy: 'Copy', copied: 'Copied', wallet: 'Pay with a browser wallet', tx: 'Transaction hash (optional, speeds up matching)', check: 'I have paid — check', status: { await: 'Waiting for payment', partial: 'Partly received — send the rest', paid: 'Payment received — processing', done: 'Done ✓', credited: 'Done — the amount received went to your AXTO coin balance', expired: 'Expired — no payment' }, received: 'Received', noWallet: 'No browser wallet found', off: 'Crypto payment is not available yet, please try later.', close: 'Close', title: 'Payment', qr: 'Scan the address with your wallet app' };

export const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : String(v)); }
  for (const k of kids.flat()) if (k != null) e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return e;
};
const post = async (u, b) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}), credentials: 'same-origin' })).json();
const get = async (u) => (await fetch(u, { credentials: 'same-origin' })).json();

const copyBtn = (text) => {
  const b = h('button', { type: 'button', class: 'btn sm' }, PT.copy);
  b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(text); b.textContent = PT.copied; setTimeout(() => { b.textContent = PT.copy; }, 1500); } catch { /* abaikan */ } });
  return b;
};

let OPTS = null;
/** Pemilih koin + jaringan. Mengembalikan {el, value()} — value() = {coin, net} atau null bila belum tersedia. */
export async function payChooser() {
  OPTS ??= await get('/api/pay/options').catch(() => ({ ready: false, coins: [] }));
  const el = h('div', { class: 'paychoose' });
  if (!OPTS.ready || !OPTS.coins?.length) { el.append(h('p', { class: 'warn' }, PT.off)); return { el, value: () => null }; }
  const coin = h('select', { name: 'paycoin' }, OPTS.coins.map((c) => h('option', { value: c.coin }, `${c.label} — ${c.name}${c.stable ? ` (${PT.rec})` : ''}`)));
  const net = h('select', { name: 'paynet' });
  const fill = () => {
    const c = OPTS.coins.find((x) => x.coin === coin.value);
    net.replaceChildren(...(c?.nets ?? []).map((n) => h('option', { value: n.net }, `${n.label}${n.cheap ? ` · ${PT.cheap}` : ''}`)));
  };
  coin.addEventListener('change', fill);
  fill();
  el.append(h('label', {}, PT.coin, ' ', coin), ' ', h('label', {}, PT.net, ' ', net));
  return { el, value: () => ({ coin: coin.value, net: net.value }), onChange: (fn) => { coin.addEventListener('change', fn); net.addEventListener('change', fn); } };
}

const toUnits = (amount, dec) => {
  const [w, f = ''] = String(amount).split('.');
  return BigInt(w) * 10n ** BigInt(dec) + BigInt((f + '0'.repeat(dec)).slice(0, dec) || '0');
};

async function walletPay(x, out) {
  const eth = window.ethereum;
  if (!eth) throw new Error(PT.noWallet);
  const want = `0x${Number(x.chainId).toString(16)}`;
  if ((await eth.request({ method: 'eth_chainId' })) !== want) await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: want }] });
  const [from] = await eth.request({ method: 'eth_requestAccounts' });
  const tx = x.token
    ? { from, to: x.token.addr, data: `0xa9059cbb${x.address.replace(/^0x/, '').toLowerCase().padStart(64, '0')}${toUnits(x.amount, x.token.dec).toString(16).padStart(64, '0')}` }
    : { from, to: x.address, value: `0x${toUnits(x.amount, 18).toString(16)}` };
  const hash = await eth.request({ method: 'eth_sendTransaction', params: [tx] });
  out.value = hash;
  return hash;
}

/**
 * Dialog bayar untuk satu intent. Memeriksa status tiap 15 detik selama terbuka; onDone(intent) dipanggil saat selesai.
 */
export function payDialog(intent, { onDone } = {}) {
  let x = intent;
  const dlg = h('dialog', { class: 'np-dialog pay-dialog' });
  const st = h('p', { class: 'pay-st', role: 'status' });
  const recv = h('p', { class: 'meta' });
  const countdown = h('span', {});
  const txIn = h('input', { type: 'text', placeholder: '0x… / txid', autocomplete: 'off', spellcheck: 'false' });
  const msg = h('p', { class: 'mk-msg', role: 'status' });
  const checkBtn = h('button', { type: 'button', class: 'btn gold' }, PT.check);
  const show = () => {
    st.textContent = PT.status[x.status] ?? x.status;
    st.className = `pay-st ${['done', 'credited'].includes(x.status) ? 'ok' : x.status === 'expired' ? 'warn' : ''}`;
    recv.textContent = x.received && x.received !== '0' ? `${PT.received}: ${x.received} ${x.coinLabel}` : '';
  };
  const tick = () => {
    const ms = x.exp - Date.now();
    countdown.textContent = ms > 0 ? ` (${PT.left} ${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')})` : '';
  };
  const check = async (tx) => {
    const r = await post(`/api/pay/${x.id}/check`, tx ? { tx } : {});
    if (r.intent) { x = r.intent; show(); }
    if (!r.ok && r.error) msg.textContent = r.error;
    if (['done', 'credited'].includes(x.status)) { clearInterval(timer); clearInterval(clock); onDone?.(x); }
  };
  checkBtn.addEventListener('click', async () => { checkBtn.disabled = true; msg.textContent = ''; try { await check(txIn.value.trim() || undefined); } finally { checkBtn.disabled = false; } });
  const walletBtn = x.evm && (x.token || ['eth', 'bnb', 'pol'].includes(x.coin)) ? h('button', { type: 'button', class: 'btn' }, PT.wallet) : null;
  walletBtn?.addEventListener('click', async () => { walletBtn.disabled = true; try { const hash = await walletPay(x, txIn); await check(hash); } catch (e) { msg.textContent = String(e.message ?? e); } finally { walletBtn.disabled = false; } });
  dlg.append(
    h('h2', {}, `${PT.title} · $${x.usd}`),
    h('p', {}, `${PT.send} `, h('strong', { class: 'pay-amt' }, `${x.amount} ${x.coinLabel}`), ' ', copyBtn(x.amount)),
    h('p', {}, `${PT.via} `, h('strong', {}, x.netLabel), ` ${PT.to}:`),
    h('p', { class: 'pay-addr' }, h('code', {}, x.address), ' ', copyBtn(x.address)),
    h('figure', { class: 'pay-qr' }, h('img', { src: x.qr, alt: PT.qr, width: 200, height: 200 }), h('figcaption', { class: 'meta' }, PT.qr)),
    h('p', { class: 'np-warn' }, PT.warn),
    h('p', { class: 'meta' }, `${PT.until}: ${new Date(x.exp).toLocaleString(ID ? 'id-ID' : 'en-US')}`, countdown),
    st, recv,
    walletBtn ? h('p', {}, walletBtn) : null,
    h('label', { class: 'wide' }, PT.tx, txIn),
    h('p', {}, checkBtn, ' ', h('button', { type: 'button', class: 'btn', onclick: () => { clearInterval(timer); clearInterval(clock); dlg.close(); dlg.remove(); } }, PT.close)),
    msg,
  );
  document.body.append(dlg);
  show();
  tick();
  const clock = setInterval(tick, 1000);
  const timer = setInterval(() => { if (!['done', 'credited', 'expired'].includes(x.status)) check().catch(() => {}); }, 15_000);
  dlg.showModal();
  return dlg;
}
