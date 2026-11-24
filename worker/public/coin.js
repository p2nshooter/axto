// Koin AXTO: beli (halaman Koin), saldo, staking & jual kembali (Portal member), pantauan seluruh koin (Portal admin).
// Dibuat dengan DOM + textContent — tidak ada innerHTML dari data.
import { payChooser, payDialog } from '/pay.js?v=1';

const lang = document.documentElement.lang.startsWith('id') ? 'id' : 'en';
const T = {
  id: {
    connect: 'Hubungkan wallet Anda dulu (tombol di kanan atas) untuk membeli koin AXTO.',
    usd: 'Jumlah (USD)', cur: 'Bayar dengan', payer: 'Alamat wallet milik Anda di jaringan yang sama (tujuan pencairan kelak)', agree: 'Saya sudah membaca dan menyetujui perjanjian pembelian koin AXTO', terms: 'Perjanjian pembelian koin AXTO (wajib)',
    get: 'Anda menerima', pay: 'Lanjut bayar', paying: 'Membuat pembayaran…', sendExact: 'Kirim tepat', to: 'ke alamat pembayaran ini', memo: 'Memo / extra ID', copy: 'Salin', until: 'Berlaku sampai', status: 'Status', credited: 'masuk ke saldo Anda',
    balance: 'Saldo koin AXTO', approx: 'setara', history: 'Riwayat pembelian', cashouts: 'Riwayat pencairan', none: 'Belum ada.',
    cashout: 'Jual kembali koin AXTO', dest: 'Dikirim ke (alamat & mata uang yang Anda pakai saat membeli)', coins: 'Jumlah koin', value: 'Nilai', penalty: 'Potongan sebelum rilis DEX', receive: 'Diterima (sebelum biaya jaringan)', confirm: 'Saya paham pencairan hanya ke alamat pembelian saya dan potongannya', doCash: 'Cairkan', noDest: 'Belum ada alamat pembelian. Pencairan hanya bisa ke alamat yang pernah Anda pakai membeli koin.',
    err: { auth: 'Masuk dulu dengan wallet Anda.', amount: 'Jumlah di luar batas.', currency: 'Mata uang tidak didukung.', payer_address: 'Alamat wallet pengirim tidak valid untuk jaringan ini.', agreement: 'Setujui perjanjian terlebih dahulu.', np: 'Pembayaran belum bisa dibuat, coba lagi sebentar.', amount_min: 'Pembelian minimal untuk mata uang ini', presale_closed: 'Presale sudah terjual habis.', closed: 'Staking sudah ditutup karena koin AXTO telah dirilis ke DEX.', stock: 'Stok hadiah tier ini sedang habis — coba jumlah lebih kecil.', payout_address: 'Alamat penerima hadiah harus alamat wallet Base (0x…).', months: 'Pilih 3, 6 atau 12 bulan.', rate_limited: 'Terlalu sering, tunggu sebentar.', balance: 'Saldo tidak cukup.', destination: 'Tujuan harus alamat & mata uang pembelian Anda.', minimum: 'Nilai setelah potongan di bawah minimal $20.', retry: 'Coba lagi.' },
    st: { await: 'menunggu pembayaran', partial: 'diterima sebagian', paid: 'diterima — diproses', done: 'selesai', credited: 'selesai (sesuai yang diterima)', manual: 'antre — dibayar admin', paid_out: 'dibayar', creating: 'menyiapkan', waiting: 'menunggu pembayaran', confirming: 'dikonfirmasi jaringan', confirmed: 'terkonfirmasi', sending: 'diproses', partially_paid: 'kurang bayar (dikreditkan sebagian)', finished: 'selesai', failed: 'gagal', refunded: 'dikembalikan', expired: 'kedaluwarsa', error: 'gagal dibuat', queued: 'antre', awaiting_payout_setup: 'antre (payout disiapkan)', retry: 'antre ulang', created: 'diproses', paid: 'terkirim', waiting_balance: 'antre (menunggu dana pembayaran)' },
    adm: { title: 'Koin AXTO — pantauan seluruh koin', ipn: 'URL webhook IPN gerbang pembayaran (tempel di pengaturan notifikasi pembayaran instan)', ready: 'Kesiapan', api: 'API key', ipnS: 'IPN secret', payout: 'Kredensial payout otomatis (email, kata sandi, rahasia 2FA)', yes: 'siap', no: 'belum', totals: 'Ringkasan', members: 'Member pemegang', held: 'Dipegang member', sold: 'Terjual (60 hari)', presale: 'Presale terjual (total)', stake: 'Staking', stakeOpen: 'Staking dibuka', stakeLocked: 'Koin terkunci', stakePos: 'Posisi', returned: 'Dibeli kembali (buyback) — masuk wallet buyback', usdIn: 'USD masuk', usdOut: 'USD dibayarkan', queue: 'Antrean payout', cfg: 'Pengaturan', price: 'Harga koin (USD)', dex: 'Koin sudah dirilis ke DEX (potongan 0%)', save: 'Simpan', orders: 'Pembelian', outs: 'Pencairan', events: 'Semua gerak koin', np: 'Gerbang pembayaran', enabled: 'aktif', disabled: 'belum diaktifkan di gerbang pembayaran' },
  },
  en: {
    connect: 'Connect your wallet first (top right) to buy AXTO coins.',
    usd: 'Amount (USD)', cur: 'Pay with', payer: 'A wallet address you own on the same network (for future cash-outs)', agree: 'I have read and agree to the AXTO coin purchase agreement', terms: 'AXTO coin purchase agreement (required)',
    get: 'You receive', pay: 'Continue to pay', paying: 'Creating payment…', sendExact: 'Send exactly', to: 'to this payment address', memo: 'Memo / extra ID', copy: 'Copy', until: 'Valid until', status: 'Status', credited: 'added to your balance',
    balance: 'AXTO coin balance', approx: 'worth', history: 'Purchase history', cashouts: 'Cash-out history', none: 'Nothing yet.',
    cashout: 'Sell AXTO coins back', dest: 'Sent to (the address & currency you bought with)', coins: 'Coins', value: 'Value', penalty: 'Reduction before DEX release', receive: 'You receive (before network fee)', confirm: 'I understand cash-outs go only to my purchase address and the reduction applies', doCash: 'Cash out', noDest: 'No purchase address yet. Cash-outs can only go to an address you used to buy coins.',
    err: { auth: 'Sign in with your wallet first.', amount: 'Amount out of range.', currency: 'Currency not supported.', payer_address: 'Sending address is not valid for this network.', agreement: 'Please accept the agreement first.', np: 'The payment could not be created, please try again shortly.', amount_min: 'Minimum purchase for this currency', presale_closed: 'The presale is sold out.', closed: 'Staking has closed because the AXTO coin has been released to a DEX.', stock: 'The reward stock for this tier is running out — try a smaller amount.', payout_address: 'The reward address must be a Base wallet address (0x…).', months: 'Choose 3, 6 or 12 months.', rate_limited: 'Too many requests, please wait.', balance: 'Insufficient balance.', destination: 'Destination must be your purchase address & currency.', minimum: 'Value after reduction is below the $20 minimum.', retry: 'Please try again.' },
    st: { await: 'waiting for payment', partial: 'partly received', paid: 'received — processing', done: 'done', credited: 'done (as received)', manual: 'queued — paid by the admin', paid_out: 'paid', creating: 'preparing', waiting: 'waiting for payment', confirming: 'confirming on chain', confirmed: 'confirmed', sending: 'processing', partially_paid: 'underpaid (partly credited)', finished: 'finished', failed: 'failed', refunded: 'refunded', expired: 'expired', error: 'could not be created', queued: 'queued', awaiting_payout_setup: 'queued (payout being set up)', retry: 'queued again', created: 'processing', paid: 'sent', waiting_balance: 'queued (waiting for payout funds)' },
    adm: { title: 'AXTO coin — every coin monitored', ipn: 'Payment gateway IPN webhook URL (paste into the instant payment notification settings)', ready: 'Readiness', api: 'API key', ipnS: 'IPN secret', payout: 'Automatic payout credentials (email, password, 2FA secret)', yes: 'ready', no: 'missing', totals: 'Totals', members: 'Member holders', held: 'Held by members', sold: 'Sold (60 days)', presale: 'Presale sold (total)', stake: 'Staking', stakeOpen: 'Staking open', stakeLocked: 'Coins locked', stakePos: 'Positions', returned: 'Bought back (buyback) — to the buyback wallet', usdIn: 'USD received', usdOut: 'USD paid out', queue: 'Payout queue', cfg: 'Settings', price: 'Coin price (USD)', dex: 'Coin released to a DEX (0% reduction)', save: 'Save', orders: 'Purchases', outs: 'Cash-outs', events: 'Every coin movement', np: 'Payment gateway', enabled: 'enabled', disabled: 'not enabled at the payment gateway' },
  },
}[lang];

