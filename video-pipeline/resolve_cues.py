#!/usr/bin/env python3
"""Resolve word-anchored cues to measured seconds (v2 plans only).

The director declares intent ("pop 'mercantilism' when spoken"); this
tool does the arithmetic from MEASURED word times. Nobody — human or
LLM — hand-computes cue seconds anymore, so cue drift is structurally
impossible instead of checker-policed.

Anchored inputs (all stripped from the resolved output):
  scene "start_anchor": {"turn": 0, "word": "this"}  (scene 0: omit -> 0.0)
  scene "end_anchor":   {"turn": 11, "end": true}    (last scene only)
  overlay "anchor": {"word": "mercantilism"}         (occurrence in scene span)
  stagger panel "anchor": {"word": "maize"}          (+ synthesizes word_times)
  reveal point "anchor": {"word": "peninsulares"}

Repeats take "nth": k (1-based) within the scope (turn or scene span).
Cue anchors accept "offset": seconds added to the resolved time.

Resolved outputs: start_sec/duration_sec, overlay start (+ duration,
+ auto position for overlapping pops), panel at (+ word_times), point
at. Deterministic: same inputs -> same plan.

Rules (fail fast, never guess):
  - scene boundaries all-anchored or all-numeric (no mixing)
  - anchor words are alias-resolved like check_word_times.py
  - 0 or 2+ matches in scope -> error (name times / nearest hint)
  - anchor + explicit start/at -> error (one source of truth)
  - explicit durations must fit the scene (no silent clipping)
  - keywordpops with unset position auto-alternate right/left on overlap

Usage:
    python resolve_cues.py <plan_in.json> <timings.json>
        <word_times.json> [--aliases aliases.json] -o <plan_out.json>

Exit 0 + summary on success; exit 1 with ERROR lines otherwise.
"""
import copy
import json
import sys

sys.path.insert(0, __import__("os").path.dirname(
    __import__("os").path.abspath(__file__)))

import check_word_times as cwt  # noqa: E402

SPAN_TOL = 0.05   # anchor occurrences may touch scene edges
POP_DEFAULT = 3.0  # renderer KeywordPop default duration
LT_DEFAULT = 3.5   # renderer LowerThird default duration


class ResolveError(Exception):
    pass


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _turn_id(n):
    return "t%02d" % int(n)


def _turn_table(timings):
    """turn idx -> (abs_start, abs_end)."""
    table = {}
    for t in timings.get("turns", []):
        m = str(t.get("turn", ""))
        try:
            idx = int(m.lstrip("t"))
        except ValueError:
            continue
        table[idx] = (float(t["start"]), float(t["end"]))
    return table


def _heard_seq(words, aliases):
    """Alias-translated normalized words for matching the heard stream."""
    return cwt._expand_heard(words, aliases)


def _find_in_scope(cands, phrase, aliases, where):
    """Absolute starts of consecutive-phrase occurrences in cands.

    cands: [(heard_word, abs_start)] in time order. Raises ResolveError
    on zero matches (with a nearest hint) — ambiguity (2+) is the
    caller's to report with an nth fix.
    """
    words = [w for w in (cwt._norm(p) for p in phrase.split()) if w]
    if not words:
        raise ResolveError(f"{where}: anchor has no matchable words")
    hits = []
    for want in _heard_seq(words, aliases):
        for i in range(len(cands) - len(want) + 1):
            if tuple(w for w, _ in cands[i:i + len(want)]) == want:
                hits.append(cands[i][1])
    hits = sorted(set(hits))
    if not hits:
        partial = ["%.2fs" % a for w, a in cands
                   if w == words[0]][:3]
        hint = ("; '%s' heard at %s (phrase never consecutive)"
                % (words[0], ", ".join(partial))) if partial else ""
        raise ResolveError(
            f"{where}: '{phrase}' never spoken in scope{hint}")
    return hits


def _resolve_word_anchor(spec, cands, aliases, where):
    """One absolute time from {"word": phrase, "nth": k, "offset": s}."""
    if not isinstance(spec, dict) or "word" not in spec:
        raise ResolveError(f"{where}: anchor must be "
                           f'{{"word": phrase}} (got {spec!r})')
    hits = _find_in_scope(cands, str(spec["word"]), aliases, where)
    nth = int(spec.get("nth", 1))
    if nth < 1 or nth > len(hits):
        raise ResolveError(
            f"{where}: '{spec['word']}' occurs {len(hits)}x in scope "
            f"({', '.join('%.2fs' % h for h in hits)}); pass "
            f'"nth": k (1..{len(hits)})')
    if len(hits) > 1 and "nth" not in spec:
        raise ResolveError(
            f"{where}: '{spec['word']}' occurs {len(hits)}x in scope "
            f"({', '.join('%.2fs' % h for h in hits)}); pass "
            f'"nth": k to disambiguate')
    return hits[nth - 1] + float(spec.get("offset", 0))


