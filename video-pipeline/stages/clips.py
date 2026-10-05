"""Stage: clips. Generate AI ambient clips for beats carrying anim_prompt.

Ports video_pipeline/pipeline/clips.py (provider routing, safety gate,
duration shaping + verification, provenance) to the beats flow. Runs
between anim (prompt files) and render (clip pickup).

Config: beats.json top-level "clip_generation":
  {"provider": "none"|"ltx"|"meta-ui"|"ltx-desktop",
   "fallback_provider": ..., ...provider options...}
Per-beat overrides: beat["provider"], beat["fallback_provider"],
beat["seed"] (default 42).

Stills: kb beats resolve beat["image"] via images.json; any beat may set
"anim_image" (episode-relative or absolute path) instead.

Providers:
  ltx         local diffusers LTX-Video via video/animate_still.py (5090)
  meta-ui     Meta UI video generation via the node bridge (needs cookie)
  ltx-desktop local LTX Desktop app server (serves beats up to ~11s)
  none        (default) keep manual renders; beats without a finished
              clip are left for the render stage's Ken Burns fallback.

Writes: <episode>/clips/<bid>.mp4 + clips/MANIFEST.json provenance.

Incremental: an existing clip is reused only when it is still valid
(ffprobe-readable, not short of its beat) and its MANIFEST fingerprint
(prompt/seed/seconds/still) matches the current beat. Missing, corrupt,
short, or stale clips are regenerated. With provider "none" a valid
existing clip is kept (there is nothing to rebuild it with); an
unusable one is left for the render stage's Ken Burns fallback.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.dirname(os.path.dirname(_HERE))

# LTX generation caps at ~6s per call; longer beats are extended by looping.
LTX_GEN_SECONDS = 6.0
# A finished clip this far short of its beat is a generation failure.
SHORT_TOLERANCE_SEC = 0.75


def _run(command, label):
    print("$ " + " ".join(command), flush=True)
    try:
        subprocess.run(command, check=True)
    except (OSError, subprocess.CalledProcessError) as exc:
        raise RuntimeError(f"[clips] {label} failed: {exc}") from exc


def _ffprobe_duration(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)], text=True)
    return float(out.strip())


def _extend_clip(source, output, seconds):
    _run(["ffmpeg", "-y", "-v", "error", "-stream_loop", "-1",
          "-i", str(source), "-t", str(seconds), "-an", "-c:v", "libx264",
          "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output)],
         "LTX clip extension")


def _generate_ltx(image, prompt, output, seconds, seed, python):
    generated_seconds = min(LTX_GEN_SECONDS, seconds)
    temp = output.with_name(f".{output.stem}.ltx-source.mp4")
    try:
        _run([python,
              os.path.join(_REPO_ROOT, "video", "animate_still.py"),
              "--image", str(image), "--prompt", prompt,
              "--out", str(temp), "--duration", str(generated_seconds),
              "--seed", str(seed)],
             "local LTX image-to-video generation")
        if seconds > generated_seconds + 0.05:
            _extend_clip(temp, output, seconds)
        else:
            output.parent.mkdir(parents=True, exist_ok=True)
            os.replace(temp, output)
    finally:
        if temp.exists():
            temp.unlink()


def _generate_meta(image, prompt, output, seconds, config):
    bridge = os.path.join(_REPO_ROOT, "video_pipeline", "tools",
                          "meta_video_bridge.js")
    cookie = config.get("cookie") or os.environ.get("LLM_UI_COOKIE")
    if not cookie:
        raise RuntimeError("[clips] Meta UI video generation requires "
                           "clip_generation.cookie or LLM_UI_COOKIE")
    lib_dir = config.get(
        "lib_dir",
        r"C:\Users\munis\projects\sat_question_runner\new_eng_qs\lib")
    command = ["node", bridge, "--image", str(image), "--prompt", prompt,
               "--out", str(output), "--duration", str(seconds),
               "--cookie", str(cookie), "--lib-dir", str(lib_dir),
               "--browser", config.get("browser", "chrome"),
               "--timeout-ms",
               str(int(config.get("timeout_seconds", 1200)) * 1000),
               "--refusal-retries",
               str(int(config.get("meta_refusal_retries", 1)))]
    if config.get("keep_open_on_failure", False):
        command.append("--keep-open-on-failure")
    _run(command, "Meta UI image-to-video generation")


def _generate_desktop(image, prompt, output, seconds, seed, config):
    if _REPO_ROOT not in sys.path:
        sys.path.insert(0, _REPO_ROOT)
    try:
        from video_pipeline.pipeline import ltx_desktop
    except ImportError as exc:
        raise RuntimeError(f"[clips] cannot load LTX Desktop backend: {exc}")
    ltx_desktop.generate(image, prompt, output, seconds, seed, config)


def _check_prompt_safety(prompt, bid):
    """Enforce the ambient-motion-only contract before any provider call."""
    sys.path.insert(0, os.path.join(_REPO_ROOT, "video"))
    try:
        from animate_still import check_prompt_safety
    except ImportError as exc:
        raise RuntimeError(f"[clips] cannot load prompt safety filter: {exc}")
    ok, detail = check_prompt_safety(prompt)
    if not ok:
        raise RuntimeError(f"[clips] ai_clip prompt rejected for beat "
                           f"{bid}: {detail}")


def _resolve_still(beat, images, ep_dir):
    """Still image path for image-to-video, or None when the beat has none.

    Explicit beat["anim_image"] wins; kb beats fall back to their images.json
    entry. Returns None only for non-kb beats without anim_image (nothing to
    animate); kb beats without a resolvable still are a plan bug.
    """
    override = beat.get("anim_image")
    if override:
        p = override if os.path.isabs(override) else os.path.join(ep_dir, override)
        if not os.path.isfile(p):
            raise RuntimeError(f"[clips] beat {beat['id']}: anim_image not "
                               f"found: {override}")
        return p
    if beat.get("kind") == "kb":
        entry = images.get(beat.get("image"), {})
        rel = entry.get("file", "")
        p = rel if os.path.isabs(rel) else os.path.join(ep_dir, rel)
        if not rel or not os.path.isfile(p):
            raise RuntimeError(f"[clips] beat {beat['id']}: kb still "
                               f"{rel!r} not found on disk")
        return p
    return None


def _clip_valid(output, seconds):
    """(usable, actual_seconds): probeable and not short of its beat."""
    try:
        actual = _ffprobe_duration(output)
    except (OSError, subprocess.CalledProcessError, ValueError):
        return False, 0.0
    return actual >= seconds - SHORT_TOLERANCE_SEC, actual


def _still_key(beat, images, ep_dir):
    """Episode-relative still identity, or None. Same precedence as
    _resolve_still but without existence checks, so fingerprinting never
    changes what resolves (or raises) on the regenerate path."""
    override = beat.get("anim_image")
    if override:
        p = override if os.path.isabs(override) \
            else os.path.join(ep_dir, override)
        return os.path.relpath(p, ep_dir)
    if beat.get("kind") == "kb":
        rel = images.get(beat.get("image"), {}).get("file", "")
        if not rel:
            return None
        p = rel if os.path.isabs(rel) else os.path.join(ep_dir, rel)
        return os.path.relpath(p, ep_dir)
    return None


def _fingerprint_matches(old, prompt, seed, seconds, still_key):
    """True when a prior MANIFEST record matches the current inputs.

    A missing record (hand-placed clip, first run) counts as a match:
    never destroy manual work silently. The new MANIFEST adopts the
    fingerprint, so the next run compares for real. Records predating
    the image field compare on prompt/seed/seconds only.
    """
    if not old:
        return True
    if old.get("prompt") != prompt:
        return False
    if old.get("seed") != seed:
        return False
    try:
        if abs(float(old.get("seconds", -1)) - seconds) > 1e-6:
            return False
    except (TypeError, ValueError):
        return False
    if "image" in old and old.get("image") != still_key:
        return False
    return True


def generate_clips(beats, images, ep_dir, cfg, provider_override="manifest",
                   ltx_python=None, force=False, dry_run=False,
                   prior=None):
    """Generate clips for beats carrying anim_prompt. Returns MANIFEST records."""
    prior = prior or {}
    config = dict(cfg.get("clip_generation", {}))
    provider = (provider_override if provider_override != "manifest"
                else config.get("provider", "none"))
    python = ltx_python or config.get("ltx_python") or sys.executable
    clips_dir = os.path.join(ep_dir, "clips")
    os.makedirs(clips_dir, exist_ok=True)
    records = []

    jobs = [b for b in beats if b.get("anim_prompt")]
    if not jobs:
        print("[clips] no anim_prompt beats -- skipped", flush=True)
        return records

    for beat in jobs:
        bid = beat["id"]
        prompt = beat["anim_prompt"].strip()
        seconds = float(beat["dur"])
        seed = int(beat.get("seed", 42))
        output = Path(clips_dir) / f"{bid}.mp4"
        record = {"beat": bid, "clip": os.path.join("clips", f"{bid}.mp4"),
                  "seconds": seconds, "seed": seed, "prompt": prompt}

        beat_provider = (provider if provider_override != "manifest"
                         else beat.get("provider", provider))
        fallback = beat.get("fallback_provider",
                            config.get("fallback_provider"))
        have_file = output.is_file() and not force
        valid, actual = _clip_valid(output, seconds) \
            if output.is_file() else (False, 0.0)
        old = prior.get(bid) or {}
        known = bool(old)
        fresh = _fingerprint_matches(old, prompt, seed, seconds,
                                     _still_key(beat, images, ep_dir))
        if have_file and valid and fresh:
            if known:
                print(f"[clips] {bid}: up to date -- skipped", flush=True)
            else:
                print(f"[clips] {bid}: no provenance -- keeping existing "
                      f"clip and adopting its fingerprint", flush=True)
            record.update({"ready": True, "provider": "existing",
                           "actual_seconds": round(actual, 2)})
            if known and "image" in old:
                record["image"] = old["image"]
            elif not known:
                key = _still_key(beat, images, ep_dir)
                if key is not None:
                    record["image"] = key
            records.append(record)
            continue
        if have_file and not valid:
            print(f"[clips] {bid}: existing clip is unusable "
                  f"(unprobeable or short) -- rebuilding", flush=True)
        elif have_file and not fresh:
            if beat_provider == "none":
                print(f"[clips] {bid}: inputs changed but no provider "
                      f"configured -- keeping existing clip", flush=True)
                record.update({"ready": True, "provider": "existing",
                               "actual_seconds": round(actual, 2),
                               "stale": True})
                if "image" in old:
                    record["image"] = old["image"]
                records.append(record)
                continue
            print(f"[clips] {bid}: inputs changed -- rebuilding",
                  flush=True)

        if beat_provider == "none":
            print(f"[clips] {bid}: no provider and no finished clip -- "
                  f"render stage will use the Ken Burns fallback", flush=True)
            record.update({"ready": valid,
                           "skipped": "no provider configured",
                           "provider": "none"})
            records.append(record)
            continue

        _check_prompt_safety(prompt, bid)
        image = _resolve_still(beat, images, ep_dir)
        if image is None:
            print(f"[clips] {bid}: non-kb beat without anim_image -- "
                  f"nothing to animate, skipped", flush=True)
            record.update({"ready": False,
                           "skipped": "no still image",
                           "provider": beat_provider})
            records.append(record)
            continue
        record["image"] = os.path.relpath(image, ep_dir)

        print(f"[clips] {bid}: {beat_provider}, {seconds:g}s", flush=True)
        if dry_run:
            record.update({"ready": False, "provider": beat_provider,
                           "dry_run": True})
            records.append(record)
            continue

        image_p, output_p = Path(image), Path(output)

        def generate(selected):
            if selected == "ltx":
                _generate_ltx(image_p, prompt, output_p, seconds, seed, python)
            elif selected == "meta-ui":
                _generate_meta(image_p, prompt, output_p, seconds, config)
            elif selected == "ltx-desktop":
                _generate_desktop(image_p, prompt, output_p, seconds, seed,
                                  config)
            else:
                raise RuntimeError(f"[clips] unsupported video generator: "
                                   f"{selected}")

        used = beat_provider
        try:
            generate(beat_provider)
        except RuntimeError:
            if not fallback or fallback == beat_provider:
                raise
            print(f"[clips] {bid}: {beat_provider} failed; trying {fallback}",
                  flush=True)
            used = fallback
            generate(fallback)
        if used != beat_provider:
            record["fallback_from"] = beat_provider
        try:
            actual = _ffprobe_duration(output_p)
        except (OSError, subprocess.CalledProcessError, ValueError) as exc:
            raise RuntimeError(f"[clips] generated clip is not probeable: "
                               f"{output} ({exc})")
        if actual < seconds - SHORT_TOLERANCE_SEC:
            raise RuntimeError(
                f"[clips] video generator returned only {actual:.2f}s for "
                f"{bid}; requested {seconds:.2f}s")
        record.update({"provider": used, "actual_seconds": round(actual, 2),
                       "ready": True})
        records.append(record)
    return records


def run(ep_dir, cfg, force=False):
    """Stage entry point: read beats + images, generate, write MANIFEST."""
    with open(os.path.join(ep_dir, "work", "beats_resolved.json"),
              encoding="utf-8") as f:
        beats = json.load(f)["beats"]
    images = {}
    ipath = os.path.join(ep_dir, "images.json")
    if os.path.exists(ipath):
        with open(ipath, encoding="utf-8") as f:
            images = json.load(f).get("images", {})
    manifest_path = os.path.join(ep_dir, "clips", "MANIFEST.json")
    prior = {}
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, encoding="utf-8") as f:
                prior = {r["beat"]: r for r in json.load(f)}
        except (OSError, ValueError, KeyError, TypeError):
            prior = {}
    records = generate_clips(beats, images, ep_dir, cfg, force=force,
                             prior=prior)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=1)
    ready = sum(1 for r in records if r.get("ready"))
    print(f"clips: {len(records)} anim beats, {ready} clips ready "
          f"(manifest: {manifest_path})", flush=True)
    return os.path.join(ep_dir, "clips")