const get = async (u) => (await fetch(u, { credentials: 'same-origin' })).json();
const post = async (u, b) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}), credentials: 'same-origin' })).json();
function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.append(c instanceof Node ? c : String(c));
  return e;
}
const copyBtn = (v) => h('button', { type: 'button', class: 'btn ghost sm', onclick: () => navigator.clipboard?.writeText(v) }, T.copy);
const errText = (r) => T.err[r?.error] ?? `${T.err.retry} (${r?.error ?? '?'})`;
const stText = (s) => T.st[s] ?? s;
const short = (a) => (a && a.length > 16 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a ?? '');
const when = (t) => new Date(t).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US');
function table(head, rows) {
  if (!rows.length) return h('p', { class: 'muted' }, T.none);
  return h('div', { class: 'tablewrap' }, h('table', { class: 'split np-table' }, h('thead', {}, h('tr', {}, head.map((x) => h('th', {}, x)))), h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c)))))));
}

// ---------------------------------------------------------------- beli (halaman Koin)
const TX = {
  id: { minFor: 'Minimal untuk mata uang ini', review: 'Periksa & setujui', agreeTitle: 'Sebelum Anda melanjutkan', confirm: 'Setuju & lanjut bayar', cancel: 'Batal' },
  en: { minFor: 'Minimum for this currency', review: 'Review & agree', agreeTitle: 'Before you continue', confirm: 'Agree & continue to pay', cancel: 'Cancel' },
}[lang];

