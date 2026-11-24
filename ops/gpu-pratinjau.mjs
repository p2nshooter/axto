/**
 * Pratinjau seri G- (pemilik, 24 Nov 2026: „ini series G- sampah semua" → hasil dilihat dulu sebelum dinyatakan selesai).
 * Meminta worker axto.io melukis + memeriksa beberapa karya TANPA disimpan (/internal/gpu/pratinjau), lalu menyimpan gambar
 * dan putusan pemeriksa ke folder pratinjau/ (diunggah sebagai artefak workflow) serta mencetak gambar kecil ke log.
 * ENV: CLOUDFLARE_API_KEY (turunan kunci HMAC engine) · [PRATINJAU_KOLEKSI] · [PRATINJAU_JUMLAH]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { candidates } from '../engine/src/gpu.js';

const env = process.env;
const hk = env.ENGINE_HMAC_KEY || (env.CLOUDFLARE_API_KEY ? createHmac('sha256', env.CLOUDFLARE_API_KEY).update('axto:ENGINE_HMAC_KEY').digest('hex') : '');
if (!hk) { console.error('kunci HMAC tidak ada'); process.exit(1); }
const koleksi = String(env.PRATINJAU_KOLEKSI || 'time,stamp,quran,hadith').split(',').map((x) => x.trim()).filter(Boolean);
const n = Math.max(1, Math.min(4, Number(env.PRATINJAU_JUMLAH || 2)));
const mulai = Math.max(0, Number(env.PRATINJAU_MULAI || 40));
mkdirSync('pratinjau', { recursive: true });
const ringkas = [];
for (const c of koleksi) {
  for (const id of candidates(c).slice(mulai, mulai + n)) {
    const body = JSON.stringify({ c, id });
    const ts = String(Date.now());
    const sig = createHmac('sha256', hk).update(`${ts}.${body}`).digest('hex');
    const r = await fetch(`${env.AXTO_API || 'https://axto.io'}/internal/gpu/pratinjau`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-axto-ts': ts, 'x-axto-sig': sig }, body });
    const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
    if (!j.image) { console.log(`✗ ${c} ${id}: ${j.error ?? ''} ${j.detail ?? ''}`); ringkas.push({ c, id, error: j.error, detail: j.detail }); continue; }
    const ext = j.type === 'image/png' ? 'png' : j.type === 'image/webp' ? 'webp' : 'jpg';
    writeFileSync(`pratinjau/${c}-${id}.${ext}`, Buffer.from(j.image, 'base64'));
    const { image, ...rest } = j;
    ringkas.push({ c, id, ...rest });
    console.log(`${j.ok ? '✓' : '✗'} ${c} ${id} · ${j.model} · ${JSON.stringify(j.qa)}${j.klein ? ` · klein: ${j.klein}` : ''}`);
    // gambar kecil di log (artefak tidak selalu bisa diunduh peninjau): baris PRATINJAU-B64 <nama> <potongan>
    try {
      const { default: sharp } = await import('sharp');
      const kecil = await sharp(Buffer.from(j.image, 'base64')).resize(320, 320).jpeg({ quality: 72 }).toBuffer();
      const b64 = kecil.toString('base64');
      for (let i = 0; i < b64.length; i += 3000) console.log(`PRATINJAU-B64 ${c}-${id} ${b64.slice(i, i + 3000)}`);
    } catch { /* sharp tidak terpasang: lewati */ }
  }
}
writeFileSync('pratinjau/hasil.json', JSON.stringify(ringkas, null, 2));
