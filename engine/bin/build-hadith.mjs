#!/usr/bin/env node
/**
 * Bangun data NFT Hadits (perintah pemilik #49) dari berkas seed sumber internal pemilik + metadata kitab
 * fawazahmed0/hadith-api (Unlicense). Teks TIDAK diubah: disalin apa adanya.
 *
 *   node bin/build-hadith.mjs <direktori seed> <info.json fawazahmed0> <editions.json fawazahmed0>
 *
 * Keluaran:
 *   worker/public/hadith/<kitab>/<blok>.json   — 100 hadits per blok: {n, ar, id, en, b (nomor kitab/bab), bh (nomor dalam bab), g}
 *   engine/src/catalog/hadith-meta.js          — daftar kitab, nama bab, rentang, nomor hadits (dikompres), bahasa terjemahan
 *
 * Kitab yang dipakai: lisensinya jelas (fawazahmed0 Unlicense; gadingnst MIT). Riyadhus Shalihin (lisensi sumber tidak
 * tercantum) dan ringkasan kurasi (parafrase, bukan teks lengkap) TIDAK dipakai.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const [seedDir, infoPath, editionsPath] = process.argv.slice(2);
if (!seedDir || !infoPath || !editionsPath) { console.error('pakai: build-hadith.mjs <seedDir> <info.json> <editions.json>'); process.exit(1); }

// [kunci, berkas seed, nama ID, nama AR, nama EN, penyusun, sumber/lisensi]
const KITAB = [
  ['bukhari', 'hadith_bukhari.sql', 'Shahih Bukhari', 'صحيح البخاري', 'Sahih al-Bukhari', 'Imam Al-Bukhari', 'fawazahmed0/hadith-api (Unlicense)'],
  ['muslim', 'hadith_muslim.sql', 'Shahih Muslim', 'صحيح مسلم', 'Sahih Muslim', 'Imam Muslim', 'fawazahmed0/hadith-api (Unlicense)'],
  ['abudawud', 'hadith_abudawud.sql', 'Sunan Abu Dawud', 'سنن أبي داود', 'Sunan Abi Dawud', 'Imam Abu Dawud', 'fawazahmed0/hadith-api (Unlicense)'],
  ['tirmidhi', 'hadith_tirmidhi.sql', 'Jami\' At-Tirmidzi', 'جامع الترمذي', 'Jami` at-Tirmidhi', 'Imam At-Tirmidzi', 'fawazahmed0/hadith-api (Unlicense)'],
  ['nasai', 'hadith_nasai.sql', 'Sunan An-Nasa\'i', 'سنن النسائي', 'Sunan an-Nasa\'i', 'Imam An-Nasa\'i', 'fawazahmed0/hadith-api (Unlicense)'],
  ['ibnmajah', 'hadith_ibnmajah.sql', 'Sunan Ibnu Majah', 'سنن ابن ماجه', 'Sunan Ibn Majah', 'Imam Ibnu Majah', 'fawazahmed0/hadith-api (Unlicense)'],
  ['malik', 'hadith_malik.sql', 'Muwaththa\' Malik', 'موطأ مالك', 'Muwatta Malik', 'Imam Malik', 'fawazahmed0/hadith-api (Unlicense)'],
  ['ahmad', 'hadith_ahmad.sql', 'Musnad Ahmad', 'مسند أحمد', 'Musnad Ahmad', 'Imam Ahmad bin Hanbal', 'gadingnst/hadith-api (MIT)'],
  ['darimi', 'hadith_darimi.sql', 'Sunan Ad-Darimi', 'سنن الدارمي', 'Sunan ad-Darimi', 'Imam Ad-Darimi', 'gadingnst/hadith-api (MIT)'],
  ['nawawi', 'hadith_nawawi.sql', 'Arba\'in An-Nawawi', 'الأربعون النووية', 'Forty Hadith of an-Nawawi', 'Imam An-Nawawi', 'fawazahmed0/hadith-api (Unlicense)'],
  ['qudsi', 'hadith_qudsi.sql', 'Hadits Qudsi', 'الأحاديث القدسية', 'Forty Hadith Qudsi', '—', 'fawazahmed0/hadith-api (Unlicense)'],
  ['dehlawi', 'hadith_dehlawi.sql', 'Arba\'in Ad-Dehlawi', 'الأربعون للدهلوي', 'Forty Hadith of Shah Waliullah', 'Syah Waliyullah Ad-Dehlawi', 'fawazahmed0/hadith-api (Unlicense)'],
];
const LANG = { Bengali: 'ben', English: 'eng', French: 'fra', Indonesian: 'ind', Russian: 'rus', Tamil: 'tam', Turkish: 'tur', Urdu: 'urd' };

/** Pengurai baris INSERT … VALUES (…),(…); dengan string bergaya SQL ('' = '). */
function parseInserts(sql) {
  const rows = [];
  const re = /INSERT OR (?:IGNORE|REPLACE) INTO hadits \(([^)]*)\) VALUES/g;
  let m;
  while ((m = re.exec(sql))) {
    const cols = m[1].split(',').map((x) => x.trim());
    let i = re.lastIndex;
    for (;;) {
      while (/\s/.test(sql[i])) i += 1;
      if (sql[i] !== '(') break;
      i += 1;
      const vals = [];
      for (;;) {
        while (/\s/.test(sql[i])) i += 1;
        if (sql[i] === "'") {
          let s = '';
          i += 1;
          for (;;) {
            if (sql[i] === "'" && sql[i + 1] === "'") { s += "'"; i += 2; continue; }
            if (sql[i] === "'") { i += 1; break; }
            s += sql[i]; i += 1;
          }
          vals.push(s);
        } else {
          let t = '';
          while (sql[i] !== ',' && sql[i] !== ')') { t += sql[i]; i += 1; }
          t = t.trim();
          vals.push(t === 'NULL' ? null : Number(t));
        }
        while (/\s/.test(sql[i])) i += 1;
        if (sql[i] === ',') { i += 1; continue; }
        if (sql[i] === ')') { i += 1; break; }
        throw new Error(`SQL tak terduga di ${i}: ${sql.slice(i, i + 40)}`);
      }
      rows.push(Object.fromEntries(cols.map((c, k) => [c, vals[k]])));
      while (/\s/.test(sql[i])) i += 1;
      if (sql[i] === ',') { i += 1; continue; }
      break;
    }
    re.lastIndex = i;
  }
  return rows;
}

