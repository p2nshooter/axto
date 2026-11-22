// AXTO klien: hubungkan wallet (EIP-1193), masuk SIWE, tawar EIP-712, hitung mundur, portal member. Tanpa innerHTML dari data.
const lang = document.documentElement.lang.startsWith('id') ? 'id' : 'en';
const L = {
  id: { connected: 'Terhubung', noWallet: 'Pasang MetaMask atau wallet EVM lain.', signing: 'Tanda tangani di wallet…', ok: 'Tawaran diterima', err: 'Gagal', approve: 'Izinkan dana (allowance) dulu…', insufficient: 'Saldo/izin tidak cukup', low: 'Tawaran terlalu rendah, minimal', lead: 'Anda memimpin', ended: 'Berakhir', d: 'h', save: 'Tersimpan', claim: 'Klaim (Anda bayar gas)', claimed: 'Terklaim', logout: 'Keluar' },
  en: { connected: 'Connected', noWallet: 'Install MetaMask or another EVM wallet.', signing: 'Sign in your wallet…', ok: 'Bid accepted', err: 'Failed', approve: 'Approve funds (allowance) first…', insufficient: 'Balance/allowance too low', low: 'Bid too low, minimum', lead: 'You are leading', ended: 'Ended', d: 'd', save: 'Saved', claim: 'Claim (you pay gas)', claimed: 'Claimed', logout: 'Sign out' },
}[lang];
const $ = (s, r = document) => r.querySelector(s);
const post = async (u, b) => { const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}), credentials: 'same-origin' }); return r.json(); };
const get = async (u) => (await fetch(u, { credentials: 'same-origin' })).json();
let cfg = null;
const config = async () => (cfg ??= await get('/api/config'));
const eth = () => window.ethereum;

async function ensureChain() {
  const c = await config();
  const want = `0x${c.chainId.toString(16)}`;
  const cur = await eth().request({ method: 'eth_chainId' });
  if (cur !== want) await eth().request({ method: 'wallet_switchEthereumChain', params: [{ chainId: want }] });
}

async function connect() {
  if (!eth()) { alert(L.noWallet); return null; }
  const [address] = await eth().request({ method: 'eth_requestAccounts' });
  const me = await get('/api/me');
  if (me.wallet && me.wallet.toLowerCase() === address.toLowerCase()) return me;
  const { message } = await post('/api/auth/nonce', { address, lang });
  const signature = await eth().request({ method: 'personal_sign', params: [message, address] });
  const r = await post('/api/auth/verify', { message, signature });
  if (r.error) throw new Error(r.error);
  return get('/api/me');
}

const portal = (admin) => `/${lang}/${admin ? 'admin' : 'member'}`;
function showWallet(me) {
  const b = $('#connect');
  if (!b || !me?.wallet) return;
  b.textContent = `${me.admin ? 'Admin · ' : ''}${me.wallet.slice(0, 6)}…${me.wallet.slice(-4)}`;
  b.dataset.on = '1';
  b.dataset.admin = me.admin ? '1' : '';
  // wallet admin: menu "Member" menjadi "Admin" dan mengarah ke Portal admin
  if (me.admin) {
    const a = document.querySelector('.top nav a[href$="/member"]');
    if (a) { a.textContent = 'Admin'; a.href = portal(true); }
    if (/\/member\/?$/.test(location.pathname)) location.replace(portal(true));
  }
}

// ---- hitung mundur ----
function tickCountdowns() {
  const now = Date.now();
  document.querySelectorAll('time[data-countdown]').forEach((el) => {
    const ms = Number(el.dataset.countdown) - now;
    if (ms <= 0) { el.textContent = L.ended; return; }
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    el.textContent = `${d ? `${d}${L.d} ` : ''}${hh}:${mm}:${ss}`;
    el.dateTime = new Date(Number(el.dataset.countdown)).toISOString();
  });
}
setInterval(tickCountdowns, 1000);
tickCountdowns();

// ---- menawar ----
const UNIT = { USDC: 10n ** 4n, AXTO: 10n ** 15n };
const ERC20_APPROVE = '0x095ea7b3';
const pad = (h) => h.replace(/^0x/, '').padStart(64, '0');

