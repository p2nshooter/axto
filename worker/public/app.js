// AXTO klien: hubungkan wallet (EIP-1193), masuk SIWE, hitung mundur, profil member, penjelajah koleksi. Toko/pasar/WD: /market.js. Tanpa innerHTML dari data.
const lang = document.documentElement.lang.startsWith('id') ? 'id' : 'en';
const L = {
  id: { connected: 'Terhubung', noWallet: 'Pasang MetaMask atau wallet EVM lain.', err: 'Gagal', save: 'Tersimpan', logout: 'Keluar', ended: 'Berakhir', d: 'h' },
  en: { connected: 'Connected', noWallet: 'Install MetaMask or another EVM wallet.', err: 'Failed', save: 'Saved', logout: 'Sign out', ended: 'Ended', d: 'd' },
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
    tickCountdowns();
    const lo = h('button', L.logout);
    lo.className = 'btn ghost';
    lo.addEventListener('click', async () => { await post('/api/auth/logout'); location.reload(); });
    mem.append(lo);
  });
}

// ---- tambahkan AXTO ke MetaMask (wallet_watchAsset) ----
document.querySelectorAll('[data-watch-axto]').forEach((b) => b.addEventListener('click', async () => {
  try {
    const c = await config();
    if (!c.axto) { b.textContent = lang === 'id' ? 'Kontrak koin belum aktif' : 'Coin contract not live yet'; return; }
    await eth().request({ method: 'wallet_watchAsset', params: { type: 'ERC20', options: { address: c.axto, symbol: 'AXTO', decimals: 18, image: `${location.origin}/brand/axto-coin-256.png` } } }); // logo AXTO Coin (#51)
  } catch (e) { b.textContent = `${L.err}: ${e.message ?? e}`; }
}));

