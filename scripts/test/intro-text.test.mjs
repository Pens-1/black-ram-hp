// ホームの紹介文の材料（src/data/intro-text.ts）のテスト
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { introParts } from '../../src/data/intro-text.ts';

test('曲もライブも無くても壊れない', () => {
  assert.deepEqual(introParts([], null), { latest: null, live: null });
  assert.deepEqual(introParts([{ title: ' ' }], null), { latest: null, live: null });
});

test('最新作は先頭の曲、ライブは月日と会場', () => {
  const p = introParts([{ title: "RAM'S BALL", kind: 'EP' }, { title: 'BABY TANK', kind: 'EP' }], { month: 11, day: 3, venue: 'KYOTO MUSE' });
  assert.deepEqual(p.latest, { kind: 'EP', title: "RAM'S BALL" });
  assert.deepEqual(p.live, { date: '11月3日', venue: 'KYOTO MUSE' });
});

test('種類が無い曲、会場が無いライブ', () => {
  assert.deepEqual(introParts([{ title: 'X' }], null).latest, { kind: '', title: 'X' });
  assert.equal(introParts([], { month: 1, day: 2, venue: '' }).live, null);
});
