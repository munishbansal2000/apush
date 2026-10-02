#!/usr/bin/env python3
"""Merge fresh-written drafts into per-gap bank files (post-audit).

Reads build/fresh-written/drafts/*/, skips _superseded/ and quarantined/,
normalizes bank fields, writes:
  build/fresh-written/u1-gaps.json, contextualization.json, u9-gaps.json,
  u6-gaps.json, misc-gaps.json, saq.json
Run: python3 merge_fresh.py
"""
import glob
import json
import os

REPO = "/home/hatch/workspace/apush"
DRAFTS = os.path.join(REPO, "build", "fresh-written", "drafts")
OUT = os.path.join(REPO, "build", "fresh-written")

GAPS = {
    "u1-gaps": ["u1-gaps/batch-*.json"],
    "contextualization": ["contextualization/batch-*.json"],
    "u9-gaps": ["u9-gaps/mcq-batch-*.json", "u9-gaps/deindust-batch-*.json"],
    "u6-gaps": ["u6-gaps/mcq-batch-*.json"],
    "misc-gaps": ["misc-gaps/mcq-batch-*.json"],
}


def normalize(q):
    q = dict(q)
    q["format"] = "new"
    q["source_type"] = "original"
    q["reconceived"] = False
    q.setdefault("stream", "drill")
    st = q.get("stimulus")
    if isinstance(st, dict) and st.get("kind") == "chart":
        st["chart_image"] = f"charts/{q['id']}.png"
    # ensure option_explanations keys are A-D
    oe = q.get("option_explanations") or {}
    q["option_explanations"] = {k: oe.get(k, "") for k in ["A", "B", "C", "D"]}
    return q


def main():
    seen = set()
    totals = {}
    for gap, patterns in GAPS.items():
        items = []
        for pat in patterns:
            for p in sorted(glob.glob(os.path.join(DRAFTS, pat))):
                for q in json.load(open(p))["items"]:
                    assert q["id"] not in seen, f"duplicate id {q['id']}"
                    seen.add(q["id"])
                    assert q["type"] == "mcq", q["id"]
                    items.append(normalize(q))
        out = os.path.join(OUT, f"{gap}.json")
        json.dump({"items": items}, open(out, "w"), indent=1, ensure_ascii=False)
        totals[gap] = len(items)
        print(f"{gap}: {len(items)}")
    # SAQs
    saqs = []
    for p in sorted(glob.glob(os.path.join(DRAFTS, "*/saq-batch-*.json"))):
        for q in json.load(open(p))["items"]:
            assert q["id"] not in seen, f"duplicate id {q['id']}"
            seen.add(q["id"])
            q = dict(q)
            q["format"] = "new"
            q["source_type"] = "original"
            q.setdefault("stream", "drill")
            saqs.append(q)
    json.dump({"items": saqs},
              open(os.path.join(OUT, "saq.json"), "w"), indent=1, ensure_ascii=False)
    print(f"saq: {len(saqs)}")
    print(f"TOTAL: {sum(totals.values())} mcq + {len(saqs)} saq")


if __name__ == "__main__":
    main()
