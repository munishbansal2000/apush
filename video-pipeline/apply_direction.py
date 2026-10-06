#!/usr/bin/env python3
"""Apply asset direction tags to a scene plan.

Reads direction blocks from images.json and merges them into the plan:
- type=map -> sets markers on MapZoomSlide
- type=directional -> adds redpen arrow overlay

Generic across episodes: the asset builder declares intent in images.json,
this script applies it mechanically. No hand-placed coordinates.

Usage: python3 apply_direction.py <plan.json> <assets_dir>
"""
import json, os, sys


def load_directions(assets_dir):
    """Build file -> direction lookup from images.json."""
    manifest_path = os.path.join(assets_dir, "images.json")
    if not os.path.exists(manifest_path):
        return {}
    manifest = json.load(open(manifest_path))
    images = manifest.get("images", {})
    result = {}
    for key, entry in images.items():
        if not isinstance(entry, dict):
            continue
        f = entry.get("file", "")
        d = entry.get("direction")
        if f and d:
            result[f] = d
    return result


def scene_image_files(spec):
    """Collect image files used by a scene."""
    params = spec.get("params", {})
    files = set()
    for k in ("image", "map_image"):
        v = params.get(k)
        if isinstance(v, str) and v:
            files.add(v)
    bg = params.get("bg")
    if isinstance(bg, dict) and bg.get("path"):
        files.add(bg["path"])
    for p in params.get("panels", []):
        if isinstance(p, dict) and p.get("image"):
            files.add(p["image"])
    return files


def apply_direction(plan, directions):
    """Merge direction tags into plan scenes. Returns (applied_count, plan)."""
    applied = 0
    for spec in plan["scenes"]:
        sid = spec.get("id", "?")
        params = spec.setdefault("params", {})
        overlays = spec.setdefault("overlays", [])
        files = scene_image_files(spec)

        for f in files:
            d = directions.get(f)
            if not d:
                continue
            dtype = d.get("type")

            if dtype == "map" and spec.get("slide") == "MapZoomSlide":
                # Apply markers from tag (tag is source of truth)
                if d.get("markers"):
                    params["markers"] = d["markers"]
                    applied += 1
                    print(f"  {sid}: applied {len(d['markers'])} map markers")

            elif dtype == "directional":
                # Add redpen arrow if none exists
                has_arrow = any(
                    ov.get("type") == "redpen"
                    and any(a.get("kind") == "arrow"
                            for a in ov.get("annotations", []))
                    for ov in overlays
                )
                if not has_arrow:
                    arrow = d.get("arrow", {})
                    note = d.get("note", {})
                    annotations = []
                    if arrow.get("from") and arrow.get("to"):
                        annotations.append({
                            "kind": "arrow",
                            "from": arrow["from"],
                            "to": arrow["to"],
                            "start": 1.0,
                        })
                    if note.get("at") and note.get("text"):
                        annotations.append({
                            "kind": "note",
                            "at": note["at"],
                            "text": note["text"],
                            "start": 1.5,
                        })
                    if annotations:
                        overlays.append({
                            "type": "redpen",
                            "annotations": annotations,
                        })
                        applied += 1
                        print(f"  {sid}: applied directional arrow")
    return applied


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <plan.json> <assets_dir>", file=sys.stderr)
        return 1
    plan_path, assets_dir = sys.argv[1], sys.argv[2]
    plan = json.load(open(plan_path))
    directions = load_directions(assets_dir)
    if not directions:
        print("No direction tags found in images.json")
        return 0
    print(f"Found {len(directions)} tagged assets")
    applied = apply_direction(plan, directions)
    json.dump(plan, open(plan_path, "w"), indent=1)
    print(f"Applied {applied} direction tags to {plan_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
