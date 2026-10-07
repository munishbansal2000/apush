"""Low-level drawing helpers: gradients, text, compositing (PIL + numpy)."""

import os
import warnings

import numpy as np
from PIL import Image, ImageDraw, ImageFont

_HERE = os.path.dirname(os.path.abspath(__file__))
# Bundled fonts first: identical rendering on every platform, no system
# dependency. (DejaVu is freely licensed and ships with the library.)
# They live inside the package so installs include them; the legacy
# ../assets/fonts location is still honored as a fallback.
_BUNDLED = os.path.join(_HERE, "fonts")
_LEGACY_FONTS = os.path.normpath(
    os.path.join(_HERE, os.pardir, "assets", "fonts"))
_FONT_CANDIDATES = {
    ("sans", False): ["DejaVuSans.ttf", "Arial.ttf", "arial.ttf"],
    ("sans", True): ["DejaVuSans-Bold.ttf", "Arialbd.ttf", "arialbd.ttf"],
    ("serif", False): ["DejaVuSerif.ttf", "Times.ttf", "times.ttf"],
    ("serif", True): ["DejaVuSerif-Bold.ttf", "Timesbd.ttf", "timesbd.ttf"],
}
# System dirs searched after the bundled fonts.
_SYSTEM_DIRS = [
    "/usr/share/fonts/truetype/dejavu/",          # Linux
    "/usr/share/fonts/truetype/msttcorefonts/",   # Linux (Arial/Times)
    r"C:\Windows\Fonts",                          # Windows
    "/System/Library/Fonts",                      # macOS
    "/Library/Fonts",                             # macOS
]


def _resolve_font(names):
    """First existing path for the font names, bundled -> legacy -> system."""
    for directory in (_BUNDLED, _LEGACY_FONTS):
        for name in names:
            p = os.path.join(directory, name)
            if os.path.isfile(p):
                return p
    for d in _SYSTEM_DIRS:
        for name in names:
            p = os.path.join(d, name)
            if os.path.isfile(p):
                return p
    return None


_RESOLVED = {k: _resolve_font(v) for k, v in _FONT_CANDIDATES.items()}

_font_cache = {}


def get_font(size, bold=False, serif=False):
    """Cached truetype font. Falls back gracefully if a variant is missing."""
    key = (serif, bold, size)
    if key not in _font_cache:
        family = "serif" if serif else "sans"
        path = None
        for variant in [(family, bold), ("sans", bold), ("sans", False)]:
            path = _RESOLVED.get(variant)
            if path:
                break
        if path:
            try:
                _font_cache[key] = ImageFont.truetype(path, size)
            except OSError:  # pragma: no cover
                path = None
        if not path:
            # Loud fallback: PIL's bitmap default is tiny and platform-
            # dependent, which breaks the identical-rendering guarantee.
            warnings.warn(
                f"no truetype font found for (serif={serif}, bold={bold}); "
                "falling back to PIL's bitmap default — install the bundled "
                "fonts or a system DejaVu",
                RuntimeWarning, stacklevel=2)
            _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]


def to_pil(arr):
    return Image.fromarray(arr.astype(np.uint8))


def to_np(img):
    return np.array(img.convert("RGB")).astype(np.uint8)


def load_image(path):
    """Load any image file as an RGB numpy array."""
    return to_np(Image.open(path))


def solid(w, h, color):
    return np.full((h, w, 3), color, dtype=np.uint8)


def vgradient(w, h, top, bottom):
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    top = np.clip(np.array(top, dtype=np.float32), 0, 255)
    bottom = np.clip(np.array(bottom, dtype=np.float32), 0, 255)
    grad = top * (1 - t) + bottom * t  # (h, 1, 3)
    return np.broadcast_to(grad, (h, w, 3)).astype(np.uint8)


def hgradient(w, h, left, right):
    t = np.linspace(0, 1, w, dtype=np.float32)[None, :, None]
    left = np.clip(np.array(left, dtype=np.float32), 0, 255)
    right = np.clip(np.array(right, dtype=np.float32), 0, 255)
    return np.broadcast_to(left * (1 - t) + right * t, (h, w, 3)).astype(np.uint8)


def radial_glow(w, h, cx, cy, color, radius):
    """Soft radial glow on black — screen-blend onto a background.

    cx, cy: center as fractions of w/h. radius: glow radius as a fraction
    of max(w, h). radius must be > 0.
    """
    if radius <= 0:
        raise ValueError(f"radius must be > 0, got {radius!r}")
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt((xx - cx * w) ** 2 + (yy - cy * h) ** 2) / (radius * max(w, h))
    fall = np.clip(1 - d, 0, 1) ** 2
    glow = np.zeros((h, w, 3), dtype=np.float32)
    glow += fall[:, :, None] * np.clip(np.array(color, dtype=np.float32), 0, 255)
    return glow.astype(np.uint8)


def screen_blend(base, glow, strength=1.0):
    b = base.astype(np.float32) / 255.0
    g = (glow.astype(np.float32) / 255.0) * strength
    out = 1 - (1 - b) * (1 - g)
    return (np.clip(out, 0, 1) * 255).astype(np.uint8)


