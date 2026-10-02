#!/usr/bin/env python3
"""Video 10: 2023 LEQ3 GOOD (6/6) — foreign policy & territorial growth,
1840-1898. Sample 3A: full marks for a thesis that argues the prompt's
premise the other way. Student moves shown only as short paraphrased
move-cards paired with grading commentary.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup10")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

PROMPT = ("Evaluate the extent to which changes in United States foreign "
          "policy contributed to territorial growth from 1840 to 1898.")

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
    d.text((M, 150), "THE 2023 LEQ \u00b7 QUESTION 3", font=R.sans_b, fill=R.GOLD)
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
        "Foreign policy contributed very little; popular pressure drove "
        "territorial growth.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 \"the extent\" can be small. Arguing against the prompt's "
        "direction is allowed.", R.GREEN)
    return im

# ---------------- contextualization ----------------
@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 6")
    y = move_card(d, 300, "The student's setup \u00b7 paraphrased",
        "Expansion before the period: the colonial and Revolutionary era.",
        "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 broader context, relevant to the prompt.", R.GREEN)
    return im

# ---------------- evidence ----------------
@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "4 / 6")
    y = 300
    y = move_card(d, y, "Texas annexation \u00b7 paraphrased",
        "Argued as bottom-up Manifest Destiny, not a policy achievement.",
        "check")
    y += 40
    y = move_card(d, y, "Spanish-American War",
        "Argued as expansion driven by public pressure.", "check")
    y += 40
    R.note_strip(d, y,
        "+1 / +1 \u2014 two examples, both used to support the argument.",
        R.GREEN)
    return im

# ---------------- analysis & reasoning ----------------
@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "5 / 6")
    y = move_card(d, 300, "Student's reasoning \u00b7 paraphrased",
        "Causation throughout: popular pressure causing territorial growth.",
        "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 historical reasoning structuring an argument.", R.GREEN)
    return im

# ---------------- complexity ----------------
@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "COMPLEXITY", "6 / 6")
    y = move_card(d, 300, "Complexity move \u00b7 paraphrased",
        "The essay modifies the prompt's premise with evidence across "
        "three wars: policy was not the driver.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 qualifying and modifying the argument.", R.GREEN)
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
        "The lowest-scoring essay on this form \u2014 and a 6/6.", R.GOLD) + 40
    y = R.note_strip(d, y,
        "A bold, well-argued thesis can reverse the prompt's premise.",
        R.GOLD) + 40
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save("%s/%s.png" % (OUT, name))
    print("%d stages rendered" % len(STAGES))
