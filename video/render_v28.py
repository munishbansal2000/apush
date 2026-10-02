#!/usr/bin/env python3
"""Video 28: WE GRADED THIS 2024 LEQ (GOOD) - real prompt, real student response (6/6).

2024 LEQ 4, effects of movements for social change 1945-1980, Sample 4A (6/6):
thesis conceded de facto segregation persisted while ranking legislation first;
context (pre-1945 minority-rights expansion); evidence bench each tied to the
argument; reasoning via causation (Moral Majority and Schlafly killed the ERA);
complexity two ways - four-plus examples in a nuanced argument and multiple
perspectives (women for AND against the ERA). Student moves shown only as
short paraphrased move-cards.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup28")
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

def chips(d, y, items):
    boxh = 36 + 84 * len(items)
    d.rounded_rectangle([M, y, W - M, y + boxh], 22, fill=R.NOTE_BG)
    cy = y + 36
    for name in items:
        d.rounded_rectangle([M + 40, cy, M + 96, cy + 56], 12,
                            fill=(24, 60, 40), outline=R.GREEN, width=3)
        R.check_at(d, M + 68, cy + 28, 16, R.GREEN, 6)
        d.text((M + 120, cy + 4), name, font=R.sans_s, fill=R.WHITE)
        cy += 84
    return y + boxh

# ---------------- hook + prompt ----------------
@stage("s0")
def _():
    im, d = R.base()
    d.text((M, 150), "2024 LEQ 4 \u00b7 GRADED 6/6", font=R.sans_b, fill=R.GOLD)
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL STUDENT RESPONSE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 6 / 6", R.GOLD, 72)
    return im

@stage("s1")
def _():
    im, d = R.base()
    R.header(d, "ANSWER THE QUESTION ASKED")
    bottom, _ = R.paper_card(d, M, 300, PROMPT, "2024 LEQ 4")
    R.note_strip(d, bottom + 60,
        "The relative importance of the EFFECTS \u2014 not a description of the movements. Narrating without weighing lost the thesis.", R.GOLD)
    return im

# ---------------- grading ----------------
@stage("s2")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 6")
    y = move_card(d, 300, "The student's thesis \u00b7 paraphrased",
        "De facto segregation persisted \u2014 but legislation (legal "
        "desegregation, civil rights statutes, women's-rights gains) was the "
        "most important effect.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 a qualified claim, ranked, with a line of reasoning.", R.GREEN)
    return im

@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 6")
    y = move_card(d, 300, "The student's context \u00b7 paraphrased",
        "The expansion of minority rights before 1945.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 a described situation framing the postwar movements.", R.GREEN)
    return im

@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "4 / 6")
    y = 300
    d.text((M, y), "Each tied to the argument:", font=R.sans_s, fill=R.DIM); y += 60
    y = chips(d, y, ["Brown v. Board", "Central High", "GI Bill exclusion",
                     "The ERA", "The Feminine Mystique", "Roe v. Wade"]) + 50
    R.note_strip(d, y, "+1 / +1 \u2014 six examples used to argue, not just named.", R.GREEN)
    return im

@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "ANALYSIS & REASONING", "6 / 6")
    y = move_card(d, 300, "The student's reasoning \u00b7 paraphrased",
        "Causation: the Moral Majority and Phyllis Schlafly killed the ERA. "
        "Complexity: women for AND against the ERA \u2014 multiple "
        "perspectives.", "check")
    R.note_strip(d, y + 50, "+1 / +1 \u2014 causation frames it; the Schlafly-vs.-Friedan contrast makes complexity unmissable.", R.GREEN)
    return im

@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "6 / 6")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 1, 1),
                              ("Evidence", 2, 2), ("Analysis & Reasoning", 2, 2)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    for ln in R.wrap_px("Write both sides when both sides existed \u2014 that is the complexity point.",
                        R.serif_i, W - 2 * M):
        d.text((M, y), ln, font=R.serif_i, fill=R.WHITE); y += 56
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
