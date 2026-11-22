/**
 * Member: (1) wallet + tanda tangan SIWE (tanpa gas) = pendaftaran; (2) di dalam portal: email, username, password.
 * Sesi: token acak 256-bit di cookie __Host-axto (HttpOnly, Secure, SameSite=Strict); R2 hanya menyimpan hash-nya.
 * Email dienkripsi AES-256-GCM (DATA_KEY), dicari lewat HMAC; password PBKDF2-SHA256 100.000 iterasi + salt.
 * Nonce SIWE: KV (cache pendek 10 menit, bukan data permanen) + R2 create-once saat dipakai (anti replay).
 */
import { readJSON, putJSON, createOnce, update, appendLog } from './r2.js';
import { recover, personalHash, parseSiwe, siweMessage, checksum, isAddress } from './eth.js';

const enc = new TextEncoder();
const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const randB64u = (n) => b64u(crypto.getRandomValues(new Uint8Array(n)));
export const sha256 = async (s) => b64u(await crypto.subtle.digest('SHA-256', enc.encode(s)));

async function hmac(keyStr, data) {
  const k = await crypto.subtle.importKey('raw', enc.encode(keyStr), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}

async function aesKey(keyStr) {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(`axto-data:${keyStr}`));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encrypt(keyStr, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(keyStr), enc.encode(text));
  return `${b64u(iv)}.${b64u(ct)}`;
}
export async function decrypt(keyStr, blob) {
  const [iv, ct] = blob.split('.');
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64u(iv) }, await aesKey(keyStr), fromB64u(ct)));
}

export async function hashPassword(pw, saltB64 = randB64u(16), iterations = 100_000) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64u(saltB64), iterations }, k, 256);
  return `pbkdf2$${iterations}$${saltB64}$${b64u(bits)}`;
}
export async function checkPassword(pw, stored) {
  const [, it, salt, want] = stored.split('$');
  const got = (await hashPassword(pw, salt, Number(it))).split('$')[3];
  if (got.length !== want.length) return false;
  let d = 0;
  for (let i = 0; i < got.length; i += 1) d |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return d === 0;
}

const COOKIE = '__Host-axto';
const SESSION_MS = 7 * 86_400_000;

