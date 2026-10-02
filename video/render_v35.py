#!/usr/bin/env python3
"""Video 35: "We Graded This 2024 SAQ" - 2024 SAQ 3 (British policy) graded 1/3.

Graded live on camera from the released 2024 APUSH FRQ set 1.
Brief excerpts and paraphrased student moves only, always paired with
grading commentary (IP rule: never reproduce a full sample response).
"""
import os
from PIL import Image, ImageDraw
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup35")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

COLORS = {"green": R.GREEN, "red": R.RED, "gold": R.GOLD}

DATA = [{'name': 'v35a', 'type': 'hook', 'header': '2024 SAQ3 · GRADED 1/3', 'stimulus': 'No stimulus — pure recall. British policy in the colonies,\n            group responses to it, and the development that won the war.', 'stimulus_title': 'The prompt · 1763 to 1783', 'rows': [('A', 'One British policy in the colonies, 1763–1776'), ('B', "One similarity/difference in TWO groups' responses"), ('C', 'One development behind the colonial victory')]}, {'name': 'v35b', 'type': 'grade', 'header': 'PART A', 'chip': '1 / 3', 'letter': 'A', 'title': 'Policy', 'window': '1763–1776', 'move': 'described the Stamp Act and the tea tax — both real, both in the window', 'earned': True, 'note': '+1 — that is all part A requires.', 'note_accent': 'green'}, {'name': 'v35c', 'type': 'grade', 'header': 'PART B', 'chip': '1 / 3', 'letter': 'B', 'title': 'Two groups', 'window': '1763–1783', 'move': 'discussed only the Boston Tea Party participants — one group', 'earned': False, 'note': 'Part B demands two. One group can never earn the two-group point.', 'note_accent': 'red'}, {'name': 'v35d', 'type': 'grade', 'header': 'PART C', 'chip': '1 / 3', 'letter': 'C', 'title': 'Victory', 'window': '1775–1783', 'move': '“many battles” — a generic label, not a development, with no mechanism tied to victory', 'earned': False, 'note': 'Generality earns nothing. “Explain” needs a specific development.', 'note_accent': 'red'}, {'name': 'v35e', 'type': 'tally', 'header': 'FINAL TALLY', 'chip': '1 / 3', 'parts': [('Part A', 1, 1), ('Part B', 0, 1), ('Part C', 0, 1)], 'takeaway': 'Teachable moment: not every British policy was a tax — the Proclamation Line and the Coercive Acts count. And part B always needs two distinct groups.', 'takeaway_accent': 'gold'}]

def part_card(d, y, letter, title, window, move, earned):
    """A grading card for one SAQ part. Returns bottom y."""
    maxw = W - 2 * M - 120
    move_lines = R.wrap_px(move, R.serif_i, maxw)
    hh = 300 + 62 * len(move_lines)
    d.rounded_rectangle([M, y, W - M, y + hh], 24, fill=R.NOTE_BG,
                        outline=R.GREEN if earned else R.RED, width=4)
    bx, by, br = M + 78, y + 78, 52
    d.ellipse([bx - br, by - br, bx + br, by + br],
              fill=R.GREEN if earned else R.RED)
    d.text((bx - 20, by - 38), letter, font=R.sans_b, fill=R.WHITE)
    d.text((M + 160, y + 44), title, font=R.sans_b, fill=R.WHITE)
    bb = d.textbbox((0, 0), window, font=R.sans_s)
    tw = bb[2] - bb[0]
    d.rounded_rectangle([W - M - tw - 70, y + 44, W - M - 30, y + 108], 16,
                        fill=(38, 42, 56), outline=R.GOLD, width=2)
    d.text((W - M - tw - 45, y + 56), window, font=R.sans_s, fill=R.GOLD)
    cy = y + 150
    d.text((M + 60, cy), "Student's move:", font=R.sans_s, fill=R.DIM)
    cy += 62
    for ln in move_lines:
        d.text((M + 60, cy), ln, font=R.serif_i, fill=R.WHITE)
        cy += 62
    if earned:
        R.check_at(d, W - M - 90, y + hh - 80, 34)
    else:
        R.xmark_at(d, W - M - 90, y + hh - 80, 34)
    return y + hh

