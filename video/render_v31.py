#!/usr/bin/env python3
"""Video 31: "We Graded This 2024 SAQ" - 2024 SAQ 1 (women's-rights origins) graded 1/3.

Graded live on camera from the released 2024 APUSH FRQ set 1.
Brief excerpts and paraphrased student moves only, always paired with
grading commentary (IP rule: never reproduce a full sample response).
"""
import os
from PIL import Image, ImageDraw
import render_markup as R

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup31")
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

COLORS = {"green": R.GREEN, "red": R.RED, "gold": R.GOLD}

DATA = [{'name': 'v31a', 'type': 'hook', 'header': '2024 SAQ1 · GRADED 1/3', 'stimulus': "Melder (1977): religious and reform participation built bonds of\n            sisterhood that launched the women's rights movement.\n            Lerner (1969): industrialization divided women by class —\n            middle-class women led the movement; working women chased economic survival.", 'stimulus_title': 'Melder vs. Lerner · secondary source', 'rows': [('A', 'One difference between the two interpretations'), ('B', 'One 1800–1848 event supporting Melder'), ('C', 'One 1800–1848 event supporting Lerner')]}, {'name': 'v31b', 'type': 'grade', 'header': 'PART A', 'chip': '1 / 3', 'letter': 'A', 'title': 'Difference', 'window': 'no window', 'move': '“Melder sees sisterhood; Lerner sees women with differing class views”', 'earned': True, 'note': '+1 — the basic difference is stated. This is where the good news ends.', 'note_accent': 'green'}, {'name': 'v31c', 'type': 'grade', 'header': 'PART B', 'chip': '1 / 3', 'letter': 'B', 'title': 'Support Melder', 'window': '1800–1848', 'move': 'cited the First Great Awakening — a full century outside the window', 'earned': False, 'note': 'No point possible. The date alone decides it, however good the explanation.', 'note_accent': 'red', 'lane': {'start': 1700, 'end': 1850, 'lanes': [(1800, 1848, 'PART B LANE', 'green')], 'pins': [(1740, "First Great Awakening — student's answer", 'red', False), (1820, 'Second Great Awakening — in period', 'green', True)]}}, {'name': 'v31d', 'type': 'grade', 'header': 'PART C', 'chip': '1 / 3', 'letter': 'C', 'title': 'Support Lerner', 'window': '1800–1848', 'move': "restated the excerpt's industrialization language in generalities — no specific event, no link to Lerner", 'earned': False, 'note': "Generalities earn nothing. “Explain” means connect the evidence to the author's argument.", 'note_accent': 'red'}, {'name': 'v31e', 'type': 'tally', 'header': 'FINAL TALLY', 'chip': '1 / 3', 'parts': [('Part A', 1, 1), ('Part B', 0, 1), ('Part C', 0, 1)], 'takeaway': "Teachable moment: name an event, then tie it to the author's argument. The Chief Reader flagged Lerner's class thesis as the hardest part on the question.", 'takeaway_accent': 'gold'}]

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
