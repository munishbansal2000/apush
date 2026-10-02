#!/usr/bin/env python3
"""Video 2: FROM 4/7 TO 7/7 — the same essay, three fixes, each earning its point.

Before/after beats: the weak passage (red) flips to the fixed passage (green),
running score chip climbs 4/7 -> 5/7 -> 6/7 -> 7/7.
"""
import os
from PIL import Image, ImageDraw, ImageFont
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup2")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M
DOCS = ["Inaugural address", "Hamilton on the Bank", "Jefferson's warning",
        "Whiskey proclamation", "Sedition Act", "Kentucky Resolutions",
        "Virginia warning"]
# canonical numbers used in the essay: 1 inaugural, 3 jefferson, 4 hamilton, 5 whiskey, 6 sedition, 7 kentucky
DOC_NUM = [1, 4, 3, 5, 6, 7, 2]

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

def doc_checklist(d, y, lit):
    """lit: set of doc numbers lit green."""
    d.rounded_rectangle([M, y, W - M, y + 560], 22, fill=R.NOTE_BG)
    cy = y + 36
    for i, name in enumerate(DOCS):
        num = DOC_NUM[i]
        on = num in lit
        col = R.GREEN if on else (70, 74, 88)
        # checkbox
        d.rounded_rectangle([M + 40, cy, M + 96, cy + 56], 12,
                            fill=(24, 60, 40) if on else (40, 43, 55),
                            outline=col, width=3)
        if on:
            R.check_at(d, M + 68, cy + 28, 16, R.GREEN, 6)
        d.text((M + 120, cy + 4), f"Doc. {num} \u00b7 {name}",
               font=R.sans_s, fill=R.WHITE if on else R.DIM)
        cy += 72
    return y + 560

EVIDENCE_AFTER = ("The Federalists also proved federal law had teeth. When western Pennsylvania farmers rose against "
    "the whiskey tax in 1794, Washington's proclamation called forth the militia to \u201csuppress the combinations\u201d "
    "and \u201ccause the laws to be duly executed\u201d (Doc. 5) \u2014 the first time national military force backed a federal tax. "
    "But the bank itself was contested: Jefferson, writing privately to Washington, warned that Hamilton's plan took "
    "\u201ca single step beyond the boundaries\u201d of delegated powers into a \u201cboundless field of power\u201d (Doc. 3). "
    "And the backlash outlived the Federalists: Kentucky answered the Sedition Act by declaring the states "
    "\u201cnot united on the principle of unlimited submission\u201d (Doc. 7).")

SOURCING_AFTER = ("Hamilton's 1791 opinion argued that constitutional powers \u201cought to be construed liberally in "
    "advancement of the public good\u201d (Doc. 4). But Hamilton is not describing the Constitution neutrally \u2014 he is "
    "writing to the president to win approval for his bank. His purpose is advocacy, and \u201cliberal construction\u201d is the "
    "legal tool his policy needs. Likewise, Washington's inaugural promise that \u201cno party animosities\u201d would misdirect "
    "the government (Doc. 1) is not just idealism; it is a new president performing unity to legitimize his government.")

COMPLEXITY_BEFORE = ("In the end, the Federalist years left the United States with a stronger national government than the one "
    "Washington inherited \u2014 a funded debt, a national bank, and the demonstrated willingness to enforce federal law. "
    "Their policies were controversial, but they gave the republic the authority it needed to survive its first decade.")

COMPLEXITY_AFTER = ("Yet the same policies that built federal authority generated the doctrine that would challenge it: Kentucky's "
    "claim that states could judge federal overreach armed every future opponent of national power. The Federalists succeeded "
    "where survival mattered \u2014 they left a government that could tax, borrow, and enforce \u2014 but the unity they built was "
    "the unity of obedience, and it expired with Adams's defeat in 1800.")

@stage("w0")
def _():
    im, d = R.base()
    R.header(d, "FROM 4/7 TO 7/7")
    y = 300
    for ln in R.wrap_px("Last time: three points left on the table.", R.sans, W - 2 * M):
        d.text((M, y), ln, font=R.sans, fill=R.WHITE); y += 80
    for label in ["Evidence, second half", "Sourcing", "Complexity"]:
        d.rounded_rectangle([M, y, W - M, y + 108], 18, fill=R.NOTE_BG)
        d.text((M + 40, y + 28), label, font=R.sans, fill=R.WHITE)
        R.xmark_at(d, W - M - 100, y + 54, 24)
        y += 128
    y += 30
    R.note_strip(d, y, "Same essay, rewritten. Watch each fix earn its point.", R.GOLD)
    return im

