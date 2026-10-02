#!/usr/bin/env python3
"""Generate original SVG timelines for APUSH period reviews U7, U8, U9.

Deterministic: no randomness, no external assets. Renders three files:
  u7.svg  (1890-1945)
  u8.svg  (1945-1980)
  u9.svg  (1980-2025)
All event dates were fact-verified against standard references; see the
period-review markdown files. Run: python3 gen_timelines_u789.py
"""
import os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

W, H = 1200, 470
M_LEFT, M_RIGHT = 70, 50
AXIS_Y = 250
TITLE_Y = 42
ERA_Y0, ERA_Y1 = 78, 420

FONT = "font-family='Segoe UI, Helvetica, Arial, sans-serif'"

PALETTE = {
    "bg": "#ffffff",
    "axis": "#1f2937",
    "dot": "#b91c1c",
    "year": "#111827",
    "label": "#374151",
    "tick": "#6b7280",
    "title": "#111827",
    "subtitle": "#4b5563",
    "era_label": "#6b7280",
}
ERA_FILLS = ["#eff6ff", "#fefce8", "#f0fdf4", "#fdf2f8", "#f5f3ff"]


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def block_width(year, lines):
    w = max(len(l) for l in lines) * 7.0 + 14
    w = max(w, len(str(year)) * 8.0 + 14)
    return w


def resolve_positions(items):
    """items: list of dicts with x and w. Returns label centers with no
    same-side overlap and everything inside the canvas. Deterministic."""
    lx = [it["x"] for it in items]
    ws = [it["w"] for it in items]
    n = len(items)
    # forward pass
    for i in range(1, n):
        need = lx[i - 1] + (ws[i - 1] + ws[i]) / 2 + 10
        if lx[i] < need:
            lx[i] = need
    # backward pass (right edge, then de-overlap)
    for i in range(n - 1, -1, -1):
        cap = W - ws[i] / 2 - 8
        if lx[i] > cap:
            lx[i] = cap
    for i in range(n - 2, -1, -1):
        need = lx[i + 1] - (ws[i] + ws[i + 1]) / 2 - 10
        if lx[i] > need:
            lx[i] = max(ws[i] / 2 + 8, need)
    return lx


