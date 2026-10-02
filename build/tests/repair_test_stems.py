#!/usr/bin/env python3
"""Repair test JSONs: strip image-caption sentences that got merged into stems
during test assembly, and fix two stems that lost their question mark.

Each repair is an explicit old->new mapping (no heuristics). Run:
  python3 repair_test_stems.py          # dry run, shows diffs
  python3 repair_test_stems.py --apply   # writes the 10 test JSONs
"""
import json
import sys

REPO = "/home/hatch/workspace/apush"

# (test_file, item_id, old_stem, new_stem)
REPAIRS = [
    ("build/tests/test-01.json", "pr25e-drill-mcq-q03",
     "The speaker above would be most associated with which of the following social or political movements? The 1857 engraving above shows the speaker, George Whitefield, preaching to a crowd.",
     "The speaker above would be most associated with which of the following social or political movements?"),
    ("build/tests/test-06.json", "barrons-2027-ch03-01",
     "According to the passage, which of the following most directly explains why Spain's colonial wealth failed to produce domestic economic growth? The 1553 woodcut above shows the silver mines of Potosi \u2014 the Andean bullion source described in the passage.",
     "According to the passage, which of the following most directly explains why Spain's colonial wealth failed to produce domestic economic growth?"),
    ("build/tests/test-06.json", "barrons-2027-pt2-49",
     "The broader movement Edwards belonged to changed colonial society by The 1852 image above shows a revival meeting with mass outdoor preaching \u2014 the tradition of the movement Edwards belonged to.",
     "The broader movement Edwards belonged to changed colonial society by which of the following?"),
    ("build/tests/test-06.json", "barrons-2027-pt1-43",
     "The pamphlet's denunciation of Quaker officials as 'friends of savages' best reveals which of the following about its authors? The 1764 print above shows the Paxton Boys' march on Philadelphia described in the passage.",
     "The pamphlet's denunciation of Quaker officials as 'friends of savages' best reveals which of the following about its authors?"),
    ("build/tests/test-07.json", "barrons-2027-ch03-03",
     "In the 1540s, Spanish critics of forced indigenous labor \u2014 including the Dominican friar Bartolome de Las Casas \u2014 helped bring about which of the following changes? The 1598 de Bry engraving above, illustrating Las Casas's denunciation of Spanish cruelty, shows the criticism that helped produce the New Laws.",
     "In the 1540s, Spanish critics of forced indigenous labor \u2014 including the Dominican friar Bartolome de Las Casas \u2014 helped bring about which of the following changes?"),
    ("build/tests/test-08.json", "5s24-exam1-mcq-36",
     "The conquest Prescott described was facilitated most decisively by The Florentine Codex image above (c. 1585) shows smallpox victims \u2014 the epidemic-disease factor named in the keyed answer.",
     "The conquest Prescott described was facilitated most decisively by which of the following?"),
    ("build/tests/test-08.json", "pr25e-test2-q02",
     "Which of the following groups would most likely support the principles expressed in the passage above? Halsall's 1882 painting above shows the Mayflower in Plymouth Harbor \u2014 the Separatists' arrival.",
     "Which of the following groups would most likely support the principles expressed in the passage above?"),
    ("build/tests/test-08.json", "barrons-2027-ch05-02",
     "The Royal Proclamation of 1763 most directly contributed to which of the following? The c. 1911 map above shows the British colonies and the Proclamation of 1763 boundary line west of the Appalachians.",
     "The Royal Proclamation of 1763 most directly contributed to which of the following?"),
    ("build/tests/test-09.json", "5s24-ch06-mcq-06",
     "The fact that this letter was addressed to Charles V best helps explain which feature of the document? The image above, from the Lienzo de Tlaxcala, shows Cortes introducing Christianity \u2014 the 'church' half of the loyal service to crown and church that the letter performs for its royal addressee.",
     "The fact that this letter was addressed to Charles V best helps explain which feature of the document?"),
    ("build/tests/test-02.json", "barrons-2027-ch05-06",
     "The cartoon's hope that the imperial crisis could still be resolved peacefully was most similarly expressed in which of the following? The cartoon above is the companion to Franklin's 'Magna Britannia: Her Colonies Reduc'd' (1768).",
     "The cartoon's hope that the imperial crisis could still be resolved peacefully was most similarly expressed in which of the following?"),
    ("build/tests/test-03.json", "barrons-2027-ch05-05",
     "Franklin most likely intended this cartoon for which audience? The cartoon above is the companion to Franklin's 'Magna Britannia: Her Colonies Reduc'd' (1768).",
     "Franklin most likely intended this cartoon for which audience?"),
    ("build/tests/test-02.json", "5s24-ch07-mcq-01",
     "Which European colonists maintained the most cooperative relations with Native Americans? Bellin's 1744 map above shows the extent of New France in North America.",
     "Which European colonists maintained the most cooperative relations with Native Americans?"),
    ("build/tests/test-03.json", "5s24-ch03-mcq-23",
     "Smith's narrative of capture and rescue best illustrates which early colonial pattern? Smith's 1612 map above shows the Chesapeake world he described in his account.",
     "Smith's narrative of capture and rescue best illustrates which early colonial pattern?"),
    ("build/tests/test-05.json", "5s24-exam2-mcq-45",
     "Which of the following best describes the colony of Pennsylvania? Holme's 1687 map above shows William Penn's planned colony of Pennsylvania.",
     "Which of the following best describes the colony of Pennsylvania?"),
]


def main():
    apply = "--apply" in sys.argv
    by_file = {}
    for f, iid, old, new in REPAIRS:
        by_file.setdefault(f, []).append((iid, old, new))
    for f, reps in by_file.items():
        t = json.load(open(f"{REPO}/{f}"))
        items = {q["id"]: q for q in t["section_1a"]["items"]}
        for iid, old, new in reps:
            q = items[iid]
            status = "OK " if q["stem"] == old else "MISMATCH"
            print(f"{status} {f[-11:-5]} {iid}")
            if q["stem"] != old:
                print("  disk:", q["stem"][:150])
                continue
            if apply:
                q["stem"] = new
        if apply:
            json.dump(t, open(f"{REPO}/{f}", "w"), indent=1, ensure_ascii=False)
            print(f"  wrote {f}")
    print("dry run — pass --apply to write" if not apply else "applied")


if __name__ == "__main__":
    main()
