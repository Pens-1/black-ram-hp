# BLACK RAM HP

- 見た目は `DESIGN.md` を最優先（スキルの指針より優先）
- 内容・文言は `docs/site-design.md` と `PRODUCT.md` にあるものだけ。創作しない
- ライブ・曲・グッズの中身は Google スプレッドシートが正。`src/data/sheet/*.json` はビルド前に `scripts/fetch-sheet.mjs` が書き出すので手で直さない（`docs/sheet-update.md`）
- コミット前に `npm test`・`npm run lint`・`npm run build`
- 進め方は web-design-flow スキルに従う
