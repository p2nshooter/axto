/**
 * AdSense axto.io — 5 akun (pemilik, 24 Nov 2026: „setiap domain pasang 5 kode adsense ini aja + bikinin tag meta nya, hapus kode
 * adsense yg lain, pastikan sampai live" — akun ke-5 pub-5092800160376210). Sebelumnya 4 akun (pemilik, 22 Nov 2026: „sisakan 3 adsense saja … jg ke axto.io", lalu „Tamabahin kode adsense
 * ini di semua web google.com, pub-6701063918838796" dan „Hapus yg tadi adsense tumpuk yg belum sempet d hapus, sisakan 4 kode adsense").
 * Satu loader per halaman (akun utama axto.io), satu tag meta per akun, lima baris ads.txt (public/ads.txt).
 * Sumber yang sama: adsense-stack.json di repositori ulyah.com (primary["axto.io"]).
 */
export const ADSENSE_PRIMARY = 'ca-pub-5928074389292014';
export const ADSENSE_ACCOUNTS = ['ca-pub-6560360898389273', 'ca-pub-4906992051458194', 'ca-pub-5928074389292014', 'ca-pub-6701063918838796', 'ca-pub-5092800160376210'];

/** Urutan meta: akun utama lebih dulu, lalu sisanya. */
const ORDER = [ADSENSE_PRIMARY, ...ADSENSE_ACCOUNTS.filter((a) => a !== ADSENSE_PRIMARY)];

export const ADSENSE_META = ORDER.map((a) => `<meta name="google-adsense-account" content="${a}">`).join('\n');
export const ADSENSE_LOADER = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PRIMARY}" crossorigin="anonymous"></script>`;
export const ADS_TXT = ADSENSE_ACCOUNTS.map((a) => `google.com, ${a.replace('ca-', '')}, DIRECT, f08c47fec0942fa0`).join('\n') + '\n';

/** Disisipkan ke <head> setiap halaman HTML axto.io. */
export const adsenseHead = () => `${ADSENSE_META}\n${ADSENSE_LOADER}`;