def cover(img, w, h):
    """Scale image to cover (w,h), then center-crop. No distortion."""
    if w <= 0 or h <= 0:
        raise ValueError(f"cover target must be positive, got {(w, h)!r}")
    ih, iw = img.shape[:2]
    if iw == 0 or ih == 0:
        raise ValueError("cover input image has zero width or height")
    scale = max(w / iw, h / ih)
    nw, nh = max(1, round(iw * scale)), max(1, round(ih * scale))
    img = to_pil(img).resize((nw, nh), Image.BILINEAR)
    x0, y0 = (nw - w) // 2, (nh - h) // 2
    return to_np(img.crop((x0, y0, x0 + w, y0 + h)))


def dim(img, factor):
    if factor < 0:
        raise ValueError(f"dim factor must be >= 0, got {factor!r}")
    return np.clip(img.astype(np.float32) * factor, 0, 255).astype(np.uint8)


def vignette(img, strength=0.35):
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = (xx / w - 0.5) * 2
    dy = (yy / h - 0.5) * 2
    mask = 1 - strength * np.clip(dx ** 2 + dy ** 2 - 0.35, 0, 1)
    return (img.astype(np.float32) * mask[:, :, None]).astype(np.uint8)


def bottom_scrim(img, height_frac=0.45, max_alpha=0.82):
    """Dark gradient rising from the bottom — keeps captions readable."""
    h, w = img.shape[:2]
    height_frac = min(1.0, max(0.0, height_frac))
    max_alpha = min(1.0, max(0.0, max_alpha))
    sh = int(h * height_frac)
    if sh <= 0:
        return img.copy()
    alpha = np.linspace(0, max_alpha, sh, dtype=np.float32)[:, None]
    alpha = np.broadcast_to(alpha, (sh, w))
    black = np.zeros((sh, w, 3), dtype=np.float32)
    region = img[h - sh:].astype(np.float32)
    region = region * (1 - alpha[:, :, None]) + black * alpha[:, :, None]
    out = img.copy()
    out[h - sh:] = region.astype(np.uint8)
    return out


def wrap_text(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for word in words:
        trial = (cur + " " + word).strip()
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def draw_para(pil_img, box, text, size, fill, bold=False, serif=False,
              align="left", valign="top", line_spacing=1.3,
              stroke=0, stroke_fill=(0, 0, 0), alpha=255):
    """Draw wrapped text inside box=(x0,y0,x1,y1). Returns the image."""
    if align not in ("left", "center", "right"):
        raise ValueError(f"align must be 'left'|'center'|'right', got {align!r}")
    if valign not in ("top", "center", "bottom"):
        raise ValueError(f"valign must be 'top'|'center'|'bottom', got {valign!r}")
    if len(tuple(fill)) != 3:
        raise ValueError(f"fill must be a 3-tuple RGB color, got {fill!r}")
    draw = ImageDraw.Draw(pil_img, "RGBA")
    font = get_font(size, bold=bold, serif=serif)
    x0, y0, x1, y1 = box
    lines = wrap_text(draw, text, font, x1 - x0)
    ascent, descent = font.getmetrics()
    lh = int((ascent + descent) * line_spacing)
    total_h = lh * len(lines)
    if valign == "center":
        y = y0 + (y1 - y0 - total_h) // 2
    elif valign == "bottom":
        y = y1 - total_h
    else:
        y = y0
    col = tuple(fill) + (alpha,)
    scol = tuple(stroke_fill) + (alpha,)
    for line in lines:
        lw = draw.textlength(line, font=font)
        if align == "center":
            x = x0 + (x1 - x0 - lw) / 2
        elif align == "right":
            x = x1 - lw
        else:
            x = x0
        draw.text((x, y), line, font=font, fill=col,
                  stroke_width=stroke, stroke_fill=scol if stroke else None)
        y += lh
    return pil_img


def text_block_size(text, size, max_w, bold=False, serif=False, line_spacing=1.3):
    """Measure (width, height) of wrapped text without drawing."""
    font = get_font(size, bold=bold, serif=serif)
    img = Image.new("RGB", (10, 10))
    draw = ImageDraw.Draw(img)
    lines = wrap_text(draw, text, font, max_w)
    ascent, descent = font.getmetrics()
    lh = int((ascent + descent) * line_spacing)
    w = max((draw.textlength(l, font=font) for l in lines), default=0)
    return w, lh * len(lines)


def pill(base, box, radius, fill, alpha=255):
    """Rounded-rectangle overlay with alpha, composited onto an RGB array."""
    h, w = base.shape[:2]
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle(box, radius=radius, fill=tuple(fill) + (alpha,))
    return np.array(Image.alpha_composite(to_pil(base).convert("RGBA"), layer).convert("RGB"))


def paste_rgba(base, overlay, pos):
    """Alpha-composite an RGBA overlay array onto an RGB base at (x, y)."""
    if overlay.ndim != 3 or overlay.shape[2] != 4:
        raise ValueError(
            f"overlay must be an RGBA array (h, w, 4), got shape {overlay.shape}")
    x, y = int(pos[0]), int(pos[1])
    h, w = overlay.shape[:2]
    bh, bw = base.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(bw, x + w), min(bh, y + h)
    if x1 <= x0 or y1 <= y0:
        return base
    ox0, oy0 = x0 - x, y0 - y
    ov = overlay[oy0:oy0 + (y1 - y0), ox0:ox0 + (x1 - x0)].astype(np.float32)
    a = (ov[:, :, 3:4] / 255.0)
    region = base[y0:y1, x0:x1].astype(np.float32)
    base[y0:y1, x0:x1] = (ov[:, :, :3] * a + region * (1 - a)).astype(np.uint8)
    return base
