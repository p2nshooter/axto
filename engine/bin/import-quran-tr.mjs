#!/usr/bin/env node
/**
 * Terjemah & tafsir Al-Qur'an tepercaya untuk player NFT axto.io — tidak pernah terjemahan mesin.
 *
 * Perintah pemilik 22 Nov 2026: „Klo Al-quran mah jgn di terjemah sembarangan, cari langsung tafsir2 dari setiap negara
 * dari sumber manapun termasuk github yg tafsirnya sholeh agar tidak salah menerjemahkan" — „Berlaku jg untu axto.io".
 * Penyimpanan R2 saja (CLAUDE.md).
 *
 * Sumber: QuranEnc.com (Ensiklopedia Terjemah Makna Al-Qur'an — Ruwwad Translation Center & Markaz Tafsir): satu
 * terjemahan karya ulama/lembaga bernama per bahasa (Kemenag RI, Saheeh International, edisi tinjauan Ruwwad / Kompleks
 * Raja Fahd), plus Al-Mukhtashar fi Tafsir Al-Qur'an. Syarat penerbitan ulangnya diikuti: tanpa mengubah/menambah/
 * menghapus (teks & catatan kaki disimpan apa adanya), sumber dan versi selalu ditampilkan, diperbarui saat versi baru.
 * Sebelum menulis apa pun: 114 surah, 6.236 ayat, bernomor urut, tidak kosong — kalau tidak, bahasa itu tidak ditulis.
 *
 * R2 (bucket axto-nft-data, binding STORE):
 *   quran/tr/<bahasa>/<surah>.json   { key, version, source, ayat: [{ a, t, f? }] }
 *   quran/tr/<bahasa>/meta.json      { key, title, version, source, url, fetchedAt, ayat }  (ditulis terakhir)
 *   quran/mukhtasar/<bahasa>/…       sama, untuk Al-Mukhtashar
 *
 * Jalan di GitHub Actions (quranenc.com terjangkau di sana); menulis lewat API Cloudflare dengan Global API Key
 * (CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL + CLOUDFLARE_ACCOUNT_ID — secret yang sama dengan deploy).
 *   node engine/bin/import-quran-tr.mjs [--langs=en,fr] [--force] [--dry]
 */

const API = 'https://quranenc.com/api/v1';
const BUCKET = process.env.R2_BUCKET || 'axto-nft-data';

export const AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77,
  227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36,
  25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

/** Bahasa pengunjung yang dilayani player (engine/src/render/hadith.js TR_LANGS). */
export const LANGS = ['id', 'en', 'ms', 'fr', 'tr', 'ur', 'bn', 'ru', 'ta', 'es', 'pt', 'de', 'it', 'nl', 'fa', 'hi', 'zh', 'ja', 'ko', 'sw', 'ha', 'so', 'ps', 'th', 'vi', 'pl', 'uk', 'az', 'uz', 'kk'];

export const PREFERRED = {
  id: ['indonesian_affairs', 'indonesian_complex'],
  en: ['english_saheeh', 'english_rwwad'],
  tr: ['turkish_rwwad', 'turkish_shaban'],
  ur: ['urdu_junagarhi'],
  bn: ['bengali_zakaria'],
};
const TAFSIR_KEY = /mokhtasar|mukhtasar|muyassar|saadi|tafsir|tafseer|katheer|kathir|tabari/i;
const TRUSTED_TITLE = /rowwad|rwwad|ruwwad|complex|king fahd|ministry|affairs|saheeh|sahih/i;

export function pickTranslation(lang, entries, override) {
  const list = entries.filter((e) => e.language_iso_code === lang && !TAFSIR_KEY.test(e.key) && !TAFSIR_KEY.test(e.title || ''));
  if (override) return list.find((e) => e.key === override) ?? null;
  for (const k of PREFERRED[lang] ?? []) {
    const hit = list.find((e) => e.key === k);
    if (hit) return hit;
  }
  const ts = (e) => Number(e.last_update) || 0;
  return [...list].sort((a, b) => Number(TRUSTED_TITLE.test(b.title || '')) - Number(TRUSTED_TITLE.test(a.title || '')) || ts(b) - ts(a) || a.key.localeCompare(b.key))[0] ?? null;
}
export const pickMukhtasar = (lang, entries) => entries.find((e) => e.language_iso_code === lang && /mokhtasar|mukhtasar/i.test(e.key)) ?? null;

export function checkSurah(n, raw) {
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.result) ? raw.result : null;
  if (!arr) throw new Error(`surah ${n}: jawaban tak dikenal`);
  const want = AYAH_COUNTS[n - 1];
  if (arr.length !== want) throw new Error(`surah ${n}: ${arr.length} ayat, seharusnya ${want}`);
  return arr.map((r, i) => {
    const a = Number(r.aya);
    if (Number(r.sura) !== n || a !== i + 1) throw new Error(`surah ${n}: ayat ${i + 1} bernomor ${r.sura}:${r.aya}`);
    const t = typeof r.translation === 'string' ? r.translation : '';
    if (!t.trim()) throw new Error(`surah ${n}: ayat ${a} kosong`);
    const f = typeof r.footnotes === 'string' && r.footnotes.trim() ? r.footnotes : undefined;
    return f ? { a, t, f } : { a, t };
  });
}

