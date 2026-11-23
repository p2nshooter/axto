/**
 * Saluran privat axto.io → R2 (pemilik, 23 Nov 2026: „rapikan kembali blueprint … jgn di expose … jgn sampe bocor di
 * github, yg penting2 masukan ke R2" · alamat buyback/setelmen jangan publik).
 *
 * Repo publik hanya memuat SANDI (berkas private/*.enc). Kuncinya:
 *   - pasangan kunci RSA-4096 dibuat SEKALI oleh workflow; kunci privat disegel AES-256-GCM (kunci diturunkan dari
 *     secret CLOUDFLARE_API_KEY) di bucket privat vault `axto-vault-data/bundle-key.enc`, tidak pernah ke repo/log;
 *   - kunci publik (bukan rahasia) di `axto-nft-data/cfg/bundle-pub.pem` + dicetak di log, dipakai menyegel berkas
 *     (ops/seal-private.mjs) sebelum di-commit.
 * Workflow membuka setiap private/<nama>.enc dan menaruh isinya di `axto-nft-data/private/<nama>` (bucket privat;
 * worker membacanya untuk Portal admin). Isi terbuka tidak pernah dicetak.
 */
import { readFileSync, writeFileSync, readdirSync, mkdtempSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmac, createCipheriv, createDecipheriv, randomBytes, generateKeyPairSync, privateDecrypt, constants } from 'node:crypto';

const tmp = mkdtempSync(join(tmpdir(), 'axto-priv-'));
function r2get(k) {
  const f = join(tmp, 'g');
  try { execFileSync('npx', ['--yes', 'wrangler@4.156.1', 'r2', 'object', 'get', k, '--file', f, '--remote'], { stdio: 'pipe' }); return readFileSync(f, 'utf8'); } catch { return null; }
}
function r2put(k, text, type) {
  const f = join(tmp, 'p');
  writeFileSync(f, text);
  execFileSync('npx', ['--yes', 'wrangler@4.156.1', 'r2', 'object', 'put', k, '--file', f, '--content-type', type, '--remote'], { stdio: 'pipe' });
}
const encKey = () => createHmac('sha256', process.env.CLOUDFLARE_API_KEY).update('axto:BUNDLE_KEY').digest();
function seal(text) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', encKey(), iv);
  const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') });
}
function unseal(s) {
  const j = JSON.parse(s);
  const d = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(j.iv, 'base64'));
  d.setAuthTag(Buffer.from(j.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(j.ct, 'base64')), d.final()]).toString('utf8');
}
/** Berkas tersegel: AES-256-GCM untuk isi, kuncinya dibungkus RSA-OAEP-256. */
export function openBundle(json, privPem) {
  const j = JSON.parse(json);
  const key = privateDecrypt({ key: privPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(j.ek, 'base64'));
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(j.iv, 'base64'));
  d.setAuthTag(Buffer.from(j.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(j.ct, 'base64')), d.final()]);
}

if (process.argv[1] && /private-bundle\.mjs$/.test(process.argv[1])) {
  if (!process.env.CLOUDFLARE_API_KEY) throw new Error('CLOUDFLARE_API_KEY wajib');
  const summary = (s) => process.env.GITHUB_STEP_SUMMARY && writeFileSync(process.env.GITHUB_STEP_SUMMARY, `${s}\n`, { flag: 'a' });
  let priv;
  const sealed = r2get('axto-vault-data/bundle-key.enc');
  if (sealed) priv = unseal(sealed);
  else {
    const kp = generateKeyPairSync('rsa', { modulusLength: 4096, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
    priv = kp.privateKey;
    r2put('axto-vault-data/bundle-key.enc', seal(priv), 'application/json');
    r2put('axto-nft-data/cfg/bundle-pub.pem', kp.publicKey, 'application/x-pem-file');
    console.log('Pasangan kunci saluran privat dibuat (kunci privat tersegel di vault).');
  }
  const pub = r2get('axto-nft-data/cfg/bundle-pub.pem');
  console.log('KUNCI PUBLIK saluran privat (bukan rahasia; untuk ops/seal-private.mjs):');
  console.log(pub);
  summary(`## Saluran privat\n\nKunci publik tersedia di log (bukan rahasia).`);
  const dir = new URL('../private/', import.meta.url);
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.enc')) : [];
  for (const f of files) {
    const name = f.slice(0, -4);
    if (!/^[a-z0-9][a-z0-9._-]{0,80}$/.test(name)) { console.log(`lewati nama tidak sah: ${f}`); continue; }
    const plain = openBundle(readFileSync(new URL(f, dir), 'utf8'), priv);
    const type = name.endsWith('.json') ? 'application/json' : name.endsWith('.md') ? 'text/markdown; charset=utf-8' : 'application/octet-stream';
    if (type === 'application/json') JSON.parse(plain.toString('utf8')); // harus JSON sah
    r2put(`axto-nft-data/private/${name}`, plain.toString('utf8'), type);
    console.log(`✓ private/${name} → R2 (${plain.length} bita)`);
    summary(`- private/${name} → R2 ✅`);
  }
}
