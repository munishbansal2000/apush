#!/usr/bin/env python3
"""Generate original SVG non-text documents for DBQ sections.

Outputs (deterministic, no randomness):
  dbq/dbq-latin-america-cartoon.svg  - original 1900s-style cartoon for
      5s24-exam1-dbq doc 4 ("The Full Dinner Pail": Uncle Sam banquet).
  dbq/dbq-1940-census-table.svg     - 1940 Census Bureau population table
      for dbq-test2 doc 6 (federal figures; original presentation).

Both are generated-original works: every line, label, and number is drawn
by this script. Census figures are U.S. federal facts (public domain).
"""
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dbq")
os.makedirs(OUT, exist_ok=True)


def cartoon_svg():
    # Simple flat 1900s-magazine-cartoon idiom: bold outlines, labels.
    W, H = 760, 520
    parts = []
    a = parts.append
    a(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
    a('<rect x="0" y="0" width="760" height="520" fill="#fdfbf4"/>')
    a('<rect x="8" y="8" width="744" height="504" fill="none" stroke="#222" stroke-width="4"/>')
    a('<text x="380" y="46" text-anchor="middle" font-family="Georgia,serif" font-size="26" font-weight="bold" fill="#222">The Full Dinner Pail</text>')
    a('<text x="380" y="70" text-anchor="middle" font-family="Georgia,serif" font-size="13" font-style="italic" fill="#444">An original cartoon in the idiom of early-1900s American political satire</text>')

    # Banquet table
    a('<rect x="120" y="300" width="520" height="26" fill="#8a5a2b" stroke="#222" stroke-width="3"/>')
    a('<rect x="140" y="326" width="18" height="110" fill="#6e4520" stroke="#222" stroke-width="2"/>')
    a('<rect x="602" y="326" width="18" height="110" fill="#6e4520" stroke="#222" stroke-width="2"/>')
    # Tablecloth edge
    a('<rect x="120" y="300" width="520" height="10" fill="#f3ead2" stroke="#222" stroke-width="2"/>')

    # Dishes on the table: Cuba, Puerto Rico, Panama, Nicaragua
    dishes = [("Cuba", 200), ("Puerto Rico", 320), ("Panama", 440), ("Nicaragua", 560)]
    for label, cx in dishes:
        a(f'<ellipse cx="{cx}" cy="282" rx="52" ry="20" fill="#e8e2d0" stroke="#222" stroke-width="3"/>')
        a(f'<ellipse cx="{cx}" cy="276" rx="34" ry="11" fill="#c98f4e" stroke="#222" stroke-width="2"/>')
        a(f'<text x="{cx}" y="248" text-anchor="middle" font-family="Georgia,serif" font-size="15" font-weight="bold" fill="#222">{label}</text>')

    # Uncle Sam seated left, top hat
    a('<rect x="36" y="150" width="52" height="60" fill="#2b4d9c" stroke="#222" stroke-width="3"/>')  # hat
    a('<rect x="36" y="196" width="52" height="14" fill="#c33" stroke="#222" stroke-width="2"/>')      # hat band
    a('<circle cx="62" cy="236" r="26" fill="#f2c9a0" stroke="#222" stroke-width="3"/>')               # head
    a('<rect x="36" y="262" width="52" height="70" fill="#2b4d9c" stroke="#222" stroke-width="3"/>')   # torso
    a('<text x="62" y="360" text-anchor="middle" font-family="Georgia,serif" font-size="14" font-weight="bold" fill="#222">Uncle Sam</text>')

    # U.S. investor carving the roast, right side
    a('<circle cx="688" cy="236" r="26" fill="#f2c9a0" stroke="#222" stroke-width="3"/>')
    a('<rect x="662" y="262" width="52" height="70" fill="#333" stroke="#222" stroke-width="3"/>')
    a('<rect x="640" y="286" width="34" height="8" fill="#999" stroke="#222" stroke-width="2" transform="rotate(-24 640 286)"/>')  # carving knife
    a('<text x="688" y="360" text-anchor="middle" font-family="Georgia,serif" font-size="14" font-weight="bold" fill="#222">U.S. investor</text>')
    a('<text x="688" y="378" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-style="italic" fill="#444">carves the roast</text>')

    # Two Marine waiters standing by
    for cx, lx in [(150, 0), (610, 0)]:
        a(f'<circle cx="{cx}" cy="420" r="18" fill="#f2c9a0" stroke="#222" stroke-width="3"/>')
        a(f'<rect x="{cx-20}" y="438" width="40" height="52" fill="#3a6b35" stroke="#222" stroke-width="3"/>')
    a('<text x="150" y="414" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-weight="bold" fill="#222">U.S. Marines</text>')
    a('<text x="610" y="414" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-weight="bold" fill="#222">stand ready</text>')

    a('<text x="380" y="492" text-anchor="middle" font-family="Georgia,serif" font-size="13" font-style="italic" fill="#444">American prosperity, fed by economic dominance over Latin America</text>')
    a('</svg>')
    return "\n".join(parts)


def census_table_svg():
    rows = [
        ("Philippines", "16,356,000"),
        ("Puerto Rico", "1,869,255"),
        ("Hawaii", "423,330"),
        ("Alaska", "72,524"),
        ("Panama Canal Zone", "51,827"),
        ("Guam", "22,290"),
        ("Virgin Islands", "24,889"),
        ("American Samoa", "12,908"),
    ]
    W = 640
    row_h = 34
    top = 96
    H = top + (len(rows) + 1) * row_h + 74
    p = []
    a = p.append
    a(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
    a(f'<rect x="0" y="0" width="{W}" height="{H}" fill="#ffffff"/>')
    a('<rect x="6" y="6" width="628" height="%d" fill="none" stroke="#222" stroke-width="3"/>' % (H - 12))
    a('<text x="320" y="36" text-anchor="middle" font-family="Georgia,serif" font-size="17" font-weight="bold" fill="#111">Population of the United States and Its Territories and Possessions</text>')
    a('<text x="320" y="60" text-anchor="middle" font-family="Georgia,serif" font-size="14" fill="#333">U.S. Census Bureau, 1940 (selected figures)</text>')
    # header
    y = top
    a(f'<rect x="40" y="{y}" width="560" height="{row_h}" fill="#dfe6ee" stroke="#222" stroke-width="2"/>')
    a(f'<text x="60" y="{y+23}" font-family="Georgia,serif" font-size="15" font-weight="bold" fill="#111">Territory / Possession</text>')
    a(f'<text x="580" y="{y+23}" text-anchor="end" font-family="Georgia,serif" font-size="15" font-weight="bold" fill="#111">1940 Population</text>')
    for i, (name, pop) in enumerate(rows):
        y = top + (i + 1) * row_h
        fill = "#f4f6f9" if i % 2 == 0 else "#ffffff"
        a(f'<rect x="40" y="{y}" width="560" height="{row_h}" fill="{fill}" stroke="#222" stroke-width="2"/>')
        a(f'<text x="60" y="{y+23}" font-family="Georgia,serif" font-size="14" fill="#111">{name}</text>')
        a(f'<text x="580" y="{y+23}" text-anchor="end" font-family="Georgia,serif" font-size="14" fill="#111">{pop}</text>')
    y0 = top + (len(rows) + 1) * row_h + 8
    a(f'<text x="40" y="{y0+18}" font-family="Georgia,serif" font-size="12" font-style="italic" fill="#333">Territories and possessions exclusive of the Philippines totaled 2,477,023 in 1940,</text>')
    a(f'<text x="40" y="{y0+36}" font-family="Georgia,serif" font-size="12" font-style="italic" fill="#333">up from 1,680,202 in 1920.</text>')
    a('</svg>')
    return "\n".join(p)


if __name__ == "__main__":
    with open(os.path.join(OUT, "dbq-latin-america-cartoon.svg"), "w") as f:
        f.write(cartoon_svg())
    with open(os.path.join(OUT, "dbq-1940-census-table.svg"), "w") as f:
        f.write(census_table_svg())
    print("wrote", OUT)
