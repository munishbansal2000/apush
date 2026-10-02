#!/usr/bin/env python3
"""Apply post-assembly fixes in order. Run after assemble_part2.py.

1. normalize_tags.py (normalization + heuristic inference)
2. tag_overrides.json (82 hand tags)
3. S&S swaps: test-01 (1->6), test-02 (2->6) via same-period non-visual swaps
4. reasoning touch-ups on swapped items
"""
import json, glob, os, subprocess, sys

T = os.path.expanduser("~/workspace/apush/build/tests")
APUSH = os.path.expanduser("~/workspace/apush")

subprocess.run([sys.executable, os.path.join(T, "normalize_tags.py")], check=True, cwd=APUSH)

# 2. hand overrides
ov = json.load(open(os.path.join(T, "tag_overrides.json")))
n = 0
for f in sorted(glob.glob(os.path.join(T, "test-*.json"))):
    d = json.load(open(f)); changed = False
    for m in d["section_1a"]["items"]:
        if m["id"] in ov:
            m["skill"], m["reasoning"] = ov[m["id"]]
            m["tag_source"] = "hand"; changed = True; n += 1
    if changed:
        json.dump(d, open(f, "w"), indent=1)
print("hand-tagged:", n)

# 3. S&S swaps
staged = {}
for f in glob.glob(os.path.join(APUSH, "build/reclaim-merged/staged/**/*.json"), recursive=True):
    if "/_raw/" in f:
        continue
    dd = json.load(open(f))
    items = dd["items"] if isinstance(dd, dict) and "items" in dd else (dd if isinstance(dd, list) else [dd])
    for it in items:
        if isinstance(it, dict) and it.get("type") == "mcq" and "stem" in it:
            staged[it["id"]] = it

def is_ss(s):
    return (s.get("skill") or "") in ("Sourcing & Situation", "Sourcing and Situation")

tests = {t: json.load(open(os.path.join(T, f"test-{t:02d}.json"))) for t in range(1, 11)}
used = {m["id"] for t in tests for m in tests[t]["section_1a"]["items"]}
unused = {p: [iid for iid, s in staged.items()
              if iid not in used and is_ss(s) and s.get("period") == p]
          for p in ["U1","U2","U3","U4","U5","U6","U7","U8","U9"]}
REASON_FIX = {"5s24-ch08-mcq-06": "Causation", "barrons-2027-pt1-20": "Comparison",
              "5s24-ch10-mcq-06": "Comparison", "barrons-2027-ch04-04": "Comparison"}
for t in (1, 2):
    d = tests[t]
    have = sum(1 for m in d["section_1a"]["items"] if m["skill"] == "Sourcing & Situation")
    cands = [m for m in d["section_1a"]["items"]
             if not m["visual"] and m["skill"] != "Sourcing & Situation" and unused.get(m["period"])]
    cands.sort(key=lambda m: 0 if m["skill"] == "Developments & Processes" else 1)
    for m in cands[:6 - have]:
        new_id = unused[m["period"]].pop(0)
        print(f"test-{t:02d}: swap out {m['id']} -> in {new_id} ({m['period']})")
        used.discard(m["id"]); used.add(new_id)
        s = staged[new_id]
        rs = (s.get("reasoning") or "")
        nm = {"id": new_id, "n": m["n"], "stem": s["stem"],
              "stimulus": ({"kind": "text", "text": s["stimulus"]} if s.get("stimulus") else None),
              "options": s["options"], "period": s.get("period"),
              "skill": "Sourcing & Situation",
              "reasoning": REASON_FIX.get(new_id,
                  "Causation" if rs.lower() == "causation" else "Comparison"),
              "themes": s.get("themes", []), "visual": False, "visual_adapted": False,
              "key_status": "final", "reconceived": bool(s.get("reconceived")),
              "tag_source": "swap-ss"}
        d["section_1a"]["items"][d["section_1a"]["items"].index(m)] = nm
    per = {}
    for m in d["section_1a"]["items"]:
        per.setdefault(m["period"], []).append(m)
    newl = []
    for p in ["U1","U2","U3","U4","U5","U6","U7","U8","U9"]:
        for m in per.get(p, []):
            m["n"] = len(newl) + 1; newl.append(m)
    d["section_1a"]["items"] = newl
    json.dump(d, open(os.path.join(T, f"test-{t:02d}.json"), "w"), indent=1)
    ss = sum(1 for m in newl if m["skill"] == "Sourcing & Situation")
    vv = sum(1 for m in newl if m["visual"])
    print(f"test-{t:02d}: S&S={ss}, visuals={vv}")
