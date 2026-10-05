#!/usr/bin/env python3
"""Re-fit scene durations to measured TTS turn durations.

The episode mix follows the build_format.py recipe: an `offset` of intro
sting, then each turn followed by a `gap` of silence, then a `tail` of
outro. A scene's true video duration is therefore NOT just the sum of its
turns:

    D[0]    = offset + sum(dur + gap for turns in scene 0)
    D[i]    = sum(dur + gap for turns in scene i)          (middle scenes)
    D[last] = sum(dur + gap for turns in last scene) + tail

Cuts land exactly on turn-audio starts; the total equals the mix length.

Usage:
    python refit_durations.py <scene_plan.json> <turns_dir> [--out <path>]
                             [--timings work/timings.json]

Turn files are t00.mp3, t01.mp3, ... (zero-padded to the turn count).
Without --out the plan is rewritten in place.
Without --timings, gap/offset/tail default to 0 (straight concat).
With --timings, they come from the timing stage's measured model.

Overlay handling: the first scene's overlays shift by +offset (its turn
audio starts `offset` into the scene; the title card holds the sting).
Other scenes start exactly on their first turn's audio, so their overlay
local times are already correct and are left alone. The refit is
idempotent: if every scene already matches the model within 0.01s,
nothing is rewritten.
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
    timings_path = None
    if "--timings" in argv:
        timings_path = argv[argv.index("--timings") + 1]

    gap = offset = tail = 0.0
    if timings_path:
        tj = json.load(open(timings_path, encoding="utf-8"))
        gap = float(tj.get("gap", 0))
        offset = float(tj.get("offset", 0))
        tail = float(tj.get("tail", 0))
        print(f"refit: using mix model offset={offset} gap={gap} tail={tail}",
              flush=True)

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
    last = len(scenes) - 1
    for i, s in enumerate(scenes):
        a, b = s["turns"]
        new_dur = round(sum(durs[j] for j in range(a, b + 1))
                        + gap * (b - a + 1)
                        + (offset if i == 0 else 0)
                        + (tail if i == last else 0), 3)
        old_dur = s["duration_sec"]
        total_old += old_dur
        total_new += new_dur
        print(f"{s['id']:10s} turns [{a:2d},{b:2d}] "
              f"{old_dur:6.1f}s -> {new_dur:6.1f}s")
        # First scene's turn audio starts `offset` into the scene (the
        # title card holds the intro sting). Its overlays were authored
        # against turn-relative time, so shift them by +offset — but only
        # when the scene is actually being refit (idempotency: a second
        # run must not shift them twice). Later scenes start exactly on
        # their first turn's audio: their overlay local times are already
        # correct — leave them alone.
        if i == 0 and offset > 0 and abs(old_dur - new_dur) > 0.015:
            for ov in s.get("overlays") or []:
                if isinstance(ov, dict) and "start" in ov:
                    ov["start"] = round(float(ov["start"]) + offset, 2)
        s["duration_sec"] = new_dur

    plan.setdefault("notes", "")
    json.dump(plan, open(out_path, "w", encoding="utf-8"), indent=1)
    print(f"total {total_old:.1f}s -> {total_new:.1f}s; wrote {out_path}")


if __name__ == "__main__":
    main(sys.argv[1:])
