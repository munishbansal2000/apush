"""Stage: direction.

Apply direction tags from images.json to the scene plan, mechanically.
Runs after 'direct' (plan exists) and before 'slideforge_render' (compile).

Applies:
1. Map markers + directional arrows (apply_direction.py logic)
2. Toolkit panel sync to narration keywords (apply_toolkit_sync.py logic)

No creative decisions — all values come from asset tags + script text.
The compiler enforces the results in slideforge_render.
"""
import json
import os
import re
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, os.pardir))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from stages.plan_path import resolve_plan


def _load_tags(manifest_path):
    manifest = json.load(open(manifest_path, encoding="utf-8"))
    images = manifest.get("images", {})
    result = {"map": {}, "directional": {}, "toolkit": {}}
    for key, entry in images.items():
        if not isinstance(entry, dict):
            continue
        d = entry.get("direction")
        if not isinstance(d, dict):
            continue
        dtype = d.get("type")
        if dtype in result:
            result[dtype][entry["file"]] = d
    return result


def _apply_map_markers(plan, tags):
    """Add map markers to MapZoomSlide scenes using tagged assets.

    MapZoomSlide takes markers via params.markers (list of {at, zoom, label, sub}).
    Idempotent: replaces params.markers with the tagged values.
    """
    changed = 0
    for scene in plan.get("scenes", []):
        if scene.get("slide") != "MapZoomSlide":
            continue
        params = scene.get("params", {})
        img = params.get("map_image", params.get("image", ""))
        if img not in tags["map"]:
            continue
        markers = tags["map"][img].get("markers", [])
        if not markers:
            continue
        # Tags are already in MapZoomSlide format — pass through directly
        params["markers"] = markers
        changed += len(markers)
    return changed


def _apply_directional_arrows(plan, tags):
    """Add RedPen arrows to scenes using directional assets."""
    changed = 0
    for scene in plan.get("scenes", []):
        img = scene.get("params", {}).get("image", "")
        if img not in tags["directional"]:
            continue
        # Skip if a redpen arrow already exists (idempotent)
        # Correct format: {"type": "redpen", "annotations": [{"kind": "arrow", ...}]}
        overlays = scene.setdefault("overlays", [])
        has_arrow = False
        for o in overlays:
            if o.get("type") == "redpen":
                for ann in o.get("annotations", []):
                    if ann.get("kind") == "arrow":
                        has_arrow = True
                        break
        if has_arrow:
            continue
        d = tags["directional"][img]
        arrow = d.get("arrow", {})
        x1, y1 = arrow.get("x1", 0.2), arrow.get("y1", 0.5)
        x2, y2 = arrow.get("x2", 0.8), arrow.get("y2", 0.5)
        label = d.get("label", "")
        at = d.get("at", 1.0)
        annotations = [
            {"kind": "arrow", "from": [x1, y1], "to": [x2, y2], "start": at},
        ]
        if label:
            annotations.append({
                "kind": "note", "at": [(x1+x2)/2, y2+0.1],
                "text": label, "start": at + 0.5,
            })
        overlays.append({
            "type": "redpen",
            "annotations": annotations,
            "_auto": True,
        })
        changed += 1
    return changed


def _find_word_time(word_times, turn_id, keyword, turn_start, scene_start):
    """Find keyword in Vosk word times, return scene-relative time.
    
    Handles Vosk mis-transcriptions with fuzzy matching:
    - exact match
    - Vosk word is suffix of keyword ("teen" for "lateen")
    - keyword is prefix of Vosk word
    """
    if turn_id not in word_times:
        return None
    kw = keyword.lower()
    for w in word_times[turn_id]:
        wl = w["word"].lower().strip(".,!?;:")
        if wl == kw:
            return (turn_start - scene_start) + w["start"]
        # Fuzzy: Vosk often drops first syllable ("teen" for "lateen")
        if kw.endswith(wl) and len(wl) >= 4:
            return (turn_start - scene_start) + w["start"]
        if wl.startswith(kw) and len(kw) >= 4:
            return (turn_start - scene_start) + w["start"]
    return None


