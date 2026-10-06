"""Generic toolkit sync: align StaggerSlide panel arrivals to spoken keywords.

Mechanism (no hand-tuned timings):
1. Read images.json for assets tagged direction.type == "toolkit" with a "keyword"
2. Find scenes whose panels reference those assets
3. For each scene, get the narration text from its time range
4. Find each keyword's word position in the text
5. Set panel "at" = (word_index / total_words) * scene_duration

This is proportional placement — mechanical, not creative.
"""
import json
import re
import sys


def load_direction_tags(manifest_path):
    manifest = json.load(open(manifest_path, encoding="utf-8"))
    images = manifest.get("images", {})
    tags = {}
    for key, entry in images.items():
        if not isinstance(entry, dict):
            continue
        d = entry.get("direction")
        if isinstance(d, dict) and d.get("type") == "toolkit" and d.get("keyword"):
            tags[entry["file"]] = d["keyword"]
    return tags


def get_scene_text(plan, scene, script_turns, timings):
    """Get concatenated narration text for a scene's time range.
    
    Joins script_turns (text by turn id) with timings (start/dur by turn id).
    """
    start = scene.get("start_sec", scene.get("start", 0))
    dur = scene.get("duration_sec", scene.get("duration", 0))
    end = start + dur
    
    # Build turn_id -> text map
    texts = {t["turn"]: t.get("text", "") for t in script_turns}
    
    # Find turns overlapping the scene
    result = []
    for t in timings.get("turns", []):
        tid = t.get("turn", "")
        t_start = t.get("start", 0)
        t_end = t_start + t.get("dur", 0)
        if t_start < end and t_end > start and tid in texts:
            result.append(texts[tid])
    return " ".join(result)


def find_keyword_position(text, keyword):
    """Return word index of keyword in text, or None."""
    words = re.findall(r'\w+', text.lower())
    kw = keyword.lower()
    for i, w in enumerate(words):
        if w == kw or w.startswith(kw):
            return i, len(words)
    return None, len(words)


def apply_toolkit_sync(plan_path, manifest_path, script_turns_path):
    tags = load_direction_tags(manifest_path)
    if not tags:
        print("No toolkit tags found")
        return False
    
    plan = json.load(open(plan_path, encoding="utf-8"))
    script_turns = json.load(open(script_turns_path, encoding="utf-8"))
    # Load timings (same dir as plan, timings_v6.json or timings.json)
    import os
    plan_dir = os.path.dirname(plan_path)
    timings = {}
    for name in ["timings_v6.json", "timings.json"]:
        p = os.path.join(plan_dir, name)
        if os.path.exists(p):
            timings = json.load(open(p, encoding="utf-8"))
            break
    
    changed = 0
    for scene in plan.get("scenes", []):
        panels = scene.get("params", {}).get("panels", [])
        if not panels:
            continue
        
        # Check if any panel references a toolkit-tagged image
        toolkit_panels = []
        for p in panels:
            img = p.get("image", "")
            if img in tags:
                toolkit_panels.append((p, tags[img]))
        
        if not toolkit_panels:
            continue
        
        # Get scene narration text
        text = get_scene_text(plan, scene, script_turns, timings)
        if not text.strip():
            print(f"  {scene['id']}: no narration text found")
            continue
        
        duration = scene.get("duration_sec", scene.get("duration", 0))
        for panel, keyword in toolkit_panels:
            pos, total = find_keyword_position(text, keyword)
            if pos is None:
                print(f"  {scene['id']}: keyword '{keyword}' not found in narration")
                continue
            # Proportional placement
            at_time = (pos / total) * duration if total > 0 else 0
            # Clamp to reasonable bounds (not at 0, not past 90%)
            at_time = max(0.5, min(at_time, duration * 0.9))
            old_at = panel.get("at", "?")
            panel["at"] = round(at_time, 2)
            changed += 1
            print(f"  {scene['id']}: '{keyword}' -> at={at_time:.2f}s (was {old_at})")
    
    if changed:
        json.dump(plan, open(plan_path, "w", encoding="utf-8"), indent=1)
        print(f"Saved {plan_path} ({changed} panels synced)")
    return changed > 0


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: apply_toolkit_sync.py <plan.json> <images.json> <script_turns.json>")
        sys.exit(1)
    apply_toolkit_sync(sys.argv[1], sys.argv[2], sys.argv[3])
