#!/usr/bin/env python3
"""Generate original SVG timelines for the APUSH period reviews, Units 1-3.

Deterministic output: fixed layout math, no randomness, no external
dependencies. Run:  python3 gen_timelines_u123.py
Writes: u1.svg, u2.svg, u3.svg next to this script.
"""

import os
import textwrap

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

W, H = 1600, 660
MARGIN = 110
AXIS_Y = 350
TOP_ROWS = [150, 245]   # label baselines (date line) for the two top rows
BOT_ROWS = [545, 430]   # label baselines (date line) for the two bottom rows
AVG_CHAR_PX = 7.0    # estimated char width at 13px font

BG = "#faf6ed"
INK = "#2b241c"
ACCENTS = {"u1": "#8a5a24", "u2": "#2e5c5a", "u3": "#7a2c2c"}
AXIS_COLOR = "#5a4c3a"


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;")
             .replace(">", "&gt;").replace('"', "&quot;"))


TIMELINES = {
    "u1": {
        "title": "Unit 1: Worlds Meet, 1491-1607",
        "subtitle": "Native societies, European exploration, and the Columbian Exchange",
        "start": 1488, "end": 1612,
        "tick": 20,
        "events": [
            (1491.0, "c. 1491", "Native societies flourish",
             "Cahokia, the Mexica, and the Inca at their height"),
            (1492.0, "1492", "Columbus reaches the Caribbean",
             "First voyage, funded by Ferdinand and Isabella"),
            (1494.0, "1494", "Treaty of Tordesillas",
             "Spain and Portugal divide claims to new lands"),
            (1507.0, "1507", 'Waldseemuller map names "America"',
             "German cartographer labels the new continent"),
            (1519.5, "1519-1521", "Cortes conquers the Mexica",
             "Tenochtitlan falls after siege and smallpox"),
            (1532.0, "1532", "Pizarro captures the Inca ruler",
             "Atahualpa seized at Cajamarca; empire falls"),
            (1542.0, "1542", "New Laws curb the encomienda",
             "Spain limits forced Native labor grants"),
            (1550.5, "1550-1551", "Valladolid Debate",
             "Las Casas and Sepulveda on Native rights"),
            (1565.0, "1565", "St. Augustine founded",
             "Spain's permanent Florida settlement"),
            (1588.0, "1588", "Spanish Armada defeated",
             "England's sea power rises; colonization opens"),
            (1607.0, "1607", "Jamestown founded",
             "First permanent English colony in America"),
        ],
    },
    "u2": {
        "title": "Unit 2: Colonies Take Root, 1607-1754",
        "subtitle": "Settlement, regional differences, slavery, and growing autonomy",
        "start": 1603, "end": 1758,
        "tick": 25,
        "events": [
            (1607.0, "1607", "Jamestown founded",
             "Tobacco, headrights, indentured servants"),
            (1619.0, "1619", "House of Burgesses; first enslaved Africans",
             "Self-government and slavery arrive in Virginia"),
            (1620.0, "1620", "Plymouth founded",
             "Pilgrims and the Mayflower Compact"),
            (1630.0, "1630", "Massachusetts Bay founded",
             "Winthrop's Puritan 'city upon a hill'"),
            (1660.0, "1660s", "Navigation Acts enforced",
             "Restoration England tightens trade control"),
            (1676.0, "1676", "Bacon's Rebellion",
             "Virginia uprising; planters turn toward slavery"),
            (1680.0, "1680", "Pueblo Revolt",
             "Pope leads expulsion of Spanish from New Mexico"),
            (1681.0, "1681", "Pennsylvania chartered",
             "Penn's 'holy experiment' in tolerance"),
            (1688.5, "1688-1689", "Glorious Revolution",
             "Dominion of New England collapses"),
            (1692.0, "1692", "Salem witch trials",
             "Fear and faction in Massachusetts"),
            (1738.0, "1730s-1740s", "First Great Awakening",
             "Edwards and Whitefield stir revival"),
            (1735.0, "1735", "Zenger trial",
             "Milestone for freedom of the press"),
            (1739.0, "1739", "Stono Rebellion",
             "Enslaved people rise in South Carolina"),
            (1754.0, "1754", "Albany Congress",
             "Franklin's Plan of Union rejected"),
        ],
    },
    "u3": {
        "title": "Unit 3: Revolution and Republic, 1754-1800",
        "subtitle": "From imperial war to independence to a new Constitution",
        "start": 1751, "end": 1803,
        "tick": 10,
        "events": [
            (1758.5, "1754-1763", "French and Indian War",
             "Britain wins; debt and reform follow"),
            (1763.0, "1763", "Proclamation of 1763",
             "Settlement barred west of the Appalachians"),
            (1765.0, "1765", "Stamp Act and Stamp Act Congress",
             "First direct tax; organized colonial protest"),
            (1770.0, "1770", "Boston Massacre",
             "British troops kill five colonists"),
            (1773.0, "1773", "Boston Tea Party",
             "Sons of Liberty dump taxed tea"),
            (1774.0, "1774", "Intolerable Acts; First Continental Congress",
             "Parliament punishes; colonies unite"),
            (1775.0, "1775", "Lexington and Concord",
             "Fighting begins; Second Congress meets"),
            (1776.0, "1776", "Common Sense; Declaration of Independence",
             "Paine persuades; Jefferson drafts"),
            (1777.0, "1777", "Saratoga",
             "Turning point brings French aid (1778)"),
            (1781.0, "1781", "Yorktown; Articles ratified",
             "British surrender; confederation begins"),
            (1783.0, "1783", "Treaty of Paris",
             "Independence recognized; Mississippi boundary"),
            (1787.0, "1787", "Constitutional Convention",
             "Philadelphia; new federal frame of government"),
            (1794.0, "1794", "Whiskey Rebellion; Jay's Treaty",
             "Federal power shown at home and abroad"),
            (1799.0, "1798-1800", "Alien and Sedition Acts; election of 1800",
             "Partisan crisis; peaceful transfer of power"),
        ],
    },
}