const info = JSON.parse(readFileSync(infoPath, 'utf8'));
const editions = JSON.parse(readFileSync(editionsPath, 'utf8'));
const outDir = join(root, 'worker', 'public', 'hadith');
rmSync(outDir, { recursive: true, force: true });
const meta = [];
let total = 0;
for (const [key, file, nameId, nameAr, nameEn, author, source] of KITAB) {
  const rows = parseInserts(readFileSync(join(seedDir, file), 'utf8')).filter((r) => r.collection === key && r.text_ar && Number.isInteger(r.hadith_number));
  const byNum = new Map();
  for (const r of rows) if (!byNum.has(r.hadith_number)) byNum.set(r.hadith_number, r);
  const nums = [...byNum.keys()].sort((a, b) => a - b);
  const inf = info[key];
  const ref = new Map((inf?.hadiths ?? []).map((h) => [h.hadithnumber, h]));
  const sections = inf ? Object.entries(inf.metadata.sections).filter(([k, v]) => Number(k) > 0 && v).map(([k, v]) => { const d = inf.metadata.section_details[k]; return [Number(k), v, d?.hadithnumber_first ?? 0, d?.hadithnumber_last ?? 0]; }) : [];
  // terjemahan lain per bahasa (selain ind/eng yang ikut data seed): nama edisi pertama per bahasa
  const langs = {};
  for (const e of editions[key]?.collection ?? []) { const code = LANG[e.language]; if (code && !langs[code]) langs[code] = e.name; }
  mkdirSync(join(outDir, key), { recursive: true });
  for (let c = 0; c * 100 < nums.length; c += 1) {
    const chunk = nums.slice(c * 100, c * 100 + 100).map((n) => {
      const r = byNum.get(n);
      const h = ref.get(n);
      const native = key !== 'nawawi' && key !== 'qudsi' && key !== 'dehlawi'; // tiga kitab ini: text_id berisi Inggris
      const g = h?.grades?.[0] ? `${h.grades[0].grade} (${h.grades[0].name})` : (r.grade || null);
      return { n, ar: r.text_ar, id: native ? r.text_id : null, en: r.text_en ?? (native ? null : r.text_id) ?? null, b: h?.reference?.book ?? null, bh: h?.reference?.hadith ?? null, an: h?.arabicnumber ?? null, g };
    });
    writeFileSync(join(outDir, key, `${c}.json`), JSON.stringify(chunk));
  }
  // nomor hadits dikompres: selisih berurutan, base36, dipisah koma
  const deltas = nums.map((n, i) => (i ? n - nums[i - 1] : n).toString(36)).join(',');
  meta.push({ key, nameId, nameAr, nameEn, author, source, count: nums.length, langs, sections, nums: deltas });
  total += nums.length;
  console.log(`${key}: ${nums.length} hadits, ${sections.length} kitab/bab, bahasa ${Object.keys(langs).join(' ')}`);
}
const js = `/**
 * Katalog NFT Hadits — DIHASILKAN oleh engine/bin/build-hadith.mjs (dataset fawazahmed0/hadith-api
 * Unlicense & gadingnst/hadith-api MIT). Jangan diedit tangan. Teks hadits ada di worker/public/hadith/<kitab>/<blok>.json.
 * sections: [nomor kitab/bab, nama (EN), nomor hadits pertama, terakhir]; nums: selisih nomor hadits (base36).
 */
export const HADITH_KITAB = ${JSON.stringify(meta)};
export const TOTAL_HADITH = ${total};
`;
writeFileSync(join(root, 'engine', 'src', 'catalog', 'hadith-meta.js'), js);
console.log(`total ${total} hadits`);
