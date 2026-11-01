"""Renders the intro / outro cards for the promo video (1440x900, matches the capture)."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1440, 900
SS = 2
CW, CH = W * SS, H * SS
OUT = "video/cards"
os.makedirs(OUT, exist_ok=True)

F_LATIN = "C:/Windows/Fonts/segoeuib.ttf"
F_CJK_B = "C:/Windows/Fonts/msyhbd.ttc"
F_CJK = "C:/Windows/Fonts/msyh.ttc"

ACCENT = (255, 107, 96)
TEXT = (247, 247, 250)
MUTED = (150, 150, 160)


def F(path, size):
    return ImageFont.truetype(path, int(size * SS))


def radial(cx, cy, radius, color, strength):
    yy, xx = np.mgrid[0:CH, 0:CW]
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / radius
    falloff = np.clip(1 - dist, 0, 1) ** 2.4 * strength
    layer = np.zeros((CH, CW, 4), dtype=np.float32)
    layer[..., 0], layer[..., 1], layer[..., 2] = color
    layer[..., 3] = falloff * 255
    return Image.fromarray(layer.astype(np.uint8), "RGBA")


def base():
    bg = Image.new("RGB", (CW, CH))
    d = ImageDraw.Draw(bg)
    for y in range(CH):
        t = y / CH
        d.line([(0, y), (CW, y)], fill=(int(9 + 11 * t), int(9 + 11 * t), int(12 + 14 * t)))
    canvas = bg.convert("RGBA")
    canvas = Image.alpha_composite(canvas, radial(int(CW * 0.5), int(CH * 1.05), int(CW * 0.75), ACCENT, 0.30))
    canvas = Image.alpha_composite(canvas, radial(int(CW * 0.12), int(CH * 0.05), int(CW * 0.4), (92, 146, 255), 0.14))

    yy, xx = np.mgrid[0:CH, 0:CW]
    nx, ny = (xx / CW - 0.5) * 2, (yy / CH - 0.5) * 2
    vign = np.clip(1 - (nx**2 * 0.42 + ny**2 * 0.5), 0, 1) ** 0.9
    v = np.zeros((CH, CW, 4), dtype=np.float32)
    v[..., 3] = (1 - vign) * 120
    return Image.alpha_composite(canvas, Image.fromarray(v.astype(np.uint8), "RGBA"))


def centered(draw, y, text, font, fill):
    w = draw.textlength(text, font=font)
    draw.text(((CW - w) / 2, y * SS), text, font=font, fill=fill)


# ---------------------------------------------------------------- intro
intro = base()
d = ImageDraw.Draw(intro)
centered(d, 268, "PICKCAT", F(F_LATIN, 40), (*MUTED, 255))

f1 = F(F_LATIN, 116)
f2 = F(F_CJK_B, 110)
w1 = d.textlength("WinUI 3", font=f1)
w2 = d.textlength("重制", font=f2)
start = (CW - (w1 + 28 * SS + w2)) / 2
d.text((start, 352 * SS), "WinUI 3", font=f1, fill=(*ACCENT, 255))
d.text((start + w1 + 28 * SS, 352 * SS), "重制", font=f2, fill=(*TEXT, 255))

bar_w = 260 * SS
d.rounded_rectangle([(CW - bar_w) / 2, 520 * SS, (CW + bar_w) / 2, 525 * SS], radius=3 * SS, fill=(*ACCENT, 255))
centered(d, 566, "不是换皮，是重写整个窗口", F(F_CJK, 36), (*TEXT, 235))
centered(d, 624, "用 WinUIonWeb 从零重构的 PickCat 客户端", F(F_CJK, 26), (*MUTED, 255))

intro_rgb = intro.convert("RGB")
intro_rgb.save(f"{OUT}/intro.png")


# ---------------------------------------------------------------- outro
outro = base()
d = ImageDraw.Draw(outro)
centered(d, 300, "PickCat · WinUI 3 Edition", F(F_CJK_B, 64), (*TEXT, 255))
centered(d, 404, "Chrome 扩展 · 只在 pickcat.dao3.fun 生效", F(F_CJK, 28), (*MUTED, 255))

items = [
    "18 个原生 WinUI 控件",
    "245 个接口",
    "页面过渡 / 右键菜单 / Markdown 编辑器",
]
y = 500
for item in items:
    w = d.textlength(item, font=F(F_CJK, 26))
    d.rounded_rectangle([(CW - w) / 2 - 34 * SS, (y - 6) * SS, (CW - w) / 2 - 18 * SS, (y + 20) * SS], radius=2 * SS, fill=(*ACCENT, 200))
    d.text(((CW - w) / 2, y * SS), item, font=F(F_CJK, 26), fill=(*TEXT, 220))
    y += 54

outro.convert("RGB").save(f"{OUT}/outro.png")
print("saved cards")
