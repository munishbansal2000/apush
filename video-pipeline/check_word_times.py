#!/usr/bin/env python3
"""Enforce word-anchored timing: no estimated cues, ever.

The director decides WHERE topics shift (semantic work). This checker
verifies every timed claim in its plan against MEASURED word times:

  1. v2 scene start_sec (except 0.0) equals a measured word start.
  2. Every scene word_times entry names a recognized word at the
     claimed time (catches stale/copied word times).
  3. Every StaggerSlide panel `at` equals a word_times value in its
     scene (cues come from measurement, not judgment).
  4. Every keywordpop overlay starts within ~1s after its term is
     spoken in the covered span.

Vosk mishears some words ("maize"->"mais", "planes" for "plains").
Record those in a JSON aliases file {"maize": "mais"} — explicit and
reviewable, not fuzzy matching.

Usage:
    python check_word_times.py <plan.json> <timings.json>
        <word_times.json> [--aliases aliases.json]

Exit 0 clean, 1 with ERROR lines (lint-style).
"""
import json
import os
import re
import sys

TIME_TOL = 0.05   # cue/word-time agreement (both rounded to 0.01s)
POP_WINDOW = 1.0  # keywordpop must follow its term within ~1s


def _norm(text):
    text = text.lower()
    text = re.sub(r"[^a-z0-9 ]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _word_index(timings, word_times):
    """[(word, abs_start, turn_id)] for the whole episode."""
    idx = []
    for t in timings.get("turns", []):
        tid = os.path.splitext(t.get("file", ""))[0]
        for w in word_times.get(tid, []):
            idx.append((w["word"].lower(),
                        round(t["start"] + w["start"], 3), tid))
    return idx


def _scene_starts(plan):
    """scene_id -> absolute start sec (v1 cumulative, v2 start_sec)."""
    starts, acc = {}, 0.0
    v2 = plan.get("version") == 2
    for s in plan.get("scenes", []):
        starts[s["id"]] = float(s["start_sec"]) if v2 else acc
        acc = starts[s["id"]] + float(s["duration_sec"])
    return starts


def check(plan, timings, word_times, aliases=None):
    aliases = {_norm(k): _norm(v) for k, v in (aliases or {}).items()
                 if not k.startswith("_")}
    errors = []
    idx = _word_index(timings, word_times)
    starts = _scene_starts(plan)
    v2 = plan.get("version") == 2

    def nearest(abs_t):
        return min(idx, key=lambda w: abs(w[1] - abs_t)) if idx else None

    for s in plan.get("scenes", []):
        sid = s["id"]
        base = starts[sid]
        dur = float(s["duration_sec"])
        slide = str(s.get("slide", "")).lower()
        wt = s.get("word_times") or {}

        # 1. v2 scene starts are word-anchored.
        if v2 and base > 0:
            hit = nearest(base)
            if hit is None or abs(hit[1] - base) > TIME_TOL:
                detail = (f"nearest '{hit[0]}'@{hit[1]:.2f}s" if hit
                          else "no words measured")
                errors.append(
                    f"scene '{sid}': start_sec={base:.2f}s matches no "
                    f"measured word start ({detail})")

        # 2. word_times entries are honest.
        for word, claimed in wt.items():
            if word == "note":
                continue
            want = base + float(claimed)
            heard = aliases.get(_norm(word), _norm(word))
            cands = [w for w in idx if w[0] == heard
                     and abs(w[1] - want) <= 0.15]
            if not cands:
                near = [w for w in idx if w[0] == heard]
                detail = ""
                if near:
                    best = min(near, key=lambda w: abs(w[1] - want))
                    detail = (f"; nearest '{heard}'@{best[1]:.2f}s "
                              f"({best[2]})")
                errors.append(
                    f"scene '{sid}': word_times['{word}']={claimed}s "
                    f"(abs {want:.2f}s) matches no measured "
                    f"'{heard}'{detail}")

        # 3. stagger cues equal word_times values.
        if slide == "staggerslide":
            if not [k for k in wt if k != "note"]:
                errors.append(
                    f"scene '{sid}': StaggerSlide cues with no "
                    f"word_times basis (estimates forbidden)")
            else:
                vals = [float(v) for k, v in wt.items() if k != "note"]
                for p in s.get("params", {}).get("panels", []):
                    if min(abs(p["at"] - v) for v in vals) > TIME_TOL:
                        errors.append(
                            f"scene '{sid}': panel '{p.get('label')}' "
                            f"at={p['at']}s matches no word_times value")

        # 4. keywordpops follow their spoken term.
        for ov in s.get("overlays", []) or []:
            if str(ov.get("type", "")).lower() != "keywordpop":
                continue
            cue = base + float(ov.get("start", 0))
            phrase = _norm(str(ov.get("word", "")))
            words = phrase.split()
            # aliases map intended->heard ("maize"->"mais"): translate
            # the phrase side, compare against the raw heard stream.
            heard = [aliases.get(w, w) for w in words]
            best = None
            for i in range(len(idx)):
                seq = [w[0] for w in idx[i:i + len(words)]]
                if seq == heard:
                    dt = cue - idx[i][1]
                    if best is None or abs(dt) < abs(best):
                        best = dt
            if best is None:
                errors.append(
                    f"scene '{sid}': keywordpop '{ov.get('word')}' "
                    f"never spoken in the episode")
            elif not -0.25 <= best <= POP_WINDOW:
                errors.append(
                    f"scene '{sid}': keywordpop '{ov.get('word')}' "
                    f"cue {cue:.2f}s is {best:+.2f}s from its term "
                    f"(must follow within ~{POP_WINDOW:.0f}s)")
    return errors


def main(argv):
    args = list(argv)
    if len(args) < 3 or "-h" in args or "--help" in args:
        sys.exit(__doc__)
    plan_path, timings_path, words_path = args[:3]
    aliases = None
    if "--aliases" in args:
        aliases = _load(args[args.index("--aliases") + 1])
    errors = check(_load(plan_path), _load(timings_path),
                   _load(words_path), aliases)
    for e in errors:
        print(f"ERROR: {e}")
    if errors:
        print(f"{len(errors)} word-timing error(s)", file=sys.stderr)
        return 1
    print("word times OK: every cue anchored to measurement")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
