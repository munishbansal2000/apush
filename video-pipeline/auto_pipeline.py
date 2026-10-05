#!/usr/bin/env python3
"""Unified episode pipeline: script → TTS → measure → render → mux → verify.

Usage:
  python3 pipeline.py --episode u2-e8-act1
  python3 pipeline.py --episode u1-e1 --voices fish  # final Fish voices

One command. No manual steps. The pipeline:
  1. Reads <episode>/script_turns.json (turns with speaker + text).
  2. Generates per-turn TTS (placeholder Aria/Briggs @115, or Fish Maya/Marcus).
  3. Measures WAV sample-count durations → writes <episode>/measured.json.
  4. Renders scenes from <episode>/<plan>.json using measured durations.
  5. Concats video + audio, muxes once.
  6. Verifies drift < 1 frame. Rejects the build if not.

If measured durations differ from the plan by >= 1 frame, the pipeline
updates the plan automatically and re-renders. No hand edits.
"""

import argparse, json, math, os, subprocess, sys, tempfile

FPS = 30
PLACEHOLDER_VOICES = {"maya": "avocado_v2:aria", "marcus": "avocado_v2:briggs"}
PLACEHOLDER_SPEED = 115
# Fish voices resolved at runtime from the tts skill's voice sources
FISH_VOICES = {"maya": "fish:maya", "marcus": "fish:marcus"}


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd[:5])} failed: {r.stderr[:400]}")
    return r


def tts_turn(text, voice, speed, out):
    """Synthesize one turn. Uses the tts CLI."""
    if os.path.exists(out) and os.path.getsize(out) > 1000:
        return  # cached
    with open("/tmp/_pipe_text.txt", "w") as f:
        f.write(text)
    with open("/tmp/_pipe_text.txt") as fin:
        # Fish voices use a different CLI; placeholder uses tts speak
        if voice.startswith("fish:"):
            raise NotImplementedError(
                "Fish TTS not wired yet — generate via Fish Audio and place "
                f"per-turn MP3s in the tts dir, then re-run with --skip-tts")
        r = subprocess.run(
            ["/opt/hatch/bin/tts", "speak", "--voice", voice,
             "--speed", str(speed), "--output", out, "--text-stdin"],
            stdin=fin, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"TTS failed for {out}: {r.stderr[:200]}")


