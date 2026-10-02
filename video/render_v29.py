#!/usr/bin/env python3
"""Video 29: WE GRADED THIS 2024 LEQ (BAD) - real prompt, real student response (3/6).

2024 LEQ 4, effects of movements for social change 1945-1980, Sample 4C (3/6):
lost the thesis (chronological error: "major victories for white women"
preceding the civil-rights era), lost context (Jim Crow double-counted as
evidence - evidence cannot be recycled as context), earned both evidence
points (protest-led-to-change), earned reasoning via causation (segregation ->
sit-ins -> white resistance), lost complexity (four pieces, one
uncomplicated argument). Ends on the teachable moment: asserting vs.
explaining relative importance. Student moves shown only as short
paraphrased move-cards.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup29")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

PROMPT = ("Evaluate the relative importance of the effects of movements for "
          "social change from 1945 to 1980.")

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
    d.text((M, 150), "2024 LEQ 4 \u00b7 GRADED 3/6", font=R.sans_b, fill=R.GOLD)
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL STUDENT RESPONSE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 3 / 6", R.GOLD, 72)
    return im

@stage("s1")
def _():
    im, d = R.base()
    R.header(d, "ANSWER THE QUESTION ASKED")
    bottom, _ = R.paper_card(d, M, 300, PROMPT, "2024 LEQ 4")
    R.note_strip(d, bottom + 60,
        "Relative importance must be EXPLAINED, not asserted. And the thesis needs a line of reasoning about effects.", R.GOLD)
    return im

# ---------------- grading ----------------
@stage("s2")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "0 / 6")
    y = move_card(d, 300, "The student's thesis \u00b7 paraphrased",
        "\u201cMajor victories for white women\u201d \u2014 placed before "
        "the civil-rights era, with no line of reasoning about effects.", "x")
    R.note_strip(d, y + 50, "0 \u2014 the chronological error sank it.", R.RED)
    return im

@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "0 / 6")
    y = move_card(d, 300, "The student's context",
        "The Jim Crow discussion \u2014 already counted as evidence.", "x")
    R.note_strip(d, y + 50, "0 \u2014 evidence cannot be recycled as context.", R.RED)
    return im

@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "2 / 6")
    y = move_card(d, 300, "The student's evidence \u00b7 paraphrased",
        "Jim Crow, civil rights groups, sit-ins, Rosa Parks \u2014 tied to a "
        "protest-led-to-change argument.", "check")
    R.note_strip(d, y + 50, "+1 / +1 \u2014 the examples worked.", R.GREEN)
    return im

@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "3 / 6")
    y = move_card(d, 300, "The student's reasoning \u00b7 paraphrased",
        "Causation: segregation to sit-ins to white resistance. But four "
        "pieces of evidence, one uncomplicated argument.", "x")
    y = R.note_strip(d, y + 50, "+1 \u2014 the causation chain earns reasoning.", R.GREEN) + 30
    R.note_strip(d, y, "0 \u2014 four pieces, one uncomplicated argument. Complexity lost.", R.RED)
    return im

@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "3 / 6")
    y = 300
    for label, got, total in [("Thesis", 0, 1), ("Contextualization", 0, 1),
                              ("Evidence", 2, 2), ("Analysis & Reasoning", 1, 2)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    for ln in R.wrap_px("All evidence, no argument \u2014 and evidence alone is half the points.",
                        R.serif_i, W - 2 * M):
        d.text((M, y), ln, font=R.serif_i, fill=R.WHITE); y += 56
    return im

@stage("s7")
def _():
    im, d = R.base()
    R.header(d, "THE TAKEAWAY", "3 / 6")
    y = 300
    y = R.note_strip(d, y,
        "Asserting importance is not explaining it. Many responses overgeneralized movements as \u201cwanting change\u201d instead of naming specific effects.", R.RED) + 40
    y = R.note_strip(d, y,
        "Explain WHY one effect mattered more than another.", R.GOLD) + 40
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
