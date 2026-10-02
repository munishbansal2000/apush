#!/usr/bin/env python3
"""Video 49: 2025 SAQ 2 graded — Webster's 1830 speech on internal improvements.

Sample 2C: 1/3. Part (a) earned; (b) missed (too vague, no specific
development); (c) missed (McCulloch v. Maryland, 1819 — outside the 1848\u20131865
window). Central beat: stay in your lane. Brief move-cards only, always paired
with grading commentary (IP rule: never reproduce a full sample response).
"""
import os
from PIL import Image, ImageDraw
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup49")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

SOURCE = ("Daniel Webster, U.S. Senate, 1830: federal internal improvements serve "
          "\u201cthe common good.\u201d \u201cCarolina and Ohio are parts of the same country.\u201d")

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
    """Lane diagram with an explicit tick list so lane boundaries never collide."""
    d.rounded_rectangle([M, y, W - M, y + 330], 22, fill=R.NOTE_BG)
    for (a, b, label, col) in lanes:
        x0, x1 = year_x(a, lo, hi), year_x(b, lo, hi)
        d.rounded_rectangle([x0, y + 40, x1, y + 110], 14, fill=(38, 42, 56),
                            outline=col, width=3)
        d.text((x0 + 16, y + 56), label, font=R.sans_s, fill=col)
    for yr in ticks:
        x = year_x(yr, lo, hi)
        d.line([x, y + 120, x, y + 145], fill=R.DIM, width=3)
        t = str(yr)
        bb = d.textbbox((0, 0), t, font=R.sans_s)
        d.text((x - (bb[2] - bb[0]) / 2, y + 150), t, font=R.sans_s, fill=R.DIM)
    for (yr, label, col, ok) in pins:
        x = min(max(year_x(yr, lo, hi), M + 30), W - M - 30)
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

@stage("v49a")
def _():
    im, d = R.base()
    R.header(d, "2025 SAQ 2 \u00b7 GRADED 1/3")
    bottom, _ = R.paper_card(d, M, 300, SOURCE, "The source \u00b7 Webster, 1830")
    hook_rows(d, bottom + 50, (
        ("A", "One purpose of leaders promoting ideas like Webster's"),
        ("B", "One 1820\u20131848 development behind the speech's ideas"),
        ("C", "One 1848\u20131865 debate similar to the speech's")))
    return im

@stage("v49b")
def _():
    im, d = R.base()
    R.header(d, "PART A", "0 / 3")
    y = part_card(d, 300, "A", "Purpose", "describe",
                  "A basic description of promoting national unity.", True)
    R.note_strip(d, y + 50, "+1 \u2014 unity over sectionalism is the rubric's purpose.", R.GREEN)
    return im

@stage("v49c")
def _():
    im, d = R.base()
    R.header(d, "PART B", "1 / 3")
    y = part_card(d, 300, "B", "Development", "1820\u20131848",
                  "\u201cStates prioritizing their own needs over the federal government\u201d \u2014 too vague to credit.", False)
    R.note_strip(d, y + 50, "0 \u2014 no specific development, and no explanation of how it fits.", R.RED)
    return im

@stage("v49d")
def _():
    im, d = R.base()
    R.header(d, "PART C", "1 / 3")
    y = part_card(d, 300, "C", "Similar debate", "1848\u20131865",
                  "Invoked McCulloch v. Maryland \u2014 decided 1819.", False)
    y = lane_diagram(d, y + 50, 1815, 1865,
                     [(1820, 1848, "PART B LANE", R.GREEN),
                      (1848, 1865, "PART C LANE", R.GOLD)],
                     [(1819, "Student's answer: McCulloch v. Maryland, 1819", R.RED, False)],
                     [1820, 1848, 1865]) + 50
    R.note_strip(d, y, "Real case \u2014 wrong lane. Part C starts in 1848.", R.RED)
    return im

@stage("v49e")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "1 / 3")
    y = 300
    for label, got, total in [("Part A", 1, 1), ("Part B", 0, 1), ("Part C", 0, 1)]:
        y = R.tally_row(d, y, label, got, total)
    y += 50
    R.note_strip(d, y, "The decisive miss: part C anchored to 1819 \u2014 eleven years outside the lane.", R.GOLD)
    return im

@stage("v49f")
def _():
    im, d = R.base()
    R.header(d, "THE LESSON", "1 / 3")
    d.rounded_rectangle([M, 300, W - M, 300 + 300], 22, fill=R.NOTE_BG,
                        outline=R.RED, width=3)
    d.text((M + 48, 330), "Biggest bleed on the exam", font=R.sans, fill=R.WHITE)
    d.text((M + 48, 410), "part (c) averaged", font=R.sans_s, fill=R.DIM)
    d.text((M + 48, 460), "0.41 / 1", font=R.sans_b, fill=R.RED)
    R.note_strip(d, 650, "Chronological discipline: keep 1820\u20131848 material out of the 1848\u20131865 slot. Before you write, check the date window.", R.GOLD)
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
