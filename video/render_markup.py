#!/usr/bin/env python3
"""Animated red-pen markup renderer v2 — the essay stays on screen.

Every grading stage shows the essay paper persistently; rubric marks are
drawn ON the paper (underlines) with point chips as margin notes below.
No text is ever wrapped by character count (wrap_px everywhere).
"""
from PIL import Image, ImageDraw, ImageFont
import os
HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "fonts")

W, H, M = 1080, 1920, 60
BG      = (18, 20, 28)
PAPER   = (253, 248, 235)
PAPER_L = (240, 232, 214)
INK     = (30, 30, 34)
DIM     = (150, 156, 170)
GOLD    = (233, 196, 106)
GREEN   = (46, 160, 90)
RED     = (200, 60, 55)
WHITE   = (245, 245, 245)
NOTE_BG = (28, 31, 42)

sans   = ImageFont.truetype(FONT_DIR + "/DejaVuSans.ttf", 54)
sans_b = ImageFont.truetype(FONT_DIR + "/DejaVuSans-Bold.ttf", 54)
sans_s = ImageFont.truetype(FONT_DIR + "/DejaVuSans.ttf", 44)
serif_body = ImageFont.truetype(FONT_DIR + "/DejaVuSerif.ttf", 40)
serif_i = ImageFont.truetype(FONT_DIR + "/DejaVuSansMono-Oblique.ttf", 40)

OUT = os.path.join(HERE, "markup")
os.makedirs(OUT, exist_ok=True)

def wrap_px(text, font, maxw):
    d = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    out = []
    for para in text.split("\n"):
        words, line = para.split(" "), ""
        for w_ in words:
            t = (line + " " + w_).strip()
            if d.textlength(t, font=font) <= maxw:
                line = t
            else:
                if line: out.append(line)
                line = w_
        out.append(line)
        out.append("")
    return out[:-1]

def split_sentences(text):
    sents, cur = [], ""
    i = 0
    while i < len(text):
        cur += text[i]
        if text[i] in ".!?" and (i + 1 == len(text) or text[i + 1] in " \n"):
            s = cur.strip()
            if s: sents.append(s)
            cur = ""
            while i + 1 < len(text) and text[i + 1] in " \n": i += 1
        i += 1
    s = cur.strip()
    if s: sents.append(s)
    return sents

def draw_essay_text(d, x, y, text, title=None, font=None, maxw=None):
    font = font or serif_body
    maxw = maxw or (W - 2 * M - 80)
    pad = 40
    line_h = int(font.size * 1.42)
    tmp = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    sents = []
    cy = y + pad + (70 if title else 10)
    if title:
        d.text((x + pad, y + pad), title, font=sans_s, fill=(120, 110, 95))
    for para in text.split("\n\n"):
        for sent in split_sentences(para):
            lines = wrap_px(sent, font, maxw)
            srec = {"lines": [], "box": None}
            x0, y0 = x + pad, cy
            x1, y1 = x0, cy
            for ln in lines:
                if not ln.strip():
                    cy += int(line_h * 0.5); continue
                w_ = tmp.textlength(ln, font=font)
                asc, desc = font.getmetrics()
                d.text((x + pad, cy), ln, font=font, fill=INK)
                srec["lines"].append((x + pad, cy, w_, asc + desc))
                x1 = max(x1, x + pad + w_); y1 = cy + asc + desc
                cy += line_h
            srec["box"] = (x0, y0, x1, y1)
            sents.append(srec)
        cy += int(line_h * 0.55)
    bottom = cy + pad - int(line_h * 0.55)
    return bottom, sents

def measure_height(text, title=None, font=None, maxw=None):
    font = font or serif_body
    maxw = maxw or (W - 2 * M - 80)
    pad = 40
    line_h = int(font.size * 1.42)
    tmp = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    cy = pad + (70 if title else 10)
    for para in text.split("\n\n"):
        for sent in split_sentences(para):
            for ln in wrap_px(sent, font, maxw):
                if not ln.strip(): cy += int(line_h * 0.5); continue
                cy += line_h
        cy += int(line_h * 0.55)
    return cy + pad - int(line_h * 0.55)

