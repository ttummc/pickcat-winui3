"""Compose the PickCat · WinUI 3 promo key visual from a real screenshot."""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

SS = 2  # supersample factor
W, H = 1920, 1080
CW, CH = W * SS, H * SS

SHOT = "docs/screenshots/site/home.png"
OUT = "docs/promo/pickcat-promo.png"

FONT_BOLD_LATIN = "C:/Windows/Fonts/segoeuib.ttf"
FONT_BOLD_CJK = "C:/Windows/Fonts/msyhbd.ttc"
FONT_CJK = "C:/Windows/Fonts/msyh.ttc"

ACCENT = (255, 107, 96)
TEXT = (247, 247, 250)
MUTED = (150, 150, 160)


def F(path, size, index=0):
    return ImageFont.truetype(path, int(size * SS), index=index)


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def radial(cx, cy, radius, color, strength):
    yy, xx = np.mgrid[0:CH, 0:CW]
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / radius
    falloff = np.clip(1 - dist, 0, 1) ** 2.4 * strength
    layer = np.zeros((CH, CW, 4), dtype=np.float32)
    layer[..., 0], layer[..., 1], layer[..., 2] = color
    layer[..., 3] = falloff * 255
    return Image.fromarray(layer.astype(np.uint8), "RGBA")


# ------------------------------------------------------------------ backdrop
bg = Image.new("RGB", (CW, CH))
d = ImageDraw.Draw(bg)
for y in range(CH):
    t = y / CH
    d.line([(0, y), (CW, y)], fill=(int(9 + 11 * t), int(9 + 11 * t), int(12 + 14 * t)))
canvas = bg.convert("RGBA")

canvas = Image.alpha_composite(canvas, radial(int(CW * 0.82), int(CH * 0.06), int(CW * 0.5), (92, 146, 255), 0.28))
canvas = Image.alpha_composite(canvas, radial(int(CW * 0.16), int(CH * 0.96), int(CW * 0.6), ACCENT, 0.40))
canvas = Image.alpha_composite(canvas, radial(int(CW * 0.06), int(CH * 0.04), int(CW * 0.26), ACCENT, 0.14))

yy, xx = np.mgrid[0:CH, 0:CW]
nx, ny = (xx / CW - 0.5) * 2, (yy / CH - 0.5) * 2
vign = np.clip(1 - (nx**2 * 0.42 + ny**2 * 0.52), 0, 1) ** 0.9
v = np.zeros((CH, CW, 4), dtype=np.float32)
v[..., 3] = (1 - vign) * 110
canvas = Image.alpha_composite(canvas, Image.fromarray(v.astype(np.uint8), "RGBA"))

# ------------------------------------------------------------------ window
shot = Image.open(SHOT).convert("RGB")
shot = ImageEnhance.Contrast(shot).enhance(1.06)
shot = ImageEnhance.Brightness(shot).enhance(1.07)

WIN_W, WIN_H = 1232, 770
X, Y = 332, 272
RADIUS = 13 * SS
win = shot.resize((WIN_W * SS, WIN_H * SS), Image.LANCZOS)
size = win.size
mask = rounded_mask(size, RADIUS)

# blurred duplicate behind, offset up-right = depth
dup = win.filter(ImageFilter.GaussianBlur(24 * SS))
dup_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
dup_layer.paste(dup, (int((X + 54) * SS), int((Y - 50) * SS)), mask)
dup_layer.putalpha(dup_layer.split()[3].point(lambda p: int(p * 0.40)))
canvas = Image.alpha_composite(canvas, dup_layer)

# acrylic plate
plate = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
ImageDraw.Draw(plate).rounded_rectangle(
    [int((X - 18) * SS), int((Y - 18) * SS), int((X + WIN_W + 18) * SS), int((Y + WIN_H + 18) * SS)],
    radius=int(RADIUS * 1.7),
    fill=(255, 255, 255, 14),
    outline=(255, 255, 255, 20),
    width=max(1, SS),
)
canvas = Image.alpha_composite(canvas, plate.filter(ImageFilter.GaussianBlur(0.5 * SS)))

# contact shadow
shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle(
    [int((X + 20) * SS), int((Y + WIN_H - 30) * SS), int((X + WIN_W - 20) * SS), int((Y + WIN_H + 40) * SS)],
    radius=26 * SS,
    fill=(0, 0, 0, 205),
)
canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(30 * SS)))

# extruded thickness: bottom + right
thick = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
td = ImageDraw.Draw(thick)
for i in range(10, 0, -1):
    ox, oy = i * 0.5 * SS, i * 0.9 * SS
    shade = int(26 - i * 1.5)
    td.rounded_rectangle(
        [int(X * SS + ox), int(Y * SS + oy), int((X + WIN_W) * SS + ox), int((Y + WIN_H) * SS + oy)],
        radius=RADIUS,
        fill=(shade, shade, shade + 2, 255),
    )
canvas = Image.alpha_composite(canvas, thick)

# the window
layer = win.convert("RGBA")
layer.putalpha(mask)
canvas.alpha_composite(layer, (X * SS, Y * SS))

# subtle top-light gradient inside the window (no big sweep)
light = Image.new("RGBA", size, (0, 0, 0, 0))
ld = ImageDraw.Draw(light)
for i in range(int(160 * SS)):
    a = int(16 * (1 - i / (160 * SS)) ** 2)
    ld.line([(0, i), (size[0], i)], fill=(255, 255, 255, a))
light.putalpha(Image.fromarray(np.minimum(np.asarray(light.split()[3]), np.asarray(mask)), "L"))
canvas.alpha_composite(light, (X * SS, Y * SS))

