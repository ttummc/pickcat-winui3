"""Small 16:9 cover variant of the PickCat · WinUI 3 key visual.

Designed to stay legible at ~300px wide, so the type is much larger relative to
the frame and the screenshot is reduced to a supporting slice.
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

SS = 2
W, H = 1200, 675
CW, CH = W * SS, H * SS

SHOT = "docs/screenshots/live/home.png"
OUT = "docs/promo/pickcat-cover-16x9.png"

F_LATIN = "C:/Windows/Fonts/segoeuib.ttf"
F_CJK_B = "C:/Windows/Fonts/msyhbd.ttc"
F_CJK = "C:/Windows/Fonts/msyh.ttc"

ACCENT = (255, 107, 96)
TEXT = (247, 247, 250)
MUTED = (152, 152, 162)


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


bg = Image.new("RGB", (CW, CH))
d = ImageDraw.Draw(bg)
for y in range(CH):
    t = y / CH
    d.line([(0, y), (CW, y)], fill=(int(9 + 10 * t), int(9 + 10 * t), int(12 + 13 * t)))
canvas = bg.convert("RGBA")

canvas = Image.alpha_composite(canvas, radial(int(CW * 0.06), int(CH * 0.98), int(CW * 0.7), ACCENT, 0.55))
canvas = Image.alpha_composite(canvas, radial(int(CW * 0.95), int(CH * 0.02), int(CW * 0.55), (92, 146, 255), 0.26))

yy, xx = np.mgrid[0:CH, 0:CW]
nx, ny = (xx / CW - 0.5) * 2, (yy / CH - 0.5) * 2
vign = np.clip(1 - (nx**2 * 0.45 + ny**2 * 0.55), 0, 1) ** 0.85
v = np.zeros((CH, CW, 4), dtype=np.float32)
v[..., 3] = (1 - vign) * 115
canvas = Image.alpha_composite(canvas, Image.fromarray(v.astype(np.uint8), "RGBA"))

# ---------------------------------------------------------------- window slice
shot = Image.open(SHOT).convert("RGB")
shot = ImageEnhance.Contrast(shot).enhance(1.07)
shot = ImageEnhance.Brightness(shot).enhance(1.06)

WIN_H = 430
WIN_W = int(WIN_H * 1.6)
X, Y = 596, 268
radius = 12 * SS
win = shot.resize((WIN_W * SS, WIN_H * SS), Image.LANCZOS)
mask = rounded_mask(win.size, radius)

shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle(
    [int((X + 14) * SS), int((Y + WIN_H - 26) * SS), int((X + WIN_W - 10) * SS), int((Y + WIN_H + 26) * SS)],
    radius=22 * SS, fill=(0, 0, 0, 215),
)
canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(22 * SS)))

thick = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
td = ImageDraw.Draw(thick)
for i in range(8, 0, -1):
    ox, oy = i * 0.5 * SS, i * 0.9 * SS
    shade = int(26 - i * 1.6)
    td.rounded_rectangle(
        [int(X * SS + ox), int(Y * SS + oy), int((X + WIN_W) * SS + ox), int((Y + WIN_H) * SS + oy)],
        radius=radius, fill=(shade, shade, shade + 2, 255),
    )
canvas = Image.alpha_composite(canvas, thick)

layer = win.convert("RGBA")
layer.putalpha(mask)
canvas.alpha_composite(layer, (X * SS, Y * SS))

light = Image.new("RGBA", win.size, (0, 0, 0, 0))
ld = ImageDraw.Draw(light)
for i in range(int(120 * SS)):
    a = int(14 * (1 - i / (120 * SS)) ** 2)
    ld.line([(0, i), (win.size[0], i)], fill=(255, 255, 255, a))
light.putalpha(Image.fromarray(np.minimum(np.asarray(light.split()[3]), np.asarray(mask)), "L"))
canvas.alpha_composite(light, (X * SS, Y * SS))

edge = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
ed = ImageDraw.Draw(edge)
ed.rounded_rectangle(
    [int(X * SS), int(Y * SS), int((X + WIN_W) * SS) - 1, int((Y + WIN_H) * SS) - 1],
    radius=radius, outline=(255, 255, 255, 42), width=max(1, SS),
)
for i in range(2 * SS):
    ed.line(
        [(int(X * SS) + 10 * SS, int(Y * SS) + i + 1), (int((X + WIN_W) * SS) - 10 * SS, int(Y * SS) + i + 1)],
        fill=(255, 255, 255, 100 - i * 24), width=1,
    )
canvas = Image.alpha_composite(canvas, edge)

# ---------------------------------------------------------------- type
d2 = ImageDraw.Draw(canvas)

d2.text((58 * SS, 92 * SS), "PICKCAT", font=F(F_LATIN, 26), fill=(*TEXT, 255), anchor="ls")
wb = d2.textlength("PICKCAT", font=F(F_LATIN, 26)) / SS
d2.text((58 * SS + wb * SS + 12 * SS, 92 * SS), "社区客户端", font=F(F_CJK, 20), fill=(*MUTED, 255), anchor="ls")

f_big = F(F_LATIN, 108)
f_cjk = F(F_CJK_B, 100)
d2.text((52 * SS, 232 * SS), "WinUI 3", font=f_big, fill=(*ACCENT, 255), anchor="ls")
d2.text((52 * SS, 348 * SS), "重制", font=f_cjk, fill=(*TEXT, 255), anchor="ls")

d2.rounded_rectangle([54 * SS, 384 * SS, 190 * SS, 389 * SS], radius=3 * SS, fill=(*ACCENT, 255))
d2.text((54 * SS, 428 * SS), "用 WinUIonWeb 从零重写", font=F(F_CJK, 24), fill=(*MUTED, 255), anchor="ls")
d2.text((54 * SS, 466 * SS), "不是换皮，是重做整个窗口", font=F(F_CJK, 24), fill=(*MUTED, 255), anchor="ls")

d2.text((1150 * SS, 92 * SS), "v0.1.0", font=F(F_LATIN, 22), fill=(*MUTED, 255), anchor="ra")

grain = np.random.default_rng(5).normal(0, 4.2, (CH, CW, 1)).repeat(3, axis=2)
arr = np.asarray(canvas.convert("RGB"), dtype=np.float32) + grain
canvas = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")

os.makedirs("docs/promo", exist_ok=True)
canvas.resize((W, H), Image.LANCZOS).save(OUT, quality=95)
canvas.resize((1600, 900), Image.LANCZOS).save(OUT.replace(".png", "@1600.png"), quality=95)
print("saved", OUT)
