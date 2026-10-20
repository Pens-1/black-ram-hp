# SEO / AIO（検索・AI検索）

正式ドメインは https://blackram-music.com（`www` は apex に 301。Cloudflare のリダイレクトルール「WWW からルートにリダイレクト」で設定済み。`_redirects` はホスト名を見られないので使わない）。設定は `src/data/seo-config.ts` の `SITE_URL` と `NOINDEX`。

## noindex の外し方（本公開時）

`src/data/seo-config.ts` の `NOINDEX` を `false` にして再ビルドするだけ。これで全ページの robots meta、`robots.txt` の `Disallow: /`（`Allow: /` に変わる）、`dist/_headers` の `X-Robots-Tag`（出なくなる）が一度に外れる。404 だけは常に noindex。外したあと、Search Console に `sitemap-index.xml` を登録する。`_redirects` の www→apex が効かない場合は、Cloudflare の Bulk Redirects で同じ 301 を作る。

## 出すもの

- `<title>` / description / canonical / OGP / Twitter Card: `src/layouts/Base.astro`（別ページは `Page.astro` 経由）。文言は「BLACK RAM（京都のバンド）」まで。OGP 画像は `public/og.jpg`（1200x630）
- sitemap: `@astrojs/sitemap`（`sitemap-index.xml`）。noindex の間も生成する。robots.txt は `src/pages/robots.txt.ts` が出す（Sitemap 行つき）
- `public/llms.txt`: バンド名・公式URL・SNS・ページ一覧。ページを足したら更新する

## 構造化データ（JSON-LD）の出どころ

生成は `src/data/jsonld.ts`（`JSON.stringify` ＋ `< > &` のエスケープ）。値はシートの JSON（`src/data/sheet/*.json`、`docs/sheet-update.md`）と `site.ts` のリンクだけで、創作しない。

| ページ | 種類 | 出どころ |
|---|---|---|
| トップ | MusicGroup / WebSite | バンド名・SNS（`site.ts` の `links`） |
| トップ | MusicAlbum | シート「曲」（作品名・発売日・ジャケット・linkco.re）。発売日が空なら datePublished なし |
| トップ | MusicEvent | シート「ライブ」の今後のライブだけ（NEXT LIVE と同じ判定）。offers は料金かチケットのリンクがあるときだけ。住所は未確認なので出さない |
| /goods/ | Product | シート「グッズ」。値段が読めるときだけ offers（売り切れ列で SoldOut / InStock） |