def _apply_toolkit_sync(plan, tags, script_turns, timings, word_times=None):
    """Sync StaggerSlide panels to narration keywords.
    
    When word_times (Vosk) is available: use EXACT measured word timestamps.
    Otherwise: fall back to proportional placement from script text.
    """
    word_times = word_times or {}
    # Build turn_id -> text map and turn_id -> timing map
    texts = {t["turn"]: t.get("text", "") for t in script_turns}
    turn_timing = {t["turn"]: t for t in timings.get("turns", [])}
    changed = 0
    
    for scene in plan.get("scenes", []):
        panels = scene.get("params", {}).get("panels", [])
        if not panels:
            continue
        
        # Find toolkit panels
        toolkit_panels = []
        for p in panels:
            img = p.get("image", "")
            if img in tags["toolkit"]:
                toolkit_panels.append((p, tags["toolkit"][img]["keyword"]))
        
        if not toolkit_panels:
            continue
        
        start = scene.get("start_sec", scene.get("start", 0))
        dur = scene.get("duration_sec", scene.get("duration", 0))
        end = start + dur
        
        # Find turns overlapping this scene
        overlapping = []
        for t in timings.get("turns", []):
            tid = t.get("turn", "")
            ts = t.get("start", 0)
            te = ts + t.get("dur", 0)
            if ts < end and te > start:
                overlapping.append((tid, ts))
        
        for panel, keyword in toolkit_panels:
            at_time = None
            
            # Try exact word timing first
            for tid, ts in overlapping:
                at_time = _find_word_time(word_times, tid, keyword, ts, start)
                if at_time is not None:
                    break
            
            # Fall back to proportional
            if at_time is None:
                scene_texts = [texts.get(tid, "") for tid, _ in overlapping]
                text = " ".join(scene_texts)
                words = re.findall(r'\w+', text.lower())
                total = len(words)
                if total > 0:
                    kw = keyword.lower()
                    for i, w in enumerate(words):
                        if w == kw or w.startswith(kw):
                            at_time = max(0.5, min((i / total) * dur, dur * 0.9))
                            break
            
            if at_time is not None:
                # Clamp to scene bounds
                at_time = max(0.3, min(at_time, dur * 0.95))
                panel["at"] = round(at_time, 2)
                changed += 1
    
    return changed


def run(ep_dir, cfg=None):
    plan_path, _source = resolve_plan(ep_dir)
    assets_dir = ep_dir
    manifest_path = os.path.join(assets_dir, "images.json")
    
    if not os.path.exists(manifest_path):
        print("  [direction] no images.json, skipping")
        return
    
    tags = _load_tags(manifest_path)
    total_tags = sum(len(v) for v in tags.values())
    if total_tags == 0:
        print("  [direction] no direction tags, skipping")
        return
    
    plan = json.load(open(plan_path, encoding="utf-8"))
    
    n1 = _apply_map_markers(plan, tags)
    n2 = _apply_directional_arrows(plan, tags)
    
    # Toolkit sync needs script turns + timings
    n3 = 0
    work = os.path.join(ep_dir, "work")
    script_turns = []
    timings = {}
    for name in ["script_turns_v6.json", "script_turns.json"]:
        p = os.path.join(work, name)
        if os.path.exists(p):
            script_turns = json.load(open(p, encoding="utf-8"))
            break
    for name in ["timings_v6.json", "timings.json"]:
        p = os.path.join(work, name)
        if os.path.exists(p):
            timings = json.load(open(p, encoding="utf-8"))
            break
    # Load word times if available (Vosk output)
    word_times = {}
    wt_path = os.path.join(work, "word_times.json")
    if os.path.exists(wt_path):
        word_times = json.load(open(wt_path, encoding="utf-8"))
        # word_times.json is {turn_id: [{word, start, end}]} — flatten turn_start
        # Turn start times come from timings
        print(f"  [direction] using measured word times ({len(word_times)} turns)")
    
    if script_turns and timings:
        n3 = _apply_toolkit_sync(plan, tags, script_turns, timings, word_times)
    
    if n1 or n2 or n3:
        json.dump(plan, open(plan_path, "w", encoding="utf-8"), indent=1)
    
    print(f"  [direction] applied: {n1} map markers, {n2} arrows, {n3} toolkit panels")
