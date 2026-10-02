#!/usr/bin/env python3
"""Video 39: 2025 DBQ graded 2/7 — a real bottom sample on the federal
government's role in the economy, 1932-1980 (Sample 1C).

Walks where each point was LOST, then ends on the pack's teachable moment:
complexity bled most (0.15/1), sourcing next (0.39/1), and the decisive fix —
use Docs 5 and 7 to qualify the argument with the conservative resurgence.
Student moves shown as paraphrased move-cards, never verbatim reproduction.
"""
import os
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup39")
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

@stage("v39_00")
def _():
    im, d = R.base()
    R.header(d, "2025 DBQ \u00b7 GRADED 2/7")
    R.paper_card(d, M, 300, PROMPT, "The real prompt")
    R.stamp_on(im, W // 2, 1150, "REAL BOTTOM SAMPLE", R.RED, 54)
    R.stamp_on(im, W // 2, 1400, "SCORED 2 / 7", R.RED, 72)
    return im

@stage("v39_01")
def _():
    im, d = R.base()
    R.header(d, "SEVEN DOCUMENTS", "0 / 7")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 7 * 118 + 40], 22, fill=R.NOTE_BG)
    cy = y + 30
    for num, name, yr in DOCS:
        d.text((M + 40, cy), f"Doc. {num}", font=R.sans_b, fill=R.GOLD)
        d.text((M + 245, cy + 6), f"{name} \u00b7 {yr}", font=R.sans_s, fill=R.WHITE)
        cy += 118
    return im

@stage("v39_02")
def _():
    im, d = R.base()
    R.header(d, "THESIS", "1 / 7")
    y = move_card(d, 300, "The student's claim",
        "The federal government created projects that would benefit everyone.", "check")
    R.note_strip(d, y + 50,
        "+1 \u2014 minimally defensible, and the essay's easiest point.", R.GREEN)
    return im

@stage("v39_03")
def _():
    im, d = R.base()
    R.header(d, "CONTEXTUALIZATION", "1 / 7")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 300], 22, fill=R.NOTE_BG, outline=R.RED, width=3)
    d.text((M + 48, y + 60), "Broader context in the response:", font=R.sans_s, fill=R.DIM)
    d.text((M + 48, y + 130), "\u2014 nothing \u2014", font=R.sans, fill=R.RED)
    R.xmark_at(d, W - M - 100, y + 150, 30)
    y += 350
    R.note_strip(d, y,
        "0 \u2014 no 1920s, no Depression, no baseline before 1932.", R.RED)
    return im

@stage("v39_04")
def _():
    im, d = R.base()
    R.header(d, "EVIDENCE", "2 / 7")
    y = move_card(d, 300, "Described: Docs. 3, 4, 6",
        "The highway photo, Kennedy's address, and the Ch\u00e1vez statement "
        "are described accurately enough to address the topic.", "check")
    y += 40
    y = move_card(d, y, "Used to support an argument",
        "No document is put to work proving a claim \u2014 description is "
        "all the essay does.", "x")
    y += 40
    R.note_strip(d, y,
        "+1 / 0 \u2014 the first evidence point lands; the second fails.", R.RED)
    return im

@stage("v39_05")
def _():
    im, d = R.base()
    R.header(d, "SOURCING", "2 / 7")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 300], 22, fill=R.NOTE_BG, outline=R.RED, width=3)
    d.text((M + 48, y + 60), "POV, purpose, situation, or audience reads:", font=R.sans_s, fill=R.DIM)
    d.text((M + 48, y + 130), "\u2014 none attempted \u2014", font=R.sans, fill=R.RED)
    R.xmark_at(d, W - M - 100, y + 150, 30)
    y += 350
    R.note_strip(d, y,
        "0 \u2014 sourcing was the second-biggest bleed on the exam: 0.39/1.", R.RED)
    return im

@stage("v39_06")
def _():
    im, d = R.base()
    R.header(d, "BEYOND THE DOCUMENTS", "2 / 7")
    y = 300
    d.rounded_rectangle([M, y, W - M, y + 300], 22, fill=R.NOTE_BG, outline=R.RED, width=3)
    d.text((M + 48, y + 60), "Outside evidence:", font=R.sans_s, fill=R.DIM)
    d.text((M + 48, y + 130), "\u2014 nothing \u2014", font=R.sans, fill=R.RED)
    R.xmark_at(d, W - M - 100, y + 150, 30)
    y += 350
    R.note_strip(d, y,
        "0 \u2014 the 7/7 response brought the Great Society. This one brought nothing.", R.RED)
    return im

@stage("v39_07")
def _():
    im, d = R.base()
    R.header(d, "COMPLEXITY", "2 / 7")
    y = move_card(d, 300, "The argument",
        "One direction, no qualification, no competing perspective.", "x")
    y += 40
    R.note_strip(d, y,
        "0 \u2014 the worst bleed on the exam: 0.15/1.", R.RED)
    return im

@stage("v39_08")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "2 / 7")
    y = 300
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 0, 1),
                              ("Evidence", 1, 2), ("Beyond the documents", 0, 1),
                              ("Sourcing", 0, 1), ("Complex understanding", 0, 1)]:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    y = R.note_strip(d, y,
        "Teachable moment: use Docs. 5 and 7 to qualify the growth story "
        "with the conservative resurgence. That is the complexity point.", R.GOLD)
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