async function buyBox(root) {
  const me = await get('/api/me');
  if (!me.wallet) { root.replaceChildren(h('p', { class: 'muted' }, T.connect)); return; }
  const ag = await get(`/api/coin/agreement?lang=${lang}`);
  const usd = h('input', { type: 'number', min: ag.limits.minBuyUsd, max: ag.limits.maxBuyUsd, step: '1', value: '10', required: true, name: 'usd' });
  const ch = await payChooser();
  const payer = h('input', { type: 'text', name: 'payer', autocomplete: 'off', spellcheck: 'false', required: true, placeholder: '0x… / T… / bc1…' });
  const q = h('p', { class: 'np-quote', role: 'status' });
  const out = h('div', { class: 'np-out', role: 'status' });
  const btn = h('button', { class: 'btn gold', type: 'submit' }, TX.review);
  let timer = 0;
  const requote = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const sel = ch.value() ?? {};
      const r = await get(`/api/coin/quote?usd=${encodeURIComponent(usd.value)}&coin=${encodeURIComponent(sel.coin ?? '')}&net=${encodeURIComponent(sel.net ?? '')}`);
      if (r.minUsd) usd.min = String(r.minUsd);
      q.textContent = r.error ? `${errText(r)}${r.min ? `: $${r.min}` : ''}` : `${T.get}: ${r.coins} AXTO ($${r.priceUsd}/AXTO)${r.estimate ? ` · ≈ ${r.estimate}` : ''}`;
    }, 350);
  };
  usd.addEventListener('input', requote);
  ch.onChange?.(requote);
  requote();
  // Pemilik 24 Nov 2026: ketentuan (termasuk jual kembali) cukup diinfokan saat membeli, dengan peringatan yang santun
  const agree = h('input', { type: 'checkbox', name: 'agree' });
  const go = h('button', { class: 'btn gold', type: 'button', disabled: true }, TX.confirm);
  agree.addEventListener('change', () => { go.disabled = !agree.checked; });
  const dlg = h('dialog', { class: 'np-dialog', 'aria-labelledby': 'np-ag-t' },
    h('h2', { id: 'np-ag-t' }, TX.agreeTitle),
    h('p', { class: 'meta' }, `${T.terms} · v${ag.v}`),
    h('ol', {}, ag.items.map((x) => h('li', {}, x))),
    ag.warn ? h('div', { class: 'np-warn', role: 'note' }, h('strong', {}, `⚠ ${ag.warn.title}`), h('ul', {}, ag.warn.items.map((x) => h('li', {}, x)))) : null,
    h('label', { class: 'check' }, agree, ` ${T.agree}`),
    h('p', {}, go, ' ', h('button', { class: 'btn ghost', type: 'button', onclick: () => dlg.close() }, TX.cancel)));
  go.addEventListener('click', async () => {
    dlg.close();
    btn.disabled = true;
    out.replaceChildren(h('p', {}, T.paying));
    const r = await post('/api/coin/buy', { usd: Number(usd.value), ...(ch.value() ?? {}), payer: payer.value.trim(), agree: agree.checked, agreementV: ag.v, lang });
    btn.disabled = false;
    if (!r.ok) { out.replaceChildren(h('p', { class: 'warn' }, `${errText(r)}${r.min ? `: $${r.min}` : ''}`)); return; }
    out.replaceChildren();
    payDialog(r.intent, { onDone: () => { out.replaceChildren(h('p', { class: 'ok' }, `✓ ${T.credited}`)); } });
  });
  const form = h('form', { class: 'np-form' },
    h('label', {}, T.usd, usd), ch.el, h('label', {}, T.payer, payer), q, btn, out);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    agree.checked = false;
    go.disabled = true;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  });
  root.replaceChildren(form, dlg);
}

