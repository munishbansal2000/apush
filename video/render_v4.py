#!/usr/bin/env python3
"""Video 4: WE GRADED THIS 2025 LEQ — a real student response to the released
2025 APUSH LEQ 2 (Native adaptation, 1500-1754), graded on camera.

Sample 2B, 4/6: thesis 1, context 1, evidence 1, analysis 1.
Central teachable beat: the prompt asks how Native societies ADAPTED (Native
agency); most students wrote what Europeans DID TO Natives instead.

IP rule: the student's scoring-relevant moves appear only as short
paraphrased move-cards, always paired with grading commentary. No full
sample essay is reproduced.
"""
import os
from PIL import Image, ImageDraw
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup4")
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

def evidence_chips(d, y, red=False):
    items = ["Columbian Exchange", "King Philip's War", "French and Indian War"]
    d.rounded_rectangle([M, y, W - M, y + 400], 22, fill=R.NOTE_BG)
    cy = y + 36
    for name in items:
        d.rounded_rectangle([M + 40, cy, M + 96, cy + 56], 12,
                            fill=(24, 60, 40), outline=R.GREEN, width=3)
        R.check_at(d, M + 68, cy + 28, 16, R.GREEN, 6)
        d.text((M + 120, cy + 4), name, font=R.sans_s, fill=R.WHITE)
        cy += 72
    d.text((M + 40, cy + 10), "Cherokee Nation \u2014 out of period",
           font=R.sans_s, fill=R.DIM)
    if red:
        R.xmark_at(d, W - M - 100, y + 200, 40)
    return y + 400

# ---------------- setup ----------------
@stage("v4_00a")
def _():
    im, d = R.base()
    d.text((M, 150), "WE GRADED THIS 2025 LEQ", font=R.sans_b, fill=R.GOLD)
    y = 320
    y = R.note_strip(d, y, "A real student response to the released 2025 long essay question.", R.GOLD) + 40
    y = R.note_strip(d, y, "Question 2: Native American societies, 1500 to 1754.", R.GOLD) + 40
    yy = y + 20
    for ln in R.wrap_px("Graded against the official scoring guidelines.", R.serif_i, W - 2 * M):
        d.text((M, yy), ln, font=R.serif_i, fill=R.DIM); yy += 56
    return im

@stage("v4_00b")
def _():
    im, d = R.base()
    d.text((M, 150), "THE PROMPT", font=R.sans_b, fill=R.GOLD)
    R.paper_card(d, M, 300, PROMPT, "2025 LEQ 2")
    return im

# ---------------- the hook: prompt parsing ----------------
@stage("v4_01a")
def _():
    im, d = R.base()
    R.header(d, "ANSWER THE QUESTION ASKED")
    bottom, _ = R.paper_card(d, M, 300, PROMPT, "2025 LEQ 2")
    R.note_strip(d, bottom + 60,
        "Who is adapting? Native American societies \u2014 the subject of the sentence.", R.GOLD)
    return im

@stage("v4_01b")
def _():
    im, d = R.base()
    R.header(d, "THE TRAP")
    y = 300
    y = R.note_strip(d, y,
        "What many students wrote: what Europeans DID TO Native Americans.", R.RED) + 40
    y = R.note_strip(d, y,
        "What the prompt asks: what Native societies DID \u2014 resistance, accommodation, trade, diplomacy.", R.GREEN) + 40
    d.text((M, y + 20), "Adaptation means Native agency.", font=R.serif_i, fill=R.WHITE)
    return im

# ---------------- thesis +1, context +1 ----------------
@stage("v4_02a")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 6")
    bottom = move_card(d, 300,
        "\u201cNative societies adapted by fighting over territory, and by assimilating.\u201d",
        "The student's thesis \u00b7 paraphrased")
    R.note_strip(d, bottom + 60,
        "+1 \u2014 defensible claim with a line of reasoning.", R.GREEN)
    return im

@stage("v4_02b")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 6")
    bottom = move_card(d, 300,
        "Why Europeans crossed the Atlantic: trade, conquest, conversion.",
        "The student's context \u00b7 paraphrased")
    R.note_strip(d, bottom + 60,
        "+1 \u2014 broader context, relevant to the prompt.", R.GREEN)
    return im

# ---------------- evidence: +1, second point missed ----------------
@stage("v4_03a")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "3 / 6")
    y = 300
    d.text((M, y), "Named in the essay:", font=R.sans_s, fill=R.DIM); y += 60
    y = evidence_chips(d, y) + 50
    R.note_strip(d, y, "+1 \u2014 two or more specific examples named.", R.GREEN)
    return im

