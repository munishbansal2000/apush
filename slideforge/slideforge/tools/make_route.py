"""E2E route-video pipeline: map + places -> animated route video.

Four steps, one command:
  1. grid the map              (coded: tools/map_grid)
  2. read waypoint coords      (vision plugin: agent|ollama|openai|anthropic)
  3. write routes/<name>.json  (coded: routes.py format)
  4. validate + render title + RouteSlide video (coded)

Usage:
  python -m slideforge.tools.make_route --map <image> --places places.json \\
      --name narvaez_1528 --out narvaez.mp4 [--vision auto] [--check]

places.json:
  {"title": "Narvaez Expedition", "subtitle": "1528",
   "places": [{"name": "western Cuba", "label": "Cuba",
               "sub": "Departs April 1528"},
              {"name": "Florida peninsula", "label": "La Florida",
               "sub": "Landfall 1528"}]}

  "name" is what the vision reader looks for on the map;
  "label"/"sub" are the on-screen pin text.

Vision providers (--vision): auto (default), agent, ollama, openai, anthropic.
  agent: print the gridded map + places; the operator (human or the Muse
         agent) writes build/<name>/waypoints.json, then re-runs with
         --waypoints pointing at it.

waypoints.json format:
  [{"name": "western Cuba", "at": [0.40, 0.42],
    "label": "Cuba", "sub": "Departs April 1528"}, ...]
"""

import argparse
import json
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent.parent  # slideforge/ package dir
_ROOT = _HERE.parent  # project root (assets/, build/ live here)


def grid_map(map_path, out_path):
    from slideforge.tools.map_grid import grid_overlay
    grid_overlay(str(map_path), str(out_path))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--map", default=None,
                    help="source map image (or use --fetch-map)")
    ap.add_argument("--fetch-map", default=None, metavar="QUERY",
                    help="fetch map from Wikimedia Commons by search query "
                         "(first result is downloaded)")
    ap.add_argument("--places", required=True, help="places.json (see docs)")
    ap.add_argument("--name", required=True,
                    help="route name (routes/<name>.json)")
    ap.add_argument("--out", required=True, help="output video path")
    ap.add_argument("--vision", default="auto",
                    help="vision plugin: auto|agent|ollama|openai|anthropic")
    ap.add_argument("--waypoints", default=None,
                    help="skip vision: use this waypoints.json")
    ap.add_argument("--zoom", type=float, default=2.6)
    ap.add_argument("--title-dur", type=float, default=3.5)
    ap.add_argument("--check", action="store_true",
                    help="validate route JSON before rendering; abort on issues")
    args = ap.parse_args(argv)

    sys.path.insert(0, str(_ROOT))
    build = _ROOT / "build" / args.name
    build.mkdir(parents=True, exist_ok=True)
    grid_path = build / "grid.png"
    wp_path = build / "waypoints.json"

    spec = json.loads(Path(args.places).read_text())
    places = spec["places"]

    # Step 0: fetch the map itself if asked (fully e2e from a search query)
    map_arg = args.map
    if args.fetch_map:
        from slideforge import assets
        titles = assets.search(args.fetch_map, limit=1)
        if not titles:
            print(f"no Commons results for {args.fetch_map!r}")
            return 1
        map_arg = str(build / "map.jpg")
        out, lic = assets.download(titles[0], map_arg)
        print(f"[0/4] fetched map: {titles[0]} [{lic}] -> {out}")
    if not map_arg:
        print("need --map or --fetch-map")
        return 1

    # Step 1: grid the map
    print(f"[1/4] gridding map -> {grid_path}")
    grid_map(map_arg, grid_path)

    # Step 2: vision -> waypoints
    if args.waypoints:
        waypoints = json.loads(Path(args.waypoints).read_text())
        print(f"[2/4] waypoints loaded from {args.waypoints}")
    else:
        from slideforge import vision as vision_mod
        provider = args.vision
        if provider == "auto":
            provider = vision_mod.autodetect()
        print(f"[2/4] vision={provider}")
        if provider == "agent":
            print("  open the gridded map and locate each place:")
            print(f"  map:    {grid_path}")
            for p in places:
                print(f"  - {p['name']}")
            print(f"  Write waypoints JSON to {wp_path}")
            print('  (format: [{"name": ..., "at": [x, y], '
                  '"label": ..., "sub": ...}, ...])')
            print(f"  then re-run with --waypoints {wp_path}")
            return 2
        waypoints = vision_mod.read_waypoints(provider, grid_path, places)
        wp_path.write_text(json.dumps(waypoints, indent=1))
        print(f"[2/4] wrote {wp_path}")

    # Step 3: route JSON
    map_p = Path(map_arg)
    try:
        map_rel = str(map_p.resolve().relative_to(_ROOT.resolve()))
    except ValueError:
        map_rel = str(map_p.resolve())
    route = {"title": spec.get("title", args.name),
             "subtitle": spec.get("subtitle", ""),
             "map": map_rel,
             "waypoints": [{"at": w["at"], "label": w["label"],
                            "sub": w.get("sub", "")} for w in waypoints]}
    route_path = _HERE / "routes" / f"{args.name}.json"
    route_path.write_text(json.dumps(route, indent=1))
    print(f"[3/4] wrote {route_path}")

    # Step 4: validate (optional gate) + render
    if args.check:
        from slideforge import validate
        issues = validate.route(str(route_path))
        if not validate.report(str(route_path), issues):
            print("aborting: fix the route and re-run")
            return 1

    from slideforge import Movie, Config, TitleSlide, RouteSlide
    print(f"[4/4] rendering -> {args.out}")
    m = Movie(Config(w=1280, h=720, fps=30))
    m.add(TitleSlide(route["title"], route.get("subtitle", ""),
                     duration=args.title_dur),
          transition="cut")
    m.add(RouteSlide.from_route(args.name, zoom=args.zoom),
          transition="crossfade", trans_dur=0.6)
    m.render(args.out)
    print("done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
