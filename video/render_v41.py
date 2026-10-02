#!/usr/bin/env python3
"""Video 41: 2025 LEQ 2 graded 2/6 — a real bottom sample on Native American
societies' adaptation to Europeans, 1500-1754 (Sample 2C).

The decisive miss was prompt parsing: the prompt asks how Native societies
ADAPTED (Native agency); the response wrote about what Europeans did to them.
Ends on the pack's teachable moment: disease is not an adaptation, and the
geography has to be right.
Student moves shown as paraphrased move-cards, never verbatim reproduction.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup41")
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

@stage("v41_00")
def _():
    im, d = R.base()
    R.header(d, "2025 LEQ 2 \u00b7 GRADED 2/6")
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL BOTTOM SAMPLE", R.RED, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 2 / 6", R.RED, 72)
    return im

@stage("v41_01")
def _():
    im, d = R.base()
    R.header(d, "THE DECISIVE MISS", "0 / 6")
    y = 300
    y = R.note_strip(d, y,
        "The prompt asks how Native American societies ADAPTED \u2014 "
        "what Native societies DID.", R.GOLD) + 40
    y = R.note_strip(d, y,
        "Many responses wrote what Europeans DID TO Native Americans instead.", R.RED) + 40
    yy = y + 20
    for ln in R.wrap_px("Adaptation means Native agency. The reading comes first.",
                        R.serif_i, W - 2 * M):
        d.text((M, yy), ln, font=R.serif_i, fill=R.WHITE); yy += 56
    return im

@stage("v41_02")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 6")
    bottom = move_card(d, 300,
        "Native societies adapted through trade and westward conquest.",
        "The student's thesis")
    R.note_strip(d, bottom + 60,
        "+1 \u2014 defensible, with a line of reasoning.", R.GREEN)
    return im

@stage("v41_03")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "1 / 6")
    y = move_card(d, 300,
        "Two vague sentences, no broader world behind them.",
        "The context attempt")
    R.note_strip(d, y + 60,
        "0 \u2014 vague is not context.", R.RED)
    return im

@stage("v41_04")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "1 / 6")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 300], 22, fill=R.NOTE_BG, outline=R.RED, width=3)
    d.text((M + 48, y + 60), "The essay's examples:", font=R.sans_s, fill=R.DIM)
    ty = y + 120
    for ln in R.wrap_px("inaccurate, out of period, or under-described",
                        R.sans, W - 2 * M - 240):
        d.text((M + 48, ty), ln, font=R.sans, fill=R.RED); ty += 72
    R.xmark_at(d, W - M - 100, y + 150, 30)
    y += 350
    R.note_strip(d, y,
        "0 / 0 \u2014 two specific examples are required.", R.RED)
    return im

@stage("v41_05")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "2 / 6")
    bottom = move_card(d, 300,
        "Spanish-introduced smallpox pushed Native peoples westward \u2014 "
        "and British contact did the same thing off the Atlantic coast.",
        "The causation claim")
    R.note_strip(d, bottom + 60,
        "+1 \u2014 real reasoning, correctly rewarded. Complexity never arrives.", R.GOLD)
    return im

@stage("v41_06")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "2 / 6")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 0, 1),
                              ("Evidence", 0, 2), ("Analysis & Reasoning", 1, 2)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    y = R.note_strip(d, y,
        "Teachable moment: disease happened TO Native societies. "
        "An adaptation is something they DID.", R.GOLD)
    return im

@stage("v41_07")
def _():
    im, d = R.base()
    R.header(d, "THE SKILL", "2 / 6")
    y = 300
    y = R.note_strip(d, y,
        "Answer the question asked. Check the subject of every prompt sentence.", R.GOLD) + 40
    y = R.note_strip(d, y,
        "And keep your geography honest \u2014 this year's report flagged "
        "the Incas in a North America question.", R.GOLD) + 40
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
