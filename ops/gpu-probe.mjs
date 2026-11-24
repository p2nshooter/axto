/**
 * Uji Space gambar→video kandidat (seri G-) dari runner: /gradio_api/info → parameter, lalu SATU panggilan dengan gambar
 * G- yang diunggah. Hanya status, nama parameter & potongan pesan yang dicetak (kunci disamarkan).
 */
import { realIO, loadKeys } from './gpu-sync.mjs';

const CAND = (process.env.SPACES || 'multimodalart-wan2-1-fast,r3gm-wan2-2-fp8da-aoti-preview,zerogpu-aoti-wan2-2-fp8da-aoti-faster,lightricks-ltx-video-distilled').split(',');
const IMG = 'https://axto.io/gpu/time/1.png';
const mask = (s) => String(s).replace(/hf_[A-Za-z0-9]+/g, 'hf_…');
const K = loadKeys(realIO(), process.env.CLOUDFLARE_API_KEY);
const hf = K.keys.filter((k) => /^hf/i.test(String(k.provider)));
console.log(`kunci HF: ${hf.length} (zerogpu ${hf.filter((k) => k.provider === 'hf-zerogpu').length})`);
// validitas kunci (hanya status & jenis akun yang dicetak)
let key = null;
let sah = 0;
for (const k of hf.slice(0, 12)) {
  const w = await fetch('https://huggingface.co/api/whoami-v2', { headers: { Authorization: `Bearer ${k.key}` } });
  const j = await w.json().catch(() => ({}));
  console.log(`kunci ${k.provider}: whoami HTTP ${w.status}${w.ok ? ` · pro=${Boolean(j.isPro)} · jenis=${j.type ?? '?'}` : ''}`);
  if (w.ok) { sah += 1; key ??= k.key; }
}
console.log(`kunci sah: ${sah}/12 diuji`);
const MODE = process.env.ANON ? 'anon' : 'key';
const auth = key && MODE === 'key' ? { Authorization: `Bearer ${key}` } : {};
let imgRes = await fetch(IMG);
if (!imgRes.ok) imgRes = await fetch('https://axto.io/logo-512.png'); // uji pipa saja, hasil tidak disimpan
console.log(`gambar uji: HTTP ${imgRes.status} ${imgRes.headers.get('content-type')}`);
const png = Buffer.from(await imgRes.arrayBuffer());
for (const sp of CAND) {
  const base = `https://${sp}.hf.space/gradio_api`;
  try {
    const info = await (await fetch(`${base}/info`, { headers: auth, signal: AbortSignal.timeout(30_000) })).json();
    const eps = Object.entries(info.named_endpoints ?? {}).filter(([n]) => /video|generate|i2v/i.test(n));
    console.log(`== ${sp}: ${eps.map(([n, e]) => `${n}(${e.parameters.map((p) => p.parameter_name || p.label).join(',')})`).join(' | ')}`);
    const [name, ep] = eps.find(([n]) => /image_to_video|generate_video|i2v/i.test(n)) ?? eps[0] ?? [];
    if (!name) continue;
    const fd = new FormData();
    fd.append('files', new Blob([png], { type: 'image/png' }), 'g.png');
    const ur = await fetch(`${base}/upload`, { method: 'POST', headers: auth, body: fd });
    const up = await ur.json().catch(() => null);
    console.log(`   unggah: HTTP ${ur.status} ${Array.isArray(up) ? 'ok' : mask(JSON.stringify(up)).slice(0, 100)}`);
    const file = { path: up?.[0], orig_name: 'g.png', meta: { _type: 'gradio.FileData' } };
    const data = ep.parameters.map((p) => {
      const n = String(p.parameter_name || p.label || '').toLowerCase();
      if (/image/.test(n) && !/height|width|dims/.test(n)) return file;
      if (/video/.test(n)) return null;
      if (n === 'prompt') return 'gentle cinematic motion, the painting slowly comes alive';
      if (/randomize/.test(n)) return false;
      if (/seed/.test(n)) return 7;
      if (/duration/.test(n)) return typeof p.parameter_default === 'number' ? Math.min(p.parameter_default, 2.5) : p.parameter_default;
      return p.parameter_default ?? null;
    });
    const t0 = Date.now();
    const r = await fetch(`${base}/call/${name.replace(/^\//, '')}`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
    const ev = (await r.json().catch(() => ({})))?.event_id;
    if (!ev) { console.log(`   panggil: HTTP ${r.status} tanpa event`); continue; }
    const sse = await (await fetch(`${base}/call/${name.replace(/^\//, '')}/${ev}`, { headers: auth, signal: AbortSignal.timeout(240_000) })).text();
    const kind = /event:\s*complete/.test(sse) ? 'BERHASIL' : /event:\s*error/.test(sse) ? 'galat' : 'lain';
    console.log(`   ${name}: ${kind} dalam ${Math.round((Date.now() - t0) / 1000)} dtk · ${mask(sse.slice(-260)).replace(/\s+/g, ' ')}`);
  } catch (e) { console.log(`== ${sp}: ${e.name} ${mask(e.message).slice(0, 120)}`); }
}