// ---- penjelajah koleksi cepat (perintah pemilik #37) ----
const ex = $('#explorer');
if (ex) {
  const c = ex.dataset.c;
  const produced = Number(ex.dataset.produced);
  const I = JSON.parse($('#x-i18n')?.textContent || '{}');
  const grid = $('.xgrid', ex);
  const more = $('[data-more]', ex);
  const range = $('.jump input', ex);
  const out = $('.jump output', ex);
  const ftier = $('.ftier', ex);
  const fseries = $('.fseries', ex);
  let next = ex.dataset.next ? Number(ex.dataset.next) : null;
  let busy = false;
  const st = { from: Number(ex.dataset.from), tier: ftier?.value ?? '', series: fseries?.value ?? '', view: [...ex.querySelectorAll('[data-view]')].find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.view ?? 'mosaic' };
  const fmtN = (n) => Number(n).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US');
  const sync = () => {
    const q = new URLSearchParams({ from: String(st.from), view: st.view });
    if (ex.dataset.maker) q.set('maker', ex.dataset.maker); // mode seri G- tetap setelah dimuat ulang
    if (st.tier !== '') q.set('tier', st.tier);
    if (st.series) q.set('series', st.series);
    history.replaceState(null, '', `${location.pathname}?${q}`);
  };
  const tile = (it) => {
    const li = document.createElement('li');
    li.dataset.id = String(it.id);
    li.dataset.tier = String(it.tier);
    const a = document.createElement('a');
    a.href = `/${lang}/nft/${c}/${it.id}${it.gpu ? '?v=g' : ''}`;
    const im = document.createElement('img');
    Object.assign(im, { src: it.gpu ? `/gpu/${c}/${it.id}.png?v=2` : `/img/${c}/${it.id}.svg?v=9`, alt: it.name, loading: 'lazy', width: 300, height: 300 });
    const id = document.createElement('span'); id.className = 'id'; id.textContent = it.gpu ? `G-${fmtN(it.g)}` : `#${fmtN(it.id)}`;
    if (it.gpu) { li.classList.add('g'); li.dataset.g = String(it.g); }
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = it.name;
    const tr = document.createElement('span'); tr.className = `tr t${it.tier}`; tr.textContent = I.tiers?.[it.tier] ?? '';
    a.append(im, id, nm, tr);
    if (it.usd) { const pr = document.createElement('span'); pr.className = 'pr'; pr.textContent = `$${fmtN(it.usd)}`; a.append(pr); }
    // eksklusif: sisa edisi dari 10; publik: jumlah edisi karya
    if (I.ex) { const ed = document.createElement('span'); ed.className = `ed${it.left === 0 ? ' out' : ''}`; ed.textContent = `${it.left ?? I.cap}/${I.cap}`; a.append(ed); }
    else if (it.ed) { const ed = document.createElement('span'); ed.className = 'ed'; ed.textContent = `${it.ed}×`; a.append(ed); }
    li.append(a);
    return li;
  };
  async function load(reset) {
    if (busy || (!reset && next === null)) return;
    busy = true;
    if (more) more.textContent = I.loading;
    if (reset) { grid.replaceChildren(); next = st.from; }
    const q = new URLSearchParams({ from: String(next), n: '60' });
    if (st.tier !== '') q.set('tier', st.tier);
    if (st.series) q.set('series', st.series);
    if (ex.dataset.surah) q.set('surah', ex.dataset.surah);
    if (ex.dataset.maker) q.set('maker', ex.dataset.maker);
    try {
      const r = await get(`/api/browse/${c}?${q}`);
      for (const it of r.items) grid.append(tile(it));
      next = r.next;
      if (reset && !r.items.length) { const p = document.createElement('li'); p.className = 'empty'; p.textContent = I.none; grid.append(p); }
    } finally {
      busy = false;
      if (more) { more.hidden = next === null; more.textContent = more.dataset.label || more.textContent; }
      sync();
    }
  }
  if (more) { more.dataset.label = more.textContent; more.addEventListener('click', (e) => { e.preventDefault(); load(false); }); }
  // gulir tanpa henti
  const sentinel = more?.parentElement;
  if (sentinel && 'IntersectionObserver' in window) new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) load(false); }, { rootMargin: '1200px 0px' }).observe(sentinel);
  // lompat
  let jt;
  range?.addEventListener('input', () => { out.textContent = fmtN(range.value); clearTimeout(jt); jt = setTimeout(() => { st.from = Number(range.value); load(true); }, 220); });
  ftier?.addEventListener('change', () => { st.tier = ftier.value; load(true); });
  fseries?.addEventListener('change', () => { st.series = fseries.value; load(true); });
  // tampilan
  ex.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
    st.view = b.dataset.view;
    ex.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    grid.className = `xgrid v-${st.view}`;
    sync();
  }));
  // pratinjau cepat: ketuk karya → player besar; geser/tekan panah untuk karya berikutnya
  const pk = $('.peek', ex);
  const fr = $('iframe', pk);
  const gim = $('.peek-g', pk);
  const nameEl = $('.peek-name', pk);
  const det = $('[data-peek="detail"]', pk);
  let cur = null;
  const items = () => [...grid.querySelectorAll('li[data-id]')];
  const show = (li) => {
    if (!li) return;
    cur = li;
    const id = li.dataset.id;
    // seri G-: pratinjau = lukisan GPU yang sama dengan kartunya (bukan animasi prosedural yang bentuknya lain)
    const g = li.classList.contains('g');
    // seri G-: player hidup dari lukisan GPU yang sama dengan kartunya (jarum jam bergerak, cap pos, teks Arab asli)
    gim.hidden = true; gim.removeAttribute('src'); fr.hidden = false; fr.src = g ? `/gplay/${c}/${id}` : `/play/${c}/${id}`;
    const nm = li.querySelector('.nm')?.textContent ?? `#${id}`;
    nameEl.textContent = g ? `G-${fmtN(li.dataset.g || li.querySelector('.id')?.textContent?.replace(/\D/g, '') || 0)} · ${nm}` : nm;
    det.href = `/${lang}/nft/${c}/${id}${g ? '?v=g' : ''}`;
    pk.hidden = false;
    document.documentElement.classList.add('peeking');
    const all = items();
    if (all.indexOf(li) > all.length - 6) load(false);
  };
  const step = (d) => { const all = items(); const i = all.indexOf(cur); show(all[Math.max(0, Math.min(all.length - 1, i + d))]); };
  const close = () => { pk.hidden = true; fr.src = 'about:blank'; gim.hidden = true; gim.removeAttribute('src'); document.documentElement.classList.remove('peeking'); cur?.querySelector('a')?.focus(); };
  grid.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    show(a.parentElement);
  });
  pk.addEventListener('click', (e) => {
    const b = e.target.closest('[data-peek]');
    if (e.target === pk) close();
    if (!b) return;
    if (b.dataset.peek === 'prev') step(-1);
    if (b.dataset.peek === 'next') step(1);
    if (b.dataset.peek === 'close') close();
  });
  addEventListener('keydown', (e) => {
    if (pk.hidden) return;
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'Escape') close();
  });
  let tx = null;
  pk.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  pk.addEventListener('touchend', (e) => { if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); tx = null; }, { passive: true });
}

// ---- salin alamat kontrak (halaman Koin: hanya kontrak token & kontrak beli — #43) ----
document.addEventListener('click', (e) => {
  const b = e.target.closest?.('[data-copy]');
  if (!b) return;
  navigator.clipboard?.writeText(b.dataset.copy).then(() => { const t = b.textContent; b.textContent = '✓'; setTimeout(() => { b.textContent = t; }, 1500); });
});

// Koin AXTO lewat NOWPayments (beli, saldo & cairkan, pantauan admin) — dimuat hanya di halaman yang memakainya
if (document.querySelector('[data-np]')) {
  const x = document.createElement('script');
  x.type = 'module';
  x.src = '/coin.js?v=1';
  document.head.append(x);
}
