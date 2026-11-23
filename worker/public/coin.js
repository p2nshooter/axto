// Koin AXTO lewat NOWPayments: beli (halaman Koin), saldo & cairkan (Portal member), pantauan seluruh koin (Portal admin).
// Dibuat dengan DOM + textContent — tidak ada innerHTML dari data.
const lang = document.documentElement.lang.startsWith('id') ? 'id' : 'en';
const T = {
  id: {
    connect: 'Hubungkan wallet Anda dulu (tombol di kanan atas) untuk membeli koin AXTO.',
    usd: 'Jumlah (USD)', cur: 'Bayar dengan', payer: 'Alamat wallet pengirim Anda (milik Anda sendiri)', agree: 'Saya sudah membaca dan menyetujui perjanjian pembelian koin AXTO', terms: 'Perjanjian pembelian koin AXTO (wajib)',
    get: 'Anda menerima', pay: 'Lanjut bayar', paying: 'Membuat pembayaran…', sendExact: 'Kirim tepat', to: 'ke alamat NOWPayments ini', memo: 'Memo / extra ID', copy: 'Salin', until: 'Berlaku sampai', status: 'Status', credited: 'masuk ke saldo Anda',
    balance: 'Saldo koin AXTO', approx: 'setara', history: 'Riwayat pembelian', cashouts: 'Riwayat pencairan', none: 'Belum ada.',
    cashout: 'Cairkan koin (jual kembali ke axto.io)', dest: 'Dikirim ke (alamat & mata uang yang Anda pakai saat membeli)', coins: 'Jumlah koin', value: 'Nilai', penalty: 'Potongan sebelum rilis DEX', receive: 'Diterima (sebelum biaya jaringan)', confirm: 'Saya paham pencairan hanya ke alamat pembelian saya dan potongannya', doCash: 'Cairkan', noDest: 'Belum ada alamat pembelian. Pencairan hanya bisa ke alamat yang pernah Anda pakai membeli koin.',
    err: { auth: 'Masuk dulu dengan wallet Anda.', amount: 'Jumlah di luar batas.', currency: 'Mata uang tidak didukung.', payer_address: 'Alamat wallet pengirim tidak valid untuk jaringan ini.', agreement: 'Setujui perjanjian terlebih dahulu.', np: 'NOWPayments belum bisa membuat pembayaran, coba lagi sebentar.', rate_limited: 'Terlalu sering, tunggu sebentar.', balance: 'Saldo tidak cukup.', destination: 'Tujuan harus alamat & mata uang pembelian Anda.', minimum: 'Nilai setelah potongan di bawah minimal $20.', retry: 'Coba lagi.' },
    st: { creating: 'menyiapkan', waiting: 'menunggu pembayaran', confirming: 'dikonfirmasi jaringan', confirmed: 'terkonfirmasi', sending: 'diproses', partially_paid: 'kurang bayar (dikreditkan sebagian)', finished: 'selesai', failed: 'gagal', refunded: 'dikembalikan', expired: 'kedaluwarsa', error: 'gagal dibuat', queued: 'antre', awaiting_payout_setup: 'antre (payout disiapkan)', retry: 'antre ulang', created: 'diproses', paid: 'terkirim' },
    adm: { title: 'Koin AXTO — pantauan seluruh koin (NOWPayments)', ipn: 'URL webhook IPN (tempel di NOWPayments → Payment settings → Instant payment notifications)', ready: 'Kesiapan', api: 'API key', ipnS: 'IPN secret', payout: 'Kredensial payout otomatis (email, kata sandi, rahasia 2FA)', yes: 'siap', no: 'belum', totals: 'Ringkasan', members: 'Member pemegang', held: 'Dipegang member', sold: 'Terjual lewat NOWPayments (60 hari)', returned: 'Dibeli kembali (buyback) — masuk wallet buyback', usdIn: 'USD masuk', usdOut: 'USD dibayarkan', queue: 'Antrean payout', cfg: 'Pengaturan', price: 'Harga koin (USD)', dex: 'Koin sudah dirilis ke DEX (potongan 0%)', save: 'Simpan', orders: 'Pembelian', outs: 'Pencairan', events: 'Semua gerak koin', np: 'NOWPayments', enabled: 'aktif', disabled: 'belum diaktifkan di NOWPayments' },
  },
  en: {
    connect: 'Connect your wallet first (top right) to buy AXTO coins.',
    usd: 'Amount (USD)', cur: 'Pay with', payer: 'Your sending wallet address (one you own)', agree: 'I have read and agree to the AXTO coin purchase agreement', terms: 'AXTO coin purchase agreement (required)',
    get: 'You receive', pay: 'Continue to pay', paying: 'Creating payment…', sendExact: 'Send exactly', to: 'to this NOWPayments address', memo: 'Memo / extra ID', copy: 'Copy', until: 'Valid until', status: 'Status', credited: 'added to your balance',
    balance: 'AXTO coin balance', approx: 'worth', history: 'Purchase history', cashouts: 'Cash-out history', none: 'Nothing yet.',
    cashout: 'Cash out coins (sell back to axto.io)', dest: 'Sent to (the address & currency you bought with)', coins: 'Coins', value: 'Value', penalty: 'Reduction before DEX release', receive: 'You receive (before network fee)', confirm: 'I understand cash-outs go only to my purchase address and the reduction applies', doCash: 'Cash out', noDest: 'No purchase address yet. Cash-outs can only go to an address you used to buy coins.',
    err: { auth: 'Sign in with your wallet first.', amount: 'Amount out of range.', currency: 'Currency not supported.', payer_address: 'Sending address is not valid for this network.', agreement: 'Please accept the agreement first.', np: 'NOWPayments could not create the payment, try again shortly.', rate_limited: 'Too many requests, please wait.', balance: 'Insufficient balance.', destination: 'Destination must be your purchase address & currency.', minimum: 'Value after reduction is below the $20 minimum.', retry: 'Please try again.' },
    st: { creating: 'preparing', waiting: 'waiting for payment', confirming: 'confirming on chain', confirmed: 'confirmed', sending: 'processing', partially_paid: 'underpaid (partly credited)', finished: 'finished', failed: 'failed', refunded: 'refunded', expired: 'expired', error: 'could not be created', queued: 'queued', awaiting_payout_setup: 'queued (payout being set up)', retry: 'queued again', created: 'processing', paid: 'sent' },
    adm: { title: 'AXTO coin — every coin monitored (NOWPayments)', ipn: 'IPN webhook URL (paste in NOWPayments → Payment settings → Instant payment notifications)', ready: 'Readiness', api: 'API key', ipnS: 'IPN secret', payout: 'Automatic payout credentials (email, password, 2FA secret)', yes: 'ready', no: 'missing', totals: 'Totals', members: 'Member holders', held: 'Held by members', sold: 'Sold via NOWPayments (60 days)', returned: 'Bought back (buyback) — to the buyback wallet', usdIn: 'USD received', usdOut: 'USD paid out', queue: 'Payout queue', cfg: 'Settings', price: 'Coin price (USD)', dex: 'Coin released to a DEX (0% reduction)', save: 'Save', orders: 'Purchases', outs: 'Cash-outs', events: 'Every coin movement', np: 'NOWPayments', enabled: 'enabled', disabled: 'not enabled in NOWPayments' },
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
async function buyBox(root) {
  const me = await get('/api/me');
  if (!me.wallet) { root.replaceChildren(h('p', { class: 'muted' }, T.connect)); return; }
  const ag = await get(`/api/coin/agreement?lang=${lang}`);
  const usd = h('input', { type: 'number', min: ag.limits.minBuyUsd, max: ag.limits.maxBuyUsd, step: '1', value: '50', required: true, name: 'usd' });
  const cur = h('select', { name: 'cur' }, Object.entries(ag.currencies).map(([k, v]) => h('option', { value: k }, v)));
  const payer = h('input', { type: 'text', name: 'payer', autocomplete: 'off', spellcheck: 'false', required: true, placeholder: 'T… / 0x… / 1… / bc1…' });
  const agree = h('input', { type: 'checkbox', name: 'agree' });
  const q = h('p', { class: 'np-quote', role: 'status' });
  const out = h('div', { class: 'np-out', role: 'status' });
  const terms = h('details', { class: 'np-terms', open: true }, h('summary', {}, `${T.terms} · v${ag.v}`), h('ol', {}, ag.items.map((x) => h('li', {}, x))));
  const btn = h('button', { class: 'btn gold', type: 'submit' }, T.pay);
  let timer = 0;
  const requote = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const r = await get(`/api/coin/quote?usd=${encodeURIComponent(usd.value)}&cur=${encodeURIComponent(cur.value)}`);
      q.textContent = r.error ? errText(r) : `${T.get}: ${r.coins} AXTO ($${r.priceUsd}/AXTO)${r.estimate ? ` · ≈ ${r.estimate} ${cur.selectedOptions[0].textContent.split(' ')[0]}` : ''}`;
    }, 350);
  };
  usd.addEventListener('input', requote);
  cur.addEventListener('change', requote);
  requote();
  const form = h('form', { class: 'np-form' },
    h('label', {}, T.usd, usd), h('label', {}, T.cur, cur), h('label', {}, T.payer, payer), q, terms,
    h('label', { class: 'check' }, agree, ` ${T.agree}`), btn, out);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    btn.disabled = true;
    out.replaceChildren(h('p', {}, T.paying));
    const r = await post('/api/coin/buy', { usd: Number(usd.value), cur: cur.value, payer: payer.value.trim(), agree: agree.checked, agreementV: ag.v, lang });
    btn.disabled = false;
    if (!r.ok) { out.replaceChildren(h('p', { class: 'warn' }, errText(r))); return; }
    showPayment(out, r.order);
  });
  root.replaceChildren(form);
}

