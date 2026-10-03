#!/usr/bin/env python3
"""One-script end-to-end APUSH lesson builder.

Replaces the 4-step manual runbook (see a sample README's "manual escape
hatch") with a single command run from the repo root:

    python video/build_lesson.py vid-u1-01            # full run (5090)
    python video/build_lesson.py vid-u1-01 --preview   # fast 720p motion pass

Pipeline, in order, fail-fast with plain-language errors:
    1. TTS      render narration via video/render_narration.py (fish-speech)
    2. CLIPS    generate ai_clip stages via video/animate_still.py (LTX-Video)
    3. VIDEO    assemble via video/build_video.py
    4. VALIDATE video/validate_video.py -- non-zero exit fails LOUDLY.
                This is the quality gate; it is never skipped.

Steps are resumable: a failed step never forces re-running finished ones --
use --skip-tts / --skip-ai-clips / --only to pick up where you left off
(resume patterns are in --help).
"""
import argparse
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

STEPS = ("tts", "clips", "video", "validate")


class LessonError(Exception):
    """Fail-fast, plain-language build error."""


# --- step planning -----------------------------------------------------------
def plan_steps(args):
    """Ordered step names honoring --only / --skip-tts / --skip-ai-clips."""
    if args.only:
        return [args.only]
    steps = []
    if not args.skip_tts:
        steps.append("tts")
    if not args.skip_ai_clips:
        steps.append("clips")
    steps += ["video", "validate"]
    return steps


def banner(i, total, title):
    bar = "=" * 64
    print(f"\n{bar}\nSTEP {i}/{total}: {title}\n{bar}", flush=True)


# --- voice-ref auto-discovery -------------------------------------------------
def parse_voice_spec(spec):
    name, rest = spec.split("=", 1)
    audio, text = rest.split(":", 1)
    return name.strip(), audio.strip(), text.strip()


def discover_voices(narration_path, ref_dir, extra_voices):
    """Return (reference_audio, reference_text, [(name, audio, text), ...]).

    Convention: ref/narrator_energetic.wav+.txt for the narrator,
    ref/<voice>.wav+.txt for every other voice named in narration.json.
    --voice NAME=audio:text specs override the convention per name.
    Raises LessonError naming the exact missing files.
    """
    with open(narration_path, encoding="utf-8") as f:
        segs = json.load(f)
    voices = sorted({s.get("voice", "narrator") for s in segs})

    def ref(base, ext):
        return os.path.join(ref_dir, f"{base}.{ext}")

    def need(path, what):
        if not os.path.isfile(path):
            raise LessonError(
                f"missing {what}: {path}\n"
                f"Record ~10-30s of energetic original speech (never a real "
                f"person's) plus its EXACT transcript, or override with "
                f"--voice.")

    n_audio, n_text = ref("narrator_energetic", "wav"), ref(
        "narrator_energetic", "txt")
    need(n_audio, "narrator reference audio")
    need(n_text, "narrator reference transcript")

    specs = {}  # name -> (audio, text); explicit --voice wins
    for v in voices:
        if v == "narrator":
            continue
        a, t = ref(v, "wav"), ref(v, "txt")
        missing = [p for p in (a, t) if not os.path.isfile(p)]
        if missing:
            raise LessonError(
                f"missing voice reference for '{v}':\n  " +
                "\n  ".join(missing) +
                f"\nRecord ~10-30s of energetic original speech (never a "
                f"real person's) plus its EXACT transcript, or override "
                f"with --voice {v}=audio:text")
        specs[v] = (a, t)
    for spec in extra_voices:
        name, audio, text = parse_voice_spec(spec)
        need(audio, f"--voice {name} audio")
        need(text, f"--voice {name} transcript")
        specs[name] = (audio, text)
    return n_audio, n_text, [(n, a, t) for n, (a, t) in sorted(specs.items())]


