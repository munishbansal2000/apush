#!/usr/bin/env python3
"""Generate the 4 original SVG graphics needed by the SAQ bank Q3 stimuli.

Fixed-seed, deterministic: no randomness anywhere. All numbers are copied
verbatim from the SAQ stimulus text they illustrate (see build/tests/saq-bank).
Run: python3 make_saq_svgs.py   (writes 4 .svg files into this directory)
"""
import os
import random

random.seed(20261001)  # fixed seed; outputs are fully deterministic
OUT = os.path.dirname(os.path.abspath(__file__))

# Every class carries an explicit fill (some renderers drop text that relies
# on the default fill). A white background rect is drawn first so the
# graphics are self-contained on any page background.
CSS = ("<style>text{font-family:Georgia,'Times New Roman',serif;}"
       ".t{font-size:20px;font-weight:bold;fill:#111111;}"
       ".l{font-size:15px;fill:#111111;}"
       ".s{font-size:13px;fill:#333333;}"
       ".n{font-size:15px;font-weight:bold;fill:#111111;}"
       ".hs{font-size:13px;fill:#ffffff;}</style>")


def write(name, body, w, h):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
           f'viewBox="0 0 {w} {h}">' + CSS +
           f'<rect x="0" y="0" width="{w}" height="{h}" fill="#ffffff"/>' +
           body + "</svg>")
    with open(f"{OUT}/{name}", "w", encoding="utf-8") as f:
        f.write(svg)
    print("wrote", name)


def arrow(x1, y1, x2, y2, label, lx, ly, color="#1a5276"):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
            f'stroke-width="3" marker-end="url(#ah)"/>'
            f'<text x="{lx}" y="{ly}" class="l" text-anchor="middle" '
            f'fill="{color}">{label}</text>')


def triangular_trade():
    w, h = 760, 520
    b = ('<defs><marker id="ah" markerWidth="10" markerHeight="8" refX="9" '
         'refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 z" fill="#1a5276"/>'
         '</marker></defs>'
         '<text x="380" y="36" class="t" text-anchor="middle">'
         'The Triangular Trade, 1700s</text>'
         '<rect x="300" y="60" width="160" height="52" rx="8" fill="#d6eaf8" '
         'stroke="#1a5276" stroke-width="2"/>'
         '<text x="380" y="92" class="n" text-anchor="middle">New England</text>'
         '<rect x="60" y="380" width="160" height="52" rx="8" fill="#fdebd0" '
         'stroke="#935116" stroke-width="2"/>'
         '<text x="140" y="412" class="n" text-anchor="middle">West Africa</text>'
         '<rect x="540" y="380" width="160" height="52" rx="8" fill="#d5f5e3" '
         'stroke="#1e8449" stroke-width="2"/>'
         '<text x="620" y="412" class="n" text-anchor="middle">West Indies</text>'
         + arrow(300, 95, 160, 370, "rum and manufactured goods", 205, 235)
         + arrow(240, 406, 530, 406, "enslaved Africans (Middle Passage)",
                 385, 392, "#935116")
         + arrow(600, 370, 470, 100, "sugar and molasses", 560, 235, "#1e8449"))
    write("saq-set08-triangular-trade.svg", b, w, h)


def voter_table():
    w, h = 720, 360
    rows = [("1824", "about 27%"), ("1828", "about 58%"), ("1840", "about 80%")]
    b = ('<text x="360" y="36" class="t" text-anchor="middle">'
         'Voter Participation in Presidential Elections</text>'
         '<rect x="100" y="60" width="520" height="44" fill="#1a5276"/>'
         '<text x="230" y="88" class="hs" text-anchor="middle">Election</text>'
         '<text x="490" y="88" class="hs" text-anchor="middle">'
         'Eligible voters casting ballots</text>')
    y = 104
    for i, (yr, pct) in enumerate(rows):
        fill = "#eaf2f8" if i % 2 == 0 else "#ffffff"
        b += (f'<rect x="100" y="{y}" width="520" height="44" fill="{fill}" '
              f'stroke="#1a5276"/>'
              f'<text x="230" y="{y + 29}" class="n" text-anchor="middle">{yr}'
              f'</text><text x="490" y="{y + 29}" class="n" text-anchor="middle">'
              f'{pct}</text>')
        y += 44
    b += ('<text x="360" y="268" class="s" text-anchor="middle">The sharp rise '
          'coincides with the elimination of property qualifications</text>'
          '<text x="360" y="290" class="s" text-anchor="middle">for voting in '
          'most states during the Jacksonian era.</text>')
    write("saq-set12-voter-turnout.svg", b, w, h)


