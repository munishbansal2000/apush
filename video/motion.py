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
        items.append((tile, px(80) + tile.width // 2, y + t_lh // 2, 0.0, True))
        y += t_lh
    y += px(60)
    idx = 0
    for line in body:
        if line:
            idx += 1
            tile = text_rgba(line, bf, fill=(232, 232, 232, 255), max_w=BASE_W - 180)
            items.append((tile, px(90) + tile.width // 2, y + b_lh // 2,
                          0.15 + idx * stagger, False))
        y += b_lh
    footer_tile = None
    if footer:
        footer_tile = text_rgba(footer, font(FR, 34), fill=(120, 126, 140, 255))
    _note_prim("bullet_slide")
    for tile, cx, cy, at, is_title in items:
        _note_box("bullet-title" if is_title else "bullet", "",
                  (cx - tile.width / 2, cy - tile.height / 2,
                   cx + tile.width / 2, cy + tile.height / 2), at, dur)
    if footer_tile:
        _note_box("bullet-footer", "",
                  (px(90), H - px(140), px(90) + footer_tile.width,
                   H - px(140) + footer_tile.height), 0, dur)

    def frame(t):
        canvas = Image.fromarray(base.copy()).convert("RGBA")
        for tile, cx, cy, at, is_title in items:
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


def assemble(scenes, audios, out, fps=30):
    """Concat scenes with 0.35s crossfades; each scene gets its narration audio."""
    assert len(scenes) == len(audios)
    final = concatenate_videoclips(scenes, method="compose",
                                  padding=-0.2)  # snappy crossfade
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