# --- ai_clip jobs -------------------------------------------------------------
def ai_clip_jobs(manifest_path):
    """[(stage, image, prompt, seed, clip, duration), ...] from ai_clips."""
    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)
    entries = manifest.get("ai_clips") or {}
    jobs = []
    for stage, spec in entries.items():
        seed = spec.get("seed")
        if not isinstance(seed, int):
            raise LessonError(
                f"ai_clips[{stage}]: seed must be an int in the manifest "
                f"(reproducibility -- the validator enforces this too)")
        for field in ("image", "prompt", "clip"):
            if not spec.get(field):
                raise LessonError(
                    f"ai_clips[{stage}]: missing field '{field}' in manifest")
        jobs.append({"stage": stage,
                     "image": spec["image"],
                     "prompt": spec["prompt"],
                     "seed": seed,
                     "clip": spec["clip"],
                     "duration": spec.get("duration", 5)})
    return jobs


def repo_path(p):
    return p if os.path.isabs(p) else os.path.join(REPO, p)


# --- step runners --------------------------------------------------------------
def run(cmd, what):
    print("$ " + " ".join(cmd), flush=True)
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        raise LessonError(
            f"{what} failed (exit {e.returncode}). Fix the error above, then "
            f"resume -- finished steps are not re-run (see --help).")


def step_tts(args, paths):
    n_audio, n_text, specs = discover_voices(
        paths["narration"], args.ref_dir, args.voice)
    cmd = [sys.executable, os.path.join(HERE, "render_narration.py"),
           "--narration", paths["narration"],
           "--audio-dir", paths["audio_dir"],
           "--reference", n_audio,
           "--reference-text", n_text]
    for name, audio, text in specs:
        cmd += ["--voice", f"{name}={audio}:{text}"]
    print(f"voices: narrator + {', '.join(n for n, _, _ in specs) or '(none)'}")
    run(cmd, "TTS narration render")


def step_clips(args, paths):
    jobs = ai_clip_jobs(paths["manifest"])
    if not jobs:
        print("no ai_clip stages in the manifest -- skipping clip generation")
        return
    made = []
    for j in jobs:
        clip = repo_path(j["clip"])
        if os.path.isfile(clip) and not args.regen_clips:
            print(f"[{j['stage']}] exists: {j['clip']} -- skipping "
                  f"(use --regen-clips to rebuild)")
            continue
        cmd = [sys.executable, os.path.join(HERE, "animate_still.py"),
               "--image", j["image"],
               "--prompt", j["prompt"],
               "--out", clip,
               "--seed", str(j["seed"]),
               "--duration", str(j["duration"])]
        print(f"[{j['stage']}] generating {j['clip']} "
              f"(seed {j['seed']}, {j['duration']}s)")
        run(cmd, f"AI clip generation [{j['stage']}]")
        made.append(j["clip"])
    if made:
        print("\nNOTE: the validator's AI-CLIP gate requires clips to be "
              "COMMITTED to git. Commit before shipping:\n  git add " +
              " ".join(made) + "\n  git commit -m \"...\"")


def step_video(args, paths):
    cmd = [sys.executable, os.path.join(HERE, "build_video.py"),
           args.lesson]
    if args.preview:
        cmd.append("--preview")
    if args.out:
        cmd += ["--out", args.out]
    run(cmd, "video build")


def step_validate(args, paths):
    cmd = [sys.executable, os.path.join(HERE, "validate_video.py"),
           paths["manifest"]]
    print("$ " + " ".join(cmd), flush=True)
    # Point the validator's rendered-frame gates at the exact MP4 this run
    # just built (matters when --out redirects the build elsewhere).
    env = dict(os.environ)
    if args.out:
        env["BUILD_LESSON_MP4"] = os.path.abspath(args.out)
    proc = subprocess.run(cmd, capture_output=True, text=True, env=env)
    sys.stdout.write(proc.stdout)
    sys.stderr.write(proc.stderr)
    if proc.returncode != 0:
        failing = [l for l in proc.stdout.splitlines()
                   if l.startswith("FAIL")]
        print("\n" + "!" * 64)
        print("VALIDATION FAILED -- the lesson does NOT ship. Failing gates:")
        for l in failing:
            print("  " + l)
        print("Fix the failures above, then resume with:\n"
              f"  python video/build_lesson.py {args.lesson} --only validate"
              + (" --preview" if args.preview else ""))
        print("!" * 64)
        sys.exit(1)
    print("validator: ALL GATES GREEN")


