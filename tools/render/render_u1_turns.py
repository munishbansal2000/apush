#!/usr/bin/env python3
"""Render all Unit 1 episode turn audio via Fish Audio (Maya/Marcus voices).

Uses the expanded render_episode.py command set, verified against
`render_episode.py --help`:
  --list-turns   preflight: parse the script, report segment count, no API calls
  --script       approved episode script (required)
  --voices       voice model ids (default: voices.yaml next to render_episode.py)
  --out          mixed episode MP3
  --turns-dir    per-segment tNN.mp3 files for the video pipeline's timing
                 stage + refit_durations.py (existing files are replaced)
  --rebuild      force re-synthesis (default: content-hash cache, only changed
                 turns re-render)

Cross-check: when a scene_plan.json exists for the episode, the parsed
segment count must equal its turn partition (max turn + 1); a mismatch
means the plan and the script disagree and the run stops before any TTS.

Auth: Linux VM uses the Secure Vault credential (custom.fish-audio);
Windows uses FISH_API_KEY. No raw keys anywhere.

GATED: TTS costs money and Munish renders narration only on his explicit go.
This script does nothing unless run directly.
"""
import json
import os
import subprocess
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(_HERE, os.pardir, os.pardir))
RENDER = os.path.join(_HERE, "render_episode.py")
VOICES = os.path.join(_HERE, "voices.yaml")
TSS = os.path.expanduser("~/workspace/your_files/tts-scripts/fishperf")

# episode -> (script file, turns-dir slug); scripts are the finals.
EPISODES = [
    ("u1-e1", "apush-audio-u1-e1-script-v12-DRAFT.md", "u1-e1-natives"),
    ("u1-e2", "apush-audio-u1-e2-script-v4-DRAFT.md", "u1-e2-europe-sailed"),
    ("u1-e3", "apush-audio-u1-e3-script-v5-DRAFT.md", "u1-e3-exchange"),
    ("u1-e4", "apush-audio-u1-e4-script-v5-DRAFT.md", "u1-e4-500-men"),
    ("u1-e5", "apush-audio-u1-e5-script-v3-DRAFT.md", "u1-e5-silver-empire"),
    ("u1-e6", "apush-audio-u1-e6-script-v3-DRAFT.md", "u1-e6-labor-systems"),
    ("u1-e7", "apush-audio-u1-e7-script-v3-DRAFT.md", "u1-e7-valladolid-debate"),
    ("u1-e8", "apush-audio-u1-e8-script-v3-DRAFT.md", "u1-e8-pueblo-revolt"),
    ("u1-e9", "apush-audio-u1-e9-script-v3-DRAFT.md", "u1-e9-cram-session"),
]


def sh(*args):
    r = subprocess.run(args, capture_output=True, text=True)
    return r


def parse_segments(script):
    r = sh(sys.executable, RENDER, "--script", script, "--list-turns")
    if r.returncode != 0:
        raise SystemExit(f"--list-turns failed for {script}:\n{r.stderr}")
    n = int(r.stdout.strip().splitlines()[-1].split()[0])
    return n


def plan_turns(ep):
    p = os.path.join(REPO, "video-pipeline", "episodes", ep, "scene_plan.json")
    if not os.path.exists(p):
        return None
    plan = json.load(open(p, encoding="utf-8"))
    return max(s["turns"][1] for s in plan["scenes"]) + 1


def main(argv):
    check_only = "--check-only" in argv
    rebuild = ["--rebuild"] if "--rebuild" in argv else []
    only = [a for a in argv if a.startswith("u1-")]
    for ep, script_name, slug in EPISODES:
        if only and ep not in only:
            continue
        script = os.path.join(REPO, "audio_scripts", "unit1", script_name)
        if not os.path.exists(script):
            print(f"[{ep}] SKIP: script missing: {script}")
            continue
        n = parse_segments(script)
        expect = plan_turns(ep)
        status = ""
        if expect is not None and n != expect:
            raise SystemExit(
                f"[{ep}] MISMATCH: script parses to {n} segments but the "
                f"scene plan partitions {expect} turns. Fix the plan or the "
                f"script before rendering.")
        if expect is not None:
            status = f" (matches plan: {expect} turns)"
        print(f"[{ep}] {n} segments{status}")
        if check_only:
            continue
        tdir = os.path.join(TSS, slug)
        out = os.path.join(tdir, f"{slug}-mixed.mp3")
        print(f"[{ep}] rendering -> {out}")
        r = subprocess.run(
            [sys.executable, RENDER, "--script", script, "--voices", VOICES,
             "--out", out, "--turns-dir", tdir] + rebuild)
        if r.returncode != 0:
            raise SystemExit(f"[{ep}] render failed (exit {r.returncode})")
        print(f"[{ep}] done")


if __name__ == "__main__":
    if "--help" in sys.argv or "-h" in sys.argv:
        print(__doc__)
        print("usage: render_u1_turns.py [--check-only] [--rebuild] [u1-eN ...]")
        sys.exit(0)
    main(sys.argv[1:])