@stage("v4_03b")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "3 / 6")
    y = 300
    d.text((M, y), "Named in the essay:", font=R.sans_s, fill=R.DIM); y += 60
    y = evidence_chips(d, y, red=True) + 50
    R.note_strip(d, y,
        "Named, never used to support an argument. Second point unearned.", R.RED)
    return im

@stage("v4_03c")
def _():
    im, d = R.base()
    R.header(d, "THE RUBRIC LINE", "3 / 6")
    y = 300
    y = R.note_strip(d, y,
        "Evidence, second point: examples must SUPPORT AN ARGUMENT.", R.GOLD) + 40
    y = R.note_strip(d, y,
        "Examples that decorate a paragraph do not count.", R.GOLD) + 40
    return im

@stage("v4_03d")
def _():
    im, d = R.base()
    R.header(d, "THE FIX \u00b7 EVIDENCE", "3 / 6")
    bottom = move_card(d, 300,
        "Metacom forged a multi-tribal alliance against English expansion: "
        "resistance as deliberate strategy, not just an event.",
        "Arguing with King Philip's War \u00b7 model fix")
    R.note_strip(d, bottom + 60,
        "That is evidence supporting an argument \u2014 the missing point.", R.GREEN)
    return im

# ---------------- analysis: +1, complexity missed ----------------
@stage("v4_04a")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "4 / 6")
    bottom = move_card(d, 300,
        "The essay frames adaptation as conflict versus assimilation, "
        "and holds that frame throughout.",
        "The student's reasoning \u00b7 paraphrased")
    R.note_strip(d, bottom + 60,
        "+1 \u2014 historical reasoning structuring an argument.", R.GREEN)
    return im

@stage("v4_04b")
def _():
    im, d = R.base()
    R.header(d, "COMPLEXITY", "4 / 6")
    bottom = move_card(d, 300,
        "The essay gestures at \u201cmultiple changes\u201d but backs them "
        "with no accurate evidence.",
        "The complexity attempt \u00b7 paraphrased")
    R.note_strip(d, bottom + 60,
        "Complexity needs: multiple perspectives, cause and effect, "
        "or evidence used with nuance. Not here.", R.RED)
    return im

@stage("v4_04c")
def _():
    im, d = R.base()
    R.header(d, "CHIEF READER WARNING", "4 / 6")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 260], 22, fill=R.NOTE_BG, outline=R.RED, width=3)
    ty = y + 36
    for ln in R.wrap_px("Disease listed as an \u201cadaptation\u201d?", R.sans, W - 2 * M - 260):
        d.text((M + 48, ty), ln, font=R.sans, fill=R.WHITE); ty += 72
    R.xmark_at(d, W - M - 130, y + 130, 40)
    y += 310
    y = R.note_strip(d, y,
        "Disease happened TO Native societies. An adaptation is something they DID.", R.RED) + 40
    d.text((M, y + 10), "Flagged in this year's Chief Reader report.", font=R.serif_i, fill=R.DIM)
    return im

@stage("v4_04d")
def _():
    im, d = R.base()
    R.header(d, "THE FIX \u00b7 COMPLEXITY", "4 / 6")
    bottom = move_card(d, 300,
        "Spanish missions, French trade partnerships, English land pressure: "
        "different colonizers, different Native adaptations.",
        "Comparing across regions \u00b7 model fix")
    R.note_strip(d, bottom + 60,
        "That comparison is the start of a complex argument.", R.GREEN)
    return im

# ---------------- tally ----------------
@stage("v4_05a")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "4 / 6")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 1, 1),
                              ("Evidence", 1, 2), ("Analysis & Reasoning", 1, 2)]:
        y = R.tally_row(d, y, label, got, total)
    return im

@stage("v4_05b")
def _():
    im, d = R.base()
    R.header(d, "THE TAKEAWAY", "4 / 6")
    y = 300
    y = R.note_strip(d, y,
        "The two missing points share one fix: make the evidence work.", R.GOLD) + 40
    y = R.note_strip(d, y,
        "Use each example to prove something about how Native societies adapted.", R.GOLD) + 40
    return im

@stage("v4_05c")
def _():
    im, d = R.base()
    R.header(d, "THE SKILL", "4 / 6")
    y = 300
    y = R.note_strip(d, y, "Answer the question asked.", R.GOLD) + 40
    yy = y + 20
    for ln in R.wrap_px("Here, the question asked what Native societies did. Start there.", R.serif_i, W - 2 * M):
        d.text((M, yy), ln, font=R.serif_i, fill=R.WHITE); yy += 56
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