# --- CLI -----------------------------------------------------------------------
RESUME_HELP = """
resume patterns (a failed step never forces re-running finished ones):
  full run (5090):            python video/build_lesson.py <id>
  fast motion-approval pass:  python video/build_lesson.py <id> --preview
  TTS done, skip it:          python video/build_lesson.py <id> --skip-tts
  clips done too:             python video/build_lesson.py <id> --skip-tts --skip-ai-clips
  re-run one step only:       python video/build_lesson.py <id> --only video
  re-render one AI clip:      python video/build_lesson.py <id> --only clips --regen-clips
  after fixing validation:    python video/build_lesson.py <id> --only validate

voice references (auto-discovered under --ref-dir, default ref/):
  narrator -> ref/narrator_energetic.wav + .txt
  <voice>  -> ref/<voice>.wav + .txt   (every extra voice in narration.json)
  missing refs fail fast naming the exact files; --voice NAME=audio:text
  overrides the convention per voice.
"""


def build_parser():
    ap = argparse.ArgumentParser(
        description="One-script end-to-end APUSH lesson builder: "
                    "TTS -> AI clips -> video -> validator.",
        epilog=RESUME_HELP,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("lesson", help="lesson id, e.g. vid-u1-01")
    ap.add_argument("--preview", action="store_true",
                    help="build at 720x1280 (fast motion-approval pass)")
    ap.add_argument("--skip-tts", action="store_true",
                    help="skip narration render (already done)")
    ap.add_argument("--skip-ai-clips", action="store_true",
                    help="skip AI clip generation (already done / none)")
    ap.add_argument("--regen-clips", action="store_true",
                    help="rebuild AI clips even when the clip file exists")
    ap.add_argument("--only", choices=STEPS,
                    help="run exactly one step: tts | clips | video | validate")
    ap.add_argument("--ref-dir", default=os.path.join(REPO, "ref"),
                    help="voice reference dir (default <repo>/ref)")
    ap.add_argument("--voice", action="append", default=[],
                    help="repeatable override: NAME=ref_audio:ref_text")
    ap.add_argument("--out", default=None,
                    help="video build output path (default per manifest)")
    return ap


def main(argv=None):
    args = build_parser().parse_args(argv)

    manifest = os.path.join(HERE, "manifests", f"{args.lesson}.json")
    if not os.path.isfile(manifest):
        sys.exit(f"error: no manifest for lesson '{args.lesson}': {manifest}")
    paths = {
        "manifest": manifest,
        "narration": os.path.join(HERE, "samples", args.lesson,
                                  "narration.json"),
        "audio_dir": os.path.join(HERE, "audio", args.lesson),
    }

    steps = plan_steps(args)
    if "tts" in steps and not os.path.isfile(paths["narration"]):
        sys.exit(f"error: no narration.json for lesson '{args.lesson}': "
                 f"{paths['narration']}")

    print(f"lesson: {args.lesson}  steps: {' -> '.join(steps)}"
          + ("  [preview 720p]" if args.preview else ""), flush=True)
    runners = {"tts": step_tts, "clips": step_clips,
               "video": step_video, "validate": step_validate}
    titles = {"tts": "TTS narration (fish-speech)",
              "clips": "AI ambient clips (LTX-Video)",
              "video": "video build",
              "validate": "validator (quality gate)"}
    try:
        for i, step in enumerate(steps, 1):
            banner(i, len(steps), titles[step])
            runners[step](args, paths)
    except LessonError as e:
        sys.exit(f"error: {e}")

    print("\n" + "=" * 64)
    print(f"DONE: {args.lesson} -- ALL GATES GREEN")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    sys.exit(main())
