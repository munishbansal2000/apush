#!/usr/bin/env python3
"""Video 24: WE GRADED THIS 2024 LEQ (GOOD) - real prompt, real student response (6/6).

2024 LEQ 2, causes of European-Native conflict 1500-1763, Sample 2A (6/6):
ranked thesis (mistreatment first), context (Columbus as first contact),
deep evidence bench, comparison (Spanish vs. French), complexity (continuity
Pueblo Revolt -> King Philip's War, alliance systems as resistance strategy).
Student moves shown only as short paraphrased move-cards.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup24")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

PROMPT = ("Evaluate the relative importance of the causes of conflict among "
          "Europeans and Native Americans from 1500 to 1763.")

def move_card(d, y, title, body, verdict):
    """verdict: 'check' | 'x' | 'none'. Returns bottom y."""
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

def chips(d, y, items, bad=None):
    boxh = 36 + 84 * (len(items) + (1 if bad else 0))
    d.rounded_rectangle([M, y, W - M, y + boxh], 22, fill=R.NOTE_BG)
    cy = y + 36
    for name in items:
        d.rounded_rectangle([M + 40, cy, M + 96, cy + 56], 12,
                            fill=(24, 60, 40), outline=R.GREEN, width=3)
        R.check_at(d, M + 68, cy + 28, 16, R.GREEN, 6)
        d.text((M + 120, cy + 4), name, font=R.sans_s, fill=R.WHITE)
        cy += 84
    if bad:
        d.text((M + 40, cy + 6), bad, font=R.sans_s, fill=R.DIM)
        R.xmark_at(d, W - M - 100, y + boxh // 2, 30)
    return y + boxh

# ---------------- hook + prompt ----------------
@stage("s0")
def _():
    im, d = R.base()
    d.text((M, 150), "2024 LEQ 2 \u00b7 GRADED 6/6", font=R.sans_b, fill=R.GOLD)
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL STUDENT RESPONSE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 6 / 6", R.GOLD, 72)
    return im

@stage("s1")
def _():
    im, d = R.base()
    R.header(d, "ANSWER THE QUESTION ASKED")
    bottom, _ = R.paper_card(d, M, 300, PROMPT, "2024 LEQ 2")
    R.note_strip(d, bottom + 60,
        "\u201cRelative importance\u201d means rank the causes: which mattered most, which less. The ranking is the spine of the essay.", R.GOLD)
    return im

# ---------------- grading ----------------
@stage("s2")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 6")
    y = move_card(d, 300, "The student's thesis \u00b7 paraphrased",
        "Mistreatment of Native Americans was the most important cause, "
        "ahead of forced assimilation and labor exploitation.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 defensible claim, ranked, in one place.", R.GREEN)
    return im

@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 6")
    y = move_card(d, 300, "The student's context \u00b7 paraphrased",
        "Columbus's arrival as first Native\u2013European contact: the world "
        "before the conflict.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 a described situation, more than a phrase.", R.GREEN)
    return im

@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "4 / 6")
    y = 300
    d.text((M, y), "Used to support the argument:", font=R.sans_s, fill=R.DIM); y += 60
    y = chips(d, y, ["Encomienda", "French fur trade", "Pueblo Revolt",
                     "King Philip's War", "Casta system", "Iroquois Confederacy"]) + 50
    R.note_strip(d, y, "+1 / +1 \u2014 six examples named AND used to argue relative importance.", R.GREEN)
    return im

@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "6 / 6")
    y = move_card(d, 300, "The student's reasoning \u00b7 paraphrased",
        "Compared Spanish and French labor practices. Then continuity: the "
        "Pueblo Revolt and King Philip's War, and alliance systems as Native "
        "resistance strategy.", "check")
    R.note_strip(d, y + 50, "+1 / +1 \u2014 comparison frames the argument; multiple causes with nuance earn complexity.", R.GREEN)
    return im

@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "6 / 6")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 1, 1),
                              ("Evidence", 2, 2), ("Analysis & Reasoning", 2, 2)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    for ln in R.wrap_px("Rank the causes, sustain comparison across empires, and complexity writes itself.",
                        R.serif_i, W - 2 * M):
        d.text((M, y), ln, font=R.serif_i, fill=R.WHITE); y += 56
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
