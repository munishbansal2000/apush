#!/usr/bin/env python3
"""Generate original SVG timelines for APUSH period reviews (U4, U5, U6).

Pure-stdlib, deterministic: no fonts, no image assets, no randomness.
Renders one horizontal timeline per period with dated event markers.
Run: python3 gen_timelines_u456.py   (writes u4.svg, u5.svg, u6.svg next to this script)
"""

import html
import os
import sys
import xml.etree.ElementTree as ET

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

WIDTH = 1240
PAD_L, PAD_R = 60, 40
AXIS_Y = 190
TOP_LABEL_Y = 60      # label block for above-axis events (two lines: year, text)
BOT_LABEL_Y = 300     # label block for below-axis events
TICK = 8

FONT = "Georgia, 'Times New Roman', serif"
SANS = "Helvetica, Arial, sans-serif"

TIMELINES = {
    "u4": {
        "title": "Unit 4 (1800-1848): Building a Market Democracy",
        "start": 1800,
        "end": 1848,
        "events": [
            (1803, "Louisiana Purchase", "Treaty signed Apr 30; $15M doubles the nation"),
            (1803, "Marbury v. Madison", "Court claims judicial review"),
            (1807, "Embargo Act", "Jefferson bans foreign trade; spurs U.S. manufacturing"),
            (1812, "War of 1812 begins", "Declared June 1812 against Britain"),
            (1815, "New Orleans / Ghent", "Treaty of Ghent (Dec 1814) ends war; Jackson wins Jan 1815"),
            (1819, "Florida acquired", "Adams-Onis treaty cedes Florida; Panic of 1819 hits"),
            (1820, "Missouri Compromise", "Maine free, Missouri slave; 36°30' line drawn"),
            (1823, "Monroe Doctrine", "Europe warned off the Americas"),
            (1825, "Erie Canal opens", "Links Great Lakes to the Atlantic; NYC booms"),
            (1828, "Jackson elected", "'Corrupt bargain' payback; mass democracy arrives"),
            (1830, "Indian Removal Act", "Authorizes forced relocation of eastern tribes"),
            (1832, "Bank veto / Nullification", "Jackson kills the Bank; S.C. nullifies the tariff"),
            (1836, "Specie Circular", "Gold-only land payments; helps trigger Panic of 1837"),
            (1848, "Seneca Falls", "First U.S. women's-rights convention"),
        ],
    },
    "u5": {
        "title": "Unit 5 (1844-1877): Expansion, Disunion, Reconstruction",
        "start": 1844,
        "end": 1877,
        "events": [
            (1844, "Polk elected", "Runs on expansion: Texas and Oregon"),
            (1845, "Texas annexed", "Admitted as a slave state, Dec 1845"),
            (1846, "Mexican War begins", "Declared May 1846; Wilmot Proviso ties slavery to new land"),
            (1848, "Treaty of Guadalupe Hidalgo", "Signed Feb 2; $15M buys the Mexican Cession; gold found in California"),
            (1850, "Compromise of 1850", "California free; strict Fugitive Slave Act"),
            (1854, "Kansas-Nebraska Act", "Popular sovereignty repeals the Missouri Compromise line"),
            (1857, "Dred Scott decision", "Court: Congress cannot ban slavery in territories"),
            (1860, "Lincoln elected", "Wins with ~40% of vote; South Carolina secedes Dec 1860"),
            (1861, "Fort Sumter", "Fired on Apr 12; Civil War begins"),
            (1863, "Emancipation / Gettysburg", "Proclamation takes effect Jan 1; Union wins at Gettysburg, July"),
            (1865, "War ends; 13th Amendment", "Lee surrenders Apr 9; slavery abolished Dec 1865"),
            (1868, "14th Amendment ratified", "Citizenship + equal protection; Johnson acquitted in impeachment"),
            (1870, "15th Amendment ratified", "Black male suffrage written into the Constitution"),
            (1877, "Compromise of 1877", "Federal troops leave the South; Reconstruction ends"),
        ],
    },
    "u6": {
        "title": "Unit 6 (1865-1898): The Gilded Age",
        "start": 1865,
        "end": 1898,
        "events": [
            (1869, "Transcontinental railroad", "Completed May 10 at Promontory, Utah"),
            (1873, "Panic of 1873", "Railroad crash opens a long depression"),
            (1876, "Little Bighorn / telephone", "Custer defeated; Bell patents the telephone"),
            (1877, "Railroad Strike / Munn", "First nationwide strike crushed; Court upholds grain-rate laws"),
            (1882, "Chinese Exclusion Act", "First federal law banning an immigrant group by nationality"),
            (1886, "Haymarket / AFL", "Bomb kills police at labor rally; craft-union federation founded"),
            (1887, "ICC / Dawes Act", "Railroads regulated; tribal lands broken into allotments"),
            (1890, "Sherman Act / Wounded Knee", "Antitrust law passed; Army kills ~300 Lakota, Dec 29"),
            (1892, "Homestead / Populists", "Strike crushed at Carnegie steel; Omaha Platform demands reforms"),
            (1893, "Panic of 1893", "Worst depression yet; unemployment soars"),
            (1894, "Pullman Strike", "Federal troops break the railroad strike; Debs jailed"),
            (1896, "Plessy / McKinley wins", "'Separate but equal' upheld; gold defeats free silver"),
            (1898, "Spanish-American War", "U.S. defeats Spain; takes overseas colonies"),
        ],
    },
}


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def render(key: str, spec: dict) -> str:
    events = sorted(spec["events"], key=lambda e: e[0])
    span = spec["end"] - spec["start"]

    def x_of(year: int) -> float:
        return PAD_L + (year - spec["start"]) / span * (WIDTH - PAD_L - PAD_R)

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="400" '
        f'viewBox="0 0 {WIDTH} 400" role="img" '
        f'aria-label="{esc(spec["title"])} timeline">',
        f'<rect x="0" y="0" width="{WIDTH}" height="400" fill="#faf8f2"/>',
        f'<text x="{WIDTH/2}" y="30" text-anchor="middle" font-family="{esc(FONT)}" '
        f'font-size="22" font-weight="bold" fill="#2b2b2b">{esc(spec["title"])}</text>',
        # axis
        f'<line x1="{PAD_L}" y1="{AXIS_Y}" x2="{WIDTH - PAD_R}" y2="{AXIS_Y}" '
        f'stroke="#555" stroke-width="2"/>',
        # endpoint year labels
        f'<text x="{PAD_L}" y="{AXIS_Y + 22}" text-anchor="middle" font-family="{esc(SANS)}" '
        f'font-size="13" fill="#555">{spec["start"]}</text>',
        f'<text x="{WIDTH - PAD_R}" y="{AXIS_Y + 22}" text-anchor="middle" font-family="{esc(SANS)}" '
        f'font-size="13" fill="#555">{spec["end"]}</text>',
    ]

    for i, (year, label, note) in enumerate(events):
        x = x_of(year)
        above = (i % 2 == 0)
        parts.append(
            f'<line x1="{x:.1f}" y1="{AXIS_Y}" x2="{x:.1f}" '
            f'y2="{AXIS_Y - TICK if above else AXIS_Y + TICK}" stroke="#8a6d3b" stroke-width="2.5"/>'
        )
        parts.append(
            f'<circle cx="{x:.1f}" cy="{AXIS_Y}" r="4.5" fill="#8a6d3b" stroke="#faf8f2" stroke-width="1.5"/>'
        )
        if above:
            y0 = TOP_LABEL_Y + (i // 2 % 2) * 52  # slight vertical stagger for dense years
            anchor_y = y0
            parts.append(
                f'<text x="{x:.1f}" y="{anchor_y}" text-anchor="middle" font-family="{esc(SANS)}" '
                f'font-size="15" font-weight="bold" fill="#2b2b2b">{year}</text>'
            )
            parts.append(
                f'<text x="{x:.1f}" y="{anchor_y + 18}" text-anchor="middle" font-family="{esc(SANS)}" '
                f'font-size="13" font-weight="bold" fill="#7a5c2e">{esc(label)}</text>'
            )
            parts.append(
                f'<text x="{x:.1f}" y="{anchor_y + 34}" text-anchor="middle" font-family="{esc(SANS)}" '
                f'font-size="11" fill="#555">{esc(note)}</text>'
            )
            parts.append(
                f'<line x1="{x:.1f}" y1="{anchor_y + 40}" x2="{x:.1f}" y2="{AXIS_Y - TICK}" '
                f'stroke="#bbb" stroke-width="1" stroke-dasharray="3,3"/>'
            )
        else:
            y0 = BOT_LABEL_Y - (i // 2 % 2) * 52
            parts.append(
                f'<text x="{x:.1f}" y="{y0}" text-anchor="middle" font-family="{esc(SANS)}" '
                f'font-size="15" font-weight="bold" fill="#2b2b2b">{year}</text>'
            )
            parts.append(
                f'<text x="{x:.1f}" y="{y0 + 18}" text-anchor="middle" font-family="{esc(SANS)}" '
                f'font-size="13" font-weight="bold" fill="#7a5c2e">{esc(label)}</text>'
            )
            parts.append(
                f'<text x="{x:.1f}" y="{y0 + 34}" text-anchor="middle" font-family="{esc(SANS)}" '
                f'font-size="11" fill="#555">{esc(note)}</text>'
            )
            parts.append(
                f'<line x1="{x:.1f}" y1="{AXIS_Y + TICK}" x2="{x:.1f}" y2="{y0 - 8}" '
                f'stroke="#bbb" stroke-width="1" stroke-dasharray="3,3"/>'
            )

    parts.append("</svg>")
    return "\n".join(parts)


def main() -> int:
    for key, spec in TIMELINES.items():
        n = len(spec["events"])
        assert 10 <= n <= 14, f"{key}: {n} events, need 10-14"
        years = [e[0] for e in spec["events"]]
        assert all(spec["start"] <= y <= spec["end"] for y in years), f"{key}: event out of range"
        svg = render(key, spec)
        # well-formedness check
        ET.fromstring(svg)
        path = os.path.join(OUT_DIR, f"{key}.svg")
        with open(path, "w", encoding="utf-8") as f:
            f.write(svg + "\n")
        print(f"wrote {path} ({n} events)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
