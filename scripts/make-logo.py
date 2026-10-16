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
import numpy as np
from PIL import Image, ImageFilter

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


def remove_skull_bits(
    gray: Image.Image,
    edges: tuple[str, ...] = (),
    bands: tuple[tuple[int, int, int, int], ...] = (),
    patch: tuple[int, int, int, int] | None = None,
) -> Image.Image:
    """文字の切り出しに入り込んだ頭蓋骨・舌の断片を消す。
    edges: 'top' / 'bottom' … その辺に触れる塊を消す（頭蓋骨が切り口からはみ出したもの）
    bands: (x0, y0, x1, y1) … この枠の中に収まる塊を消す（文字から離れた小片）
    patch: (x0, y0, x1, y1) … 文字の筆跡に重なった断片を、枠内だけ筆跡の形に整えて塗り直す
    """
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
            drop = ("top" in edges and min(ys) == 0) or ("bottom" in edges and max(ys) == h - 1)
            for x0, y0, x1, y1 in bands:
                drop = drop or (min(xs) >= x0 and max(xs) <= x1 and min(ys) >= y0 and max(ys) <= y1)
            if drop:
                for c in comp:
                    px[c] = 0
    if patch:
        g = _repaint(g, patch)
    return g


def _repaint(gray: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    """box 内で筆跡に重なった舌（輪郭線・トゲ・ベタ塗り）を消し、筆跡として塗り直す。
    形はオープニング（トゲ除去）→クロージング（輪郭線の穴埋め）→ぼかし二値化で整え、
    中身は box の外側の筆跡の明るさに粒状ノイズを足して塗る。"""
    g = np.array(gray, dtype=np.float32)
    x0, y0, x1, y1 = box
    m = 16  # box の外側：形を整える余白で、塗り直しの手本にもなる
    wx0, wy0, wx1, wy1 = x0 - m, y0 - m, x1 + m, y1 + m
    win = g[wy0:wy1, wx0:wx1]
    shape = Image.fromarray((win >= 28).astype(np.uint8) * 255)
    shape = shape.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(9))
    shape = shape.filter(ImageFilter.MaxFilter(17)).filter(ImageFilter.MinFilter(17))
    shape = np.array(shape.filter(ImageFilter.GaussianBlur(3))) >= 128
    inner = np.zeros_like(shape)
    inner[m:-m, m:-m] = True
    bad = shape & inner
    # 中身は外側の筆跡の明るさ（中央値）に粒状ノイズを足し、縁はぼかしで暗く落とす
    base = float(np.median(win[~inner & (win >= 120)]))
    grain = np.random.default_rng(0).normal(128, 45, win.shape)
    grain = np.array(Image.fromarray(np.clip(grain, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)))
    edge = np.array(Image.fromarray(shape.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(2))) / 255
    painted = np.clip((base + (grain.astype(np.float32) - 128) * 1.6) * edge, 0, 240)
    g[y0:y1, x0:x1] = np.where(bad, painted, 0)[m:-m, m:-m]
    return Image.fromarray(g.astype(np.uint8))


full = trim(to_alpha(src.crop((0, 300, 1440, 1720))))
save(full, "logo-full", 1200)

# 横組み: BLACK と RAM を切り出して横に並べる（頭蓋骨の舌が RAM に重なる部分は除く）
# BLACK の下端には頭蓋骨の上部が、R の左上には舌先が入り込むので消す
black_gray = remove_skull_bits(src.crop((40, 360, 1020, 860)), edges=("bottom",), bands=((0, 455, 980, 500),))
black = trim(to_alpha(black_gray))
ram_gray = remove_skull_bits(
    src.crop((470, 1100, 1440, 1700)), edges=("top",), bands=((0, 0, 330, 250),), patch=(80, 178, 208, 242)
)
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
