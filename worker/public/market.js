// Toko eksklusif ($1/edisi, koin AXTO), Pasar Member (harga tetap · lelang · penawaran · harga tetap + penawaran) dan
// portal kustodi + WD satuan/massal (voucher vault → mintWithVoucher dari wallet member). Tanpa innerHTML dari data.
const lang = document.documentElement.lang.startsWith('id') ? 'id' : 'en';
const id_ = lang === 'id';
const L = id_
  ? { login: 'Hubungkan wallet & masuk dulu (tombol di kanan atas).', ok: 'Berhasil', err: 'Gagal', balance: 'Saldo koin AXTO tidak cukup —', topup: 'isi saldo', sold_out: 'Edisi habis', qty: 'Jumlah melebihi edisi yang tersedia', low: 'Terlalu rendah, minimal', own: 'Ini listing Anda sendiri', closed: 'Listing sudah ditutup', contract_pending: 'Kontrak koleksi ini belum aktif — WD tersedia begitu kontrak dideploy otomatis.', rate_limited: 'Terlalu cepat, coba lagi sebentar', buying: 'Memproses…', amount: 'Jumlah koin (AXTO) per edisi', bidAmount: 'Tawaran total (AXTO)', mine: 'Koleksi di kustodi axto.io', none: 'Belum ada edisi. Belanja di Marketplace Eksklusif.', gone: 'Sudah ditarik ke wallet', goneNote: 'Karya ini sudah ditarik (WD) ke wallet Anda dan tidak lagi ada di database axto.io, sehingga tidak bisa dijual di Pasar Member. Jual di OpenSea atau marketplace lain — royalti 10% untuk axto.io berlaku otomatis.', wd: 'Tarik ke wallet (WD)', wdSel: 'Tarik yang dipilih (WD massal)', wdHint: 'WD massal = satu transaksi per koleksi, gas lebih hemat. Gas jaringan Base Anda bayar sendiri.', send: 'Kirim transaksi mint dari wallet', sent: 'Terkirim', sell: 'Jual di Pasar Member', mode: 'Cara jual', price: 'Harga per edisi (AXTO)', start: 'Harga awal lelang (AXTO, untuk seluruh edisi)', min: 'Penawaran minimum per edisi (AXTO, opsional)', days: 'Lama (hari)', list: 'Pasang listing', myListings: 'Listing saya', accept: 'Terima', decline: 'Tolak', cancel: 'Tutup listing', history: 'Riwayat', orders: 'Pembelian toko', trades: 'Transaksi pasar', free: 'bebas', locked: 'di listing', withdrawals: 'Voucher WD', minted: 'tercetak', pendingVoucher: 'voucher siap', gift: 'Hadiahkan', giftTo: 'Alamat wallet penerima — satu per baris (bisa banyak untuk komunitas)', giftPer: 'Edisi per penerima', giftNote: 'Pesan (opsional)', giftSend: 'Kirim hadiah', giftOpt: 'Jadikan hadiah: kirim ke wallet ini setelah dibeli (opsional)', giftDone: 'Hadiah terkirim', giftsSent: 'Hadiah terkirim', giftsReceived: 'Hadiah diterima', self: 'Tidak bisa mengirim ke wallet sendiri', address: 'Alamat wallet tidak valid', too_many: 'Terlalu banyak penerima sekaligus', modes: { fixed: 'Harga tetap', auction: 'Lelang', offer: 'Penawaran', fixed_offer: 'Harga tetap + penawaran' } }
  : { login: 'Connect your wallet & sign in first (top right).', ok: 'Done', err: 'Failed', balance: 'Not enough AXTO coins —', topup: 'top up', sold_out: 'Sold out', qty: 'More than the editions available', low: 'Too low, minimum', own: 'This is your own listing', closed: 'The listing is closed', contract_pending: 'This collection’s contract is not live yet — WD opens once it is deployed automatically.', rate_limited: 'Too fast, try again shortly', buying: 'Processing…', amount: 'AXTO coins per edition', bidAmount: 'Total bid (AXTO)', mine: 'Collection in axto.io custody', none: 'No editions yet. Shop in the Exclusive Marketplace.', gone: 'Withdrawn to your wallet', goneNote: 'This work has been withdrawn (WD) to your wallet and is no longer in the axto.io database, so it cannot be sold in the Member Market. Sell it on OpenSea or another marketplace — the 10% royalty to axto.io applies automatically.', wd: 'Withdraw to wallet (WD)', wdSel: 'Withdraw selected (bulk WD)', wdHint: 'Bulk WD = one transaction per collection, cheaper gas. You pay the Base network gas.', send: 'Send the mint transaction from your wallet', sent: 'Sent', sell: 'Sell in the Member Market', mode: 'How to sell', price: 'Price per edition (AXTO)', start: 'Auction starting price (AXTO, for all editions)', min: 'Minimum offer per edition (AXTO, optional)', days: 'Duration (days)', list: 'Create listing', myListings: 'My listings', accept: 'Accept', decline: 'Decline', cancel: 'Close listing', history: 'History', orders: 'Shop purchases', trades: 'Market trades', free: 'free', locked: 'listed', withdrawals: 'WD vouchers', minted: 'minted', pendingVoucher: 'voucher ready', gift: 'Gift', giftTo: 'Recipient wallet addresses — one per line (many for a community)', giftPer: 'Editions per recipient', giftNote: 'Message (optional)', giftSend: 'Send gift', giftOpt: 'Make it a gift: send to this wallet after purchase (optional)', giftDone: 'Gift sent', giftsSent: 'Gifts sent', giftsReceived: 'Gifts received', self: 'You cannot send to your own wallet', address: 'Invalid wallet address', too_many: 'Too many recipients at once', modes: { fixed: 'Fixed price', auction: 'Auction', offer: 'Offers', fixed_offer: 'Fixed price + offers' } };
