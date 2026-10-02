#!/usr/bin/env python3
"""Video 13: 2023 LEQ4 BAD (2/6) — national security & foreign policy,
1945-1991. Sample 4C: thesis earned; lost contextualization, the second
evidence point, and both reasoning points. Student moves shown only as
short paraphrased move-cards paired with grading commentary.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup13")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

PROMPT = ("Evaluate the extent to which growing concerns about national "
          "security contributed to changes in United States foreign policy "
          "from 1945 to 1991.")

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
    d.text((M, 150), "THE 2023 LEQ \u00b7 QUESTION 4", font=R.sans_b, fill=R.GOLD)
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
        "National security concerns \u2014 nuclear weapons and the "
        "communist-capitalist rivalry \u2014 changed American foreign "
        "policy.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 defensible claim with a line of reasoning.", R.GREEN)
    return im

# ---------------- contextualization: lost ----------------
@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "1 / 6")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 300], 22, fill=R.NOTE_BG,
                        outline=R.RED, width=3)
    d.text((M + 48, y + 60), "Broader context described:", font=R.sans_s,
           fill=R.DIM)
    d.text((M + 48, y + 130), "\u2014 none described \u2014", font=R.sans,
           fill=R.RED)
    R.xmark_at(d, W - M - 100, y + 150, 30)
    y += 350
    R.note_strip(d, y,
        "0 \u2014 no World War II, no First Red Scare, nothing around the "
        "period.", R.RED)
    return im

# ---------------- evidence: 1 pt ----------------
@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "2 / 6")
    y = 300
    d.text((M, y), "Named, never used to support an argument:",
           font=R.sans_s, fill=R.DIM)
    y += 60
    d.rounded_rectangle([M, y, W - M, y + 3 * 118 + 40], 22, fill=R.NOTE_BG)
    cy = y + 30
    for name in ["Korea", "Vietnam", "Atomic weapons"]:
        d.text((M + 40, cy + 6), name, font=R.sans_s, fill=R.DIM)
        R.xmark_at(d, W - M - 100, cy + 34, 18)
        cy += 118
    y = y + 3 * 118 + 90
    R.note_strip(d, y,
        "+1 only \u2014 specific examples named. Naming is not arguing; the "
        "second point falls.", R.RED)
    return im

# ---------------- analysis: lost ----------------
@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "2 / 6")
    y = move_card(d, 300, "The argument",
        "No causation, comparison, or continuity-and-change structure "
        "framing an argument.", "x")
    R.note_strip(d, y + 50,
        "0 \u2014 no historical reasoning, and no complexity.", R.RED)
    return im

# ---------------- tally ----------------
@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "2 / 6")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 0, 1),
                              ("Evidence", 1, 2),
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
        "Specificity over generalization: name the policy, say what it was "
        "and why it happened.", R.RED) + 40
    y = R.note_strip(d, y,
        "And check chronology \u2014 keep each president's policies and "
        "each war in the right order.", R.GOLD) + 40
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save("%s/%s.png" % (OUT, name))
    print("%d stages rendered" % len(STAGES))