async function getJson(url) {
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'axto-quran-import/1.0 (+QuranEnc republication)' } });
      if (res.ok) return await res.json();
      if (res.status === 404) throw new Error(`404 ${url}`);
    } catch (err) {
      if (String(err).includes('404')) throw err;
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
  }
  throw new Error(`gagal: ${url}`);
}

function r2() {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  const key = process.env.CLOUDFLARE_API_KEY;
  const email = process.env.CLOUDFLARE_EMAIL;
  if (!acct || !key || !email) return null;
  const base = `https://api.cloudflare.com/client/v4/accounts/${acct}/r2/buckets/${BUCKET}/objects/`;
  const headers = { 'X-Auth-Key': key, 'X-Auth-Email': email };
  return {
    async get(k) {
      const res = await fetch(base + k.split('/').map(encodeURIComponent).join('/'), { headers });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`R2 GET ${k} → ${res.status}`);
      return res.json();
    },
    async put(k, value) {
      for (let i = 0; i < 5; i++) {
        const res = await fetch(base + k.split('/').map(encodeURIComponent).join('/'), {
          method: 'PUT',
          headers: { ...headers, 'content-type': 'application/json' },
          body: JSON.stringify(value),
        });
        if (res.ok) return;
        if (res.status !== 429 && res.status < 500) throw new Error(`R2 PUT ${k} → ${res.status} ${await res.text()}`);
        await new Promise((r) => setTimeout(r, 800 * 2 ** i));
      }
      throw new Error(`R2 PUT ${k}: menyerah`);
    },
  };
}

async function mapLimit(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    for (;;) {
      const k = i++;
      if (k >= items.length) return;
      await fn(items[k], k);
    }
  }));
}

async function importOne(store, kind, lang, e, force) {
  const base = `quran/${kind}/${lang}`;
  if (store && !force) {
    const cur = await store.get(`${base}/meta.json`).catch(() => null);
    if (cur && cur.key === e.key && String(cur.version) === String(e.version)) return 'sama';
  }
  const surahs = new Array(114);
  await mapLimit(Array.from({ length: 114 }, (_, i) => i + 1), 6, async (n) => {
    surahs[n - 1] = checkSurah(n, await getJson(`${API}/translation/sura/${e.key}/${n}`));
  });
  const total = surahs.reduce((s, x) => s + x.length, 0);
  if (total !== 6236) throw new Error(`${e.key}: ${total} ayat`);
  if (!store) return 'dry';
  await mapLimit(surahs, 8, (ayat, i) => store.put(`${base}/${i + 1}.json`, { key: e.key, version: e.version, source: 'QuranEnc.com', ayat }));
  await store.put(`${base}/meta.json`, {
    key: e.key, title: e.title, version: String(e.version), last_update: e.last_update, source: 'QuranEnc.com',
    url: `https://quranenc.com/en/browse/${e.key}`, fetchedAt: new Date().toISOString(), ayat: total,
  });
  return 'ditulis';
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((x) => { const [k, v] = x.replace(/^--/, '').split('='); return [k, v ?? 'true']; }));
  const dry = args.dry === 'true';
  const store = dry ? null : r2();
  if (!dry && !store) {
    console.error('CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_KEY / CLOUDFLARE_EMAIL wajib (atau --dry).');
    process.exit(1);
  }
  const raw = await getJson(`${API}/translations/list`);
  const entries = (Array.isArray(raw) ? raw : raw.translations ?? []).filter((e) => e && typeof e.key === 'string');
  const langs = String(args.langs ?? '').split(',').filter((l) => LANGS.includes(l));
  const report = [];
  let failed = 0;
  for (const lang of langs.length ? langs : LANGS) {
    for (const kind of ['tr', 'mukhtasar']) {
      const e = kind === 'tr' ? pickTranslation(lang, entries) : pickMukhtasar(lang, entries);
      if (!e) {
        report.push(`${lang} ${kind}: tidak ada di QuranEnc — player tidak menampilkan terjemahan mesin`);
        continue;
      }
      try {
        report.push(`${lang} ${kind}: ${e.key} v${e.version} — ${await importOne(store, kind, lang, e, args.force === 'true')} (${e.title})`);
      } catch (err) {
        failed++;
        report.push(`${lang} ${kind}: ${e.key} DITOLAK — ${err.message}`);
      }
    }
  }
  for (const l of report) console.log(l);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Terjemah Al-Qur'an tepercaya (QuranEnc → R2 axto)\n\n${report.map((l) => `- ${l}`).join('\n')}\n`);
  }
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && /import-quran-tr\.mjs$/.test(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); });
