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

BASE_W, BASE_H = 1080, 1920  # design resolution; all layout math is authored here
W, H = BASE_W, BASE_H
SCALE = 1.0  # preview mode lowers this via set_scale(); default = final


def set_scale(s):
    """Render at a fraction of design resolution (e.g. 2/3 for 720x1280).

    Scales W/H, font sizes, and every absolute-pixel layout constant (via
    px()), so preview composition matches final proportionally. Default
    SCALE=1.0 keeps the final path bit-identical.
    """
    global SCALE, W, H
    SCALE = float(s)
    W, H = int(BASE_W * SCALE), int(BASE_H * SCALE)


def px(n):
    """Scale an absolute design-pixel constant for the current resolution."""
    return int(n * SCALE)


def font(path, size):
    return ImageFont.truetype(path, max(1, px(size)))


HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "fonts")
FB = os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")
FR = os.path.join(FONT_DIR, "DejaVuSans.ttf")


# ------------------------------------------------- plan recorder
# When a PlanRecorder is active, text primitives record their SETTLED
# bounding boxes + active time intervals instead of only rendering. The
# video validator runs stage builders under a recorder for its
# TEXT-COLLISION and CAMERA-DIRECTION gates. Transient entrance motion
# (slide-ups, spring pops <0.6s) is ignored: boxes are the settled layout.
_PLAN = None


class PlanRecorder:
    """Context manager collecting primitive usage + text boxes per stage."""

    def __init__(self):
        self.prims = []   # primitive names called, in order
        self.boxes = []   # dicts: kind, text, box, t0, t1

    def __enter__(self):
        global _PLAN
        self._prev = _PLAN
        _PLAN = self
        return self

    def __exit__(self, *exc):
        global _PLAN
        _PLAN = self._prev
        return False


def _note_prim(name):
    if _PLAN is not None:
        _PLAN.prims.append(name)


def _note_box(kind, text, box, t0, t1):
    if _PLAN is not None:
        x0, y0, x1, y1 = box
        _PLAN.boxes.append({"kind": kind, "text": str(text)[:60],
                            "box": (int(x0), int(y0), int(x1), int(y1)),
                            "t0": float(t0), "t1": float(t1)})


