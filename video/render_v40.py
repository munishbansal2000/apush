#!/usr/bin/env python3
"""Video 40: 2025 LEQ 2 graded 6/6 — a real top sample on Native American
societies' adaptation to Europeans, 1500-1754 (Sample 2A).

Walks what earned EACH rubric point, in rubric order. Watch how evidence is
used to prove claims, and how regional comparison earns complexity.
Student moves shown as paraphrased move-cards, never verbatim reproduction.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup40")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

PROMPT = ("Evaluate how Native American societies adapted to the presence "
          "of European colonists in North America from 1500 to 1754.")

def move_card(d, y, text, title):
    """A short paraphrased student move on paper. Returns bottom y."""
    bottom, _ = R.paper_card(d, M, y, text, title)
    return bottom

@stage("v40_00")
def _():
    im, d = R.base()
    R.header(d, "2025 LEQ 2 \u00b7 GRADED 6/6")
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL TOP SAMPLE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 6 / 6", R.GOLD, 72)
    return im

@stage("v40_00b")
def _():
    im, d = R.base()
    R.header(d, "THE WORD THAT MATTERS", "0 / 6")
    y = 300
    bottom, _ = R.paper_card(d, M, y, PROMPT, "2025 LEQ 2")
    y = bottom + 60
    R.note_strip(d, y,
        "Adapted. The subject is Native agency \u2014 what Native societies "
        "DID: resistance, accommodation, trade, diplomacy.", R.GOLD)
    return im

@stage("v40_01")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 6")
    bottom = move_card(d, 300,
        "Native adaptations meant forced conversion and land loss, military "
        "uprising when possible, and trade and cultural exchange while "
        "being pushed westward.",
        "The student's thesis")
    R.note_strip(d, bottom + 60,
        "+1 \u2014 defensible claim with a line of reasoning.", R.GREEN)
    return im

@stage("v40_02")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 6")
    bottom = move_card(d, 300,
        "Two worlds set up first: Native societies before contact, and "
        "why Europeans crossed the Atlantic \u2014 trade, conquest, conversion.",
        "The student's context")
    R.note_strip(d, bottom + 60,
        "+1 \u2014 broader context, relevant to the prompt.", R.GREEN)
    return im

@stage("v40_03")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "4 / 6")
    bottom = move_card(d, 300,
        "Metacom's War: a multi-tribal alliance against English expansion \u2014 "
        "resistance as deliberate strategy. Penn's agreements: accommodation "
        "through diplomacy. Each example proves a claim.",
        "The evidence")
    R.note_strip(d, bottom + 60,
        "+1 / +1 \u2014 examples used to support an argument, not just named.", R.GREEN)
    return im

@stage("v40_04")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "6 / 6")
    bottom = move_card(d, 300,
        "Adaptations compared across regions: Spanish incorporation, the "
        "British mix of resistance and accommodation, French and Dutch "
        "commercial-diplomatic ties.",
        "The comparison")
    R.note_strip(d, bottom + 60,
        "+1 / +1 \u2014 multiple perspectives make the argument complex.", R.GREEN)
    return im

@stage("v40_05")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "6 / 6")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 1, 1),
                              ("Evidence", 2, 2), ("Analysis & Reasoning", 2, 2)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    yy = y
    for ln in R.wrap_px('Each example proved a claim. That is the difference.',
                        R.serif_i, W - 2 * M):
        d.text((M, yy), ln, font=R.serif_i, fill=R.WHITE); yy += 56
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
