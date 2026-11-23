// Seri G-: kartu, pratinjau, dan halaman karya menampilkan lukisan GPU yang sama (pemilik, 23 Nov 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/pages.js';
import { metadata } from '../../engine/src/metadata.js';

test('halaman karya dari kartu G- (?v=g): panggung = lukisan GPU, bukan animasi prosedural', () => {
  const c = 'ex-hadith', id = 42;
  const meta = metadata(c, id, 'https://axto.io');
  const info = { stock: { left: 10 }, listings: [], priceCoins: '1', crumbs: [['Beranda', '/id']], gpuSerial: 3, gpuBy: 'pollinations', gpuFirst: true };
  const html = P.nftPage('id', c, id, meta, meta.attributes, '', info);
  const stage = html.slice(html.indexOf('<div class="stage'), html.indexOf('<div class="info">'));
  assert.match(stage, /src="\/gpu\/ex-hadith\/42\.png"/);
  assert.doesNotMatch(stage, /<iframe/);
  assert.match(stage, /G-3/);
  assert.match(stage, /href="\?v=a"/);
  const tanpa = P.nftPage('id', c, id, meta, meta.attributes, '', { ...info, gpuFirst: false });
  assert.match(tanpa.slice(tanpa.indexOf('<div class="stage'), tanpa.indexOf('<div class="info">')), /<iframe src="\/play\/ex-hadith\/42"/);
});

test('kartu seri G- menaut ke versi GPU halaman karya', () => {
  const html = P.collectionPage('id', 'ex-hadith', { produced: 1, from: 1, first: { items: [{ id: 42, tier: 0, name: 'X', gpu: true, g: 3 }], next: null }, crumbs: [['Beranda', '/id']], maker: 'gpu', gpuCount: 1 });
  assert.match(html, /<li data-id="42"[^>]*class="g" data-g="3"><a href="[^"]*\/nft\/ex-hadith\/42\?v=g"><img src="\/gpu\/ex-hadith\/42\.png"/);
});
