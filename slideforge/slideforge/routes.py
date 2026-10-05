"""Route files: the data seam of the LLM+scripted pipeline.

A route file is plain JSON describing one journey. The vision LLM writes
these by looking at a coordinate-gridded map (see tools/map_grid.py);
the scripted renderer reads them and animates. No code changes per route.

{
  "title": "Columbus's First Voyage",
  "map": "assets/maps/america_gutierrez_1562.jpg",
  "waypoints": [
    {"at": [0.820, 0.330], "label": "La Gomera, Canaries",
     "sub": "Departs Sept 6, 1492"},
    ...
  ]
}
"""

import json
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_ASSETS = _HERE.parent  # assets/ lives next to the package, not inside it


def _resolve_map(map_path):
    mp = Path(map_path)
    if not mp.is_absolute():
        mp = _ASSETS / map_path
    return str(mp)


def load_route(name_or_path):
    """Load a route JSON by name (from slideforge/routes/) or by path."""
    p = Path(name_or_path)
    if not p.is_absolute() and not p.exists():
        stem = p.name if p.suffix == ".json" else p.name + ".json"
        p = _HERE / "routes" / stem
    data = json.loads(p.read_text())
    data["map"] = _resolve_map(data["map"])
    if not Path(data["map"]).exists():
        raise FileNotFoundError(f"route map not found: {data['map']}")
    return data


def list_routes():
    return sorted(p.stem for p in (_HERE / "routes").glob("*.json"))


def validate_route_data(data):
    """Check a route dict; return a list of issue strings (empty = clean)."""
    issues = []
    if not isinstance(data, dict):
        return ["route must be a JSON object"]
    for key in ("map", "waypoints"):
        if key not in data:
            issues.append(f"route is missing required key: {key!r}")
    wps = data.get("waypoints", [])
    if not isinstance(wps, list) or len(wps) < 2:
        issues.append(f"route needs >= 2 waypoints, got {wps!r}"
                      if not isinstance(wps, list) else
                      f"route needs >= 2 waypoints, got {len(wps)}")
        return issues
    for i, w in enumerate(wps):
        if not isinstance(w, dict):
            issues.append(f"waypoints[{i}] must be an object")
            continue
        at = w.get("at")
        if not isinstance(at, (list, tuple)) or len(at) != 2:
            issues.append(f"waypoints[{i}].at must be an [x, y] pair")
        else:
            for v, axis in zip(at, "xy"):
                if not isinstance(v, (int, float)) or isinstance(v, bool):
                    issues.append(
                        f"waypoints[{i}].at.{axis} must be a number")
                elif not 0.0 <= v <= 1.0:
                    issues.append(
                        f"waypoints[{i}].at.{axis}={v} is outside the 0..1 map range")
        if not w.get("label"):
            issues.append(f"waypoints[{i}] has no label")
    return issues


def validate_route_file(path):
    """Validate a route JSON file on disk; return [issues]."""
    p = Path(path)
    if not p.exists():
        return [f"route file not found: {path}"]
    try:
        data = json.loads(p.read_text())
    except json.JSONDecodeError as e:
        return [f"invalid JSON: {e}"]
    issues = validate_route_data(data)
    mp = data.get("map")
    if isinstance(mp, str):
        rp = Path(mp)
        if not rp.is_absolute():
            rp = _ASSETS / mp
        if not rp.exists():
            issues.append(f"map not found: {mp}")
    return issues
