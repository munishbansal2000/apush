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
