#!/usr/bin/env python3
"""Video 26: WE GRADED THIS 2024 LEQ (GOOD) - real prompt, real student response (6/6).

2024 LEQ 3, causes of the growth of a national culture 1800-1848, Sample 3A (6/6):
ranked thesis (War of 1812 first), broad context, evidence argued not dropped
(impressment -> war -> Monroe Doctrine), reasoning by causation, complexity via
a contrarian multiple-perspectives case (no true national culture, North-South
split heading to the Civil War). Student moves shown only as paraphrased
move-cards.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup26")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

PROMPT = ("Evaluate the relative importance of the causes of the growth of "
          "a national culture in the United States from 1800 to 1848.")

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

# ---------------- hook + prompt ----------------
@stage("s0")
def _():
    im, d = R.base()
    d.text((M, 150), "2024 LEQ 3 \u00b7 GRADED 6/6", font=R.sans_b, fill=R.GOLD)
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL STUDENT RESPONSE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 6 / 6", R.GOLD, 72)
    return im

@stage("s1")
def _():
    im, d = R.base()
    R.header(d, "ANSWER THE QUESTION ASKED")
    bottom, _ = R.paper_card(d, M, 300, PROMPT, "2024 LEQ 3")
    R.note_strip(d, bottom + 60,
        "CAUSES of the growth of a national culture \u2014 not its effects. Effect-only essays lost the thesis.", R.GOLD)
    return im

# ---------------- grading ----------------
@stage("s2")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 6")
    y = move_card(d, 300, "The student's thesis \u00b7 paraphrased",
        "Causes, ranked: the War of 1812, westward expansion, the election "
        "of 1800, the Second Great Awakening \u2014 in that order.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 defensible claim, ranked, in one place.", R.GREEN)
    return im

@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 6")
    y = move_card(d, 300, "The student's context \u00b7 paraphrased",
        "A broad characterization of 1800\u20131848 as the backdrop.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 a described situation, more than a phrase.", R.GREEN)
    return im

@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "4 / 6")
    y = move_card(d, 300, "Evidence argued, not dropped \u00b7 paraphrased",
        "British impressment and support for Native nations caused the War "
        "of 1812, which set the stage for the Monroe Doctrine and a lasting "
        "isolationist attitude.", "check")
    R.note_strip(d, y + 50, "+1 / +1 \u2014 examples tied to the argument, not just named.", R.GREEN)
    return im

@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "6 / 6")
    y = move_card(d, 300, "The student's reasoning \u00b7 paraphrased",
        "Causation throughout. Then the contrarian turn: no true national "
        "culture \u2014 only a Northern\u2013Southern split heading to the "
        "Civil War.", "check")
    R.note_strip(d, y + 50, "+1 / +1 \u2014 causation frames it; multiple perspectives with evidence earn complexity.", R.GREEN)
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
    for ln in R.wrap_px("Rank the causes, tie every example to the claim, and a bold qualification earns complexity on its own.",
                        R.serif_i, W - 2 * M):
        d.text((M, y), ln, font=R.serif_i, fill=R.WHITE); y += 56
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
