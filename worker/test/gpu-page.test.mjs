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
  assert.match(html, /<li data-id="42"[^>]*class="g" data-g="3"><a href="[^"]*\/nft\/ex-hadith\/42\?v=g"><img src="\/gpu\/ex-hadith\/42\.png\?v=2"/);
  // kode NFT (pemilik 24 Nov 2026): eksklusif koin AXTO = AC-?, karya GPU = AC-G-? (nomor seri lukisan GPU)
  assert.match(html, /<span class="id">AC-G-3<\/span>/);
});

test('halaman publik tidak pernah menyebut penyedia GPU (rahasia perusahaan)', () => {
  const c = 'time', id = 7;
  const meta = metadata(c, id, 'https://axto.io');
  for (const gpuFirst of [true, false]) {
    const html = P.nftPage('id', c, id, meta, meta.attributes, '', { usd: 1, ed: 3, crumbs: [['Beranda', '/id']], related: [], gpuSerial: 5, gpuFirst });
    assert.doesNotMatch(html, /pollinations|workers ai|cloudflare|hugging ?face|ulyah|horde/i);
  }
});

test('player G- Jam & Prangko tidak pernah memuat teks Arab/ayat — teks Arab hanya di koleksi Al-Qur\'an & Hadits', async () => {
  const { gpuPlayer } = await import('../../engine/src/render/gpu-player.js');
  const { dna } = await import('../../engine/src/dna.js');
  const AYAT = { ar: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', surah: 1, ayah: 1 }; // sengaja diberikan: tetap tidak boleh tampil
  for (const c of ['time', 'ex-time', 'stamp', 'ex-stamp']) {
    const html = gpuPlayer(dna(c, 5), metadata(c, 5, 'https://axto.io'), AYAT, { img: `/gpu/${c}/5.png?v=b`, video: `/gpu/${c}/5.mp4`, g: 1, ref: 'x' });
    assert.doesNotMatch(html, /[؀-ۿ]/, `${c}: tidak boleh ada huruf Arab`);
    assert.doesNotMatch(html, /id="ar"|Amiri/, c);
  }
  const jam = gpuPlayer(dna('time', 5), metadata('time', 5, 'https://axto.io'), {}, { img: '/gpu/time/5.png?v=2', video: '/gpu/time/5.mp4?v=2', g: 1, qa: { v: 2 } });
  assert.match(jam, /<video id="v" src="\/gpu\/time\/5\.mp4\?v=2" poster="\/gpu\/time\/5\.png\?v=2" autoplay muted loop playsinline/, 'animasi = video buatan GPU');
  assert.doesNotMatch(jam, /@keyframes|requestAnimationFrame|animation:/, 'tanpa animasi tiruan di peramban (100% GPU)');
  // interaktif (pemilik 24 Nov 2026: „animasi yg interaktif"): miring 3D, geser = putar maju/mundur bingkai GPU, ketuk = jeda
  assert.match(jam, /perspective:1100px/);
  assert.match(jam, /V\.currentTime=Math\.min/, 'geser memutar video GPU');
  assert.match(jam, /deviceorientation/);
  assert.match(jam, /requestFullscreen/);
  // pemilik 24 Nov 2026: „Hapus aja jgn ada label, biar bersih" — tanpa lencana kode & teks petunjuk di atas karya
  assert.doesNotMatch(jam, /class="g"|class="ht"|>G-1<|>OS-G/);
  assert.match(jam, /aria-label="[^"]*Geser untuk memutar/, 'petunjuk hanya untuk pembaca layar');
  // Qur'an/hadits: teks ASLI hanya bila panel kosong lukisan sudah diukur; diletakkan di panel itu, tanpa kotak tempelan
  const PANEL = { v: 2, panel: [0.3, 0.32, 0.7, 0.68], nada: 'terang' };
  for (const c of ['hadith', 'ex-quran']) {
    const h = gpuPlayer(dna(c, 5), metadata(c, 5, 'https://axto.io'), AYAT, { img: 'x', video: 'v', g: 1, ref: 'r', qa: PANEL });
    assert.match(h, /بِسْمِ/, c);
    assert.match(h, /data-p="0\.3,0\.32,0\.7,0\.68"/, c);
    assert.doesNotMatch(h, /background:rgba\(10,12,24/, 'tanpa kotak gelap tempelan');
  }
  // karya G- lama (pemilik 24 Nov 2026: „kembalikan ke gambar aslinya tanpa animasi"): gambar asli saja, tanpa video/skrip/tempelan
  const { gpuGambar } = await import('../../engine/src/render/gpu-player.js');
  const lama = gpuGambar(metadata('quran', 5, 'https://axto.io'), { img: '/gpu/quran/5.png?v=2', g: 7 });
  assert.match(lama, /<img src="\/gpu\/quran\/5\.png\?v=2"/);
  assert.doesNotMatch(lama, /<video|<script|id="ar"|@keyframes|animation:/);
  assert.doesNotMatch(lama, /class="g"|>G-7</, 'tanpa lencana di atas gambar');
  assert.doesNotMatch(gpuPlayer(dna('quran', 5), metadata('quran', 5, 'https://axto.io'), AYAT, { img: 'x', video: 'v', g: 1, ref: 'r', qa: { v: 2 } }), /id="ar"/, 'tanpa panel terukur, teks tidak ditempel asal');
});
