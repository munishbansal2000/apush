#!/usr/bin/env python3
"""Video 5: "We Graded This 2025 SAQ" — a real student response to the released
2025 APUSH SAQ 2 (Webster, 1830), graded on camera.

Sample 2B: 2/3. Parts (a) and (b) earned; part (c) missed by anchoring to the
Missouri Compromise of 1820 — outside the 1848-1865 lane. Central beat:
"stay in your lane." Brief excerpts only, always paired with grading
commentary (IP rule: never reproduce a full sample response).
"""
import os
from PIL import Image, ImageDraw
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup5")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

WEBSTER = ("Daniel Webster, U.S. Senate, 1830: federal internal improvements serve "
           "\u201cthe common good.\u201d \u201cCarolina and Ohio are parts of the same country.\u201d")

def part_card(d, y, letter, title, window, move, earned):
    """A grading card for one SAQ part. Returns bottom y."""
    maxw = W - 2 * M - 120
    move_lines = R.wrap_px(move, R.serif_i, maxw)
    hh = 300 + 62 * len(move_lines)
    d.rounded_rectangle([M, y, W - M, y + hh], 24, fill=R.NOTE_BG,
                        outline=R.GREEN if earned else R.RED, width=4)
    # letter badge
    bx, by, br = M + 78, y + 78, 52
    d.ellipse([bx - br, by - br, bx + br, by + br],
              fill=R.GREEN if earned else R.RED)
    d.text((bx - 20, by - 38), letter, font=R.sans_b, fill=R.WHITE)
    d.text((M + 160, y + 44), title, font=R.sans_b, fill=R.WHITE)
    # window chip
    bb = d.textbbox((0, 0), window, font=R.sans_s)
    tw = bb[2] - bb[0]
    d.rounded_rectangle([W - M - tw - 70, y + 44, W - M - 30, y + 108], 16,
                        fill=(38, 42, 56), outline=R.GOLD, width=2)
    d.text((W - M - tw - 45, y + 56), window, font=R.sans_s, fill=R.GOLD)
    # student move
    cy = y + 150
    d.text((M + 60, cy), "Student's move:", font=R.sans_s, fill=R.DIM)
    cy += 62
    for ln in move_lines:
        d.text((M + 60, cy), ln, font=R.serif_i, fill=R.WHITE)
        cy += 62
    # verdict badge
    if earned:
        R.check_at(d, W - M - 90, y + hh - 80, 34)
    else:
        R.xmark_at(d, W - M - 90, y + hh - 80, 34)
    return y + hh

def year_x(yr):
    return M + (yr - 1820) / (1865 - 1820) * (W - 2 * M)

def lane_diagram(d, y, pins=()):
    """Timeline 1820-1865 with the two strict SAQ lanes. pins: list of
    (year, label, color, ok). Pins sit on their own row below the ticks
    so they never collide with bar labels; labels go in a legend."""
    d.rounded_rectangle([M, y, W - M, y + 330], 22, fill=R.NOTE_BG)
    for (a, b, label, col) in ((1820, 1848, "PART B LANE", R.GREEN),
                               (1848, 1865, "PART C LANE", R.GOLD)):
        x0, x1 = year_x(a), year_x(b)
        d.rounded_rectangle([x0, y + 40, x1, y + 110], 14, fill=(38, 42, 56),
                            outline=col, width=3)
        d.text((x0 + 16, y + 56), label, font=R.sans_s, fill=col)
    for yr in (1820, 1848, 1865):
        x = year_x(yr)
        d.line([x, y + 120, x, y + 145], fill=R.DIM, width=3)
        t = str(yr)
        bb = d.textbbox((0, 0), t, font=R.sans_s)
        d.text((x - (bb[2] - bb[0]) / 2, y + 150), t, font=R.sans_s, fill=R.DIM)
    for (yr, label, col, ok) in pins:
        x = min(max(year_x(yr), M + 30), W - M - 30)
        d.line([x, y + 110, x, y + 236], fill=col, width=4)
        if ok:
            d.ellipse([x - 14, y + 236, x + 14, y + 264], fill=col)
        else:
            R.xmark_at(d, x, y + 250, 24)
    ly = y + 360
    for (yr, label, col, ok) in pins:
        d.ellipse([M + 40 - 12, ly + 20, M + 40 + 12, ly + 44], fill=col)
        cy = ly
        for ln in R.wrap_px(label, R.sans, W - 2 * M - 150):
            d.text((M + 90, cy), ln, font=R.sans, fill=R.WHITE)
            cy += 72
        ly = cy + 16
    return ly

