"""暫定ロゴ生成（原本入手までの代用）。
元: assets/instagram/ig-DXPQaPFkXY6.jpg（黒地に白の筆文字＋羊の頭蓋骨）
輝度をそのままアルファに使い、色は Bone #ece8df に置き換えて黒地を透過する。
出力:
  public/logo/logo-full.png / .webp   … 縦組み全体（BLACK / 頭蓋骨 / RAM）
  public/logo/logo-wordmark.png / .webp … ヘッダー用の横組み（BLACK と RAM を横に並べ直したもの）
  public/favicon-*.png, apple-touch-icon.png … 頭蓋骨部分
"""
import sys
from pathlib import Path
from PIL import Image, ImageOps

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
src = Image.open(root / "assets/instagram/ig-DXPQaPFkXY6.jpg").convert("L")
BONE = (0xEC, 0xE8, 0xDF)
INK = (0x0D, 0x0C, 0x0B)
out = root / "public/logo"
out.mkdir(parents=True, exist_ok=True)


def to_alpha(gray: Image.Image) -> Image.Image:
    # 黒地のJPEGノイズを切り、白をはっきり不透明にする
    a = gray.point(lambda v: 0 if v < 28 else min(255, int((v - 28) * 255 / (200 - 28))))
    rgba = Image.new("RGBA", gray.size, BONE + (0,))
    rgba.putalpha(a)
    return rgba


def trim(rgba: Image.Image, pad: int = 8) -> Image.Image:
    box = rgba.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    l, t, r, b = box
    return rgba.crop((max(0, l - pad), max(0, t - pad), min(rgba.width, r + pad), min(rgba.height, b + pad)))


def save(img: Image.Image, name: str, max_w: int):
    if img.width > max_w:
        img = img.resize((max_w, round(img.height * max_w / img.width)), Image.LANCZOS)
    img.save(out / f"{name}.png", optimize=True)
    img.save(out / f"{name}.webp", quality=90, method=6)
    print(name, img.size)


def remove_tongue(gray: Image.Image, band: tuple[int, int, int, int]) -> Image.Image:
    """頭蓋骨から伸びる舌の断片を消す。
    上端に触れる塊と、band (x0, y0, x1, y1) の中に収まる小さな塊を消す。"""
    g = gray.copy()
    w, h = g.size
    px = g.load()
    seen = bytearray(w * h)
    for sy in range(h):
        for sx in range(w):
            if seen[sy * w + sx] or px[sx, sy] < 28:
                continue
            comp, stack = [], [(sx, sy)]
            seen[sy * w + sx] = 1
            while stack:
                x, y = stack.pop()
                comp.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny] >= 28:
                        seen[ny * w + nx] = 1
                        stack.append((nx, ny))
            xs = [c[0] for c in comp]
            ys = [c[1] for c in comp]
            x0, y0, x1, y1 = band
            inside = min(xs) >= x0 and max(xs) <= x1 and min(ys) >= y0 and max(ys) <= y1
            if min(ys) == 0 or inside:
                for c in comp:
                    px[c] = 0
    return g


full = trim(to_alpha(src.crop((0, 300, 1440, 1720))))
save(full, "logo-full", 1200)

# 横組み: BLACK と RAM を切り出して横に並べる（頭蓋骨の舌が RAM に重なる部分は除く）
black = trim(to_alpha(src.crop((40, 360, 1020, 860))))
ram_gray = remove_tongue(src.crop((470, 1100, 1440, 1700)), (0, 0, 330, 250))
ram = trim(to_alpha(ram_gray))
h = max(black.height, ram.height)
gap = int(h * 0.18)
word = Image.new("RGBA", (black.width + gap + ram.width, h), BONE + (0,))
word.alpha_composite(black, (0, h - black.height))
word.alpha_composite(ram, (black.width + gap, h - ram.height))
wm = trim(word, 4)
save(wm, "logo-wordmark", 900)
save(wm, "logo-wordmark-sm", 360)

# ファビコン: 頭蓋骨（角を含む中央部分）を Ink の正方形に置く
skull = trim(to_alpha(src.crop((430, 810, 1010, 1225))), 4)
def icon(size: int, name: str):
    bg = Image.new("RGBA", (size, size), INK + (255,))
    s = skull.copy()
    s.thumbnail((int(size * 0.9), int(size * 0.9)), Image.LANCZOS)
    bg.alpha_composite(s, ((size - s.width) // 2, (size - s.height) // 2))
    bg.convert("RGB").save(root / "public" / name, optimize=True)
    print(name)
icon(32, "favicon-32.png")
icon(180, "apple-touch-icon.png")
icon(512, "icon-512.png")
