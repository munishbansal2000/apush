#!/usr/bin/env python3
"""Video 9: 2023 LEQ2 BAD (2/6) — transatlantic trade & colonial society,
1607-1776. Sample 2C: thesis and context earned; zero evidence, zero
analysis. Student moves shown only as short paraphrased move-cards
paired with grading commentary.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup9")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

PROMPT = ("Evaluate the extent to which the growth of transatlantic trade "
          "changed British North American colonial society from 1607 to 1776.")

def move_card(d, y, title, body, verdict):
    maxw = W - 2 * M - 96
    lines = R.wrap_px(body, R.sans, maxw)
    hh = 150 + 72 * len(lines)
    d.rounded_rectangle([M, y, W - M, y + hh], 22, fill=R.NOTE_BG)
    d.text((M + 48, y + 36), title, font=R.sans_s, fill=R.DIM)
    cy = y + 110
    for ln in lines:
        d.text((M + 48, cy), ln, font=R.sans, fill=R.WHITE)
        cy += 72
    if verdict == "check":
        R.check_at(d, W - M - 100, y + 70, 26)
    elif verdict == "x":
        R.xmark_at(d, W - M - 100, y + 70, 26)
    return y + hh

# ---------------- hook ----------------
@stage("s1")
def _():
    im, d = R.base()
    d.text((M, 150), "THE 2023 LEQ \u00b7 QUESTION 2", font=R.sans_b, fill=R.GOLD)
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL BOTTOM SAMPLE", R.RED, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 2 / 6", R.RED, 72)
    return im

# ---------------- thesis: earned ----------------
@stage("s2")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 6")
    y = move_card(d, 300, "The student's claim \u00b7 paraphrased",
        "Growing transatlantic trade changed colonial society toward "
        "independence.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 defensible claim with a line of reasoning.", R.GREEN)
    return im

# ---------------- contextualization: earned ----------------
@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 6")
    y = move_card(d, 300, "The student's setup \u00b7 paraphrased",
        "The Columbian Exchange as a chain of events setting the stage.",
        "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 broader context, relevant to the prompt.", R.GREEN)
    return im

# ---------------- evidence: lost ----------------
@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "2 / 6")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 300], 22, fill=R.NOTE_BG,
                        outline=R.RED, width=3)
    d.text((M + 48, y + 60), "Specific examples:", font=R.sans_s, fill=R.DIM)
    d.text((M + 48, y + 130), "\u2014 none named \u2014", font=R.sans,
           fill=R.RED)
    R.xmark_at(d, W - M - 100, y + 150, 30)
    y += 350
    R.note_strip(d, y,
        "0 \u2014 no tobacco, no indentured servitude, no Navigation Acts. "
        "No examples at all.", R.RED)
    return im

# ---------------- analysis: lost ----------------
@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "2 / 6")
    y = move_card(d, 300, "The argument",
        "Claim plus context \u2014 then nothing developed.", "x")
    R.note_strip(d, y + 50,
        "0 \u2014 no historical reasoning framing an argument, no "
        "complexity.", R.RED)
    return im

# ---------------- tally ----------------
@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "2 / 6")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 1, 1),
                              ("Evidence", 0, 2),
                              ("Analysis & Reasoning", 0, 2)]:
        y = R.tally_row(d, y, label, got, total)
    return im

# ---------------- teachable moment ----------------
@stage("s7")
def _():
    im, d = R.base()
    R.header(d, "TEACHABLE MOMENT", "2 / 6")
    y = 300
    y = R.note_strip(d, y,
        "Listing relevant terms without developing them earns nothing.",
        R.RED) + 40
    y = R.note_strip(d, y,
        "The fix: name specific examples and connect each one to the "
        "argument.", R.GOLD) + 40
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save("%s/%s.png" % (OUT, name))
    print("%d stages rendered" % len(STAGES))