def paper_card(d, x, y, text, title=None):
    h = measure_height(text, title)
    d.rounded_rectangle([x, y, x + (W - 2 * M), y + h], 26, fill=PAPER)
    d.rounded_rectangle([x, y, x + (W - 2 * M), y + h], 26, outline=PAPER_L, width=3)
    return draw_essay_text(d, x, y, text, title)

def header(d, title, score=None):
    size = 54
    f = sans_b
    reserve = 300 if score else 0
    while d.textlength(title, font=f) > W - 2 * M - reserve and size > 28:
        size -= 2
        f = ImageFont.truetype(FONT_DIR + "/DejaVuSans-Bold.ttf", size)
    d.text((M, 150), title, font=f, fill=GOLD)
    if score:
        bb = d.textbbox((0, 0), score, font=sans_b)
        tw = bb[2] - bb[0]
        d.rounded_rectangle([W - M - tw - 60, 120, W - M, 200], 20,
                            fill=NOTE_BG, outline=GOLD, width=3)
        d.text((W - M - tw - 30, 140), score, font=sans_b, fill=GOLD)

def uline_sent(d, sent, color, width=6):
    for (lx, ly, lw, lh) in sent["lines"]:
        d.line([lx, ly + lh + 6, lx + lw, ly + lh + 6], fill=color, width=width)

def check_at(d, cx, cy, r=24, color=GREEN, width=8):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=width)
    d.line([cx - r * 0.45, cy, cx - r * 0.08, cy + r * 0.38], fill=color, width=width)
    d.line([cx - r * 0.08, cy + r * 0.38, cx + r * 0.5, cy - r * 0.35], fill=color, width=width)

def xmark_at(d, cx, cy, r=24, color=RED, width=8):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=width)
    o = r * 0.4
    d.line([cx - o, cy - o, cx + o, cy + o], fill=color, width=width)
    d.line([cx - o, cy + o, cx + o, cy - o], fill=color, width=width)

def note_strip(d, y, text, accent=GREEN):
    maxw = W - 2 * M - 96
    lines = wrap_px(text, sans, maxw)
    lh = 72
    hh = 36 + lh * len(lines)
    if y + hh > H - 40:
        raise ValueError(f"note_strip overflow: y={y} hh={hh}")
    d.rounded_rectangle([M, y, W - M, y + hh], 22, fill=NOTE_BG)
    d.line([M, y + 26, M, y + hh - 26], fill=accent, width=10)
    cy = y + 30
    for ln in lines:
        d.text((M + 48, cy), ln, font=sans, fill=WHITE)
        cy += lh
    return y + hh

