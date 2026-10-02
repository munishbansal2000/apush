#!/usr/bin/env python3
"""Video 11: 2023 LEQ3 BAD (2/6) — foreign policy & territorial growth,
1840-1898. Sample 3C: lost thesis and contextualization; named evidence
without developing it. Student moves shown only as short paraphrased
move-cards paired with grading commentary.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup11")
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
    R.stamp_on(im, W // 2, 1150, "REAL BOTTOM SAMPLE", R.RED, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 2 / 6", R.RED, 72)
    return im

# ---------------- thesis: lost ----------------
@stage("s2")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "0 / 6")
    y = move_card(d, 300, "Student's opening \u00b7 paraphrased",
        "Restated the prompt in the first sentence \u2014 no line of "
        "reasoning established.", "x")
    R.note_strip(d, y + 50,
        "0 \u2014 without a thesis, even decent evidence cannot reach full "
        "points.", R.RED)
    return im

# ---------------- contextualization: lost ----------------
@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "0 / 6")
    y = move_card(d, 300, "The student's setup \u00b7 paraphrased",
        "Overgeneralized framing with no described broader context.",
        "x")
    R.note_strip(d, y + 50,
        "0 \u2014 more than a phrase or a generality is required.", R.RED)
    return im

# ---------------- evidence: 1 pt ----------------
@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "1 / 6")
    y = 300
    d.text((M, y), "Named versus developed:", font=R.sans_s, fill=R.DIM)
    y += 60
    d.rounded_rectangle([M, y, W - M, y + 3 * 118 + 40], 22, fill=R.NOTE_BG)
    cy = y + 30
    for name, ok in [("Mexican-American War \u00b7 passing ref.", True),
                     ("Texas annexation \u00b7 named", True),
                     ("Spanish-American War \u00b7 one piece",
                      True)]:
        R.check_at(d, M + 68, cy + 28, 18)
        d.text((M + 120, cy + 4), name, font=R.sans_s, fill=R.WHITE)
        cy += 118
    y = y + 3 * 118 + 90
    R.note_strip(d, y,
        "+1 \u2014 specific examples named. Only one was developed into an "
        "argument, so the second point falls.", R.RED)
    return im

# ---------------- reasoning: earned ----------------
@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "2 / 6")
    y = move_card(d, 300, "Student's reasoning \u00b7 paraphrased",
        "Causation: a shift from isolationism to war-driven expansion.",
        "check")
    y = R.note_strip(d, y + 50,
        "+1 \u2014 historical reasoning structuring an argument.", R.GREEN) + 40
    R.note_strip(d, y,
        "Complexity: 0 \u2014 no corroboration, qualification, or "
        "modification.", R.RED)
    return im

# ---------------- tally ----------------
@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "2 / 6")
    y = 300
    for label, got, total in [("Thesis", 0, 1), ("Contextualization", 0, 1),
                              ("Evidence", 1, 2),
                              ("Analysis & Reasoning", 1, 2)]:
        y = R.tally_row(d, y, label, got, total)
    return im

# ---------------- teachable moment ----------------
@stage("s7")
def _():
    im, d = R.base()
    R.header(d, "TEACHABLE MOMENT", "2 / 6")
    y = 300
    y = R.note_strip(d, y,
        "Chronology: stay inside 1840\u20131898 \u2014 the Louisiana "
        "Purchase and the Monroe Doctrine do not count.", R.RED) + 40
    y = R.note_strip(d, y,
        "Frame: foreign policy, not domestic acts like Kansas-Nebraska or "
        "the Homestead Act.", R.GOLD) + 40
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save("%s/%s.png" % (OUT, name))
    print("%d stages rendered" % len(STAGES))
