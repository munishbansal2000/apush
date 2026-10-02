#!/usr/bin/env python3
"""Video 44: 2025 LEQ 4 graded 6/6 — a real top sample on how U.S. foreign
policy responded to world changes, 1890-1930 (Sample 4A).

The prompt demands the RESPONSE: each world event is connected to the policy
it produced, never just recounted. Walked point by point, in rubric order.
Student moves shown as paraphrased move-cards, never verbatim reproduction.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup44")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

PROMPT = ("Evaluate how United States foreign policy responded to changes "
          "in the world from 1890 to 1930.")

def move_card(d, y, text, title):
    """A short paraphrased student move on paper. Returns bottom y."""
    bottom, _ = R.paper_card(d, M, y, text, title)
    return bottom

@stage("v44_00")
def _():
    im, d = R.base()
    R.header(d, "2025 LEQ 4 \u00b7 GRADED 6/6")
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL TOP SAMPLE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 6 / 6", R.GOLD, 72)
    return im

@stage("v44_01")
def _():
    im, d = R.base()
    R.header(d, "THE WORD THAT MATTERS", "0 / 6")
    y = 300
    bottom, _ = R.paper_card(d, M, y, PROMPT, "2025 LEQ 4")
    y = bottom + 60
    R.note_strip(d, y,
        "Responded. Connect each world change to the policy it produced \u2014 "
        "that is the whole essay. This response makes that connection every time.", R.GOLD)
    return im

@stage("v44_02")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 6")
    bottom = move_card(d, 300,
        "As America's global role grew, foreign policy shifted from "
        "interventionism to isolationism.",
        "The student's thesis")
    R.note_strip(d, bottom + 60,
        "+1 \u2014 defensible claim with a line of reasoning, squarely in period.", R.GREEN)
    return im

@stage("v44_03")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 6")
    bottom = move_card(d, 300,
        "The end of slavery and the trade and economic policies connecting "
        "the United States to the world \u2014 the broader world this policy "
        "responded to.",
        "The student's context")
    R.note_strip(d, bottom + 60,
        "+1 \u2014 broader context, relevant to the prompt.", R.GREEN)
    return im

@stage("v44_04")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "4 / 6")
    bottom = move_card(d, 300,
        "The Spanish-American War produced overseas imperialism. The outcome "
        "of World War One produced the isolationist turn. Each example is "
        "tied to a claim about the policy response.",
        "The evidence")
    R.note_strip(d, bottom + 60,
        "+1 / +1 \u2014 examples used to support an argument, not just named.", R.GREEN)
    return im

@stage("v44_05")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "6 / 6")
    bottom = move_card(d, 300,
        "Causation: postwar disillusionment caused isolationism. Multiple "
        "perspectives: the United States was BOTH interventionist and "
        "isolationist in this period \u2014 not one or the other.",
        "The reasoning")
    R.note_strip(d, bottom + 60,
        "+1 / +1 \u2014 cause and effect, plus complexity through multiple perspectives.", R.GREEN)
    return im

@stage("v44_06")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "6 / 6")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 1, 1),
                              ("Evidence", 2, 2), ("Analysis & Reasoning", 2, 2)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    yy = y
    for ln in R.wrap_px('Every event exists to explain a policy. The response, not the news.',
                        R.serif_i, W - 2 * M):
        d.text((M, yy), ln, font=R.serif_i, fill=R.WHITE); yy += 56
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
