// Portal admin: status deploy kontrak OTOMATIS oleh sistem (perintah pemilik #31 „lu yg ngerjain semua nya").
// Tidak ada tombol MetaMask: wallet deployer sistem mendeploy semua kontrak sendiri (workflow contracts-deploy.yml tiap jam)
// begitu saldonya cukup; kepemilikan langsung ke wallet admin NFT & wallet koin. Halaman ini hanya menampilkan statusnya.
const box = document.getElementById('deploy');
const id = box?.dataset.lang === 'id';
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
const say = (t, cls) => box.append(el('p', t, cls));

if (box) {
  box.replaceChildren();
  fetch('/api/admin/setup', { credentials: 'same-origin' }).then((r) => r.json()).then((s) => {
    if (s.error) { say(id ? 'Masuk dulu dengan wallet admin (tombol Hubungkan wallet), lalu muat ulang.' : 'Sign in with the admin wallet first, then reload.'); return; }
    if (s.active) {
      say(`✅ ${id ? 'Kontrak aktif di' : 'Contracts live on'} ${s.networks[s.active.chainId]?.name} · AuctionHouse ${s.active.auctionHouse}`, 'ok');
      const ul = el('ul');
      for (const [k, a] of Object.entries(s.active.collections ?? {})) {
        const li = el('li', `${k}: `);
        const link = el('a', a);
        link.href = `${s.networks[s.active.chainId]?.explorer}/address/${a}`;
        link.target = '_blank';
        link.rel = 'noopener';
        li.append(link);
        ul.append(li);
      }
      box.append(ul);
    }
    const d = s.deployer;
    if (!s.active) {
      if (!d) { say(id ? 'Wallet deployer sistem sedang disiapkan (workflow berjalan tiap jam).' : 'The system deployer wallet is being prepared (hourly workflow).'); }
      else {
        say(`${id ? 'Wallet deployer sistem' : 'System deployer wallet'} (${d.network}):`);
        const addr = el('p'); const code = el('code', d.address); const copy = el('button', id ? 'Salin' : 'Copy', 'btn');
        copy.type = 'button';
        copy.addEventListener('click', () => navigator.clipboard?.writeText(d.address).then(() => { copy.textContent = '✓'; }));
        addr.append(code, ' ', copy);
        box.append(addr);
        say(`${id ? 'Saldo' : 'Balance'}: ${Number(d.balance).toFixed(6)} ETH · ${id ? 'butuh sekali saja' : 'needed once'} ±${Number(d.need).toFixed(6)} ETH · ${id ? 'langkah' : 'step'}: ${d.step}`);
        if (d.step === 'menunggu dana') say(id ? `Kirim ±${Number(d.need).toFixed(4)} ETH di jaringan ${d.network} ke alamat di atas (dari MetaMask, exchange, atau wallet mana pun). Setelah masuk, sistem mendeploy semuanya sendiri dalam ≤ 1 jam — tidak ada yang perlu Anda tekan.` : `Send ±${Number(d.need).toFixed(4)} ETH on ${d.network} to the address above. The system then deploys everything by itself within an hour.`, 'muted');
      }
    }
    say(`Admin NFT: ${s.admin} · Signer vault: ${s.signer || '—'}`, 'meta');
    openseaBox(s);
    coinWallets(s);
  });
}