async function approveIfNeeded(token, owner, spender, need) {
  const data = `0xdd62ed3e${pad(owner)}${pad(spender)}`;
  const cur = BigInt(await eth().request({ method: 'eth_call', params: [{ to: token, data }, 'latest'] }));
  if (cur >= need) return;
  const msg = $('.bidmsg');
  if (msg) msg.textContent = L.approve;
  const hash = await eth().request({ method: 'eth_sendTransaction', params: [{ from: owner, to: token, data: `${ERC20_APPROVE}${pad(spender)}${pad(need.toString(16))}` }] });
  for (let i = 0; i < 60; i += 1) {
    const rc = await eth().request({ method: 'eth_getTransactionReceipt', params: [hash] });
    if (rc) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function bid(box, kind) {
  const msg = $('.bidmsg', box);
  try {
    const me = await connect();
    showWallet(me);
    await ensureChain();
    const c = await config();
    const cur = box.dataset.currency;
    const per = cur === 'USDC' ? 100 : 1000;
    let units;
    if (kind === 'auto') units = Number(box.dataset.minProxy);
    else units = Math.round(Number($('input', box).value) * per);
    if (!(units > 0)) { msg.textContent = `${L.low} ${(Number(box.dataset.minFixed) / per).toFixed(2)}`; return; }
    const lot = await get(`/api/lot/${box.dataset.c}/${box.dataset.id}`);
    const token = cur === 'USDC' ? c.usdc : c.axto;
    const maxAmount = BigInt(units) * UNIT[cur];
    await approveIfNeeded(token, me.wallet, c.auctionHouse, maxAmount);
    const { lotId } = lot; // keccak256("axto:c:id") dari server
    const nonceV = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 86400);
    const typed = {
      types: { EIP712Domain: [{ name: 'name', type: 'string' }, { name: 'version', type: 'string' }, { name: 'chainId', type: 'uint256' }, { name: 'verifyingContract', type: 'address' }],
        Bid: [{ name: 'lotId', type: 'bytes32' }, { name: 'collection', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'currency', type: 'address' }, { name: 'maxAmount', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }] },
      primaryType: 'Bid',
      domain: { name: 'AXTO Auction House', version: '1', chainId: c.chainId, verifyingContract: c.auctionHouse },
      message: { lotId, collection: c.collections[box.dataset.c], tokenId: String(box.dataset.id), currency: token, maxAmount: maxAmount.toString(), nonce: nonceV.toString(), deadline: deadline.toString() },
    };
    msg.textContent = L.signing;
    const sig = await eth().request({ method: 'eth_signTypedData_v4', params: [me.wallet, JSON.stringify(typed)] });
    const r = await post('/api/bid', { c: box.dataset.c, tokenId: Number(box.dataset.id), kind: 'proxy', units, nonce: nonceV.toString(), deadline: deadline.toString(), sig });
    if (r.ok) { msg.textContent = r.leader?.toLowerCase() === me.wallet.toLowerCase() ? `${L.ok} · ${L.lead}` : L.ok; setTimeout(() => location.reload(), 1200); }
    else msg.textContent = r.error === 'insufficient_funds' ? L.insufficient : r.error === 'too_low' ? `${L.low} ${(r.min / per).toFixed(2)}` : `${L.err}: ${r.error}`;
  } catch (e) { msg.textContent = `${L.err}: ${e.message ?? e}`; }
}


document.querySelectorAll('.bidbox').forEach((box) => {
  box.querySelectorAll('[data-bid]').forEach((b) => b.addEventListener('click', () => bid(box, b.dataset.bid)));
});

// ---- tombol connect ----
$('#connect')?.addEventListener('click', async () => {
  const b = $('#connect');
  // sudah masuk → tombol wallet membuka portal (admin untuk wallet admin)
  if (b?.dataset.on) { location.href = portal(b.dataset.admin === '1'); return; }
  try { showWallet(await connect()); } catch (e) { alert(`${L.err}: ${e.message ?? e}`); }
});
get('/api/me').then(showWallet).catch(() => {});

// ---- portal member ----
const mem = $('#member');
if (mem) {
  get('/api/me').then((me) => {
    if (!me.wallet) return;
    mem.replaceChildren();
    const h = (tag, text) => { const e = document.createElement(tag); if (text) e.textContent = text; return e; };
    mem.append(h('p', `${L.connected}: ${me.wallet}`));
    const f = document.createElement('form');
    for (const [name, type, label, val] of [['username', 'text', lang === 'id' ? 'Nama pengguna' : 'Username', me.username ?? ''], ['email', 'email', 'Email', me.email ?? ''], ['password', 'password', lang === 'id' ? 'Kata sandi (min. 10)' : 'Password (min. 10)', '']]) {
      const lab = h('label', label);
      const i = document.createElement('input');
      Object.assign(i, { name, type, value: val, autocomplete: type === 'password' ? 'new-password' : name });
      lab.append(i);
      f.append(lab);
    }
    const sv = h('button', lang === 'id' ? 'Simpan' : 'Save');
    sv.className = 'btn gold';
    const out = h('p');
    out.setAttribute('role', 'status');
    f.append(sv, out);
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const fd = Object.fromEntries(new FormData(f));
      if (!fd.password) delete fd.password;
      const r = await post('/api/me/profile', fd);
      out.textContent = r.error ? `${L.err}: ${r.error}` : L.save;
    });
    mem.append(f);
    // menang & klaim (pemenang membayar gas)
    const wins = h('section');
    wins.append(h('h2', lang === 'id' ? 'Menang — menunggu klaim' : 'Won — awaiting claim'));
    const ul = document.createElement('ul');
    wins.append(ul);
    get('/api/me/wins').then(({ items = [] }) => {
      if (!items.length) ul.append(h('li', '—'));
      for (const w of items) {
        const li = h('li', `${w.c} #${w.tokenId} · ${(w.amount / (w.currency === 'USDC' ? 100 : 1000)).toFixed(w.currency === 'USDC' ? 2 : 3)} ${w.currency} · `);
        const t = document.createElement('time');
        t.dataset.countdown = String(w.until);
        li.append(t, ' ');
        const b = h('button', L.claim);
        b.className = 'btn gold';
        b.disabled = !w.ready;
        b.addEventListener('click', async () => {
          try {
            await ensureChain();
            const d = await get(`/api/claim/${w.c}/${w.tokenId}`);
            if (d.error) throw new Error(d.error);
            const c = await config();
            const token = w.currency === 'USDC' ? c.usdc : c.axto;
            await approveIfNeeded(token, me.wallet, c.auctionHouse, BigInt(d.result.price));
            const hash = await eth().request({ method: 'eth_sendTransaction', params: [{ from: me.wallet, to: d.tx.to, data: d.tx.data }] });
            b.textContent = `${L.claimed} · ${hash.slice(0, 10)}…`;
            setTimeout(() => post(`/api/claim/${w.c}/${w.tokenId}`), 15000);
          } catch (e) { b.textContent = `${L.err}: ${e.message ?? e}`; }
        });
        li.append(b);
        ul.append(li);
      }
    });
    mem.append(wins);
    // kustodi eksklusif & WD (member membayar gas mint)
    const cus = h('section');
    cus.append(h('h2', lang === 'id' ? 'Kustodi eksklusif axto.io' : 'axto.io exclusive custody'));
    const cl = document.createElement('ul');
    cus.append(cl);
    get('/api/me/custody').then(({ items = [] }) => {
      if (!items.length) cl.append(h('li', '—'));
      for (const it of items) {
        const li = h('li', `${it.c} #${it.tokenId} · ${it.status} `);
        const b = h('button', lang === 'id' ? 'Tarik ke wallet' : 'Withdraw to wallet');
        b.className = 'btn';
        b.addEventListener('click', async () => {
          const r = await post('/api/wd', { c: it.c, tokenId: it.tokenId });
          b.textContent = r.ok ? (lang === 'id' ? 'Voucher siap — kirim mintWithVoucher dari wallet' : 'Voucher ready — send mintWithVoucher from your wallet') : `${L.err}: ${r.error}`;
        });
        li.append(b);
        cl.append(li);
      }
    });
    mem.append(cus);
    tickCountdowns();
    const lo = h('button', L.logout);
    lo.className = 'btn ghost';
    lo.addEventListener('click', async () => { await post('/api/auth/logout'); location.reload(); });
    mem.append(lo);
  });
}

// ---- beli koin ----
document.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', async () => {
  const out = $('.buymsg');
  try {
    await connect();
    const coins = Number($('#coin-n').value);
    if (b.dataset.buy === 'paypal') {
      const r = await post('/api/paypal/order', { coins });
      if (!r.ok) { out.textContent = `${L.err}: ${r.error}`; return; }
      location.href = `https://www.paypal.com/checkoutnow?token=${encodeURIComponent(r.id)}`;
      return;
    }
    out.textContent = lang === 'id' ? 'Buka wallet Anda untuk membeli langsung dari kontrak AxtoSale.' : 'Open your wallet to buy directly from the AxtoSale contract.';
  } catch (e) { out.textContent = `${L.err}: ${e.message ?? e}`; }
}));