@stage("w1")
def _():
    im, d = R.base()
    R.header(d, "FIX 1 \u00b7 EVIDENCE", "4 / 7")
    y = 300
    d.text((M, y), "Before: three documents do all the work.", font=R.sans_s, fill=R.DIM); y += 70
    y = doc_checklist(d, y, {1, 4, 6}) + 50
    R.note_strip(d, y, "Second evidence point needs 6+. Three is not enough.", R.RED)
    return im

@stage("w2a")
def _():
    im, d = R.base()
    R.header(d, "FIX 1 \u00b7 EVIDENCE", "4 / 7")
    bottom, sents = R.paper_card(d, M, 300, EVIDENCE_AFTER, "After \u00b7 three documents woven in")
    for i in (1, 2, 3):
        if i < len(sents): R.uline_sent(d, sents[i], R.GREEN)
    return im

@stage("w2b")
def _():
    im, d = R.base()
    R.header(d, "FIX 1 \u00b7 EVIDENCE", "5 / 7")
    bottom, sents = R.paper_card(d, M, 300, EVIDENCE_AFTER, "After \u00b7 three documents woven in")
    for i in (1, 2, 3):
        if i < len(sents): R.uline_sent(d, sents[i], R.GREEN)
    R.note_strip(d, bottom + 50, "+1 \u2014 six documents, all advancing the argument.", R.GREEN)
    return im

@stage("w3")
def _():
    im, d = R.base()
    R.header(d, "FIX 2 \u00b7 SOURCING", "5 / 7")
    bottom, sents = R.paper_card(d, M, 300,
        "Hamilton's 1791 opinion on the Bank argued that constitutional powers \u201cought to be construed liberally "
        "in advancement of the public good\u201d (Doc. 4), which justified a national bank and a broad reading of federal power.",
        "Before \u00b7 the quote, and nothing else")
    R.uline_sent(d, sents[0], R.RED)
    R.note_strip(d, bottom + 50, "It never asks why Hamilton wrote it.", R.RED)
    return im

@stage("w4")
def _():
    im, d = R.base()
    R.header(d, "FIX 2 \u00b7 SOURCING", "6 / 7")
    bottom, sents = R.paper_card(d, M, 300, SOURCING_AFTER, "After \u00b7 reading the document, not just the quote")
    for i in (1, 3):
        if i < len(sents): R.uline_sent(d, sents[i], R.GREEN)
    R.note_strip(d, bottom + 50, "+1 \u2014 two documents sourced by purpose.", R.GREEN)
    return im

@stage("w5")
def _():
    im, d = R.base()
    R.header(d, "FIX 3 \u00b7 COMPLEXITY", "6 / 7")
    bottom, sents = R.paper_card(d, M, 300, COMPLEXITY_BEFORE, "Before \u00b7 one straight line")
    for s_ in sents: R.uline_sent(d, s_, R.RED)
    R.note_strip(d, bottom + 50, "Calling it \u201ccontroversial\u201d is not a qualification.", R.RED)
    return im

@stage("w6")
def _():
    im, d = R.base()
    R.header(d, "FIX 3 \u00b7 COMPLEXITY", "7 / 7")
    bottom, sents = R.paper_card(d, M, 300, COMPLEXITY_AFTER, "After \u00b7 the thesis, qualified")
    for i in (0, 1):
        if i < len(sents): R.uline_sent(d, sents[i], R.GREEN)
    R.note_strip(d, bottom + 50, "+1 \u2014 a contradiction engaged, not dodged.", R.GREEN)
    return im

TALLY7 = [("Thesis", 1, 1), ("Contextualization", 1, 1), ("Evidence", 2, 2),
          ("Beyond the documents", 1, 1), ("Sourcing", 1, 1), ("Complexity", 1, 1)]

@stage("w7a")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "7 / 7")
    y = 300
    d.text((M, y), "Every point earned", font=R.sans, fill=R.GREEN); y += 80
    for label, got, total in TALLY7:
        y = R.tally_row(d, y, label, got, total)
    return im

@stage("w7b")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", "7 / 7")
    y = 300
    d.text((M, y), "Every point earned", font=R.sans, fill=R.GREEN); y += 80
    for label, got, total in TALLY7:
        y = R.tally_row(d, y, label, got, total)
    y += 40
    d.text((M, y), "Every missing point has a specific fix.", font=R.serif_i, fill=R.WHITE)
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
