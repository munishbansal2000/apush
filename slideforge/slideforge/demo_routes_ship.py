"""Scripted Columbus route with a traveling galleon — the organic-feel answer
to the AI route passes (which kept redrawing the map).

Demo-only subclass of RouteSlide: the library is untouched. The map stays
pixel-perfect; only overlays animate: the glowing route line draws itself,
and a small galleon rides the route head with gentle bob/roll plus a fading
wake. Same map + waypoints as the AI passes, so the comparison is direct.

Run from ~/workspace/slideforge: python -m slideforge.demo_routes_ship
"""

import math

from PIL import Image, ImageDraw

from .timeline import Config, Movie
from .slides import TitleSlide, RouteSlide
from .canvas import to_pil, to_np

AMERICA = "assets/maps/america_gutierrez_1562.jpg"


def make_galleon(size=240):
    """Small stylized galleon sprite facing +x (east), on an RGBA tile."""
    s = size
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = s / 2
    cy = s / 2 + s * 0.10  # hull sits slightly below tile center

    hull = (96, 62, 34, 255)
    hull_dark = (66, 42, 24, 255)
    sail = (244, 237, 216, 255)
    sail_shade = (206, 192, 160, 255)
    mast = (72, 50, 30, 255)
    gold = (255, 176, 66, 255)

    L = s * 0.60          # hull length
    H = s * 0.15          # hull depth
    x0, x1 = cx - L / 2, cx + L / 2
    # tapered hull, bow to the right (+x)
    d.polygon([(x0, cy - H * 0.35), (x1 - L * 0.08, cy - H * 0.35),
               (x1, cy + H * 0.05), (x0 + L * 0.12, cy + H * 0.55),
               (x0, cy + H * 0.35)], fill=hull)
    # gold gunwale stripe
    d.line([(x0, cy - H * 0.35), (x1 - L * 0.08, cy - H * 0.35)],
           fill=gold, width=max(2, int(s * 0.012)))
    # stern castle
    d.rectangle([x0 - L * 0.02, cy - H * 1.10, x0 + L * 0.14, cy - H * 0.30],
                fill=hull_dark)
    # bowsprit
    d.line([(x1, cy - H * 0.25), (x1 + L * 0.15, cy - H * 0.60)],
           fill=mast, width=max(2, int(s * 0.020)))

    # two masts with billowed sails
    for mx, mast_h, sail_w in [(cx - L * 0.16, s * 0.42, s * 0.22),
                               (cx + L * 0.14, s * 0.34, s * 0.17)]:
        top = cy - mast_h
        d.line([(mx, cy - H * 0.3), (mx, top)], fill=mast,
               width=max(2, int(s * 0.020)))
        # yards
        d.line([(mx - sail_w / 2, top + s * 0.01), (mx + sail_w / 2, top + s * 0.01)],
               fill=mast, width=max(2, int(s * 0.014)))
        d.line([(mx - sail_w * 0.42, top + mast_h * 0.45),
                (mx + sail_w * 0.42, top + mast_h * 0.45)],
               fill=mast, width=max(2, int(s * 0.014)))
        # billowed sails bulging to starboard (+x)
        for sy0, sy1 in [(top + s * 0.02, top + mast_h * 0.44),
                         (top + mast_h * 0.47, cy - H * 0.28)]:
            steps = 12
            left, right = [], []
            for i in range(steps + 1):
                yy = sy0 + (sy1 - sy0) * i / steps
                bulge = math.sin(math.pi * i / steps) * s * 0.035
                left.append((mx - sail_w / 2 + bulge * 0.4, yy))
                right.append((mx + sail_w / 2 + bulge, yy))
            d.polygon(left + right[::-1], fill=sail)
            d.line(left, fill=sail_shade, width=1)
            d.line(right, fill=sail_shade, width=1)
    # pennant on the mainmast
    fx, fy = cx - L * 0.16, cy - s * 0.42
    d.polygon([(fx, fy), (fx + s * 0.10, fy + s * 0.018), (fx, fy + s * 0.036)],
              fill=gold)
    return img