def _resolve_turn_anchor(spec, turn_no, table, words_by_turn, aliases,
                         where, allow_end):
    """Absolute time from {"turn": N, "word"|"end", "nth"?}."""
    if not isinstance(spec, dict) or "turn" not in spec:
        raise ResolveError(f"{where}: boundary anchor must be "
                           f'{{"turn": N, "word"|"end"}} (got {spec!r})')
    n = int(spec["turn"])
    if n not in table:
        raise ResolveError(f"{where}: timings have no turn {n}")
    start, end = table[n]
    if spec.get("end"):
        if not allow_end:
            raise ResolveError(
                f"{where}: turn-end anchors are silence, not word "
                f"starts — allowed only as the last scene's end_anchor")
        return end
    if "word" not in spec:
        raise ResolveError(f"{where}: boundary anchor needs "
                           f'"word" or "end" (got {spec!r})')
    cands = words_by_turn.get(_turn_id(n), [])
    hits = _find_in_scope(cands, str(spec["word"]), aliases, where)
    nth = int(spec.get("nth", 1))
    if len(hits) > 1 and "nth" not in spec:
        raise ResolveError(
            f"{where}: '{spec['word']}' occurs {len(hits)}x in turn "
            f"{n} ({', '.join('%.2fs' % h for h in hits)}); pass "
            f'"nth": k to disambiguate')
    if nth < 1 or nth > len(hits):
        raise ResolveError(
            f"{where}: '{spec['word']}' occurs {len(hits)}x in turn "
            f"{n}; nth={nth} out of range")
    return hits[nth - 1]


def _words_by_turn(timings, word_times):
    table = {}
    for t in timings.get("turns", []):
        tid = str(t.get("turn", ""))
        base = float(t["start"])
        table[tid] = [(w["word"].lower(), round(base + w["start"], 3))
                      for w in word_times.get(tid, [])]
    return table


def _resolve_boundaries(plan, table, words_by_turn, aliases, errors):
    """Rewrite start_sec/duration_sec from anchors. Returns True if the
    plan uses boundary anchors (all-or-nothing enforced)."""
    scenes = plan["scenes"]
    uses = any("start_anchor" in s or "end_anchor" in s for s in scenes)
    if not uses:
        return False
    starts = []
    for i, s in enumerate(scenes):
        sid = s.get("id", "scene-%d" % i)
        if "start_sec" in s or "duration_sec" in s:
            errors.append(f"scene '{sid}': boundary anchors and numeric "
                          f"start_sec/duration_sec do not mix")
            continue
        if i == 0 and "start_anchor" not in s:
            starts.append(0.0)
            continue
        if "start_anchor" not in s:
            errors.append(f"scene '{sid}': anchored plan needs "
                          f"start_anchor on every scene except the first")
            continue
        try:
            starts.append(_resolve_turn_anchor(
                s["start_anchor"], i, table, words_by_turn, aliases,
                f"scene '{sid}' start_anchor", allow_end=False))
        except ResolveError as e:
            errors.append(str(e))
    end = None
    last = scenes[-1]
    lid = last.get("id", "scene-%d" % (len(scenes) - 1))
    if "end_anchor" not in last:
        errors.append(f"scene '{lid}': anchored plan needs end_anchor "
                      f"on the last scene")
    else:
        try:
            end = _resolve_turn_anchor(
                last["end_anchor"], len(scenes) - 1, table,
                words_by_turn, aliases, f"scene '{lid}' end_anchor",
                allow_end=True)
        except ResolveError as e:
            errors.append(str(e))
    for i, s in enumerate(scenes[:-1]):
        if "end_anchor" in s:
            sid = s.get("id", "scene-%d" % i)
            errors.append(f"scene '{sid}': end_anchor is only allowed "
                          f"on the last scene")
    if errors or len(starts) != len(scenes) or end is None:
        return True
    bounds = starts + [end]
    for i, s in enumerate(scenes):
        sid = s.get("id", "scene-%d" % i)
        dur = round(bounds[i + 1] - bounds[i], 3)
        if dur <= 0:
            errors.append(f"scene '{sid}': non-positive duration "
                          f"{dur:.3f}s from anchors")
            continue
        s["start_sec"] = round(bounds[i], 3)
        s["duration_sec"] = dur
        s.pop("start_anchor", None)
        s.pop("end_anchor", None)
    return True