function showPayment(out, o) {
  const st = h('p', { class: 'np-status' }, `${T.status}: ${stText(o.status)}`);
  out.replaceChildren(h('div', { class: 'np-pay' },
    h('p', {}, `${T.sendExact} `, h('strong', {}, `${o.pay.amount} ${String(o.pay.currency).toUpperCase()}`), ` ${T.to}:`),
    h('p', {}, h('code', {}, o.pay.address), ' ', copyBtn(o.pay.address)),
    o.pay.extraId ? h('p', {}, `${T.memo}: `, h('code', {}, o.pay.extraId), ' ', copyBtn(o.pay.extraId)) : null,
    o.pay.until ? h('p', { class: 'meta' }, `${T.until}: ${when(o.pay.until)}`) : null,
    h('p', { class: 'meta' }, `${T.get}: ${o.coins} AXTO · ${o.label}`), st));
  const poll = async () => {
    const x = await get(`/api/coin/order/${o.id}`);
    if (x.error) return;
    st.textContent = `${T.status}: ${stText(x.status)}${x.credited !== '0' ? ` · ${x.credited} AXTO ${T.credited}` : ''}`;
    if (!['finished', 'failed', 'expired', 'refunded'].includes(x.status)) setTimeout(poll, 15_000);
  };
  setTimeout(poll, 10_000);
}

