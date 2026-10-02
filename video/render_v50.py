#!/usr/bin/env python3
"""Video 50: 2025 SAQ 3 graded — colonial politics, no-stimulus question.

Sample 3A: 3/3. Parts (a), (b), (c) all earned. Central beat: specific,
political, in-window — Mayflower Compact, post-war taxation, the Sons and
Daughters of Liberty. Brief move-cards only, always paired with grading
commentary (IP rule: never reproduce a full sample response).
"""
import os
from PIL import Image, ImageDraw
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup50")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

SOURCE = ("A no-stimulus question: three parts, three windows. A asks for a political "
          "development, 1607\u20131753. B for an effect of the Seven Years' War, 1754\u20131765. "
          "C for a group responding to rights debates, 1765\u20131783.")

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

@stage("v50a")
def _():
    im, d = R.base()
    R.header(d, "2025 SAQ 3 \u00b7 GRADED 3/3")
    bottom, _ = R.paper_card(d, M, 300, SOURCE, "The prompt \u00b7 no stimulus")
    hook_rows(d, bottom + 50, (
        ("A", "One political development, 1607\u20131753"),
        ("B", "One effect of the Seven Years' War, 1754\u20131765"),
        ("C", "One group responding to rights debates, 1765\u20131783")))
    return im

@stage("v50b")
def _():
    im, d = R.base()
    R.header(d, "PART A", "0 / 3")
    y = part_card(d, 300, "A", "Political development", "1607\u20131753",
                  "The Mayflower Compact \u2014 described as a set of rules and policies for the colony.", True)
    R.note_strip(d, y + 50, "+1 \u2014 a specific political development, described.", R.GREEN)
    return im

@stage("v50c")
def _():
    im, d = R.base()
    R.header(d, "PART B", "1 / 3")
    y = part_card(d, 300, "B", "War's effect", "1754\u20131765",
                  "Post-war British taxation increased \u2014 the Stamp Act and Tea Act.", True)
    R.note_strip(d, y + 50, "+1 \u2014 a real effect of the war, inside the window.", R.GREEN)
    return im

@stage("v50d")
def _():
    im, d = R.base()
    R.header(d, "PART C", "2 / 3")
    y = part_card(d, 300, "C", "Group response", "1765\u20131783",
                  "The Sons and Daughters of Liberty protested for colonists' rights \u2014 e.g. the Boston Tea Party.", True)
    R.note_strip(d, y + 50, "+1 \u2014 a specific group, with its response explained.", R.GREEN)
    return im

@stage("v50e")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "3 / 3")
    y = 300
    for label, got, total in [("Part A", 1, 1), ("Part B", 1, 1), ("Part C", 1, 1)]:
        y = R.tally_row(d, y, label, got, total)
    y += 50
    R.note_strip(d, y, "On an SAQ, each point is all or nothing \u2014 there are no partials.", R.GOLD)
    return im

@stage("v50f")
def _():
    im, d = R.base()
    R.header(d, "THE HABIT", "3 / 3")
    y = R.note_strip(d, 300, "Three habits, three points:", R.GREEN)
    for txt in ("A \u2014 SPECIFIC: named the Mayflower Compact and described it",
                "B \u2014 IN-WINDOW: post-war taxation, 1754\u20131765",
                "C \u2014 NAMED THE GROUP: Sons and Daughters of Liberty"):
        lines = R.wrap_px(txt, R.sans, W - 2 * M - 160)
        rh = 40 + 72 * len(lines)
        d.rounded_rectangle([M, y + 30, W - M, y + 30 + rh], 18, fill=R.NOTE_BG)
        for i, ln in enumerate(lines):
            d.text((M + 56, y + 52 + i * 72), ln, font=R.sans, fill=R.GOLD)
        y += rh + 30
    R.note_strip(d, y + 30, "That is what a perfect score looks like.", R.GOLD)
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
