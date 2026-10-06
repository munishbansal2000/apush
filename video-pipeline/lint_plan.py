"""Static visual-quality lint for scene plans.

compile_scene_plan.py fail-fasts on *structural* problems (unknown slide,
missing image, bad param). This module fail-fasts on *visual* problems that
would otherwise render into a broken video:

  errors (raise PlanError, block the compile)
    - unresolved word anchors (start_anchor/end_anchor/anchor):
      run resolve_cues.py first, then lint the resolved plan
    - v2 VISUAL_DENSITY: bare DisplayHeadline scenes (no timed
      overlays — a static sub line is not enrichment), or more than 3
      unflagged DisplayHeadlines per plan — enrich the scenes or flag a
      variance ({"rule", "reason"}); flagged variances surface as warns
    - v2 SHOT_VARIATION: adjacent scenes showing the identical image
      in the identical way (same slide, same move) — vary the shot
      or merge the scenes. No variance hatch: a KenBurns move over
      the same image is always available, so repetition is never
      the only honest option
    - two overlays colliding in space AND time within one scene
    - an overlay running past its scene's end, starting before it,
      or never visible at all (starts at/past the scene end)
    - a scene shorter than SCENE_MIN_SEC (a flash, not a scene)
    - a transition as long as the scene it eats
  warns (printed, do not block)
    - pacing: more on-screen words than a viewer can read in the scene's
      duration (READ_WPM, conservative for text read while listening)
    - overlays below their don't-flash floors
    - very short scenes, transitions eating >25% of a scene

Thresholds live at the top and are deliberately tunable. Overlay screen
regions are approximations measured from slideforge/overlays.py -- good
enough to catch real collisions (two captions at once, caption+lowerthird),
not pixel-exact.

Usage:
    python3 lint_plan.py <plan.json>   # exit 0 clean, 1 warns, 2 errors
Also runs automatically inside compile_scene_plan before any frame renders.
"""

import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from compile_scene_plan import PlanError  # noqa: E402

# ---- tunable thresholds -------------------------------------------------
SCENE_MIN_SEC = 1.0        # below this a scene is certainly a bug -> error
SCENE_SHORT_WARN_SEC = 3.0  # below this a scene is suspicious -> warn
READ_WPM = 150             # on-screen text read while listening (conservative)
OVERLAY_MIN = {            # don't-flash floors, seconds -> warn
    "keywordpop": 1.2,
    "caption": 2.0,
    "lowerthird": 2.5,
    "sticker": 1.5,
    "regionglow": 1.5,
}
TRANSITION_EAT_WARN = 0.25  # warn when a transition exceeds this share
# Renderer-true defaults for omitted overlay durations (must match
# slideforge/overlays.py): collision math on anything else invents
# spans the viewer never sees.
RENDERER_DEFAULT_DUR = {"keywordpop": 3.0, "lowerthird": 3.5}
# v2 visual density (v9/v10): DisplayHeadline is for major section
# breaks only. Scenes past the cap — or bare headline scenes anywhere —
# must carry a variance (rule + reason) instead of hallucinating a
# visual. v1 plans predate the rule and are exempt.
DENSITY_HEADLINE_MAX = 3
DENSITY_RULES = ("VISUAL_DENSITY",)