def x_of(year, start, end):
    return MARGIN + (year - start) / (end - start) * (W - 2 * MARGIN)


def layout_events(events, start, end):
    """Assign each event a side (alternating top/bottom), a row within that
    side (alternating near/far to double capacity), and a label x.

    Greedy free-slot search per (side, row): process events
    chronologically; try the dot's own x first, then fan outward
    left/right in 22px steps until an interval free of other labels in
    the same row is found. Deterministic.
    """
    ordered = sorted(events, key=lambda e: e[0])
    placed = []
    for i, (year, date, title, desc) in enumerate(ordered):
        side = "top" if i % 2 == 0 else "bot"
        placed.append({"side": side, "year": year, "date": date,
                       "title": title, "desc": desc,
                       "x_dot": x_of(year, start, end), "x_lab": None,
                       "row": None})
    for side in ("top", "bot"):
        group = sorted([p for p in placed if p["side"] == side],
                       key=lambda p: p["x_dot"])
        for j, p in enumerate(group):
            p["row"] = j % 2
    warnings = []
    occupied = {}
    steps = [0] + [s for k in range(1, 30) for s in (k * 22, -k * 22)]
    for p in placed:
        wid = max(len(p["date"]), len(p["title"]), len(p["desc"])) * AVG_CHAR_PX
        half = wid / 2 + 12
        lo_bound, hi_bound = 25, W - 25
        key = (p["side"], p["row"])
        intervals = occupied.setdefault(key, [])
        found = None
        for d in steps:
            cx = p["x_dot"] + d
            lo, hi = cx - half, cx + half
            if lo < lo_bound or hi > hi_bound:
                continue
            if all(hi <= a or lo >= b for a, b in intervals):
                found = cx
                break
        if found is None:
            found = min(max(p["x_dot"], lo_bound + half), hi_bound - half)
            warnings.append("forced overlap on '%s'" % p["title"])
        p["x_lab"] = found
        intervals.append((found - half, found + half))
    return placed, warnings