def build_svg(title, subtitle, year_min, year_max, eras, events):
    x0, x1 = M_LEFT, W - M_RIGHT
    span = year_max - year_min

    def X(y):
        return x0 + (y - year_min) / span * (x1 - x0)

    parts = []
    parts.append(f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {W} {H}' "
                 f"width='{W}' height='{H}' role='img'>")
    parts.append(f"<rect x='0' y='0' width='{W}' height='{H}' fill='{PALETTE['bg']}'/>")
    parts.append(f"<text x='{W/2:.0f}' y='{TITLE_Y}' text-anchor='middle' "
                 f"{FONT} font-size='24' font-weight='700' fill='{PALETTE['title']}'>{esc(title)}</text>")
    parts.append(f"<text x='{W/2:.0f}' y='{TITLE_Y + 24}' text-anchor='middle' "
                 f"{FONT} font-size='14' fill='{PALETTE['subtitle']}'>{esc(subtitle)}</text>")

    for i, (e0, e1, elabel) in enumerate(eras):
        bx0, bx1 = X(e0), X(e1)
        fill = ERA_FILLS[i % len(ERA_FILLS)]
        parts.append(f"<rect x='{bx0:.1f}' y='{ERA_Y0}' width='{bx1-bx0:.1f}' "
                     f"height='{ERA_Y1-ERA_Y0}' fill='{fill}' opacity='0.85'/>")
        parts.append(f"<text x='{(bx0+bx1)/2:.1f}' y='{ERA_Y0 + 20}' text-anchor='middle' "
                     f"{FONT} font-size='12.5' font-style='italic' fill='{PALETTE['era_label']}'>"
                     f"{esc(elabel)}</text>")

    parts.append(f"<line x1='{x0}' y1='{AXIS_Y}' x2='{x1}' y2='{AXIS_Y}' "
                 f"stroke='{PALETTE['axis']}' stroke-width='3'/>")

    first = year_min + (5 - year_min % 5) % 5
    for y in range(first, year_max + 1, 5):
        xt = X(y)
        major = (y % 10 == 0)
        parts.append(f"<line x1='{xt:.1f}' y1='{AXIS_Y}' x2='{xt:.1f}' "
                     f"y2='{AXIS_Y + (10 if major else 6)}' stroke='{PALETTE['tick']}' stroke-width='1.5'/>")
        if major:
            parts.append(f"<text x='{xt:.1f}' y='{AXIS_Y + 26}' text-anchor='middle' "
                         f"{FONT} font-size='11' fill='{PALETTE['tick']}'>{y}</text>")

    # split events by side, resolve collisions per side
    above = [{"year": yr, "lines": ln, "x": X(yr), "above": True}
             for i, (yr, ln) in enumerate(events) if i % 2 == 0]
    below = [{"year": yr, "lines": ln, "x": X(yr), "above": False}
             for i, (yr, ln) in enumerate(events) if i % 2 == 1]
    for side in (above, below):
        for it in side:
            it["w"] = block_width(it["year"], it["lines"])
        centers = resolve_positions(side)
        for it, c in zip(side, centers):
            it["lx"] = c

    for it in above + below:
        x, lx = it["x"], it["lx"]
        year, lines, is_above = it["year"], it["lines"], it["above"]
        n = len(lines)
        parts.append(f"<circle cx='{x:.1f}' cy='{AXIS_Y}' r='6' fill='{PALETTE['dot']}' "
                     f"stroke='#ffffff' stroke-width='2'/>")
        if is_above:
            block_top = AXIS_Y - 30 - 20 * (n - 1) - 22
            year_y = block_top + 16
            block_bottom = year_y + 20 * n
            parts.append(f"<line x1='{x:.1f}' y1='{AXIS_Y - 8}' x2='{lx:.1f}' "
                         f"y2='{block_bottom:.1f}' stroke='{PALETTE['dot']}' "
                         f"stroke-width='1' opacity='0.5'/>")
            parts.append(f"<text x='{lx:.1f}' y='{year_y:.1f}' text-anchor='middle' "
                         f"{FONT} font-size='13.5' font-weight='700' fill='{PALETTE['year']}'>{year}</text>")
            for j, ln in enumerate(lines):
                parts.append(f"<text x='{lx:.1f}' y='{year_y + 20 * (j + 1):.1f}' text-anchor='middle' "
                             f"{FONT} font-size='12' fill='{PALETTE['label']}'>{esc(ln)}</text>")
        else:
            block_top = AXIS_Y + 30
            year_y = block_top + 16
            parts.append(f"<line x1='{x:.1f}' y1='{AXIS_Y + 8}' x2='{lx:.1f}' "
                         f"y2='{year_y:.1f}' stroke='{PALETTE['dot']}' "
                         f"stroke-width='1' opacity='0.5'/>")
            parts.append(f"<text x='{lx:.1f}' y='{year_y:.1f}' text-anchor='middle' "
                         f"{FONT} font-size='13.5' font-weight='700' fill='{PALETTE['year']}'>{year}</text>")
            for j, ln in enumerate(lines):
                parts.append(f"<text x='{lx:.1f}' y='{year_y + 20 * (j + 1):.1f}' text-anchor='middle' "
                             f"{FONT} font-size='12' fill='{PALETTE['label']}'>{esc(ln)}</text>")

    parts.append("</svg>")
    return "\n".join(parts)


