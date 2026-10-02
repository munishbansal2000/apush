#!/usr/bin/env python3
"""Video 25: WE GRADED THIS 2024 LEQ (BAD) - real prompt, real student response (2/6).

2024 LEQ 2, causes of European-Native conflict 1500-1763, Sample 2C (2/6):
earned thesis (ranked causes) and context (Columbus, European goals); ZERO
evidence points (no specific examples at all) and ZERO reasoning points.
The classic list-of-causes essay. Ends on the pack's teachable moment:
chronology and the anachronistic "Manifest Destiny".
Student moves shown only as short paraphrased move-cards.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup25")
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

# ---------------- hook + prompt ----------------
@stage("s0")
def _():
    im, d = R.base()
    d.text((M, 150), "2024 LEQ 2 \u00b7 GRADED 2/6", font=R.sans_b, fill=R.GOLD)
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL STUDENT RESPONSE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 2 / 6", R.GOLD, 72)
    return im

@stage("s1")
def _():
    im, d = R.base()
    R.header(d, "ANSWER THE QUESTION ASKED")
    bottom, _ = R.paper_card(d, M, 300, PROMPT, "2024 LEQ 2")
    R.note_strip(d, bottom + 60,
        "\u201cRelative importance\u201d means rank the causes. A ranking with no evidence behind it is an empty list.", R.GOLD)
    return im

# ---------------- grading ----------------
@stage("s2")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 6")
    y = move_card(d, 300, "The student's thesis \u00b7 paraphrased",
        "The causes, ranked: resource collection, religious assimilation, "
        "territorial disputes.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 defensible claim, ranked, in one place.", R.GREEN)
    return im

@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 6")
    y = move_card(d, 300, "The student's context \u00b7 paraphrased",
        "Columbus, and European goals: economic gain, religious expansion, "
        "influence.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 a described situation, relevant to the prompt.", R.GREEN)
    return im

@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "2 / 6")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 300], 22, fill=R.NOTE_BG, outline=R.RED, width=3)
    d.text((M + 48, y + 60), "Specific examples in the essay:", font=R.sans_s, fill=R.DIM)
    d.text((M + 48, y + 130), "\u2014 none \u2014", font=R.serif_i, fill=R.RED)
    R.xmark_at(d, W - M - 100, y + 150, 30)
    y += 350
    R.note_strip(d, y, "0 / 0 \u2014 no wars, no systems, no named places. A list of causes with no evidence.", R.RED)
    return im

@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "2 / 6")
    y = move_card(d, 300, "The student's reasoning",
        "No attempt to frame an argument \u2014 no causation, no comparison, "
        "no continuity and change.", "x")
    R.note_strip(d, y + 50, "0 / 0 \u2014 a thesis plus context alone is a 2.", R.RED)
    return im

@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "2 / 6")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 1, 1),
                              ("Evidence", 0, 2), ("Analysis & Reasoning", 0, 2)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    for ln in R.wrap_px("The scoreboard of a cause-list with no examples.",
                        R.serif_i, W - 2 * M):
        d.text((M, y), ln, font=R.serif_i, fill=R.WHITE); y += 56
    return im

@stage("s7")
def _():
    im, d = R.base()
    R.header(d, "THE TAKEAWAY", "2 / 6")
    y = 300
    y = R.note_strip(d, y,
        "Keep events in order and inside the period. The Chief Reader flagged scrambled chronologies: French and Indian War, Proclamation of 1763, Pontiac's War.", R.RED) + 40
    y = R.note_strip(d, y,
        "\u201cManifest Destiny\u201d is an 1840s word. Do not use it for the 1600s.", R.GOLD) + 40
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
