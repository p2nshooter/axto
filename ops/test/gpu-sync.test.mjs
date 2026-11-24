// Seri G- dibuat ulang (pemilik 24 Nov 2026): lukisan hanya dari worker (FLUX.2 + pemeriksa mutu); skrip ini hanya video GPU.
// Tanpa jaringan: R2 tiruan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createCipheriv, publicEncrypt, randomBytes, constants } from 'node:crypto';
import { run, promptFor, GPU_KEYS, candidates, loadKeys, _seal } from '../gpu-sync.mjs';

/** Segel seperti serah-terima ulyah.com (scripts/axto-keys-handoff.mjs): AES-256-GCM, kunci dibungkus RSA-OAEP-256. */
function sealForAxto(text, pub) {
  const k = randomBytes(32);
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', k, iv);
  const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  const ek = publicEncrypt({ key: pub, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, k);
  return JSON.stringify({ v: 1, alg: 'RSA-OAEP-256+A256GCM', ek: ek.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') });
}
import { gerakFor, QA_V } from '../../engine/src/gpu.js';
import { showcaseIds } from '../../engine/src/showcase.js';

const mkIO = () => {
  const files = {};
  const bytes = {};
  return { files, bytes, getText: (k) => files[k] ?? null, putText: (k, v) => { files[k] = v; }, putBytes: (k, b, t) => { bytes[k] = t; }, copy: (a, b, t = 'image/png') => { bytes[b] = `${t} ← ${a}`; } };
};

test('prompt v2: tanpa kata yang dilukis jadi huruf (masterpiece, 8k, no text), simetris & di tengah; Figur Model tidak', () => {
  assert.deepEqual(GPU_KEYS, ['time', 'stamp', 'quran', 'hadith', 'ex-time', 'ex-stamp', 'ex-quran', 'ex-hadith']);
  assert.equal(new Set(candidates('ex-quran')).size, 10_000, 'permutasi lengkap karya eksklusif');
  for (const c of GPU_KEYS) {
    for (const id of candidates(c).slice(0, 5)) {
      const p = promptFor(c, id);
      assert.doesNotMatch(p, /masterpiece|8k|no text|no letters|year \d|digits|nixie|seven-segment|calligraph/i, p);
      assert.match(p, /perfectly symmetrical composition, centered, straight-on front view/);
      assert.match(gerakFor(c, id), /static camera/);
    }
  }
  for (const c of ['quran', 'hadith']) assert.match(promptFor(c, candidates(c)[0]), /plain cream parchment (panel|cartouche) in the exact center/);
  assert.throws(() => promptFor('ex-model', 1));
  assert.throws(() => promptFor('model', 1));
});

test('video GPU dirender axto.io sendiri: kunci serah-terima tersimpan di vault; kuota habis → kunci berikutnya; video → R2 axto & ditandai vid', async () => {
  const io = mkIO();
  const CF = 'cf-test-key';
  // kunci saluran privat axto (pasangan RSA) — privat tersegel di vault, publik dipakai serah-terima ulyah.com
  const kp = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  io.files['axto-vault-data/bundle-key.enc'] = _seal.sealV(kp.privateKey, _seal.hkey(CF, 'axto:BUNDLE_KEY'));
  io.files['ulyah-media/axto-handoff/keys.sealed.json'] = sealForAxto(JSON.stringify({ at: '2026-11-24T16:00:00Z', keys: [
    { id: 1, provider: 'hf-zerogpu', status: 'active', key: 'hf_HABISKUOTA1111' },
    { id: 2, provider: 'hf-inference', status: 'active', key: 'hf_HIDUP22222222' },
    { id: 3, provider: 'nvidia', status: 'active', key: 'nvapi-xxxxxxxxxxxx' },
  ] }), kp.publicKey);
  const [a, b, c2, d] = showcaseIds('time').ids;
  const qa = { v: QA_V, nilai: 9 };
  io.files['axto-nft-data/os/gpu-time.json'] = JSON.stringify({ ids: [a, b, c2, d], serial: { [a]: 1, [b]: 2, [c2]: 3, [d]: 4 }, by: {}, qa: { [a]: qa, [b]: qa, [d]: { v: 1 } }, vid: { [b]: true } });
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const key = init.headers?.Authorization;
    calls.push({ url: String(url), key });
    const ok = (j) => new Response(JSON.stringify(j), { status: 200 });
    if (String(url).endsWith('/call/generate_video') && key === 'Bearer hf_HABISKUOTA1111') return ok({ event_id: 'e1' });
    if (String(url).endsWith('/call/generate_video/e1')) return new Response('event: error\ndata: "You have exceeded your GPU quota (60s requested vs. 0s left)."\n\n');
    if (String(url).endsWith('/call/generate_video') && key === 'Bearer hf_HIDUP22222222') {
      const body = JSON.parse(init.body);
      assert.equal(body.data[0].path, `https://axto.io/gpu/time/${a}.png?v=q${QA_V}`);
      return ok({ event_id: 'e2' });
    }
    if (String(url).endsWith('/call/generate_video/e2')) return new Response(`event: complete\ndata: [{"video":{"url":"https://x.hf.space/file/out.mp4"}}]\n\n`);
    if (String(url) === 'https://x.hf.space/file/out.mp4') return new Response(new Uint8Array(30_000));
    return new Response('', { status: 500 });
  };
  const logs = [];
  const r = await run({ io, fetchImpl, cf: CF, log: (x) => logs.push(x), perMs: 5_000 });
  assert.equal(io.bytes[`axto-nft-data/gpu/time/${a}.mp4`], 'video/mp4');
  assert.deepEqual(JSON.parse(io.files['axto-nft-data/os/gpu-time.json']).vid, { [b]: true, [a]: true });
  assert.equal(r.video.baru, 1);
  assert.equal(r.video.kunci.semua, 3, 'semua kunci aktif ikut (bukan hanya GPU)');
  assert.equal(r.video.kunci.hf, 2);
  assert.equal(r.video.gagal.quota, 1);
  assert.equal(io.bytes[`axto-nft-data/gpu/time/${d}.mp4`], undefined, 'karya tanpa cap mutu terbaru tidak pernah dianimasikan');
  assert.ok(!calls.some((x) => x.url.includes('ulyah')), 'tidak ada panggilan ke ulyah.com');
  assert.ok(!logs.join(' ').includes('hf_') && !logs.join(' ').includes('nvapi'), 'kunci tidak pernah tercetak');
  // kunci tersimpan di vault axto (tersegel), dipakai lagi walau serah-terima hilang
  const vault = JSON.parse(_seal.unsealV(io.files['axto-vault-data/api-keys.enc'], _seal.hkey(CF, 'axto:API_KEYS')));
  assert.equal(vault.keys.length, 3);
  delete io.files['ulyah-media/axto-handoff/keys.sealed.json'];
  assert.equal(loadKeys(io, CF).keys.length, 3);
});

test('gagal tidak pernah menyerah selamanya: 2× gagal → jeda 3 jam → dicoba lagi', async () => {
  const io = mkIO();
  const CF = 'cf-test-key';
  io.files['axto-vault-data/api-keys.enc'] = _seal.sealV(JSON.stringify({ at: 'x', keys: [{ provider: 'hf-zerogpu', key: 'hf_SATU11111111' }] }), _seal.hkey(CF, 'axto:API_KEYS'));
  const [a] = showcaseIds('stamp').ids;
  io.files['axto-nft-data/os/gpu-stamp.json'] = JSON.stringify({ ids: [a], serial: { [a]: 1 }, by: {}, qa: { [a]: { v: QA_V } } });
  const down = async () => new Response('', { status: 503 });
  let t = Date.UTC(2026, 10, 24, 16);
  await run({ io, fetchImpl: down, cf: CF, log: () => {}, now: () => t, perMs: 1000 });
  await run({ io, fetchImpl: down, cf: CF, log: () => {}, now: () => t, perMs: 1000 });
  const st = JSON.parse(io.files['axto-vault-data/gpu-video.json']);
  assert.equal(st.failed[`stamp:${a}:v${QA_V}`].n, 2);
  assert.equal(st.failed[`stamp:${a}:v${QA_V}`].err, 'http_503');
  const r3 = await run({ io, fetchImpl: down, cf: CF, log: () => {}, now: () => t, perMs: 1000 });
  assert.equal(r3.video.antrean, 0, 'jeda');
  t += 3 * 3600_000 + 1;
  const r4 = await run({ io, fetchImpl: down, cf: CF, log: () => {}, now: () => t, perMs: 1000 });
  assert.equal(r4.video.antrean, 1, 'dicoba lagi setelah jeda');
});

test('gambar diunggah ke Space dulu; pesan galat Space dicatat tanpa kunci', async () => {
  const { renderVideo, SPACES } = await import('../gpu-sync.mjs');
  const job = { c: 'time', id: 7, img: 'https://axto.io/gpu/time/7.png?v=q1', prompt: 'p' };
  const seen = [];
  const fetchImpl = async (url, init = {}) => {
    const u = String(url);
    seen.push(u);
    if (u === job.img) return new Response(new Uint8Array(1000), { status: 200 });
    if (u.endsWith('/gradio_api/upload')) { assert.ok(init.body instanceof FormData); return new Response(JSON.stringify(['/tmp/gradio/abc/time-7.png'])); }
    if (u.endsWith('/call/generate_video')) { assert.equal(JSON.parse(init.body).data[0].path, '/tmp/gradio/abc/time-7.png'); return new Response(JSON.stringify({ event_id: 'z' })); }
    if (u.endsWith('/call/generate_video/z')) return new Response('event: error\ndata: "boom hf_RAHASIA123"\n\n');
    return new Response('', { status: 500 });
  };
  const r = await renderVideo(fetchImpl, 'hf_RAHASIA123', SPACES[0], job, 5_000);
  assert.equal(r.err, 'space_error');
  assert.ok(r.msg.includes('boom') && !r.msg.includes('RAHASIA'));
  assert.ok(seen.some((u) => u.endsWith('/gradio_api/upload')));
});
