// SEO の設定を1か所に集める。astro.config.mjs・robots.txt・Base.astro・site.ts がここを読む。
// 純粋な定数だけ（JSON や Astro を import しない）。テストからも読める。

/** 正式ドメイン（www は apex に 301。public/_redirects） */
export const SITE_URL = 'https://blackram-music.com';

/**
 * 検索エンジンに載せないか。本公開（2026-10-20）で false にした。デモ公開中は true。
 * true の間: 全ページの `<meta name="robots" content="noindex, nofollow">`、robots.txt の `Disallow: /`、
 * 全レスポンスの `X-Robots-Tag: noindex, nofollow`（ビルドで dist/_headers に出る）。
 * 本公開するときは false にするだけ（docs/seo.md）
 */
export const NOINDEX = false;

/**
 * Google アナリティクス（GA4）の測定ID。公開してよい値（ページのソースに出る）。
 * 空文字にすると GA を出さない。正式ドメイン以外（localhost・pages.dev）では動かさない（Base.astro）
 */
export const GA_ID = 'G-4671VRL71F';