def _density_errors(plan):
    """VISUAL_DENSITY: errors for unflagged violations, VARIANCE lines
    surfaced as warns for flagged ones (they want human eyes)."""
    errors, warns = [], []
    if plan.get("version") != 2:
        return errors, warns
    scenes = plan.get("scenes", [])
    heads = [(i, s) for i, s in enumerate(scenes)
             if str(s.get("slide", "")).lower() == "displayheadline"]
    unflagged = [s.get("id", "scene-%02d" % i) for i, s in heads
                 if "variance" not in s]
    if len(unflagged) > DENSITY_HEADLINE_MAX:
        errors.append(
            f"v2 VISUAL_DENSITY: {len(unflagged)} unflagged "
            f"DisplayHeadlines ({', '.join(unflagged)}) exceed "
            f"{DENSITY_HEADLINE_MAX} — enrich the scenes or flag all "
            "but 3 section breaks with a variance")
    for i, s in heads:
        sid = s.get("id", "scene-%02d" % i)
        var = s.get("variance")
        if var is not None:
            if not isinstance(var, dict):
                errors.append(f"scene '{sid}': variance must be "
                                '{"rule": ..., "reason": ...}')
                continue
            if var.get("rule") not in DENSITY_RULES:
                errors.append(
                    f"scene '{sid}': unknown variance rule "
                    f"{var.get('rule')!r} (known: "
                    f"{', '.join(DENSITY_RULES)})")
                continue
            if not isinstance(var.get("reason"), str) or \
                    not var["reason"].strip():
                errors.append(f"scene '{sid}': variance needs a "
                                "non-empty reason")
                continue
            warns.append(f"VARIANCE scene '{sid}' "
                         f"[{var['rule']}]: {var['reason']}")
            continue
        # A static sub line is not enrichment: only timed overlays
        # (cues that move with the speech) make a headline scene dense.
        bare = not (s.get("overlays") or [])
        if bare:
            errors.append(
                f"scene '{sid}': bare DisplayHeadline (no timed "
                "overlays) violates VISUAL_DENSITY — add cues or "
                "flag a variance")
    return errors, warns


# v2 shot variation (v10): consecutive scenes may not show the identical
# image in the identical way. A hold followed by a push (Image -> KenBurns
# over the same image) is a shot change and passes; only exact repeats fail.
SHOT_SLIDES = ("imageslide", "kenburnsslide", "calloutslide")


def _shot_signature(spec):
    """(slide, image, move) for image-led slides, else None.

    The move element captures what makes the shot distinct: KenBurns
    stops, CalloutSlide callouts, nothing for a static ImageSlide."""
    slide = str(spec.get("slide", "")).lower()
    if slide not in SHOT_SLIDES:
        return None
    params = spec.get("params") or {}
    image = params.get("image")
    if not image:
        return None
    if slide == "kenburnsslide":
        move = json.dumps(params.get("stops"), sort_keys=True,
                          default=str)
    elif slide == "calloutslide":
        move = json.dumps(params.get("callouts"), sort_keys=True,
                          default=str)
    else:
        move = ""
    return (slide, str(image).lower(), move)


def _sequence_errors(plan):
    """SHOT_VARIATION: errors for adjacent identical shots. v2 only."""
    errors = []
    if plan.get("version") != 2:
        return errors
    scenes = plan.get("scenes", [])
    prev_sig, prev_sid = None, None
    for i, spec in enumerate(scenes):
        sid = spec.get("id", "scene-%02d" % i)
        sig = _shot_signature(spec)
        if sig is not None and sig == prev_sig:
            errors.append(
                f"scene '{sid}': SHOT_VARIATION — same "
                f"{spec.get('slide')} of {sig[1]} as previous scene "
                f"'{prev_sid}'; vary the shot (KenBurns move, "
                "different callouts) or merge the scenes")
        if sig is not None:
            prev_sig, prev_sid = sig, sid
        else:
            prev_sig, prev_sid = None, None
    return errors


def _anchor_sites(spec):
    """Where-clauses for unresolved anchor keys in one scene."""
    sites = []
    for key in ("start_anchor", "end_anchor"):
        if key in spec:
            sites.append(key)
    for idx, ov in enumerate(spec.get("overlays") or []):
        if isinstance(ov, dict) and "anchor" in ov:
            sites.append("overlays[%d].anchor" % idx)
    params = spec.get("params") or {}
    for idx, p in enumerate(params.get("panels") or []):
        if isinstance(p, dict) and "anchor" in p:
            sites.append("panels[%d].anchor" % idx)
    for idx, p in enumerate(params.get("points") or []):
        if isinstance(p, dict) and "anchor" in p:
            sites.append("points[%d].anchor" % idx)
    return sites
# -------------------------------------------------------------------------

