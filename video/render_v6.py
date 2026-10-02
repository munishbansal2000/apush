#!/usr/bin/env python3
"""Video 6: 2023 DBQ GOOD (7/7) — Market Revolution, 1800-1855.

Sample 1A: earned every point. Student moves shown only as short
paraphrased move-cards paired with grading commentary; no full
sample response is reproduced. Doc lists are 1-line descriptions.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup6")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

PROMPT = ("Evaluate the extent to which commercial development changed "
          "United States society from 1800 to 1855.")

DOCS = [
    (1, "Churches' temperance appeal", "1812"),
    (2, "Locomotive / steam-engine ad", "1831"),
    (3, "Planter's slave-trade letter", "1835"),
    (4, "Student letter on mill conditions", "1835"),
    (5, "Free Black Philadelphia described", "1841"),
    (6, "Mill worker defends factory life", "1845"),
    (7, "Douglass: slavery degrades free labor", "1848"),
]

def move_card(d, y, title, body, verdict):
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

# ---------------- hook ----------------
@stage("s1")
def _():
    im, d = R.base()
    d.text((M, 150), "THE 2023 DBQ", font=R.sans_b, fill=R.GOLD)
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL TOP SAMPLE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 7 / 7", R.GOLD, 72)
    return im

# ---------------- documents ----------------
@stage("s2")
def _():
    im, d = R.base()
    R.header(d, "SEVEN DOCUMENTS")
    y = 300
    maxw = W - 2 * M - 80
    rows = [(num, yr, R.wrap_px(name, R.sans_s, maxw)) for num, name, yr in DOCS]
    box_h = 60 + sum(72 + 62 * len(lines) for _, _, lines in rows)
    d.rounded_rectangle([M, y, W - M, y + box_h], 22, fill=R.NOTE_BG)
    cy = y + 30
    for num, yr, lines in rows:
        d.text((M + 40, cy), "Doc. %d \u00b7 %s" % (num, yr), font=R.sans_b, fill=R.GOLD)
        ty = cy + 72
        for ln in lines:
            d.text((M + 40, ty), ln, font=R.sans_s, fill=R.WHITE)
            ty += 62
        cy += 72 + 62 * len(lines)
    return im

# ---------------- thesis ----------------
@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 7")
    y = move_card(d, 300, "The student's claim \u00b7 paraphrased",
        "A North/South line of reasoning: commercialized slave trade in the "
        "South versus factory labor in the North.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 defensible claim with a line of reasoning, not a prompt restatement.",
        R.GREEN)
    return im

# ---------------- contextualization ----------------
@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 7")
    y = move_card(d, 300, "The student's setup \u00b7 paraphrased",
        "Sectional tensions after independence, under the Constitution \u2014 "
        "the world the Market Revolution entered.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 broader context, relevant to the prompt.", R.GREEN)
    return im

# ---------------- evidence ----------------
@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "4 / 7")
    y = 300
    d.text((M, y), "Six documents argued with:", font=R.sans_s, fill=R.DIM)
    y += 60
    box = [M, y, W - M, y + 6 * 118 + 40]
    d.rounded_rectangle(box, 22, fill=R.NOTE_BG)
    cy = y + 30
    for num, use in [(3, "internal slave trade, sectional tension"),
                     (5, "free Black Philadelphia, reform"),
                     (7, "Douglass on free labor"),
                     (1, "temperance appeal"),
                     (4, "mill criticism"),
                     (6, "mill defense")]:
        R.check_at(d, M + 68, cy + 28, 18)
        d.text((M + 120, cy + 4), "Doc. %d \u00b7 %s" % (num, use),
               font=R.sans_s, fill=R.WHITE)
        cy += 118
    y = y + 6 * 118 + 90
    R.note_strip(d, y,
        "+1 / +1 \u2014 six or more documents used to support the argument.",
        R.GREEN)
    return im

# ---------------- beyond the documents ----------------
@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "BEYOND THE DOCUMENTS", "5 / 7")
    y = 300
    y = move_card(d, y, "Outside evidence \u00b7 paraphrased",
        "The Second Great Awakening behind the temperance push; the "
        "Mexican-American War feeding sectional tension.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 specific outside evidence, used in the argument.", R.GREEN)
    return im

# ---------------- sourcing ----------------
@stage("s7")
def _():
    im, d = R.base()
    R.header(d, "SOURCING", "6 / 7")
    y = 300
    d.text((M, y), "Four documents sourced:",
           font=R.sans_s, fill=R.DIM)
    y += 60
    d.rounded_rectangle([M, y, W - M, y + 4 * 118 + 40], 22, fill=R.NOTE_BG)
    cy = y + 30
    for num, how in [(3, "historical situation explained"),
                     (7, "Douglass's POV explained"),
                     (4, "market-revolution situation explained"),
                     (1, "temperance situation explained")]:
        R.check_at(d, M + 68, cy + 28, 18)
        d.text((M + 120, cy + 4), "Doc. %d \u00b7 %s" % (num, how),
               font=R.sans_s, fill=R.WHITE)
        cy += 118
    y = y + 4 * 118 + 90
    R.note_strip(d, y,
        "+1 \u2014 POV, purpose, and situation tied to the argument for 3+ docs.",
        R.GREEN)
    return im

# ---------------- complexity ----------------
@stage("s8")
def _():
    im, d = R.base()
    R.header(d, "COMPLEXITY", "7 / 7")
    y = move_card(d, 300, "The argument \u00b7 paraphrased",
        "Corroboration across regions and themes \u2014 North, South, West \u2014 "
        "with multiple perspectives on the Market Revolution.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 complex understanding, built into the argument.", R.GREEN)
    return im

# ---------------- tally ----------------
@stage("s9")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "7 / 7")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 1, 1),
                              ("Evidence", 2, 2), ("Beyond the documents", 1, 1),
                              ("Sourcing", 1, 1), ("Complexity", 1, 1)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    for ln in R.wrap_px("Seven out of seven. Every point a visible move.",
                        R.serif_i, W - 2 * M):
        d.text((M, y), ln, font=R.serif_i, fill=R.WHITE)
        y += 56
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save("%s/%s.png" % (OUT, name))
    print("%d stages rendered" % len(STAGES))