// ---------------------------------------------------------------- staking (kalkulator di halaman Koin, formulir di Portal member)
const ST = {
  id: { title: 'Staking koin AXTO', coins: 'Jumlah koin (utuh)', months: 'Lama kunci', m: (n) => `${n} bulan`, payout: 'Alamat penerima hadiah NFT (Base)', get: 'Hadiah Anda', classic: 'Classic', rare: 'Rare', epic: 'Epic', masterpiece: 'Masterpiece', total: 'Total NFT 1/1', agree: 'Saya paham koin terkunci sampai kontrak selesai; hadiah NFT dikirim tanpa biaya gas ke alamat ini saat kontrak selesai.', go: 'Kunci & terima hadiah', start: 'Mulai staking di Portal member', mine: 'Staking saya', end: 'Selesai', status: { locked: 'terkunci', sending: 'sedang dikirim (tanpa gas)', done: 'selesai — hadiah terkirim' }, closed: 'Staking ditutup sejak koin AXTO dirilis ke DEX.', none: 'Belum ada staking.' },
  en: { title: 'AXTO coin staking', coins: 'Coins (whole)', months: 'Lock period', m: (n) => `${n} months`, payout: 'NFT reward address (Base)', get: 'Your rewards', classic: 'Classic', rare: 'Rare', epic: 'Epic', masterpiece: 'Masterpiece', total: 'Total one-of-one NFTs', agree: 'I understand the coins stay locked until the term ends; the NFT rewards are delivered gas-free to this address when it completes.', go: 'Lock & receive rewards', start: 'Start staking in the Member portal', mine: 'My staking', end: 'Ends', status: { locked: 'locked', sending: 'being delivered (gas-free)', done: 'complete — rewards delivered' }, closed: 'Staking closed when the AXTO coin was released to a DEX.', none: 'No staking yet.' },
}[lang];
const TIERS_ = ['classic', 'rare', 'epic', 'masterpiece'];
const rewardText = (r) => TIERS_.filter((k) => r[k]).map((k) => `${r[k].toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')} ${ST[k]}`).join(' · ');

