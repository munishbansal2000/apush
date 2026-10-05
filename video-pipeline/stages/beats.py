"""Stage: beats.

Loads the episode beat sheet (beats.json), validates it, and resolves every
beat boundary to absolute seconds using work/timings.json.

Time spec forms:
  {"time": 12.5}                        literal seconds
  {"tail": true}                        computed_total (covers the outro music tail)
  {"turn": N, "at": "start"|"end"}      turn boundary
  {"turn": N, "split": [parts, k]}      k-th cut of parts equal cuts (k=0 -> start)
  {"turn": N, "onset": true}            turn start + speech onset (voice actually starts)

Validation (fail-closed, deterministic):
- first beat starts at 0, last beat ends at cfg "total"
- beats are contiguous: end[i] == start[i+1] within 0.05s
- every kb beat names an image present in images.json
- every beat has a known kind

Writes: <episode>/work/beats_resolved.json
"""
import json
import os

TOL = 0.05
KINDS = {"kb", "vid", "chain", "map"}


def resolve(spec, turns, computed_total):
    if "time" in spec:
        return float(spec["time"])
    if spec.get("tail"):
        return computed_total
    n = spec["turn"]
    t = turns[n]
    if spec.get("onset"):
        return round(t["start"] + t["onset"], 3)
    if "split" in spec:
        parts, k = spec["split"]
        return round(t["start"] + (t["end"] - t["start"]) * k / parts, 3)
    at = spec.get("at", "start")
    return t["start"] if at == "start" else t["end"]


def run(ep_dir, cfg):
    with open(os.path.join(ep_dir, "beats.json"), encoding="utf-8") as f:
        sheet = json.load(f)
    with open(os.path.join(ep_dir, "work", "timings.json"), encoding="utf-8") as f:
        tj = json.load(f)
    turns = tj["turns"]
    computed_total = tj["computed_total"]

    images = {}
    ipath = os.path.join(ep_dir, "images.json")
    if os.path.exists(ipath):
        with open(ipath, encoding="utf-8") as f:
            images = json.load(f).get("images", {})

    beats = sheet["beats"]
    resolved = []
    for b in beats:
        if b["kind"] not in KINDS:
            raise RuntimeError(f"beat {b['id']}: unknown kind {b['kind']}")
        s = resolve(b["start"], turns, computed_total)
        e = resolve(b["end"], turns, computed_total)
        if e - s <= 0:
            raise RuntimeError(f"beat {b['id']}: non-positive duration {e-s}")
        if b["kind"] == "kb" and b.get("image") not in images:
            raise RuntimeError(f"beat {b['id']}: image '{b.get('image')}' not in images.json")
        r = dict(b)
        r["start_s"] = s
        r["end_s"] = e
        r["dur"] = round(e - s, 3)
        resolved.append(r)

    if abs(resolved[0]["start_s"] - 0.0) > TOL:
        raise RuntimeError(f"first beat must start at 0, starts at {resolved[0]['start_s']}")
    total = cfg.get("total") or computed_total
    if abs(resolved[-1]["end_s"] - total) > 0.6:
        raise RuntimeError(f"last beat ends at {resolved[-1]['end_s']}, expected ~{total}")
    for a, b in zip(resolved, resolved[1:]):
        if abs(a["end_s"] - b["start_s"]) > TOL:
            raise RuntimeError(
                f"gap/overlap between {a['id']} (ends {a['end_s']}) and "
                f"{b['id']} (starts {b['start_s']})")

    out = os.path.join(ep_dir, "work", "beats_resolved.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"beats": resolved, "meta": {
            "unit": sheet.get("unit"), "episode_num": sheet.get("episode_num"),
            "subject": sheet.get("subject", ""), "tag": sheet.get("tag", "")}}, f, indent=1)
    if not sheet.get("total"):
        # record the deterministic total back into the beat sheet
        sheet["total"] = round(total, 1)
        with open(os.path.join(ep_dir, "beats.json"), "w", encoding="utf-8") as f:
            json.dump(sheet, f, indent=1, ensure_ascii=False)
        print(f"beats: recorded total {total:.1f}s into beats.json", flush=True)
    print(f"beats: {len(resolved)} beats, {resolved[-1]['end_s']:.1f}s total, contiguous", flush=True)
    return out
