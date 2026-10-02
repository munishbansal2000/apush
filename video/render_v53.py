#!/usr/bin/env python3
"""Video 53: 2025 SAQ 4 graded — Reconstruction politics, no-stimulus question.

Sample 4C: 1/3. Part (a) missed (no specific political development named);
(b) earned (segregation and literacy tests); (c) missed (Freedom Riders,
Montgomery bus boycott, March on Washington — all outside the 1900\u20131945
window). Central beat: name a specific group, inside the window. Brief
move-cards only, always paired with grading commentary (IP rule: never
reproduce a full sample response).
"""
import os
from PIL import Image, ImageDraw
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup53")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

SOURCE = ("A no-stimulus question: three parts, three windows. A asks for a political "
          "development during Reconstruction, 1865\u20131877. B for an effect of "
          "Reconstruction's end, 1877\u20131900. C for a group responding to debates about "
          "the federal government, 1900\u20131945.")

def part_card(d, y, letter, title, window, move, earned):
    """A grading card for one SAQ part. Returns bottom y."""
    maxw = W - 2 * M - 120
    move_lines = R.wrap_px(move, R.serif_i, maxw)
    bb = d.textbbox((0, 0), window, font=R.sans_s)
    tw = bb[2] - bb[0]
    title_maxw = W - 2 * M - 160 - (tw + 90)
    tlines = R.wrap_px(title, R.sans_b, title_maxw)[:2]
    extra = (len(tlines) - 1) * 64
    hh = 300 + 62 * len(move_lines) + extra
    d.rounded_rectangle([M, y, W - M, y + hh], 24, fill=R.NOTE_BG,
                        outline=R.GREEN if earned else R.RED, width=4)
    bx, by, br = M + 78, y + 78, 52
    d.ellipse([bx - br, by - br, bx + br, by + br],
              fill=R.GREEN if earned else R.RED)
    d.text((bx - 20, by - 38), letter, font=R.sans_b, fill=R.WHITE)
    for i, tl in enumerate(tlines):
        d.text((M + 160, y + 44 + i * 64), tl, font=R.sans_b, fill=R.WHITE)
    d.rounded_rectangle([W - M - tw - 70, y + 44, W - M - 30, y + 108], 16,
                        fill=(38, 42, 56), outline=R.GOLD, width=2)
    d.text((W - M - tw - 45, y + 56), window, font=R.sans_s, fill=R.GOLD)
    cy = y + 150 + extra
    d.text((M + 60, cy), "Student's move:", font=R.sans_s, fill=R.DIM)
    cy += 62
    for ln in move_lines:
        d.text((M + 60, cy), ln, font=R.serif_i, fill=R.WHITE)
        cy += 62
    if earned:
        R.check_at(d, W - M - 90, y + hh - 80, 34)
    else:
        R.xmark_at(d, W - M - 90, y + hh - 80, 34)
    return y + hh

def hook_rows(d, y, rows):
    for letter, q in rows:
        lines = R.wrap_px(q, R.sans, W - 2 * M - 220)[:3]
        rh = 56 + 72 * len(lines)
        d.rounded_rectangle([M, y, W - M, y + rh], 18, fill=R.NOTE_BG)
        d.ellipse([M + 70 - 34, y + rh / 2 - 34, M + 70 + 34, y + rh / 2 + 34],
                  fill=(38, 42, 56), outline=R.GOLD, width=3)
        bb = d.textbbox((0, 0), letter, font=R.sans_b)
        d.text((M + 70 - (bb[2] - bb[0]) / 2 - bb[0], y + rh / 2 - 36), letter,
               font=R.sans_b, fill=R.GOLD)
        ty = y + (rh - 72 * len(lines)) / 2 + 6
        for ln in lines:
            d.text((M + 130, ty), ln, font=R.sans, fill=R.WHITE)
            ty += 72
        y += rh + 20
    return y

def year_x(yr, lo, hi):
    return M + (yr - lo) / (hi - lo) * (W - 2 * M)