# Approximate screen regions as (x0, y0, x1, y1) fractions of frame size,
# measured from slideforge/overlays.py. Boxes are worst-case: the caption
# is assumed full-width, so a caption and a lowerthird overlapping in
# time always collide — stagger them even when a short caption would fit.
def _overlay_region(spec):
    otype = str(spec.get("type", "")).lower()
    if otype == "caption":
        return (0.10, 0.80, 0.90, 0.97)          # bottom-centered pill
    if otype == "lowerthird":
        return (0.02, 0.70, 0.55, 0.98)          # bottom-left card
    if otype == "keywordpop":
        pos = str(spec.get("position", "right")).lower()
        if pos == "left":
            return (0.03, 0.22, 0.45, 0.42)
        if pos == "center":
            return (0.30, 0.22, 0.70, 0.42)
        return (0.55, 0.22, 0.97, 0.42)          # right (default)
    if otype in ("sticker", "regionglow"):
        x, y = spec.get("at", (0.5, 0.5))
        s = float(spec.get("size", 0.3))
        return (x - s / 2, y - s / 2, x + s / 2, y + s / 2)
    return None


def _regions_overlap(a, b):
    return not (a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1])


def _is_path_string(s):
    """Heuristic: is this string a file path rather than on-screen text?

    Any string with whitespace is prose (paths in plans never have spaces
    that matter here); otherwise it is a path only with a media extension
    or clear path shape, so "and/or" still counts as words.
    """
    t = s.strip()
    if t.lower().endswith(
            (".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov")):
        return True
    if not t or any(c.isspace() for c in t):
        return False
    return (t.count("/") >= 2 or t.startswith(("./", "/", "~", ".."))
            or "\\" in t or (len(t) > 2 and t[0].isalpha() and t[1] == ":"))


def _count_words(obj):
    """Words of human-readable text in a params structure (paths excluded)."""
    if isinstance(obj, dict):
        return sum(_count_words(v) for k, v in obj.items()
                   if k != "bg")
    if isinstance(obj, (list, tuple)):
        return sum(_count_words(v) for v in obj)
    if isinstance(obj, str) and not _is_path_string(obj):
        return len(obj.split())
    return 0


