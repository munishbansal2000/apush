#!/usr/bin/env python3
"""Video 23: WE GRADED THIS 2024 DBQ (BAD) - real prompt, real student response (2/7).

2024 DBQ, slavery and U.S. society 1783-1840, Sample 1C (2/7): thesis +1,
beyond-docs +1 (Fugitive Slave Act); lost context (passing phrase), both
evidence points (name-dropped documents), sourcing (no attempt), complexity.
Ends on the pack's teachable moment: keep outside evidence inside the period.
Student moves shown only as short paraphrased move-cards.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup23")
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
    d.text((M, 150), "2024 DBQ \u00b7 GRADED 2/7", font=R.sans_b, fill=R.GOLD)
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL STUDENT RESPONSE", R.GOLD, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 2 / 7", R.GOLD, 72)
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
        "Slavery's effects sorted into three buckets: economy, laws, values.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 defensible claim with a line of reasoning.", R.GREEN)
    return im

@stage("s3")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "1 / 7")
    y = move_card(d, 300, "The student's setup \u00b7 paraphrased",
        "\u201cGold, god, and glory\u201d \u2014 a passing phrase, nothing more.", "x")
    R.note_strip(d, y + 50, "0 \u2014 context must be described, more than a phrase.", R.RED)
    return im

@stage("s4")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "1 / 7")
    y = move_card(d, 300, "The documents \u00b7 paraphrased",
        "Only two documents genuinely addressed. The rest: mentioned or "
        "quoted, never used to support an argument.", "x")
    R.note_strip(d, y + 50, "0 / 0 \u2014 name-dropped documents earn no evidence point.", R.RED)
    return im

@stage("s5")
def _():
    im, d = R.base()
    R.header(d, "SOURCING", "1 / 7")
    y = move_card(d, 300, "Sourcing attempt",
        "No attempt at all. No POV, purpose, situation, or audience "
        "explained for any document.", "x")
    R.note_strip(d, y + 50, "0 \u2014 you cannot earn a point you never reach for.", R.RED)
    return im

@stage("s6")
def _():
    im, d = R.base()
    R.header(d, "BEYOND THE DOCUMENTS", "2 / 7")
    y = move_card(d, 300, "Outside evidence \u00b7 paraphrased",
        "The Fugitive Slave Act (read as the 1793 act). The Dred Scott "
        "mention was thrown out \u2014 1857 is outside the window.", "check")
    R.note_strip(d, y + 50, "+1 \u2014 one specific, in-period example survived.", R.GREEN)
    return im

@stage("s7")
def _():
    im, d = R.base()
    R.header(d, "COMPLEXITY", "2 / 7")
    y = move_card(d, 300, "The argument \u00b7 paraphrased",
        "A simple claim, stated simply. Documents never woven into a "
        "multi-sided argument.", "x")
    R.note_strip(d, y + 50, "0 \u2014 no qualification, no competing perspectives.", R.RED)
    return im

@stage("s8")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "2 / 7")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 0, 1),
                              ("Evidence", 0, 2), ("Beyond the documents", 1, 1),
                              ("Sourcing", 0, 1), ("Complexity", 0, 1)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    for ln in R.wrap_px("The pattern: documents mentioned but never used.",
                        R.serif_i, W - 2 * M):
        d.text((M, y), ln, font=R.serif_i, fill=R.WHITE); y += 56
    return im

@stage("s9")
def _():
    im, d = R.base()
    R.header(d, "THE TAKEAWAY", "2 / 7")
    y = 300
    y = R.note_strip(d, y,
        "Keep outside evidence inside the period. This response reached for Dred Scott and the 1850s.", R.RED) + 40
    y = R.note_strip(d, y,
        "The window was 1783\u20131840. The cotton gin, the gag rule, and the \u201cpositive good\u201d defense were all in reach.", R.GOLD) + 40
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
