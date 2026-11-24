/**
 * R2 Store (aturan pemilik: semua rekaman di R2, jangan pernah D1). Pola dari docs/R2-DATA-BLUEPRINT.md §3 ulyah.com:
 * satu objek JSON per dokumen, tulis-sekali untuk keunikan, compare-and-swap untuk pembaruan, log append-only,
 * tanpa hot key (R2: 1 tulis/detik per kunci).
 */
const JSON_META = { httpMetadata: { contentType: 'application/json' } };

export async function getJSON(bucket, key) {
  const o = await bucket.get(key);
  if (!o) return null;
  return { value: await o.json(), etag: o.etag };
}

export const readJSON = async (bucket, key) => (await getJSON(bucket, key))?.value ?? null;

/** Tulis tanpa syarat (dokumen milik satu penulis, mis. DO). */
export const putJSON = (bucket, key, value, custom) => bucket.put(key, JSON.stringify(value), { ...JSON_META, customMetadata: custom });

/** Tulis-sekali: gagal (false) bila kunci sudah ada — untuk keunikan (username, email, nonce, voucher). */
export async function createOnce(bucket, key, value, custom) {
  const r = await bucket.put(key, JSON.stringify(value), { ...JSON_META, customMetadata: custom, onlyIf: { etagDoesNotMatch: '*' } });
  return r !== null;
}

/** Compare-and-swap: fn(nilaiLama|null) → nilaiBaru; diulang bila ada penulis lain. */
export async function update(bucket, key, fn, tries = 5) {
  for (let i = 0; i < tries; i += 1) {
    const cur = await getJSON(bucket, key);
    const next = await fn(cur?.value ?? null);
    if (next === undefined) return cur?.value ?? null;
    const onlyIf = cur ? { etagMatches: cur.etag } : { etagDoesNotMatch: '*' };
    const r = await bucket.put(key, JSON.stringify(next), { ...JSON_META, onlyIf });
    if (r !== null) return next;
    await new Promise((res) => setTimeout(res, 50 * 2 ** i));
  }
  throw new Error(`cas gagal: ${key}`);
}

/** Compare-and-swap dengan customMetadata (ringkasan untuk daftar prefix). fn boleh melempar error untuk membatalkan. */
export async function casMeta(bucket, key, fn, meta, tries = 6) {
  for (let i = 0; i < tries; i += 1) {
    const cur = await getJSON(bucket, key);
    const next = await fn(cur?.value ?? null);
    if (next === undefined) return cur?.value ?? null;
    const onlyIf = cur ? { etagMatches: cur.etag } : { etagDoesNotMatch: '*' };
    const r = await bucket.put(key, JSON.stringify(next), { ...JSON_META, customMetadata: meta ? meta(next) : undefined, onlyIf });
    if (r !== null) return next;
    await new Promise((res) => setTimeout(res, 40 * 2 ** i));
  }
  throw new Error(`cas gagal: ${key}`);
}

const rand = () => [...crypto.getRandomValues(new Uint8Array(6))].map((x) => x.toString(16).padStart(2, '0')).join('');

/** Log append-only: satu objek per peristiwa, kunci unik berurutan waktu. */
export function appendLog(bucket, stream, event, now = Date.now()) {
  const d = new Date(now).toISOString();
  const key = `log/${stream}/${d.slice(0, 10)}/${d.slice(11, 23).replace(/[:.]/g, '')}-${rand()}.json`;
  return bucket.put(key, JSON.stringify({ at: now, ...event }), JSON_META);
}

/** Daftar kunci dengan prefix (paginasi R2 1000/hal). */
export async function listKeys(bucket, prefix, limit = 1000) {
  const out = [];
  let cursor;
  do {
    const r = await bucket.list({ prefix, cursor, limit: Math.min(1000, limit - out.length), include: ['customMetadata'] });
    out.push(...r.objects);
    cursor = r.truncated ? r.cursor : undefined;
  } while (cursor && out.length < limit);
  return out;
}

/** Cadangan harian: salin dokumen inti ke backup/<tanggal>/, hapus cadangan > 35 hari. */
export async function dailyBackup(bucket, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10);
  let n = 0;
  // koin (saldo, pembelian, pencairan), staking & konfigurasi ikut dicadangkan (aturan pemilik: cadangan harian 35 hari)
  for (const prefix of ['e/', 'r/', 'u/', 'c/', 'coin/', 'stake/', 'cfg/']) {
    for (const o of await listKeys(bucket, prefix, 100_000)) {
      const src = await bucket.get(o.key);
      if (src) { await bucket.put(`backup/${day}/${o.key}`, src.body, JSON_META); n += 1; }
    }
  }
  const cutoff = new Date(now - 35 * 86_400_000).toISOString().slice(0, 10);
  const old = (await bucket.list({ prefix: 'backup/', delimiter: '/' })).delimitedPrefixes ?? [];
  for (const p of old) {
    if (p.slice(7, 17) < cutoff) for (const o of await listKeys(bucket, p, 100_000)) await bucket.delete(o.key);
  }
  return n;
}
