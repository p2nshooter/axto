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
};
