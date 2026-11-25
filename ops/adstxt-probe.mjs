/** Diagnosis ads.txt AdSense dari runner: per domain status http (tanpa ikut redirect), https, www, isi, beranda. */
const D = '1fr.fr ascan.es axto.dev axto.io axto.us byodd.de byoxy.de byoy.de crone.skin dai.lat dawa.im dawo.es jai.lat jenius.es lie.skin luaja.com nexvilo.de odaily.xyz oldco.in pab.lat profity.in qarf.de qkb.es qulen.de qurm.de rough.es rough.lat rubiy.de saved.lat tilawa.de ulyah.com velnixo.de xaa.es xad.es xdaily.xyz xko.es xscan.es yapida.sch.id zavik.de zevok.de zoevian.de zolun.de zufiq.de zuvik.de'.split(' ');
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const get = async (url, follow = false) => {
  try {
    const r = await fetch(url, { redirect: follow ? 'follow' : 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(15_000) });
    const t = follow || r.status === 200 ? await r.text() : '';
    return { s: r.status, loc: r.headers.get('location') ?? '', ct: (r.headers.get('content-type') ?? '').split(';')[0], xr: r.headers.get('x-robots-tag') ?? '', t, url: r.url };
  } catch (e) { return { s: e.name === 'TimeoutError' ? 'timeout' : 'net', loc: '', ct: '', xr: '', t: '' }; }
};
for (const d of D) {
  const [h, s, w, home, rb] = await Promise.all([get(`http://${d}/ads.txt`), get(`https://${d}/ads.txt`), get(`https://www.${d}/ads.txt`), get(`https://${d}/`, true), get(`https://${d}/robots.txt`, true)]);
  const pubs = (s.t.match(/pub-\d+/g) ?? []).length;
  const bad = s.t.split('\n').filter((l) => l.trim() && !/^google\.com, pub-\d+, DIRECT, f08c47fec0942fa0$/.test(l.trim())).length;
  const metas = (home.t.match(/name="google-adsense-account"/g) ?? []).length;
  const client = (home.t.match(/adsbygoogle\.js\?client=ca-pub-(\d+)/) ?? [])[1] ?? '-';
  const rbBlock = /User-agent:\s*\*[^]*?Disallow:\s*\/\s*$/m.test(rb.t) ? 'ROBOTS-BLOCK?' : '';
  console.log(`${d.padEnd(14)} http:${h.s}${h.loc ? '→' + h.loc.replace(/^https?:\/\//, '').slice(0, 40) : ''} https:${s.s} ${s.ct} pubs=${pubs} lainBaris=${bad}${s.xr ? ' x-robots=' + s.xr : ''} www:${w.s}${w.loc ? '→' + w.loc.replace(/^https?:\/\//, '').slice(0, 30) : ''} beranda:${home.s} meta=${metas} loader=${client.slice(-4)} ${rbBlock}`);
}
