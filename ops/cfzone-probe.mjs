/** Bandingkan pengaturan keamanan zona Cloudflare (hanya nilai pengaturan dicetak). */
const OK = ['yapida.sch.id', 'zuvik.de', 'axto.us', 'crone.skin', 'dawo.es', 'qkb.es'];
const NO = ['axto.dev', 'jenius.es', 'rough.es', 'xko.es', 'zufiq.de', 'jai.lat', 'byoxy.de', 'qurm.de', 'zavik.de', 'pab.lat', 'saved.lat', 'xdaily.xyz', 'oldco.in', 'ascan.es', 'velnixo.de'];
const H = { 'X-Auth-Email': process.env.CLOUDFLARE_EMAIL, 'X-Auth-Key': process.env.CLOUDFLARE_API_KEY, 'content-type': 'application/json' };
const api = async (p) => (await fetch(`https://api.cloudflare.com/client/v4${p}`, { headers: H })).json();
const zones = [];
for (let page = 1; page < 10; page += 1) { const j = await api(`/zones?per_page=50&page=${page}`); zones.push(...(j.result ?? [])); if ((j.result ?? []).length < 50) break; }
const byName = Object.fromEntries(zones.map((z) => [z.name, z]));
const KEYS = ['security_level', 'browser_check', 'challenge_ttl', 'always_use_https', 'ssl', 'min_tls_version', 'waf'];
for (const d of [...OK, ...NO]) {
  const z = byName[d];
  if (!z) { console.log(`${OK.includes(d) ? 'OK ' : 'NO '} ${d.padEnd(14)} zona TIDAK ADA di akun Cloudflare ini`); continue; }
  const s = Object.fromEntries(((await api(`/zones/${z.id}/settings`)).result ?? []).map((x) => [x.id, x.value]));
  const bm = (await api(`/zones/${z.id}/bot_management`)).result ?? {};
  const rules = (await api(`/zones/${z.id}/rulesets/phases/http_request_firewall_custom/entrypoint`)).result?.rules ?? [];
  const robots = bm.is_robots_txt_managed;
  console.log(`${OK.includes(d) ? 'OK ' : 'NO '} ${d.padEnd(14)} status=${z.status} plan=${z.plan?.name} ${KEYS.map((k) => `${k}=${typeof s[k] === 'object' ? JSON.stringify(s[k]) : s[k]}`).join(' ')} botFight=${bm.fight_mode} aiBots=${bm.ai_bots_protection} crawlerProt=${bm.crawler_protection ?? '-'} robotsManaged=${robots} customRules=${rules.length}${rules.length ? ':' + rules.map((r) => r.action).join('/') : ''}`);
}
