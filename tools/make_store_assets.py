"""Generates Chrome Web Store assets: small tile, marquee, and 1280x800 screenshots."""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

os.makedirs("docs/store", exist_ok=True)

F_LATIN = "C:/Windows/Fonts/segoeuib.ttf"
F_CJK_B = "C:/Windows/Fonts/msyhbd.ttc"
F_CJK = "C:/Windows/Fonts/msyh.ttc"

ACCENT = (255, 107, 96)
TEXT = (247, 247, 250)
MUTED = (152, 152, 162)


def F(path, size):
    return ImageFont.truetype(path, int(size))


def backdrop(w, h, glow=(0.5, 1.0)):
    canvas = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(canvas)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=(int(9 + 11 * t), int(9 + 11 * t), int(12 + 14 * t)))
    canvas = canvas.convert("RGBA")

    yy, xx = np.mgrid[0:h, 0:w]
    for cx, cy, rad, color, strength in [
        (w * glow[0], h * glow[1], w * 0.8, ACCENT, 0.40),
        (w * 0.08, h * 0.02, w * 0.4, (92, 146, 255), 0.16),
    ]:
        dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / rad
        fall = np.clip(1 - dist, 0, 1) ** 2.4 * strength
        layer = np.zeros((h, w, 4), dtype=np.float32)
        layer[..., 0], layer[..., 1], layer[..., 2] = color
        layer[..., 3] = fall * 255
        canvas = Image.alpha_composite(canvas, Image.fromarray(layer.astype(np.uint8), "RGBA"))
    return canvas


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out, mask


def logo(size):
    src = Image.open("extension/public/icons/pickcat.png").convert("RGBA")
    src.thumbnail((size, size), Image.LANCZOS)
    return src


# ---------------------------------------------------------------- small tile 440x280
W, H = 440, 280
SS = 3
tile = backdrop(W * SS, H * SS, glow=(0.5, 1.15))
d = ImageDraw.Draw(tile)

mark = logo(int(64 * SS))
tile.alpha_composite(mark, (int((W * SS - mark.width) / 2), int(46 * SS)))

f1 = F(F_LATIN, 40 * SS / SS * SS)
title = "WinUI 3"
f_title = F(F_LATIN, 40)
w1 = d.textlength(title, font=f_title)
tcjk = F(F_CJK_B, 38)
w2 = d.textlength("重制", font=tcjk)
x = (W * SS - (w1 + 8 * SS + w2)) / 2
d.text((x, 132 * SS), title, font=f_title, fill=(*ACCENT, 255))
d.text((x + w1 + 8 * SS, 132 * SS), "重制", font=tcjk, fill=(*TEXT, 255))

sub = F(F_CJK, 15)
label = "PickCat 非官方重制"
ws = d.textlength(label, font=sub)
d.text(((W * SS - ws) / 2, 204 * SS), label, font=sub, fill=(*MUTED, 255))
tile.convert("RGB").resize((W, H), Image.LANCZOS).save("docs/store/tile-440x280.png")

# ---------------------------------------------------------------- marquee 1400x560
W, H = 1400, 560
SS = 2
CW, CH = W * SS, H * SS
mar = backdrop(CW, CH, glow=(0.22, 1.05))
d = ImageDraw.Draw(mar)

d.text((72 * SS, 118 * SS), "PICKCAT", font=F(F_LATIN, 22), fill=(*MUTED, 255))
d.text((72 * SS, 156 * SS), "WinUI 3", font=F(F_LATIN, 62), fill=(*ACCENT, 255))
d.text((72 * SS + d.textlength("WinUI 3", font=F(F_LATIN, 62)) + 14 * SS, 156 * SS), "重制", font=F(F_CJK_B, 58), fill=(*TEXT, 255))
d.text((72 * SS, 250 * SS), "不是换皮，是重写整个窗口", font=F(F_CJK, 24), fill=(*TEXT, 230))
d.text((72 * SS, 292 * SS), "18 个原生 WinUI 控件 · 245 个接口 · 非官方实现", font=F(F_CJK, 18), fill=(*MUTED, 255))
d.rounded_rectangle([72 * SS, 336 * SS, 240 * SS, 342 * SS], radius=3 * SS, fill=(*ACCENT, 255))

shot = Image.open("docs/screenshots/site/home.png").convert("RGB")
tw, th = 620, 388
thumb = shot.resize((tw * SS, th * SS), Image.LANCZOS)
thumb, mask = rounded(thumb, 12 * SS)
shadow = Image.new("RGBA", mar.size, (0, 0, 0, 0))
sh_mask = Image.new("L", thumb.size, 0)
ImageDraw.Draw(sh_mask).rounded_rectangle([0, 0, thumb.size[0] - 1, thumb.size[1] - 1], radius=12 * SS, fill=180)
shadow.paste(Image.new("RGBA", thumb.size, (0, 0, 0, 180)), (742 * SS + 16 * SS, 116 * SS + 22 * SS), sh_mask)
mar.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18 * SS)))
mar.alpha_composite(thumb, (742 * SS, 116 * SS))

edge = ImageDraw.Draw(mar)
edge.rounded_rectangle([742 * SS, 116 * SS, 742 * SS + tw * SS - 1, 116 * SS + th * SS - 1], radius=12 * SS, outline=(255, 255, 255, 40), width=2)

mar.convert("RGB").resize((W, H), Image.LANCZOS).save("docs/store/marquee-1400x560.png")

# ---------------------------------------------------------------- screenshots 1280x800
shots = [
    ("home", "docs/screenshots/site/home.png"),
    ("topic", "docs/screenshots/site/topic.png"),
    ("works", "docs/screenshots/site/works.png"),
    ("settings-light", "docs/screenshots/site/settings.png"),
    ("forum", "docs/screenshots/site/forum.png"),
]
for i, (name, path) in enumerate(shots, start=1):
    if not os.path.exists(path):
        print("missing", path)
        continue
    img = Image.open(path).convert("RGB").resize((1280, 800), Image.LANCZOS)
    img.save(f"docs/store/screenshot-{i}.png", optimize=True)

# ---------------------------------------------------------------- 128 icon
icon = Image.open("extension/public/icons/pickcat.png").convert("RGBA")
icon.resize((128, 128), Image.LANCZOS).save("docs/store/icon-128.png")

print("store assets ready:", sorted(os.listdir("docs/store")))
