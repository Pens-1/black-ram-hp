# BLACK RAM HP 設計書（構成 / 未確定）

事実は PRODUCT.md が正。ここにない文言・数字は使わない（創作禁止）。見た目は DESIGN.md が正。

## 1. 役割
- 今のSNSのリンク集（EP2枚の linkco.re、TuneCore、TikTok、X）を置き換える公式HP
- 来訪者（推定）: SNSから来るスマホのリスナー、対バン・イベンター
- 来た人にやってほしいこと: 曲を聴く／ライブ予定を見る／SNSをフォローする（優先順位は未確認）

## 2. 構成（1ページ縦スクロール。アーティストサイトの定番構成）
| # | ID | 内容 | 素材・リンク |
|---|---|---|---|
| 0 | header | ロゴ、メニュー（LIVE / MUSIC / VIDEO / GOODS / PROFILE / CONTACT）、SNSアイコン。スマホはメニューを開閉 | ロゴ |
| 1 | hero | 縦リール動画を音なしでループ＋ロゴを大きく。動画が使えないときはライブ写真 | assets/video/reel-DaWx4pxxqvu.mp4 |
| 2 | news | 告知の一覧（日付＋1行）。0件なら出さない | 内容は未確認 |
| 3 | live | 今後の予定（日付・会場・タイトル・フライヤー）。過去公演は折りたたみ | 6/22 GATTACA「天変地異」、8/14 KYOTO MUSE（年は未確認） |
| 4 | music | EPごとにジャケット＋配信リンク | RAM'S BALL → https://linkco.re/3CcSGHyp、BABY TANK → https://linkco.re/tM5cbf6t、ASS HOLE（リンク未確認） |
| 5 | video | 縦リールのカード。タップで音ありで再生 | assets/video/*.mp4 |
| 6 | photo | ライブ写真のギャラリー | assets/instagram/ig-DcHOFc4E20Q-s* ほか |
| 7 | goods | Tシャツ写真。購入方法は未確認 | assets/instagram/ig-Db_ZAHkk-q8 系 |
| 8 | profile | アー写。メンバー名・パート・紹介文は未確認なので空欄 | assets/raw/artist.png |
| 9 | contact / footer | Instagram / X / TikTok / TuneCore、問い合わせ先（未確認） | 下のリンク一覧 |

### リンク
- Instagram: https://www.instagram.com/black_______ram/
- X: https://x.com/blackram0418
- TikTok: https://www.tiktok.com/@blackram__
- TuneCore: https://www.tunecore.co.jp/artists?id=1109406

## 3. 状態
- 予定ライブ0件: 「次のライブは近日発表」とだけ出す（文言は要確認）
- 動きを減らす設定のとき: 動画は止めて静止画を出す
- 基準はスマホ（幅390）。PC（幅1280）でも崩れないこと

## 4. 技術
- Astro の静的サイト。進め方は web-design-flow に従う
- デプロイ先は未定（指示があるまで公開しない）

## 5. 本人に確認するもの
ロゴの原本（SVG/透過PNG）、EPの順番と ASS HOLE のリンク、メンバー名・パート・紹介文、ライブの年と今後の予定、物販の買い方、問い合わせ先、写真・動画の使用許可、撮影者のクレジット