def stamp_on(im, cx, cy, text, color, size=64, rot=-8):
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(FONT_DIR + "/DejaVuSans-Bold.ttf", size)
    bb = d.textbbox((0, 0), text, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    t = Image.new("RGBA", (tw + 90, th + 90), (0, 0, 0, 0))
    td = ImageDraw.Draw(t)
    td.rectangle([8, 8, tw + 82, th + 82], outline=color + (255,), width=7)
    td.text((45 - bb[0], 45 - bb[1]), text, font=f, fill=color + (255,))
    t = t.rotate(rot, expand=True, resample=Image.BICUBIC)
    im.paste(t, (cx - t.width // 2, cy - t.height // 2), t)

def base():
    im = Image.new("RGB", (W, H), BG)
    return im, ImageDraw.Draw(im)

def dim_rect(im, x, y, w, h):
    ov = Image.new("RGBA", (w, h), (8, 8, 12, 160))
    im.paste(ov, (x, y), ov)

STAGES = {}
def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco

PROMPT = ("To what extent did the Federalist administrations of George Washington and John Adams "
          "promote national unity and advance the authority of the federal government, from 1789 to 1801?")

P1 = ("In 1789, George Washington took office as the first president of the United States. The new Constitution "
      "had just replaced the weak Articles of Confederation, and the federal government was an untested experiment. "
      "Washington and his fellow Federalists believed a strong central government was the only way to hold the young nation together.\n\n"
      "This essay argues that the Federalist administrations promoted national unity but ultimately weakened it "
      "by expanding federal authority at the expense of individual liberty.")

P2 = ("The Federalists took clear steps to build national unity. In 1791, Congress chartered the Bank of the United States, "
      "creating a single national currency that tied the states' economies together. When farmers in western Pennsylvania rose up "
      "against the whiskey tax in 1794, Washington himself led federal troops to crush the rebellion, proving that federal law would "
      "be enforced everywhere. As Washington's 1794 proclamation put it, the rebels stood in \u201copen opposition to the laws\u201d (Doc. 4).")

P3 = ("But the same Federalists who built unity also expanded federal power in ways that divided the country. The Sedition Act of 1798 "
      "made it a crime to criticize the president, and Federalist prosecutors used it to jail Republican newspaper editors. Jefferson and "
      "Madison answered with the Kentucky and Virginia Resolutions, arguing that states could nullify unconstitutional federal laws. "
      "This idea of states' rights, which appears in no document here, would echo all the way to the Civil War.")

P4 = ("In the end, the Federalist administrations did promote national unity through a bank, an army, and enforced laws, yet each step "
      "concentrated more power in federal hands. The unity they built came at the cost of the liberty they claimed to protect.")

QUOTE = "As Washington's 1794 proclamation put it, the rebels stood in \u201copen opposition to the laws\u201d (Doc. 4)."

@stage("s0a")
def _():
    im, d = base()
    d.text((M, 150), "The DBQ", font=sans_b, fill=GOLD)
    paper_card(d, M, 300, PROMPT, "The prompt")
    return im

@stage("s0b")
def _():
    im, d = base()
    d.text((M, 150), "The DBQ", font=sans_b, fill=GOLD)
    paper_card(d, M, 300, PROMPT, "The prompt")
    y = 830
    d.text((M, y), "What the prompt is really asking:", font=sans, fill=DIM)
    y += 80
    for q in ["how much did they promote national unity?",
              "how much did they advance federal authority?"]:
        for ln in wrap_px(q, serif_i, W - 2 * M - 40):
            w_ = d.textlength(ln, font=serif_i)
            d.text((M + 20, y), ln, font=serif_i, fill=WHITE)
            d.line([M + 20, y + 62, M + 20 + w_, y + 62], fill=GOLD, width=5)
            y += 92
    return im

@stage("s0c")
def _():
    im, d = base()
    d.text((M, 150), "The DBQ", font=sans_b, fill=GOLD)
    paper_card(d, M, 300, PROMPT, "The prompt")
    y = 1150
    d.text((M, y), "Seven documents:", font=sans, fill=DIM); y += 70
    for doc in ["Washington's inaugural address", "Jefferson vs. Hamilton on the Bank",
                "Washington vs. the Whiskey rebels", "The Sedition Act", "The Kentucky Resolutions"]:
        d.text((M + 30, y), "\u00b7  " + doc, font=sans_s, fill=WHITE); y += 52
    return im

@stage("s0d")
def _():
    im, d = base()
    d.text((M, 150), "The DBQ", font=sans_b, fill=GOLD)
    paper_card(d, M, 300, PROMPT, "The prompt")
    y = 1150
    d.text((M, y), "Seven documents:", font=sans, fill=DIM); y += 70
    for doc in ["Washington's inaugural address", "Jefferson vs. Hamilton on the Bank",
                "Washington vs. the Whiskey rebels", "The Sedition Act", "The Kentucky Resolutions"]:
        d.text((M + 30, y), "\u00b7  " + doc, font=sans_s, fill=WHITE); y += 52
    stamp_on(im, W//2, 1650, "MODEL ESSAY \u00b7 written for 4/7", GOLD, 44)
    return im

@stage("s1a")
def _():
    im, d = base()
    header(d, "THE VERDICT")
    bottom, _ = paper_card(d, M, 300, P1, "The essay \u00b7 paragraph 1")
    dim_rect(im, M, 300, W - 2 * M, bottom - 300)
    stamp_on(im, W//2, 950, "4 / 7", GOLD, 150)
    note_strip(ImageDraw.Draw(im), bottom + 60, "Let's find the three missing points.", GOLD)
    return im

@stage("s2a")
def _():
    im, d = base()
    header(d, "THESIS + CONTEXTUALIZATION", "0 / 7")
    paper_card(d, M, 300, P1, "The essay \u00b7 paragraph 1")
    return im

@stage("s2b")
def _():
    im, d = base()
    header(d, "THESIS + CONTEXTUALIZATION", "1 / 7")
    bottom, sents = paper_card(d, M, 300, P1, "The essay \u00b7 paragraph 1")
    uline_sent(d, sents[0], GREEN)
    note_strip(d, bottom + 60, "+1 \u2014 describes a broader historical context.", GREEN)
    return im

@stage("s2c")
def _():
    im, d = base()
    header(d, "THESIS + CONTEXTUALIZATION", "2 / 7")
    bottom, sents = paper_card(d, M, 300, P1, "The essay \u00b7 paragraph 1")
    uline_sent(d, sents[0], GREEN)
    uline_sent(d, sents[3], GREEN)
    note_strip(d, bottom + 60, "+1 \u2014 responds to the prompt with a defensible thesis.", GREEN)
    return im

@stage("s3a")
def _():
    im, d = base()
    header(d, "EVIDENCE", "2 / 7")
    paper_card(d, M, 300, P2, "The essay \u00b7 paragraph 2")
    return im

@stage("s3b")
def _():
    im, d = base()
    header(d, "EVIDENCE", "3 / 7")
    bottom, sents = paper_card(d, M, 300, P2, "The essay \u00b7 paragraph 2")
    uline_sent(d, sents[3], GREEN)
    note_strip(d, bottom + 60, "+1 \u2014 supports the argument with a document.", GREEN)
    return im

@stage("s3c")
def _():
    im, d = base()
    header(d, "EVIDENCE", "3 / 7")
    bottom, sents = paper_card(d, M, 300, P2, "The essay \u00b7 paragraph 2")
    uline_sent(d, sents[3], GREEN)
    bx = sents[3]["box"]
    xmark_at(d, M + (W - 2 * M) - 52, (bx[1] + bx[3]) / 2, 26)
    note_strip(d, bottom + 60, "Second evidence point \u2014 never developed. Nothing more here.", RED)
    return im

@stage("s4a")
def _():
    im, d = base()
    header(d, "BEYOND THE DOCUMENTS", "3 / 7")
    paper_card(d, M, 300, P3, "The essay \u00b7 paragraph 3")
    return im

@stage("s4b")
def _():
    im, d = base()
    header(d, "BEYOND THE DOCUMENTS", "4 / 7")
    bottom, sents = paper_card(d, M, 300, P3, "The essay \u00b7 paragraph 3")
    uline_sent(d, sents[2], GREEN)
    uline_sent(d, sents[3], GREEN)
    note_strip(d, bottom + 60, "+1 \u2014 outside evidence that advances the argument.", GREEN)
    return im

@stage("s4c")
def _():
    im, d = base()
    header(d, "BEYOND THE DOCUMENTS", "4 / 7")
    bottom, sents = paper_card(d, M, 300, P3, "The essay \u00b7 paragraph 3")
    uline_sent(d, sents[2], GREEN)
    uline_sent(d, sents[3], GREEN)
    note_strip(d, bottom + 60, "States' rights via the Kentucky Resolutions \u2014 in no document.", GREEN)
    return im

@stage("s5a")
def _():
    im, d = base()
    header(d, "SOURCING", "4 / 7")
    paper_card(d, M, 300, QUOTE, "Doc. 4, quoted but not sourced")
    return im

@stage("s5b")
def _():
    im, d = base()
    header(d, "SOURCING", "4 / 7")
    bottom, sents = paper_card(d, M, 300, QUOTE, "Doc. 4, quoted but not sourced")
    note_strip(d, bottom + 60,
        "Sourcing asks: who wrote this, and why? Washington writes as a president "
        "defending federal authority \u2014 with every reason to paint the rebels as a threat.", GOLD)
    return im

@stage("s5c")
def _():
    im, d = base()
    header(d, "SOURCING", "4 / 7")
    bottom, sents = paper_card(d, M, 300, QUOTE, "Doc. 4, quoted but not sourced")
    uline_sent(d, sents[0], RED)
    stamp_on(im, W//2, bottom + 260, "NO SOURCING \u00b7 0/1", RED, 64)
    return im

@stage("s5d")
def _():
    im, d = base()
    header(d, "SOURCING", "4 / 7")
    bottom, sents = paper_card(d, M, 300, QUOTE, "Doc. 4, quoted but not sourced")
    uline_sent(d, sents[0], RED)
    y = bottom + 60
    d.rounded_rectangle([M, y, W - M, y + 330], 22, fill=NOTE_BG, outline=RED, width=3)
    d.text((M + 48, y + 40), "Hardest point on the exam", font=sans, fill=WHITE)
    d.text((M + 48, y + 130), "students averaged", font=sans_s, fill=DIM)
    d.text((M + 48, y + 185), "0.39 / 1", font=sans_b, fill=RED)
    d.text((W - 380, y + 200), "last year", font=sans_s, fill=DIM)
    return im

@stage("s6a")
def _():
    im, d = base()
    header(d, "COMPLEXITY", "4 / 7")
    paper_card(d, M, 300, P4, "The essay \u00b7 paragraph 4")
    return im

@stage("s6b")
def _():
    im, d = base()
    header(d, "COMPLEXITY", "4 / 7")
    bottom, sents = paper_card(d, M, 300, P4, "The essay \u00b7 paragraph 4")
    note_strip(d, bottom + 60, "One straight line: Federalists built unity, but at liberty's cost.", RED)
    return im

@stage("s6c")
def _():
    im, d = base()
    header(d, "COMPLEXITY", "4 / 7")
    bottom, sents = paper_card(d, M, 300, P4, "The essay \u00b7 paragraph 4")
    uline_sent(d, sents[0], RED); uline_sent(d, sents[1], RED)
    note_strip(d, bottom + 60, "No counterargument. No qualification. Nothing complicated.", RED)
    return im

@stage("s6d")
def _():
    im, d = base()
    header(d, "COMPLEXITY", "4 / 7")
    bottom, sents = paper_card(d, M, 300, P4, "The essay \u00b7 paragraph 4")
    uline_sent(d, sents[0], RED); uline_sent(d, sents[1], RED)
    stamp_on(im, W//2, bottom + 260, "COMPLEXITY \u00b7 0/1", RED, 64)
    return im

def tally_row(d, y, label, got, total):
    color = GREEN if got == total else (RED if got == 0 else GOLD)
    d.rounded_rectangle([M, y, W - M, y + 108], 18, fill=NOTE_BG)
    d.text((M + 40, y + 28), label, font=sans, fill=WHITE)
    t = f"{got}/{total}"
    bb = d.textbbox((0, 0), t, font=sans_b)
    tw = bb[2] - bb[0]
    mx = M + (W - 2 * M) - 52
    if got > 0 and not (total == 2 and got == 1):
        check_at(d, mx - tw - 70, y + 54, 24)
    elif got == 0:
        xmark_at(d, mx - tw - 70, y + 54, 24)
    d.text((mx - tw, y + 28), t, font=sans_b, fill=color)
    return y + 128

@stage("s7a")
def _():
    im, d = base()
    header(d, "FINAL TALLY", "4 / 7")
    y = 300
    d.text((M, y), "Points earned", font=sans, fill=GREEN); y += 80
    for label, got, total in [("Thesis", 1, 1), ("Contextualization", 1, 1),
                              ("Evidence", 1, 2), ("Beyond the documents", 1, 1)]:
        y = tally_row(d, y, label, got, total)
    return im

@stage("s7b")
def _():
    im, d = base()
    header(d, "FINAL TALLY", "4 / 7")
    y = 300
    d.text((M, y), "Points missed", font=sans, fill=RED); y += 80
    for label, got, total in [("Evidence, second half", 0, 1), ("Sourcing", 0, 1), ("Complexity", 0, 1)]:
        y = tally_row(d, y, label, got, total)
    return im

@stage("s7c")
def _():
    im, d = base()
    header(d, "THE FIX", "4 / 7")
    y = 300
    y = note_strip(d, y, "To reach 6/7: source one document \u2014 ask why its author wrote it.", GOLD) + 40
    y = note_strip(d, y, "And complicate the argument \u2014 qualify the thesis, answer the other side.", GOLD) + 40
    d.text((M, y + 20), "That is the skill this exam rewards.", font=serif_i, fill=WHITE)
    return im

if __name__ == "__main__":
    for name in sorted(STAGES):
        STAGES[name]().save(f"{OUT}/{name}.png")
    print(f"{len(STAGES)} stages rendered")
