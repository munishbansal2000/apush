#!/usr/bin/env python3
"""Motion-graphics engine for APUSH explainer videos (MoviePy + PIL).

Scene primitives (all 1080x1920 vertical):
  kb_scene(img, dur, ...)      Ken Burns pan/zoom over a full-bleed image
  caption_scene(img, text, dur) kb_scene + caption bar sliding up from bottom
  title_scene(title, sub, dur)  animated title card over image
  slide_scene(pil_img, dur)     static presentation slide (from render_markup)
  assemble(scenes, audios, out) concat with crossfades, mix per-scene narration

Text is rendered with PIL (bundled DejaVu) -> ImageClip overlays; no
ImageMagick needed.
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy import (AudioFileClip, CompositeVideoClip, ImageClip,
                     concatenate_videoclips)
from moviepy.video.fx import FadeIn

W, H = 1080, 1920
HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "fonts")
FB = os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")
FR = os.path.join(FONT_DIR, "DejaVuSans.ttf")


def font(path, size):
    return ImageFont.truetype(path, size)


def wrap_px(draw, text, fnt, max_px):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= max_px or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def text_rgba(text, fnt, fill=(255, 255, 255, 255), max_w=940, line_pad=12):
    tmp = Image.new("RGBA", (10, 10))
    d = ImageDraw.Draw(tmp)
    lines = wrap_px(d, text, fnt, max_w)
    ws = [d.textlength(l, font=fnt) for l in lines]
    asc, desc = fnt.getmetrics()
    lh = asc + desc + line_pad
    img = Image.new("RGBA", (int(max(ws)) + 20, lh * len(lines) + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    y = 10
    for l in lines:
        d.text((10, y), l, font=fnt, fill=fill)
        y += lh
    return img


def scrim(h=700):
    """Bottom gradient scrim for caption legibility."""
    g = Image.new("L", (1, h))
    for y in range(h):
        g.putpixel((0, y), int(200 * (y / h) ** 1.6))
    g = g.resize((W, h))
    rgb = Image.new("RGBA", (W, h), (0, 0, 0, 255))
    rgb.putalpha(g)
    return rgb


def kb_scene(img_path, dur, zoom=0.14, pan_x=0.5, pan_y=0.5):
    """Full-bleed Ken Burns: image scaled to cover, slow zoom + drift.

    pan_x/pan_y in [0,1]: where the crop window drifts toward (0.5 = center).
    """
    img = Image.open(img_path).convert("RGB")
    # cover 1080x1920
    scale = max(W / img.width, H / img.height)
    img = img.resize((int(img.width * scale) + 2, int(img.height * scale) + 2),
                     Image.LANCZOS)
    base = np.asarray(img).astype(np.float32)

    def frame(t):
        z = 1 + zoom * (t / dur)
        cw, ch = W / z, H / z
        max_x = base.shape[1] - cw
        max_y = base.shape[0] - ch
        # drift the crop window from center toward the pan target
        cx = max_x * (0.5 + (pan_x - 0.5) * (t / dur))
        cy = max_y * (0.5 + (pan_y - 0.5) * (t / dur))
        cx = min(max(cx, 0), max_x)
        cy = min(max(cy, 0), max_y)
        crop = base[int(cy):int(cy + ch), int(cx):int(cx + cw)]
        return np.asarray(Image.fromarray(crop.astype(np.uint8)).resize((W, H), Image.LANCZOS))

    from moviepy import VideoClip
    return VideoClip(frame, duration=dur)


def overlay_text(base, text, fnt_path, size, dur, y_pos=None, slide=140, fill=(255, 255, 255, 255)):
    """Slide-up + fade text overlay over a base clip."""
    fnt = font(fnt_path, size)
    timg = text_rgba(text, fnt, fill=fill)
    tw, th = timg.size
    y_final = H - th - 160 if y_pos is None else y_pos
    x = (W - tw) // 2
    tc = ImageClip(np.asarray(timg)).with_duration(dur)
    tc = tc.with_position(lambda t: (x, y_final + slide * max(0, 1 - t / 0.6)))
    tc = tc.with_effects([FadeIn(0.5)])
    return CompositeVideoClip([base, tc], size=(W, H)).with_duration(dur)


def caption_scene(img_path, caption, dur, **kb_kw):
    base = kb_scene(img_path, dur, **kb_kw)
    sc = ImageClip(np.asarray(scrim())).with_duration(dur).with_position((0, H - 700))
    sc = sc.with_opacity(0.85)
    with_scrim = CompositeVideoClip([base, sc], size=(W, H)).with_duration(dur)
    return overlay_text(with_scrim, caption, FR, 44, dur)


def title_scene(img_path, title, sub, dur):
    base = kb_scene(img_path, dur, zoom=0.08)
    # darken whole frame a bit
    dark = ImageClip(np.asarray(Image.new("RGBA", (W, H), (0, 0, 0, 110)))).with_duration(dur)
    comp = CompositeVideoClip([base, dark], size=(W, H)).with_duration(dur)
    # title with fade-in
    fnt = font(FB, 92)
    timg = text_rgba(title, fnt, fill=(233, 196, 106, 255))
    tw, th = timg.size
    tc = ImageClip(np.asarray(timg)).with_duration(dur)
    tc = tc.with_position(("center", H // 2 - th))
    tc = tc.with_effects([FadeIn(0.6)])
    comp = CompositeVideoClip([comp, tc], size=(W, H)).with_duration(dur)
    if sub:
        comp = overlay_text(comp, sub, FR, 40, dur, y_pos=H // 2 + 60)
    return comp


def slide_scene(pil_img, dur):
    if pil_img.size != (W, H):
        pil_img = pil_img.resize((W, H), Image.LANCZOS)
    return ImageClip(np.asarray(pil_img.convert("RGB"))).with_duration(dur)


def kinetic_text(phrase, dur, sub=None, color=(233, 196, 106, 255)):
    """Big phrase slamming in with a scale pop, over dark background."""
    from moviepy import VideoClip
    bg = np.zeros((H, W, 3), dtype=np.uint8) + 18
    fnt = font(FB, 120)
    timg = text_rgba(phrase, fnt, fill=color, max_w=980)
    tw, th = timg.size

    def frame(t):
        # scale pop: overshoot then settle
        s = min(1, t / 0.45)
        pop = 1 + 0.25 * max(0, 1 - s * 2.2) * (1 - s)
        sc = int(tw * pop), int(th * pop)
        fg = np.asarray(timg.resize(sc, Image.LANCZOS))
        canvas = bg.copy()
        x, y = (W - sc[0]) // 2, (H - sc[1]) // 2 - 40
        # alpha blend
        a = (fg[:, :, 3:4].astype(np.float32) / 255.0)
        a = a * min(1, t / 0.3)
        canvas[y:y + sc[1], x:x + sc[0]] = (
            fg[:, :, :3] * a + canvas[y:y + sc[1], x:x + sc[0]] * (1 - a)).astype(np.uint8)
        return canvas

    clip = VideoClip(frame, duration=dur)
    if sub:
        clip = overlay_text(clip, sub, FR, 40, dur, y_pos=H // 2 + 160)
    return clip


def timeline_scene(events, dur, title=""):
    """Horizontal timeline; event dots + labels pop in sequence.

    events: list of (label, caption). Dots appear evenly across dur.
    """
    from moviepy import VideoClip
    img = Image.new("RGB", (W, H), (20, 22, 29))
    d = ImageDraw.Draw(img)
    if title:
        d.text((80, 120), title, font=font(FB, 56), fill=(233, 196, 106))
    y0 = H // 2
    d.line([(100, y0), (W - 100, y0)], fill=(90, 95, 110), width=8)
    base = np.asarray(img)
    n = len(events)
    lf = font(FB, 40)
    cf = font(FR, 34)

    def frame(t):
        canvas = Image.fromarray(base.copy())
        d2 = ImageDraw.Draw(canvas)
        for i, (label, cap) in enumerate(events):
            at = (i + 1) / (n + 1) * dur * 0.85
            if t < at:
                continue
            x = 100 + (W - 200) * (i + 1) / (n + 1)
            # pop scale
            s = min(1, (t - at) / 0.3)
            r = int(22 * (0.5 + 0.5 * s))
            d2.ellipse([x - r, y0 - r, x + r, y0 + r], fill=(233, 196, 106))
            # alternate labels above/below to avoid collisions
            above = (i % 2 == 0)
            lab_lines = wrap_px(d2, label, lf, 260)
            cap_lines = wrap_px(d2, cap, cf, 260)
            if above:
                yy = y0 - 110
                for j, line in enumerate(lab_lines):
                    d2.text((x, yy - j * 52), line, font=lf,
                            fill=(255, 255, 255), anchor="ma")
                yy = y0 - 110 - len(lab_lines) * 52 - 10
                for j, line in enumerate(cap_lines):
                    d2.text((x, yy - j * 44), line, font=cf,
                            fill=(160, 166, 180), anchor="ma")
            else:
                yy = y0 + 80
                for j, line in enumerate(lab_lines):
                    d2.text((x, yy + j * 52), line, font=lf,
                            fill=(255, 255, 255), anchor="ma")
                yy = y0 + 80 + len(lab_lines) * 52 + 10
                for j, line in enumerate(cap_lines):
                    d2.text((x, yy + j * 44), line, font=cf,
                            fill=(160, 166, 180), anchor="ma")
        return np.asarray(canvas)

    return VideoClip(frame, duration=dur)


def cuba_map_scene(dur, caption=""):
    """Original stylized map: Florida, Cuba, and the 90-mile gap. Route draws itself."""
    from moviepy import VideoClip
    img = Image.new("RGB", (W, H), (16, 28, 44))
    d = ImageDraw.Draw(img)
    # stylized Florida peninsula (upper area)
    d.polygon([(600, 620), (700, 640), (680, 1050), (590, 1030)], fill=(60, 90, 70))
    d.text((470, 540), "FLORIDA", font=font(FB, 40), fill=(200, 210, 220))
    # stylized Cuba (lower area)
    cuba = [(150, 1300), (900, 1270), (930, 1380), (170, 1420)]
    d.polygon(cuba, fill=(140, 60, 50))
    d.text((400, 1470), "CUBA", font=font(FB, 48), fill=(255, 255, 255))
    base = np.asarray(img)
    mf = font(FB, 44)

    def frame(t):
        canvas = Image.fromarray(base.copy())
        d2 = ImageDraw.Draw(canvas)
        # draw the gap line growing
        p = min(1, t / (dur * 0.6))
        x1, y1, x2, y2 = 635, 1030, 615, 1270
        xe, ye = x1 + (x2 - x1) * p, y1 + (y2 - y1) * p
        d2.line([(x1, y1), (xe, ye)], fill=(233, 196, 106), width=10)
        if p >= 1:
            d2.text((680, 1120), "90 MILES", font=mf, fill=(233, 196, 106))
            # pulsing missile dot on Cuba
            import math
            r = 26 + int(8 * math.sin(t * 6))
            d2.ellipse([540 - r, 1340 - r, 540 + r, 1340 + r], fill=(255, 80, 60))
            d2.text((400, 1560), "Soviet missiles here,", font=font(FR, 36), fill=(255, 255, 255))
            d2.text((400, 1608), "1962", font=font(FR, 36), fill=(255, 255, 255))
        return np.asarray(canvas)

    clip = VideoClip(frame, duration=dur)
    if caption:
        clip = overlay_text(clip, caption, FR, 40, dur)
    return clip


def doc_zoom(img_path, dur, highlight_box=None, caption="", zoom=0.35):
    """Slow push-in on a document/photo; optional highlight box fades in on the key area.

    highlight_box: (x0, y0, x1, y1) in 0..1 relative coords of the final frame.
    """
    from moviepy import VideoClip
    img = Image.open(img_path).convert("RGB")
    scale = max(W / img.width, H / img.height)
    img = img.resize((int(img.width * scale) + 2, int(img.height * scale) + 2), Image.LANCZOS)
    base = np.asarray(img).astype(np.float32)
    hb = None
    if highlight_box:
        x0, y0, x1, y1 = highlight_box
        hb = (int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H))

    def frame(t):
        z = 1 + zoom * (t / dur)
        cw, ch = W / z, H / z
        max_x = base.shape[1] - cw
        max_y = base.shape[0] - ch
        cx = max_x * 0.5
        cy = max_y * 0.4
        crop = base[int(cy):int(cy + ch), int(cx):int(cx + cw)]
        out = Image.fromarray(crop.astype(np.uint8)).resize((W, H), Image.LANCZOS)
        if hb:
            a = min(1, max(0, (t - dur * 0.35) / 0.8))
            if a > 0:
                d = ImageDraw.Draw(out, "RGBA")
                d.rectangle(hb, outline=(233, 196, 106, int(255 * a)), width=10)
        return np.asarray(out)

    clip = VideoClip(frame, duration=dur)
    if caption:
        clip = overlay_text(clip, caption, FR, 40, dur)
    return clip


def assemble(scenes, audios, out, fps=30):
    """Concat scenes with 0.35s crossfades; each scene gets its narration audio."""
    assert len(scenes) == len(audios)
    final = concatenate_videoclips(scenes, method="compose",
                                  padding=-0.35)  # crossfade overlap
    # per-scene audio placed at scene start times (accounting for overlaps)
    from moviepy import CompositeAudioClip
    t, tracks = 0.0, []
    for sc, au in zip(scenes, audios):
        a = AudioFileClip(au).with_start(t)
        # pad/trim scene audio to scene visual duration
        tracks.append(a)
        t += sc.duration - 0.35
    audio = CompositeAudioClip(tracks).with_duration(final.duration)
    final = final.with_audio(audio)
    final.write_videofile(out, fps=fps, codec="libx264", audio_codec="aac",
                          preset="medium", threads=4, logger=None)
    return out
