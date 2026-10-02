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


def _bg_base(bg_img, darken=110):
    """Cover-crop an image to W×H and darken it for text overlay."""
    img = Image.open(bg_img).convert("RGB")
    scale = max(W / img.width, H / img.height)
    img = img.resize((int(img.width * scale) + 2, int(img.height * scale) + 2),
                     Image.LANCZOS)
    arr = np.asarray(img).astype(np.float32)
    x0 = (arr.shape[1] - W) // 2
    y0 = (arr.shape[0] - H) // 2
    crop = arr[y0:y0 + H, x0:x0 + W]
    return np.clip(crop - darken, 0, 255).astype(np.uint8)


def kinetic_text(phrase, dur, sub=None, color=(233, 196, 106, 255), bg_img=None,
                 darken=110):
    """Big phrase slamming in with a scale pop, over an image or dark background."""
    from moviepy import VideoClip
    bg = _bg_base(bg_img, darken) if bg_img else np.zeros((H, W, 3), dtype=np.uint8) + 18
    fnt = font(FB, 120)
    timg = text_rgba(phrase, fnt, fill=color, max_w=980)
    tw, th = timg.size

    def frame(t):
        # spring pop: overshoot then settle
        s = ease_out_back(t / 0.5)
        tw2, th2 = int(tw * s), int(th * s)
        fg = np.asarray(timg.resize((tw2, th2), Image.LANCZOS))
        canvas = bg.copy()
        x, y = (W - tw2) // 2, (H - th2) // 2 - 40
        # alpha blend
        a = (fg[:, :, 3:4].astype(np.float32) / 255.0)
        a = a * min(1, t / 0.25)
        canvas[y:y + th2, x:x + tw2] = (
            fg[:, :, :3] * a + canvas[y:y + th2, x:x + tw2] * (1 - a)).astype(np.uint8)
        return canvas

    clip = VideoClip(frame, duration=dur)
    if sub:
        clip = overlay_text(clip, sub, FR, 40, dur, y_pos=H // 2 + 160)
    return clip


def timeline_scene(events, dur, title="", bg_img=None, darken=150):
    """Horizontal timeline; event dots + labels pop in sequence.

    events: list of (label, caption). Dots appear evenly across dur.
    """
    from moviepy import VideoClip
    bg0 = (_bg_base(bg_img, darken) if bg_img
           else np.zeros((H, W, 3), dtype=np.uint8) + 20)
    # bake title + rail into the base once
    base_img = Image.fromarray(bg0)
    d = ImageDraw.Draw(base_img)
    if title:
        d.text((80, 120), title, font=font(FB, 56), fill=(233, 196, 106))
    y0 = H // 2
    d.line([(100, y0), (W - 100, y0)], fill=(90, 95, 110), width=8)
    base = np.asarray(base_img)
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
    """Real CIA World Factbook map of Cuba (public domain) with an animated
    '90 miles to Florida' overlay across the Straits of Florida and a pulsing
    marker over the western missile sites."""
    from moviepy import VideoClip
    import math
    bg = Image.new("RGB", (W, H), (16, 28, 44))
    cmap = Image.open(os.path.join(HERE, "assets/cuba/cuba_cia_map.png")).convert("RGB")
    mw = 980
    mh = int(cmap.height * (mw / cmap.width))
    cmap = cmap.resize((mw, mh), Image.LANCZOS)
    map_y = 620  # top edge of map band
    mf = font(FB, 44)
    lf = font(FB, 36)

    # straits line coords relative to map (top of map = Straits of Florida)
    def frame(t):
        canvas = bg.copy()
        canvas.paste(cmap, ((W - mw) // 2, map_y))
        d = ImageDraw.Draw(canvas)
        d.text((80, map_y - 220), "Cuba, October 1962", font=font(FB, 56),
               fill=(240, 242, 246))
        # animated dashed line across the straits (top ~12% of map)
        p = min(1, t / (dur * 0.5))
        x0, x1 = (W - mw) // 2 + 60, (W + mw) // 2 - 60
        y = map_y + int(mh * 0.10)
        xe = x0 + (x1 - x0) * p
        # dashed
        x = x0
        while x < xe:
            d.line([(x, y), (min(x + 24, xe), y)], fill=(233, 196, 106), width=8)
            x += 40
        if p >= 1:
            d.text(((W) // 2, y - 90), "90 MILES TO FLORIDA", font=mf,
                   fill=(233, 196, 106), anchor="ma")
            # pulsing dot over western Cuba (~35% across, ~30% down)
            r = 22 + int(7 * math.sin(t * 6))
            cx, cy = (W - mw) // 2 + int(mw * 0.35), map_y + int(mh * 0.30)
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 80, 60))
            d.text(((W) // 2, map_y + mh + 60), "Soviet missile sites",
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


def dur(path, pad=1.2):
    """MP3 duration in seconds, plus breathing room for the scene."""
    import subprocess
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip()) + pad


def bullet_slide(title, bullets, dur, footer="", bg_img=None, darken=130,
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
    title_lines = wrap_px(meas, title, tf, W - 160)
    items = []  # (tile_rgba, cx, cy)
    t_asc, t_desc = tf.getmetrics()
    b_asc, b_desc = bf.getmetrics()
    t_lh, b_lh = t_asc + t_desc + 14, b_asc + b_desc + 22
    # layout: measure first
    body = []
    for b in bullets:
        body += wrap_px(meas, "\u2022  " + b, bf, W - 180)
        body.append("")
    content_h = len(title_lines) * t_lh + 60 + len(body) * b_lh
    y = max(240, (H - content_h) // 2 - 60)
    for line in title_lines:
        tile = text_rgba(line, tf, fill=(233, 196, 106, 255), max_w=W - 160)
        items.append((tile, 80 + tile.width // 2, y + t_lh // 2, 0.0, True))
        y += t_lh
    y += 60
    idx = 0
    for line in body:
        if line:
            idx += 1
            tile = text_rgba(line, bf, fill=(232, 232, 232, 255), max_w=W - 180)
            items.append((tile, 90 + tile.width // 2, y + b_lh // 2,
                          0.15 + idx * stagger, False))
        y += b_lh
    footer_tile = None
    if footer:
        footer_tile = text_rgba(footer, font(FR, 34), fill=(120, 126, 140, 255))

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
            canvas.alpha_composite(footer_tile, (90, H - 140))
        return np.asarray(canvas.convert("RGB"))

    return VideoClip(frame, duration=dur)


def title_card(text, dur, sub=None, bg_img=None, darken=120):
    """Text card over an image (darkened) or flat background."""
    img = Image.fromarray(
        _bg_base(bg_img, darken) if bg_img
        else np.zeros((H, W, 3), dtype=np.uint8) + 16)
    d = ImageDraw.Draw(img)
    tf = font(FB, 72)
    lines = wrap_px(d, text, tf, W - 160)
    asc, desc = tf.getmetrics()
    lh = asc + desc + 16
    y = (H - len(lines) * lh) // 2 - 40
    for line in lines:
        d.text((80, y), line, font=tf, fill=(240, 242, 246))
        y += lh
    if sub:
        d.text((80, y + 40), sub, font=font(FR, 40), fill=(140, 146, 160))
    return slide_scene(img, dur)


def typewriter_scene(text, dur, bg_img=None, darken=120, sub=None):
    """Text types itself out character by character over an image.

    Made for primary-source quotes: let the historical voice appear live.
    """
    from moviepy import VideoClip
    bg0 = (_bg_base(bg_img, darken) if bg_img
           else np.zeros((H, W, 3), dtype=np.uint8) + 18)
    fnt = font(FR, 52)
    # wrap first so chars map to laid-out lines
    meas = ImageDraw.Draw(Image.new("RGB", (W, H)))
    lines = wrap_px(meas, text, fnt, W - 160)
    asc, desc = fnt.getmetrics()
    lh = asc + desc + 18
    y_start = (H - len(lines) * lh) // 2 - 60
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
            d.text((80, y), line, font=fnt, fill=(240, 242, 246))
            y += lh
        return np.asarray(canvas)

    clip = VideoClip(frame, duration=dur)
    if sub:
        clip = overlay_text(clip, sub, FR, 36, dur, y_pos=H - 320)
    return clip


def zoom_to(img_path, dur, cx=0.5, cy=0.5, end_zoom=2.2, zoom_dur=1.4,
            caption="", highlight_box=None):
    """Fast directed zoom into a point of interest.

    The modern emphasis move: punch from wide to tight on (cx, cy) with
    ease-out, then hold. cx/cy in 0..1 of the frame.
    """
    from moviepy import VideoClip
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
            d.rectangle(hb, outline=(233, 196, 106, int(255 * a)), width=10)
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
                r = int(20 + rt * 90)
                a = max(0, int(220 * (1 - rt / 1.6)))
                if a > 0 and r < 500:
                    d.ellipse([x - r, y - r, x + r, y + r],
                              outline=(233, 196, 106, a), width=6)
            d.ellipse([x - 14, y - 14, x + 14, y + 14], fill=(233, 196, 106, 255))
            if label:
                d.text((x, y - 60), label, font=lf, fill=(255, 255, 255, 255),
                       anchor="ma")
        return np.asarray(canvas.convert("RGB"))

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
