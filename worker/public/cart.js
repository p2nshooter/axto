// Keranjang axto.io (pemilik, 24 Nov 2026): beli massal & WD massal. Keranjang bukan pemesanan — diperiksa ulang tiap
// 20 detik; barang yang keburu dibeli member lain hilang otomatis dengan pemberitahuan. Barang baru dipesan saat checkout.
import { h, payChooser, payDialog } from '/pay.js?v=1';

const lang = document.documentElement.lang.startsWith('id') ? 'id' : 'en';
const ID = lang === 'id';
const C = ID
  ? { title: 'Keranjang', login: 'Hubungkan wallet & masuk dulu (tombol di kanan atas).', empty: 'Keranjang kosong. Tambahkan karya dari Marketplace Eksklusif atau Pasar Member.', buy: 'Untuk dibeli', wd: 'Untuk ditarik ke wallet (WD massal)', wdEmpty: 'Belum ada. Pilih „+ Daftar WD" di Portal member.', remove: 'Hapus', qty: 'Jumlah', total: 'Total', items: 'edisi', payAxto: 'Bayar dengan saldo koin AXTO', payCrypto: 'Bayar dengan kripto', or: 'atau bayar langsung dengan kripto (tanpa koin AXTO):', wdAll: 'Tarik semua ke wallet', wdNote: 'Satu transaksi per koleksi. Gas ditanggung axto.io — karya tiba di wallet Anda otomatis.', gone: { sold: 'sudah dibeli member lain', closed: 'listing sudah ditutup', own: 'listing Anda sendiri', reduced: 'jumlah dikurangi, sisa', not_free: 'tidak lagi bebas di kustodi (terjual/dilisting/dihadiahkan)' }, goneTitle: 'Diperbarui otomatis:', done: 'Berhasil', failed: 'Gagal', dropped: 'Keduluan member lain saat checkout, tidak ditagih:', pending: 'Pembayaran berjalan', cont: 'Lanjutkan', ex: 'Eksklusif', mk: 'Pasar Member', processing: 'Memproses…', balance: 'Saldo koin AXTO tidak cukup', logic: 'Keranjang tidak memesan barang. Bila karya di keranjang lebih dulu dibeli member lain, karya itu otomatis hilang dari keranjang dan Anda diberi tahu. Barang baru dipesan saat Anda membayar; bayar dengan kripto menahan pesanan 60 menit dan pembelian berhasil begitu pembayaran diterima.' }
  : { title: 'Cart', login: 'Connect your wallet & sign in first (top right).', empty: 'Your cart is empty. Add works from the Exclusive Marketplace or the Member Market.', buy: 'To buy', wd: 'To withdraw to your wallet (bulk WD)', wdEmpty: 'Nothing yet. Choose “+ WD list” in the member portal.', remove: 'Remove', qty: 'Qty', total: 'Total', items: 'editions', payAxto: 'Pay with AXTO coin balance', payCrypto: 'Pay with crypto', or: 'or pay straight with crypto (no AXTO coin needed):', wdAll: 'Withdraw all to my wallet', wdNote: 'One transaction per collection. Gas is covered by axto.io — the works arrive in your wallet automatically.', gone: { sold: 'already bought by another member', closed: 'the listing is closed', own: 'your own listing', reduced: 'quantity reduced, left', not_free: 'no longer free in custody (sold/listed/gifted)' }, goneTitle: 'Updated automatically:', done: 'Done', failed: 'Failed', dropped: 'Taken by another member during checkout, not charged:', pending: 'Payments in progress', cont: 'Continue', ex: 'Exclusive', mk: 'Member Market', processing: 'Processing…', balance: 'Not enough AXTO coins', logic: 'The cart does not reserve anything. If a work in your cart is bought first by another member, it disappears from your cart automatically and you are told. Items are reserved only when you pay; paying with crypto holds the order for 60 minutes and the purchase succeeds once the payment is received.' };
const post = async (u, b) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}), credentials: 'same-origin' })).json();
const get = async (u) => (await fetch(u, { credentials: 'same-origin' })).json();
const ref = () => [...crypto.getRandomValues(new Uint8Array(10))].map((x) => x.toString(16).padStart(2, '0')).join('');
const name = (c, n) => `${String(c).replace('ex-', '').toUpperCase()} #${Number(n).toLocaleString(ID ? 'id-ID' : 'en-US')}`;
const why = (r) => `${name(r.c, r.id)} — ${C.gone[r.why] ?? r.why}${r.why === 'reduced' ? ` ${r.left}` : ''}`;

const root = document.querySelector('[data-cart-root]');
let chooser = null;
let busy = false;
const notes = h('div', { class: 'cart-notes', role: 'status' });

