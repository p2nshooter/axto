/**
 * Lebar huruf Arab font AXTO Amiri (em per karakter), DIUKUR di browser dari 6.000 baris ayat & hadits (perintah pemilik #52
 * „banyak yg keluar garis, banyak yg nempel garis"). Harakat & tanda wakaf hampir tanpa lebar (_diac); karakter lain _other.
 * Akurasi baris panjang: p1 0,88 · median 0,99 · p99 1,15 dari lebar sebenarnya → tata letak memberi cadangan 15%
 * dan mengunci panjang baris (textLength) sehingga teks tidak pernah keluar dari kotak.
 */
export const AMIRI_EM = {" ": 0.4011, "ل": 0.2504, "م": 0.3065, "ن": 0.3293, "و": 0.337, "ا": 0.1221, "ي": 0.2327, "ٱ": 0.195, "ه": 0.2679, "ت": 0.2815, "ب": 0.3254, "ك": 0.5191, "ر": 0.3555, "ف": 0.3706, "ع": 0.3444, "أ": 0.2632, "ق": 0.3503, "د": 0.4168, "س": 0.5802, "إ": 0.2021, "ذ": 0.434, "ح": 0.516, "ࣰ": 0.0193, "ء": 0.4021, "ى": 0.3288, "ة": 0.1243, "ج": 0.5861, "خ": 0.5652, "ص": 0.6555, "ش": 0.5356, "ࣱ": 0.1073, "ض": 0.8315, "ث": 0.2898, "ࣲ": 0.136, "ز": 0.3272, "ط": 0.5503, "غ": 0.3489, "ئ": 0.2595, "ظ": 0.5314, "ؤ": 0.4123, "ـ": 0.2713, "۞": 0.6439, "_other": 0.0, "_diac": 0.0339};
const DIAC = /[\u064B-\u065F\u0670\u06D6-\u06DD\u06DF-\u06E8\u06EA-\u06ED]/g;
/** Lebar perkiraan (px) teks Arab pada ukuran font fs. */
export function arabicWidth(s, fs) {
  let em = 0;
  const diac = s.match(DIAC);
  for (const ch of s.replace(DIAC, '')) em += AMIRI_EM[ch] ?? AMIRI_EM._other;
  return (em + (diac ? diac.length : 0) * AMIRI_EM._diac) * fs;
}
