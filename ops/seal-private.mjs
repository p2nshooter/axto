/** Segel berkas untuk saluran privat: node ops/seal-private.mjs <kunci-publik.pem> <masuk> <private/nama.enc> */
import { readFileSync, writeFileSync } from 'node:fs';
import { createCipheriv, randomBytes, publicEncrypt, constants } from 'node:crypto';
const [pubPath, inPath, outPath] = process.argv.slice(2);
const key = randomBytes(32);
const iv = randomBytes(12);
const c = createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([c.update(readFileSync(inPath)), c.final()]);
const ek = publicEncrypt({ key: readFileSync(pubPath, 'utf8'), padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, key);
writeFileSync(outPath, `${JSON.stringify({ v: 1, alg: 'RSA-OAEP-256+A256GCM', ek: ek.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') })}\n`);
console.log(`tersegel → ${outPath}`);
