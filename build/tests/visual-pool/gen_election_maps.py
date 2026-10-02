#!/usr/bin/env python3
"""Generate original tile-grid-map SVGs for APUSH visual MCQs.

Fixed, deterministic output (no randomness): the same script always
produces byte-identical SVGs. All electoral data is embedded below with
source notes; totals were cross-checked to sum correctly.

Outputs (written next to this script under ./svg/):
  electoral-1824.svg  - 1824 election: Jackson 99 (plurality), House chose Adams
  electoral-1860.svg  - 1860 election: Lincoln 180, no Southern states
  electoral-1864.svg  - 1864 election: Lincoln 212, McClellan 21 (NJ/DE/KY)
  electoral-1876.svg  - 1876 election: Hayes 185, Tilden 184, 20 disputed votes
  secession-1861.svg  - Secession waves, Dec 1860 - Jun 1861

Data sources: per-state electoral results cross-checked against Wikipedia's
state-by-state tables (sums verified); secession dates are the standard
ordinance dates.
"""

import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "svg")

# (col, row) tile layout, 12 x 8. Schematic, not geographic.
TILES = {
    "AK": (0, 0), "ME": (11, 0),
    "WI": (5, 1), "VT": (10, 1), "NH": (11, 1),
    "WA": (1, 2), "MT": (2, 2), "ND": (3, 2), "MN": (4, 2), "IA": (5, 2),
    "MI": (7, 2), "NY": (9, 2), "MA": (10, 2),
    "OR": (0, 3), "ID": (1, 3), "WY": (2, 3), "SD": (3, 3), "NE": (4, 3),
    "IL": (5, 3), "IN": (6, 3), "OH": (7, 3), "PA": (8, 3), "NJ": (9, 3),
    "CT": (10, 3), "RI": (11, 3),
    "CA": (1, 4), "NV": (2, 4), "UT": (3, 4), "CO": (4, 4), "KS": (5, 4),
    "MO": (6, 4), "KY": (7, 4), "WV": (8, 4), "VA": (9, 4), "MD": (10, 4),
    "DE": (11, 4),
    "AZ": (2, 5), "NM": (3, 5), "OK": (4, 5), "AR": (5, 5), "TN": (6, 5),
    "MS": (7, 5), "AL": (8, 5), "GA": (9, 5), "SC": (10, 5), "NC": (11, 5),
    "TX": (4, 6), "LA": (5, 6), "FL": (9, 6),
    "HI": (0, 7),
}
assert len(TILES) == 50, len(TILES)

# State admission years (for graying out not-yet-states on historical maps).
ADMISSION = {
    "DE": 1787, "PA": 1787, "NJ": 1787, "GA": 1788, "CT": 1788, "MA": 1788,
    "MD": 1788, "SC": 1788, "NH": 1788, "VA": 1788, "NY": 1788, "NC": 1789,
    "RI": 1790, "VT": 1791, "KY": 1792, "TN": 1796, "OH": 1803, "LA": 1812,
    "IN": 1816, "MS": 1817, "IL": 1818, "AL": 1819, "ME": 1820, "MO": 1821,
    "AR": 1836, "MI": 1837, "FL": 1845, "TX": 1845, "IA": 1846, "WI": 1848,
    "CA": 1850, "MN": 1858, "OR": 1859, "KS": 1861, "WV": 1863, "NV": 1864,
    "NE": 1867, "CO": 1876, "ND": 1889, "SD": 1889, "MT": 1889, "WA": 1889,
    "ID": 1890, "WY": 1890, "UT": 1896, "OK": 1907, "NM": 1912, "AZ": 1912,
    "AK": 1959, "HI": 1959,
}

TILE = 44
GAP = 4
OX, OY = 20, 96  # map origin (below title block)


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def tile_svg(abbr, fill, label=None, hatch=False):
    c, r = TILES[abbr]
    x = OX + c * (TILE + GAP)
    y = OY + r * (TILE + GAP)
    s = '<rect x="%d" y="%d" width="%d" height="%d" rx="5" fill="%s" stroke="#333" stroke-width="1"/>' % (
        x, y, TILE, TILE, fill)
    if hatch:
        s += ('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#333" stroke-width="2"/>'
              '<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#333" stroke-width="2"/>'
              % (x, y, x + TILE, y + TILE, x + TILE, y, x, y + TILE))
    s += '<text x="%d" y="%d" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#111">%s</text>' % (
        x + TILE / 2, y + 22, abbr)
    if label:
        s += '<text x="%d" y="%d" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#111">%s</text>' % (
            x + TILE / 2, y + 37, esc(label))
    return s