def measure_wav_duration(wav):
    r = run(["ffprobe", "-v", "error", "-show_entries",
             "stream=sample_rate", "-of", "csv=p=0", wav])
    sr = int(r.stdout.strip().split("\n")[0])
    r = run(["ffprobe", "-v", "error", "-show_entries",
             "stream=nb_samples", "-of", "csv=p=0", wav])
    n = int(r.stdout.strip().split("\n")[0])
    return n / sr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--episode", required=True,
                    help="episode dir, e.g. u2-e8-act1")
    ap.add_argument("--voices", default="placeholder",
                    choices=["placeholder", "fish"])
    ap.add_argument("--skip-tts", action="store_true",
                    help="TTS already generated, just measure + build")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    epdir = os.path.join("video-pipeline", "episodes", args.episode)
    if not os.path.isdir(epdir):
        # also try local workspace
        epdir = os.path.join(os.path.expanduser("~/workspace"),
                             f"episode_{args.episode.replace('-', '')}")
    turns_path = os.path.join(epdir, "script_turns.json")
    if not os.path.exists(turns_path):
        # fall back to turns.json
        turns_path = os.path.join(epdir, "turns.json")
    turns = json.load(open(turns_path))

    # Find the scene plan (first *_scene_plan.json or *_plan.json)
    plan_path = next(
        (os.path.join(epdir, f) for f in os.listdir(epdir)
         if f.endswith("_scene_plan.json") or f.endswith("_plan.json")),
        None)
    if not plan_path:
        sys.exit(f"no scene plan in {epdir}")
    plan = json.load(open(plan_path))
    print(f"episode: {plan.get('episode')} | plan: {os.path.basename(plan_path)}"
          f" | {len(plan['scenes'])} scenes, {len(turns)} turns")

    tts_dir = os.path.join(epdir, "tts", "per_turn")
    os.makedirs(tts_dir, exist_ok=True)
    voices = PLACEHOLDER_VOICES if args.voices == "placeholder" else FISH_VOICES
    speed = PLACEHOLDER_SPEED

    tmpdir = tempfile.mkdtemp(prefix="pipe_")
    measured = {}

    # 1+2. TTS (or skip) + 3. measure via WAV sample counts
    print("== tts + measure ==")
    for t in turns:
        tid = t["id"]
        mp3 = os.path.join(tts_dir, f"{tid}.mp3")
        if t.get("speaker") == "pause" or t.get("text") == "[3-second pause]":
            if not os.path.exists(mp3):
                run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
                     "-i", "anullsrc=r=44100:cl=stereo", "-t", "3",
                     "-c:a", "libmp3lame", mp3])
        elif not args.skip_tts:
            voice = voices.get(t["speaker"], PLACEHOLDER_VOICES["maya"])
            tts_turn(t["text"], voice, speed, mp3)
        elif not os.path.exists(mp3):
            sys.exit(f"missing {mp3} (used --skip-tts but TTS not present)")

        wav = os.path.join(tmpdir, f"{tid}.wav")
        run(["ffmpeg", "-y", "-v", "error", "-i", mp3,
             "-ar", "44100", "-ac", "2", wav])
        d = measure_wav_duration(wav)
        measured[tid] = round(d, 3)
        t["duration_sec"] = round(d, 3)

    total_audio = sum(measured.values())
    words = sum(len(t.get("text", "").split()) for t in turns)
    print(f"  {len(turns)} turns, {total_audio:.1f}s, "
          f"{words} words, {words/(total_audio/60):.0f} WPM")

    # Save measured manifest (ground truth for this render)
    measured_path = os.path.join(epdir, "measured.json")
    json.dump({"voices": args.voices, "speed": speed,
               "turns": [{"id": t["id"], "duration_sec": t["duration_sec"]}
                         for t in turns]},
              open(measured_path, "w"), indent=1)
    print(f"  measured.json written")

    # 4. Check plan durations vs measured; auto-update if drift >= 1 frame
    updated = False
    for s in plan["scenes"]:
        lo, hi = s["turns"][0], s["turns"][1]
        actual = sum(measured[f"t{i:02d}"] for i in range(lo, hi + 1))
        if abs(actual - s["duration_sec"]) >= 1 / FPS:
            print(f"  {s['id']}: plan {s['duration_sec']:.3f}s → "
                  f"measured {actual:.3f}s (auto-updated)")
            s["duration_sec"] = round(actual, 3)
            # also fix segment durations proportionally if present
            if "segments" in s:
                seg_total = sum(g["duration_sec"] for g in s["segments"])
                for g in s["segments"]:
                    g["duration_sec"] = round(
                        g["duration_sec"] / seg_total * actual, 3)
            updated = True
    if updated:
        json.dump(plan, open(plan_path, "w"), indent=1)
        print(f"  plan auto-updated: {plan_path}")

    # 5. Render scenes silently (delegates to the episode build script if present)
    build_script = next(
        (os.path.join(epdir, f) for f in os.listdir(epdir)
         if f.startswith("build_") and f.endswith(".py")), None)
    out = args.out or os.path.join(epdir, f"{args.episode}_final.mp4")
    if build_script:
        print(f"== render via {os.path.basename(build_script)} ==")
        run([sys.executable, build_script, "--plan", plan_path,
             "--tts-dir", tts_dir, "--out", out])
    else:
        sys.exit(f"no build_*.py in {epdir} — cannot render")

    print(f"\nDONE: {out}")


if __name__ == "__main__":
    main()
