// Seri G-: kartu, pratinjau, dan halaman karya menampilkan lukisan GPU yang sama (pemilik, 23 Nov 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/pages.js';
import { metadata } from '../../engine/src/metadata.js';

test('halaman karya dari kartu G- (?v=g): panggung = lukisan GPU, bukan animasi prosedural', () => {
  const c = 'ex-hadith', id = 42;
  const meta = metadata(c, id, 'https://axto.io');
  const info = { stock: { left: 10 }, listings: [], priceCoins: '1', crumbs: [['Beranda', '/id']], gpuSerial: 3, gpuFirst: true };
  const html = P.nftPage('id', c, id, meta, meta.attributes, '', info);
  const stage = html.slice(html.indexOf('<div class="stage'), html.indexOf('<div class="info">'));
  assert.match(stage, /<iframe src="\/gplay\/ex-hadith\/42"/, 'player G- hidup dari lukisan yang sama');
  assert.doesNotMatch(stage, /\/play\//);
  assert.match(stage, /G-3/);
  assert.match(stage, /href="\?v=a"/);
  const tanpa = P.nftPage('id', c, id, meta, meta.attributes, '', { ...info, gpuFirst: false });
  assert.match(tanpa.slice(tanpa.indexOf('<div class="stage'), tanpa.indexOf('<div class="info">')), /<iframe src="\/play\/ex-hadith\/42"/);
});

test('kartu seri G- menaut ke versi GPU halaman karya', () => {
  const html = P.collectionPage('id', 'ex-hadith', { produced: 1, from: 1, first: { items: [{ id: 42, tier: 0, name: 'X', gpu: true, g: 3 }], next: null }, crumbs: [['Beranda', '/id']], maker: 'gpu', gpuCount: 1 });
  assert.match(html, /<li data-id="42"[^>]*class="g" data-g="3"><a href="[^"]*\/nft\/ex-hadith\/42\?v=g"><img src="\/gpu\/ex-hadith\/42\.png\?v=b"/);
});

test('halaman publik tidak pernah menyebut penyedia GPU (rahasia perusahaan)', () => {
  const c = 'time', id = 7;
  const meta = metadata(c, id, 'https://axto.io');
  for (const gpuFirst of [true, false]) {
    const html = P.nftPage('id', c, id, meta, meta.attributes, '', { usd: 1, ed: 3, crumbs: [['Beranda', '/id']], related: [], gpuSerial: 5, gpuFirst });
    assert.doesNotMatch(html, /pollinations|workers ai|cloudflare|hugging ?face|ulyah|horde/i);
  }
});