// Penjualan OpenSea otomatis (#44/#45): status mesin listing + tanda „OpenSea siap" setelah pemilik mengatur Creator Studio.
function openseaBox(s) {
  const o = s.opensea ?? {};
  const st = o.status ?? {};
  box.append(el('h2', id ? 'Penjualan OpenSea (wallet toko sistem)' : 'OpenSea sales (system store wallet)'));
  if (st.store) say(`${id ? 'Wallet toko' : 'Store wallet'}: ${st.store}`, 'meta');
  say(`${id ? 'Langkah' : 'Step'}: ${st.step ?? (id ? 'belum berjalan' : 'not started')}${st.at ? ` · ${new Date(st.at).toLocaleString()}` : ''}`);
  if (st.listedTotal != null) say(`${id ? 'Listing terkirim' : 'Listings sent'}: ${Number(st.listedTotal).toLocaleString()} · ${id ? 'etalase terlisting' : 'showcase listed'}: ${JSON.stringify(st.showcase ?? {})} · ${id ? 'terjual' : 'sold'}: ${JSON.stringify(st.sold ?? {})}${st.ethUsd ? ` · ETH $${st.ethUsd}` : ''}`, 'meta');
  if (st.swept) say(`${id ? 'Terakhir diteruskan ke treasury' : 'Last forwarded to treasury'}: ${st.swept.eth} ETH`, 'ok');
  for (const e of st.errors ?? []) say(e, 'muted');
  const ready = o.ready?.ready === true;
  const steps = el('ol');
  for (const t of id
    ? ['Masuk ke opensea.io dengan wallet produksi (pemilik kontrak).', 'Buka Creator Studio → tiap koleksi AXTO (Time, Stamp, Qur\'an, Model).', 'Creator earnings 10%, alamat payout = treasury; aktifkan penegakan (enforcement).', 'Tekan tombol di bawah — listing otomatis dimulai pada putaran berikutnya (≤ 1 jam).']
    : ['Sign in to opensea.io with the production wallet (contract owner).', 'Open Creator Studio → each AXTO collection (Time, Stamp, Qur\'an, Model).', 'Creator earnings 10%, payout address = treasury; turn enforcement on.', 'Press the button below — automatic listing starts on the next run (≤ 1 hour).']) steps.append(el('li', t));
  if (!ready) box.append(steps);
  const b = el('button', ready ? (id ? '✓ OpenSea siap — listing berjalan (klik untuk menjeda)' : '✓ OpenSea ready — listing runs (click to pause)') : (id ? 'Creator Studio sudah diatur → mulai listing' : 'Creator Studio is set → start listing'), ready ? 'btn' : 'btn gold');
  b.type = 'button';
  b.addEventListener('click', async () => {
    b.disabled = true;
    const r = await (await fetch('/api/admin/opensea-ready', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ready: !ready }) })).json();
    b.textContent = r.ok ? (r.ready ? '✓' : '⏸') : (r.error || 'error');
  });
  box.append(b);
}

// Wallet koin AXTO perusahaan + saldo langsung dari blockchain — RAHASIA, hanya di Portal admin (perintah pemilik #43:
// „ini jgn di expose begini, bahaya, jgn bongkar rahasia perusahaan"). Halaman Koin publik hanya memuat kontrak token & beli.
function coinWallets(s) {
  const c = s.coin;
  if (!c) return;
  const net = s.networks[c.chainId] ?? {};
  box.append(el('h2', id ? 'Koin AXTO — wallet perusahaan (hanya admin)' : 'AXTO coin — company wallets (admin only)'));
  const rows = [
    [id ? 'Kontrak token' : 'Token contract', c.token, false],
    [id ? 'Kontrak beli (AxtoSale)' : 'Purchase contract (AxtoSale)', c.sale, false],
    [id ? 'Bank (jatah owner 2 jt + komisi 10% marketplace AXTO)' : 'Bank (owner 2M + 10% AXTO marketplace fee)', c.wallets.bank, true],
    [id ? 'Presale (2 jt, sumber penjualan)' : 'Presale (2M, sale source)', c.wallets.presale, true],
    [id ? 'Vesting = listing DEX (3 jt)' : 'Vesting = DEX listing (3M)', c.wallets.vesting, true],
    [id ? 'Hold 5 tahun (3 jt)' : '5-year hold (3M)', c.wallets.hold, true],
    [id ? 'Treasury (uang penjualan)' : 'Treasury (sale proceeds)', c.wallets.treasury, true],
  ];
  const tb = el('tbody');
  const tbl = el('table', '', 'split cw');
  tbl.append(tb);
  for (const [label, addr, bal] of rows) {
    const tr = el('tr'); const th = el('th', label); const td = el('td'); const tdb = el('td', '', 'bal');
    if (addr) { const a = el('a', addr, 'link'); a.href = `${net.explorer}/${addr === c.token ? 'token' : 'address'}/${addr}`; a.target = '_blank'; a.rel = 'noopener'; td.append(a); }
    else td.append(el('span', id ? 'aktif setelah deploy' : 'live after deploy', 'muted'));
    if (bal && addr && c.token) { tdb.textContent = '…'; balance(net.rpc, c.token, addr).then((v) => { tdb.textContent = v; }); }
    tr.append(th, td, tdb); tb.append(tr);
  }
  box.append(tbl);
}

async function balance(rpc, token, addr) {
  try {
    const data = `0x70a08231${addr.replace(/^0x/, '').toLowerCase().padStart(64, '0')}`;
    const r = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: token, data }, 'latest'] }) });
    const wei = BigInt((await r.json()).result);
    return `${(Number(wei / 10n ** 15n) / 1000).toLocaleString(id ? 'id-ID' : 'en-US', { maximumFractionDigits: 3 })} AXTO`;
  } catch { return '—'; }
}