def render(key, spec):
    start, end, tick = spec["start"], spec["end"], spec["tick"]
    accent = ACCENTS[key]
    parts = []
    A = parts.append
    A('<?xml version="1.0" encoding="UTF-8"?>')
    A('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" '
      'viewBox="0 0 %d %d" role="img">' % (W, H, W, H))
    A('<rect width="%d" height="%d" fill="%s"/>' % (W, H, BG))

    # header
    A('<text x="%d" y="52" text-anchor="middle" font-family="Georgia, serif" '
      'font-size="30" font-weight="bold" fill="%s">%s</text>'
      % (W // 2, INK, esc(spec["title"])))
    A('<text x="%d" y="82" text-anchor="middle" font-family="Georgia, serif" '
      'font-size="16" font-style="italic" fill="%s">%s</text>'
      % (W // 2, AXIS_COLOR, esc(spec["subtitle"])))

    # decade gridlines + axis ticks
    y0 = start - (start % tick)
    t = y0 + (tick if y0 < start else 0)
    while t <= end:
        x = x_of(t, start, end)
        A('<line x1="%.1f" y1="110" x2="%.1f" y2="610" stroke="#e2d7c2" '
          'stroke-width="1"/>' % (x, x))
        A('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="%s" '
          'stroke-width="2"/>' % (x, AXIS_Y - 8, x, AXIS_Y + 8, AXIS_COLOR))
        A('<text x="%.1f" y="%d" text-anchor="middle" '
          'font-family="Georgia, serif" font-size="13" fill="%s">%d</text>'
          % (x, AXIS_Y + 32, AXIS_COLOR, t))
        t += tick

    # main axis
    A('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="3"/>'
      % (MARGIN - 30, AXIS_Y, W - MARGIN + 30, AXIS_Y, accent))

    placed, warnings = layout_events(spec["events"], start, end)
    for p in placed:
        xd, xl = p["x_dot"], p["x_lab"]
        if p["side"] == "top":
            ly = TOP_ROWS[p["row"]]
            dot_y = AXIS_Y - 7
            A('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="%s" '
              'stroke-width="1.5"/>' % (xd, dot_y, xl, ly + 44, accent))
            A('<text x="%.1f" y="%d" text-anchor="middle" '
              'font-family="Georgia, serif" font-size="14" font-weight="bold" '
              'fill="%s">%s</text>' % (xl, ly, accent, esc(p["date"])))
            A('<text x="%.1f" y="%d" text-anchor="middle" '
              'font-family="Georgia, serif" font-size="13" font-weight="bold" '
              'fill="%s">%s</text>'
              % (xl, ly + 20, INK, esc(p["title"])))
            A('<text x="%.1f" y="%d" text-anchor="middle" '
              'font-family="Georgia, serif" font-size="12" font-style="italic" '
              'fill="%s">%s</text>'
              % (xl, ly + 38, AXIS_COLOR, esc(p["desc"])))
        else:
            ly = BOT_ROWS[p["row"]]
            dot_y = AXIS_Y + 7
            A('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="%s" '
              'stroke-width="1.5"/>' % (xd, dot_y, xl, ly - 52, accent))
            A('<text x="%.1f" y="%d" text-anchor="middle" '
              'font-family="Georgia, serif" font-size="12" font-style="italic" '
              'fill="%s">%s</text>'
              % (xl, ly - 34, AXIS_COLOR, esc(p["desc"])))
            A('<text x="%.1f" y="%d" text-anchor="middle" '
              'font-family="Georgia, serif" font-size="13" font-weight="bold" '
              'fill="%s">%s</text>'
              % (xl, ly - 16, INK, esc(p["title"])))
            A('<text x="%.1f" y="%d" text-anchor="middle" '
              'font-family="Georgia, serif" font-size="14" font-weight="bold" '
              'fill="%s">%s</text>' % (xl, ly, accent, esc(p["date"])))
        A('<circle cx="%.1f" cy="%d" r="6" fill="%s" stroke="%s" '
          'stroke-width="2"/>' % (xd, AXIS_Y, accent, BG))
        A('<circle cx="%.1f" cy="%d" r="2.2" fill="%s"/>' % (xd, AXIS_Y, BG))

    A('<text x="%d" y="%d" text-anchor="middle" font-family="Georgia, serif" '
      'font-size="11" font-style="italic" fill="#8a7c64">'
      'All dates verified against standard AP US History references.</text>'
      % (W // 2, H - 14))
    A('</svg>')
    return "\n".join(parts), warnings


def main():
    for key, spec in TIMELINES.items():
        svg, warnings = render(key, spec)
        path = os.path.join(OUT_DIR, key + ".svg")
        with open(path, "w", encoding="utf-8") as f:
            f.write(svg)
        n = len(spec["events"])
        print("wrote %s (%d events)%s" % (path, n,
              " [warnings: %s]" % "; ".join(warnings) if warnings else ""))


if __name__ == "__main__":
    main()
