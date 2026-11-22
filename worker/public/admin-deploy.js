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
    say(`Admin NFT: ${s.admin} · ${id ? 'Wallet koin' : 'Coin wallet'}: ${s.coinWallet} · Signer vault: ${s.signer || '—'} · Treasury: ${s.treasury}`, 'meta');
  });
}