function stakeInputs() {
  const coins = h('input', { type: 'number', min: '1', step: '1', value: '10', required: true, name: 'coins' });
  const months = h('select', { name: 'months' }, [3, 6, 12].map((n) => h('option', { value: String(n), selected: n === 12 }, ST.m(n))));
  const q = h('p', { class: 'np-quote', role: 'status' });
  let timer = 0;
  const requote = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const r = await get(`/api/stake/quote?coins=${encodeURIComponent(coins.value)}&months=${encodeURIComponent(months.value)}`);
      q.textContent = r.error ? (r.error === 'closed' ? ST.closed : errText(r)) : `${ST.get}: ${rewardText(r.rewards)} — ${ST.total}: ${r.total.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')}`;
    }, 300);
  };
  coins.addEventListener('input', requote);
  months.addEventListener('change', requote);
  requote();
  return { coins, months, q };
}

async function stakeCalc(root) {
  const { coins, months, q } = stakeInputs();
  root.replaceChildren(h('div', { class: 'np-form' }, h('label', {}, ST.coins, coins), h('label', {}, ST.months, months), q,
    h('p', {}, h('a', { class: 'btn gold', href: `/${lang}/member#staking` }, ST.start))));
}

function stakeList(stakes) {
  if (!stakes.length) return h('p', { class: 'muted' }, ST.none);
  return h('div', {}, stakes.map((p) => h('div', { class: 'np-warn' },
    h('strong', {}, `${p.coins} AXTO · ${ST.m(p.months)} · ${ST.status[p.status] ?? p.status}`),
    h('p', { class: 'meta' }, `${ST.end}: ${when(p.end)} · ${short(p.payout)}`),
    h('p', {}, rewardText(p.rewards)),
    h('div', { class: 'stake-rw' }, TIERS_.flatMap((k) => (p.preview?.[k] ?? []).slice(0, 6).map((t) => h('a', { href: `/play/stake/${t}`, target: '_blank', rel: 'noopener', title: `OS-ST-${t} · ${ST[k]}` }, h('img', { src: `/img/stake/${t}.svg`, alt: `OS-ST-${t} · ${ST[k]}`, loading: 'lazy', width: '64', height: '64' }))))))));
}

async function stakeBox(root, me) {
  const v = await get('/api/stake/me');
  if (v.error) { root.replaceChildren(); return; }
  const parts = [h('h2', { id: 'staking' }, ST.title)];
  if (v.open) {
    const { coins, months, q } = stakeInputs();
    const payout = h('input', { type: 'text', name: 'payout', value: me?.wallet ?? '', autocomplete: 'off', spellcheck: 'false', required: true });
    const ok = h('input', { type: 'checkbox' });
    const out = h('p', { role: 'status' });
    const form = h('form', { class: 'np-form' }, h('label', {}, ST.coins, coins), h('label', {}, ST.months, months), h('label', {}, ST.payout, payout), q, h('label', { class: 'check' }, ok, ` ${ST.agree}`), h('button', { class: 'btn gold', type: 'submit' }, ST.go), out);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const r = await post('/api/stake', { coins: Number(coins.value), months: Number(months.value), payout: payout.value.trim(), agree: ok.checked, agreementV: v.agreementV });
      out.textContent = r.ok ? `✓ ${rewardText(r.stake.rewards)}` : errText(r);
      if (r.ok) setTimeout(() => stakeBox(root, me), 1200);
    });
    parts.push(form);
  } else parts.push(h('p', { class: 'muted' }, ST.closed));
  parts.push(h('h3', {}, ST.mine), stakeList(v.stakes));
  root.replaceChildren(...parts);
}

