#!/usr/bin/env python3
"""Video 47: 2025 SAQ 1 graded — Wilentz vs. Bouton on early U.S. politics.

Sample 1C: 1/3. Part (a) earned; (b) missed (evidence named but never explained
as supporting Wilentz); (c) missed (historically inaccurate link to Bouton).
Central beat: name the evidence AND explain how it does its job. Brief
move-cards only, always paired with grading commentary (IP rule: never
reproduce a full sample response).
"""
import os
from PIL import Image, ImageDraw
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup47")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

SOURCE = ("Two historians on early American politics, 1789\u20131820: Wilentz sees a more "
          "egalitarian Revolution; Bouton sees an elite victory.")

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

@stage("v47a")
def _():
    im, d = R.base()
    R.header(d, "2025 SAQ 1 \u00b7 GRADED 1/3")
    bottom, _ = R.paper_card(d, M, 300, SOURCE, "The sources \u00b7 Wilentz vs. Bouton")
    hook_rows(d, bottom + 50, (
        ("A", "One difference between the two interpretations"),
        ("B", "One 1789\u20131820 development backing Wilentz"),
        ("C", "One 1789\u20131820 development backing Bouton")))
    return im

@stage("v47b")
def _():
    im, d = R.base()
    R.header(d, "PART A", "0 / 3")
    y = part_card(d, 300, "A", "Interpretations", "describe",
                  "Contrasted Bouton's post-Revolution elite beneficiaries with Wilentz's more egalitarian aftermath.", True)
    R.note_strip(d, y + 50, "+1 \u2014 the difference is described, not just named.", R.GREEN)
    return im

@stage("v47c")
def _():
    im, d = R.base()
    R.header(d, "PART B", "1 / 3")
    y = part_card(d, 300, "B", "Support Wilentz", "1789\u20131820",
                  "Cited Federalist\u2013Jeffersonian foreign-policy differences \u2014 but never explained how they support Wilentz's egalitarianism claim.", False)
    R.note_strip(d, y + 50, "0 \u2014 evidence without explanation. Part B asks how it supports the argument.", R.RED)
    return im

@stage("v47d")
def _():
    im, d = R.base()
    R.header(d, "PART C", "1 / 3")
    y = part_card(d, 300, "C", "Support Bouton", "1789\u20131820",
                  "Claimed Bacon's Rebellion helped replace the Articles of Confederation \u2014 historically inaccurate.", False)
    R.note_strip(d, y + 50, "0 \u2014 wrong history earns nothing, and the link to Bouton was never explained.", R.RED)
    return im

@stage("v47e")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "1 / 3")
    y = 300
    for label, got, total in [("Part A", 1, 1), ("Part B", 0, 1), ("Part C", 0, 1)]:
        y = R.tally_row(d, y, label, got, total)
    y += 50
    R.note_strip(d, y, "The decisive miss: parts B and C named things but never explained them.", R.GOLD)
    return im

@stage("v47f")
def _():
    im, d = R.base()
    R.header(d, "THE LESSON", "1 / 3")
    d.rounded_rectangle([M, 300, W - M, 300 + 300], 22, fill=R.NOTE_BG,
                        outline=R.RED, width=3)
    d.text((M + 48, 330), "Biggest bleed on the exam", font=R.sans, fill=R.WHITE)
    d.text((M + 48, 410), "part (b) averaged", font=R.sans_s, fill=R.DIM)
    d.text((M + 48, 460), "0.27 / 1", font=R.sans_b, fill=R.RED)
    R.note_strip(d, 650, "Students could identify supporting evidence but could not explain how it did its job. Drill the describe\u2013explain distinction \u2014 and stay inside 1789\u20131820.", R.GOLD)
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