class ShipRouteSlide(RouteSlide):
    """RouteSlide with a galleon riding the route head + fading wake."""

    def __init__(self, *a, ship_scale=0.125, **k):
        self.ship_scale = ship_scale  # ship height as fraction of frame height
        self._ship = None
        super().__init__(*a, **k)

    def _route_head(self, t):
        """Route-head position + tangent in screen coords, else (None, None)."""
        w, h = self.cfg.w, self.cfg.h
        p = self.route_progress(t)
        if p <= 0:
            return None, None
        cx, cy, fw = self.view_at(t)
        ih, iw = self.image.shape[:2]
        fh = fw * (iw / ih) / (w / h)

        def proj(wx, wy):
            return ((wx - (cx - fw / 2)) / fw * w,
                    (wy - (cy - fh / 2)) / fh * h)

        wps = [wp["at"] for wp in self.waypoints]
        n = len(wps)
        total = n - 1
        target = p * total
        shown = []
        for i in range(n - 1):
            pts = self._arc(proj(*wps[i]), proj(*wps[i + 1]), self.curvature)
            if i < int(target):
                shown.extend(pts)
            elif i == int(target):
                frac = target - i
                k = int(frac * (len(pts) - 1))
                shown.extend(pts[:k + 1])
                break
            else:
                break
        if len(shown) < 4:
            return None, None
        hx, hy = shown[-1]
        tx, ty = shown[-1][0] - shown[-4][0], shown[-1][1] - shown[-4][1]
        L = math.hypot(tx, ty) or 1.0
        return (hx, hy), (tx / L, ty / L)

    def frame(self, t):
        base = super().frame(t)
        head, tang = self._route_head(t)
        if head is None:
            return base
        w, h = self.cfg.w, self.cfg.h
        pil = to_pil(base).convert("RGBA")
        d = ImageDraw.Draw(pil, "RGBA")
        hx, hy = head
        tx, ty = tang
        # wake: fading foam trailing behind the ship
        for j in range(1, 9):
            wx = hx - tx * j * 9
            wy = hy - ty * j * 9
            r = max(1.5, 7 - j * 0.7)
            a = int(110 * (1 - j / 9))
            d.ellipse([wx - r, wy - r, wx + r, wy + r],
                      fill=(255, 255, 255, a))
        # ship, with gentle bob and roll for organic motion
        if self._ship is None:
            self._ship = make_galleon(240)
        bob = math.sin(2 * math.pi * t * 0.9) * h * 0.006
        roll = math.sin(2 * math.pi * t * 0.7 + 1.0) * 3.0
        ang = -math.degrees(math.atan2(ty, tx)) + roll
        ship = self._ship.rotate(ang, expand=True, resample=Image.BICUBIC)
        scale = (h * self.ship_scale) / ship.height
        ship = ship.resize((max(1, int(ship.width * scale)),
                            max(1, int(ship.height * scale))), Image.LANCZOS)
        # soft shadow under the ship so it reads over the old map
        sw, sh = ship.size
        d.ellipse([hx - sw * 0.30, hy + sh * 0.28, hx + sw * 0.30, hy + sh * 0.42],
                  fill=(20, 12, 6, 45))
        pil.alpha_composite(ship, (int(hx - sw / 2), int(hy - sh / 2 + bob)))
        return to_np(pil)


def main():
    cfg = Config(w=1280, h=720, fps=30)
    m = Movie(cfg, progress_bar=True)

    europa_bg = {"type": "image", "path": "assets/maps/europa_ortelius_1572.jpg",
                 "dim": 0.42,
                 "drift": [(0.5, 0.5, 1.0), (0.52, 0.48, 0.88)]}

    m.add(TitleSlide("Spanish Routes", "Columbus, 1492 — scripted, map intact",
                     duration=3.5, bg=europa_bg),
          transition="cut", trans_dur=0)

    # Columbus's first voyage — same waypoints as the AI passes
    m.add(ShipRouteSlide(
        AMERICA,
        waypoints=[
            {"at": (0.820, 0.330), "label": "La Gomera, Canaries",
             "sub": "Departs Sept 6, 1492"},
            {"at": (0.375, 0.365), "label": "San Salvador, Bahamas",
             "sub": "Landfall Oct 12, 1492"},
            {"at": (0.430, 0.430), "label": "Hispaniola",
             "sub": "La Navidad — first settlement"},
        ],
        zoom=2.4, hold=1.7, move_dur=2.0, curvature=0.10),
        transition="crossfade", trans_dur=0.6)

    m.add(TitleSlide("Two maps. One empire.", "",
                     duration=3.0, bg=europa_bg),
          transition="crossfade", trans_dur=0.6)

    print(f"total duration: {m.total_duration():.1f}s")
    m.render("demo_routes_ship.mp4", crf=20, preset="medium")


if __name__ == "__main__":
    main()
