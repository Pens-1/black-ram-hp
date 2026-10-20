// SEO の設定を1か所に集める。astro.config.mjs・robots.txt・Base.astro・site.ts がここを読む。
// 純粋な定数だけ（JSON や Astro を import しない）。テストからも読める。

/** 正式ドメイン（www は apex に 301。public/_redirects） */
export const SITE_URL = 'https://blackram-music.com';

/**
 * 検索エンジンに載せないか。デモ公開中は true。
 * true の間: 全ページの `<meta name="robots" content="noindex, nofollow">`、robots.txt の `Disallow: /`、
 * 全レスポンスの `X-Robots-Tag: noindex, nofollow`（ビルドで dist/_headers に出る）。
 * 本公開するときは false にするだけ（docs/seo.md）
 */
export const NOINDEX = true;
