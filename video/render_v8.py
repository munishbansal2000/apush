#!/usr/bin/env python3
"""Video 8: 2023 LEQ2 GOOD (6/6) — transatlantic trade & colonial society,
1607-1776. Sample 2A: full marks. Student moves shown only as short
paraphrased move-cards paired with grading commentary.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup8")
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
    R.stamp_on(im, W // 2, 1150, "REAL TOP SAMPLE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 6 / 6", R.GOLD, 72)
    return im

# ---------------- thesis ----------------
@stage("s2")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 6")
    y = move_card(d, 300, "The student's claim \u00b7 paraphrased",
        "Change: distinct regions formed, with the South dependent on slave "
        "labor. Continuity: the colonies' ties to England endured.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 defensible claim with analytic categories.", R.GREEN)
    return im

# ---------------- contextualization ----------------
@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 6")
    y = move_card(d, 300, "The student's setup \u00b7 paraphrased",
        "Monarch-backed European exploration and advances in navigation "
        "before 1607.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 broader context, relevant to the prompt.", R.GREEN)
    return im

# ---------------- evidence ----------------
@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "4 / 6")
    y = 300
    d.text((M, y), "Examples argued for regional differences:",
           font=R.sans_s, fill=R.DIM)
    y += 60
    d.rounded_rectangle([M, y, W - M, y + 4 * 118 + 40], 22, fill=R.NOTE_BG)
    cy = y + 30
    for name in ["Massachusetts Bay founding motives",
                 "Shipbuilding economy",
                 "Tobacco-driven Virginian economy",
                 "Shift to enslaved African labor"]:
        R.check_at(d, M + 68, cy + 28, 18)
        d.text((M + 120, cy + 4), name, font=R.sans_s, fill=R.WHITE)
        cy += 118
    y = y + 4 * 118 + 90
    R.note_strip(d, y,
        "+1 / +1 \u2014 specific examples used to support an argument.",
        R.GREEN)
    return im

# ---------------- analysis & reasoning ----------------
@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "5 / 6")
    y = move_card(d, 300, "Student's reasoning \u00b7 paraphrased",
        "Causation frames the essay: trade growth causing specific changes "
        "in colonial society.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 historical reasoning structuring an argument.", R.GREEN)
    return im

# ---------------- complexity ----------------
@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "COMPLEXITY", "6 / 6")
    y = move_card(d, 300, "Complexity move \u00b7 paraphrased",
        "Corroboration across regions, plus a continuity counter-thread: "
        "tea as a symbol of enduring English ties.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 the Chief Reader's textbook complexity pathway.", R.GREEN)
    return im

# ---------------- tally ----------------
@stage("s7")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "6 / 6")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 1, 1),
                              ("Evidence", 2, 2),
                              ("Analysis & Reasoning", 2, 2)]:
        y = R.tally_row(d, y, label, got, total)
    return im

# ---------------- takeaway ----------------
@stage("s8")
def _():
    im, d = R.base()
    R.header(d, "THE TAKEAWAY", "6 / 6")
    y = 300
    y = R.note_strip(d, y,
        "Pair a change with a continuity.", R.GOLD) + 40
    y = R.note_strip(d, y,
        "Make every example prove part of the claim.", R.GOLD) + 40
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save("%s/%s.png" % (OUT, name))
    print("%d stages rendered" % len(STAGES))