// ---------------------------------------------------------------- saldo & cairkan (Portal member)
async function memberBox(root) {
  // belum masuk: tidak memanggil API privat (menghindari 401 di konsol)
  if (!(await get('/api/me')).wallet) { root.replaceChildren(); return; }
  const v = await get('/api/coin/me');
  if (v.error) { root.replaceChildren(); return; }
  const stakeEl = h('div', { class: 'np stake' });
  const coins = h('input', { type: 'number', min: '0', step: '0.000001', name: 'coins', required: true });
  const dest = h('select', { name: 'dest' }, v.destinations.map((d, i) => h('option', { value: String(i) }, `${d.label} · ${short(d.addr)}`)));
  const calc = h('p', { class: 'np-quote', role: 'status' });
  const ok = h('input', { type: 'checkbox' });
  const out = h('p', { role: 'status' });
  const recalc = () => {
    const c = Number(coins.value || 0);
    const value = c * v.priceUsd;
    const pay = value * (100 - v.penaltyPct) / 100;
    calc.textContent = `${T.value}: $${value.toFixed(2)} · ${T.penalty}: ${v.penaltyPct}% · ${T.receive}: $${pay.toFixed(2)}`;
  };
  coins.addEventListener('input', recalc);
  recalc();
  const form = h('form', { class: 'np-form' }, h('label', {}, T.dest, dest), h('label', {}, T.coins, coins), calc, h('label', { class: 'check' }, ok, ` ${T.confirm}`), h('button', { class: 'btn gold', type: 'submit' }, T.doCash), out);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = v.destinations[Number(dest.value)];
    const r = await post('/api/coin/cashout', { coins: coins.value, cur: d?.cur, addr: d?.addr, agree: ok.checked });
    out.textContent = r.ok ? `${T.status}: ${stText(r.cashout.status)} · $${r.cashout.payoutUsd}` : errText(r);
    if (r.ok) setTimeout(() => memberBox(root), 1500);
  });
  root.replaceChildren(
    h('h2', {}, T.balance),
    h('p', { class: 'np-balance' }, h('strong', {}, `${v.balance} AXTO`), ` · ${T.approx} $${(Number(v.balance) * v.priceUsd).toFixed(2)} ($${v.priceUsd}/AXTO)`),
    stakeEl,
    h('h3', {}, T.cashout),
    v.destinations.length ? form : h('p', { class: 'muted' }, T.noDest),
    h('h3', {}, T.history),
    table(['', 'USD', 'AXTO', T.cur, T.payer, T.status, 'Tx'], v.orders.map((o) => [when(o.at), `$${o.usd}`, o.credited !== '0' ? o.credited : o.coins, o.label ?? o.cur, short(o.payer), stText(o.status), short(o.txid)])),
    h('h3', {}, T.cashouts),
    table(['', 'AXTO', T.value, T.receive, T.dest, T.status, 'Tx'], v.cashouts.map((o) => [when(o.at), o.coins, `$${o.valueUsd}`, `$${o.payoutUsd} (−${o.penaltyPct}%)`, `${o.label ?? o.cur} · ${short(o.to)}`, stText(o.status), short(o.txid)])),
  );
  stakeBox(stakeEl, await get('/api/me')).catch(() => null);
}