export function sessionToken(request) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([A-Za-z0-9_-]{43})`).exec(request.headers.get('cookie') ?? '');
  return m ? m[1] : null;
}

/** Sesi aktif → {wallet, admin}. */
export async function session(request, env) {
  const tok = sessionToken(request);
  if (!tok) return null;
  const s = await readJSON(env.STORE, `s/${await sha256(tok)}.json`);
  if (!s || s.exp < Date.now()) return null;
  return { wallet: s.wallet, admin: s.wallet.toLowerCase() === String(env.ADMIN_WALLET).toLowerCase(), tok };
}

/** Langkah 1: nonce + pesan SIWE untuk ditandatangani. */
export async function siweStart(env, address, lang) {
  if (!isAddress(address)) throw new Error('address');
  const nonce = randB64u(12).replace(/[-_]/g, 'x');
  const issuedAt = new Date().toISOString();
  const statement = lang === 'id' ? 'Masuk ke AXTO. Tanda tangan ini tidak memakai gas dan tidak memindahkan dana.' : 'Sign in to AXTO. This signature costs no gas and moves no funds.';
  const message = siweMessage({ domain: new URL(env.BASE_URL).host, address: checksum(address), uri: env.BASE_URL, chainId: Number(env.CHAIN_ID), nonce, issuedAt, statement });
  await env.CACHE.put(`siwe:${nonce}`, address.toLowerCase(), { expirationTtl: 600 });
  return { message, nonce };
}

/** Langkah 2: verifikasi tanda tangan → sesi + akun member (dibuat saat pertama). */
export async function siweFinish(env, { message, signature }) {
  const f = parseSiwe(String(message));
  const host = new URL(env.BASE_URL).host;
  if (f.domain !== host || f.uri !== env.BASE_URL || Number(f.chainId) !== Number(env.CHAIN_ID)) throw new Error('siwe_domain');
  const expect = await env.CACHE.get(`siwe:${f.nonce}`);
  if (!expect || expect !== String(f.address).toLowerCase()) throw new Error('siwe_nonce');
  if (Date.now() - Date.parse(f.issuedAt) > 600_000) throw new Error('siwe_expired');
  const signer = recover(personalHash(message), signature);
  if (signer.toLowerCase() !== expect) throw new Error('siwe_signature');
  if (!(await createOnce(env.STORE, `n/siwe/${f.nonce}.json`, { at: Date.now() }))) throw new Error('siwe_replay');
  await env.CACHE.delete(`siwe:${f.nonce}`);
  const wallet = checksum(signer);
  await createOnce(env.STORE, `u/w/${wallet.toLowerCase()}.json`, { wallet, since: Date.now(), username: null, emailEnc: null, emailIdx: null, pw: null, totp: null });
  const tok = randB64u(32);
  await putJSON(env.STORE, `s/${await sha256(tok)}.json`, { wallet, exp: Date.now() + SESSION_MS });
  await appendLog(env.STORE, 'auth', { wallet, ev: 'login' });
  return { wallet, cookie: `${COOKIE}=${tok}; Path=/; Max-Age=${SESSION_MS / 1000}; HttpOnly; Secure; SameSite=Strict` };
}

export async function logout(env, s) {
  if (s?.tok) await env.STORE.delete(`s/${await sha256(s.tok)}.json`);
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

const USER_RE = /^[a-z0-9_]{3,24}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;

/** Profil: username (unik), email (unik, terenkripsi), password. */
export async function saveProfile(env, wallet, { username, email, password }) {
  const B = env.STORE;
  const key = `u/w/${wallet.toLowerCase()}.json`;
  const cur = await readJSON(B, key);
  if (!cur) throw new Error('no_member');
  const patch = {};
  if (username !== undefined) {
    const u = String(username).toLowerCase();
    if (!USER_RE.test(u)) throw new Error('username_format');
    if (u !== cur.username) {
      if (!(await createOnce(B, `u/name/${u}.json`, { wallet }))) {
        const owner = await readJSON(B, `u/name/${u}.json`);
        if (owner?.wallet !== wallet) throw new Error('username_taken');
      }
      if (cur.username) await B.delete(`u/name/${cur.username}.json`);
      patch.username = u;
    }
  }
  if (email !== undefined) {
    const e = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(e)) throw new Error('email_format');
    const idx = await hmac(env.DATA_KEY, `email:${e}`);
    if (idx !== cur.emailIdx) {
      if (!(await createOnce(B, `u/email/${idx}.json`, { wallet }))) {
        const owner = await readJSON(B, `u/email/${idx}.json`);
        if (owner?.wallet !== wallet) throw new Error('email_taken');
      }
      if (cur.emailIdx) await B.delete(`u/email/${cur.emailIdx}.json`);
      patch.emailIdx = idx;
      patch.emailEnc = await encrypt(env.DATA_KEY, e);
      patch.emailVerified = false;
    }
  }
  if (password !== undefined) {
    const p = String(password);
    if (p.length < 10 || p.length > 200) throw new Error('password_length');
    patch.pw = await hashPassword(p);
  }
  const next = await update(B, key, (v) => ({ ...v, ...patch, updated: Date.now() }));
  await appendLog(B, 'profile', { wallet, fields: Object.keys(patch) });
  return publicProfile(env, next);
}

export async function publicProfile(env, u) {
  return { wallet: u.wallet, username: u.username, email: u.emailEnc ? await decrypt(env.DATA_KEY, u.emailEnc) : null, emailVerified: Boolean(u.emailVerified), hasPassword: Boolean(u.pw), since: u.since };
}

export const loadMember = (env, wallet) => readJSON(env.STORE, `u/w/${wallet.toLowerCase()}.json`);

/** Rate limit sederhana (KV, jendela 60 detik) — penghitung pendek, bukan data permanen. */
export async function rateLimit(env, key, max) {
  const k = `rl:${key}:${Math.floor(Date.now() / 60_000)}`;
  const n = Number((await env.CACHE.get(k)) ?? 0) + 1;
  if (n > max) return false;
  await env.CACHE.put(k, String(n), { expirationTtl: 120 });
  return true;
}

export { hmac };