const $ = (s, r = document) => r.querySelector(s);
const post = async (u, b) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}), credentials: 'same-origin' })).json();
const get = async (u) => (await fetch(u, { credentials: 'same-origin' })).json();
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : String(v)); }
  for (const k of kids.flat()) if (k != null) e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return e;
};
const ref = () => [...crypto.getRandomValues(new Uint8Array(10))].map((x) => x.toString(16).padStart(2, '0')).join('');
const coinLink = () => h('a', { class: 'link', href: `/${lang}/${id_ ? 'koin' : 'coin'}#beli-koin` }, L.topup);
const errText = (r) => {
  if (r.error === 'balance') return [L.balance, ' ', coinLink()];
  if (r.error === 'low') return [`${L.low} ${r.min} AXTO`];
  if (r.error === 'auth') return [L.login];
  return [L[r.error] ?? `${L.err}: ${r.error}`];
};
const say = (el, r) => { el.replaceChildren(...(r.ok ? [L.ok] : errText(r))); el.className = `mk-msg ${r.ok ? 'ok' : 'warn'}`; };
const name = (c, n) => `${c.replace('ex-', '').toUpperCase()} #${Number(n).toLocaleString(id_ ? 'id-ID' : 'en-US')}`;

// ---------------------------------------------------------------- 1. kotak toko pada halaman karya eksklusif
const shop = $('[data-mk="shop"]');
if (shop) {
  const msg = $('.mk-msg', shop);
  const row = $('.bidrow', shop);
  if (row) row.after(h('p', { class: 'giftrow' }, h('label', {}, L.giftOpt, h('input', { name: 'giftTo', type: 'text', placeholder: '0x…', autocomplete: 'off', spellcheck: 'false' }))));
  $('[data-mk-buy]', shop)?.addEventListener('click', async (ev) => {
    const b = ev.currentTarget;
    b.disabled = true;
    msg.textContent = L.buying;
    try {
      const qty = Number($('select[name="qty"]', shop).value);
      const r = await post('/api/shop/buy', { c: shop.dataset.c, id: Number(shop.dataset.id), qty, ref: ref() });
      say(msg, r);
      const to = $('input[name="giftTo"]', shop)?.value.trim();
      if (r.ok && to) { const g = await post('/api/gift', { ref: ref(), items: [{ c: shop.dataset.c, id: Number(shop.dataset.id), amount: qty, to }] }); if (g.ok) msg.textContent = `${L.giftDone} ✓`; else say(msg, g); }
      if (r.ok) setTimeout(() => location.reload(), 1200);
    } catch (e) { msg.textContent = `${L.err}: ${e.message ?? e}`; } finally { b.disabled = false; }
  });
}

