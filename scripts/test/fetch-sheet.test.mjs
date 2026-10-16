// スプレッドシート読み込み（scripts/fetch-sheet.mjs）のテスト。npm test で実行
// fixtures/ の CSV には不正な行（必須列が空・日付の形が違う・ありえない日付）と「メモ」列を混ぜてある
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { main, parseCsv, parseDate, readSheet, spotifyAlbumId, driveId } from '../fetch-sheet.mjs';

const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url));
const csv = (name) => readFileSync(join(fixtures, `${name}.csv`), 'utf8');
const quiet = () => {};

test('CSV: 引用符・"" のエスケープ・セル内改行', () => {
  assert.deepEqual(parseCsv('"a","b ""c""\n改行"\r\n"1",2'), [['a', 'b "c"\n改行'], ['1', '2']]);
});

test('日付: YYYY-MM-DD と M/D だけ通す', () => {
  assert.deepEqual(parseDate('2026-10-20'), { year: 2026, month: 10, day: 20 });
  assert.deepEqual(parseDate('6/22'), { year: null, month: 6, day: 22 });
  for (const bad of ['2026/10/20', '2026-2-3', '2026-02-30', '13/1', '来月']) assert.equal(parseDate(bad), null, bad);
});

test('ライブ: 不正な行を飛ばし、行番号と理由を残す。列の並べ替えに強い', async () => {
  const { items, skipped } = await readSheet('ライブ', csv('ライブ'), quiet);
  assert.deepEqual(items.map((l) => l.venue), ['ODYSSEY', 'GATTACA', 'FANDANGO']);
  assert.deepEqual(skipped, [
    '4行目: 会場が空',
    '5行目: 日付が空',
    '6行目: 日付「2026/11/03」が 2026-10-20 か 6/22 の形ではない',
    '7行目: 日付「2026-02-30」が 2026-10-20 か 6/22 の形ではない',
  ]);
  const [odyssey, gattaca, fandango] = items;
  assert.deepEqual(odyssey.acts, ['A', 'BLACK RAM', 'B']);
  assert.equal(odyssey.actTime, '19:10');
  assert.equal(odyssey.ticket, 'https://example.com/t');
  assert.ok(!JSON.stringify(items).includes('出ない'), 'メモ列は出さない');
  assert.deepEqual(gattaca.flyer, { src: '/img/live/0622-gattaca', w: 1200, h: 1600, small: true });
  assert.equal(fandango.ticket, '', 'URL でないリンクは捨てる');
  assert.equal(fandango.flyer, null, 'ない画像は画像なしで続行');
});

test('曲: 作品名が空・発売日の形が違う行を飛ばす。Spotify の ID とサービス', async () => {
  const { items, skipped } = await readSheet('曲', csv('曲'), quiet);
  assert.deepEqual(items.map((s) => s.title), ['OLD', 'NEW']);
  assert.deepEqual(skipped, ['3行目: 作品名が空', '4行目: 発売日「来月」が 2026-10-20 か 6/22 の形ではない']);
  assert.equal(items[0].spotify, '7cgggJee3zl2h7IODPjS9p');
  assert.deepEqual(items[1].services, [{ name: 'Apple Music', href: 'https://music.apple.com/x' }]);
  assert.equal(items[1].href, 'https://linkco.re/x');
});

test('グッズ: 商品名が空を飛ばす。売り切れ判定', async () => {
  const { items, skipped } = await readSheet('グッズ', csv('グッズ'), quiet);
  assert.deepEqual(items.map((g) => [g.name, g.soldOut]), [['Tシャツ', false], ['CD', true], ['ステッカー', false]]);
  assert.deepEqual(skipped, ['4行目: 商品名が空']);
  assert.ok(!JSON.stringify(items).includes('秘密'));
});

test('見出しが合わないシート（取り違え）は例外 → 前回の JSON を使う', async () => {
  await assert.rejects(readSheet('ライブ', '"BLACK RAM HP 更新用シート"\n"説明"', quiet), /見出し「日付」「会場」がない/);
});

test('URL から ID を取り出す', () => {
  assert.equal(spotifyAlbumId('https://open.spotify.com/album/6mcCk4SAouwsYp4cj9z692'), '6mcCk4SAouwsYp4cj9z692');
  assert.equal(spotifyAlbumId('https://open.spotify.com/track/6mcCk4SAouwsYp4cj9z692'), null);
  assert.equal(driveId('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view?usp=sharing'), '1AbCdEfGhIjKlMnOpQrStUvWxYz012345');
  assert.equal(driveId('https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz012345'), '1AbCdEfGhIjKlMnOpQrStUvWxYz012345');
  assert.equal(driveId('https://example.com/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345'), null);
});

test('main: ローカルの CSV から JSON を書き出し、飛ばした行をログに出す', async () => {
  const out = mkdtempSync(join(tmpdir(), 'sheet-test-'));
  process.env.SHEET_CSV_DIR = fixtures;
  process.env.SHEET_OUT_DIR = out;
  const logs = [];
  try {
    assert.equal(await main({ log: (m) => logs.push(m) }), 0);
    assert.equal(JSON.parse(readFileSync(join(out, 'lives.json'), 'utf8')).length, 3);
    assert.ok(logs.some((m) => m.includes('ライブ 6行目: 日付「2026/11/03」') && m.includes('飛ばした')));
  } finally {
    delete process.env.SHEET_CSV_DIR;
    delete process.env.SHEET_OUT_DIR;
    rmSync(out, { recursive: true, force: true });
  }
});
