"""Video 17: "We Graded This 2023 SAQ 2 — 1/3" — Ida Tarbell on Standard Oil. Sample 2C: (a) misread the stance, (b) earned, (c) chronology miss. IP: student moves paraphrased; brief source excerpts paired with grading commentary; never reproduce the sample verbatim."""
import os
from PIL import Image, ImageDraw, ImageFont
import render_markup as R

PREFIX = 'v17'
VIDEO = {'doc': 'Video 17: "We Graded This 2023 SAQ 2 — 1/3" — Ida Tarbell on Standard Oil. Sample 2C: (a) misread the stance, (b) earned, (c) chronology miss. IP: student moves paraphrased; brief source excerpts paired with grading commentary; never reproduce the sample verbatim.', 'hook_header': '2023 SAQ 2 · GRADED 1/3', 'sources': [('Tarbell on Standard Oil (1904)', 'Standard Oil “is the most perfectly developed trust in existence” — built on “special privileges obtained by persistent secret effort in opposition to the spirit of the law.”')], 'rows': [('A', 'Describe Tarbell’s point of view'), ('B', 'One development behind the trust (1865–1904)'), ('C', 'One 1904–1920 effect of ideas like Tarbell’s')], 'mean': 'Mean score: 1.02 / 3 — watch the dates in each part.', 'parts': [{'stage_header': 'PART A', 'running': '0 / 3', 'letter': 'A', 'title': 'Point of view', 'window': 'no window', 'move': 'Described Tarbell’s point of view as positive toward the trust — a misread of the stance.', 'earned': False, 'verdict': 'No point — described the topic, not the stance.'}, {'stage_header': 'PART B', 'running': '0 / 3', 'letter': 'B', 'title': 'Development', 'window': '1865–1904', 'move': 'Explained horizontal and vertical integration as the strategies trusts used to control industries.', 'earned': True, 'verdict': '+1 — a real development, explained.'}, {'stage_header': 'PART C', 'running': '1 / 3', 'letter': 'C', 'title': 'Effect', 'window': '1904–1920', 'move': 'A vague laissez-faire reference outside the 1904–1920 window.', 'earned': False, 'verdict': 'No point — chronology miss; the dates do the gatekeeping.'}], 'tally': [('Part A', 0, 1), ('Part B', 1, 1), ('Part C', 0, 1)], 'final_score': '1 / 3', 'tally_note': 'A stance misread and a date miss — the two cheapest errors on the exam.', 'final_header': 'TEACHABLE MOMENT', 'final_text': 'Read the source’s stance, not just its topic — and watch the dates. Describe what the author thinks should happen, inside the given window.'}

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "markup" + PREFIX[1:])
os.makedirs(OUT, exist_ok=True)
W, H, M = R.W, R.H, R.M

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

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
    bb = d.textbbox((0, 0), window, font=R.sans_s)
    tw = bb[2] - bb[0]
    chip_l = W - M - tw - 70
    d.rounded_rectangle([chip_l, y + 44, W - M - 30, y + 108], 16,
                        fill=(38, 42, 56), outline=R.GOLD, width=2)
    d.text((W - M - tw - 45, y + 56), window, font=R.sans_s, fill=R.GOLD)
    tsize = 54
    tfont = R.sans_b
    while tsize > 30 and d.textlength(title, font=tfont) > chip_l - (M + 160) - 24:
        tsize -= 4
        tfont = ImageFont.truetype(R.FONT_DIR + "/DejaVuSans-Bold.ttf", tsize)
    d.text((M + 160, y + 44), title, font=tfont, fill=R.WHITE)
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

@stage(f"{PREFIX}a")
def _():
    im, d = R.base()
    R.header(d, VIDEO["hook_header"])
    y = 300
    for title, text in VIDEO["sources"]:
        y, _ = R.paper_card(d, M, y, text, title)
        y += 20
    y = abc_rows(d, y + 12, VIDEO["rows"]) + 20
    R.note_strip(d, y, VIDEO["mean"], R.GOLD)
    return im

@stage(f"{PREFIX}b")
def _():
    p = VIDEO["parts"][0]
    im, d = R.base()
    R.header(d, p["stage_header"], p["running"])
    y = part_card(d, 300, p["letter"], p["title"], p["window"], p["move"], p["earned"])
    R.note_strip(d, y + 50, p["verdict"], R.GREEN if p["earned"] else R.RED)
    return im

@stage(f"{PREFIX}c")
def _():
    p = VIDEO["parts"][1]
    im, d = R.base()
    R.header(d, p["stage_header"], p["running"])
    y = part_card(d, 300, p["letter"], p["title"], p["window"], p["move"], p["earned"])
    R.note_strip(d, y + 50, p["verdict"], R.GREEN if p["earned"] else R.RED)
    return im

@stage(f"{PREFIX}d")
def _():
    p = VIDEO["parts"][2]
    im, d = R.base()
    R.header(d, p["stage_header"], p["running"])
    y = part_card(d, 300, p["letter"], p["title"], p["window"], p["move"], p["earned"])
    R.note_strip(d, y + 50, p["verdict"], R.GREEN if p["earned"] else R.RED)
    return im

@stage(f"{PREFIX}e")
def _():
    im, d = R.base()
    R.header(d, "FINAL TALLY", VIDEO["final_score"])
    y = 300
    for label, got, total in VIDEO["tally"]:
        y = R.tally_row(d, y, label, got, total)
    y += 50
    R.note_strip(d, y, VIDEO["tally_note"], R.GOLD)
    return im

@stage(f"{PREFIX}f")
def _():
    im, d = R.base()
    R.header(d, VIDEO["final_header"], VIDEO["final_score"])
    lines = R.wrap_px(VIDEO["final_text"], R.sans, W - 2 * M - 96)
    hh = 60 + 72 * len(lines)
    y = 320
    d.rounded_rectangle([M, y, W - M, y + hh], 22, fill=R.NOTE_BG,
                        outline=R.GOLD, width=4)
    cy = y + 36
    for ln in lines:
        d.text((M + 48, cy), ln, font=R.sans, fill=R.WHITE)
        cy += 72
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
