#!/usr/bin/env python3
"""Video 43: 2025 LEQ 3 graded 1/6 — a real bottom sample on how reform
movements responded to industrialization, 1820-1900 (Sample 3C).

Only the thesis survived. Ends on the pack's teachable moment: students
listed reform movements instead of arguing about their responses to
industrialization — and mind the period (Populism/Progressivism are post-1900).
Student moves shown as paraphrased move-cards, never verbatim reproduction.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup43")
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

@stage("v43_00")
def _():
    im, d = R.base()
    R.header(d, "2025 LEQ 3 \u00b7 GRADED 1/6")
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL BOTTOM SAMPLE", R.RED, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 1 / 6", R.RED, 72)
    return im

@stage("v43_01")
def _():
    im, d = R.base()
    R.header(d, "THE WORD THAT MATTERS", "0 / 6")
    y = 300
    bottom, _ = R.paper_card(d, M, y, PROMPT, "2025 LEQ 3")
    y = bottom + 60
    y = R.note_strip(d, y,
        "This essay describes labor conditions \u2014 but never frames them "
        "into an argument about the RESPONSE.", R.RED) + 40
    yy = y + 20
    for ln in R.wrap_px("Description is not an argument. The rubric grades arguments.",
                        R.serif_i, W - 2 * M):
        d.text((M, yy), ln, font=R.serif_i, fill=R.WHITE); yy += 56
    return im

@stage("v43_02")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 6")
    bottom = move_card(d, 300,
        "Labor unions and Congress protested industrialization.",
        "The student's thesis")
    R.note_strip(d, bottom + 60,
        "+1 \u2014 defensible, with a line of reasoning. The only point earned.", R.GREEN)
    return im

@stage("v43_03")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "1 / 6")
    y = move_card(d, 300,
        "A passing reference to rural-urban migration \u2014 nothing broader.",
        "The context attempt")
    R.note_strip(d, y + 60,
        "0 \u2014 the context point needs more than a passing mention.", R.RED)
    return im

@stage("v43_04")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "1 / 6")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 380], 22, fill=R.NOTE_BG, outline=R.RED, width=3)
    d.text((M + 48, y + 60), "The essay's examples:", font=R.sans_s, fill=R.DIM)
    ty = y + 130
    for ln in R.wrap_px("\u201clabor unions,\u201d \u201ccongressional testimonies\u201d \u2014 too vague",
                        R.sans, W - 2 * M - 240):
        d.text((M + 48, ty), ln, font=R.sans, fill=R.RED); ty += 72
    R.xmark_at(d, W - M - 100, y + 190, 30)
    y += 430
    R.note_strip(d, y,
        "0 / 0 \u2014 two SPECIFIC examples are required.", R.RED)
    return im

@stage("v43_05")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "1 / 6")
    y = move_card(d, 300,
        "Industrial labor conditions are described \u2014 but no reasoning "
        "is structured around how movements responded to them.",
        "The analysis attempt")
    R.note_strip(d, y + 60,
        "0 / 0 \u2014 no historical reasoning framing an argument.", R.RED)
    return im

@stage("v43_06")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "1 / 6")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 0, 1),
                              ("Evidence", 0, 2), ("Analysis & Reasoning", 0, 2)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    y = R.note_strip(d, y,
        "Teachable moment: argue the RESPONSE to industrialization \u2014 "
        "don't list movements.", R.GOLD)
    return im

@stage("v43_07")
def _():
    im, d = R.base()
    R.header(d, "THE TRAPS", "1 / 6")
    y = 300
    y = R.note_strip(d, y,
        "Populism and Progressivism dragged post-1900 reform into this "
        "1820\u20131900 prompt. Mind the period.", R.GOLD) + 40
    y = R.note_strip(d, y,
        "And vague industrialization gets vague scores. Name the specific "
        "movement, the specific conditions, the specific response.", R.GOLD) + 40
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
