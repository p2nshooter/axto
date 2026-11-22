/**
 * Panggilan ke vault tersembunyi (repo privat coinaxto, worker "axto-vault": tanpa route, workers_dev=false).
 * Jalur satu-satunya: Service Binding. Tiap pesan ditandatangani HMAC-SHA256(VAULT_HMAC_KEY, `${method}.${ts}.${body}`)
 * dan vault hanya menerima metode dalam daftar izinnya.
 */
const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

export async function vault(env, method, payload) {
  const ts = Date.now();
  const body = JSON.stringify(payload ?? {});
  const k = await crypto.subtle.importKey('raw', enc.encode(env.VAULT_HMAC_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = hex(await crypto.subtle.sign('HMAC', k, enc.encode(`${method}.${ts}.${body}`)));
  const r = await env.VAULT.call(method, body, ts, mac);
  if (r?.error) throw new Error(`vault ${method}: ${r.error}`);
  return r;
}
