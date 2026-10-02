#!/usr/bin/env python3
"""Video 45: 2025 LEQ 4 graded 2/6 — a real bottom sample on how U.S. foreign
policy responded to world changes, 1890-1930 (Sample 4C).

The thesis establishes no line of reasoning, and one anachronistic sentence
(League of Nations skipped, NATO joined instead) kills the analysis point.
Ends on the pack's teachable moment: describe how policies RESPONDED to
world events, not the events themselves.
Student moves shown as paraphrased move-cards, never verbatim reproduction.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup45")
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

@stage("v45_00")
def _():
    im, d = R.base()
    R.header(d, "2025 LEQ 4 \u00b7 GRADED 2/6")
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL BOTTOM SAMPLE", R.RED, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 2 / 6", R.RED, 72)
    return im

@stage("v45_01")
def _():
    im, d = R.base()
    R.header(d, "THE WORD THAT MATTERS", "0 / 6")
    y = 300
    bottom, _ = R.paper_card(d, M, y, PROMPT, "2025 LEQ 4")
    y = bottom + 60
    y = R.note_strip(d, y,
        "Responded. The rubric wants the policy each world change produced \u2014 "
        "not a recounting of the events.", R.GOLD) + 40
    y = R.note_strip(d, y,
        "This essay describes the events. The reasoning points die there.", R.RED) + 40
    return im

@stage("v45_02")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "0 / 6")
    y = move_card(d, 300,
        "\u201cForeign policy responded by getting involved in World War I.\u201d",
        "The thesis attempt")
    R.note_strip(d, y + 60,
        "0 \u2014 defensible as a statement, but no line of reasoning.", R.RED)
    return im

@stage("v45_03")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "1 / 6")
    bottom = move_card(d, 300,
        "Washington's Farewell Address \u2014 the warning against foreign "
        "entanglements \u2014 as the broader world behind the prompt.",
        "The student's context")
    R.note_strip(d, bottom + 60,
        "+1 \u2014 relevant to the prompt.", R.GREEN)
    return im

@stage("v45_04")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "2 / 6")
    y = move_card(d, 300,
        "World War One and Versailles are named \u2014 enough for the first "
        "evidence point.",
        "Named")
    y += 40
    y = move_card(d, y,
        "Neither is used to support an argument about the policy response \u2014 "
        "so the second evidence point fails.",
        "Not argued")
    y += 40
    R.note_strip(d, y, "+1 / 0 \u2014 named is not argued.", R.GOLD)
    return im

@stage("v45_05")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "2 / 6")
    y = move_card(d, 300,
        "The essay claims the United States skipped the League of Nations "
        "and joined NATO instead.",
        "The fatal sentence")
    y += 40
    R.note_strip(d, y,
        "0 \u2014 an anachronistic causation claim. Anachronism kills reasoning points.", R.RED)
    return im

@stage("v45_06")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "2 / 6")
    y = 300
    for label, got, total in [("Thesis", 0, 1), ("Contextualization", 1, 1),
                              ("Evidence", 1, 2), ("Analysis & Reasoning", 0, 2)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    y = R.note_strip(d, y,
        "Teachable moment: describe how policies RESPONDED to world events \u2014 "
        "not the events themselves.", R.GOLD)
    return im

@stage("v45_07")
def _():
    im, d = R.base()
    R.header(d, "THE TRAPS", "2 / 6")
    y = 300
    y = R.note_strip(d, y,
        "Check your dates. The Big Stick did not cause the Spanish-American "
        "War \u2014 and World War Two and the Cold War live outside this prompt.", R.GOLD) + 40
    y = R.note_strip(d, y,
        "Every event in the essay should exist to explain a policy. If it "
        "doesn't, cut it.", R.GOLD) + 40
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