async function render(v0) {
  if (busy) return;
  const v = v0 ?? await get('/api/cart');
  if (v.error === 'auth') { root.replaceChildren(h('p', {}, C.login)); return; }
  if (v.removed?.length) notes.prepend(h('p', { class: 'warn' }, `${C.goneTitle} `, v.removed.map(why).join(' · ')));
  while (notes.children.length > 5) notes.lastChild.remove();
  const row = (it, list) => {
    const qty = h('input', { type: 'number', min: 1, max: it.left ?? it.free ?? 10, value: it.qty, class: 'sm', 'aria-label': C.qty });
    qty.addEventListener('change', async () => render(await post('/api/cart', { op: 'set', list, t: it.t, c: it.c, id: it.id, lid: it.lid, qty: Number(qty.value) })));
    const rm = h('button', { type: 'button', class: 'btn sm' }, C.remove);
    rm.addEventListener('click', async () => render(await post('/api/cart', { op: 'remove', list, t: it.t, c: it.c, id: it.id, lid: it.lid })));
    return h('li', { class: 'cart-row' },
      h('a', { href: `/${lang}/nft/${it.c}/${it.id}` }, h('img', { src: `/img/${it.c}/${it.id}.svg`, alt: name(it.c, it.id), width: 72, height: 72, loading: 'lazy' })),
      h('span', { class: 'cart-name' }, h('b', {}, name(it.c, it.id)), h('small', {}, list === 'wd' ? '' : it.t === 'mk' ? C.mk : C.ex)),
      h('label', {}, `${C.qty} `, qty),
      list === 'wd' ? null : h('span', { class: 'cart-price' }, `$${it.usd.toFixed(2)}`, h('small', {}, `${it.coins} AXTO`)),
      rm);
  };
  const buyOut = h('p', { class: 'mk-msg', role: 'status' });
  const kids = [h('p', { class: 'meta' }, C.logic), notes, h('h2', {}, C.buy)];
  if (!v.buy.length) kids.push(h('p', { class: 'muted' }, C.empty));
  else {
    kids.push(h('ul', { class: 'cart-list' }, v.buy.map((it) => row(it, 'buy'))));
    kids.push(h('p', { class: 'cart-total' }, `${C.total}: `, h('b', {}, `$${v.total.usd.toFixed(2)}`), ` · ${v.total.coins} AXTO · ${v.total.items} ${C.items}`));
    const payA = h('button', { type: 'button', class: 'btn gold' }, C.payAxto);
    payA.addEventListener('click', async () => {
      busy = true; payA.disabled = true; buyOut.textContent = C.processing;
      try {
        const r = await post('/api/cart/checkout', { pay: 'axto', ref: ref() });
        const okN = (r.results ?? []).filter((x) => x.ok).length;
        buyOut.textContent = r.results ? `${C.done}: ${okN}/${r.results.length}${r.results.some((x) => x.error === 'balance') ? ` · ${C.balance}` : ''}` : `${C.failed}: ${r.error}`;
      } finally { busy = false; payA.disabled = false; render(); }
    });
    chooser ??= await payChooser();
    const payC = h('button', { type: 'button', class: 'btn' }, C.payCrypto);
    payC.addEventListener('click', async () => {
      const sel = chooser.value();
      if (!sel) return;
      busy = true; payC.disabled = true; buyOut.textContent = C.processing;
      try {
        const r = await post('/api/cart/checkout', { pay: 'crypto', ...sel, ref: ref() });
        if (r.dropped?.length) notes.prepend(h('p', { class: 'warn' }, `${C.dropped} `, r.dropped.map((d) => name(d.c, d.id)).join(' · ')));
        if (r.ok) { buyOut.textContent = ''; payDialog(r.intent, { onDone: () => { location.href = `/${lang}/member`; } }); } else buyOut.textContent = `${C.failed}: ${r.error}`;
      } finally { busy = false; payC.disabled = false; render(); }
    });
    kids.push(h('p', {}, payA), h('p', { class: 'meta' }, C.or), chooser.el, h('p', {}, payC), buyOut);
  }
  // WD massal
  kids.push(h('h2', {}, C.wd));
  const wdOut = h('p', { class: 'mk-msg', role: 'status' });
  if (!v.wd.length) kids.push(h('p', { class: 'muted' }, C.wdEmpty));
  else {
    const wdBtn = h('button', { type: 'button', class: 'btn gold' }, `${C.wdAll} (${v.wdItems})`);
    wdBtn.addEventListener('click', async () => {
      busy = true; wdBtn.disabled = true; wdOut.textContent = C.processing;
      try { const r = await post('/api/cart/wd', { ref: ref() }); wdOut.textContent = r.ok ? `${C.done} ✓` : `${C.failed}: ${r.error}`; } finally { busy = false; wdBtn.disabled = false; render(); }
    });
    kids.push(h('ul', { class: 'cart-list' }, v.wd.map((it) => row(it, 'wd'))), h('p', { class: 'meta' }, C.wdNote), h('p', {}, wdBtn), wdOut);
  }
  // pembayaran yang masih berjalan
  const pays = (await get('/api/pay/me').catch(() => ({ items: [] }))).items?.filter((x) => ['await', 'partial', 'paid'].includes(x.status)) ?? [];
  if (pays.length) {
    kids.push(h('h2', {}, C.pending), h('ul', { class: 'cart-list' }, pays.map((x) => h('li', {}, `$${x.usd} · ${x.amount} ${x.coinLabel} (${x.netLabel}) `, h('button', { type: 'button', class: 'btn sm', onclick: () => payDialog(x, { onDone: () => render() }) }, C.cont)))));
  }
  root.replaceChildren(...kids);
}

if (root) {
  render();
  setInterval(() => { if (!document.querySelector('dialog[open]')) render(); }, 20_000);
}
