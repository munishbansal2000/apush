"""Validation: hard checks before a render, not eyeballing after.

Covers what automation can catch — schema, coordinate bounds, missing
assets. It cannot tell whether a waypoint sits on the right city; that
still needs a human (or vision LLM) looking at the map.

    from slideforge import validate
    issues = validate.route("columbus_1492")   # [] means clean
"""

from pathlib import Path

from . import routes


def route(name_or_path):
    """Validate a route by name or file path. Returns [issues]."""
    p = Path(name_or_path)
    if p.exists() or Path(str(name_or_path)).is_absolute():
        return routes.validate_route_file(str(name_or_path))
    stem = p.name if p.suffix == ".json" else p.name + ".json"
    return routes.validate_route_file(
        str(Path(routes._HERE) / "routes" / stem))


def slide(s):
    """Validate one slide instance via its plugin validate() hook."""
    if hasattr(s, "validate"):
        return s.validate()
    return []


def movie(m):
    """Validate every scene in a Movie. Returns [(index, issues)]."""
    bad = []
    for i, scene in enumerate(m.scenes):
        issues = slide(scene)
        if issues:
            bad.append((i, issues))
    return bad


def report(title, issues):
    """Print issues in a uniform way; return True if clean."""
    if not issues:
        print(f"OK   {title}")
        return True
    print(f"FAIL {title}")
    for it in issues:
        print(f"  - {it}")
    return False
