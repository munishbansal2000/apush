#!/usr/bin/env python3
"""Assemble 10 APUSH practice tests (Fall 2026 CED format) — FINISHER pass.

Reads (fresh, no caches):
  build/reclaim-merged/staged/            819 MCQs, keys final
  build/tests/visual-pool/U*-enriched.json  visual adaptations
  build/tests/saq-bank/set-*.json          30 SAQ sets (Q1/Q2/Q3 each)
  build/reclaim-merged/staged/            DBQ + LEQ items
  build/tests/doc_images.json              non-text DBQ doc images (researcher output)

Writes (uncommitted):
  build/tests/test-01.json ... test-10.json
  build/tests/ANSWER_KEYS.md, VALIDATION.md, IMAGES-tests.md

Finisher decisions baked in:
  - DROP visuals (PD-US-no-notice edge): 5s24-ch23-mcq-05, 5s24-exam1-mcq-41,
    5s24-exam1-mcq-42 (1935 Huey Long photo) -> staged text, non-visual.
  - REWRITE stems (PD-US-no-notice edge): barrons-2027-pt1-04, barrons-2027-pt1-05
    (1936 Old Northwest map) -> text-premise stems, non-visual. Keys/options kept.
  - 3 new original-u1-* items: blind-derived keys matched (C/B/A) -> placed as U1 visuals.
  - 39 re-conceived visual items: staged text + adaptation image kept (fit verified).
  - test-02 LEQ: assignment file said barrons-2027/ch03-leq (nonexistent);
    matched by description to barrons-2027-pt2-leq (British imperial policy, U2/U3/U4/U5).
"""
import json, glob, os, random, collections

HOME = os.path.expanduser("~")
APUSH = os.path.join(HOME, "workspace/apush")
STAGED = os.path.join(APUSH, "build/reclaim-merged/staged")
TESTS = os.path.join(APUSH, "build/tests")
VPOOL = os.path.join(TESTS, "visual-pool")
SAQBANK = os.path.join(TESTS, "saq-bank")

QUOTAS = {"U1": 3, "U2": 4, "U3": 8, "U4": 7, "U5": 8, "U6": 7, "U7": 8, "U8": 7, "U9": 3}
VIS_TARGET = {"U1": 1, "U2": 2, "U3": 3, "U4": 3, "U5": 3, "U6": 3, "U7": 3, "U8": 3, "U9": 1}  # ~22/test

DROP_VISUAL = {"5s24-ch23-mcq-05", "5s24-exam1-mcq-41", "5s24-exam1-mcq-42"}
REWRITE_STEMS = {
    "barrons-2027-pt1-04": ("After the Revolution, several states asserted overlapping claims to western "
        "lands stretching to the Mississippi River; by 1787 those claims had been ceded to Congress, and the "
        "Old Northwest was organized as a national domain. This sequence of events best illustrates which of "
        "the following?"),
    "barrons-2027-pt1-05": ("The Northwest Ordinance's organization of the Old Northwest as a national domain "
        "contributed to later problems primarily because the ordinance did which of the following?"),
}

# ---------------- load staged MCQs ----------------
staged = {}
for f in glob.glob(os.path.join(STAGED, "**/*.json"), recursive=True):
    if "/_raw/" in f:
        continue
    d = json.load(open(f))
    items = d["items"] if isinstance(d, dict) and "items" in d else (d if isinstance(d, list) else [d])
    for it in items:
        if isinstance(it, dict) and it.get("type") == "mcq" and "stem" in it:
            staged[it["id"]] = it
assert len(staged) == 819, f"expected 819 staged MCQs, got {len(staged)}"

# ---------------- load visual pool ----------------
vis = {}
for u in ["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9"]:
    d = json.load(open(os.path.join(VPOOL, f"{u}-enriched.json")))
    for it in d["items"]:
        vis[it["id"]] = it

# ---------------- build placeable items ----------------
# placeable[id] = dict(stem, options, key, period, skill, reasoning, themes,
#                      visual: None | {image_url, image_caption, source_page, pd_rationale})
placeable = {}
visual_ids = set()
for iid, s in staged.items():
    if iid in DROP_VISUAL:
        stem = s["stem"]
    elif iid in REWRITE_STEMS:
        stem = REWRITE_STEMS[iid]
    else:
        stem = s["stem"]
    rec = {"id": iid, "stem": stem, "options": s["options"], "key": s["key"],
           "period": s.get("period"), "skill": s.get("skill"), "reasoning": s.get("reasoning"),
           "themes": s.get("themes", []), "visual": None, "key_status": "final",
           "reconceived": bool(s.get("reconceived"))}
    v = vis.get(iid)
    if v and iid not in DROP_VISUAL and iid not in REWRITE_STEMS:
        va = v.get("visual_adaptation") or {}
        add = va.get("stem_addendum")
        if add:
            rec["stem"] = stem + " " + add
        stim_repl = va.get("stimulus_replacement")
        rec["visual"] = {
            "image_url": v["image_url"],
            "image_caption": va.get("image_caption") or v.get("image_caption") or "",
            "source_page": v.get("source_page", ""),
            "pd_rationale": v.get("pd_rationale", ""),
            "stimulus_replacement": stim_repl,
            "text_stimulus": None if stim_repl else s.get("stimulus"),
        }
        rec["visual_adapted"] = True
        visual_ids.add(iid)
    placeable[iid] = rec

