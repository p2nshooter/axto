#!/usr/bin/env node
/**
 * Mesin produksi (GitHub Actions, tiap jam). Untuk setiap koleksi aktif:
 *   state → batch [produced, produced+BATCH) → QA → commit ber-HMAC ke ledger axto.io.
 * Gagal di titik mana pun → tidak ada commit; run berikutnya melanjutkan dari checkpoint yang sama.
 *
 * ENV: AXTO_API (mis. https://axto.io), ENGINE_HMAC_KEY, BATCH (default 5000), COLLECTIONS (koma; default semua),
 *      DRY_RUN=1 (QA saja, tanpa commit; dipakai CI bila secret belum ada).
 */
import { readFile, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { COLLECTIONS } from '../src/core.js';
import { qaBatch } from '../src/qa.js';
import { fsProvider } from '../src/provider-fs.js';

const API = (process.env.AXTO_API || '').replace(/\/$/, '');
const KEY = process.env.ENGINE_HMAC_KEY || '';
const BATCH = Number(process.env.BATCH || 5000);
const DRY = process.env.DRY_RUN === '1' || !API || !KEY;
const LIST = (process.env.COLLECTIONS || Object.keys(COLLECTIONS).join(',')).split(',').map((s) => s.trim()).filter(Boolean);

async function hmac(body, ts) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`${ts}.${body}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function call(path, payload) {
  const body = payload ? JSON.stringify(payload) : '';
  const ts = String(Date.now());
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const res = await fetch(`${API}${path}`, {
        method: payload ? 'POST' : 'GET',
        headers: { 'content-type': 'application/json', 'x-axto-ts': ts, 'x-axto-sig': await hmac(body, ts) },
        body: payload ? body : undefined,
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) return j;
      if (res.status < 500 && res.status !== 429) throw new Error(`${path} → ${res.status} ${JSON.stringify(j)}`);
    } catch (e) {
      if (attempt === 4) throw e;
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
  throw new Error('gagal setelah retry');
}

async function consentOk(key) {
  if (!COLLECTIONS[key].requiresConsent) return true;
  const f = new URL('../consent/luaja-1.json', import.meta.url);
  if (!existsSync(f)) return false;
  const j = JSON.parse(await readFile(f, 'utf8'));
  return j.granted === true && j.scope?.includes('nft-commercial');
}

const summary = [];
let failed = false;
for (const key of LIST) {
  const c = COLLECTIONS[key];
  if (!c) continue;
  if (!(await consentOk(key))) {
    summary.push(`| ${key} | dilewati | izin model belum ada (engine/consent) |`);
    continue;
  }
  try {
    const state = DRY ? { produced: 0, max: c.max, enabled: true } : await call(`/internal/engine/state?c=${key}`);
    if (!state.enabled) { summary.push(`| ${key} | jeda | dinonaktifkan admin |`); continue; }
    if (state.produced >= c.max) { summary.push(`| ${key} | selesai | ${c.max.toLocaleString('id-ID')} |`); continue; }
    const n = DRY ? Math.min(BATCH, 200) : BATCH;
    const t0 = Date.now();
    const r = await qaBatch(key, state.produced, n, fsProvider);
    if (r.failures.length) {
      failed = true;
      summary.push(`| ${key} | GAGAL QA | ${r.failures.length} item, contoh #${r.failures[0].tokenId}: ${r.failures[0].errors.join('; ')} |`);
      continue;
    }
    if (!DRY) await call('/internal/engine/commit', { collection: key, from: r.from, to: r.to, root: r.root, tiers: r.tiers });
    summary.push(`| ${key} | ${DRY ? 'QA (dry-run)' : 'commit'} | ${r.from + 1}–${r.to} (${r.count}) dalam ${((Date.now() - t0) / 1000).toFixed(1)} dtk, root ${r.root.slice(0, 12)}… |`);
  } catch (e) {
    failed = true;
    summary.push(`| ${key} | ERROR | ${String(e.message).slice(0, 200)} |`);
  }
}
const md = `### AXTO engine ${DRY ? '(dry-run)' : ''}\n\n| Koleksi | Status | Detail |\n|---|---|---|\n${summary.join('\n')}\n`;
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, md);
process.exit(failed ? 1 : 0);
