#!/usr/bin/env python3
"""Video 7: 2023 DBQ BAD (2/7) — Market Revolution, 1800-1855.

Sample 1C: thesis earned; lost contextualization, the 6-doc point,
outside evidence, sourcing, and complexity. Student moves shown only
as short paraphrased move-cards paired with grading commentary; no
full sample response is reproduced. Doc lists are 1-line descriptions.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup7")
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
    R.stamp_on(im, W // 2, 1150, "REAL BOTTOM SAMPLE", R.RED, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 2 / 7", R.RED, 72)
    return im

# ---------------- documents ----------------
@stage("s2")
def _():
    im, d = R.base()
    R.header(d, "SEVEN DOCUMENTS")
    y = 300
    maxw = W - 2 * M - 260
    rows = [(num, R.wrap_px("%s \u00b7 %s" % (name, yr), R.sans_s, maxw))
            for num, name, yr in DOCS]
    box_h = 60 + sum(48 + 72 * len(lines) for _, lines in rows)
    d.rounded_rectangle([M, y, W - M, y + box_h], 22, fill=R.NOTE_BG)
    cy = y + 30
    for num, lines in rows:
        d.text((M + 40, cy), "Doc. %d" % num, font=R.sans_b, fill=R.GOLD)
        ty = cy + 6
        for ln in lines:
            d.text((M + 220, ty), ln, font=R.sans_s, fill=R.WHITE)
            ty += 72
        cy += 48 + 72 * len(lines)
    return im

# ---------------- thesis: earned ----------------
@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 7")
    y = move_card(d, 300, "The student's claim \u00b7 paraphrased",
        "Commercial development brought both benefits and harms to American "
        "society.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 broad, but defensible. The only point earned.", R.GREEN)
    return im

# ---------------- contextualization: lost ----------------
@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "1 / 7")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 300], 22, fill=R.NOTE_BG,
                        outline=R.RED, width=3)
    d.text((M + 48, y + 60), "Broader context described:", font=R.sans_s,
           fill=R.DIM)
    d.text((M + 48, y + 130), "\u2014 nothing attempted \u2014", font=R.sans,
           fill=R.RED)
    R.xmark_at(d, W - M - 100, y + 150, 30)
    y += 350
    R.note_strip(d, y,
        "0 \u2014 no War of 1812, no westward expansion, no framework "
        "around the documents.", R.RED)
    return im

# ---------------- evidence: second point lost ----------------
@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "2 / 7")
    y = 300
    d.text((M, y), "Five documents used \u2014 one point only:",
           font=R.sans_s, fill=R.DIM)
    y += 60
    items = [(1, "temperance appeal", True),
             (2, "locomotive ad", True),
             (3, "planter's letter", True),
             (4, "mill criticism", True),
             (5, "free Black Philadelphia", True),
             (6, "described, never used to argue", False),
             (7, "misread as enslaved people voting", False)]
    maxw = W - M - 116 - 140
    rows = [(num, R.wrap_px("Doc. %d \u00b7 %s" % (num, note), R.sans_s, maxw),
             ok) for num, note, ok in items]
    box_h = 60 + sum(38 + 72 * len(lines) for _, lines, _ in rows)
    d.rounded_rectangle([M, y, W - M, y + box_h], 22, fill=R.NOTE_BG)
    cy = y + 30
    for num, lines, ok in rows:
        if ok:
            R.check_at(d, M + 68, cy + 24, 16)
        else:
            R.xmark_at(d, M + 68, cy + 24, 16)
        ty = cy + 2
        for ln in lines:
            d.text((M + 116, ty), ln, font=R.sans_s,
                   fill=R.WHITE if ok else R.DIM)
            ty += 72
        cy += 38 + 72 * len(lines)
    y = y + box_h + 50
    R.note_strip(d, y,
        "+1 only \u2014 the 3-doc point. Six documents supporting an argument "
        "are needed for the second.", R.RED)
    return im

# ---------------- beyond the documents: lost ----------------
@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "BEYOND THE DOCUMENTS", "2 / 7")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 300], 22, fill=R.NOTE_BG,
                        outline=R.RED, width=3)
    d.text((M + 48, y + 60), "Outside evidence:", font=R.sans_s, fill=R.DIM)
    d.text((M + 48, y + 130), "\u2014 nothing \u2014", font=R.sans, fill=R.RED)
    R.xmark_at(d, W - M - 100, y + 150, 30)
    y += 350
    R.note_strip(d, y,
        "0 \u2014 no cotton gin, no Erie Canal, no Second Great Awakening.",
        R.RED)
    return im

# ---------------- sourcing: lost (teachable moment) ----------------
@stage("s7")
def _():
    im, d = R.base()
    R.header(d, "SOURCING", "2 / 7")
    y = 300
    y = move_card(d, y, "What the essay did",
        "Summarized document content and repeated source lines.", "x")
    y += 40
    y = R.note_strip(d, y,
        "Chief Reader: many responses never attempted sourcing. Identifying "
        "a POV is not enough.", R.RED) + 40
    y = R.note_strip(d, y,
        "The point needs: explain WHY a document's POV, purpose, historical "
        "situation, or audience matters to an argument.", R.GOLD) + 40
    return im

# ---------------- complexity: lost ----------------
@stage("s8")
def _():
    im, d = R.base()
    R.header(d, "COMPLEXITY", "2 / 7")
    y = move_card(d, 300, "The argument",
        "Listing document content. No qualification, no corroboration, "
        "no alternative view.", "x")
    R.note_strip(d, y + 50,
        "0 \u2014 the worst bleed on the exam: 0.15/1.", R.RED)
    return im

# ---------------- tally ----------------
@stage("s9")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "2 / 7")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 0, 1),
                              ("Evidence", 1, 2), ("Beyond the documents", 0, 1),
                              ("Sourcing", 0, 1), ("Complexity", 0, 1)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    for ln in R.wrap_px("Teachable moment: explain why a source's perspective "
                        "matters to your argument \u2014 identifying it is "
                        "not enough.", R.serif_i, W - 2 * M):
        d.text((M, y), ln, font=R.serif_i, fill=R.WHITE)
        y += 56
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save("%s/%s.png" % (OUT, name))
    print("%d stages rendered" % len(STAGES))