# border: 1px stroke + bright top edge
edge = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
ed = ImageDraw.Draw(edge)
ed.rounded_rectangle(
    [int(X * SS), int(Y * SS), int((X + WIN_W) * SS) - 1, int((Y + WIN_H) * SS) - 1],
    radius=RADIUS,
    outline=(255, 255, 255, 38),
    width=max(1, SS),
)
for i in range(2 * SS):
    ed.line(
        [(int(X * SS) + 12 * SS, int(Y * SS) + i + 1), (int((X + WIN_W) * SS) - 12 * SS, int(Y * SS) + i + 1)],
        fill=(255, 255, 255, 105 - i * 22),
        width=1,
    )
canvas = Image.alpha_composite(canvas, edge)


# ------------------------------------------------------------------ chips
def paste_chip(base, sprite, pos, blur_px, alpha=1.0, rotate=0):
    if rotate:
        sprite = sprite.rotate(rotate, expand=True, resample=Image.BICUBIC)
    spr = sprite.filter(ImageFilter.GaussianBlur(blur_px * SS))
    if alpha < 1:
        spr.putalpha(spr.split()[3].point(lambda p: int(p * alpha)))
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sh.paste(Image.new("RGBA", spr.size, (0, 0, 0, 150)), (pos[0] + 6 * SS, pos[1] + 12 * SS), spr.split()[3])
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14 * SS)))
    base.alpha_composite(spr, pos)


# decorative accent arc, foreground left (soft, no fake widget)
arc = Image.new("RGBA", (420 * SS, 420 * SS), (0, 0, 0, 0))
ad = ImageDraw.Draw(arc)
ad.arc([10 * SS, 10 * SS, 410 * SS, 410 * SS], start=118, end=250, fill=(*ACCENT, 130), width=int(3.5 * SS))
paste_chip(canvas, arc, (-96 * SS, 690 * SS), 2.5, 0.85, rotate=0)

# toggle switch, top right
tog = Image.new("RGBA", (146 * SS, 76 * SS), (0, 0, 0, 0))
td2 = ImageDraw.Draw(tog)
td2.rounded_rectangle([0, 0, 145 * SS, 75 * SS], radius=38 * SS, fill=(255, 255, 255, 44),
                      outline=(255, 255, 255, 96), width=SS)
td2.ellipse([77 * SS, 8 * SS, 137 * SS, 68 * SS], fill=(255, 255, 255, 238))
paste_chip(canvas, tog, (1622 * SS, 300 * SS), 4, 0.95, rotate=5)

# spinner ring, right
ring = Image.new("RGBA", (140 * SS, 140 * SS), (0, 0, 0, 0))
rd = ImageDraw.Draw(ring)
rd.arc([3 * SS, 3 * SS, 137 * SS, 137 * SS], start=30, end=300, fill=(255, 255, 255, 165), width=8 * SS)
rd.arc([3 * SS, 3 * SS, 137 * SS, 137 * SS], start=300, end=360, fill=(*ACCENT, 240), width=8 * SS)
paste_chip(canvas, ring, (1672 * SS, 816 * SS), 4, 0.92)

# ------------------------------------------------------------------ type
d2 = ImageDraw.Draw(canvas)
# eyebrow — product name
f_brand = F(FONT_BOLD_LATIN, 46)
d2.text((122 * SS, 104 * SS), "PICKCAT", font=f_brand, fill=(*TEXT, 255), anchor="ls")
wf = d2.textlength("PICKCAT", font=f_brand) / SS
d2.text((122 * SS + wf * SS + 16 * SS, 104 * SS), "社区客户端", font=F(FONT_CJK, 24), fill=(*MUTED, 255), anchor="ls")

# headline — WinUI 3 重制
base = 200
f_latin = F(FONT_BOLD_LATIN, 90)
f_cjk = F(FONT_BOLD_CJK, 86)
d2.text((118 * SS, base * SS), "WinUI 3", font=f_latin, fill=(*ACCENT, 255), anchor="ls")
w1 = d2.textlength("WinUI 3", font=f_latin) / SS
d2.text((118 * SS + w1 * SS + 12 * SS, base * SS), "重制", font=f_cjk, fill=(*TEXT, 255), anchor="ls")

# accent rule + tagline
d2.rounded_rectangle([120 * SS, 216 * SS, 320 * SS, 220 * SS], radius=2 * SS, fill=(*ACCENT, 255))
d2.text((120 * SS, 252 * SS), "用 WinUIonWeb 从零重写 · 不是换皮", font=F(FONT_CJK, 25), fill=(*MUTED, 255), anchor="ls")

d2.text((1796 * SS, 132 * SS), "v1.0.1", font=F(FONT_BOLD_LATIN, 25), fill=(*MUTED, 255), anchor="ra")
d2.text((1796 * SS, 164 * SS), "Chrome 扩展", font=F(FONT_CJK, 21), fill=(*MUTED, 255), anchor="ra")

# ------------------------------------------------------------------ grain
grain = np.random.default_rng(11).normal(0, 4.6, (CH, CW, 1)).repeat(3, axis=2)
arr = np.asarray(canvas.convert("RGB"), dtype=np.float32) + grain
canvas = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")

os.makedirs("docs/promo", exist_ok=True)
final_1080 = canvas.resize((W, H), Image.LANCZOS)
final_1080.save(OUT, quality=95)
canvas.resize((2560, 1440), Image.LANCZOS).save(OUT.replace(".png", "@2560.png"), quality=95)
print("saved", OUT, "and", OUT.replace(".png", "@2560.png"))
print("saved", OUT)