@stage("v5a")
def _():
    im, d = R.base()
    R.header(d, "2025 SAQ 2 \u00b7 GRADED LIVE")
    bottom, _ = R.paper_card(d, M, 300, WEBSTER, "The source \u00b7 Webster, 1830")
    y = bottom + 50
    for letter, q in (("A", "One purpose of leaders promoting ideas like Webster's"),
                      ("B", "One 1820\u20131848 development behind the speech's ideas"),
                      ("C", "One 1848\u20131865 debate similar to the speech's")):
        lines = R.wrap_px(q, R.sans, W - 2 * M - 220)[:2]
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
    return im

@stage("v5b")
def _():
    im, d = R.base()
    R.header(d, "PART A", "0 / 3")
    y = part_card(d, 300, "A", "Purpose", "no window",
                  "\u201cpromoting national unity over growing sectionalism\u201d", True)
    R.note_strip(d, y + 50, "+1 \u2014 matches the rubric: unity over sectionalism.", R.GREEN)
    return im

@stage("v5c")
def _():
    im, d = R.base()
    R.header(d, "PART B", "1 / 3")
    y = part_card(d, 300, "B", "Development", "1820\u20131848",
                  "the tariff fights \u2014 South Carolina threatening nullification over the Tariff of 1828", True)
    R.note_strip(d, y + 50, "+1 \u2014 correct window, correct content.", R.GREEN)
    return im

@stage("v5d")
def _():
    im, d = R.base()
    R.header(d, "PART C", "2 / 3")
    y = part_card(d, 300, "C", "Similar debate", "1848\u20131865",
                  "anchored to the Missouri Compromise \u2014 of 1820", False)
    y = lane_diagram(d, y + 50, pins=[
        (1820, "Student's answer: Missouri Compromise, 1820", R.RED, False),
    ]) + 50
    R.note_strip(d, y, "Real history \u2014 wrong lane. Part C starts in 1848.", R.RED)
    return im

@stage("v5e")
def _():
    im, d = R.base()
    R.header(d, "STAY IN YOUR LANE", "2 / 3")
    y = lane_diagram(d, 300, pins=[
        (1848, "Mexican Cession \u00b7 popular sovereignty", R.GREEN, True),
        (1857, "Dred Scott fallout", R.GREEN, True),
        (1860, "Election of 1860", R.GREEN, True),
    ]) + 50
    y2 = R.note_strip(d, y, "What earns part C: slavery debates inside the 1848\u20131865 window.", R.GREEN) + 40
    d.rounded_rectangle([M, y2, W - M, y2 + 300], 22, fill=R.NOTE_BG, outline=R.RED, width=3)
    d.text((M + 48, y2 + 30), "Biggest bleed on the exam", font=R.sans, fill=R.WHITE)
    d.text((M + 48, y2 + 110), "part C averaged", font=R.sans_s, fill=R.DIM)
    d.text((M + 48, y2 + 160), "0.41 / 1", font=R.sans_b, fill=R.RED)
    return im

@stage("v5f")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "2 / 3")
    y = 300
    for label, got, total in [("Part A", 1, 1), ("Part B", 1, 1), ("Part C", 0, 1)]:
        y = R.tally_row(d, y, label, got, total)
    y += 50
    R.note_strip(d, y, "Before you write, check the date window. Stay in your lane.", R.GOLD)
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