def timeline():
    w, h = 900, 320
    # (year, title, subtitle, lane): lane 1 = above, -1 = below, 2 = high above
    events = [(1803, "1803 - Louisiana Purchase",
               "France sells Louisiana to the U.S.", 1),
              (1807, "1807 - Embargo Act",
               "halts American trade with Britain and France", -1),
              (1812, "1812 - War of 1812", "with Britain, 1812-1815", 1),
              (1814, "1814 - Hartford Convention",
               "anti-war Federalists meet", -1),
              (1815, "1815 - New Orleans", "victory makes Jackson a hero", 2)]
    x0, x1, y = 120, 790, 190

    def x(yr):
        return x0 + (yr - 1803) / (1815 - 1803) * (x1 - x0)

    b = ('<text x="450" y="36" class="t" text-anchor="middle">'
         'The United States, 1803-1815</text>'
         f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="#1a5276" '
         'stroke-width="4"/>')
    for yr, title, sub, lane in events:
        xx = x(yr)
        if lane == 1:
            ty, sy = y - 52, y - 30
        elif lane == 2:
            ty, sy = y - 108, y - 86
        else:
            ty, sy = y + 72, y + 94
        tick = ty + 16 if lane > 0 else ty - 38
        b += (f'<circle cx="{xx}" cy="{y}" r="7" fill="#c0392b"/>'
              f'<line x1="{xx}" y1="{y}" x2="{xx}" y2="{tick}" '
              'stroke="#7f8c8d" stroke-width="1.5"/>'
              f'<text x="{xx}" y="{ty}" class="n" text-anchor="middle">{title}'
              f'</text>'
              f'<text x="{xx}" y="{sy}" class="s" text-anchor="middle">{sub}'
              '</text>')
    write("saq-set22-timeline-1803-1815.svg", b, w, h)


def bar_graph():
    w, h = 640, 420
    data = [("Union", 360000), ("Confederate", 260000)]
    maxv, bw, gap, x0, base = 400000, 110, 90, 175, 330
    b = ('<text x="320" y="36" class="t" text-anchor="middle">'
         'Military Deaths in the Civil War, 1861-1865</text>'
         f'<line x1="80" y1="{base}" x2="560" y2="{base}" stroke="#333333" '
         'stroke-width="2"/>')
    for i, (label, v) in enumerate(data):
        bh = v / maxv * 260
        xx = x0 + i * (bw + gap)
        color = "#2874a6" if i == 0 else "#943634"
        b += (f'<rect x="{xx}" y="{base - bh}" width="{bw}" height="{bh}" '
              f'fill="{color}"/>'
              f'<text x="{xx + bw / 2}" y="{base - bh - 12}" class="n" '
              f'text-anchor="middle">{v:,}</text>'
              f'<text x="{xx + bw / 2}" y="{base + 28}" class="l" '
              f'text-anchor="middle">{label}</text>')
    b += ('<text x="320" y="392" class="s" text-anchor="middle">Disease was the '
          'largest single cause of death in both armies, ahead of battle '
          'wounds.</text>')
    write("saq-set30-civil-war-deaths.svg", b, w, h)


if __name__ == "__main__":
    triangular_trade()
    voter_table()
    timeline()
    bar_graph()