def wrap_px(draw, text, fnt, max_px):
    max_px = px(max_px)
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
    # wrap_px() scales max_w internally; scale only the padding here
    line_pad = px(line_pad)
    tmp = Image.new("RGBA", (10, 10))
    d = ImageDraw.Draw(tmp)
    lines = wrap_px(d, text, fnt, max_w)
    ws = [d.textlength(l, font=fnt) for l in lines]
    asc, desc = fnt.getmetrics()
    lh = asc + desc + line_pad
    img = Image.new("RGBA", (int(max(ws)) + px(20), lh * len(lines) + px(20)),
                    (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    y = px(10)
    for l in lines:
        d.text((px(10), y), l, font=fnt, fill=fill)
        y += lh
    return img


def scrim(h=None):
    """Bottom gradient scrim for caption legibility."""
    h = px(700) if h is None else h
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
    _note_prim("kb_scene")
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


def overlay_text(base, text, fnt_path, size, dur, y_pos=None, slide=None, fill=(255, 255, 255, 255)):
    """Slide-up + fade text overlay over a base clip."""
    if not text or not text.strip():
        return base  # no caption -> no overlay (an empty overlay is a crash, not a look)
    fnt = font(fnt_path, size)
    timg = text_rgba(text, fnt, fill=fill)
    tw, th = timg.size
    y_final = H - th - px(160) if y_pos is None else y_pos
    x = (W - tw) // 2
    slide = px(140) if slide is None else slide
    _note_prim("overlay_text")
    _note_box("overlay", text, (x, y_final, x + tw, y_final + th), 0, dur)
    tc = ImageClip(np.asarray(timg)).with_duration(dur)
    tc = tc.with_position(lambda t: (x, y_final + slide * max(0, 1 - t / 0.6)))
    tc = tc.with_effects([FadeIn(0.5)])
    return CompositeVideoClip([base, tc], size=(W, H)).with_duration(dur)


def caption_scene(img_path, caption, dur, **kb_kw):
    _note_prim("caption_scene")
    base = kb_scene(img_path, dur, **kb_kw)
    sc = ImageClip(np.asarray(scrim())).with_duration(dur).with_position((0, H - px(700)))
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
    _note_prim("title_scene")
    _note_box("title", title, ((W - tw) // 2, H // 2 - th,
                               (W + tw) // 2, H // 2), 0, dur)
    tc = ImageClip(np.asarray(timg)).with_duration(dur)
    tc = tc.with_position(("center", H // 2 - th))
    tc = tc.with_effects([FadeIn(0.6)])
    comp = CompositeVideoClip([comp, tc], size=(W, H)).with_duration(dur)
    if sub:
        comp = overlay_text(comp, sub, FR, 40, dur, y_pos=H // 2 + px(60))
    return comp


def slide_scene(pil_img, dur):
    if pil_img.size != (W, H):
        pil_img = pil_img.resize((W, H), Image.LANCZOS)
    return ImageClip(np.asarray(pil_img.convert("RGB"))).with_duration(dur)


def ease_out_back(t):
    """Overshoot easing: slams past 1.0 then settles. t in 0..1."""
    c1, c3 = 1.70158, 2.70158
    t = min(1, max(0, t))
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2


def ease_out_cubic(t):
    t = min(1, max(0, t))
    return 1 - (1 - t) ** 3


def punch_in(clip, amount=0.07, dur=0.5):
    """Quick zoom punch at scene start: 1+amount -> 1.0 with ease-out.

    The modern 'punch cut' feel. Replaces soft fade-ins.
    """
    from moviepy import VideoClip
    _note_prim("punch_in")
    base_dur = clip.duration

    def make_frame(t):
        k = 1 - ease_out_cubic(t / dur)
        z = 1 + amount * k
        fr = clip.get_frame(t)
        h, w = fr.shape[:2]
        nw, nh = int(w * z), int(h * z)
        big = np.asarray(Image.fromarray(fr).resize((nw, nh), Image.LANCZOS))
        x0, y0 = (nw - w) // 2, (nh - h) // 2
        return big[y0:y0 + h, x0:x0 + w]

    def frame(t):
        if t < dur:
            return make_frame(t)
        return clip.get_frame(t)

    return VideoClip(frame, duration=base_dur)


DARKEN_MAX = 80  # Defect-2 fix (2026-10-02): backgrounds must stay visible.


def _bg_base(bg_img, darken=110):
    """Cover-crop an image to W×H and darken it for text overlay.

    darken is clamped to DARKEN_MAX: crushing the background until it reads
    as a black screen violates the no-blank-screen rule. For legibility,
    prefer a scrim band behind the text (see scrim_band) over heavier
    full-frame darkening.
    """
    darken = max(0, min(darken, DARKEN_MAX))
    img = Image.open(bg_img).convert("RGB")
    scale = max(W / img.width, H / img.height)
    img = img.resize((int(img.width * scale) + 2, int(img.height * scale) + 2),
                     Image.LANCZOS)
    arr = np.asarray(img).astype(np.float32)
    x0 = (arr.shape[1] - W) // 2
    y0 = (arr.shape[0] - H) // 2
    crop = arr[y0:y0 + H, x0:x0 + W]
    out = np.clip(crop - darken, 0, 255).astype(np.uint8)
    return out


def scrim_band(arr, y0, y1, strength=0.5):
    """Darken a horizontal band of an RGB frame: legibility without crushing.

    Multiplicative band (strength 0..1) behind a text region. Background
    texture stays visible everywhere else, unlike full-frame darkening.
    Prefer this behind text blocks (Defect-2 fix, 2026-10-02).
    """
    out = arr.astype(np.float32)
    out[int(y0):int(y1)] *= (1.0 - strength)
    return np.clip(out, 0, 255).astype(np.uint8)


def _blit_center(canvas, fg, cx, cy):
    """Alpha-blend an RGBA tile centered at (cx, cy) onto an RGB canvas.

    Clips safely at frame edges. Spring-overshoot scales (ease_out_back)
    can push tiles past the frame for a few frames; naive numpy slicing
    then silently mis-slices and crashes on shape mismatch -- this was a
    real render crash (2026-10-02).
    """
    fh, fw = fg.shape[:2]
    ch, cw = canvas.shape[:2]
    x0, y0 = int(cx - fw / 2), int(cy - fh / 2)
    dx0, dy0 = max(0, x0), max(0, y0)
    dx1, dy1 = min(cw, x0 + fw), min(ch, y0 + fh)
    if dx1 <= dx0 or dy1 <= dy0:
        return canvas
    sx0, sy0 = dx0 - x0, dy0 - y0
    src = fg[sy0:sy0 + (dy1 - dy0), sx0:sx0 + (dx1 - dx0)]
    a = src[:, :, 3:4].astype(np.float32) / 255.0
    dst = canvas[dy0:dy1, dx0:dx1].astype(np.float32)
    canvas[dy0:dy1, dx0:dx1] = (src[:, :, :3] * a + dst * (1 - a)).astype(np.uint8)
    return canvas


def kinetic_text(phrase, dur, sub=None, color=(233, 196, 106, 255), bg_img=None,
                 darken=70):
    """Big phrase slamming in with a scale pop, over an image or dark background."""
    from moviepy import VideoClip
    bg = _bg_base(bg_img, darken) if bg_img else np.zeros((H, W, 3), dtype=np.uint8) + 18
    fnt = font(FB, 120)
    timg = text_rgba(phrase, fnt, fill=color, max_w=980)
    tw, th = timg.size
    _note_prim("kinetic_text")
    _note_box("kinetic", phrase, ((W - tw) // 2, (H - th) // 2 - px(40),
                                  (W + tw) // 2, (H + th) // 2 - px(40)), 0, dur)

    def frame(t):
        # spring pop: overshoot then settle
        s = max(0.01, ease_out_back(t / 0.5))
        tw2, th2 = max(1, int(tw * s)), max(1, int(th * s))
        fg = np.asarray(timg.resize((tw2, th2), Image.LANCZOS))
        # fade in over the first 0.25s via the alpha channel
        fade = min(1, t / 0.25)
        if fade < 1:
            fg = fg.copy()
            fg[:, :, 3] = (fg[:, :, 3].astype(np.float32) * fade).astype(np.uint8)
        canvas = _blit_center(bg.copy(), fg, W / 2, H / 2 - px(40))
        return canvas

    clip = VideoClip(frame, duration=dur)
    if sub:
        # sub sits below the phrase, placed from the measured phrase height:
        # a fixed y_pos collides with multi-line phrases (Defect-1 fix).
        clip = overlay_text(clip, sub, FR, 40, dur, y_pos=(H + th) // 2 + px(20))
    return clip


def timeline_scene(events, dur, title="", bg_img=None, darken=70):
    """Horizontal timeline; event dots + labels pop in sequence.

    events: list of (label, caption). Dots appear evenly across dur.
    """
    from moviepy import VideoClip
    y0 = H // 2
    bg0 = (_bg_base(bg_img, darken) if bg_img
           else np.zeros((H, W, 3), dtype=np.uint8) + 20)
    if bg_img is not None:
        # legibility band behind the rail + labels; bg stays visible top/bottom
        bg0 = scrim_band(bg0, y0 - px(330), y0 + px(330), strength=0.45)
    # bake title + rail into the base once
    base_img = Image.fromarray(bg0)
    d = ImageDraw.Draw(base_img)
    if title:
        d.text((px(80), px(120)), title, font=font(FB, 56), fill=(233, 196, 106))
    d.line([(px(100), y0), (W - px(100), y0)], fill=(90, 95, 110), width=px(8))
    base = np.asarray(base_img)
    n = len(events)
    lf = font(FB, 40)
    cf = font(FR, 34)
    _note_prim("timeline_scene")
    if title:
        _note_box("timeline-title", title,
                  (px(80), px(120), px(80) + lf.getlength(title), px(120) + px(72)), 0, dur)
    for i, (label, cap) in enumerate(events):
        at = (i + 1) / (n + 1) * dur * 0.85
        x = px(100) + (W - px(200)) * (i + 1) / (n + 1)
        lab_lines = wrap_px(d, label, lf, 200)
        cap_lines = wrap_px(d, cap, cf, 200)
        lw = max([lf.getlength(l) for l in lab_lines] or [0])
        cw_ = max([cf.getlength(l) for l in cap_lines] or [0])
        w = max(lw, cw_) + px(24)
        if (i % 2 == 0):  # labels above the rail (mirrors frame())
            top = (y0 - px(110) - len(lab_lines) * px(52) - px(10)
                   - (len(cap_lines) - 1) * px(44) - px(40))
            bot = y0 - px(110) + px(14)
        else:             # labels below the rail
            top = y0 + px(80) - px(46)
            bot = (y0 + px(80) + len(lab_lines) * px(52) + px(10)
                   + (len(cap_lines) - 1) * px(44) + px(40))
        _note_box("timeline-event", label,
                  (x - w / 2, top, x + w / 2, bot), at, dur)

    def frame(t):
        canvas = Image.fromarray(base.copy())
        d2 = ImageDraw.Draw(canvas)
        for i, (label, cap) in enumerate(events):
            at = (i + 1) / (n + 1) * dur * 0.85
            if t < at:
                continue
            x = px(100) + (W - px(200)) * (i + 1) / (n + 1)
            # pop scale
            s = min(1, (t - at) / 0.3)
            r = int(px(22) * (0.5 + 0.5 * s))
            d2.ellipse([x - r, y0 - r, x + r, y0 + r], fill=(233, 196, 106))
            # alternate labels above/below to avoid collisions
            above = (i % 2 == 0)
            lab_lines = wrap_px(d2, label, lf, 200)
            cap_lines = wrap_px(d2, cap, cf, 200)
            if above:
                yy = y0 - px(110)
                for j, line in enumerate(lab_lines):
                    d2.text((x, yy - j * px(52)), line, font=lf,
                            fill=(255, 255, 255), anchor="ma")
                yy = y0 - px(110) - len(lab_lines) * px(52) - px(10)
                for j, line in enumerate(cap_lines):
                    d2.text((x, yy - j * px(44)), line, font=cf,
                            fill=(160, 166, 180), anchor="ma")
            else:
                yy = y0 + px(80)
                for j, line in enumerate(lab_lines):
                    d2.text((x, yy + j * px(52)), line, font=lf,
                            fill=(255, 255, 255), anchor="ma")
                yy = y0 + px(80) + len(lab_lines) * px(52) + px(10)
                for j, line in enumerate(cap_lines):
                    d2.text((x, yy + j * px(44)), line, font=cf,
                            fill=(160, 166, 180), anchor="ma")
        return np.asarray(canvas)

    return VideoClip(frame, duration=dur)


def cuba_map_scene(dur, caption=""):
    """Real CIA World Factbook map of Cuba (public domain) with an animated
    '90 miles to Florida' overlay across the Straits of Florida and a pulsing
    marker over the western missile sites."""
    from moviepy import VideoClip
    import math
    bg = Image.new("RGB", (W, H), (16, 28, 44))
    cmap = Image.open(os.path.join(HERE, "assets/cuba/cuba_cia_map.png")).convert("RGB")
    mw = px(980)
    mh = int(cmap.height * (mw / cmap.width))
    cmap = cmap.resize((mw, mh), Image.LANCZOS)
    map_y = px(620)  # top edge of map band
    mf = font(FB, 44)
    lf = font(FB, 36)

    # straits line coords relative to map (top of map = Straits of Florida)
    def frame(t):
        canvas = bg.copy()
        canvas.paste(cmap, ((W - mw) // 2, map_y))
        d = ImageDraw.Draw(canvas)
        d.text((px(80), map_y - px(220)), "Cuba, October 1962", font=font(FB, 56),
               fill=(240, 242, 246))
        # animated dashed line across the straits (top ~12% of map)
        p = min(1, t / (dur * 0.5))
        x0, x1 = (W - mw) // 2 + px(60), (W + mw) // 2 - px(60)
        y = map_y + int(mh * 0.10)
        xe = x0 + (x1 - x0) * p
        # dashed
        x = x0
        while x < xe:
            d.line([(x, y), (min(x + px(24), xe), y)], fill=(233, 196, 106), width=px(8))
            x += px(40)
        if p >= 1:
            d.text(((W) // 2, y - px(90)), "90 MILES TO FLORIDA", font=mf,
                   fill=(233, 196, 106), anchor="ma")
            # pulsing dot over western Cuba (~35% across, ~30% down)
            r = px(22) + int(px(7) * math.sin(t * 6))
            cx, cy = (W - mw) // 2 + int(mw * 0.35), map_y + int(mh * 0.30)
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 80, 60))
            d.text(((W) // 2, map_y + mh + px(60)), "Soviet missile sites",
                   font=lf, fill=(255, 255, 255), anchor="ma")
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
    _note_prim("doc_zoom")
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
                d.rectangle(hb, outline=(233, 196, 106, int(255 * a)), width=px(10))
        return np.asarray(out)

    from moviepy import ImageClip, CompositeVideoClip
    clip = VideoClip(frame, duration=dur)
    if caption:
        sc = ImageClip(np.asarray(scrim())).with_duration(dur).with_position(
            (0, H - px(700)))
        sc = sc.with_opacity(0.85)
        clip = CompositeVideoClip([clip, sc], size=(W, H)).with_duration(dur)
        clip = overlay_text(clip, caption, FR, 40, dur)
    return clip


def dur(path, pad=1.2):
    """MP3 duration in seconds, plus breathing room for the scene."""
    import subprocess
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip()) + pad


def bullet_slide(title, bullets, dur, footer="", bg_img=None, darken=70,
                 stagger=0.45):
    """Title + bullets over an image (darkened) or flat background.

    Lines slam in one-by-one with spring overshoot, staggered by `stagger`
    seconds — the modern staggered-entrance feel.
    """
    from moviepy import VideoClip
    base = (_bg_base(bg_img, darken) if bg_img
            else np.zeros((H, W, 3), dtype=np.uint8) + 20)
    meas = ImageDraw.Draw(Image.new("RGB", (W, H)))
    tf, bf = font(FB, 60), font(FR, 50)
    title_lines = wrap_px(meas, title, tf, BASE_W - 160)
    items = []  # (tile_rgba, cx, cy)
    t_asc, t_desc = tf.getmetrics()
    b_asc, b_desc = bf.getmetrics()
    t_lh, b_lh = t_asc + t_desc + px(14), b_asc + b_desc + px(22)
    # layout: measure first
    body = []
    for b in bullets:
        body += wrap_px(meas, "\u2022  " + b, bf, BASE_W - 180)
        body.append("")
    content_h = len(title_lines) * t_lh + px(60) + len(body) * b_lh
    y = max(px(240), (H - content_h) // 2 - px(60))
    for line in title_lines:
        tile = text_rgba(line, tf, fill=(233, 196, 106, 255), max_w=BASE_W - 160)
        items.append((tile, px(80) + tile.width // 2, y + t_lh // 2, 0.0, True, line))
        y += t_lh
    y += px(60)
    idx = 0
    for line in body:
        if line:
            idx += 1
            tile = text_rgba(line, bf, fill=(232, 232, 232, 255), max_w=BASE_W - 180)
            items.append((tile, px(90) + tile.width // 2, y + b_lh // 2,
                          0.15 + idx * stagger, False, line))
        y += b_lh
    footer_tile = None
    if footer:
        footer_tile = text_rgba(footer, font(FR, 34), fill=(120, 126, 140, 255))
    _note_prim("bullet_slide")
    for tile, cx, cy, at, is_title, raw_text in items:
        _note_box("bullet-title" if is_title else "bullet", raw_text,
                  (cx - tile.width / 2, cy - tile.height / 2,
                   cx + tile.width / 2, cy + tile.height / 2), at, dur)
    if footer_tile:
        _note_box("bullet-footer", footer,
                  (px(90), H - px(140), px(90) + footer_tile.width,
                   H - px(140) + footer_tile.height), 0, dur)

    def frame(t):
        canvas = Image.fromarray(base.copy()).convert("RGBA")
        if bg_img:
            panel = Image.new("RGBA", (W - px(64), H - px(180)), (8, 10, 16, 148))
            pd = ImageDraw.Draw(panel, "RGBA")
            pd.rounded_rectangle([0, 0, panel.width - 1, panel.height - 1],
                                 radius=px(32), outline=(255, 255, 255, 40), width=px(3))
            canvas.alpha_composite(panel, (px(32), px(90)))
        for tile, cx, cy, at, is_title, raw_text in items:
            if t < at:
                continue
            s = ease_out_back((t - at) / 0.45)
            a = min(1, (t - at) / 0.25)
            tw, th = max(1, int(tile.width * s)), max(1, int(tile.height * s))
            fg = tile.resize((tw, th), Image.LANCZOS)
            if a < 1:
                alpha = fg.split()[3].point(lambda v: int(v * a))
                fg.putalpha(alpha)
            canvas.alpha_composite(fg, (int(cx - tw / 2), int(cy - th / 2)))
        if footer_tile:
            canvas.alpha_composite(footer_tile, (px(90), H - px(140)))
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)


def objectives_slide(title, los, dur, footer="", bg_img=None, darken=70,
                     stagger=0.45):
    """Learning-objectives slide: numbered LOs slam in one-by-one with spring
    overshoot over a darkened image or flat background. The Thread opener:
    what the lesson promises, so the closing can land it.
    """
    from moviepy import VideoClip
    base = (_bg_base(bg_img, darken) if bg_img
            else np.zeros((H, W, 3), dtype=np.uint8) + 20)
    meas = ImageDraw.Draw(Image.new("RGB", (W, H)))
    tf, bf, nf = font(FB, 60), font(FR, 50), font(FB, 54)
    title_lines = wrap_px(meas, title, tf, BASE_W - 160)
    items = []  # (tile_rgba, cx, cy, at, is_title)
    t_asc, t_desc = tf.getmetrics()
    b_asc, b_desc = bf.getmetrics()
    t_lh, b_lh = t_asc + t_desc + px(14), b_asc + b_desc + px(22)
    # layout: measure first; each LO gets "N." in gold + wrapped text
    body = []
    for i, lo in enumerate(los, 1):
        num_w = meas.textlength(f"{i}. ", nf)
        for j, line in enumerate(wrap_px(meas, lo, bf, BASE_W - 180 - num_w - px(20))):
            body.append((f"{i}. " if j == 0 else "   ", line))
        body.append(("", ""))
    content_h = len(title_lines) * t_lh + px(60) + len(body) * b_lh
    y = max(px(240), (H - content_h) // 2 - px(60))
    for line in title_lines:
        tile = text_rgba(line, tf, fill=(233, 196, 106, 255), max_w=BASE_W - 160)
        items.append((tile, px(80) + tile.width // 2, y + t_lh // 2, 0.0, True, line))
        y += t_lh
    y += px(60)
    idx = 0
    for num, line in body:
        if line:
            idx += 1
            num_tile = text_rgba(num, nf, fill=(233, 196, 106, 255)) if num.strip() else None
            line_tile = text_rgba(line, bf, fill=(232, 232, 232, 255), max_w=BASE_W - 180)
            w = (num_tile.width if num_tile else 0) + px(20) + line_tile.width
            row = Image.new("RGBA", (w, max(num_tile.height if num_tile else 0,
                                           line_tile.height)), (0, 0, 0, 0))
            x = 0
            if num_tile:
                row.alpha_composite(num_tile, (0, (row.height - num_tile.height) // 2))
                x = num_tile.width + px(20)
            row.alpha_composite(line_tile, (x, (row.height - line_tile.height) // 2))
            items.append((row, px(90) + w // 2, y + b_lh // 2,
                          0.15 + idx * stagger, False, f"{num.strip()} {line}".strip()))
        y += b_lh
    footer_tile = None
    if footer:
        footer_tile = text_rgba(footer, font(FR, 34), fill=(120, 126, 140, 255))
    _note_prim("objectives_slide")
    for tile, cx, cy, at, is_title, raw_text in items:
        _note_box("objectives-title" if is_title else "objectives-lo", raw_text,
                  (cx - tile.width / 2, cy - tile.height / 2,
                   cx + tile.width / 2, cy + tile.height / 2), at, dur)
    if footer_tile:
        _note_box("objectives-footer", footer,
                  (px(90), H - px(140), px(90) + footer_tile.width,
                   H - px(140) + footer_tile.height), 0, dur)

    def frame(t):
        canvas = Image.fromarray(base.copy()).convert("RGBA")
        if bg_img:
            panel = Image.new("RGBA", (W - px(64), H - px(180)), (8, 10, 16, 148))
            pd = ImageDraw.Draw(panel, "RGBA")
            pd.rounded_rectangle([0, 0, panel.width - 1, panel.height - 1],
                                 radius=px(32), outline=(255, 255, 255, 40), width=px(3))
            canvas.alpha_composite(panel, (px(32), px(90)))
        for tile, cx, cy, at, is_title, raw_text in items:
            if t < at:
                continue
            s = ease_out_back((t - at) / 0.45)
            a = min(1, (t - at) / 0.25)
            tw, th = max(1, int(tile.width * s)), max(1, int(tile.height * s))
            fg = tile.resize((tw, th), Image.LANCZOS)
            if a < 1:
                alpha = fg.split()[3].point(lambda v: int(v * a))
                fg.putalpha(alpha)
            canvas.alpha_composite(fg, (int(cx - tw / 2), int(cy - th / 2)))
        if footer_tile:
            canvas.alpha_composite(footer_tile, (px(90), H - px(140)))
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)


def title_card(text, dur, sub=None, bg_img=None, darken=70):
    """Text card over an image (darkened) or flat background."""
    img = Image.fromarray(
        _bg_base(bg_img, darken) if bg_img
        else np.zeros((H, W, 3), dtype=np.uint8) + 16)
    d = ImageDraw.Draw(img)
    tf = font(FB, 72)
    lines = wrap_px(d, text, tf, BASE_W - 160)
    asc, desc = tf.getmetrics()
    lh = asc + desc + px(16)
    y = (H - len(lines) * lh) // 2 - px(40)
    _note_prim("title_card")
    _ry = y
    for line in lines:
        _note_box("title-card", line,
                  (px(80), _ry, px(80) + tf.getlength(line), _ry + lh), 0, dur)
        _ry += lh
    for line in lines:
        d.text((px(80), y), line, font=tf, fill=(240, 242, 246))
        y += lh
    if sub:
        d.text((px(80), y + px(40)), sub, font=font(FR, 40), fill=(140, 146, 160))
        _note_box("title-card-sub", sub,
                  (px(80), y + px(40), px(80) + font(FR, 40).getlength(sub),
                   y + px(40) + px(60)),
                  0, dur)
    return slide_scene(img, dur)


def typewriter_scene(text, dur, bg_img=None, darken=55, sub=None):
    """Text types itself out character by character over an image.

    Made for primary-source quotes: let the historical voice appear live.
    """
    from moviepy import VideoClip
    bg0 = (_bg_base(bg_img, darken) if bg_img
           else np.zeros((H, W, 3), dtype=np.uint8) + 18)
    fnt = font(FR, 52)
    # wrap first so chars map to laid-out lines
    meas = ImageDraw.Draw(Image.new("RGB", (W, H)))
    lines = wrap_px(meas, text, fnt, BASE_W - 160)
    asc, desc = fnt.getmetrics()
    lh = asc + desc + px(18)
    y_start = (H - len(lines) * lh) // 2 - px(60)
    if bg_img is not None:
        # scrim band behind the quote block; bg stays visible around it
        bg0 = scrim_band(bg0, y_start - px(50), y_start + len(lines) * lh + px(50),
                         strength=0.5)
    _note_prim("typewriter_scene")
    _note_box("typewriter", text,
              (px(80), y_start, W - px(80), y_start + len(lines) * lh), 0, dur)
    flat = "".join(l + "\n" for l in lines)
    total = len(flat)

    def frame(t):
        canvas = Image.fromarray(bg0.copy())
        d = ImageDraw.Draw(canvas)
        n = min(total, int(total * (t / (dur * 0.85))))
        shown = flat[:n]
        # blinking cursor
        cur = "\u258c" if (t * 2) % 1 < 0.6 else ""
        y = y_start
        for line in (shown + cur).split("\n"):
            d.text((px(80), y), line, font=fnt, fill=(240, 242, 246))
            y += lh
        return np.asarray(canvas)

    clip = VideoClip(frame, duration=dur)
    if sub:
        clip = overlay_text(clip, sub, FR, 36, dur, y_pos=H - px(320))
    return clip


def zoom_to(img_path, dur, cx=0.5, cy=0.5, end_zoom=2.2, zoom_dur=1.4,
            caption="", highlight_box=None):
    """Fast directed zoom into a point of interest.

    The modern emphasis move: punch from wide to tight on (cx, cy) with
    ease-out, then hold. cx/cy in 0..1 of the frame.
    """
    from moviepy import VideoClip
    _note_prim("zoom_to")
    img = Image.open(img_path).convert("RGB")
    scale = max(W / img.width, H / img.height) * end_zoom
    img = img.resize((int(img.width * scale) + 2, int(img.height * scale) + 2),
                     Image.LANCZOS)
    big = np.asarray(img).astype(np.float32)
    bw, bh = big.shape[1], big.shape[0]

    def window(z, px, py):
        cw, ch = W / z, H / z
        x = min(max(px * bw - cw / 2, 0), bw - cw)
        y = min(max(py * bh - ch / 2, 0), bh - ch)
        return int(x), int(y), int(cw), int(ch)

    hb = None
    if highlight_box:
        x0, y0, x1, y1 = highlight_box
        hb = (int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H))

    def frame(t):
        k = ease_out_cubic(t / zoom_dur)
        z = 1 + (end_zoom - 1) * k
        px = 0.5 + (cx - 0.5) * k
        py = 0.5 + (cy - 0.5) * k
        x, y, cw, ch = window(z, px, py)
        crop = big[y:y + ch, x:x + cw]
        out = Image.fromarray(crop.astype(np.uint8)).resize((W, H), Image.LANCZOS)
        if hb and t > zoom_dur * 0.7:
            a = min(1, (t - zoom_dur * 0.7) / 0.5)
            d = ImageDraw.Draw(out, "RGBA")
            d.rectangle(hb, outline=(233, 196, 106, int(255 * a)), width=px(10))
        return np.asarray(out)

    clip = VideoClip(frame, duration=dur)
    if caption:
        clip = overlay_text(clip, caption, FR, 40, dur)
    return clip


def callout_scene(img_path, dur, points, caption=""):
    """Image with expanding gold callout rings landing on points of interest.

    points: list of (cx, cy, label) in 0..1 coords. Rings ripple out in sequence.
    """
    from moviepy import VideoClip
    import math
    _note_prim("callout_scene")
    img = Image.open(img_path).convert("RGB")
    scale = max(W / img.width, H / img.height)
    img = img.resize((int(img.width * scale) + 2, int(img.height * scale) + 2),
                     Image.LANCZOS)
    arr = np.asarray(img).astype(np.float32)
    x0 = (arr.shape[1] - W) // 2
    y0 = (arr.shape[0] - H) // 2
    base = arr[y0:y0 + H, x0:x0 + W].astype(np.uint8)
    lf = font(FB, 40)
    n = len(points)
    for i, (cx, cy, label) in enumerate(points):
        at = (i + 1) / (n + 1) * dur * 0.7
        if label:
            w_ = lf.getlength(label) + px(20)
            x, y = cx * W, cy * H - px(60)
            _note_box("callout", label,
                      (x - w_ / 2, y - px(48), x + w_ / 2, y + px(12)), at, dur)

    def frame(t):
        canvas = Image.fromarray(base.copy())
        d = ImageDraw.Draw(canvas, "RGBA")
        for i, (cx, cy, label) in enumerate(points):
            at = (i + 1) / (n + 1) * dur * 0.7
            if t < at:
                continue
            x, y = int(cx * W), int(cy * H)
            # expanding rings
            for r_i in range(3):
                rt = (t - at) * 1.2 - r_i * 0.5
                if rt < 0:
                    continue
                r = int(px(20) + rt * px(90))
                a = max(0, int(220 * (1 - rt / 1.6)))
                if a > 0 and r < px(500):
                    d.ellipse([x - r, y - r, x + r, y + r],
                              outline=(233, 196, 106, a), width=px(6))
            d.ellipse([x - px(14), y - px(14), x + px(14), y + px(14)],
                      fill=(233, 196, 106, 255))
            if label:
                d.text((x, y - px(60)), label, font=lf, fill=(255, 255, 255, 255),
                       anchor="ma")
        return np.asarray(canvas.convert("RGB"))

    from moviepy import ImageClip, CompositeVideoClip
    clip = VideoClip(frame, duration=dur)
    if caption:
        sc = ImageClip(np.asarray(scrim())).with_duration(dur).with_position(
            (0, H - px(700)))
        sc = sc.with_opacity(0.85)
        clip = CompositeVideoClip([clip, sc], size=(W, H)).with_duration(dur)
        clip = overlay_text(clip, caption, FR, 40, dur)
    return clip


def annotate(base_clip, notes):
    """Overlay annotation track on a base clip — the 'fast and point-driven' layer.

    notes: list of (at, dur, kind, kwargs). kinds:
      'term'  — lower-third key term + gloss. kwargs: term, gloss
      'label' — floating label at (x, y) in 0..1. kwargs: text, x, y
      'point' — big centered 'so what' statement. kwargs: text
      'arrow' — label with leader line to (x, y). kwargs: text, x, y, lx, ly
      'pop'   — playful word slam for fun beats. kwargs: text
    Each note springs in, holds, fades out. Stack multiple per scene for pace.
    """
    from moviepy import VideoClip
    dur = base_clip.duration

    def render_note(kind, kw):
        if kind == "term":
            tile = text_rgba(kw["term"], font(FB, 46),
                             fill=(233, 196, 106, 255), max_w=900)
            sub = text_rgba(kw.get("gloss", ""), font(FR, 36),
                            fill=(232, 232, 232, 255), max_w=900)
            w = max(tile.width, sub.width) + px(60)
            h = tile.height + sub.height + px(50)
            img = Image.new("RGBA", (w, h), (10, 12, 18, 235))
            img.alpha_composite(tile, (px(30), px(18)))
            img.alpha_composite(sub, (px(30), px(18) + tile.height + px(8)))
            d = ImageDraw.Draw(img)
            d.rectangle([0, 0, px(10), h], fill=(233, 196, 106, 255))
            return img, px(80), H - h - px(260)
        if kind == "label":
            tile = text_rgba(kw["text"], font(FB, 40),
                             fill=(255, 255, 255, 255), max_w=600)
            w, h = tile.width + px(44), tile.height + px(28)
            img = Image.new("RGBA", (w, h), (10, 12, 18, 220))
            img.alpha_composite(tile, (px(22), px(14)))
            return img, int(kw.get("x", 0.5) * W - w / 2), int(kw.get("y", 0.5) * H)
        if kind == "point":
            tile = text_rgba(kw["text"], font(FB, 54),
                             fill=(255, 255, 255, 255), max_w=920)
            w, h = tile.width + px(70), tile.height + px(56)
            img = Image.new("RGBA", (w, h), (10, 12, 18, 230))
            img.alpha_composite(tile, (px(35), px(28)))
            d = ImageDraw.Draw(img)
            d.rectangle([0, 0, w - 1, h - 1], outline=(233, 196, 106, 255), width=px(5))
            y_frac = kw.get("y")  # optional vertical placement (0..1 of frame)
            by = (int(y_frac * H - h / 2) if y_frac is not None
                  else (H - h) // 2 - px(100))
            return img, (W - w) // 2, by
        if kind == "arrow":
            tile = text_rgba(kw["text"], font(FB, 38),
                             fill=(233, 196, 106, 255), max_w=520)
            return ("arrow", tile, kw)
        if kind == "pop":
            tile = text_rgba(kw["text"], font(FB, 110),
                             fill=(233, 196, 106, 255), max_w=940)
            # slight tilt for playfulness
            tile = tile.rotate(-4, expand=True, resample=Image.BICUBIC)
            return ("pop", tile, kw.get("y"))  # optional y (0..1 of frame)
        raise ValueError(f"unknown annotation kind: {kind}")

    baked = [(at, d, kind, render_note(kind, kw)) for at, d, kind, kw in notes]
    _note_prim("annotate")
    for (at, nd, kind, kw), (_a2, _d2, _k2, payload) in zip(notes, baked):
        t0, t1 = at, at + nd
        if kind == "term":
            tile, bx, by = payload
            _note_box("annotate-term", kw["term"],
                      (bx, by, bx + tile.width, by + tile.height), t0, t1)
        elif kind == "label":
            tile, bx, by = payload
            _note_box("annotate-label", kw["text"],
                      (bx, by, bx + tile.width, by + tile.height), t0, t1)
        elif kind == "point":
            tile, bx, by = payload
            _note_box("annotate-point", kw["text"],
                      (bx, by, bx + tile.width, by + tile.height), t0, t1)
        elif kind == "arrow":
            _, tile, akw = payload
            lx, ly = akw.get("lx", 0.5), akw.get("ly", 0.35)
            _note_box("annotate-arrow", kw["text"],
                      (lx * W - tile.width / 2, ly * H - tile.height - px(20),
                       lx * W + tile.width / 2, ly * H - px(20)), t0, t1)
        elif kind == "pop":
            _, tile, y_frac = payload
            bw2, bh2 = tile.width, tile.height
            by0 = (int(y_frac * H - bh2 / 2) if y_frac is not None
                   else (H - bh2) // 2 - px(120))
            _note_box("annotate-pop", kw["text"],
                      ((W - bw2) // 2, by0, (W + bw2) // 2, by0 + bh2),
                      t0, t1)

    def frame(t):
        canvas = Image.fromarray(base_clip.get_frame(t)).convert("RGBA")
        for at, nd, kind, payload in baked:
            if t < at or t > at + nd:
                continue
            lt = t - at
            # spring in 0.35s, fade out last 0.25s
            s = ease_out_back(lt / 0.35)
            a = 1.0
            if lt > nd - 0.25:
                a = max(0, (nd - lt) / 0.25)
            if kind == "arrow":
                _, tile, kw = payload
                x, y = int(kw["x"] * W), int(kw["y"] * H)
                lx, ly = int(kw.get("lx", 0.5) * W), int(kw.get("ly", 0.35) * H)
                d = ImageDraw.Draw(canvas)
                al = int(255 * a)
                d.line([(lx, ly), (x, y)], fill=(233, 196, 106, al), width=px(6))
                d.ellipse([x - px(12), y - px(12), x + px(12), y + px(12)],
                          fill=(233, 196, 106, al))
                tw2 = max(1, int(tile.width * s))
                fg = tile.resize((tw2, tile.height), Image.LANCZOS)
                if a < 1:
                    fg.putalpha(fg.split()[3].point(lambda v: int(v * a)))
                canvas.alpha_composite(fg, (lx - tw2 // 2, ly - tile.height - px(20)))
            else:
                if kind == "pop":
                    _, tile, y_frac = payload
                    s = ease_out_back(lt / 0.30)
                    tw2, th2 = max(1, int(tile.width * s)), max(1, int(tile.height * s))
                    fg = tile.resize((tw2, th2), Image.LANCZOS)
                    if a < 1:
                        fg.putalpha(fg.split()[3].point(lambda v: int(v * a)))
                    by = (int(y_frac * H - th2 / 2) if y_frac is not None
                          else (H - th2) // 2 - px(120))
                    canvas.alpha_composite(fg, ((W - tw2) // 2, by))
                    continue
                tile, bx, by = payload
                tw2, th2 = max(1, int(tile.width * s)), max(1, int(tile.height * s))
                fg = tile.resize((tw2, th2), Image.LANCZOS)
                if a < 1:
                    fg.putalpha(fg.split()[3].point(lambda v: int(v * a)))
                canvas.alpha_composite(
                    fg, (int(bx + (tile.width - tw2) / 2),
                         int(by + (tile.height - th2) / 2)))
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)


def ease_in_out_cubic(t):
    t = min(1, max(0, t))
    if t < 0.5:
        return 4 * t ** 3
    return 1 - (-2 * t + 2) ** 3 / 2


def camera_path(img_path, dur, waypoints, caption=""):
    """Waypoint camera through an image: zoom in, out, and pan between points.

    waypoints: list of (cx, cy, zoom) in 0..1 coords. Time split evenly
    across segments, eased in-out for smooth starts/stops. zoom < current
    zooms OUT — so [(0.5,0.5,1.0), (0.6,0.4,2.5), (0.5,0.5,1.0)] punches
    in on a detail, then pulls back wide.
    """
    from moviepy import VideoClip
    _note_prim("camera_path")
    img = Image.open(img_path).convert("RGB")
    max_z = max(w[2] for w in waypoints)
    scale = max(W / img.width, H / img.height) * max_z
    img = img.resize((int(img.width * scale) + 2, int(img.height * scale) + 2),
                     Image.LANCZOS)
    big = np.asarray(img).astype(np.float32)
    bw, bh = big.shape[1], big.shape[0]
    n_seg = len(waypoints) - 1

    def window(z, px, py):
        cw, ch = W / z, H / z
        x = min(max(px * bw - cw / 2, 0), bw - cw)
        y = min(max(py * bh - ch / 2, 0), bh - ch)
        return int(x), int(y), int(cw), int(ch)

    def frame(t):
        seg = min(n_seg - 1, int(t / dur * n_seg))
        lt = (t / dur * n_seg) - seg
        k = ease_in_out_cubic(lt)
        (cx0, cy0, z0), (cx1, cy1, z1) = waypoints[seg], waypoints[seg + 1]
        cx, cy, z = (cx0 + (cx1 - cx0) * k, cy0 + (cy1 - cy0) * k,
                     z0 + (z1 - z0) * k)
        x, y, cw, ch = window(z, cx, cy)
        crop = big[y:y + ch, x:x + cw]
        return np.asarray(
            Image.fromarray(crop.astype(np.uint8)).resize((W, H), Image.LANCZOS))

    clip = VideoClip(frame, duration=dur)
    if caption:
        clip = overlay_text(clip, caption, FR, 40, dur)
    return clip


def ai_clip_scene(clip_path, dur):
    """Play a pre-generated AI ambient clip ("living engraving") as a stage.

    clip_path: video/ai_clips/<name>.mp4, committed. The clip is cover-cropped
    to the current canvas (respects set_scale preview mode), looped if shorter
    than dur, trimmed if longer. Loops use a 0.5s crossfade at the seam so a
    6s render can fill a 10s stage without a visible snap. Silent: narration
    comes from the stage MP3.

    The clip itself is generated on the 5090 with video/animate_still.py
    (LTX-Video, ambient-motion-only prompts); the manifest's ai_clips section
    records image/prompt/seed for reproducibility, enforced by the AI-CLIP
    validator gate.
    """
    from moviepy import VideoFileClip, concatenate_videoclips
    _note_prim("ai_clip_scene")
    if not os.path.isabs(clip_path):
        # repo-relative (CWD = repo root at build time); fall back to repo root
        if not os.path.isfile(clip_path):
            clip_path = os.path.join(os.path.dirname(HERE), clip_path)
    base = VideoFileClip(clip_path)
    # cover-crop to canvas
    cw, ch = base.size
    scale = max(W / cw, H / ch)
    nw, nh = int(cw * scale + 0.5), int(ch * scale + 0.5)
    big = base.resized((nw, nh))
    x1, y1 = (nw - W) // 2, (nh - H) // 2
    fitted = big.cropped(x1=x1, y1=y1, x2=x1 + W, y2=y1 + H)
    if fitted.duration < dur:
        n = int(dur // fitted.duration) + 2
        seq = concatenate_videoclips([fitted.copy() for _ in range(n)],
                                     method="compose", padding=-0.5)
        out = seq.subclipped(0, dur)
    else:
        out = fitted.subclipped(0, dur)
    return out.without_audio()


def assemble(scenes, audios, out, fps=30, transition=0.2, transitions=None):
    """Concat scenes with matched visual/audio overlap timing."""
    assert len(scenes) == len(audios)
    transitions = transitions or [{"type": "crossfade", "duration": transition}
                                  for _ in scenes]
    from moviepy.video.fx import CrossFadeIn, FadeIn, SlideIn
    treated = []
    for index, (scene, spec) in enumerate(zip(scenes, transitions)):
        if index == 0 or spec.get("type", "crossfade") == "hard_cut":
            treated.append(scene)
            continue
        duration = float(spec.get("duration", transition))
        kind = spec.get("type", "crossfade")
        if kind == "crossfade":
            scene = scene.with_effects([CrossFadeIn(duration)])
        elif kind == "slide":
            scene = scene.with_effects([SlideIn(duration, spec.get("direction", "left"))])
        elif kind == "dip_to_black":
            scene = scene.with_effects([FadeIn(duration)])
        treated.append(scene)
    final = concatenate_videoclips(treated, method="compose",
                                  padding=-transition)  # snappy crossfade
    # per-scene audio placed at scene start times (accounting for overlaps)
    from moviepy import CompositeAudioClip
    t, tracks = 0.0, []
    for sc, au in zip(scenes, audios):
        a = AudioFileClip(au).with_start(t)
        # pad/trim scene audio to scene visual duration
        tracks.append(a)
        t += sc.duration - transition
    audio = CompositeAudioClip(tracks).with_duration(final.duration)
    muxed = final.with_audio(audio)
    try:
        muxed.write_videofile(out, fps=fps, codec="libx264", audio_codec="aac",
                              preset="medium", threads=1, logger=None,
                              ffmpeg_params=["-pix_fmt", "yuv420p"])
    finally:
        muxed.close()
        audio.close()
        for track in tracks:
            track.close()
        final.close()
    return out


# ------------------------------------------------- animated-graphics layer
def _rz(tile, s):
    """Resize an RGBA tile by spring scale s, guarding against 0px dims."""
    s = max(0.01, s)
    return tile.resize((max(1, int(tile.width * s)),
                        max(1, int(tile.height * s))), Image.LANCZOS)


def _place(canvas, tile, cx, cy):
    """Center-blit an RGBA PIL tile onto an RGBA PIL canvas, clipping at
    frame edges. PIL-canvas counterpart to the numpy-based blit helper
    above -- use inside the animated-graphics primitives.
    """
    tw, th = tile.size
    x0, y0 = int(cx - tw / 2), int(cy - th / 2)
    sx0, sy0 = max(0, -x0), max(0, -y0)
    dx0, dy0 = max(0, x0), max(0, y0)
    dx1, dy1 = min(canvas.width, x0 + tw), min(canvas.height, y0 + th)
    if dx1 <= dx0 or dy1 <= dy0:
        return canvas
    region = tile.crop((sx0, sy0, sx0 + (dx1 - dx0), sy0 + (dy1 - dy0)))
    canvas.alpha_composite(region, (dx0, dy0))
    return canvas


def parallax_scene(bg_img, layers, dur, caption="", background_drift=0.03,
                   background_zoom=0.05):
    """Layered 2.5D scene for cutouts, artifacts, portraits, and diagrams.

    Transparent PNGs produce the strongest effect, but ordinary images are
    supported as floating archival cards. Depth controls relative motion.
    """
    from moviepy import VideoClip
    _note_prim("parallax_scene")
    background = _cover_arr(bg_img, darken=18)
    prepared = []
    for index, spec in enumerate(layers):
        tile = Image.open(spec["image"]).convert("RGBA")
        target_w = max(1, int(W * spec.get("scale", 0.35)))
        target_h = max(1, int(tile.height * target_w / tile.width))
        tile = tile.resize((target_w, target_h), Image.LANCZOS)
        prepared.append((tile, spec))

    def frame(t):
        p = min(1.0, max(0.0, t / max(dur, 0.01)))
        z = 1 + background_zoom * p
        nw, nh = max(W, int(W * z)), max(H, int(H * z))
        bg = Image.fromarray(background).resize((nw, nh), Image.LANCZOS)
        travel = int((nw - W) * background_drift / max(background_zoom, 0.001))
        x0 = min(max(0, (nw - W) // 2 + int((p - 0.5) * travel)), nw - W)
        y0 = (nh - H) // 2
        canvas = bg.crop((x0, y0, x0 + W, y0 + H)).convert("RGBA")
        for tile, spec in prepared:
            depth = float(spec.get("depth", 1.0))
            x = float(spec.get("x", 0.5)) * W
            y = float(spec.get("y", 0.5)) * H
            x += float(spec.get("drift_x", 0)) * W * p * depth
            y += float(spec.get("drift_y", 0)) * H * p * depth
            entrance = spec.get("entrance", "pop")
            ep = ease_out_back(min(1.0, t / 0.65))
            shown = tile
            if entrance == "pop":
                shown = _rz(tile, ep)
            elif entrance == "slide_left":
                x -= (1 - min(1, ep)) * W
            elif entrance == "slide_right":
                x += (1 - min(1, ep)) * W
            elif entrance == "rise":
                y += (1 - min(1, ep)) * H * 0.35
            _place(canvas, shown, x, y)
        return np.asarray(canvas.convert("RGB"))

    clip = VideoClip(frame, duration=dur)
    if caption:
        sc = ImageClip(np.asarray(scrim())).with_duration(dur).with_position(
            (0, H - px(700))).with_opacity(0.9)
        clip = CompositeVideoClip([clip, sc], size=(W, H)).with_duration(dur)
        clip = overlay_text(clip, caption, FR, 40, dur)
    return clip


def source_analysis_scene(img_path, dur, highlights, title=""):
    """Turn a source into an evidence investigation with timed annotations."""
    from moviepy import VideoClip
    _note_prim("source_analysis_scene")
    base = _cover_arr(img_path, darken=8)
    if title:
        chip = text_rgba(title, font(FB, 42), fill=GOLD + (255,), max_w=760)
        _note_box("source-title", title,
                  ((W-chip.width)//2, px(95)-chip.height//2,
                   (W+chip.width)//2, px(95)+chip.height//2), 0, dur)
    for item in highlights:
        x0, y0, x1, y1 = item["box"]
        _note_box("source-highlight", item["label"],
                  (x0 * W, y0 * H, x1 * W, y1 * H), item["at"],
                  min(dur, item["at"] + item.get("duration", 4)))

    def frame(t):
        canvas = Image.fromarray(base.copy()).convert("RGBA")
        d = ImageDraw.Draw(canvas, "RGBA")
        if title:
            chip = text_rgba(title, font(FB, 42), fill=GOLD + (255,), max_w=760)
            bg = Image.new("RGBA", (chip.width + px(32), chip.height + px(24)),
                           (10, 12, 18, 220))
            bg.alpha_composite(chip, (px(16), px(12)))
            _place(canvas, bg, W // 2, px(95))
        for item in highlights:
            at = float(item["at"])
            end = at + float(item.get("duration", dur - at))
            if not at <= t <= end:
                continue
            color = tuple(item.get("color", GOLD))
            x0, y0, x1, y1 = item["box"]
            box = [int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)]
            p = ease_out_cubic(min(1, (t - at) / 0.35))
            # Focus with an outline, never an opaque color slab that hides the
            # evidence students are supposed to inspect.
            d.rounded_rectangle(box, radius=px(10),
                                outline=color + (int(255 * p),), width=px(7))
            label = text_rgba(item["label"], font(FB, 34), max_w=720)
            panel = Image.new("RGBA", (label.width + px(30), label.height + px(22)),
                              (10, 12, 18, 232))
            panel.alpha_composite(label, (px(15), px(11)))
            py = box[1] - panel.height // 2 - px(20)
            if py < px(150):
                py = box[3] + panel.height // 2 + px(20)
            _place(canvas, _rz(panel, max(0.01, p)), (box[0] + box[2]) // 2, py)
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)


def diagram_scene(bg_img, dur, nodes, edges, title=""):
    """Animated causal/network diagram with declarative nodes and edges."""
    from moviepy import VideoClip
    _note_prim("diagram_scene")
    base = (_cover_arr(bg_img, darken=72) if bg_img
            else np.zeros((H, W, 3), dtype=np.uint8) + 18)
    by_id = {node["id"]: node for node in nodes}
    if title:
        heading = text_rgba(title, font(FB, 54), fill=GOLD + (255,), max_w=850)
        _note_box("diagram-title", title,
                  ((W-heading.width)//2, px(130)-heading.height//2,
                   (W+heading.width)//2, px(130)+heading.height//2), 0, dur)
    for node in nodes:
        label = text_rgba(node["label"], font(FB, 36), max_w=330)
        pad = px(24)
        cx, cy = node["x"]*W, node["y"]*H
        _note_box("diagram-node", node["label"],
                  (cx-label.width/2-pad, cy-label.height/2-pad,
                   cx+label.width/2+pad, cy+label.height/2+pad),
                  node.get("at", 0), dur)
    for edge in edges:
        if edge.get("label"):
            source, target = by_id[edge["from"]], by_id[edge["to"]]
            label = text_rgba(edge["label"], font(FR, 28), max_w=300)
            cx = (source["x"]+target["x"])*W/2
            cy = (source["y"]+target["y"])*H/2-px(28)
            _note_box("diagram-edge", edge["label"],
                      (cx-label.width/2, cy-label.height/2,
                       cx+label.width/2, cy+label.height/2),
                      edge.get("at", 0)+0.35, dur)

    def frame(t):
        canvas = Image.fromarray(base.copy()).convert("RGBA")
        d = ImageDraw.Draw(canvas, "RGBA")
        if title:
            heading = text_rgba(title, font(FB, 54), fill=GOLD + (255,), max_w=850)
            _place(canvas, heading, W // 2, px(130))
        for edge in edges:
            at = float(edge.get("at", 0))
            if t < at:
                continue
            source, target = by_id[edge["from"]], by_id[edge["to"]]
            x1, y1 = source["x"] * W, source["y"] * H
            x2, y2 = target["x"] * W, target["y"] * H
            p = ease_out_cubic(min(1, (t - at) / 0.55))
            ex, ey = x1 + (x2 - x1) * p, y1 + (y2 - y1) * p
            color = tuple(edge.get("color", (87, 192, 224)))
            d.line([(x1, y1), (ex, ey)], fill=color + (220,), width=px(8))
            if p >= .9:
                ang = np.arctan2(y2-y1, x2-x1)
                s = px(24)
                d.polygon([(x2,y2), (x2-s*np.cos(ang-.55), y2-s*np.sin(ang-.55)),
                           (x2-s*np.cos(ang+.55), y2-s*np.sin(ang+.55))],
                          fill=color + (255,))
            if edge.get("label") and p >= .65:
                label = text_rgba(edge["label"], font(FR, 28), max_w=300)
                _place(canvas, label, (x1+x2)/2, (y1+y2)/2 - px(28))
        for node in nodes:
            at = float(node.get("at", 0))
            if t < at:
                continue
            p = ease_out_back(min(1, (t-at)/0.45))
            color = tuple(node.get("color", GOLD))
            label = text_rgba(node["label"], font(FB, 36), max_w=330)
            pad = px(24)
            card = Image.new("RGBA", (label.width+pad*2, label.height+pad*2),
                             (10,12,18,238))
            card.alpha_composite(label, (pad,pad))
            cd = ImageDraw.Draw(card, "RGBA")
            cd.rounded_rectangle([0,0,card.width-1,card.height-1], radius=px(20),
                                 outline=color + (255,), width=px(5))
            _place(canvas, _rz(card, max(.01,p)), node["x"]*W, node["y"]*H)
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)


def beat_overlay(base_clip, beats, dur):
    """Timed editorial beats shared by AP prompts, guides, metaphors and labels."""
    from moviepy import VideoClip
    _note_prim("beat_overlay")
    for beat in beats:
        kind = beat["type"]
        if kind in {"arrow", "progress"}:
            continue
        at = float(beat["at"])
        end = min(dur, at + float(beat.get("duration", dur-at)))
        size = 38 if kind in {"label", "icon"} else 44
        text = beat.get("text", "")
        tile = text_rgba(text, font(FB if kind != "question" else FR, size),
                         max_w=780)
        pad = px(22)
        badge_space = px(105) if kind == "host" else 0
        pw, ph = tile.width + pad*2 + badge_space, tile.height + pad*2
        cx, cy = beat.get("x", .5)*W, beat.get("y", .82)*H
        _note_box(f"beat-{kind}", text,
                  (cx-pw/2, cy-ph/2, cx+pw/2, cy+ph/2), at, end)

    def frame(t):
        canvas = Image.fromarray(base_clip.get_frame(t)).convert("RGBA")
        d = ImageDraw.Draw(canvas, "RGBA")
        for beat in beats:
            at = float(beat["at"])
            end = at + float(beat.get("duration", dur - at))
            if not at <= t <= end:
                continue
            kind = beat["type"]
            color = tuple(beat.get("color", GOLD))
            x, y = beat.get("x", 0.5) * W, beat.get("y", 0.82) * H
            p = ease_out_back(min(1, (t - at) / 0.35))
            text = beat.get("text", "")
            if kind == "arrow":
                x2, y2 = beat.get("x2", 0.75) * W, beat.get("y2", 0.5) * H
                d.line([(x, y), (x2, y2)], fill=color + (240,), width=px(8))
                ang = np.arctan2(y2 - y, x2 - x)
                size = px(26)
                pts = [(x2, y2), (x2 - size * np.cos(ang - .55), y2 - size * np.sin(ang - .55)),
                       (x2 - size * np.cos(ang + .55), y2 - size * np.sin(ang + .55))]
                d.polygon(pts, fill=color + (255,))
                continue
            if kind == "progress":
                w = int(W * 0.76)
                d.rounded_rectangle([W//2-w//2, y-px(8), W//2+w//2, y+px(8)],
                                    radius=px(8), fill=(255,255,255,70))
                fill = int(w * min(1, max(0, (t-at)/(end-at or 1))))
                d.rounded_rectangle([W//2-w//2, y-px(8), W//2-w//2+fill, y+px(8)],
                                    radius=px(8), fill=color + (255,))
                continue
            size = 38 if kind in {"label", "icon"} else 44
            fill = color + (255,) if kind in {"stamp", "icon"} else (255,255,255,255)
            tile = text_rgba(text, font(FB if kind != "question" else FR, size),
                             fill=fill, max_w=780)
            pad = px(22)
            panel_color = ((110, 28, 28, 225) if kind == "stamp" else
                           (18, 45, 70, 238) if kind in {"question", "pause"} else
                           (10, 12, 18, 220))
            badge_space = px(105) if kind == "host" else 0
            panel = Image.new("RGBA", (tile.width + pad*2 + badge_space, tile.height + pad*2), panel_color)
            panel.alpha_composite(tile, (pad + badge_space, pad))
            border = ImageDraw.Draw(panel, "RGBA")
            border.rounded_rectangle([0,0,panel.width-1,panel.height-1], radius=px(18),
                                     outline=color + (220,), width=px(4))
            if kind == "host":
                badge = min(px(42), panel.height // 2 - px(8))
                cx = px(12) + badge
                border.ellipse([cx-badge, panel.height//2-badge, cx+badge,
                                panel.height//2+badge], fill=color + (255,))
                border.text((cx, panel.height//2), "H", font=font(FB, 34),
                            fill=(10, 12, 18, 255), anchor="mm")
            _place(canvas, _rz(panel, max(0.01, p)), x, y)
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)


# ------------------------------------------------- creative devices
# Scriptable directorial overlays driven by scene.device/device_params
# (validated by pipeline/schema._validate_device). Cue-timed devices read
# the resolved timestamps pipeline/timing.resolve_scene_timing injects
# (device_params.reveal_at, annotation "at"); untimed fallbacks spread
# evenly so layout validation never depends on TTS output.

_HOOK_BADGE = {"contradiction": "VS", "mystery": "?", "stakes": "!"}


def device_overlay(base_clip, device, params, dur):
    """Overlay a creative device on a scene clip.

    device is a registry id (hook, redact_reveal, reversal, annotate,
    show_ask, date_ticker); params is the timed device_params dict.
    """
    _note_prim("device_overlay")
    params = params or {}
    if device == "hook":
        return _device_hook(base_clip, params, dur)
    if device == "redact_reveal":
        return _device_redact_reveal(base_clip, params, dur)
    if device == "reversal":
        return _device_reversal(base_clip, params, dur)
    if device == "annotate":
        return _device_annotate(base_clip, params, dur)
    if device == "show_ask":
        return _device_show_ask(base_clip, params, dur)
    if device == "date_ticker":
        return _device_date_ticker(base_clip, params, dur)
    raise ValueError(f"unknown creative device {device!r}")


def _device_hook(base_clip, params, dur):
    """Opening hook badge: pops in early, pays off (fades) by payoff_by_sec."""
    from moviepy import VideoClip
    letter = _HOOK_BADGE.get(params.get("hook_type", "mystery"), "?")
    dur = float(dur)
    start = 0.15
    end = min(dur, float(params.get("payoff_by_sec", dur)))
    radius = px(64)
    cx, cy = W * 0.5, H * 0.14
    _note_box("device-hook", letter,
              (cx - radius, cy - radius, cx + radius, cy + radius), start, end)

    def frame(t):
        canvas = Image.fromarray(base_clip.get_frame(t)).convert("RGBA")
        if start <= t <= end:
            p = ease_out_back(min(1, (t - start) / 0.35))
            fade = min(1, max(0, (end - t) / 0.4))
            r = max(1, int(radius * max(0.01, p)))
            badge = Image.new("RGBA", (r * 2 + px(16), r * 2 + px(16)), (0, 0, 0, 0))
            d = ImageDraw.Draw(badge, "RGBA")
            d.ellipse([px(8), px(8), px(8) + r * 2, px(8) + r * 2],
                      fill=(10, 12, 18, int(235 * fade)),
                      outline=GOLD + (int(255 * fade),), width=max(1, px(6)))
            d.text((px(8) + r, px(8) + r), letter, font=font(FB, 64),
                   fill=(255, 255, 255, int(255 * fade)), anchor="mm")
            _place(canvas, badge, cx, cy)
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)


def _device_redact_reveal(base_clip, params, dur):
    """Classified-document lines: black redaction bars wipe away on cue."""
    from moviepy import VideoClip
    dur = float(dur)
    lines = params["lines"]
    reveal_at = list(params.get("reveal_at") or [])
    if len(reveal_at) != len(lines):
        reveal_at = [dur * (0.25 + 0.5 * i / max(1, len(lines)))
                     for i in range(len(lines))]
    fnt = font(FB, 40)
    pad = px(26)
    tiles = [text_rgba(line, fnt, fill=(255, 255, 255, 255), max_w=860)
             for line in lines]
    panel_w = max(tile.width for tile in tiles) + pad * 2
    lh = tiles[0].height + px(18)
    panel_h = lh * len(lines) + pad * 2 - px(18)
    cx, cy = W * 0.5, H * 0.32
    x0, y0 = cx - panel_w / 2, cy - panel_h / 2
    for index, line in enumerate(lines):
        top = y0 + pad + index * lh
        _note_box("device-redact", line,
                  (x0, top, x0 + panel_w, top + tiles[index].height),
                  reveal_at[index], dur)

    def frame(t):
        canvas = Image.fromarray(base_clip.get_frame(t)).convert("RGBA")
        panel = Image.new("RGBA", (int(panel_w), int(panel_h)), (10, 12, 18, 215))
        d = ImageDraw.Draw(panel, "RGBA")
        d.rounded_rectangle([0, 0, panel_w - 1, panel_h - 1], radius=px(16),
                            outline=GOLD + (220,), width=max(1, px(4)))
        y = pad
        for tile, at in zip(tiles, reveal_at):
            panel.alpha_composite(tile, (pad, y))
            k = min(1, max(0, (t - at) / 0.45))  # 0 = fully redacted
            if k < 1:
                bar_w = int(tile.width * (1 - k)) + px(8)
                d.rectangle([pad, y, pad + bar_w, y + tile.height],
                            fill=(0, 0, 0, 255))
            y += lh
        _place(canvas, panel, cx, cy)
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)


def _device_reversal(base_clip, params, dur):
    """Pivot beat: a stamp slams in mid-scene (or a soft rule sweep)."""
    from moviepy import VideoClip
    dur = float(dur)
    at = dur * 0.35
    if params.get("pivot", True):
        word = "BUT..."
        tile = text_rgba(word, font(FB, 72), fill=(255, 255, 255, 255),
                         max_w=700)
        pad = px(30)
        pw, ph = tile.width + pad * 2, tile.height + pad * 2
        cx, cy = W * 0.5, H * 0.42
        _note_box("device-reversal", word,
                  (cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2), at, dur)

        def frame(t):
            canvas = Image.fromarray(base_clip.get_frame(t)).convert("RGBA")
            if t >= at:
                p = ease_out_back(min(1, (t - at) / 0.4))
                stamp = Image.new("RGBA", (pw, ph), STAMP_RED + (235,))
                stamp.alpha_composite(tile, (pad, pad))
                stamp = stamp.rotate(8, expand=True, resample=Image.BICUBIC)
                _place(canvas, _rz(stamp, p), cx, cy)
            return np.asarray(canvas.convert("RGB"))
    else:
        def frame(t):
            canvas = Image.fromarray(base_clip.get_frame(t)).convert("RGBA")
            if t >= at:
                k = ease_out_cubic(min(1, (t - at) / 0.6))
                d = ImageDraw.Draw(canvas, "RGBA")
                w = int(W * 0.7 * k)
                d.line([(W // 2 - w // 2, H * 0.42), (W // 2 + w // 2, H * 0.42)],
                       fill=GOLD + (255,), width=max(1, px(6)))
            return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)


def _device_annotate(base_clip, params, dur):
    """Telestrator: gold circles/arrows draw on at their cues, labels pop."""
    from moviepy import VideoClip
    dur = float(dur)
    notes = params["annotations"]
    items = []
    for index, note in enumerate(notes):
        at = float(note.get("at", dur * (index + 1) / (len(notes) + 1)))
        fx = float(note.get("x", 0.5))
        fy = float(note.get("y", min(0.78, 0.30 + 0.16 * index)))
        label = note["label"]
        chip = text_rgba(label, font(FB, 34), max_w=520)
        pad = px(16)
        pw, ph = chip.width + pad * 2, chip.height + pad * 2
        lx = min(max(pw / 2, float(note.get("label_x", min(0.94, fx + 0.20))) * W),
                 W - pw / 2)
        ly = min(max(ph / 2, float(note.get("label_y", max(0.06, fy - 0.13))) * H),
                 H - ph / 2)
        items.append({"kind": note["type"], "x": fx * W, "y": fy * H,
                      "chip": chip, "pad": pad, "lx": lx, "ly": ly, "at": at})
        _note_box("device-annotate", label,
                  (lx - pw / 2, ly - ph / 2, lx + pw / 2, ly + ph / 2), at, dur)

    def frame(t):
        canvas = Image.fromarray(base_clip.get_frame(t)).convert("RGBA")
        d = ImageDraw.Draw(canvas, "RGBA")
        for item in items:
            if t < item["at"]:
                continue
            k = min(1, (t - item["at"]) / 0.6)
            x, y = item["x"], item["y"]
            if item["kind"] == "circle":
                r = px(90)
                box = [x - r, y - r, x + r, y + r]
                if k >= 1:
                    d.ellipse(box, outline=GOLD + (255,), width=max(1, px(7)))
                else:
                    d.arc(box, start=-90, end=-90 + 360 * k,
                          fill=GOLD + (255,), width=max(1, px(7)))
            else:  # arrow pointing at the feature
                sx, sy = x - px(160), y + px(90)
                tip = (sx + (x - sx) * k, sy + (y - sy) * k)
                d.line([(sx, sy), tip], fill=GOLD + (255,), width=max(1, px(7)))
                if k > 0.5:
                    ang = np.arctan2(y - sy, x - sx)
                    size = px(24)
                    pts = [tip,
                           (tip[0] - size * np.cos(ang - .55),
                            tip[1] - size * np.sin(ang - .55)),
                           (tip[0] - size * np.cos(ang + .55),
                            tip[1] - size * np.sin(ang + .55))]
                    d.polygon(pts, fill=GOLD + (255,))
            chip, pad = item["chip"], item["pad"]
            p = ease_out_back(min(1, (t - item["at"]) / 0.35))
            panel = Image.new("RGBA", (chip.width + pad * 2, chip.height + pad * 2),
                              (10, 12, 18, 225))
            panel.alpha_composite(chip, (pad, pad))
            border = ImageDraw.Draw(panel, "RGBA")
            border.rounded_rectangle([0, 0, panel.width - 1, panel.height - 1],
                                     radius=px(14), outline=GOLD + (220,),
                                     width=max(1, px(4)))
            _place(canvas, _rz(panel, p), item["lx"], item["ly"])
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)


def _device_show_ask(base_clip, params, dur):
    """End-card question panel sliding up for the final hold_sec."""
    from moviepy import VideoClip
    dur = float(dur)
    hold = min(float(params.get("hold_sec", 3.0)), dur)
    at = max(0.0, dur - hold)
    question = params["question"]
    tile = text_rgba("?  " + question, font(FR, 40), max_w=860)
    pad = px(26)
    pw, ph = tile.width + pad * 2, tile.height + pad * 2
    cx, cy = W * 0.5, H * 0.68
    _note_box("device-show_ask", question,
              (cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2), at, dur)

    def frame(t):
        canvas = Image.fromarray(base_clip.get_frame(t)).convert("RGBA")
        if t >= at:
            slide = ease_out_cubic(min(1, (t - at) / 0.5))
            panel = Image.new("RGBA", (int(pw), int(ph)), (18, 45, 70, 238))
            panel.alpha_composite(tile, (pad, pad))
            border = ImageDraw.Draw(panel, "RGBA")
            border.rounded_rectangle([0, 0, pw - 1, ph - 1], radius=px(16),
                                     outline=GOLD + (220,), width=max(1, px(4)))
            _place(canvas, panel, cx, cy + (1 - slide) * ph)
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)


def _device_date_ticker(base_clip, params, dur):
    """Date stamp cycling through its labels evenly across the scene."""
    from moviepy import VideoClip
    dur = float(dur)
    dates = params["dates"]
    right = params.get("position", "top_right") != "top_left"
    fnt = font(FB, 40)
    tiles = [text_rgba(text, fnt, fill=GOLD + (255,), max_w=420)
             for text in dates]
    pad = px(18)
    pw = max(tile.width for tile in tiles) + pad * 2
    ph = max(tile.height for tile in tiles) + pad * 2
    cx = W - pw / 2 - px(48) if right else pw / 2 + px(48)
    cy = ph / 2 + px(48)
    _note_box("device-date_ticker", " / ".join(dates),
              (cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2), 0.0, dur)

    def frame(t):
        canvas = Image.fromarray(base_clip.get_frame(t)).convert("RGBA")
        seg = dur / len(dates)
        idx = min(len(dates) - 1, int(t / dur * len(dates)))
        p = ease_out_back(min(1, (t - idx * seg) / 0.3))
        panel = Image.new("RGBA", (int(pw), int(ph)), (10, 12, 18, 225))
        border = ImageDraw.Draw(panel, "RGBA")
        border.rounded_rectangle([0, 0, pw - 1, ph - 1], radius=px(14),
                                 outline=GOLD + (220,), width=max(1, px(4)))
        tile = tiles[idx]
        panel.alpha_composite(tile, (pad + (pw - pad * 2 - tile.width) // 2, pad))
        _place(canvas, _rz(panel, p), cx, cy)
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)

# Built 2026-10-02: the user's verdict was "all I see is image + text" --
# camera moves over stills are not enough. These primitives put THINGS THAT
# MOVE on screen: drawing routes, ticking numbers, slamming cards, cutaway
# skits. All scriptable (PIL frame functions), all PD-safe (original art or
# local PD images), all scale-aware (px()/W/H -- never hardcode 1080x1920).

GOLD = (233, 196, 106)
STAMP_RED = (224, 82, 82)


def _cover_arr(img_path, darken=0):
    """Cover-fit an image to WxH as uint8 RGB, optional darken (0..255)."""
    img = Image.open(img_path).convert("RGB")
    scale = max(W / img.width, H / img.height)
    img = img.resize((int(img.width * scale) + 2, int(img.height * scale) + 2),
                     Image.LANCZOS)
    arr = np.asarray(img).astype(np.float32)
    x0 = (arr.shape[1] - W) // 2
    y0 = (arr.shape[0] - H) // 2
    crop = arr[y0:y0 + H, x0:x0 + W]
    if darken:
        crop = np.clip(crop - darken, 0, 255)
    return crop.astype(np.uint8)


def _poly_points(path):
    """Precompute cumulative lengths for a 0..1 polyline path."""
    pts = [(x * W, y * H) for x, y in path]
    cum = [0.0]
    for i in range(1, len(pts)):
        dx, dy = pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]
        cum.append(cum[-1] + (dx * dx + dy * dy) ** 0.5)
    return pts, cum


def _point_at(pts, cum, s):
    """Point + direction at arclength fraction s in 0..1."""
    total = cum[-1] or 1.0
    target = max(0.0, min(1.0, s)) * total
    i = 1
    while i < len(cum) - 1 and cum[i] < target:
        i += 1
    seg = (cum[i] - cum[i - 1]) or 1.0
    k = (target - cum[i - 1]) / seg
    x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k
    y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k
    dx, dy = pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]
    n = (dx * dx + dy * dy) ** 0.5 or 1.0
    return (x, y), (dx / n, dy / n)


def map_scene(map_img, dur, moves, title="", caption=""):
    """Animated map: routes draw themselves, markers march and pulse.

    map_img: local PD map. moves: list of dicts:
      {"path": [(x,y)...] 0..1 coords, "at": seconds,
       "color": (r,g,b), "kind": "arrow"|"dots"|"fill",
       "label": str, "label_pos": (x,y) 0..1}
    kind "arrow": route draws itself with an arrowhead tip.
    kind "dots":  marching dots advance along the path.
    kind "fill":  territory pulses lit at the path's first point.
    The OverSimplified troop-movement transfer. bg stays readable.
    """
    from moviepy import VideoClip
    _note_prim("map_scene")
    base = _cover_arr(map_img, darken=30)
    prepped = []
    for m in moves:
        pts, cum = _poly_points(m["path"])
        prepped.append((m, pts, cum))
        if m.get("label"):
            lx, ly = m.get("label_pos", m["path"][-1])
            _note_box("map_label", m["label"],
                      (lx * W - px(150), ly * H - px(40),
                       lx * W + px(150), ly * H + px(40)),
                      m.get("at", 0) + 1.2, dur)
    DRAW = 1.6

    def frame(t):
        canvas = Image.fromarray(base.copy()).convert("RGBA")
        d = ImageDraw.Draw(canvas, "RGBA")
        for m, pts, cum in prepped:
            at = m.get("at", 0)
            if t < at - 0.3:
                continue
            color = tuple(m.get("color", GOLD))
            kind = m.get("kind", "arrow")
            # origin pulse just before the move starts
            if t < at:
                k = 1 - (at - t) / 0.3
                r = px(14) + int(px(26) * k)
                a = int(200 * (1 - k * 0.5))
                x0, y0 = pts[0]
                d.ellipse([x0 - r, y0 - r, x0 + r, y0 + r],
                          outline=color + (a,), width=px(5))
                continue
            p = min(1.0, (t - at) / DRAW)
            if kind == "fill":
                x0, y0 = pts[0]
                r = int(px(130) * ease_out_cubic(p))
                a = int(80 * p)
                d.ellipse([x0 - r, y0 - r, x0 + r, y0 + r],
                          fill=color + (a,))
                rr = px(20) + int(px(8) * np.sin(t * 5))
                d.ellipse([x0 - rr, y0 - rr, x0 + rr, y0 + rr],
                          outline=color + (230,), width=px(5))
            else:
                # drawn portion of the route
                n_seg = 24
                drawn = [ _point_at(pts, cum, p * i / n_seg)[0]
                          for i in range(n_seg + 1)]
                if len(drawn) > 1:
                    d.line(drawn, fill=color + (235,), width=px(7))
                tip, direction = _point_at(pts, cum, p)
                if kind == "arrow" and p > 0.02:
                    dx, dy = direction
                    s = px(26)
                    tip_pt = (tip[0] + dx * s, tip[1] + dy * s)
                    l_pt = (tip[0] - dy * s * 0.7, tip[1] + dx * s * 0.7)
                    r_pt = (tip[0] + dy * s * 0.7, tip[1] - dx * s * 0.7)
                    d.polygon([tip_pt, l_pt, r_pt], fill=color + (255,))
                elif kind == "dots":
                    for j in range(7):
                        sj = p - j * 0.055 - ((t * 0.35) % 0.055)
                        if sj <= 0:
                            continue
                        (qx, qy), _ = _point_at(pts, cum, min(1.0, sj))
                        rr = px(11) if j else px(15)
                        d.ellipse([qx - rr, qy - rr, qx + rr, qy + rr],
                                  fill=color + (255,))
                    if p >= 1:
                        (ex, ey), _ = _point_at(pts, cum, 1.0)
                        rr = px(18) + int(px(7) * np.sin(t * 6))
                        d.ellipse([ex - rr, ey - rr, ex + rr, ey + rr],
                                  outline=color + (230,), width=px(5))
            # label pops once the move completes
            if m.get("label") and t >= at + 1.2:
                lt = t - (at + 1.2)
                s = max(0.01, ease_out_back(min(1.0, lt / 0.4)))
                lf = font(FB, 38)
                tile = text_rgba(m["label"], lf, fill=(255, 255, 255, 255),
                                 max_w=520)
                fg = _rz(tile, s)
                tw2, th2 = fg.size
                lx, ly = m.get("label_pos", m["path"][-1])
                bx = int(lx * W - tw2 / 2)
                by = int(ly * H - th2 - px(30))
                pad = px(18)
                bg = Image.new("RGBA", (tw2 + pad * 2, th2 + pad * 2),
                               (10, 12, 18, 225))
                bg.alpha_composite(fg, (pad, pad))
                _place(canvas, bg, lx * W, by + (th2 + pad * 2) / 2)
        return np.asarray(canvas.convert("RGB"))

    clip = VideoClip(frame, duration=dur)
    if title:
        clip = overlay_text(clip, title, FB, 64, dur, y_pos=px(120))
    if caption:
        clip = overlay_text(clip, caption, FR, 40, dur)
    return clip


def counter_scene(target, dur, label, bg_img, prefix="", suffix="", start=0,
                  decimals=0, at=0):
    """Big animated number ticking up (or down) over a background image.

    target: final number. label: gold caption above the number ("enslaved
    people freed"). prefix/suffix for "$"/"%"/" million". Eases out into
    the target. Quantities made visceral -- OverSimplified's favorite move.
    """
    from moviepy import VideoClip
    _note_prim("counter_scene")
    base = _cover_arr(bg_img, darken=55)
    y_num = H // 2 - px(60)
    _note_box("counter", f"{label}: {target}",
              (px(60), y_num - px(220), W - px(60), y_num + px(220)), at, dur)

    def frame(t):
        canvas = Image.fromarray(base.copy())
        canvas = Image.fromarray(
            scrim_band(np.asarray(canvas), y_num - px(260), y_num + px(260),
                       strength=0.45))
        d = ImageDraw.Draw(canvas)
        lf = font(FB, 44)
        d.text((W // 2, y_num - px(200)), label, font=lf,
               fill=GOLD + (255,), anchor="ma")
        p = min(1.0, max(0.0, (t - at) / max(0.01, dur - at)))
        v = start + (target - start) * ease_out_cubic(p)
        txt = f"{prefix}{v:,.{decimals}f}{suffix}"
        nf = font(FB, 150)
        # shrink-to-fit for very large numbers
        tw = d.textlength(txt, font=nf)
        while tw > W - px(120) and nf.size > px(40):
            nf = font(FB, int(nf.size / SCALE * 0.92))
            tw = d.textlength(txt, font=nf)
        d.text((W // 2, y_num), txt, font=nf, fill=(255, 255, 255, 255),
               anchor="ma")
        # milestone ticks: small gold ticks under the number as it climbs
        if p > 0.02:
            for i in range(1, 10):
                if p >= i / 10:
                    x = px(140) + (W - px(280)) * i / 10
                    d.line([(x, y_num + px(150)), (x, y_num + px(170))],
                           fill=GOLD + (255,), width=px(5))
        return np.asarray(canvas)

    return VideoClip(frame, duration=dur)


def vs_scene(img_left, img_right, dur, name_left, name_right, title=""):
    """Versus face-off: two portraits slam in from opposite sides, VS badge
    pops center with a clash pulse. For debates, elections, court cases --
    the comparison format the exam grades."""
    from moviepy import VideoClip
    _note_prim("vs_scene")
    la = _cover_arr(img_left)
    ra = _cover_arr(img_right)
    half = W // 2
    # pre-crop each half (cover within its half)
    left = np.asarray(Image.fromarray(la).crop(
        ((W - half * 2) // 2, 0, (W - half * 2) // 2 + half * 2, H)
        ).resize((half, H), Image.LANCZOS))
    right = np.asarray(Image.fromarray(ra).crop(
        ((W - half * 2) // 2, 0, (W - half * 2) // 2 + half * 2, H)
        ).resize((half, H), Image.LANCZOS))
    _note_box("vs_name", name_left, (px(40), H - px(420), half - px(40),
                                    H - px(260)), 0.5, dur)
    _note_box("vs_name", name_right, (half + px(40), H - px(420), W - px(40),
                                      H - px(260)), 0.5, dur)

    def frame(t):
        canvas = Image.new("RGBA", (W, H), (12, 14, 20, 255))
        k = ease_out_cubic(min(1.0, t / 0.7))
        lx = int(-half + half * k)
        rx = int(W - half * k)
        canvas.paste(Image.fromarray(left), (lx, 0))
        canvas.paste(Image.fromarray(right), (rx, 0))
        d = ImageDraw.Draw(canvas, "RGBA")
        d.line([(half, 0), (half, H)], fill=GOLD + (255,), width=px(6))
        # names slam in
        if t >= 0.5:
            s = max(0.01, ease_out_back(min(1.0, (t - 0.5) / 0.4)))
            for name, cx in ((name_left, half // 2), (name_right, half + half // 2)):
                tile = text_rgba(name, font(FB, 44),
                                 fill=(255, 255, 255, 255), max_w=half - px(80))
                fg = _rz(tile, s)
                tw2, th2 = fg.size
                pad = px(16)
                bg = Image.new("RGBA", (tw2 + pad * 2, th2 + pad * 2),
                               (10, 12, 18, 230))
                bg.alpha_composite(fg, (pad, pad))
                _place(canvas, bg, cx, H - px(330))
        if title:
            arr = np.asarray(canvas)
            canvas = Image.fromarray(
                scrim_band(arr, 0, px(300), strength=0.55))
        # VS badge pops center, then clash pulses
        if t >= 0.9:
            s = max(0.01, ease_out_back(min(1.0, (t - 0.9) / 0.35)))
            rr = int(px(95) * s)
            d.ellipse([half - rr, H // 2 - rr, half + rr, H // 2 + rr],
                      fill=(16, 18, 26, 255), outline=GOLD + (255,),
                      width=px(8))
            vt = text_rgba("VS", font(FB, 84), fill=GOLD + (255,))
            vfg = _rz(vt, s)
            _place(canvas, vfg, half, H // 2)
            for pt in (1.15, 1.7):
                if t >= pt:
                    rk = (t - pt) / 0.6
                    if rk < 1:
                        r2 = int(px(100) + rk * px(160))
                        a2 = int(220 * (1 - rk))
                        d.ellipse([half - r2, H // 2 - r2, half + r2, H // 2 + r2],
                                  outline=GOLD + (a2,), width=px(6))
        return np.asarray(canvas.convert("RGB"))

    clip = VideoClip(frame, duration=dur)
    if title:
        clip = overlay_text(clip, title, FB, 60, dur, y_pos=px(110))
    return clip


def wipe_scene(img_a, img_b, dur, label_a="", label_b="", direction="left"):
    """Before/after wipe: image B sweeps across A with a gold edge line.

    direction "left": B enters from the left (edge travels left->right).
    The clearest visual form of change-over-time -- a micro-payoff."""
    from moviepy import VideoClip
    _note_prim("wipe_scene")
    a = _cover_arr(img_a)
    b = _cover_arr(img_b)

    def frame(t):
        k = ease_in_out_cubic(min(1.0, max(0.0, t / dur)))
        edge = int(W * k) if direction == "left" else int(W * (1 - k))
        canvas = Image.fromarray(a.copy()).convert("RGBA")
        if direction == "left":
            if edge > 0:
                canvas.paste(Image.fromarray(b).crop((0, 0, edge, H)), (0, 0))
        else:
            if edge < W:
                canvas.paste(Image.fromarray(b).crop((edge, 0, W, H)), (edge, 0))
        d = ImageDraw.Draw(canvas, "RGBA")
        d.line([(edge, 0), (edge, H)], fill=GOLD + (255,), width=px(7))
        # edge glow dot traveling with the wipe
        d.ellipse([edge - px(16), H // 2 - px(16), edge + px(16), H // 2 + px(16)],
                  fill=GOLD + (255,))
        for txt, cx in ((label_a, px(200)), (label_b, W - px(200))):
            if txt:
                tile = text_rgba(txt, font(FB, 40),
                                 fill=(255, 255, 255, 255), max_w=px(360))
                pad = px(14)
                bg = Image.new("RGBA",
                               (tile.width + pad * 2, tile.height + pad * 2),
                               (10, 12, 18, 220))
                bg.alpha_composite(tile, (pad, pad))
                _place(canvas, bg, cx, px(120))
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)


def myth_stamp(base_clip, at, dur, myth_text, correction):
    """Misconception-buster over a base clip: claim card appears, giant red
    MYTH stamp slams diagonally with screen shake, correction slides up.

    at: seconds into the base clip when the beat starts. dur: beat length.
    Keep to <=2 per video -- scarcity preserves punch."""
    from moviepy import VideoClip
    _note_prim("myth_stamp")
    base_dur = base_clip.duration
    _note_box("myth_stamp", "MYTH",
              (W // 2 - px(330), H // 2 - px(160), W // 2 + px(330),
               H // 2 + px(160)), at + 0.9, at + dur)
    _note_box("myth_correction", correction,
              (px(60), H - px(560), W - px(60), H - px(360)), at + 1.7,
               at + dur)

    def frame(t):
        canvas = Image.fromarray(base_clip.get_frame(t)).convert("RGBA")
        lt = t - at
        if lt < 0 or lt > dur:
            return np.asarray(canvas.convert("RGB"))
        d = ImageDraw.Draw(canvas, "RGBA")
        # claim card
        if lt >= 0:
            tile = text_rgba(myth_text, font(FB, 46),
                             fill=(255, 255, 255, 255), max_w=W - px(220))
            pad = px(26)
            card = Image.new("RGBA",
                             (tile.width + pad * 2, tile.height + pad * 2),
                             (16, 18, 26, 235))
            card.alpha_composite(tile, (pad, pad))
            _place(canvas, card, W // 2, H // 2 - px(320))
            eb = text_rgba("COMMON MISTAKE", font(FB, 34),
                           fill=(200, 205, 215, 255))
            epad = px(14)
            echip = Image.new("RGBA",
                              (eb.width + epad * 2, eb.height + epad * 2),
                              (10, 12, 18, 235))
            echip.alpha_composite(eb, (epad, epad))
            _place(canvas, echip, W // 2,
                   H // 2 - px(320) - card.height // 2 - px(44))
        # stamp slam + screen shake
        shake_x, shake_y = 0, 0
        if lt >= 0.9:
            st = lt - 0.9
            s = max(0.01, ease_out_back(min(1.0, st / 0.3)))
            if st < 0.5:
                decay = 1 - st / 0.5
                shake_x = int(px(16) * decay * np.sin(st * 95))
                shake_y = int(px(12) * decay * np.sin(st * 77 + 1))
            stamp = text_rgba("MYTH", font(FB, 190),
                              fill=STAMP_RED + (255,), max_w=px(700))
            stamp = stamp.rotate(-12, expand=True, resample=Image.BICUBIC)
            sfg = np.asarray(_rz(stamp, s))
            sw, sh = sfg.shape[1], sfg.shape[0]
            # red border box around the stamp
            pad = px(24)
            box = Image.new("RGBA", (sw + pad * 2, sh + pad * 2), (0, 0, 0, 0))
            bd = ImageDraw.Draw(box)
            bd.rectangle([0, 0, sw + pad * 2 - 1, sh + pad * 2 - 1],
                         outline=STAMP_RED + (255,), width=px(10))
            box.alpha_composite(Image.fromarray(sfg), (pad, pad))
            _place(canvas, box, W // 2 + shake_x, H // 2 + shake_y)
        # correction slides up
        if lt >= 1.7:
            ct = lt - 1.7
            tile = text_rgba(correction, font(FR, 42),
                             fill=(255, 255, 255, 255), max_w=W - px(200))
            pad = px(22)
            card = Image.new("RGBA",
                             (tile.width + pad * 2, tile.height + pad * 2),
                             (10, 12, 18, 235))
            card.alpha_composite(tile, (pad, pad))
            cd = ImageDraw.Draw(card)
            cd.rectangle([0, 0, px(10), card.height], fill=GOLD + (255,))
            y_final = H - px(300)
            y = y_final + px(140) * max(0, 1 - ct / 0.5)
            _place(canvas, card, W // 2, y)
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=base_dur)


def skit_scene(script_beats, dur, title="THOUGHT BUBBLE"):
    """Cutaway skit: original flat-art characters act out a 2-3 beat dialogue.

    script_beats: list of {"speaker": "A"|"B", "name": str, "text": str,
      "color": (r,g,b)}. Beats split dur evenly (or carry "at"/"dur").
    The CrashCourse Thought Bubble transfer: a voice + style change is a hard
    attention reset. Max 1 per video. Charm over fidelity -- the VOICES carry
    it, so keep the art simple and original (never clip art)."""
    from moviepy import VideoClip
    _note_prim("skit_scene")
    # beat timing
    beats = []
    n = len(script_beats)
    for i, b in enumerate(script_beats):
        at = b.get("at", dur * i / n)
        bd = b.get("dur", dur / n)
        beats.append((b, at, min(dur, at + bd)))
        _note_box("skit_line", b["text"],
                  (px(80), px(300), W - px(80), H - px(500)), at,
                  min(dur, at + bd))

    def draw_figure(d, cx, base_y, color, speaking, t, flip=False):
        """Original flat character: circle head, capsule body, dot eyes."""
        bounce = int(px(10) * abs(np.sin(t * 6))) if speaking else 0
        by = base_y - bounce
        hr = px(70)
        # body: rounded capsule
        bw, bh = px(150), px(300)
        d.rounded_rectangle([cx - bw / 2, by - bh, cx + bw / 2, by],
                            radius=bw // 2, fill=color + (255,))
        # head
        hy = by - bh - hr - px(18)
        d.ellipse([cx - hr, hy - hr, cx + hr, hy + hr],
                  fill=(244, 214, 178, 255))
        # hair cap
        d.arc([cx - hr, hy - hr, cx + hr, hy + hr], 180, 360,
              fill=color + (255,), width=px(22))
        # eyes (look toward the other speaker)
        ex = px(16) * (-1 if flip else 1)
        for sx in (-1, 1):
            d.ellipse([cx + sx * px(26) + ex - px(9), hy - px(9),
                       cx + sx * px(26) + ex + px(9), hy + px(9)],
                      fill=(20, 20, 25, 255))
        # mouth: open when speaking
        if speaking:
            mw = px(22) + int(px(8) * abs(np.sin(t * 9)))
            d.ellipse([cx + ex - mw, hy + px(34) - px(12),
                       cx + ex + mw, hy + px(34) + px(12)],
                      fill=(120, 40, 40, 255))
        else:
            d.arc([cx + ex - px(22), hy + px(18), cx + ex + px(22), hy + px(52)],
                  20, 160, fill=(20, 20, 25, 255), width=px(7))
        # arms: simple capsules angled out
        for sx in (-1, 1):
            d.line([(cx + sx * bw * 0.45, by - bh * 0.7),
                    (cx + sx * bw * 0.85, by - bh * 0.35)],
                   fill=color + (255,), width=px(34))

    def frame(t):
        # warm slate stage -- flat color, never black/white
        top = np.array([52, 58, 82], dtype=np.float32)
        bot = np.array([34, 38, 56], dtype=np.float32)
        grad = np.linspace(0, 1, H)[:, None, None]
        col = (top[None, None, :] * (1 - grad) + bot[None, None, :] * grad)
        arr = np.repeat(col, W, axis=1)
        canvas = Image.fromarray(arr.astype(np.uint8)).convert("RGBA")
        d = ImageDraw.Draw(canvas, "RGBA")
        # floor line + inset frame = the cutaway visual language
        m = px(36)
        d.rounded_rectangle([m, m, W - m, H - m], radius=px(40),
                            outline=(233, 196, 106, 160), width=px(5))
        d.line([(m + px(20), H - px(420)), (W - m - px(20), H - px(420))],
               fill=(255, 255, 255, 40), width=px(4))
        # title chip
        tt = text_rgba("✦ " + title + " ✦", font(FB, 40),
                       fill=GOLD + (255,))
        _place(canvas, tt, W // 2, px(110))
        # active beat
        active = beats[0][0]
        for b, at, bd in beats:
            if at <= t < bd:
                active = b
                break
        else:
            if t >= beats[-1][2]:
                active = beats[-1][0]
        for b, at, bd in beats:
            sp = b["speaker"]
            cx = W // 2 - px(260) if sp == "A" else W // 2 + px(260)
            draw_figure(d, cx, H - px(420), b.get("color", (90, 140, 200)),
                        speaking=(b is active and at <= t < bd), t=t,
                        flip=(sp == "B"))
            # name tag
            nt = text_rgba(b.get("name", sp), font(FB, 34),
                           fill=(255, 255, 255, 255))
            _place(canvas, nt, cx, H - px(360))
        # speech bubble for the active beat
        b, at, bd = next((bb for bb in beats if bb[1] <= t < bb[2]), beats[-1])
        lt = t - at
        s = max(0.01, ease_out_back(min(1.0, lt / 0.35)))
        tile = text_rgba(b["text"], font(FR, 44), fill=(18, 20, 28, 255),
                         max_w=W - px(320))
        fg = _rz(tile, s)
        bw2, bh2 = fg.size
        pad = px(30)
        bub = Image.new("RGBA", (bw2 + pad * 2, bh2 + pad * 2), (0, 0, 0, 0))
        db = ImageDraw.Draw(bub)
        db.rounded_rectangle([0, 0, bw2 + pad * 2 - 1, bh2 + pad * 2 - 1],
                             radius=px(36), fill=(242, 240, 234, 255))
        bub.alpha_composite(fg, (pad, pad))
        # tail toward the speaker
        sp = b["speaker"]
        tx = W // 2 - px(260) if sp == "A" else W // 2 + px(260)
        db.polygon([(tx - W // 2 + bub.width // 2 - px(24), bub.height - 4),
                    (tx - W // 2 + bub.width // 2 + px(24), bub.height - 4),
                    (tx - W // 2 + bub.width // 2, bub.height + px(44))],
                   fill=(242, 240, 234, 255))
        _place(canvas, bub, W // 2, px(560))
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)


def chapter_bar(base_clip, segments):
    """Persistent Kurzgesagt-style progress spine over a base clip.

    segments: list of (label, start, end) in seconds. Draws a slim bottom
    bar: gold fill to current t, chapter ticks, and a "2 of 5 · Causes"
    chip. Makes 8 minutes feel mapped."""
    from moviepy import VideoClip
    _note_prim("chapter_bar")
    total = base_clip.duration
    n = len(segments)

    def frame(t):
        canvas = Image.fromarray(base_clip.get_frame(t)).convert("RGBA")
        d = ImageDraw.Draw(canvas, "RGBA")
        y = H - px(64)
        x0, x1 = px(60), W - px(60)
        d.rounded_rectangle([x0, y - px(8), x1, y + px(8)], radius=px(8),
                            fill=(255, 255, 255, 70))
        fx = x0 + (x1 - x0) * min(1.0, t / total)
        if fx > x0:
            d.rounded_rectangle([x0, y - px(8), fx, y + px(8)], radius=px(8),
                                fill=GOLD + (255,))
        for label, s, e in segments:
            tx = x0 + (x1 - x0) * (s / total)
            d.line([(tx, y - px(14)), (tx, y + px(14))],
                   fill=(255, 255, 255, 200), width=px(4))
        cur = next((i for i, (lb, s, e) in enumerate(segments) if s <= t < e),
                   n - 1)
        label = segments[cur][0]
        chip = text_rgba(f"{cur + 1} of {n} · {label}", font(FB, 34),
                         fill=GOLD + (255,), max_w=W - px(200))
        pad = px(16)
        bg = Image.new("RGBA", (chip.width + pad * 2, chip.height + pad * 2),
                       (10, 12, 18, 225))
        bg.alpha_composite(chip, (pad, pad))
        bgd = ImageDraw.Draw(bg)
        bgd.rounded_rectangle([0, 0, bg.width - 1, bg.height - 1],
                              radius=px(18), outline=GOLD + (200,), width=px(3))
        _place(canvas, bg, W // 2, y - px(64))
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=total)
