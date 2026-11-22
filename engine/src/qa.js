/**
 * QA produksi: setiap token diperiksa sebelum batch di-commit ke ledger. Batch gagal → tidak ada yang tercatat.
 */
import { collection, sha256Hex } from './core.js';
import { dna, canonical } from './dna.js';
import { metadata, renderCtx, renderSvg } from './metadata.js';
import { digitsSvg } from './render/time.js';

export const MAX_SVG_BYTES = 300 * 1024;

/** Pemeriksa keseimbangan tag XML sederhana (tanpa DOM). */
export function wellFormed(xml) {
  const re = /<!--[\s\S]*?-->|<\/?([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|<|&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)/g;
  const stack = [];
  let m;
  while ((m = re.exec(xml))) {
    const t = m[0];
    if (t.startsWith('<!--')) continue;
    if (t === '<') return { ok: false, why: `'<' liar di ${m.index}` };
    if (t.startsWith('&')) return { ok: false, why: `entitas tidak sah di ${m.index}` };
    const name = m[1];
    if (t.startsWith('</')) {
      if (stack.pop() !== name) return { ok: false, why: `penutup </${name}> tidak cocok di ${m.index}` };
    } else if (!m[3]) stack.push(name);
  }
  return stack.length ? { ok: false, why: `tag tidak ditutup: ${stack.slice(-3).join(',')}` } : { ok: true };
}

const unescapeXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/**
 * QA satu token. provider = penyedia data Al-Qur'an ({ayah, page}). Mengembalikan {ok, hash, errors[]}.
 */
export async function qaToken(key, tokenId, provider) {
  const errors = [];
  const d = dna(key, tokenId);
  const meta = metadata(key, tokenId);
  for (const f of ['name', 'description', 'image', 'animation_url', 'external_url']) if (!meta[f]) errors.push(`metadata.${f} kosong`);
  if (!Array.isArray(meta.attributes) || meta.attributes.length < 5) errors.push('atribut kurang');
  let svg = '';
  try {
    const ctx = await renderCtx(d, provider);
    svg = renderSvg(d, ctx);
    if (d.kind === 'quran' && ctx.ar) {
      // Teks ayat di SVG harus sama persis dengan sumber (urutan kata utuh, tanpa perubahan).
      const lines = [...svg.matchAll(/<text[^>]*direction="rtl"[^>]*stroke-opacity="[^"]*"[^>]*>([^<]*)<\/text>/g)].map((x) => unescapeXml(x[1]));
      const joined = lines.join(' ').split(/\s+/).filter(Boolean).join(' ');
      const src = ctx.ar.split(/\s+/).filter(Boolean).join(' ');
      if (d.series.series === 'ayah' && joined !== src) errors.push('teks ayat di karya tidak sama dengan sumber');
    }
    if (d.kind === 'hadith') {
      // #49: teks hadits di karya = awal teks sumber, kata demi kata (boleh dipotong „…" bila terlalu panjang; lengkap di player)
      if (!ctx.ar) errors.push('teks hadits tidak ditemukan');
      const lines = [...svg.matchAll(/<text[^>]*direction="rtl"[^>]*stroke-opacity="[^"]*"[^>]*>([^<]*)<\/text>/g)].map((x) => unescapeXml(x[1]));
      const shown = lines.join(' ').replace(/ …$/, '').split(/\s+/).filter(Boolean);
      const src = String(ctx.ar ?? '').split(/\s+/).filter(Boolean);
      if (!shown.length || shown.some((w, i) => w !== src[i])) errors.push('teks hadits di karya tidak sama dengan sumber');
    }
  } catch (e) {
    errors.push(`render gagal: ${e.message}`);
  }
  const bytes = new TextEncoder().encode(svg).length;
  if (bytes > MAX_SVG_BYTES) errors.push(`SVG ${bytes} B > batas`);
  const wf = wellFormed(svg);
  if (!wf.ok) errors.push(`SVG tidak valid: ${wf.why}`);
  if (d.kind === 'time') {
    for (const [t, s] of [['00:00', '00'], ['12:34', '56'], ['23:59', '59']]) {
      const g = digitsSvg(d.pick[2][0], t, s, 0, 0, 400, 160, '#fff', '#000', d.seed);
      if (!g || g.length < 60) errors.push(`jam tidak terbaca pada ${t}:${s}`);
    }
  }
  const hash = await sha256Hex(canonical(d));
  return { ok: errors.length === 0, hash, errors, tier: d.tier.name };
}

/** Akar batch = sha256 dari gabungan hash berurutan. */
export async function batchRoot(hashes) {
  return sha256Hex(hashes.join(''));
}

/**
 * QA satu batch [from, from+n). Keunikan juga dicek antar-item (sabuk pengaman ganda selain bijeksi Feistel).
 */
export async function qaBatch(key, from, n, provider, onProgress) {
  const c = collection(key);
  const to = Math.min(c.max, from + n);
  const hashes = [];
  const seen = new Set();
  const failures = [];
  const tiers = {};
  for (let i = from; i < to; i += 1) {
    const r = await qaToken(key, i + 1, provider);
    if (seen.has(r.hash)) r.errors.push('DNA kembar');
    seen.add(r.hash);
    hashes.push(r.hash);
    tiers[r.tier] = (tiers[r.tier] ?? 0) + 1;
    if (r.errors.length) failures.push({ tokenId: i + 1, errors: r.errors });
    if (onProgress && (i - from) % 500 === 0) onProgress(i - from, to - from);
  }
  return { key, from, to, count: to - from, root: await batchRoot(hashes), failures, tiers };
}
