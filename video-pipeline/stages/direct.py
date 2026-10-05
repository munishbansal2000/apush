"""Stage: direct.

Run the LLM director: dialogue turns + asset manifest -> work/scene_plan.json
(the reviewable artifact). The compiler (next stage) renders it; no model
calls happen at render time.

Turn text comes from <episode>/script_turns.json when present
([{"speaker", "text"}]); otherwise turn ids from timings.json are used as
placeholders and the director works from durations alone.

Provider "agent" (default) is the human-in-the-loop: it writes
work/director_prompt.txt and, if work/scene_plan.json does not exist yet,
stops with instructions — write/edit the plan, then re-run with
--only direct,slideforge_render,assemble,verify.
"""
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, os.pardir))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import director as director_mod  # noqa: E402
from stages.plan_path import resolve_plan  # noqa: E402


def _load_turns(ep_dir):
    work = os.path.join(ep_dir, "work")
    timings_path = os.path.join(work, "timings.json")
    if not os.path.exists(timings_path):
        raise RuntimeError("timings.json missing — run the timing stage first")
    with open(timings_path, encoding="utf-8") as f:
        timings = json.load(f)

    script_path = os.path.join(ep_dir, "script_turns.json")
    texts = {}
    if os.path.exists(script_path):
        with open(script_path, encoding="utf-8") as f:
            for i, t in enumerate(json.load(f)):
                texts[f"t{i:02d}"] = t

    # Load measured word times (from wordtiming stage) if present
    wt_path = os.path.join(work, "word_times.json")
    word_times = {}
    if os.path.exists(wt_path):
        with open(wt_path, encoding="utf-8") as f:
            word_times = json.load(f)

    turns = []
    for t in timings["turns"]:
        tid = t["turn"]
        src = texts.get(tid, {})
        turns.append({
            "speaker": src.get("speaker", tid),
            "text": src.get("text", f"[{tid} narration]"),
            "duration_sec": t["dur"],
            "word_times": word_times.get(tid, []),
        })
    return turns


def _load_manifest(ep_dir, cfg):
    manifest_path = os.path.join(ep_dir, cfg.get("manifest", "manifest.json"))
    if os.path.exists(manifest_path):
        with open(manifest_path, encoding="utf-8") as f:
            return json.load(f)
    return []


def run(ep_dir, cfg, provider="agent", plan_file=None):
    work = os.path.join(ep_dir, "work")
    os.makedirs(work, exist_ok=True)
    episode = cfg.get("episode", os.path.basename(ep_dir))
    turns = _load_turns(ep_dir)
    manifest = _load_manifest(ep_dir, cfg)
    recipe = _load_recipe(ep_dir)

    prompt_path = os.path.join(work, "director_prompt.txt")
    with open(prompt_path, "w", encoding="utf-8") as f:
        f.write(director_mod.build_prompt(episode, turns, manifest,
                                         recipe=recipe))
    print(f"direct: prompt written to {prompt_path}", flush=True)

    plan_path, source = resolve_plan(ep_dir)
    if provider == "agent" and not plan_file:
        if source != "missing":
            with open(plan_path, encoding="utf-8") as f:
                plan = json.load(f)
            if plan.get("version") != 1:
                raise RuntimeError(f"{plan_path} is not a v1 scene plan")
            _validate_plan_durations(plan, turns, recipe)
            print(f"direct: using {source} plan ({len(plan['scenes'])} "
                  f"scenes): {plan_path}", flush=True)
            return plan_path
        raise RuntimeError(
            "direct: no scene plan yet. Put the reviewed plan at "
            f"{os.path.join(ep_dir, 'scene_plan.json')} or write one to "
            f"{plan_path} (schema: scene_plan_schema.json), then re-run "
            "with --only direct,slideforge_render,assemble,verify")

    plan = director_mod.direct(
        episode, turns, manifest, provider=provider,
        plan_file=plan_file or None)
    # Generated plans always land in the working copy — never overwrite
    # the reviewed episode-root plan via the fallback path.
    # Validate: every scene duration must match its turns' measured durations
    # within 1 frame (0.033s). Reject the plan if not — do not render bad sync.
    _validate_plan_durations(plan, turns, recipe)
    plan_path = os.path.join(work, "scene_plan.json")
    with open(plan_path, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=1)
    print(f"direct: {len(plan['scenes'])} scenes -> {plan_path}", flush=True)
    return plan_path


def _load_recipe(ep_dir):
    """gap/offset/tail from work/timings.json (0s when absent).

    The model MUST match compile_scene_plan.py's measured-timing gate:
    D[0] = offset + Σ(dur+gap); D[i] = Σ(dur+gap); D[last] += tail.
    A validator that ignores the recipe rejects correctly-refitted plans
    (and accepts ones the compiler will refuse) whenever gaps are nonzero.
    """
    tp = os.path.join(ep_dir, "work", "timings.json")
    try:
        with open(tp, encoding="utf-8") as f:
            tj = json.load(f)
    except (OSError, ValueError):
        return {"gap": 0.0, "offset": 0.0, "tail": 0.0}
    return {"gap": float(tj.get("gap", 0)),
            "offset": float(tj.get("offset", 0)),
            "tail": float(tj.get("tail", 0))}


def _validate_plan_durations(plan, turns, recipe):
    """Reject scene plans with estimated durations.

    Every scene's duration_sec must equal its turns' measured durations
    under the episode's audio recipe (offset/gap/tail from timings.json),
    within 1 frame. Same model as compile_scene_plan.py's measured-timing
    gate — the two validators must never disagree.
    """
    FPS = 30
    gap, offset, tail = recipe["gap"], recipe["offset"], recipe["tail"]
    scenes = plan.get("scenes", [])
    errors = []
    for i, s in enumerate(scenes):
        lo, hi = s["turns"][0], s["turns"][1]
        expected = (sum(turns[j]["duration_sec"] for j in range(lo, hi + 1))
                    + gap * (hi - lo + 1)
                    + (offset if i == 0 else 0)
                    + (tail if i == len(scenes) - 1 else 0))
        actual = s["duration_sec"]
        drift = abs(actual - expected)
        if drift >= 1 / FPS:
            errors.append(
                f"{s['id']}: duration {actual:.3f}s != expected "
                f"{expected:.3f}s (offset={offset} gap={gap} tail={tail}; "
                f"drift {drift:.3f}s >= 1 frame)")
        # Also validate segments if present
        if "segments" in s:
            seg_sum = sum(g["duration_sec"] for g in s["segments"])
            if abs(seg_sum - actual) >= 1 / FPS:
                errors.append(
                    f"{s['id']}: segments sum {seg_sum:.3f}s != "
                    f"scene duration {actual:.3f}s")
    if errors:
        raise RuntimeError(
            "direct: scene plan REJECTED — duration mismatches:\n" +
            "\n".join(errors) +
            "\nCopy durations EXACTLY from the turn list. Do not estimate.")
