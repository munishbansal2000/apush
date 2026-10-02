#!/usr/bin/env python3
"""Video 38: 2025 DBQ graded 7/7 — a real top sample on the federal
government's role in the economy, 1932-1980 (Sample 1A).

Walks what earned EACH rubric point, in rubric order. Note the 2025 bar:
the second evidence point needs 4+ documents, not the usual 6.
Student moves shown as paraphrased move-cards, never verbatim reproduction.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup38")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

PROMPT = ("Evaluate the extent to which the role of the federal government "
          "in the United States economy changed from 1932 to 1980.")

DOCS = [
    (1, "WPA complaint", "1937"),
    (2, "Farm-labor pamphlet", "1943"),
    (3, "Highway Act photo", "1957"),
    (4, "Kennedy: health insurance", "1962"),
    (5, "Goldwater speech", "1964"),
    (6, "Ch\u00e1vez: farmworkers", "1969"),
    (7, "Attack on federal spending", "1976"),
]

def move_card(d, y, title, body, verdict):
    """verdict: 'check' | 'x' | 'none'"""
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

@stage("v38_00")
def _():
    im, d = R.base()
    R.header(d, "2025 DBQ \u00b7 GRADED 7/7")
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL TOP SAMPLE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 7 / 7", R.GOLD, 72)
    return im

@stage("v38_01")
def _():
    im, d = R.base()
    R.header(d, "SEVEN DOCUMENTS", "0 / 7")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 7 * 118 + 40], 22, fill=R.NOTE_BG)
    cy = y + 30
    for num, name, yr in DOCS:
        d.text((M + 40, cy), f"Doc. {num}", font=R.sans_b, fill=R.GOLD)
        d.text((M + 220, cy + 6), f"{name} \u00b7 {yr}", font=R.sans_s, fill=R.WHITE)
        cy += 118
    return im

@stage("v38_02")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 7")
    y = move_card(d, 300, "The student's claim",
        "Federal intervention grew under Keynesian thinking, then reversed "
        "with the New Right's laissez-faire turn.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 answers the prompt's \"extent\" and sets up two halves of the essay.", R.GREEN)
    return im

@stage("v38_03")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 7")
    y = move_card(d, 300, "The student's setup",
        "Late-19th-century laissez-faire baseline, the Progressives, and "
        "World War One \u2014 the world that made 1932 a turning point.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 broader context framing the prompt.", R.GREEN)
    return im

@stage("v38_04")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "4 / 7")
    y = move_card(d, 300, "The student's evidence use",
        "At least four documents described accurately, and each one put to "
        "work in the argument: growing intervention, then the turn against it.", "check")
    R.note_strip(d, y + 50,
        "+1 / +1 \u2014 on this DBQ the second evidence point needed 4+ documents, not 6.", R.GREEN)
    return im

@stage("v38_05")
def _():
    im, d = R.base()
    R.header(d, "SOURCING", "5 / 7")
    y = move_card(d, 300, "Doc. 3 \u00b7 audience",
        "The 1956 exhibition photo was selling the public on the interstate "
        "system \u2014 the government's case for its own project.", "check")
    y += 40
    y = move_card(d, y, "Docs. 4, 5, 7 \u00b7 historical situation",
        "Each is placed in the liberal-to-conservative arc it belongs to: "
        "expanding liberalism, then the conservative resurgence.", "check")
    y += 40
    R.note_strip(d, y, "+1 \u2014 four documents sourced, two ways.", R.GREEN)
    return im

@stage("v38_06")
def _():
    im, d = R.base()
    R.header(d, "BEYOND THE DOCUMENTS", "6 / 7")
    y = move_card(d, 300, "The student's outside evidence",
        "Lyndon Johnson's Great Society: the War on Poverty and Medicare \u2014 "
        "outside proof of the federal government's expanding role.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 one specific piece of evidence beyond the documents.", R.GREEN)
    return im

@stage("v38_07")
def _():
    im, d = R.base()
    R.header(d, "COMPLEX UNDERSTANDING", "7 / 7")
    y = move_card(d, 300, "The comparison",
        "The 1932\u20131980 fight over government's economic role is set beside "
        "the early-republic Federalist vs. Democratic-Republican fight over "
        "the same question.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 earned two ways: four documents sourced, plus a cross-period comparison.", R.GREEN)
    return im

@stage("v38_08")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "7 / 7")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 1, 1),
                              ("Evidence", 2, 2), ("Beyond the documents", 1, 1),
                              ("Sourcing", 1, 1), ("Complex understanding", 1, 1)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    yy = y
    for ln in R.wrap_px("Every point came from pairing a move with evidence.",
                        R.serif_i, W - 2 * M):
        d.text((M, yy), ln, font=R.serif_i, fill=R.WHITE); yy += 56
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