def _span_cands(base, dur, words_by_turn):
    cands = []
    for tid in sorted(words_by_turn):
        for w, a in words_by_turn[tid]:
            if base - SPAN_TOL <= a <= base + dur + SPAN_TOL:
                cands.append((w, a))
    return cands


def _resolve_cue_anchor(spec, cands, aliases, where, errors):
    """Scene-relative seconds from an anchor dict, or None on error."""
    try:
        return _resolve_word_anchor(spec, cands, aliases, where)
    except ResolveError as e:
        errors.append(str(e))
        return None


def _resolve_overlays(plan, words_by_turn, aliases, errors, warns):
    for i, s in enumerate(plan["scenes"]):
        sid = s.get("id", "scene-%d" % i)
        base = float(s["start_sec"])
        dur = float(s["duration_sec"])
        cands = _span_cands(base, dur, words_by_turn)
        for j, ov in enumerate(s.get("overlays") or []):
            where = f"scene '{sid}' overlay #{j}"
            if "anchor" in ov and "start" in ov:
                errors.append(f"{where}: anchor and start do not mix")
                continue
            if "anchor" in ov:
                hit = _resolve_cue_anchor(ov.pop("anchor"), cands,
                                          aliases, where, errors)
                if hit is None:
                    continue
                ov["start"] = round(hit - base, 3)
                if ov["start"] < -1e-9 or ov["start"] > dur:
                    errors.append(
                        f"{where}: anchored cue lands outside the scene "
                        f"({ov['start']:.2f}s of {dur:.2f}s)")
                    continue
                ov["start"] = max(ov["start"], 0.0)
            elif "start" not in ov and "until" not in ov:
                continue  # renderer defaults throughout
            elif "start" not in ov:
                errors.append(f"{where}: until needs a start or an anchor")
                continue
            otype = str(ov.get("type", "")).lower()
            default = POP_DEFAULT if otype == "keywordpop" \
                else LT_DEFAULT if otype == "lowerthird" else None
            if "until" in ov:
                if "duration" in ov:
                    errors.append(f"{where}: until and duration "
                                  f"do not mix")
                    continue
                uhit = _resolve_cue_anchor(ov.pop("until"), cands,
                                           aliases, where + " until",
                                           errors)
                if uhit is None:
                    continue
                derived = round(uhit - (base + ov["start"]), 3)
                if derived <= 0:
                    errors.append(
                        f"{where}: until lands at/before the cue start")
                    continue
                ov["duration"] = derived
            if "duration" in ov:
                if ov["start"] + float(ov["duration"]) > dur + 1e-9:
                    errors.append(
                        f"{where}: duration overflows the scene "
                        f"({ov['start']:.2f}+{ov['duration']}s of {dur:.2f}s)")
            elif default is not None:
                room = round(dur - ov["start"], 3)
                if room <= 0:
                    errors.append(f"{where}: no room left in the scene "
                                  f"for the cue")
                else:
                    ov["duration"] = min(default, room)
                    if ov["duration"] < default:
                        warns.append(
                            f"{where}: {otype} duration clipped to "
                            f"{ov['duration']:.2f}s by the scene end")
        _auto_positions(s, sid, warns)


def _auto_positions(scene, sid, warns):
    """Alternate unset pop positions (right/left) on time overlap."""
    pops = [ov for ov in scene.get("overlays") or []
            if str(ov.get("type", "")).lower() == "keywordpop"]
    pops.sort(key=lambda ov: float(ov.get("start", 0)))
    active = []  # (end, position)
    for ov in pops:
        start = float(ov.get("start", 0))
        odur = ov.get("duration")
        end = start + (float(odur) if odur is not None
                       else float(scene["duration_sec"]) - start)
        active = [(e, p) for e, p in active if e > start]
        if "position" in ov:
            active.append((end, str(ov["position"]).lower()))
            continue
        taken = {p for _, p in active}
        if "right" not in taken:
            ov["position"] = "right"
        elif "left" not in taken:
            ov["position"] = "left"
            warns.append(f"scene '{sid}': pop '{ov.get('word')}' "
                         f"auto-positioned left (overlaps a right pop)")
        else:
            ov["position"] = "right"
            warns.append(f"scene '{sid}': pop '{ov.get('word')}' "
                         f"overlaps two pops — lint will reject; split "
                         f"the scene or retime")
        active.append((end, ov["position"]))


