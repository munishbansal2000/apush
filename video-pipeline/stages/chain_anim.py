#!/usr/bin/env python3
"""Generic per-frame animated node chain.

Nodes fade/rise in at deterministic reveal times; arrows draw progressively.
Background: blurred slow-zoom image (never a flat black slide).

CLI:
  chain_anim.py <out_mp4> <bg_image> <dur> <nodes_json> <reveals_json>
                [kicker] [caption] [subject] [tag]

nodes_json / reveals_json are JSON arrays; len(reveals) == len(nodes).
"""
import os
import sys
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1920, 1080, 30


def font(p, s):
    try:
        return ImageFont.truetype(p, s)
    except OSError:
        return ImageFont.load_default()


SERIF = "/usr/share/fonts/truetype/noto/NotoSerif-Condensed.ttf"
SANS = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
SANSB = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"
GOLD = (217, 164, 65)
INK = (250, 246, 236)


def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def main():
    (out, bg_path, dur_s, nodes_j, reveals_j,
     kicker, caption, subject, tag) = (sys.argv[1:10] + [""] * 9)[:9]
    dur = float(dur_s)
    nodes = json.loads(nodes_j)
    reveals = [float(x) for x in json.loads(reveals_j)]
    assert len(nodes) == len(reveals) and len(nodes) >= 2
    n = len(nodes)

    F_NODE = font(SANSB, 44 if n <= 4 else 36)
    F_KICK = font(SANSB, 30)
    F_FOOT = font(SANS, 24)

    bg = Image.open(bg_path).convert("RGB")
    bg = bg.resize((2304, 1296), Image.LANCZOS)
    bg = bg.filter(ImageFilter.GaussianBlur(22))
    dark = Image.new("RGB", bg.size, (8, 10, 15))
    bg = Image.blend(bg, dark, 0.55)

    # layout: nodes spread across 90..1830 with arrow gaps
    margin, gap = 90, 100
    nw = int((W - 2 * margin - (n - 1) * gap) / n)
    nh = 150
    xs = [margin + i * (nw + gap) for i in range(n)]
    yc = 500

    nfr = int(round(dur * FPS))
    proc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-framerate", str(FPS), "-i", "-",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", out],
        stdin=subprocess.PIPE)

    for fi in range(nfr):
        t = fi / FPS
        zoom = 1.0 + 0.05 * (fi / max(nfr - 1, 1))
        cw, ch = int(1920 * zoom), int(1080 * zoom)
        fr = bg.resize((cw, ch), Image.LANCZOS)
        ox, oy = (cw - 1920) // 2, (ch - 1080) // 2
        img = fr.crop((ox, oy, ox + 1920, oy + 1080))
        dr = ImageDraw.Draw(img, "RGBA")
        dr.text((90, 44), "APUSH AUDIO", font=F_KICK, fill=GOLD)
        if kicker:
            dr.text((90, 88), kicker, font=font(SANS, 26), fill=(139, 147, 163))
        for i, name in enumerate(nodes):
            a = ease((t - reveals[i]) / 0.5)
            if a <= 0:
                continue
            rise = int(26 * (1 - a))
            x0, y0 = xs[i], yc - nh // 2 + rise
            x1, y1 = x0 + nw, y0 + nh
            lit = int(255 * a)
            dr.rounded_rectangle([x0, y0, x1, y1], 18,
                                 fill=(20, 25, 34, int(215 * a)),
                                 outline=(*GOLD, lit), width=3)
            tw = dr.textlength(name, font=F_NODE)
            dr.text((x0 + (nw - tw) / 2, y0 + 44), name, font=F_NODE,
                    fill=(*INK, lit))
            if i < n - 1:
                ap = ease((t - reveals[i] - 0.35) / 0.45)
                if ap > 0:
                    ax0, ax1 = x1 + 12, xs[i + 1] - 12
                    amx = ax0 + (ax1 - ax0) * ap
                    ay = yc + rise // 2
                    dr.line([ax0, ay, amx, ay], fill=(*GOLD, int(255 * ap)), width=6)
                    if ap >= 1:
                        dr.polygon([(ax1, ay), (ax1 - 22, ay - 13), (ax1 - 22, ay + 13)],
                                   fill=(*GOLD, 255))
        if caption and t > reveals[-1] + 0.8:
            ca = ease((t - reveals[-1] - 0.8) / 0.8)
            dr.text((90, 760), caption,
                    font=font(SANS, 36), fill=(185, 192, 205, int(255 * ca)))
        dr.text((90, H - 70), subject, font=F_FOOT, fill=(93, 101, 117))
        dr.text((W - 90 - dr.textlength(tag, font=F_FOOT), H - 70), tag,
                font=F_FOOT, fill=(93, 101, 117))
        proc.stdin.write(img.convert("RGB").tobytes())
        if fi % 150 == 0:
            print(f"chain frame {fi}/{nfr}", flush=True)
    proc.stdin.close()
    proc.wait()
    print("chain_anim done", flush=True)


if __name__ == "__main__":
    main()
