"""暗転した「地」の写真を作る（案C: 暗転と照明）。
ライブ写真をコピー機で刷ったような白黒に変換し、暗く沈める。
  1. 白黒にしてコントラストを上げる（上下 1% を切り詰め）
  2. 45度の網点（しきい値）を 45% 混ぜる
  3. 暗く沈める（ガンマ 1.6、最大でも輝度 約 50%）
  4. 粒子（ガウスノイズ）を足す
  5. Ink #0d0c0b → Bone #ece8df の2色に置き換える（冷たいグレーを出さない）
出力: public/img/stage/<name>.webp（長辺 1600）と <name>-s.webp（長辺 800）
PRINTS は逆に、Bone の紙に Ink で刷ったコピー（網点を強め、暗く沈めない）。NEXT LIVE の反転面に刷り込む
使い方: python3 -I scripts/make-stage.py .
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
out = root / "public/img/stage"
out.mkdir(parents=True, exist_ok=True)

INK = np.array([0x0D, 0x0C, 0x0B], dtype=np.float32)
BONE = np.array([0xEC, 0xE8, 0xDF], dtype=np.float32)

# 出力名: 元ファイル
SOURCES = {
    "live-s9": "assets/instagram/ig-DcHOFc4E20Q-s9.jpg",
    "live-s7": "assets/instagram/ig-DcHOFc4E20Q-s7.jpg",
    "live-s13": "assets/instagram/ig-DcHOFc4E20Q-s13.jpg",
    "live-s17": "assets/instagram/ig-DcHOFc4E20Q-s17.jpg",
    "goods": "assets/instagram/ig-Db_ZAHkk-q8.jpg",
    "profile": "assets/instagram/ig-DXPX72-kd3w-s1.jpg",
}
PRINTS = {
    "print-drum": "assets/instagram/ig-Dc3l2V7MfRr.jpg",
}


def stage(src: Image.Image, long_edge: int, seed: int, paper: bool = False) -> Image.Image:
    im = src.convert("L")
    scale = min(1.0, long_edge / max(im.size))
    if scale < 1:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    im = ImageOps.autocontrast(im, cutoff=1)
    g = np.asarray(im, dtype=np.float32) / 255.0

    # 45度の網点。セルの大きさは長辺に比例（1600px で 7px）
    cell = max(4.0, 7.0 * max(im.size) / 1600)
    h, w = g.shape
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    u = (x + y) / np.sqrt(2)
    v = (x - y) / np.sqrt(2)
    t = (np.cos(2 * np.pi * u / cell) + np.cos(2 * np.pi * v / cell) + 2) / 4
    dots = (g > t).astype(np.float32)

    rng = np.random.default_rng(seed)
    if paper:
        # 紙に刷ったコピー: 網点を多めに、明るいところは紙のまま
        m = 0.3 * g + 0.7 * dots
        m = np.clip(m + rng.normal(0, 0.05, m.shape), 0, 1)
        rgb = INK + (BONE - INK) * m[..., None]
        return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    m = 0.55 * g + 0.45 * dots
    m = np.power(m, 1.6) * 0.5
    m = np.clip(m + rng.normal(0, 0.035, m.shape), 0, 1)

    rgb = INK + (BONE - INK) * m[..., None]
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")


jobs = [(n, p, False) for n, p in SOURCES.items()] + [(n, p, True) for n, p in PRINTS.items()]
for i, (name, path, paper) in enumerate(jobs):
    src = Image.open(root / path)
    stage(src, 1600, i, paper).save(out / f"{name}.webp", quality=62, method=6)
    stage(src, 800, i, paper).save(out / f"{name}-s.webp", quality=60, method=6)
    print(name, Image.open(out / f"{name}.webp").size)