# 3 new U1 items (blind-verified, not in staged)
for iid in ["original-u1-waldseemuller-01", "original-u1-columbus-voyages-01", "original-u1-spanish-mission-01"]:
    v = vis[iid]
    va = v.get("visual_adaptation") or {}
    placeable[iid] = {"id": iid, "stem": v["stem"], "options": v["options"], "key": v["key"],
                      "period": "U1", "skill": v.get("skill"), "reasoning": v.get("reasoning"),
                      "themes": v.get("themes", []),
                      "visual": {"image_url": v["image_url"],
                                 "image_caption": va.get("image_caption") or "",
                                 "source_page": v.get("source_page", ""),
                                 "pd_rationale": v.get("pd_rationale", ""),
                                 "stimulus_replacement": None, "text_stimulus": None},
                      "visual_adapted": False, "key_status": "final",
                      "reconceived": False, "blind_verified": True}
    visual_ids.add(iid)

print(f"placeable: {len(placeable)} | visual: {len(visual_ids)}")
pc = collections.Counter(placeable[i]["period"] for i in placeable)
print("period totals:", dict(sorted(pc.items())))
vpc = collections.Counter(placeable[i]["period"] for i in visual_ids)
print("visual by period:", dict(sorted(vpc.items())))

# ---------------- select 55 per test ----------------
random.seed(20261001)
by_period = collections.defaultdict(list)
for iid, r in placeable.items():
    by_period[r["period"]].append(iid)
for p in by_period:
    random.shuffle(by_period[p])

used = set()
tests_mcq = []
# Deal visuals round-robin per period so every test lands ~21-22 visuals.
vis_dealt = {p: [] for p in QUOTAS}  # per period: list of 10 lists
for p in QUOTAS:
    vids = [i for i in by_period[p] if i in visual_ids]
    dealt = [[] for _ in range(10)]
    for k, vid in enumerate(vids):
        dealt[k % 10].append(vid)
    # rotate so the "short" tests differ per period (no test short twice)
    rot = {"U1": 0, "U2": 1, "U3": 3, "U4": 5, "U5": 7, "U6": 2, "U7": 6, "U8": 4, "U9": 8}[p]
    dealt = dealt[rot:] + dealt[:rot]
    vis_dealt[p] = dealt
for t in range(10):
    sel = []
    for p, q in QUOTAS.items():
        take_v = vis_dealt[p][t]
        pool_n = [i for i in by_period[p] if i not in visual_ids and i not in used]
        need_n = q - len(take_v)
        assert len(pool_n) >= need_n, f"test {t+1} period {p}: need {need_n} non-visual, have {len(pool_n)}"
        chosen = take_v + pool_n[:need_n]
        assert len(chosen) == q, f"test {t+1} {p}: short"
        sel.extend(chosen)
        used.update(chosen)
    # order: chronological, interleave visual/non-visual within period
    ordered = []
    for p in ["U1","U2","U3","U4","U5","U6","U7","U8","U9"]:
        items = [i for i in sel if placeable[i]["period"] == p]
        vv = [i for i in items if i in visual_ids]
        nn = [i for i in items if i not in visual_ids]
        seq = []
        # alternate starting with the larger group
        a, b = (vv, nn) if len(vv) >= len(nn) else (nn, vv)
        while a or b:
            if a: seq.append(a.pop(0))
            if b: seq.append(b.pop(0))
        ordered.extend(seq)
    # break any run of 3 visuals
    for _ in range(5):
        fixed = True
        for k in range(len(ordered) - 2):
            trio = ordered[k:k+3]
            if all(i in visual_ids for i in trio):
                # swap middle with nearest non-visual outside run
                for j in range(len(ordered)):
                    if ordered[j] not in visual_ids and not (k <= j <= k+2):
                        ordered[k+1], ordered[j] = ordered[j], ordered[k+1]
                        fixed = False
                        break
                break
        if fixed:
            break
    tests_mcq.append(ordered)

print("used total:", len(used))
for t, sel in enumerate(tests_mcq):
    nv = sum(1 for i in sel if i in visual_ids)
    print(f"test-{t+1:02d}: {len(sel)} mcq, {nv} visual")

json.dump({"tests_mcq": tests_mcq, "rewrite_stems": REWRITE_STEMS, "drop_visual": sorted(DROP_VISUAL)},
          open(os.path.join(TESTS, "_selection.json"), "w"), indent=1)
print("wrote _selection.json")
