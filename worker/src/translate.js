/**
 * Mesin penerjemah hadits (perintah pemilik #49 „Bikin aja engine penerjemah yang, tp yg real, yg betul2 penerjemah yang
 * berfungsi"). Urutan:
 *  1. Terjemahan PENERJEMAH (manusia) bila ada: Indonesia & Inggris dari data hadits; Prancis, Turki, Urdu, Bengali,
 *     Rusia, Tamil dari edisi penerjemah fawazahmed0/hadith-api (Unlicense) lewat jsDelivr.
 *  2. Selain itu MESIN PENERJEMAH Workers AI (@cf/meta/m2m100-1.2b, ±100 bahasa) dari bahasa Inggris (atau Indonesia
 *     bila kitab tidak punya terjemahan Inggris), dipecah per kalimat. Diberi label „machine".
 * Hasil disimpan di cache tepi Cloudflare (Cache API, 30 hari) — tidak ada data permanen di R2/KV.
 */
import { HADITH_KITAB, KITAB_BY_KEY, indexOfNumber, bookOf } from '../../engine/src/catalog/hadith.js';
import { UI } from '../../engine/src/render/hadith.js';

const HUMAN3 = { fr: 'fra', tr: 'tur', ur: 'urd', bn: 'ben', ru: 'rus', ta: 'tam' };
export const MT_LANGS = new Set(['id', 'en', 'ms', 'fr', 'tr', 'ur', 'bn', 'ru', 'ta', 'es', 'pt', 'de', 'it', 'nl', 'fa', 'hi', 'zh', 'ja', 'ko', 'sw', 'ha', 'so', 'ps', 'th', 'vi', 'pl', 'uk', 'az', 'uz', 'kk', 'ar']);

/** Ambil satu hadits dari aset statis (blok 100 hadits). */
export async function hadithItem(env, origin, key, n) {
  const i = indexOfNumber(key, n);
  if (i < 0) return null;
  const r = await env.ASSETS.fetch(new Request(`${origin}/hadith/${key}/${Math.floor(i / 100)}.json`));
  if (!r.ok) return null;
  return (await r.json())[i % 100] ?? null;
}

function sentences(t, max = 600) {
  const parts = t.split(/(?<=[.!?;:])\s+/);
  const out = [];
  let cur = '';
  for (const p of parts) {
    if (cur && (cur.length + p.length + 1) > max) { out.push(cur); cur = p; } else cur = cur ? `${cur} ${p}` : p;
  }
  if (cur) out.push(cur);
  return out.flatMap((c) => (c.length > max ? c.match(new RegExp(`.{1,${max}}(\\s|$)`, 'g')) ?? [c] : [c]));
}

async function mt(env, text, src, to) {
  const r = await env.AI.run('@cf/meta/m2m100-1.2b', { text, source_lang: src, target_lang: to });
  return String(r?.translated_text ?? '').trim();
}

/** Label player untuk bahasa tanpa kamus bawaan (#50: satu bahasa, tidak campur) — diterjemahkan mesin dari Inggris, cache tepi. */
async function uiFor(env, to) {
  const key = new Request(`https://axto.io/__tr/ui/${to}/v1`);
  const hit = await caches.default.match(key);
  if (hit) return hit.json();
  const entries = await Promise.all(Object.entries(UI.en).map(async ([k, v]) => [k, (await mt(env, v, 'en', to)) || v]));
  const ui = Object.fromEntries(entries);
  await caches.default.put(key, new Response(JSON.stringify(ui), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=2592000' } }));
  return ui;
}

/** Terjemahkan hadits `key`/`n` ke bahasa `to`. Mengembalikan {text, lang, kind: 'human'|'machine', source}. */
export async function translateHadith(env, origin, key, n, to, ctx) {
  if (KITAB_BY_KEY[key] === undefined) return { error: 'kitab' };
  if (!MT_LANGS.has(to)) return { error: 'lang' };
  const cacheKey = new Request(`https://axto.io/__tr/hadith/${key}/${n}/${to}/v2`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();
  const item = await hadithItem(env, origin, key, n);
  if (!item) return { error: 'hadith' };
  let out = null;
  if (to === 'ar') out = { text: item.ar, lang: 'ar', kind: 'original', source: 'AXTO' };
  else if (to === 'id' && item.id) out = { text: item.id, lang: 'id', kind: 'human', source: 'AXTO' };
  else if (to === 'en' && item.en) out = { text: item.en, lang: 'en', kind: 'human', source: 'AXTO' };
  else if (HUMAN3[to]) {
    const ed = HADITH_KITAB[KITAB_BY_KEY[key]].langs?.[HUMAN3[to]];
    if (ed) {
      try {
        const r = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${ed}/${n}.min.json`, { cf: { cacheTtl: 2592000, cacheEverything: true } });
        if (r.ok) { const j = await r.json(); const t = j.hadiths?.[0]?.text; if (t) out = { text: t, lang: to, kind: 'human', source: `fawazahmed0/hadith-api · ${ed}` }; }
      } catch { /* jatuh ke mesin penerjemah */ }
    }
  }
  if (!out) {
    if (!env.AI) return { error: 'mt_unavailable' };
    const [src, srcLang] = item.en ? [item.en, 'en'] : [item.id, 'id'];
    if (!src) return { error: 'no_source' };
    const parts = [];
    try {
      for (const s of sentences(src)) {
        const r = await env.AI.run('@cf/meta/m2m100-1.2b', { text: s, source_lang: srcLang, target_lang: to });
        parts.push(r?.translated_text ?? '');
      }
    } catch (e) {
      return { error: 'mt_failed', detail: String(e?.message ?? e).slice(0, 120) }; // player jatuh ke terjemahan Inggris
    }
    const text = parts.join(' ').trim();
    if (!text) return { error: 'mt_failed' };
    out = { text, lang: to, kind: 'machine', source: `Workers AI m2m100 (${srcLang}→${to})` };
  }
  // nama bab & label player dalam bahasa yang sama dengan terjemahan (tidak campur)
  const bk = bookOf(key, n);
  if (env.AI && to !== 'en' && to !== 'ar') {
    try { if (bk) out.book = (await mt(env, bk[1], 'en', to)) || undefined; } catch { /* nama bab Inggris tetap dipakai di player */ }
    try { if (!UI[to]) out.ui = await uiFor(env, to); } catch { /* label Inggris */ }
  }
  const res = new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=2592000' } });
  if (ctx) ctx.waitUntil(cache.put(cacheKey, res.clone())); else await cache.put(cacheKey, res.clone());
  return out;
}
