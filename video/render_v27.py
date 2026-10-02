#!/usr/bin/env python3
"""Video 27: WE GRADED THIS 2024 LEQ (BAD) - real prompt, real student response (1/6).

2024 LEQ 3, causes of the growth of a national culture 1800-1848, Sample 3C (1/6):
lost the thesis (Panic of 1819 never connected to national culture), lost
context ("extreme progressivism"), earned one evidence point (Era of Good
Feelings and Manifest Destiny named; second point lost to the
Spanish-American War anachronism), zero reasoning. Ends on the teachable
moment: name-dropping without tying evidence to the claim is the signature
bleed. Student moves shown only as short paraphrased move-cards.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup27")
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
    d.text((M, 150), "2024 LEQ 3 \u00b7 GRADED 1/6", font=R.sans_b, fill=R.GOLD)
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL STUDENT RESPONSE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 1 / 6", R.GOLD, 72)
    return im

@stage("s1")
def _():
    im, d = R.base()
    R.header(d, "ANSWER THE QUESTION ASKED")
    bottom, _ = R.paper_card(d, M, 300, PROMPT, "2024 LEQ 3")
    R.note_strip(d, bottom + 60,
        "CAUSES \u2014 and every claim must connect to the growth of a national culture.", R.GOLD)
    return im

# ---------------- grading ----------------
@stage("s2")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "0 / 6")
    y = move_card(d, 300, "The student's thesis \u00b7 paraphrased",
        "The Panic of 1819 \u2014 never connected to the growth of a national "
        "culture.", "x")
    R.note_strip(d, y + 50, "0 \u2014 a claim floating without an argument earns nothing.", R.RED)
    return im

@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "0 / 6")
    y = move_card(d, 300, "The student's context \u00b7 paraphrased",
        "The 1800s as \u201cextreme progressivism\u201d \u2014 irrelevant to "
        "the prompt.", "x")
    R.note_strip(d, y + 50, "0 \u2014 context must actually frame the question.", R.RED)
    return im

@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "1 / 6")
    y = move_card(d, 300, "The student's evidence \u00b7 paraphrased",
        "Era of Good Feelings and Manifest Destiny \u2014 named. But the "
        "Manifest Destiny argument leaned on the Spanish-American War, "
        "decades out of period.", "check")
    y = R.note_strip(d, y + 50, "+1 \u2014 Era of Good Feelings and Manifest Destiny named.", R.GREEN) + 30
    R.note_strip(d, y, "0 \u2014 never used to argue; the anachronism killed the second point.", R.RED)
    return im

@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "1 / 6")
    y = move_card(d, 300, "The student's reasoning",
        "No causation, no comparison, no continuity and change \u2014 and no "
        "complexity.", "x")
    R.note_strip(d, y + 50, "0 / 0 \u2014 the score stays one of six.", R.RED)
    return im

@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "1 / 6")
    y = 300
    for label, got, total in [("Thesis", 0, 1), ("Contextualization", 0, 1),
                              ("Evidence", 1, 2), ("Analysis & Reasoning", 0, 2)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    for ln in R.wrap_px("Only the naming of two examples survived. Everything else was lost.",
                        R.serif_i, W - 2 * M):
        d.text((M, y), ln, font=R.serif_i, fill=R.WHITE); y += 56
    return im

@stage("s7")
def _():
    im, d = R.base()
    R.header(d, "THE TAKEAWAY", "1 / 6")
    y = 300
    y = R.note_strip(d, y,
        "Name-dropping is not evidence. This response named Manifest Destiny but never tied it to the claim.", R.RED) + 40
    y = R.note_strip(d, y,
        "Chief Reader: name-dropping without tying evidence to the claim is the signature bleed.", R.GOLD) + 40
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
