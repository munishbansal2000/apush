#!/usr/bin/env python3
"""Video 3: WE GRADED THIS 2025 DBQ — real prompt, real student response (5/7).

The drama: a Goldwater misread ("read the document, not the vibes") plus two
missing points (beyond-docs, complexity). Student moves shown as paraphrased
move-cards, never verbatim reproduction.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup3")
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
    (1, "WPA protest letter", "1937"),
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

@stage("d0")
def _():
    im, d = R.base()
    d.text((M, 150), "THE 2025 DBQ", font=R.sans_b, fill=R.GOLD)
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL STUDENT RESPONSE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 5 / 7", R.GOLD, 72)
    return im

@stage("d1")
def _():
    im, d = R.base()
    R.header(d, "SEVEN DOCUMENTS")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 7 * 118 + 40], 22, fill=R.NOTE_BG)
    cy = y + 30
    for num, name, yr in DOCS:
        d.text((M + 40, cy), f"Doc. {num}", font=R.sans_b, fill=R.GOLD)
        d.text((M + 220, cy + 6), f"{name} \u00b7 {yr}", font=R.sans_s, fill=R.WHITE)
        cy += 118
    return im

@stage("d2")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 7")
    y = move_card(d, 300, "The student's claim",
        "Expanding federal \u201coverreach\u201d through trade and transport, welfare programs, and immigration policy.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 defensible claim with a line of reasoning.", R.GREEN)
    return im

@stage("d3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 7")
    y = move_card(d, 300, "The student's setup",
        "1920s laissez-faire, then the Great Depression \u2014 the world that made 1932 a turning point.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 broader context framing the prompt.", R.GREEN)
    return im

@stage("d4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "4 / 7")
    y = 300
    d.text((M, y), "Four documents argued with:", font=R.sans_s, fill=R.DIM); y += 70
    d.rounded_rectangle([M, y, W - M, y + 4 * 118 + 40], 22, fill=R.NOTE_BG)
    cy = y + 30
    for num, name, yr in [DOCS[1], DOCS[2], DOCS[3], DOCS[5]]:
        R.check_at(d, M + 68, cy + 28, 18)
        d.text((M + 120, cy + 4), f"Doc. {num} \u00b7 {name}", font=R.sans_s, fill=R.WHITE)
        cy += 118
    y = y + 4 * 118 + 90
    R.note_strip(d, y, "+1 / +1 \u2014 on this DBQ the second evidence point needed 4+ documents, not 6.", R.GREEN)
    return im

@stage("d5")
def _():
    im, d = R.base()
    R.header(d, "SOURCING", "5 / 7")
    y = move_card(d, 300, "Sourced: Docs. 2, 3, 4",
        "Purpose and audience explained \u2014 the point is earned.", "check")
    y += 40
    y = move_card(d, y, "But Doc. 5 \u2014 Goldwater",
        "Quoted his \u201cnever abandoning the needy\u201d line as support for Kennedy-style intervention. His 1964 speech argues the exact opposite.", "x")
    y += 40
    R.note_strip(d, y, "Read the document, not the vibes.", R.RED)
    return im

@stage("d6")
def _():
    im, d = R.base()
    R.header(d, "BEYOND THE DOCUMENTS", "5 / 7")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 300], 22, fill=R.NOTE_BG, outline=R.RED, width=3)
    d.text((M + 48, y + 60), "Outside evidence:", font=R.sans_s, fill=R.DIM)
    d.text((M + 48, y + 130), "\u2014 nothing \u2014", font=R.sans_i if hasattr(R, "sans_i") else R.sans, fill=R.RED)
    R.xmark_at(d, W - M - 100, y + 150, 30)
    y += 350
    R.note_strip(d, y, "0 \u2014 the 7/7 response brought LBJ's Great Society. This one brought nothing.", R.RED)
    return im

@stage("d7")
def _():
    im, d = R.base()
    R.header(d, "COMPLEXITY", "5 / 7")
    y = move_card(d, 300, "The argument",
        "One direction, no qualification, no competing perspective.", "x")
    y += 40
    R.note_strip(d, y, "0 \u2014 the worst bleed on the exam: 0.15/1. Qualify the argument \u2014 the conservative resurgence qualifies the New Deal story.", R.RED)
    return im

@stage("d8")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "5 / 7")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 1, 1),
                              ("Evidence", 2, 2), ("Beyond the documents", 0, 1),
                              ("Sourcing", 1, 1), ("Complexity", 0, 1)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    d.text((M, y), "Two missing points. Both fixable.", font=R.serif_i, fill=R.WHITE)
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