// ---------------------------------------------------------------- saldo & cairkan (Portal member)
async function memberBox(root) {
  const v = await get('/api/coin/me');
  if (v.error) { root.replaceChildren(); return; }
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
    h('h3', {}, T.cashout),
    v.destinations.length ? form : h('p', { class: 'muted' }, T.noDest),
    h('h3', {}, T.history),
    table(['', 'USD', 'AXTO', T.cur, T.payer, T.status, 'Tx'], v.orders.map((o) => [when(o.at), `$${o.usd}`, o.credited !== '0' ? o.credited : o.coins, o.label ?? o.cur, short(o.payer), stText(o.status), short(o.txid)])),
    h('h3', {}, T.cashouts),
    table(['', 'AXTO', T.value, T.receive, T.dest, T.status, 'Tx'], v.cashouts.map((o) => [when(o.at), o.coins, `$${o.valueUsd}`, `$${o.payoutUsd} (−${o.penaltyPct}%)`, `${o.label ?? o.cur} · ${short(o.to)}`, stText(o.status), short(o.txid)])),
  );
}

// ---------------------------------------------------------------- pantauan admin
async function adminBox(root) {
  const v = await get('/api/admin/coin');
  if (v.error) { root.replaceChildren(); return; }
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
  const cur = v.np?.currencies ? Object.entries(v.np.currencies).map(([k, c]) => h('li', {}, `${k} (${c.code}): `, c.enabled === null ? '?' : h('span', { class: c.enabled ? 'ok' : 'warn' }, c.enabled ? A.enabled : A.disabled))) : [];
  const bal = v.np?.balance && !v.np.balance.error ? Object.entries(v.np.balance).map(([k, b]) => h('li', {}, `${k}: ${b?.amount ?? 0}${b?.pendingAmount ? ` (+${b.pendingAmount})` : ''}`)) : [];
  root.replaceChildren(
    h('h2', {}, A.title),
    h('p', {}, A.ipn), h('p', {}, h('code', {}, v.ipnUrl), ' ', copyBtn(v.ipnUrl)),
    h('h3', {}, A.ready), h('ul', {}, h('li', {}, `${A.api}: `, yes(v.ready.api)), h('li', {}, `${A.ipnS}: `, yes(v.ready.ipn)), h('li', {}, `${A.payout}: `, yes(v.ready.payout))),
    h('h3', {}, A.np), h('ul', {}, cur), bal.length ? h('ul', {}, bal) : null,
    h('div', { class: 'np-buyback' }, h('img', { src: '/brand/axto-buyback-64.png', alt: 'AXTO Coin Buyback', width: '64', height: '64' }), h('div', {}, h('strong', {}, 'AXTO Coin Buyback'), h('p', { class: 'meta' }, `${t.boughtBack} AXTO`), v.buyback?.address ? h('p', {}, h('code', {}, v.buyback.address), ' ', copyBtn(v.buyback.address)) : h('p', { class: 'muted' }, lang === 'id' ? 'Alamat buyback belum dimuat dari konfigurasi privat.' : 'Buyback address not loaded from private config yet.'))),
    h('h3', {}, A.totals),
    h('dl', { class: 'counters' }, [[A.members, t.members], [A.held, `${t.heldByMembers} AXTO`], [A.sold, `${t.soldViaNowpayments} AXTO`], [A.returned, `${t.boughtBack} AXTO`], [A.usdIn, `$${t.usdIn}`], [A.usdOut, `$${t.usdPaidOut}`], [A.queue, t.queue]].map(([k, x]) => h('div', {}, h('dt', {}, k), h('dd', {}, String(x))))),
    h('h3', {}, A.cfg), cfg,
    h('h3', {}, A.orders),
    table(['', 'Member', 'USD', 'AXTO', T.cur, T.payer, T.status, 'Tx', ''], v.orders.map((o) => [when(o.at), short(o.wallet), `$${o.usd}`, o.credited !== '0' ? o.credited : o.coins, o.label ?? o.cur, o.payer, stText(o.status), o.txid ?? '', o.country ?? ''])),
    h('h3', {}, A.outs),
    table(['', 'Member', 'AXTO', T.receive, T.dest, T.status, 'Tx', ''], v.cashouts.map((o) => [when(o.at), short(o.wallet), o.coins, `$${o.payoutUsd} (−${o.penaltyPct}%)`, `${o.label ?? o.cur} · ${o.to}`, stText(o.status), o.txid ?? '', o.lastError ?? ''])),
    h('h3', {}, A.events),
    table(['', 'Event', 'Member', 'AXTO', 'Ref'], v.events.map((e) => [when(e.at), e.ev, short(e.wallet), `${e.sign}${e.coins}`, e.order ?? e.out ?? e.ref ?? ''])),
  );
}

for (const el of document.querySelectorAll('[data-np]')) {
  const k = el.dataset.np;
  (k === 'buy' ? buyBox : k === 'member' ? memberBox : adminBox)(el).catch(() => null);
}
