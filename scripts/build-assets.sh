#!/usr/bin/env bash
# assets/ の素材を public/ 用に変換する（元ファイルは触らない）
# 使い方: npm run assets   （ffmpeg と python3 + Pillow が必要）
set -euo pipefail
cd "$(dirname "$0")/.."
A=assets
P=public
mkdir -p "$P/img/photo" "$P/img/goods" "$P/img/profile" "$P/img/live" "$P/img/music" "$P/video"

# 画像: 長辺 1600px（それ以下なら拡大しない）の WebP と、一覧用の長辺 800px
img() { # src dest-without-ext
  ffmpeg -y -loglevel error -i "$1" -vf "scale='if(gt(iw,ih),min(1600,iw),-2)':'if(gt(iw,ih),-2,min(1600,ih))'" -c:v libwebp -quality 80 "$2.webp"
  ffmpeg -y -loglevel error -i "$1" -vf "scale='if(gt(iw,ih),min(800,iw),-2)':'if(gt(iw,ih),-2,min(800,ih))'" -c:v libwebp -quality 76 "$2-s.webp"
}

for id in DcHOFc4E20Q DcHOFc4E20Q-s2 DcHOFc4E20Q-s6 DcHOFc4E20Q-s7 DcHOFc4E20Q-s9 DcHOFc4E20Q-s10 \
          DcHOFc4E20Q-s11 DcHOFc4E20Q-s12 DcHOFc4E20Q-s13 DcHOFc4E20Q-s15 DcHOFc4E20Q-s16 DcHOFc4E20Q-s17 \
          DcHOFc4E20Q-s18 Dc3gSJhsLx- Dc3gl8ksScU Dc3l2V7MfRr; do
  img "$A/instagram/ig-$id.jpg" "$P/img/photo/$id"
done
for id in Db_ZAHkk-q8 Db_ZAHkk-q8-s2 Db_ZAHkk-q8-s6 Db_ZAHkk-q8-s7 Db_ZAHkk-q8-s8 Db_ZAHkk-q8-s9; do
  img "$A/instagram/ig-$id.jpg" "$P/img/goods/$id"
done
for id in DXPX72-kd3w-s1 DXR9TnlExqb-s1 DXqDKvfkczL-s1; do
  img "$A/instagram/ig-$id.jpg" "$P/img/profile/$id"
done
img "$A/raw/artist.png" "$P/img/profile/artist"
img "$A/instagram/ig-DZewoOkx8IQ-s1.jpg" "$P/img/live/0622-gattaca"
img "$A/instagram/ig-DaC2mvjxY81.jpg" "$P/img/live/0814-kyoto-muse"
for j in rams-ball baby-tank ass-hole; do
  ffmpeg -y -loglevel error -i "$A/raw/jacket-$j.png" -c:v libwebp -quality 88 "$P/img/music/$j.webp"
done

# 動画: 720p 相当・H.264・faststart。ヒーロー用は無音版。ポスターは WebP
vid() { # src name poster-sec
  ffmpeg -y -loglevel error -i "$1" -vf "scale=-2:'min(1280,ih)'" -c:v libx264 -preset slow -crf 28 -profile:v high -pix_fmt yuv420p \
    -c:a aac -b:a 112k -movflags +faststart "$P/video/$2.mp4"
  ffmpeg -y -loglevel error -ss "$3" -i "$1" -frames:v 1 -vf "scale=-2:'min(1280,ih)'" -c:v libwebp -quality 78 "$P/video/$2.webp"
}
vid "$A/video/reel-DaWx4pxxqvu.mp4" reel-DaWx4pxxqvu 1
vid "$A/video/reel-DXrVEDGEdfb.mp4" reel-DXrVEDGEdfb 1
vid "$A/video/reel-DX6GmLdRm4f.mp4" reel-DX6GmLdRm4f 9
ffmpeg -y -loglevel error -i "$A/video/reel-DaWx4pxxqvu.mp4" -vf "scale=-2:'min(1280,ih)'" -c:v libx264 -preset slow -crf 31 \
  -profile:v high -pix_fmt yuv420p -an -movflags +faststart "$P/video/hero.mp4"

# 案C: 暗転した地の写真（白黒・網点・粒子）→ public/img/stage/
python3 -I scripts/make-stage.py .

# ロゴ（暫定）とファビコン
python3 -I scripts/make-logo.py .

# OG 画像 1200x630: ライブ写真を暗く敷き、左にロゴ
ffmpeg -y -loglevel error -i "$A/instagram/ig-DcHOFc4E20Q-s6.jpg" -i "$P/logo/logo-full.png" -filter_complex \
  "[0]scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630,eq=brightness=-0.12[bg];[1]scale=-1:520[l];[bg][l]overlay=60:(H-h)/2" \
  -frames:v 1 -q:v 3 "$P/og.jpg"
echo done
