#!/usr/bin/env python3
"""Video 22: WE GRADED THIS 2024 DBQ (GOOD) - real prompt, real student response (7/7).

2024 DBQ, slavery and U.S. society 1783-1840, Sample 1A (7/7): thesis, context,
evidence x2, sourcing on four documents, beyond-docs (Frederick Douglass),
complexity (multi-theme argument + cross-period comparison). Student moves
shown only as short paraphrased move-cards, paired with grading commentary.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup22")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

PROMPT = ("Evaluate the extent to which the institution of slavery shaped "
          "United States society between 1783 and 1840.")

DOCS = [
    (1, "1783 MA court ruling: slavery violates the state constitution"),
    (2, "1791 Banneker letter to Jefferson: hypocrisy on equality"),
    (3, "1820 Carey warning: reopening the Missouri debate"),
    (4, "1823 Furman defense: slavery biblically sanctioned"),
    (5, "1829 Garrison expos\u00e9: the domestic slave trade"),
    (6, "1836 Jarena Lee: antislavery on Christian grounds"),
    (7, "1840 almanac cartoon: the free state re-enslaves a man"),
]

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

def doc_list(d, y):
    rows = []
    for num, desc in DOCS:
        lines = R.wrap_px(desc, R.sans_s, W - 2 * M - 320)
        rows.append((num, lines))
    boxh = 40 + sum(64 + 52 * len(l) for _, l in rows)
    d.rounded_rectangle([M, y, W - M, y + boxh], 22, fill=R.NOTE_BG)
    cy = y + 30
    for num, lines in rows:
        d.text((M + 40, cy), f"Doc. {num}", font=R.sans_b, fill=R.GOLD)
        ty = cy + 4
        for ln in lines:
            d.text((M + 260, ty), ln, font=R.sans_s, fill=R.WHITE)
            ty += 52
        cy += 64 + 52 * len(lines)
    return y + boxh

# ---------------- hook + documents ----------------
@stage("s0")
def _():
    im, d = R.base()
    d.text((M, 150), "2024 DBQ \u00b7 GRADED 7/7", font=R.sans_b, fill=R.GOLD)
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL STUDENT RESPONSE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 7 / 7", R.GOLD, 72)
    return im

@stage("s1")
def _():
    im, d = R.base()
    R.header(d, "SEVEN DOCUMENTS")
    doc_list(d, 300)
    return im

# ---------------- grading ----------------
@stage("s2")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 7")
    y = move_card(d, 300, "The student's claim \u00b7 paraphrased",
        "Slavery shaped American society through moral debate and religious "
        "disagreement over what the Bible said about slavery.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 ranked thesis, answers the extent, line of reasoning.", R.GREEN)
    return im

@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "2 / 7")
    y = move_card(d, 300, "The student's setup \u00b7 paraphrased",
        "The Revolution, the end of the international slave trade, and "
        "abolitionist\u2013slaveholder tensions.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 broader context framing the whole period.", R.GREEN)
    return im

@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "4 / 7")
    y = move_card(d, 300, "Four documents argued with \u00b7 paraphrased",
        "Four documents described accurately, then used to support the "
        "argument \u2014 not listed, argued.", "check")
    R.note_strip(d, y + 50, "+1 / +1 \u2014 three described; four used to support the argument.", R.GREEN)
    return im

@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "SOURCING", "5 / 7")
    y = move_card(d, 300, "Four documents sourced \u00b7 paraphrased",
        "Purpose behind Doc. 1, historical situation of Doc. 3, audience of "
        "Doc. 4, point of view of Doc. 6 \u2014 why each matters to the argument.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 explains relevance, not just identification. Four docs; two needed.", R.GREEN)
    return im

@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "BEYOND THE DOCUMENTS", "6 / 7")
    y = move_card(d, 300, "Outside evidence \u00b7 paraphrased",
        "Frederick Douglass: his writing and activism against slavery.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 specific, in period, relevant to the prompt.", R.GREEN)
    return im

@stage("s7")
def _():
    im, d = R.base()
    R.header(d, "COMPLEXITY", "7 / 7")
    y = move_card(d, 300, "The argument \u00b7 paraphrased",
        "Multiple themes in one argument, plus a cross-period comparison to "
        "Spanish colonial treatment of Native Americans.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 sophisticated argumentation, sustained throughout.", R.GREEN)
    return im

@stage("s8")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "7 / 7")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 1, 1),
                              ("Evidence", 2, 2), ("Beyond the documents", 1, 1),
                              ("Sourcing", 1, 1), ("Complexity", 1, 1)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    for ln in R.wrap_px("Thorough sourcing and a qualified, multi-sided argument: that is what a perfect DBQ looks like.",
                        R.serif_i, W - 2 * M):
        d.text((M, y), ln, font=R.serif_i, fill=R.WHITE); y += 56
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
