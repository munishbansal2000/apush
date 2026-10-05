#!/usr/bin/env python3
"""Re-fit scene durations to measured TTS turn durations.

The episode mix is a straight ffmpeg concat of the turn files, so a
scene's true duration is exactly the sum of its turns' durations.
Each scene in the plan carries a "turns": [start, end] partition.

Usage:
    python refit_durations.py <scene_plan.json> <turns_dir> [--out <path>]

Turn files are t00.mp3, t01.mp3, ... (zero-padded to the turn count).
Without --out the plan is rewritten in place.
"""
import glob
import json
import os
import re
import subprocess
import sys


def find_turn_files(turns_dir, n_turns):
    """Map turn index -> file path, from actual filenames (t00.mp3, ...)."""
    found = {}
    for p in glob.glob(os.path.join(turns_dir, "t*.mp3")):
        m = re.fullmatch(r"t(\d+)\.mp3", os.path.basename(p))
        if m:
            found[int(m.group(1))] = p
    missing = [i for i in range(n_turns) if i not in found]
    if missing:
        sys.exit(f"turn files missing in {turns_dir}: "
                 + ", ".join(f"t{i}" for i in missing[:5])
                 + (f" (+{len(missing) - 5} more)" if len(missing) > 5 else "")
                 + f"; expected {n_turns} turn files")
    return found


def turn_duration(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path], text=True).strip()
    return float(out)


def main(argv):
    if len(argv) < 2:
        sys.exit(__doc__)
    plan_path, turns_dir = argv[0], argv[1]
    out_path = plan_path
    if "--out" in argv:
        out_path = argv[argv.index("--out") + 1]

    plan = json.load(open(plan_path, encoding="utf-8"))
    scenes = plan["scenes"]

    # turn count comes from the plan's coverage; files are matched by index
    n_turns = max(s["turns"][1] for s in scenes) + 1

    covered = set()
    for s in scenes:
        if "turns" not in s:
            sys.exit(f"scene '{s.get('id')}' has no 'turns' range; refusing")
        a, b = s["turns"]
        if a > b:
            sys.exit(f"scene '{s.get('id')}': bad turns range [{a}, {b}]")
        rng = set(range(a, b + 1))
        if rng & covered:
            sys.exit(f"scene '{s.get('id')}': turns overlap another scene")
        covered |= rng
    if covered != set(range(n_turns)):
        missing = sorted(set(range(n_turns)) - covered)
        sys.exit(f"turns not covered by any scene: {missing}")

    turn_files = find_turn_files(turns_dir, n_turns)
    durs = {}
    for i in range(n_turns):
        try:
            durs[i] = turn_duration(turn_files[i])
        except subprocess.CalledProcessError:
            sys.exit(f"could not read {turn_files[i]}")

    total_old, total_new = 0.0, 0.0
    for s in scenes:
        a, b = s["turns"]
        new_dur = round(sum(durs[i] for i in range(a, b + 1)), 3)
        total_old += s["duration_sec"]
        total_new += new_dur
        print(f"{s['id']:10s} turns [{a:2d},{b:2d}] "
              f"{s['duration_sec']:6.1f}s -> {new_dur:6.1f}s")
        s["duration_sec"] = new_dur

    plan.setdefault("notes", "")
    json.dump(plan, open(out_path, "w", encoding="utf-8"), indent=1)
    print(f"total {total_old:.1f}s -> {total_new:.1f}s; wrote {out_path}")


if __name__ == "__main__":
    main(sys.argv[1:])
