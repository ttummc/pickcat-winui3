"""Assembles intro + screencast + outro into a 30 fps MP4 using ffmpeg."""
import json
import os
import shutil
import subprocess
from PIL import Image

FPS = 30
W, H = 1440, 900
SEQ = "video/seq"
FRAMES = "video/frames"
OUT = "docs/promo/pickcat-promo.mp4"
FFMPEG = "vendor/ffmpeg/ffmpeg-master-latest-win64-lgpl/bin/ffmpeg.exe"

INTRO_HOLD = 2.6
OUTRO_HOLD = 3.0

os.makedirs("docs/promo", exist_ok=True)
shutil.rmtree(SEQ, ignore_errors=True)
os.makedirs(SEQ, exist_ok=True)

meta = json.load(open("video/index.json", encoding="utf-8"))
frames = meta["frames"]
duration = frames[-1]["ts"] / 1000.0
print(f"capture: {len(frames)} frames / {duration:.1f}s")

timeline = []  # (source path, repeat count)

intro_count = int(INTRO_HOLD * FPS)
timeline.append(("video/cards/intro.png", intro_count))

demo_count = int(round(duration * FPS))
# hold each captured frame until the next one arrives -> constant 30 fps
idx = 0
for out_i in range(demo_count):
    t_ms = (out_i / FPS) * 1000.0
    while idx + 1 < len(frames) and frames[idx + 1]["ts"] <= t_ms:
        idx += 1
    path = os.path.join(FRAMES, f"{frames[idx]['i']:05d}.jpg")
    if timeline and timeline[-1][0] == path:
        timeline[-1] = (path, timeline[-1][1] + 1)
    else:
        timeline.append((path, 1))

timeline.append(("video/cards/outro.png", int(OUTRO_HOLD * FPS)))

n = 0
for path, count in timeline:
    img = Image.open(path).convert("RGB")
    if img.size != (W, H):
        img = img.resize((W, H), Image.LANCZOS)
    for _ in range(count):
        img.save(os.path.join(SEQ, f"{n:05d}.jpg"), quality=92)
        n += 1

total = n / FPS
print(f"sequence: {n} frames / {total:.1f}s")

fade_out = max(0.0, total - 0.6)
cmd = [
    FFMPEG, "-y", "-framerate", str(FPS), "-i", os.path.join(SEQ, "%05d.jpg"),
    "-vf", f"fade=t=in:st=0:d=0.5,fade=t=out:st={fade_out:.2f}:d=0.6,format=yuv420p",
    "-c:v", "libopenh264", "-b:v", "9M", "-maxrate", "14M", "-bufsize", "18M", "-movflags", "+faststart",
    OUT,
]
print("encoding…")
subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

size = os.path.getsize(OUT) / 1024 / 1024
print(f"saved {OUT}  {size:.1f} MB  {total:.1f}s")

# small looping GIF for quick sharing
gif_frames = min(n, 300)
gif_cmd = [
    FFMPEG, "-y", "-framerate", str(FPS), "-i", os.path.join(SEQ, "%05d.jpg"),
    "-vf", "fps=12,scale=720:-1:flags=lanczos", "-t", "12",
    "docs/promo/pickcat-promo.gif",
]
subprocess.run(gif_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print("saved docs/promo/pickcat-promo.gif")