// ---------------------------------------------------------------- 2. aksi listing pasar member (halaman karya)
for (const li of document.querySelectorAll('[data-mk="listings"] li[data-lid]')) {
  const slot = $('.mk-act', li);
  const lid = li.dataset.lid;
  const mode = li.dataset.mode;
  const out = h('span', { class: 'mk-msg', role: 'status' });
  const act = async (url, body) => { out.textContent = L.buying; const r = await post(url, { lid, ...body }); say(out, r); if (r.ok) setTimeout(() => location.reload(), 1200); };
  if (mode === 'fixed' || mode === 'fixed_offer') {
    const q = h('input', { type: 'number', min: 1, max: li.dataset.left, value: 1, 'aria-label': 'qty', class: 'sm' });
    slot.append(q, h('button', { class: 'btn gold sm', type: 'button', onclick: () => act('/api/market/buy', { qty: Number(q.value), ref: ref() }) }, id_ ? 'Beli' : 'Buy'));
  }
  if (mode === 'offer' || mode === 'fixed_offer') {
    const a = h('input', { type: 'text', inputmode: 'decimal', placeholder: L.amount, class: 'sm' });
    const q = h('input', { type: 'number', min: 1, max: li.dataset.left, value: 1, 'aria-label': 'qty', class: 'sm' });
    slot.append(' ', a, q, h('button', { class: 'btn sm', type: 'button', onclick: () => act('/api/market/offer', { amount: a.value, qty: Number(q.value) }) }, id_ ? 'Tawar' : 'Offer'));
  }
  if (mode === 'auction') {
    const a = h('input', { type: 'text', inputmode: 'decimal', placeholder: L.bidAmount, class: 'sm' });
    slot.append(a, h('button', { class: 'btn gold sm', type: 'button', onclick: () => act('/api/market/bid', { amount: a.value }) }, id_ ? 'Tawar' : 'Bid'));
  }
  slot.append(out);
}

// ---------------------------------------------------------------- 3. portal member: kustodi, jual, WD, riwayat
const word = (n) => BigInt(n).toString(16).padStart(64, '0');
/** calldata mintWithVoucher(address,uint256[],uint256[],bytes32,uint256,bytes) — selector 0x56b51d23. */
function mintCalldata(v) {
  const arr = (xs) => word(xs.length) + xs.map(word).join('');
  const sig = v.sig.replace(/^0x/, '');
  const head = 6 * 32;
  const idsOff = head;
  const amtOff = idsOff + 32 * (1 + v.ids.length);
  const sigOff = amtOff + 32 * (1 + v.amounts.length);
  const sigPadded = sig.padEnd(Math.ceil(sig.length / 64) * 64, '0');
  return `0x56b51d23${v.to.replace(/^0x/, '').toLowerCase().padStart(64, '0')}${word(idsOff)}${word(amtOff)}${v.ref.replace(/^0x/, '')}${word(v.deadline)}${word(sigOff)}${arr(v.ids)}${arr(v.amounts)}${word(sig.length / 2)}${sigPadded}`;
}
async function sendMint(w, chainId, btn) {
  const eth = window.ethereum;
  if (!eth) throw new Error('wallet');
  const want = `0x${Number(chainId).toString(16)}`;
  if ((await eth.request({ method: 'eth_chainId' })) !== want) await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: want }] });
  const [from] = await eth.request({ method: 'eth_requestAccounts' });
  const hash = await eth.request({ method: 'eth_sendTransaction', params: [{ from, to: w.contract, data: mintCalldata(w.voucher) }] });
  btn.replaceWith(h('span', { class: 'ok' }, `${L.sent}: ${hash.slice(0, 12)}…`));
  await post('/api/wd/minted', { ref: w.ref, tx: hash });
}