// ---------------------------------------------------------------- pantauan admin
async function adminBox(root) {
  const v = await get('/api/admin/coin');
  if (v.error) { root.replaceChildren(); return; }
  const sk = await get('/api/admin/stake').catch(() => null);
  const A = T.adm;
  const yes = (b) => h('span', { class: b ? 'ok' : 'warn' }, b ? A.yes : A.no);
  const price = h('input', { type: 'number', min: '0.01', step: '0.01', value: String(v.cfg.priceUsd) });
  const dex = h('input', { type: 'checkbox', checked: v.cfg.dexReleased });
  const saved = h('span', { role: 'status' });
  const cfg = h('form', { class: 'np-form' }, h('label', {}, A.price, price), h('label', { class: 'check' }, dex, ` ${A.dex}`), h('button', { class: 'btn', type: 'submit' }, A.save), saved);
  cfg.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const r = await post('/api/admin/coin/cfg', { priceCents: Math.round(Number(price.value) * 100), dexReleased: dex.checked });
    saved.textContent = r.at ? ' ✓' : ' ✗';
  });
  const t = v.totals;
  const P = v.pay ?? {};
  const ID = lang === 'id';
  const payBox = h('div', { class: 'np' },
    h('h3', {}, ID ? 'Pembayaran kripto (akun penampung, kunci izin lihat)' : 'Crypto payments (receiving account, view-only key)'),
    h('ul', {},
      h('li', {}, `${ID ? 'Kunci API' : 'API key'}: `, yes(P.ready)),
      h('li', {}, `${ID ? 'URL callback (menolak semua penarikan)' : 'Callback URL (refuses every withdrawal)'}: `, h('code', {}, P.callbackUrl ?? ''), ' ', copyBtn(P.callbackUrl ?? '')),
      h('li', {}, `${ID ? 'Sinkron terakhir' : 'Last sync'}: ${P.sync?.at ? when(P.sync.at) : '—'} · ${P.sync?.ok ? '✓' : `✗ ${P.sync?.error ?? ''}`}`),
      h('li', {}, `${ID ? 'Koin & jaringan' : 'Coins & networks'}: ${(P.options?.coins ?? []).join(' · ') || '—'}`),
      P.options?.unknown?.length ? h('li', { class: 'warn' }, `${ID ? 'Jaringan belum dikenali (tidak ditawarkan)' : 'Unrecognised networks (not offered)'}: ${P.options.unknown.join(', ')}`) : null,
      h('li', {}, `${ID ? 'Pembayaran terbuka' : 'Open payments'}: ${P.open ?? 0}`),
      P.alerts ? h('li', { class: 'warn' }, `${ID ? 'Permintaan penarikan yang ditolak' : 'Refused withdrawal requests'}: ${P.alerts}`) : null),
    h('p', {}, ...['refresh', 'sync'].map((op) => h('button', { class: 'btn sm', type: 'button', onclick: async () => { await post('/api/admin/pay', { op }); adminBox(root); } }, op === 'refresh' ? (ID ? 'Muat ulang alamat & jaringan' : 'Reload addresses & networks') : (ID ? 'Cek deposit sekarang' : 'Check deposits now')))),
    P.unmatched?.length ? h('h4', {}, ID ? 'Deposit tanpa pasangan (cocokkan manual ke id pembayaran)' : 'Unmatched deposits (assign to a payment id)') : null,
    P.unmatched?.length ? table(['', 'Coin', ID ? 'Jumlah' : 'Amount', 'Tx', ''], P.unmatched.map((d) => {
      const idIn = h('input', { type: 'text', placeholder: 'p…', class: 'sm' });
      const b = h('button', { class: 'btn sm', type: 'button', onclick: async () => { const r = await post('/api/admin/pay', { op: 'assign', coin: d.coin, depositId: d.depositId, id: idIn.value.trim() }); b.textContent = r.error ? `✗ ${r.error}` : '✓'; } }, ID ? 'Cocokkan' : 'Assign');
      return [when(d.at), d.coin, d.amount, d.tx ?? '', h('span', {}, idIn, ' ', b)];
    })) : null,
    P.recent?.length ? h('h4', {}, ID ? 'Pembayaran terbaru' : 'Recent payments') : null,
    P.recent?.length ? table(['', 'Id', 'Member', ID ? 'Jenis' : 'Kind', 'USD', ID ? 'Jumlah' : 'Amount', T.status], P.recent.map((x) => [when(x.at), x.id, short(x.wallet), x.kind, `$${x.usd}`, `${x.amount} ${x.coinLabel} · ${x.netLabel}`, `${stText(x.status)}${x.received !== '0' ? ` (${x.received})` : ''}`])) : null);
  const cashAct = (o) => {
    if (!['manual', 'queued', 'retry', 'waiting_balance', 'awaiting_payout_setup'].includes(o.status)) return '';
    const tx = h('input', { type: 'text', placeholder: 'tx hash', class: 'sm' });
    const msg = h('span', { role: 'status' });
    const act = (action) => async () => { const r = await post('/api/admin/coin/cashout', { id: o.id, action, tx: tx.value.trim() }); msg.textContent = r.ok ? ' ✓' : ` ✗ ${r.error}`; if (r.ok) setTimeout(() => adminBox(root), 800); };
    return h('span', {}, tx, ' ', h('button', { class: 'btn sm', type: 'button', onclick: act('paid') }, ID ? 'Sudah dibayar' : 'Mark paid'), ' ', h('button', { class: 'btn ghost sm', type: 'button', onclick: act('refund') }, ID ? 'Kembalikan koin' : 'Refund coins'), msg);
  };
  root.replaceChildren(
    h('h2', {}, A.title),
    payBox,
    h('div', { class: 'np-warn' }, h('img', { src: '/brand/axto-buyback-64.png', alt: 'AXTO Coin Buyback', width: '64', height: '64' }), h('div', {}, h('strong', {}, 'AXTO Coin Buyback'), h('p', { class: 'meta' }, `${t.boughtBack} AXTO`), v.buyback?.address ? h('p', {}, h('code', {}, v.buyback.address), ' ', copyBtn(v.buyback.address)) : h('p', { class: 'muted' }, lang === 'id' ? 'Alamat buyback belum dimuat dari konfigurasi privat.' : 'Buyback address not loaded from private config yet.'))),
    h('h3', {}, A.totals),
    h('dl', { class: 'counters' }, [[A.members, t.members], [A.held, `${t.heldByMembers} AXTO`], [A.sold, `${t.soldViaGateway} AXTO`], [A.presale, `${t.presaleSold} AXTO`], [A.returned, `${t.boughtBack} AXTO`], [A.usdIn, `$${t.usdIn}`], [A.usdOut, `$${t.usdPaidOut}`], [A.queue, t.queue]].map(([k, x]) => h('div', {}, h('dt', {}, k), h('dd', {}, String(x))))),
    sk && !sk.error ? h('h3', {}, A.stake) : null,
    sk && !sk.error ? h('dl', { class: 'counters' }, [[A.stakeOpen, sk.open ? A.yes : A.no], [A.stakePos, sk.totals.positions], [A.stakeLocked, `${sk.totals.lockedCoins} AXTO`], ['3/6/12', `${sk.totals.byMonths[3] ?? 0} / ${sk.totals.byMonths[6] ?? 0} / ${sk.totals.byMonths[12] ?? 0}`]].map(([k, x]) => h('div', {}, h('dt', {}, k), h('dd', {}, String(x))))) : null,
    h('h3', {}, A.cfg), cfg,
    h('h3', {}, A.orders),
    table(['', 'Member', 'USD', 'AXTO', T.cur, T.payer, T.status, 'Tx', ''], v.orders.map((o) => [when(o.at), short(o.wallet), `$${o.usd}`, o.credited !== '0' ? o.credited : o.coins, o.label ?? o.cur, o.payer, stText(o.status), o.txid ?? '', o.country ?? ''])),
    h('h3', {}, A.outs),
    table(['', 'Member', 'AXTO', T.receive, T.dest, T.status, 'Tx', ''], v.cashouts.map((o) => [when(o.at), short(o.wallet), o.coins, `$${o.payoutUsd} (−${o.penaltyPct}%)`, `${o.label ?? o.cur} · ${o.to}`, stText(o.status), o.txid ?? '', cashAct(o) || (o.lastError ?? '')])),
    h('h3', {}, A.events),
    table(['', 'Event', 'Member', 'AXTO', 'Ref'], v.events.map((e) => [when(e.at), e.ev, short(e.wallet), `${e.sign}${e.coins}`, e.order ?? e.out ?? e.ref ?? ''])),
  );
}

for (const el of document.querySelectorAll('[data-np]')) {
  const k = el.dataset.np;
  (k === 'buy' ? buyBox : k === 'member' ? memberBox : adminBox)(el).catch(() => null);
}
for (const el of document.querySelectorAll('[data-stake="calc"]')) stakeCalc(el).catch(() => null);
