/** Penyedia data Al-Qur'an dari berkas (Node/QA). Worker memakai penyedia berbasis ASSETS. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../worker/public/quran/', import.meta.url));
const cache = new Map();
async function json(path) {
  if (!cache.has(path)) cache.set(path, JSON.parse(await readFile(ROOT + path, 'utf8')));
  return cache.get(path);
}
export const fsProvider = {
  async ayah(s, a) {
    const j = await json(`s/${s}.json`);
    const v = j.ayat[a - 1];
    if (!v || v.a !== a) throw new Error(`ayat ${s}:${a} tidak ditemukan`);
    return { ar: v.ar, tr: v.tr, lt: v.lt };
  },
  async page(p) { return json(`h/${p}.json`); },
  // #49: hadits dari aset statis (worker/public/hadith/<kitab>/<blok>.json)
  async hadith(k, n) {
    const { indexOfNumber } = await import('./catalog/hadith.js');
    const i = indexOfNumber(k, n);
    if (i < 0) throw new Error(`hadits ${k}:${n} tidak ditemukan`);
    const arr = JSON.parse(await readFile(fileURLToPath(new URL(`../../worker/public/hadith/${k}/${Math.floor(i / 100)}.json`, import.meta.url)), 'utf8'));
    return arr[i % 100];
  },
};