def lane_diagram(d, y, start, end, lanes, pins):
    """Simple period-lane diagram. lanes: [(a,b,label,color)], pins: [(yr,label,color,ok)]."""
    def xx(yr):
        return M + (yr - start) / (end - start) * (W - 2 * M)
    d.rounded_rectangle([M, y, W - M, y + 330], 22, fill=R.NOTE_BG)
    for (a, b, label, col) in lanes:
        x0, x1 = xx(a), xx(b)
        d.rounded_rectangle([x0, y + 40, x1, y + 110], 14, fill=(38, 42, 56),
                            outline=COLORS[col], width=3)
        d.text((x0 + 16, y + 56), label, font=R.sans_s, fill=COLORS[col])
    for yr in (start, end):
        x = xx(yr)
        d.line([x, y + 120, x, y + 145], fill=R.DIM, width=3)
        t = str(yr)
        bb = d.textbbox((0, 0), t, font=R.sans_s)
        d.text((x - (bb[2] - bb[0]) / 2, y + 150), t, font=R.sans_s, fill=R.DIM)
    for (yr, label, col, ok) in pins:
        x = min(max(xx(yr), M + 30), W - M - 30)
        d.line([x, y + 110, x, y + 236], fill=COLORS[col], width=4)
        if ok:
            d.ellipse([x - 14, y + 236, x + 14, y + 264], fill=COLORS[col])
        else:
            R.xmark_at(d, x, y + 250, 24)
    ly = y + 360
    for (yr, label, col, ok) in pins:
        d.ellipse([M + 40 - 12, ly + 20, M + 40 + 12, ly + 44], fill=COLORS[col])
        cy = ly
        for ln in R.wrap_px(label, R.sans, W - 2 * M - 150):
            d.text((M + 90, cy), ln, font=R.sans, fill=R.WHITE)
            cy += 72
        ly = cy + 16
    return ly

def abc_rows(d, y, rows):
    for letter, q in rows:
        lines = R.wrap_px(q, R.sans, W - 2 * M - 220)[:2]
        rh = 56 + 72 * len(lines)
        d.rounded_rectangle([M, y, W - M, y + rh], 18, fill=R.NOTE_BG)
        d.ellipse([M + 70 - 34, y + rh / 2 - 34, M + 70 + 34, y + rh / 2 + 34],
                  fill=(38, 42, 56), outline=R.GOLD, width=3)
        bb = d.textbbox((0, 0), letter, font=R.sans_b)
        d.text((M + 70 - (bb[2] - bb[0]) / 2 - bb[0], y + rh / 2 - 36), letter,
               font=R.sans_b, fill=R.GOLD)
        ty = y + (rh - 72 * len(lines)) / 2 + 6
        for ln in lines:
            d.text((M + 130, ty), ln, font=R.sans, fill=R.WHITE)
            ty += 72
        y += rh + 20
    return y

def render_hook(d, s):
    R.header(d, s["header"])
    bottom, _ = R.paper_card(d, M, 300, s["stimulus"], s["stimulus_title"])
    abc_rows(d, bottom + 50, s["rows"])

def render_grade(d, s):
    R.header(d, s["header"], s["chip"])
    y = part_card(d, 300, s["letter"], s["title"], s["window"], s["move"], s["earned"])
    y += 50
    if s.get("lane"):
        L = s["lane"]
        y = lane_diagram(d, y, L["start"], L["end"], L["lanes"], L["pins"]) + 50
    y = R.note_strip(d, y, s["note"], COLORS[s["note_accent"]])
    if s.get("note2"):
        R.note_strip(d, y + 40, s["note2"], COLORS[s["note2_accent"]])

def render_tally(d, s):
    R.header(d, s["header"], s["chip"])
    y = 300
    for label, got, total in s["parts"]:
        y = R.tally_row(d, y, label, got, total)
    y += 50
    R.note_strip(d, y, s["takeaway"], COLORS[s["takeaway_accent"]])

for s in DATA:
    @stage(s["name"])
    def _(_s=s):
        im, d = R.base()
        {"hook": render_hook, "grade": render_grade, "tally": render_tally}[_s["type"]](d, _s)
        return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