U7 = dict(
    title="Unit 7: 1890-1945",
    subtitle="Progressivism, World Wars, and the New Deal",
    year_min=1890, year_max=1945,
    eras=[
        (1890, 1917, "Progressive Era"),
        (1917, 1929, "WWI and the 1920s"),
        (1929, 1939, "Great Depression"),
        (1939, 1945, "World War II"),
    ],
    events=[
        (1890, ["Sherman Antitrust Act;", "frontier declared closed"]),
        (1898, ["Spanish-American War;", "U.S. takes Philippines, Guam,", "Puerto Rico"]),
        (1901, ["Theodore Roosevelt", "becomes president"]),
        (1906, ["Pure Food and Drug Act;", "Meat Inspection Act"]),
        (1913, ["16th and 17th Amendments;", "Federal Reserve created"]),
        (1917, ["U.S. enters", "World War I"]),
        (1919, ["Treaty of Versailles;", "Red Scare"]),
        (1920, ["19th Amendment ratified;", "Harding elected;", "return to normalcy"]),
        (1929, ["Stock market crash"]),
        (1932, ["FDR elected;", "Bonus Army march"]),
        (1933, ["New Deal begins;", "Prohibition repealed"]),
        (1935, ["Second New Deal:", "Wagner Act, Social Security"]),
        (1941, ["Pearl Harbor;", "U.S. enters WWII"]),
        (1945, ["Atomic bombs; WWII ends;", "United Nations founded"]),
    ],
)

U8 = dict(
    title="Unit 8: 1945-1980",
    subtitle="Cold War, Civil Rights, and Upheaval",
    year_min=1945, year_max=1980,
    eras=[
        (1945, 1960, "Early Cold War"),
        (1960, 1968, "Rights Revolution"),
        (1968, 1980, "Fracture and Malaise"),
    ],
    events=[
        (1947, ["Truman Doctrine;"]),
        (1948, ["Marshall Plan", "launched;"]),
        (1949, ["NATO founded;", "Communist victory in China"]),
        (1950, ["Korean War begins;", "McCarthy's Red Scare"]),
        (1954, ["Brown v. Board", "of Education"]),
        (1957, ["Sputnik launched;", "Little Rock crisis"]),
        (1962, ["Cuban Missile Crisis"]),
        (1963, ["March on Washington;", "JFK assassinated"]),
        (1964, ["Civil Rights Act;", "Gulf of Tonkin"]),
        (1965, ["Voting Rights Act; Medicare;", "Vietnam escalation"]),
        (1968, ["Tet Offensive; King and Kennedy", "assassinated; Nixon elected"]),
        (1969, ["Apollo 11", "moon landing"]),
        (1972, ["Nixon visits China;", "Watergate break-in"]),
        (1974, ["Nixon resigns"]),
        (1979, ["Iranian Revolution;", "hostage crisis begins"]),
    ],
)

U9 = dict(
    title="Unit 9: 1980-Present",
    subtitle="Reagan Era, Globalization, and the 21st Century",
    year_min=1980, year_max=2025,
    eras=[
        (1980, 1991, "Reagan Era and Cold War's End"),
        (1991, 2001, "Post-Cold War and Globalization"),
        (2001, 2025, "War on Terror and Polarization"),
    ],
    events=[
        (1980, ["Reagan elected"]),
        (1981, ["Reagan tax cuts;", "PATCO strike broken"]),
        (1986, ["Iran-Contra revealed;", "Tax Reform Act"]),
        (1989, ["Berlin Wall falls"]),
        (1991, ["Gulf War;", "Soviet Union dissolves"]),
        (1994, ["NAFTA takes effect;", "GOP wins Congress"]),
        (1996, ["Welfare reform signed"]),
        (1998, ["Clinton impeached"]),
        (2001, ["9/11 attacks;", "war in Afghanistan"]),
        (2003, ["Iraq War begins"]),
        (2008, ["Financial crisis;", "Obama elected"]),
        (2010, ["Affordable Care Act signed"]),
        (2015, ["Obergefell:", "marriage equality nationwide"]),
        (2020, ["COVID-19 pandemic"]),
    ],
)


def main():
    for name, spec in (("u7", U7), ("u8", U8), ("u9", U9)):
        svg = build_svg(spec["title"], spec["subtitle"], spec["year_min"],
                        spec["year_max"], spec["eras"], spec["events"])
        path = os.path.join(OUT_DIR, name + ".svg")
        with open(path, "w", encoding="utf-8") as f:
            f.write(svg + "\n")
        print("wrote", path)


if __name__ == "__main__":
    main()