def lint_plan(plan):
    """Return (errors, warns). Errors are PlanError-ready strings."""
    errors, warns = [], []
    scenes = plan.get("scenes", [])
    for i, spec in enumerate(scenes):
        sid = spec.get("id", f"scene-{i:02d}")
        sites = _anchor_sites(spec)
        if sites:
            errors.append(
                f"scene '{sid}': unresolved anchor keys "
                f"({', '.join(sites)}) \u2014 run resolve_cues.py "
                f"first, then lint the resolved plan")
    if errors:
        return errors, warns

    if plan.get("version") == 2:
        # v2 partitions absolute time: scene 0 at 0.0, each scene
        # starts where the previous ended. Gaps/overlaps >= 1 frame
        # are A/V desync (the compiler rejects them too).
        frame = 1.0 / 30
        expected = 0.0
        for i, spec in enumerate(scenes):
            sid = spec.get("id", f"scene-{i:02d}")
            start = spec.get("start_sec")
            if (not isinstance(start, (int, float))
                    or isinstance(start, bool) or start < 0):
                errors.append(
                    f"scene '{sid}': v2 needs 'start_sec' >= 0")
                start = expected
            drift = start - expected
            if abs(drift) >= frame:
                kind = "gap" if drift > 0 else "overlap"
                errors.append(
                    f"scene '{sid}': timeline {kind} "
                    f"{abs(drift):.3f}s (starts at {start:.3f}s, "
                    f"previous ended at {expected:.3f}s)")
            expected = start + float(spec.get("duration_sec", 0))

    def scene_dur(i):
        return float(scenes[i].get("duration_sec", 0))

    density_errors, density_warns = _density_errors(plan)
    errors.extend(density_errors)
    warns.extend(density_warns)

    errors.extend(_sequence_errors(plan))

    for i, spec in enumerate(scenes):
        sid = spec.get("id", f"scene-{i:02d}")
        dur = scene_dur(i)

        if dur < SCENE_MIN_SEC:
            errors.append(
                f"scene '{sid}': {dur}s is below the {SCENE_MIN_SEC}s floor")
        elif dur < SCENE_SHORT_WARN_SEC:
            warns.append(
                f"scene '{sid}': {dur}s is very short for a scene")

        # pacing: can a viewer read everything on screen in time?
        words = _count_words(spec.get("params", {}))
        for ov in spec.get("overlays", []) or []:
            # caption=text, keywordpop=word, sticker/regionglow=label,
            # lowerthird=name+role
            words += _count_words({k: v for k, v in ov.items()
                                   if k in ("text", "word", "label",
                                            "name", "role")})
        need = words / READ_WPM * 60
        if words >= 8 and need > dur:
            warns.append(
                f"scene '{sid}': ~{words} on-screen words need ~{need:.0f}s "
                f"at {READ_WPM}wpm but the scene is {dur:.0f}s")

        # overlays: fit, floors, collisions
        resolved = []
        for idx, ov in enumerate(spec.get("overlays", []) or []):
            otype = str(ov.get("type", "")).lower()
            start = float(ov.get("start", 0))
            odur = ov.get("duration")
            if odur is None:
                default = RENDERER_DEFAULT_DUR.get(otype)
                odur = dur - start if default is None \
                    else min(default, dur - start)
            odur = float(odur)
            if start < 0:
                errors.append(
                    f"scene '{sid}': overlay #{idx} ({otype}) "
                    f"starts at {start:.1f}s (before the scene starts)")
            elif odur <= 0 or start >= dur:
                errors.append(
                    f"scene '{sid}': overlay #{idx} ({otype}) "
                    f"[{start:.1f},{start + odur:.1f}]s is never visible "
                    f"in the {dur:.1f}s scene")
            elif start + odur > dur + 1e-9:
                errors.append(
                    f"scene '{sid}': overlay #{idx} ({otype}) "
                    f"[{start:.1f},{start + odur:.1f}]s runs past the "
                    f"{dur:.1f}s scene")
            floor = OVERLAY_MIN.get(otype)
            if floor and 0 < odur < floor:
                warns.append(
                    f"scene '{sid}': overlay #{idx} ({otype}) shows "
                    f"{odur:.1f}s (under the {floor}s don't-flash floor)")
            region = _overlay_region(ov)
            if region:
                for j, (oregion, ostart, oend, oidx) in enumerate(resolved):
                    if (start < oend and ostart < start + odur
                            and _regions_overlap(region, oregion)):
                        errors.append(
                            f"scene '{sid}': overlay #{idx} ({otype}) "
                            f"collides on screen with overlay #{oidx} "
                            f"[{ostart:.1f},{oend:.1f}]s vs "
                            f"[{start:.1f},{start + odur:.1f}]s")
                resolved.append((region, start, start + odur, idx))

        # transitions must not eat their scenes
        trans_dur = float(spec.get("trans_dur", 0) or 0)
        if i > 0 and trans_dur > 0:
            shorter = min(dur, scene_dur(i - 1))
            if shorter > 0:
                if trans_dur >= shorter:
                    errors.append(
                        f"scene '{sid}': transition {trans_dur}s >= "
                        f"shortest adjacent scene {shorter}s")
                elif trans_dur / shorter > TRANSITION_EAT_WARN:
                    warns.append(
                        f"scene '{sid}': transition {trans_dur}s eats "
                        f"{trans_dur / shorter:.0%} of a {shorter}s scene")
    return errors, warns


def main(argv):
    if not argv:
        print("usage: python3 lint_plan.py <plan.json>", file=sys.stderr)
        return 2
    try:
        with open(argv[0], encoding="utf-8") as f:
            plan = json.load(f)
    except OSError as e:
        print(f"ERROR: cannot read {argv[0]!r}: {e}", file=sys.stderr)
        return 2
    except json.JSONDecodeError as e:
        print(f"ERROR: invalid JSON in {argv[0]!r}: {e}", file=sys.stderr)
        return 2
    errors, warns = lint_plan(plan)
    for w in warns:
        print(f"WARN: {w}")
    for e in errors:
        print(f"ERROR: {e}", file=sys.stderr)
    if errors:
        return 2
    return 1 if warns else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
