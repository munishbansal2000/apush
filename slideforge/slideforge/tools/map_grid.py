"""Coordinate grid overlay for LLM-assisted marker placement.

Workflow:
  1. python -m slideforge.tools.map_grid <map_image> <out_png>
  2. Show the gridded image to the LLM (or a human) with a list of place names.
  3. The LLM reads (cx, cy) for each place off the grid labels.
  4. Paste the coordinates into MapZoomSlide markers — drop the grid, render.

Grid lines are labeled 0.0–1.0 on both axes, matching the (cx, cy)
fractional coordinates MapZoomSlide expects.
"""

import sys

from PIL import Image, ImageDraw

from .. import canvas as C
from ..canvas import get_font


def grid_overlay(image_path, out_path, step=0.1):
    img = C.load_image(image_path)
    h, w = img.shape[:2]
    pil = C.to_pil(C.dim(img, 0.72)).convert("RGBA")
    d = ImageDraw.Draw(pil)
    font = get_font(max(20, h // 28), bold=True)
    n = int(round(1 / step))
    for i in range(1, n):
        f = i * step
        x, y = int(f * w), int(f * h)
        d.line([(x, 0), (x, h)], fill=(255, 70, 70, 160), width=2)
        d.line([(0, y), (w, y)], fill=(255, 70, 70, 160), width=2)
        lbl = f"{f:.1f}"
        d.text((x + 8, 10), lbl, font=font, fill=(255, 70, 70, 255),
               stroke_width=3, stroke_fill=(0, 0, 0, 220))
        d.text((10, y + 8), lbl, font=font, fill=(255, 70, 70, 255),
               stroke_width=3, stroke_fill=(0, 0, 0, 220))
    # border labels for 0.0 / 1.0
    d.text((10, 10), "0.0, 0.0", font=font, fill=(255, 70, 70, 255),
           stroke_width=3, stroke_fill=(0, 0, 0, 220))
    pil.convert("RGB").save(out_path)
    print(f"wrote {out_path} ({w}x{h})")


def main():
    if len(sys.argv) != 3:
        print("usage: python -m slideforge.tools.map_grid <map_image> <out_png>")
        sys.exit(1)
    grid_overlay(sys.argv[1], sys.argv[2])


if __name__ == "__main__":
    main()