const portal = $('[data-mk="portal"]');
if (portal) render();
async function render() {
  const me = await get('/api/me');
  if (!me.wallet) { portal.replaceChildren(h('h2', {}, L.mine), h('p', {}, L.login)); return; }
  const d = await get('/api/me/nft');
  const box = [h('h2', {}, L.mine)];
  const sel = new Map();
  if (!d.items?.length) box.push(h('p', { class: 'muted' }, L.none, ' ', h('a', { class: 'link', href: `/${lang}/${id_ ? 'eksklusif' : 'exclusive'}` }, '→')));
  else {
    const rows = d.items.map((it) => {
      const n = h('input', { type: 'number', min: 1, max: it.free, value: it.free, class: 'sm', 'aria-label': 'qty', disabled: it.free < 1 });
      const cb = h('input', { type: 'checkbox', disabled: it.free < 1 || !d.contractsLive[it.c], onchange: () => (cb.checked ? sel.set(`${it.c}:${it.id}`, () => ({ c: it.c, id: it.id, amount: Number(n.value) })) : sel.delete(`${it.c}:${it.id}`)) });
      const out = h('span', { class: 'mk-msg', role: 'status' });
      const sellBtn = h('button', { class: 'btn sm', type: 'button', disabled: it.free < 1, onclick: () => row.after(sellForm(it, out)) }, L.sell);
      const giftBtn = h('button', { class: 'btn sm', type: 'button', disabled: it.free < 1, onclick: () => row.after(giftForm(it, out)) }, `🎁 ${L.gift}`);
      const wdBtn = h('button', { class: 'btn ghost sm', type: 'button', disabled: it.free < 1 || !d.contractsLive[it.c], title: d.contractsLive[it.c] ? L.wdHint : L.contract_pending, onclick: () => withdraw([{ c: it.c, id: it.id, amount: Number(n.value) }], out) }, L.wd);
      const row = h('tr', {}, h('td', {}, cb), h('td', {}, h('a', { href: `/${lang}/nft/${it.c}/${it.id}` }, h('img', { src: `/img/${it.c}/${it.id}.svg?v=10`, width: 48, height: 48, alt: '', loading: 'lazy' }), ' ', name(it.c, it.id))), h('td', {}, `${it.qty} (${it.free} ${L.free}${it.qty > it.free ? ` · ${it.qty - it.free} ${L.locked}` : ''})`), h('td', {}, n), h('td', {}, sellBtn, ' ', giftBtn, ' ', wdBtn, ' ', out));
      return row;
    });
    const bulkOut = h('span', { class: 'mk-msg', role: 'status' });
    box.push(h('table', { class: 'split mk-hold' }, h('tbody', {}, rows)),
      h('p', {}, h('button', { class: 'btn gold', type: 'button', onclick: () => withdraw([...sel.values()].map((f) => f()), bulkOut) }, L.wdSel), ' ', bulkOut),
      h('p', { class: 'meta' }, L.wdHint));
    if (!Object.values(d.contractsLive ?? {}).some(Boolean)) box.push(h('p', { class: 'muted' }, L.contract_pending));
  }
  // voucher WD (kirim transaksi mint dari wallet)
  if (d.withdrawals?.length) {
    box.push(h('h3', {}, L.withdrawals));
    box.push(h('ul', {}, d.withdrawals.map((w) => {
      const li = h('li', {}, `${w.c} · ${w.items.map((x) => `#${x.id}×${x.amount}`).join(', ')} · ${w.status === 'minted' ? L.minted : L.pendingVoucher} `);
      if (w.status === 'voucher' && w.voucher) { const b = h('button', { class: 'btn gold sm', type: 'button' }, L.send); b.addEventListener('click', () => sendMint(w, d.chainId, b).catch((e) => { b.textContent = `${L.err}: ${e.message ?? e}`; })); li.append(b); }
      return li;
    })));
  }
  // sudah ditarik → tidak lagi di database axto.io
  if (d.gone?.length) {
    box.push(h('h3', {}, L.gone), h('p', { class: 'note' }, L.goneNote));
    box.push(h('ul', { class: 'mk-gone' }, d.gone.map((g) => h('li', {}, h('img', { src: `/img/${g.c}/${g.id}.svg?v=10`, width: 40, height: 40, alt: '', loading: 'lazy' }), ' ', name(g.c, g.id), ` × ${g.qty}`))));
  }
  // listing saya: penawaran masuk, tutup listing
  if (d.listings?.length) {
    box.push(h('h3', {}, L.myListings));
    box.push(h('ul', {}, d.listings.map((l) => {
      const out = h('span', { class: 'mk-msg', role: 'status' });
      const li = h('li', {}, `${name(l.c, l.id)} · ${L.modes[l.mode]} · ${l.left}/${l.qty} · ${l.price ?? l.top?.micro ?? l.start ?? l.min ?? ''} AXTO `,
        h('button', { class: 'btn ghost sm', type: 'button', onclick: async () => { const r = await post('/api/market/cancel', { lid: l.lid }); say(out, r); if (r.ok) setTimeout(render, 800); } }, L.cancel), ' ', out);
      for (const f of l.offersFull ?? []) {
        li.append(h('div', { class: 'offer' }, `${f.qty} × · ${f.coins} AXTO `,
          h('button', { class: 'btn gold sm', type: 'button', onclick: async () => { const r = await post('/api/market/accept', { lid: l.lid, oid: f.oid }); say(out, r); if (r.ok) setTimeout(render, 800); } }, L.accept), ' ',
          h('button', { class: 'btn ghost sm', type: 'button', onclick: async () => { const r = await post('/api/market/drop', { lid: l.lid, oid: f.oid }); say(out, r); if (r.ok) setTimeout(render, 800); } }, L.decline)));
      }
      return li;
    })));
  }
  // riwayat
  const hist = d.history ?? {};
  if (hist.giftsReceived?.length || hist.giftsSent?.length) {
    box.push(h('details', {}, h('summary', {}, `🎁 ${L.giftsReceived} / ${L.giftsSent}`),
      h('ul', {}, (hist.giftsReceived ?? []).map((g) => h('li', {}, `↘ ${name(g.c, g.id)} × ${g.qty} · ${g.from.slice(0, 6)}…${g.from.slice(-4)} · ${new Date(Number(g.at)).toLocaleString()}`))),
      h('ul', {}, (hist.giftsSent ?? []).map((g) => h('li', {}, `↗ ${g.n} × · ${g.editions} ${id_ ? 'edisi' : 'editions'} · ${new Date(Number(g.at)).toLocaleString()}`)))));
  }
  if ((hist.orders?.length ?? 0) + (hist.trades?.length ?? 0)) {
    box.push(h('details', {}, h('summary', {}, L.history),
      h('h4', {}, L.orders), h('ul', {}, (hist.orders ?? []).map((o) => h('li', {}, `${name(o.c, o.id)} × ${o.qty} · ${o.coins} AXTO · ${o.status} · ${new Date(Number(o.at)).toLocaleString()}`))),
      h('h4', {}, L.trades), h('ul', {}, (hist.trades ?? []).map((o) => h('li', {}, `${o.side === 'sell' ? '↗' : '↘'} ${name(o.c, o.id)} × ${o.qty} · ${o.coins} AXTO · ${new Date(Number(o.at)).toLocaleString()}`)))));
  }
  portal.replaceChildren(...box);
}

function sellForm(it, out) {
  const mode = h('select', {}, Object.entries(L.modes).map(([k, v]) => h('option', { value: k }, v)));
  const qty = h('input', { type: 'number', min: 1, max: it.free, value: it.free, class: 'sm' });
  const price = h('input', { type: 'text', inputmode: 'decimal', placeholder: '0.5' });
  const start = h('input', { type: 'text', inputmode: 'decimal', placeholder: '1' });
  const min = h('input', { type: 'text', inputmode: 'decimal', placeholder: '0.1' });
  const days = h('input', { type: 'number', min: 1, max: 14, value: 7, class: 'sm' });
  const fp = h('label', {}, L.price, price);
  const fs = h('label', { hidden: true }, L.start, start);
  const fm = h('label', { hidden: true }, L.min, min);
  const sync = () => { const m = mode.value; fp.hidden = !(m === 'fixed' || m === 'fixed_offer'); fs.hidden = m !== 'auction'; fm.hidden = m !== 'offer'; };
  mode.addEventListener('change', sync);
  const f = h('tr', { class: 'mk-sell' }, h('td', { colspan: 5 }, h('form', { onsubmit: async (e) => {
    e.preventDefault();
    const r = await post('/api/market/create', { c: it.c, id: it.id, qty: Number(qty.value), mode: mode.value, price: price.value, start: start.value, min: min.value, days: Number(days.value) });
    say(out, r);
    if (r.ok) { f.remove(); setTimeout(render, 800); }
  } }, h('label', {}, L.mode, mode), h('label', {}, id_ ? 'Edisi' : 'Editions', qty), fp, fs, fm, h('label', {}, L.days, days), h('button', { class: 'btn gold sm' }, L.list))));
  return f;
}

function giftForm(it, out) {
  const to = h('textarea', { rows: 3, placeholder: '0x…\n0x…', spellcheck: 'false' });
  const per = h('input', { type: 'number', min: 1, max: it.free, value: 1, class: 'sm' });
  const note = h('input', { type: 'text', maxlength: 140 });
  const f = h('tr', { class: 'mk-sell' }, h('td', { colspan: 5 }, h('form', { onsubmit: async (e) => {
    e.preventDefault();
    const list = to.value.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
    const r = await post('/api/gift', { ref: ref(), note: note.value, items: list.map((addr) => ({ c: it.c, id: it.id, amount: Number(per.value), to: addr })) });
    say(out, r.ok ? { ok: true } : r);
    if (r.ok) { out.textContent = `${L.giftDone} ✓`; f.remove(); setTimeout(render, 900); }
  } }, h('label', { class: 'wide' }, L.giftTo, to), h('label', {}, L.giftPer, per), h('label', {}, L.giftNote, note), h('button', { class: 'btn gold sm' }, `🎁 ${L.giftSend}`))));
  return f;
}

async function withdraw(items, out) {
  if (!items.length) return;
  out.textContent = L.buying;
  const r = await post('/api/wd', { items, ref: ref() });
  if (!r.ok && !r.vouchers) { say(out, r); return; }
  say(out, { ok: true });
  setTimeout(render, 600);
}

// ---------------------------------------------------------------- 4a. portal admin: blueprint privat (teks biasa, tanpa HTML)
const bp = $('[data-mk="blueprint"]');
if (bp) bp.addEventListener('toggle', async () => {
  if (!bp.open || bp.dataset.loaded) return;
  const r = await fetch('/api/admin/blueprint', { credentials: 'same-origin' });
  $('.bp-text', bp).textContent = r.ok ? await r.text() : (id_ ? 'Blueprint belum ada di R2 privat.' : 'Blueprint not in private R2 yet.');
  bp.dataset.loaded = '1';
});

// ---------------------------------------------------------------- 4. portal admin: ringkasan toko & pasar
const adm = $('[data-mk="admin"]');
if (adm) {
  get('/api/admin/shop').then((a) => {
    if (a.error) { adm.replaceChildren(h('p', { class: 'muted' }, a.error)); return; }
    const rows = Object.entries(a.editionsSold).map(([c, n]) => h('tr', {}, h('th', {}, c), h('td', {}, `${Number(n).toLocaleString()} / ${Number(a.editionsTotal[c]).toLocaleString()}`)));
    adm.replaceChildren(
      h('dl', { class: 'counters' },
        h('div', {}, h('dt', {}, id_ ? 'Penjualan toko (30 hari)' : 'Shop sales (30 days)'), h('dd', {}, `${a.last30.shopCoins} AXTO`)),
        h('div', {}, h('dt', {}, id_ ? 'Fee pasar member 10% (30 hari)' : 'Member market 10% fee (30 days)'), h('dd', {}, `${a.last30.feeCoins} AXTO`)),
        h('div', {}, h('dt', {}, id_ ? 'Pesanan toko' : 'Shop orders'), h('dd', {}, String(a.last30.orders))),
        h('div', {}, h('dt', {}, id_ ? 'Listing terbuka' : 'Open listings'), h('dd', {}, String(a.open))),
        h('div', {}, h('dt', {}, id_ ? 'Pekerjaan tertunda' : 'Pending jobs'), h('dd', {}, String(a.pending)))),
      h('table', { class: 'split' }, h('caption', {}, id_ ? 'Edisi eksklusif terjual' : 'Exclusive editions sold'), h('tbody', {}, rows)));
  }).catch(() => {});
}