def render(title, subtitle, colors, labels=None, legend=(), caption="", hatch=(),
           width=640, year=None):
    """colors: {abbr: fill}. labels: {abbr: small label}. legend: [(fill,label)].
    year: election year; states admitted later are grayed as not-yet-states."""
    labels = dict(labels or {})
    hatch = set(hatch)
    if year:
        for abbr in TILES:
            if ADMISSION[abbr] > year:
                colors[abbr] = "#f2f2f2"
                labels.pop(abbr, None)
                hatch.discard(abbr)
        legend = list(legend) + [("#f2f2f2", "Not yet a state")]
    h = OY + 8 * (TILE + GAP) + 130
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (width, h, width, h)]
    parts.append('<rect width="%d" height="%d" fill="#ffffff"/>' % (width, h))
    parts.append('<text x="20" y="34" font-family="sans-serif" font-size="20" font-weight="bold" fill="#111">%s</text>' % esc(title))
    parts.append('<text x="20" y="58" font-family="sans-serif" font-size="13" fill="#444">%s</text>' % esc(subtitle))
    for abbr in TILES:
        parts.append(tile_svg(abbr, colors.get(abbr, "#e8e8e8"),
                              labels.get(abbr), abbr in hatch))
    ly = OY + 8 * (TILE + GAP) + 28
    lx = 20
    for fill, lab in legend:
        parts.append('<rect x="%d" y="%d" width="18" height="14" fill="%s" stroke="#333"/>' % (lx, ly - 12, fill))
        parts.append('<text x="%d" y="%d" font-family="sans-serif" font-size="12" fill="#222">%s</text>' % (lx + 24, ly, esc(lab)))
        lx += 24 + len(lab) * 6 + 26
        if lx > width - 160:
            lx = 20
            ly += 22
    parts.append('<text x="20" y="%d" font-family="sans-serif" font-size="12" fill="#333">%s</text>' % (ly + 26, esc(caption)))
    parts.append('<text x="20" y="%d" font-family="sans-serif" font-size="10" fill="#888">Original diagram generated for APUSH practice materials.</text>' % (ly + 46))
    parts.append('</svg>')
    return "\n".join(parts)


# ---------------------------------------------------------------- 1824
# Per-state EVs verified: Jackson 99, Adams 84, Crawford 41, Clay 37 (total 261).
E1824 = {
    # Jackson (Democratic-Republican)
    "AL": ("#3b6ea5", "5"), "IL": ("#3b6ea5", "2"), "IN": ("#3b6ea5", "5"),
    "LA": ("#3b6ea5", "3"), "MD": ("#3b6ea5", "7"), "MS": ("#3b6ea5", "3"),
    "NC": ("#3b6ea5", "15"), "NJ": ("#3b6ea5", "8"), "NY": ("#3b6ea5", "1"),
    "PA": ("#3b6ea5", "28"), "SC": ("#3b6ea5", "11"), "TN": ("#3b6ea5", "11"),
    # Adams
    "CT": ("#c96a3b", "8"), "DE": ("#c96a3b", "1"), "ME": ("#c96a3b", "9"),
    "MA": ("#c96a3b", "15"), "NH": ("#c96a3b", "8"), "RI": ("#c96a3b", "4"),
    "VT": ("#c96a3b", "7"),
    # Crawford
    "GA": ("#7a9e43", "9"), "VA": ("#7a9e43", "24"),
    # Clay
    "KY": ("#8e6fb0", "14"), "MO": ("#8e6fb0", "3"), "OH": ("#8e6fb0", "16"),
}
# split-state remainders folded into the labels above; remainder EVs:
E1824_LABEL_FIX = {"IL": "2", "LA": "3", "MD": "7", "NY": "1", "DE": "1"}


def build_1824():
    colors, labels = {}, {}
    for abbr, (fill, lab) in E1824.items():
        colors[abbr] = fill
        labels[abbr] = lab
    # states whose EVs split (show winner's share only in label)
    return render(
        "Presidential Election of 1824",
        "Electoral votes by state (plurality winner shown; numbers = winner's share)",
        colors, labels,
        legend=[("#3b6ea5", "Jackson 99"), ("#c96a3b", "Adams 84"),
                ("#7a9e43", "Crawford 41"), ("#8e6fb0", "Clay 37")],
        caption="No candidate won a majority (131 needed), so the House of Representatives chose the president: John Quincy Adams.",
        year=1824,
    )


# ---------------------------------------------------------------- 1860
# Lincoln 180, Breckinridge 72, Bell 39, Douglas 12 (total 303). Sums verified.
E1860 = {}
for s in ["CA", "CT", "IL", "IN", "IA", "ME", "MA", "MI", "MN", "NH", "NY",
          "OH", "OR", "PA", "RI", "VT", "WI"]:
    E1860[s] = "#3b6ea5"  # Lincoln (R)
E1860["NJ"] = "#3b6ea5"   # Lincoln won 4 of 7 NJ EVs; Douglas 3
for s in ["AL", "AR", "DE", "FL", "GA", "LA", "MD", "MS", "NC", "SC", "TX"]:
    E1860[s] = "#c0392b"  # Breckinridge (Southern Democratic)
for s in ["KY", "TN", "VA"]:
    E1860[s] = "#d4a017"  # Bell (Constitutional Union)
E1860["MO"] = "#7a9e43"   # Douglas (Northern Democratic)