def _resolve_panels(plan, words_by_turn, aliases, errors):
    for i, s in enumerate(plan["scenes"]):
        if str(s.get("slide", "")).lower() != "staggerslide":
            continue
        sid = s.get("id", "scene-%d" % i)
        base = float(s["start_sec"])
        dur = float(s["duration_sec"])
        panels = (s.get("params") or {}).get("panels") or []
        if not any("anchor" in p for p in panels):
            continue
        if "word_times" in s:
            errors.append(f"scene '{sid}': panel anchors synthesize "
                          f"word_times — drop the hand-written block")
            continue
        cands = _span_cands(base, dur, words_by_turn)
        wt = {}
        for p in panels:
            where = f"scene '{sid}' panel '{p.get('label')}'"
            if "anchor" in p and "at" in p:
                errors.append(f"{where}: anchor and at do not mix")
                continue
            if "anchor" not in p:
                errors.append(f"{where}: anchored scene needs anchor "
                              f"on every panel")
                continue
            anchor = p.pop("anchor")
            hit = _resolve_cue_anchor(anchor, cands, aliases, where,
                                      errors)
            if hit is None:
                continue
            p["at"] = round(hit - base, 3)
            wt[str(anchor["word"])] = p["at"]
        if not errors:
            wt["note"] = ("synthesized by resolve_cues.py from panel "
                          "anchors (measured word times)")
            s["word_times"] = wt


def _resolve_points(plan, words_by_turn, aliases, errors):
    for i, s in enumerate(plan["scenes"]):
        if str(s.get("slide", "")).lower() != "revealslide":
            continue
        sid = s.get("id", "scene-%d" % i)
        base = float(s["start_sec"])
        dur = float(s["duration_sec"])
        points = (s.get("params") or {}).get("points") or []
        if not any("anchor" in p for p in points):
            continue
        cands = _span_cands(base, dur, words_by_turn)
        for p in points:
            where = f"scene '{sid}' point '{str(p.get('text', ''))[:30]}'"
            if "anchor" in p and "at" in p:
                errors.append(f"{where}: anchor and at do not mix")
                continue
            if "anchor" not in p:
                continue  # numeric at (incl. -1 resume) stays
            hit = _resolve_cue_anchor(p.pop("anchor"), cands, aliases,
                                      where, errors)
            if hit is None:
                continue
            p["at"] = round(hit - base, 3)


def resolve(plan, timings, word_times, aliases=None):
    """Resolve anchors in a deep copy. Returns (plan, errors, warns)."""
    aliases = cwt._norm_aliases(aliases)
    if plan.get("version") != 2:
        return plan, ["resolve_cues.py is v2-only (absolute-time plans)"], []
    plan = copy.deepcopy(plan)
    errors, warns = [], []
    table = _turn_table(timings)
    words_by_turn = _words_by_turn(timings, word_times)
    anchored = _resolve_boundaries(plan, table, words_by_turn, aliases,
                                   errors)
    if errors:
        return plan, errors, warns
    if anchored:
        for s in plan["scenes"]:
            if "start_sec" not in s or "duration_sec" not in s:
                sid = s.get("id", "?")
                errors.append(f"scene '{sid}': missing boundary after "
                              f"resolution (internal error)")
        if errors:
            return plan, errors, warns
    for s in plan["scenes"]:
        if "start_sec" not in s or "duration_sec" not in s:
            sid = s.get("id", "?")
            errors.append(f"scene '{sid}': v2 needs start_sec + "
                          f"duration_sec or boundary anchors")
    if errors:
        return plan, errors, warns
    _resolve_overlays(plan, words_by_turn, aliases, errors, warns)
    _resolve_panels(plan, words_by_turn, aliases, errors)
    _resolve_points(plan, words_by_turn, aliases, errors)
    if not errors:
        plan["resolved_from_anchors"] = True
    return plan, errors, warns


def main(argv):
    args = list(argv)
    if len(args) < 3 or "-h" in args or "--help" in args:
        sys.exit(__doc__)
    plan_path, timings_path, words_path = args[:3]
    rest = args[3:]
    aliases = None
    if "--aliases" in rest:
        aliases = _load(rest[rest.index("--aliases") + 1])
    out_path = None
    if "-o" in rest:
        out_path = rest[rest.index("-o") + 1]
    plan, errors, warns = resolve(_load(plan_path), _load(timings_path),
                                  _load(words_path), aliases)
    for w in warns:
        print(f"warn: {w}", file=sys.stderr)
    if errors:
        for e in errors:
            print(f"ERROR: {e}")
        print(f"{len(errors)} resolve error(s)", file=sys.stderr)
        return 1
    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(plan, f, indent=1)
            f.write("\n")
        print(f"resolved -> {out_path}")
    else:
        print(json.dumps(plan, indent=1))
    n_cues = sum(len(s.get("overlays") or []) for s in plan["scenes"])
    print(f"{len(plan['scenes'])} scenes, {n_cues} overlays resolved",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
