#!/usr/bin/env python3
"""Video 12: 2023 LEQ4 GOOD (6/6) — national security & foreign policy,
1945-1991. Sample 4A: full marks. Student moves shown only as short
paraphrased move-cards paired with grading commentary.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup12")
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
    R.stamp_on(im, W // 2, 1150, "REAL TOP SAMPLE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 6 / 6", R.GOLD, 72)
    return im

# ---------------- thesis ----------------
@stage("s2")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 6")
    y = move_card(d, 300, "The student's claim \u00b7 paraphrased",
        "Three analytic categories: the Red Scare, domino theory, and the "
        "nuclear buildup.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 defensible claim with a line of reasoning.", R.GREEN)
    return im

# ---------------- contextualization ----------------
@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 6")
    y = move_card(d, 300, "The student's setup \u00b7 paraphrased",
        "The Soviet Union's creation, the First Red Scare, and America's "
        "WWII emergence as a superpower.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 broader context, relevant to the prompt.", R.GREEN)
    return im

# ---------------- evidence ----------------
@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "4 / 6")
    y = 300
    y = move_card(d, y, "Korea and Vietnam \u00b7 paraphrased",
        "Argued as products of domino theory.", "check")
    y += 40
    y = move_card(d, y, "Marshall Plan \u00b7 paraphrased",
        "Argued as anti-communist economic aid.", "check")
    y += 40
    y = move_card(d, y, "Berlin Airlift \u00b7 paraphrased",
        "Argued as resolve made concrete.", "check")
    y += 40
    R.note_strip(d, y,
        "+1 / +1 \u2014 examples used to support the argument.", R.GREEN)
    return im

# ---------------- analysis & reasoning ----------------
@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "5 / 6")
    y = move_card(d, 300, "Student's reasoning \u00b7 paraphrased",
        "Causation structures the essay: security fears causing containment "
        "policies.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 historical reasoning structuring an argument.", R.GREEN)
    return im

# ---------------- complexity ----------------
@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "COMPLEXITY", "6 / 6")
    y = move_card(d, 300, "Complexity move \u00b7 paraphrased",
        "Cross-period corroboration: the Marshall Plan reaches back to "
        "Reconstruction; NATO reaches back to Washington's Farewell "
        "Address.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 insightful connections across periods.", R.GREEN)
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
        "Name specific policies \u2014 and say what they were and why they "
        "happened.", R.GOLD) + 40
    y = R.note_strip(d, y,
        "Connect across periods.", R.GOLD) + 40
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save("%s/%s.png" % (OUT, name))
    print("%d stages rendered" % len(STAGES))
