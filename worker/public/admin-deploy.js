// Portal admin: deploy semua kontrak AXTO dari MetaMask admin (owner = wallet admin; kunci tidak pernah keluar dari MetaMask).
// Urutan sama dengan contracts/scripts/deploy.mjs (diuji di ganache & e2e). Hasil dikirim ke /api/admin/contracts,
// diverifikasi on-chain oleh worker (kode ada + owner() = admin) lalu dipakai situs & vault.
const box = document.getElementById('deploy');
const id = box?.dataset.lang === 'id';
const say = (t) => { const p = document.createElement('p'); p.textContent = t; box.append(p); p.scrollIntoView({ block: 'nearest' }); return p; };
const get = async (u) => (await fetch(u, { credentials: 'same-origin' })).json();

function loadEthers() {
  return new Promise((res, rej) => {
    if (window.ethers) return res(window.ethers);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.4/ethers.umd.min.js';
    s.onload = () => res(window.ethers);
    s.onerror = () => rej(new Error('ethers'));
    document.head.append(s);
  });
}

async function run(chainId) {
  box.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  try {
    const setup = await get('/api/admin/setup');
    if (setup.error) throw new Error(id ? 'Masuk dulu dengan wallet admin (tombol Hubungkan wallet).' : 'Sign in with the admin wallet first.');
    if (!setup.signer) throw new Error(id ? 'Vault belum punya signer — jalankan deploy vault dulu.' : 'Vault has no signer yet.');
    const net = setup.networks[chainId];
    const ethers = await loadEthers();
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${Number(chainId).toString(16)}` }] });
    } catch (e) {
      if (e.code !== 4902) throw e;
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: `0x${Number(chainId).toString(16)}`, chainName: net.name, rpcUrls: [net.rpc], nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, blockExplorerUrls: [net.explorer] }] });
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    // kemajuan disimpan per jaringan → bisa dilanjutkan setelah pindah akun MetaMask
    const KEY = `axto-deploy-${chainId}`;
    const st = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
    const need = async (addr, label) => {
      let acc = (await window.ethereum.request({ method: 'eth_accounts' }))[0] || '';
      if (acc.toLowerCase() !== addr.toLowerCase()) {
        try { await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] }); } catch {}
        acc = (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0] || '';
      }
      if (acc.toLowerCase() !== addr.toLowerCase()) throw new Error(`${id ? 'Pindah akun MetaMask ke' : 'Switch MetaMask account to'} ${label} ${addr}, ${id ? 'lalu tekan tombol lagi (kemajuan tersimpan).' : 'then press the button again (progress is saved).'}`);
      if ((await provider.getBalance(acc)) < ethers.parseEther('0.0003')) throw new Error(`${label}: ${id ? 'saldo ETH untuk gas terlalu kecil di jaringan ini' : 'not enough ETH for gas on this network'}`);
      return provider.getSigner(acc);
    };
    // cek feed harga Chainlink sebelum deploy
    const feed = new ethers.Contract(net.feed, ['function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)'], provider);
    const [, price] = await feed.latestRoundData();
    say(`✓ ${id ? 'Harga ETH dari Chainlink' : 'Chainlink ETH price'}: $${(Number(price) / 1e8).toFixed(2)}`);
    const art = async (n) => (await fetch(`/contracts/${n}.json`)).json();
    const E = (n) => ethers.parseEther(String(n));
    const deployAs = async (who, name, ...args) => {
      const a = await art(name);
      const p = say(`… ${name}`);
      const c = await new ethers.ContractFactory(a.abi, a.bytecode, who).deploy(...args);
      await c.waitForDeployment();
      const addr = await c.getAddress();
      p.textContent = `✓ ${name} ${addr}`;
      return addr;
    };
    const step = async (label, txp) => { const p = say(`… ${label}`); await (await txp).wait(); p.textContent = `✓ ${label}`; };
    const at = async (who, name, addr) => new ethers.Contract(addr, (await art(name)).abi, who);
    const COLS = [['time', 'AXTO Time', 'AXTIME', 2000000], ['stamp', 'AXTO Stamp', 'AXSTAMP', 2000000], ['quran', "AXTO Qur'an", 'AXQURAN', 2000000], ['model', 'AXTO Model', 'AXMODEL', 2000000],
      ['ex-time', 'AXTO Exclusive Time', 'AXXTIME', 50000], ['ex-stamp', 'AXTO Exclusive Stamp', 'AXXSTAMP', 50000], ['ex-quran', "AXTO Exclusive Qur'an", 'AXXQURAN', 50000]];

    // Fase 1 — wallet admin NFT: AuctionHouse + 7 koleksi (hanya admin yang menunjuk minter/signer NFT)
    if (!st.usdcOk) {
      say(id ? '— Fase 1/3: wallet admin NFT —' : '— Phase 1/3: NFT admin wallet —');
      const admin = await need(setup.admin, 'admin NFT');
      if (!st.auctionHouse) { st.auctionHouse = await deployAs(admin, 'AxtoAuctionHouse', setup.admin, setup.treasury, setup.signer); save(); }
      st.collections = st.collections || {};
      for (const [key, name, sym, max] of COLS) {
        if (st.collections[key]) continue;
        const addr = await deployAs(admin, 'AxtoCollection', name, sym, max, setup.admin, setup.treasury, `https://axto.io/api/meta/${key}/`, `https://axto.io/api/contract/${key}`);
        const c = await at(admin, 'AxtoCollection', addr);
        if (key.startsWith('ex-')) await step(`${name}: signer WD`, c.setSigner(setup.signer));
        else await step(`${name}: minter = AuctionHouse`, c.setMinter(st.auctionHouse, true));
        st.collections[key] = addr; save();
      }
      await step('AuctionHouse: USDC', (await at(admin, 'AxtoAuctionHouse', st.auctionHouse)).setCurrency(net.usdc, true));
      st.usdcOk = true; save();
    }
    // Fase 2 — wallet koin AXTO: token (10 jt dicetak ke wallet ini), presale, vesting tim, kunci 5 tahun
    if (!st.distOk) {
      say(id ? '— Fase 2/3: wallet koin AXTO —' : '— Phase 2/3: AXTO coin wallet —');
      const coin = await need(setup.coinWallet, 'koin AXTO');
      if (!st.token) { st.token = await deployAs(coin, 'AxtoToken', setup.coinWallet); save(); }
      if (!st.sale) { st.sale = await deployAs(coin, 'AxtoSale', setup.coinWallet, st.token, net.usdc, net.feed, setup.treasury, setup.signer); save(); }
      if (!st.vesting) { st.vesting = await deployAs(coin, 'AxtoVesting', st.token, setup.coinWallet, E(3000000)); save(); }
      if (!st.lock) { st.lock = await deployAs(coin, 'AxtoLock', st.token, setup.treasury); save(); }
      const token = await at(coin, 'AxtoToken', st.token);
      await step('AXTO: AxtoSale', token.setSale(st.sale));
      for (const a of [st.auctionHouse, st.vesting, st.lock, setup.treasury]) await step(`AXTO: trusted ${a.slice(0, 8)}…`, token.setTrusted(a, true));
      await step('2.000.000 AXTO → presale', token.transfer(st.sale, E(2000000)));
      await step('3.000.000 AXTO → vesting tim', token.transfer(st.vesting, E(3000000)));
      await step('2.000.000 AXTO → kunci 5 tahun', token.transfer(st.lock, E(2000000)));
      st.distOk = true; save();
    }
    // Fase 3 — wallet admin NFT: AuctionHouse menerima AXTO (lelang eksklusif & marketplace)
    if (!st.axtoOk) {
      say(id ? '— Fase 3/3: wallet admin NFT —' : '— Phase 3/3: NFT admin wallet —');
      const admin = await need(setup.admin, 'admin NFT');
      await step('AuctionHouse: AXTO', (await at(admin, 'AxtoAuctionHouse', st.auctionHouse)).setCurrency(st.token, true));
      st.axtoOk = true; save();
    }
    const body = { chainId, token: st.token, sale: st.sale, auctionHouse: st.auctionHouse, vesting: st.vesting, lock: st.lock, collections: st.collections };
    const r = await (await fetch('/api/admin/contracts', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) })).json();
    if (!r.ok) throw new Error(`simpan: ${r.error}`);
    say(id ? `✅ Selesai. Semua kontrak aktif di ${net.name} dan tersambung ke situs & vault.` : `✅ Done. All contracts are live on ${net.name} and connected.`);
  } catch (e) {
    say(`✗ ${e.shortMessage || e.message || e}`);
    box.querySelectorAll('button').forEach((b) => { b.disabled = false; });
  }
}

if (box) {
  box.replaceChildren();
  get('/api/admin/setup').then((setup) => {
    if (setup.error) { say(id ? 'Masuk dulu dengan wallet admin (tombol Hubungkan wallet di atas), lalu muat ulang halaman.' : 'Sign in with the admin wallet first, then reload.'); return; }
    if (setup.active) say(`${id ? 'Aktif sekarang' : 'Active now'}: ${setup.networks[setup.active.chainId]?.name} · AuctionHouse ${setup.active.auctionHouse}`);
    say(`Admin NFT: ${setup.admin} · ${id ? 'Wallet koin' : 'Coin wallet'}: ${setup.coinWallet} · Signer vault: ${setup.signer || '—'} · Treasury: ${setup.treasury}`);
    for (const chainId of [84532, 8453]) {
      const b = document.createElement('button');
      b.className = chainId === 8453 ? 'btn gold' : 'btn';
      b.type = 'button';
      b.textContent = `${id ? 'Deploy ke' : 'Deploy to'} ${setup.networks[chainId].name}`;
      b.addEventListener('click', () => run(chainId));
      box.append(b, ' ');
    }
  });
}