def lane_diagram(d, y, lo, hi, lanes, pins, ticks):
    """Collision-proof lane diagram. Lane labels are drawn inside a bar only if
    the bar fits them; a dot legend below always identifies every lane. pins:
    (year, label, color, ok, dy) — dy staggers pin marks vertically."""
    box_h = 330
    d.rounded_rectangle([M, y, W - M, y + box_h], 22, fill=R.NOTE_BG)
    for (a, b, label, col) in lanes:
        x0, x1 = year_x(a, lo, hi), year_x(b, lo, hi)
        d.rounded_rectangle([x0, y + 40, x1, y + 110], 14, fill=(38, 42, 56),
                            outline=col, width=3)
        if x1 - x0 > d.textlength(label, font=R.sans_s) + 44:
            d.text((x0 + 16, y + 56), label, font=R.sans_s, fill=col)
    for yr in ticks:
        x = year_x(yr, lo, hi)
        d.line([x, y + 120, x, y + 145], fill=R.DIM, width=3)
        t = str(yr)
        bb = d.textbbox((0, 0), t, font=R.sans_s)
        tx = min(max(x - (bb[2] - bb[0]) / 2, M + 4), W - M - (bb[2] - bb[0]) - 4)
        d.text((tx, y + 150), t, font=R.sans_s, fill=R.DIM)
    for (yr, label, col, ok, dy) in pins:
        x = min(max(year_x(yr, lo, hi), M + 30), W - M - 30)
        d.line([x, y + 110, x, y + 236 + dy], fill=col, width=4)
        if ok:
            d.ellipse([x - 14, y + 236 + dy, x + 14, y + 264 + dy], fill=col)
        else:
            R.xmark_at(d, x, y + 250 + dy, 24)
    ly = y + box_h + 24
    for (a, b, label, col) in lanes:
        d.ellipse([M + 40 - 10, ly + 12, M + 40 + 10, ly + 32], fill=col)
        d.text((M + 82, ly), "%s \u00b7 %d\u2013%d" % (label.title(), a, b),
               font=R.sans_s, fill=R.WHITE)
        ly += 60
    ly += 8
    for (yr, label, col, ok, dy) in pins:
        d.ellipse([M + 40 - 10, ly + 12, M + 40 + 10, ly + 32], fill=col)
        cy = ly
        for ln in R.wrap_px(label, R.sans, W - 2 * M - 150):
            d.text((M + 82, cy), ln, font=R.sans, fill=R.WHITE)
            cy += 72
        ly = cy + 8
    return ly

@stage("v53a")
def _():
    im, d = R.base()
    R.header(d, "2025 SAQ 4 \u00b7 GRADED 1/3")
    bottom, _ = R.paper_card(d, M, 300, SOURCE, "The prompt \u00b7 no stimulus")
    hook_rows(d, bottom + 50, (
        ("A", "One political development, 1865\u20131877"),
        ("B", "One effect of Reconstruction's end, 1877\u20131900"),
        ("C", "One group in federal-government debates, 1900\u20131945")))
    return im

@stage("v53b")
def _():
    im, d = R.base()
    R.header(d, "PART A", "0 / 3")
    y = part_card(d, 300, "A", "Reconstruction", "1865\u20131877",
                  "No specific political development was named for 1865\u20131877.", False)
    R.note_strip(d, y + 50, "0 \u2014 vague language about helping African Americans, without a development, fails.", R.RED)
    return im

@stage("v53c")
def _():
    im, d = R.base()
    R.header(d, "PART B", "0 / 3")
    y = part_card(d, 300, "B", "End of Reconstruction", "1877\u20131900",
                  "Segregation and literacy tests \u2014 effects of Reconstruction's end.", True)
    R.note_strip(d, y + 50, "+1 \u2014 cause and effect linked, inside the window.", R.GREEN)
    return im

@stage("v53d")
def _():
    im, d = R.base()
    R.header(d, "PART C", "1 / 3")
    y = part_card(d, 300, "C", "Federal debates", "1900\u20131945",
                  "Freedom Riders, Montgomery bus boycott, March on Washington.", False)
    y = lane_diagram(d, y + 50, 1865, 1970,
                     [(1865, 1877, "PART A LANE", R.GREEN),
                      (1877, 1900, "PART B LANE", R.GOLD),
                      (1900, 1945, "PART C LANE", (90, 160, 120))],
                     [(1955, "Montgomery bus boycott, 1955", R.RED, False, 0),
                      (1961, "Freedom Riders, 1961", R.RED, False, -70),
                      (1963, "March on Washington, 1963", R.RED, False, 70)],
                     [1877, 1900, 1945]) + 50
    R.note_strip(d, y, "Past 1945 \u2014 wrong lane.", R.RED)
    return im

@stage("v53e")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "1 / 3")
    y = 300
    for label, got, total in [("Part A", 0, 1), ("Part B", 1, 1), ("Part C", 0, 1)]:
        y = R.tally_row(d, y, label, got, total)
    y += 50
    R.note_strip(d, y, "The decisive miss: part C used post-1945 Civil Rights material.", R.GOLD)
    return im

@stage("v53f")
def _():
    im, d = R.base()
    R.header(d, "THE LESSON", "1 / 3")
    d.rounded_rectangle([M, 300, W - M, 300 + 300], 22, fill=R.NOTE_BG,
                        outline=R.RED, width=3)
    d.text((M + 48, 330), "Biggest bleed on the exam", font=R.sans, fill=R.WHITE)
    d.text((M + 48, 410), "part (c) averaged", font=R.sans_s, fill=R.DIM)
    d.text((M + 48, 460), "0.43 / 1", font=R.sans_b, fill=R.RED)
    R.note_strip(d, 650, "Identify a specific group tied to the federal-government debate. And Populists and Progressives are not interchangeable.", R.GOLD)
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