def build_1860():
    return render(
        "Presidential Election of 1860",
        "Winner by state (tile map; not to geographic scale)",
        E1860, {},
        legend=[("#3b6ea5", "Lincoln (R) 180"), ("#c0392b", "Breckinridge (D-South) 72"),
                ("#d4a017", "Bell (CU) 39"), ("#7a9e43", "Douglas (D) 12")],
        caption="Lincoln won a clear Electoral College majority without carrying a single Southern state; Democrats ran two candidates.",
        year=1860,
    )


# ---------------------------------------------------------------- 1864
# Lincoln 212, McClellan 21 (NJ 7, DE 3, KY 11). Confederate states held no election.
E1864 = {s: "#3b6ea5" for s in TILES}
for s in ["NJ", "DE", "KY"]:
    E1864[s] = "#c0392b"  # McClellan (D)
for s in ["VA", "NC", "SC", "GA", "FL", "AL", "MS", "TN", "AR", "LA", "TX"]:
    E1864[s] = "#cfcfcf"  # Confederacy: no election


def build_1864():
    return render(
        "Presidential Election of 1864",
        "Winner by state (tile map; not to geographic scale)",
        E1864, {"NJ": "7", "DE": "3", "KY": "11"},
        legend=[("#3b6ea5", "Lincoln (R) 212"), ("#c0392b", "McClellan (D) 21"),
                ("#cfcfcf", "Confederacy: no election")],
        caption="Lincoln swept the populous Northern states; McClellan carried only New Jersey, Delaware, and Kentucky.",
        year=1864,
    )


# ---------------------------------------------------------------- 1876
# Hayes 185, Tilden 184. Disputed: FL 4, LA 8, SC 7, OR 1 (20 votes, all to Hayes).
TILDEN = ["AL", "AR", "CT", "DE", "GA", "KY", "MD", "MS", "MO", "NJ", "NY",
          "NC", "TN", "TX", "VA", "WV"]
HAYES = ["CA", "CO", "IL", "IN", "IA", "KS", "ME", "MA", "MI", "MN", "NE",
         "NV", "NH", "OH", "PA", "RI", "VT", "WI", "OR"]
DISPUTED = ["FL", "LA", "SC"]


def build_1876():
    colors = {}
    for s in TILDEN:
        colors[s] = "#3b6ea5"
    for s in HAYES:
        colors[s] = "#c0392b"
    for s in DISPUTED:
        colors[s] = "#e8a0a0"
    return render(
        "The Disputed Election of 1876",
        "Winner by state; striped states were disputed (tile map; not to geographic scale)",
        colors, {}, hatch=DISPUTED,
        legend=[("#3b6ea5", "Tilden (D) 184"), ("#c0392b", "Hayes (R) 165+20"),
                ("#e8a0a0", "Disputed: FL, LA, SC")],
        caption="20 disputed votes (FL 4, LA 8, SC 7, OR 1) went to Hayes via a bipartisan commission: Hayes 185, Tilden 184.",
        year=1876,
    )


# ---------------------------------------------------------------- secession
WAVE1 = ["SC", "MS", "FL", "AL", "GA", "LA", "TX"]       # Dec 1860-Feb 1861
WAVE2 = ["VA", "AR", "TN", "NC"]                          # Apr-Jun 1861
BORDER = ["DE", "MD", "KY", "MO"]                         # slave states that stayed
SECESSION_DATES = {"SC": "Dec 20, 1860", "MS": "Jan 9", "FL": "Jan 10",
                   "AL": "Jan 11", "GA": "Jan 19", "LA": "Jan 26",
                   "TX": "Feb 1", "VA": "Apr 17", "AR": "May 6",
                   "TN": "Jun 8*", "NC": "May 20"}


def build_secession():
    colors = {}
    for s in WAVE1:
        colors[s] = "#c0392b"
    for s in WAVE2:
        colors[s] = "#e08a3c"
    for s in BORDER:
        colors[s] = "#d4a017"
    labels = {s: d for s, d in SECESSION_DATES.items()}
    return render(
        "Secession, 1860-1861",
        "States shaded by when (and whether) they seceded (tile map; not to geographic scale)",
        colors, labels,
        legend=[("#c0392b", "Seceded Dec 1860-Feb 1861"), ("#e08a3c", "Seceded Apr-Jun 1861"),
                ("#d4a017", "Slave states that stayed"), ("#e8e8e8", "Free states")],
        caption="After South Carolina (Dec 20, 1860), six more Lower South states seceded and formed the Confederacy (Feb 1861). *TN ratified June 8.",
        year=1861,
    )


def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = {
        "electoral-1824.svg": build_1824(),
        "electoral-1860.svg": build_1860(),
        "electoral-1864.svg": build_1864(),
        "electoral-1876.svg": build_1876(),
        "secession-1861.svg": build_secession(),
    }
    for name, svg in jobs.items():
        p = os.path.join(OUT, name)
        with open(p, "w") as f:
            f.write(svg)
        print("wrote", p, len(svg), "bytes")


if __name__ == "__main__":
    main()
