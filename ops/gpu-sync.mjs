/**
 * Seri G- axto.io — karya yang dilukis GPU (pemilik, 23 Nov 2026: „tandai serinya dengan G- biar jelas bahwa ini karya
 * GPU" · „Series G- masih blm terlihat, biar cepet live"). Dijalankan workflow gpu-sync.yml tiap jam:
 *
 *  1. Antrean: untuk tiap koleksi publik (kecuali Figur Model — GPU tidak boleh melukis wajah/sosok orang sungguhan),
 *     karya etalase berikutnya yang belum punya versi GPU → deskripsi dari DNA karya (tema, palet, bingkai, …), selalu
 *     TANPA teks. Ditulis ke ulyah-media/axto-gpu/jobs.json; heartbeat ulyah.com merender dengan kunci GPU-nya.
 *  2. Hasil: PNG baru di ulyah-media/axto-gpu/out/<c>/<id>.png disalin ke axto-nft-data/gpu/<c>/<id>.png; nomor seri G-
 *     diberikan berurutan per koleksi saat karya pertama kali tiba → axto-nft-data/os/gpu-<c>.json {ids, serial}.
 *  3. Teks Al-Qur'an & hadits tidak pernah dibuat mesin: GPU melukis iluminasi/bingkai, teks asli tetap dari mesin vektor.
 *
 * ENV: CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, CLOUDFLARE_ACCOUNT_ID · [QUEUE_PER_COL]
 * Uji tanpa R2: io disuntikkan (lihat test/gpu-sync.test.mjs).
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { metadata } from '../engine/src/metadata.js';
import { showcaseIds } from '../engine/src/showcase.js';

export const GPU_KEYS = ['time', 'stamp', 'quran', 'hadith'];
const QUEUE_PER_COL = Number(process.env.QUEUE_PER_COL || 24);

const attr = (m, k) => String(m.attributes.find((a) => a.trait_type === k)?.value ?? '').replace(/[^\p{L}\p{N} ,'-]/gu, ' ').trim();

/** Deskripsi untuk GPU dari DNA karya — tanpa teks, tanpa sosok manusia. */
export function promptFor(c, id) {
  const m = metadata(c, id);
  const a = (k) => attr(m, k);
  const base = 'masterpiece collectible digital artwork, ultra detailed, cinematic lighting, rich color, 8k, no text, no letters, no watermark';
  if (c === 'time') return `luxury fantasy timepiece sculpture, ${a('Form')} shape, ${a('Theme')} theme, ${a('Digits')} style dial glow, ${a('Gems')} gemstones, ${a('Backdrop')} background, ${base}`;
  if (c === 'stamp') return `vintage postage stamp of the imaginary ${a('Realm')}, ${a('Series')} theme featuring a ${a('Subject')}, ${a('Frame')} shaped stamp with perforated edges, engraved intaglio illustration, ${a('Palette')} ink palette, year ${a('Year')}, ${base}`;
  if (c === 'quran') return `ornate islamic manuscript illumination, ${a('Illumination')} ornament, ${a('Composition')} composition, ${a('Material')} and gold leaf, ${a('Background')} background, ${a('Frame')}, empty central panel, arabesque and geometric patterns, ${base}`;
  if (c === 'hadith') return `ornate islamic manuscript illumination, ${a('Illumination')} ornament, ${a('Composition')} composition, ${a('Material')} inlay, ${a('Background')} paper, ${a('Frame')}, empty central cartouche, arabesque and geometric patterns, ${base}`;
  throw new Error(`koleksi ${c} tidak diproduksi GPU`);
}

export function realIO() {
  const tmp = mkdtempSync(join(tmpdir(), 'axto-gpu-'));
  const wr = (args) => execFileSync('npx', ['--yes', 'wrangler@4.156.1', 'r2', 'object', ...args, '--remote'], { stdio: 'pipe' });
  return {
    getText: (bk) => { const f = join(tmp, 'g'); try { wr(['get', bk, '--file', f]); return readFileSync(f, 'utf8'); } catch { return null; } },
    putText: (bk, text) => { const f = join(tmp, 'p'); writeFileSync(f, text); wr(['put', bk, '--file', f, '--content-type', 'application/json']); },
    copy: (from, to) => { const f = join(tmp, 'b'); wr(['get', from, '--file', f]); wr(['put', to, '--file', f, '--content-type', 'image/png', '--cache-control', 'public, max-age=31536000, immutable']); },
  };
}

export function run({ io = realIO(), log = console.log, perCol = QUEUE_PER_COL } = {}) {
  const parse = (t, d) => { try { return t ? JSON.parse(t) : d; } catch { return d; } };
  const done = parse(io.getText('ulyah-media/axto-gpu/done.json'), { done: {}, failed: {} });
  const summary = {};
  // 2) hasil baru → R2 axto + nomor seri G-
  for (const c of GPU_KEYS) {
    const st = parse(io.getText(`axto-nft-data/os/gpu-${c}.json`), { ids: [], serial: {} });
    st.serial ??= {};
    const have = new Set(st.ids);
    const fresh = Object.entries(done.done ?? {}).filter(([k]) => k.startsWith(`${c}:`)).map(([k, v]) => ({ id: Number(k.split(':')[1]), at: v.at })).filter((x) => !have.has(x.id)).sort((x, y) => String(x.at).localeCompare(String(y.at)));
    let next = Math.max(0, ...Object.values(st.serial).map(Number)) + 1;
    for (const x of fresh) {
      io.copy(`ulyah-media/axto-gpu/out/${c}/${x.id}.png`, `axto-nft-data/gpu/${c}/${x.id}.png`);
      st.ids.push(x.id);
      st.serial[x.id] = next;
      next += 1;
    }
    if (fresh.length || !st.at) { st.at = new Date().toISOString(); io.putText(`axto-nft-data/os/gpu-${c}.json`, JSON.stringify(st)); }
    summary[c] = { works: st.ids.length, new: fresh.length };
  }
  // 1) antrean: karya etalase berikutnya yang belum dilukis GPU (dan belum gagal 3×)
  const jobs = [];
  for (const c of GPU_KEYS) {
    const isDone = (id) => done.done?.[`${c}:${id}`] || (done.failed?.[`${c}:${id}`] ?? 0) >= 3;
    for (const id of showcaseIds(c).ids) {
      if (jobs.filter((j) => j.c === c).length >= perCol) break;
      if (!isDone(id)) jobs.push({ c, id, prompt: promptFor(c, id) });
    }
  }
  io.putText('ulyah-media/axto-gpu/jobs.json', JSON.stringify({ at: new Date().toISOString(), jobs }));
  log(`Seri G-: ${JSON.stringify(summary)} · antrean ${jobs.length}`);
  return { summary, queued: jobs.length };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const r = run();
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## Seri G- (karya GPU)\n\n${Object.entries(r.summary).map(([c, x]) => `- ${c}: ${x.works} karya (+${x.new})`).join('\n')}\n- antrean berikutnya: ${r.queued}\n`, { flag: 'a' });
}
