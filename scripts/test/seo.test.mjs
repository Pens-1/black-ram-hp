// 構造化データ（src/data/jsonld.ts）のテスト。npm test で実行（Node の型除去で .ts をそのまま読む）
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { musicAlbumsLd, musicEventsLd, musicGroupLd, productsLd, toJsonLd, webSiteLd } from '../../src/data/jsonld.ts';

const SITE = 'https://blackram-music.com';
const links = { instagram: 'https://i/', x: 'https://x/', tiktok: 'https://t/', tunecore: 'https://c/' };
const live = (o) => ({
  date: '2026-10-20', endsAt: '2026-10-21T00:00:00+09:00', venue: 'ODYSSEY', title: 'VOLTAGE',
  open: '17:30', start: '18:00', price: '', acts: ['BLACK RAM', 'Skade'], ticket: '', ...o,
});

test('空データで壊れない', () => {
  assert.deepEqual(musicAlbumsLd(SITE, []), []);
  assert.deepEqual(musicEventsLd(SITE, []), []);
  assert.deepEqual(productsLd(SITE, []), []);
  assert.deepEqual(musicEventsLd(SITE, [live({ date: null, endsAt: null })]), []);
  assert.deepEqual(productsLd(SITE, [{ name: '', price: '', href: '', soldOut: false }]), []);
  assert.equal(musicGroupLd(SITE, links).sameAs.length, 4);
  assert.equal(webSiteLd(SITE).url, `${SITE}/`);
  assert.equal(JSON.parse(toJsonLd(musicAlbumsLd(SITE, [{ title: 'x' }])))[0]?.name ?? 'x', 'x');
});

test('過去のライブと日付なしは出さない。今後は出す', () => {
  const now = new Date('2026-10-20T12:00:00+09:00');
  const out = musicEventsLd(
    SITE,
    [live({}), live({ date: '2026-10-19', endsAt: '2026-10-20T00:00:00+09:00', venue: 'PAST' }), live({ date: null, endsAt: null, venue: 'NODATE' })],
    now,
  );
  assert.deepEqual(out.map((e) => e.location.name), ['ODYSSEY']);
  assert.equal(out[0].startDate, '2026-10-20T18:00:00+09:00');
  assert.equal(out[0].offers, undefined);
  assert.equal(out[0].performer[0].name, 'BLACK RAM');
  assert.equal(musicEventsLd(SITE, [live({ ticket: 'https://tix/' })], now)[0].offers.url, 'https://tix/');
});

test('グッズ: 売り切れは SoldOut、そうでなければ InStock。価格がなければ offers なし', () => {
  const [a, b, c] = productsLd(SITE, [
    { name: 'T', price: '¥3,500', href: '', soldOut: true, photo: '/img/goods/a' },
    { name: 'U', price: '2000', href: 'https://buy/', soldOut: false },
    { name: 'CD', price: '', href: '', soldOut: false },
  ]);
  assert.equal(a.offers.availability, 'https://schema.org/SoldOut');
  assert.equal(a.offers.price, '3500');
  assert.equal(a.offers.priceCurrency, 'JPY');
  assert.equal(a.image, `${SITE}/img/goods/a.webp`);
  assert.equal(b.offers.availability, 'https://schema.org/InStock');
  assert.equal(c.offers, undefined);
});

test('曲: 発売日が不正なら datePublished を出さない。url は linkco.re', () => {
  const [a, b] = musicAlbumsLd(SITE, [
    { title: 'A', kind: 'EP', release: '2026-05-01', href: 'https://linkco.re/x', cover: '/img/music/a' },
    { title: 'B', release: 'まだ' },
  ]);
  assert.equal(a.datePublished, '2026-05-01');
  assert.equal(a.url, 'https://linkco.re/x');
  assert.equal(b.datePublished, undefined);
});

test('JSON-LD は </script> を壊す文字をエスケープし、戻すと元のデータ', () => {
  const data = { name: '</script><script>alert(1)</script> & \u2028' };
  const s = toJsonLd(data);
  assert.ok(!/[<>&\u2028]/.test(s));
  assert.deepEqual(JSON.parse(s), data);
});
