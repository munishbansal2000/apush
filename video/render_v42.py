#!/usr/bin/env python3
"""Video 42: 2025 LEQ 3 graded 6/6 — a real top sample on how reform
movements responded to industrialization, 1820-1900 (Sample 3A).

The prompt's verb is "responded": the 6/6 response never lists a movement
without tying it to industrialization. Walked point by point, in rubric order.
Student moves shown as paraphrased move-cards, never verbatim reproduction.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup42")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

PROMPT = ("Evaluate how different reform movements in the United States "
          "responded to industrialization from 1820 to 1900.")

def move_card(d, y, text, title):
    """A short paraphrased student move on paper. Returns bottom y."""
    bottom, _ = R.paper_card(d, M, y, text, title)
    return bottom

@stage("v42_00")
def _():
    im, d = R.base()
    R.header(d, "2025 LEQ 3 \u00b7 GRADED 6/6")
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL TOP SAMPLE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 6 / 6", R.GOLD, 72)
    return im

@stage("v42_01")
def _():
    im, d = R.base()
    R.header(d, "THE WORD THAT MATTERS", "0 / 6")
    y = 300
    bottom, _ = R.paper_card(d, M, y, PROMPT, "2025 LEQ 3")
    y = bottom + 60
    R.note_strip(d, y,
        "The prompt does not ask for a list of movements. "
        "It asks what they DID about industrialization.", R.GOLD)
    return im

@stage("v42_02")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 6")
    bottom = move_card(d, 300,
        "Reform responded through three movements: women's rights, "
        "labor unions, and immigrant advocacy.",
        "The student's thesis")
    R.note_strip(d, bottom + 60,
        "+1 \u2014 defensible claim with a line of reasoning.", R.GREEN)
    return im

@stage("v42_03")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 6")
    bottom = move_card(d, 300,
        "Late-1700s and early-1800s economic debates, the first factories, "
        "and growing cities \u2014 the world industrialization entered.",
        "The student's context")
    R.note_strip(d, bottom + 60,
        "+1 \u2014 broader context, relevant to the prompt.", R.GREEN)
    return im

@stage("v42_04")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "4 / 6")
    bottom = move_card(d, 300,
        "The Lowell mills and Seneca Falls: working conditions caused "
        "reform advocacy. Jane Addams and Hull House: the response to "
        "immigrant labor conditions. Each example proves a claim.",
        "The evidence")
    R.note_strip(d, bottom + 60,
        "+1 / +1 \u2014 examples used to support an argument, not just named.", R.GREEN)
    return im

@stage("v42_05")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "6 / 6")
    bottom = move_card(d, 300,
        "Causation: the Knights of Labor formed because of poor industrial "
        "conditions. Breadth: women's suffrage, morality arguments, prison "
        "reform, and immigration from Ireland to China.",
        "The reasoning")
    R.note_strip(d, bottom + 60,
        "+1 / +1 \u2014 cause and effect, plus multiple themes and geography.", R.GREEN)
    return im

@stage("v42_06")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "6 / 6")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 1, 1),
                              ("Evidence", 2, 2), ("Analysis & Reasoning", 2, 2)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    yy = y
    for ln in R.wrap_px("Every example answers the prompt's verb: responded.",
                        R.serif_i, W - 2 * M):
        d.text((M, yy), ln, font=R.serif_i, fill=R.WHITE); yy += 56
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
