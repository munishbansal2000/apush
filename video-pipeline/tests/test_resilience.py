"""Tests for the resilience-plan items 1-6.

Pure-logic tests (no rendering). The conform tests shell out to ffmpeg
but on 160x90 testsrc clips — a few seconds of CPU at most.
"""
import json
import os
import subprocess
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import compile_scene_plan as csp
from compile_scene_plan import PlanError
import word_timing


def _plan(scenes):
    return {"version": 1, "scenes": scenes}


def _sc(sid, dur, a, b, trans="cut", trans_dur=0.0):
    return {"id": sid, "slide": "solid", "duration_sec": dur,
            "transition": trans, "trans_dur": trans_dur,
            "turns": [a, b], "params": {}}


# --- item 3: turn partition validation ---------------------------------------

def test_turns_valid_partition_passes():
    p = _plan([_sc("a", 5, 0, 2), _sc("b", 5, 3, 5)])
    csp._validate_turns(p)  # no raise


def test_turns_gap_fails():
    p = _plan([_sc("a", 5, 0, 2), _sc("b", 5, 4, 5)])
    with pytest.raises(PlanError, match="not covered"):
        csp._validate_turns(p)


def test_turns_overlap_fails():
    p = _plan([_sc("a", 5, 0, 3), _sc("b", 5, 3, 5)])
    with pytest.raises(PlanError, match="overlap"):
        csp._validate_turns(p)


def test_turns_missing_first_fails():
    p = _plan([_sc("a", 5, 1, 3)])
    with pytest.raises(PlanError, match="not covered"):
        csp._validate_turns(p)


def test_turns_bad_shape_fails():
    p = _plan([{"id": "a", "slide": "solid", "duration_sec": 5,
                "turns": "0-2", "params": {}}])
    with pytest.raises(PlanError, match="'turns' must be"):
        csp._validate_turns(p)


# --- item 2: measured-or-refuse ----------------------------------------------

def _timings_file(tmp_path, durs):
    p = tmp_path / "timings.json"
    p.write_text(json.dumps(
        {"turns": [{"turn": f"t{i}", "start": 0.0, "dur": d}
                    for i, d in enumerate(durs)]}))
    return str(p)


def test_timings_match_passes(tmp_path):
    p = _plan([_sc("a", 3.0, 0, 1)])
    t = _timings_file(tmp_path, [1.2, 1.8])
    csp._validate_against_timings(p, t)  # no raise


def test_timings_mismatch_refuses(tmp_path):
    p = _plan([_sc("a", 3.5, 0, 1)])  # estimate drifted 0.5s
    t = _timings_file(tmp_path, [1.2, 1.8])
    with pytest.raises(PlanError, match="refit_durations"):
        csp._validate_against_timings(p, t)


def test_timings_within_tolerance_passes(tmp_path):
    p = _plan([_sc("a", 3.01, 0, 1)])
    t = _timings_file(tmp_path, [1.2, 1.8])
    csp._validate_against_timings(p, t)  # 0.01 <= 0.02


def test_timings_missing_turn_refuses(tmp_path):
    p = _plan([_sc("a", 3.0, 0, 2)])
    t = _timings_file(tmp_path, [1.2, 1.8])  # no turn 2
    with pytest.raises(PlanError, match="no turn 2"):
        csp._validate_against_timings(p, t)


# --- items 1+2 combined: transition compensation math ------------------------

def test_transition_compensation_preserves_total():
    scenes = [_sc("a", 10.0, 0, 1, "crossfade", 0.5),
              _sc("b", 20.0, 2, 3, "cut", 0.0),
              _sc("c", 30.0, 4, 5, "crossfade", 0.8)]
    p = _plan(scenes)
    orig_total = sum(s["duration_sec"] for s in scenes)
    comp = csp._compensate_transitions(p)
    got = [s["duration_sec"] for s in comp["scenes"]]
    # scene a pays for b's trans_dur (0, b is a cut); b pays for c's 0.8
    assert got == [10.0, 20.8, 30.0]
    # Movie total = sum(compensated) - sum(trans_dur) must equal orig
    overlaps = sum(float(s.get("trans_dur", 0) or 0)
                   for s in comp["scenes"][1:])
    assert abs((sum(got) - overlaps) - orig_total) < 1e-9
    # caller's plan untouched
    assert [s["duration_sec"] for s in p["scenes"]] == [10.0, 20.0, 30.0]


def test_transition_compensation_no_transitions_is_identity():
    scenes = [_sc("a", 10.0, 0, 1), _sc("b", 20.0, 2, 3)]
    p = _plan(scenes)
    comp = csp._compensate_transitions(p)
    assert [s["duration_sec"] for s in comp["scenes"]] == [10.0, 20.0]


# --- item 1: cumulative frame boundaries -------------------------------------

def test_frame_boundaries_exact_total():
    durs = [10.13, 22.47, 5.9, 31.02]
    bounds = csp._frame_boundaries(durs, 30)
    assert bounds[0] == 0
    assert bounds[-1] == round(sum(durs) * 30)  # exact by construction
    # scene 2's cut lands exactly on cumulative audio time, not a sum of
    # per-scene rounded counts
    assert bounds[2] == round((durs[0] + durs[1]) * 30)


def test_frame_boundaries_no_drift_accumulation():
    # Per-scene round() would give 30+30+30 = 90; cumulative gives 91.
    durs = [1.01, 1.01, 1.01]
    assert csp._frame_boundaries(durs, 30) == [0, 30, 61, 91]
    assert csp._frame_boundaries(durs, 30)[-1] == round(3.03 * 30)


def test_frame_boundaries_monotonic():
    bounds = csp._frame_boundaries([0.04, 0.04, 10.0], 30)
    assert all(b >= a for a, b in zip(bounds, bounds[1:]))


# --- item 5: word timing ------------------------------------------------------

def test_find_word_case_insensitive():
    turns = ["Corn, beans, and squash.", "Marcus explains maize."]
    assert word_timing.find_word(turns, "Maize") == (1, 2)
    assert word_timing.find_word(turns, "CORN") == (0, 0)
    assert word_timing.find_word(turns, "absent") is None


def test_word_time_and_frame():
    # 4-word turn, word 2 of 4, starts at 10s, lasts 8s -> 14s, frame 420
    assert word_timing.word_time("a b c d", 2, 10.0, 8.0) == 14.0
    assert word_timing.word_frame("a b c d", 2, 10.0, 8.0) == 420


def test_word_time_bounds_checked():
    with pytest.raises(ValueError):
        word_timing.word_time("a b", 5, 0.0, 1.0)


def test_plan_keyword_pops(tmp_path):
    turns = ["They grew corn beans squash together.", "Next."]
    t = _timings_file(tmp_path, [10.0, 5.0])
    timings = json.load(open(t))
    # turn 0 starts at 0.0 per the fake file; word 'beans' is index 3 of 6
    # words -> 0 + 3/6*10 = 5.0s, minus 1.0 lead -> 4.0
    pops = word_timing.plan_keyword_pops(turns, timings, ["beans"])
    assert pops[0]["start"] == 4.0
    assert pops[0]["turn"] == 0
    with pytest.raises(ValueError, match="not placed"):
        word_timing.plan_keyword_pops(turns, timings, ["wheat"])


# --- item 4: conform_clip -----------------------------------------------------

def _make_src(path, seconds, size="160x90"):
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
         "-i", f"testsrc=size={size}:rate=30:duration={seconds}",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", path],
        check=True)


def _count_frames(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=nb_frames", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True).stdout.strip()
    return int(out)


def test_conform_loop_short_clip(tmp_path):
    sys.path.insert(0, os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))))
    import conform_clip
    src = str(tmp_path / "src.mp4")
    out = str(tmp_path / "out.mp4")
    _make_src(src, 2)          # 60 frames
    conform_clip.conform(src, 150, out)   # target 150 -> seamless loop
    assert _count_frames(out) == 150


def test_conform_trim_long_clip(tmp_path):
    import conform_clip
    src = str(tmp_path / "src.mp4")
    out = str(tmp_path / "out.mp4")
    _make_src(src, 5)          # 150 frames
    conform_clip.conform(src, 90, out)    # target 90 -> middle trim
    assert _count_frames(out) == 90


def test_conform_equal_passthrough(tmp_path):
    import conform_clip
    src = str(tmp_path / "src.mp4")
    out = str(tmp_path / "out.mp4")
    _make_src(src, 3)          # 90 frames
    conform_clip.conform(src, 90, out)
    assert _count_frames(out) == 90


# --- item 6: _probe_frame_count sanity ----------------------------------------

def test_probe_frame_count(tmp_path):
    p = str(tmp_path / "s.mp4")
    _make_src(p, 2)
    assert csp._probe_frame_count(p) == 60


# --- gap-aware mix model (offset/gap/tail) ------------------------------------

def _timings_file_gap(tmp_path, durs, gap=0.6, offset=1.8, tail=4.5):
    p = tmp_path / "timings.json"
    turns, t = [], offset
    for i, d in enumerate(durs):
        turns.append({"turn": f"t{i}", "start": round(t, 3),
                      "dur": d, "end": round(t + d, 3)})
        t += d + gap
    p.write_text(json.dumps({"gap": gap, "offset": offset, "tail": tail,
                             "turns": turns}))
    return str(p)


def test_timings_gap_aware_passes(tmp_path):
    # model: D0 = 1.8 + (1.2+0.6) + (1.8+0.6); D1 = (2.0+0.6) + 4.5
    p = _plan([_sc("a", 1.8 + 1.8 + 2.4, 0, 1),
               _sc("b", 2.6 + 4.5, 2, 2)])
    t = _timings_file_gap(tmp_path, [1.2, 1.8, 2.0])
    csp._validate_against_timings(p, t)  # no raise


def test_timings_gap_aware_refuses_straight_concat(tmp_path):
    # straight-concat durations (the old estimate model) must be refused
    p = _plan([_sc("a", 3.0, 0, 1), _sc("b", 2.0, 2, 2)])
    t = _timings_file_gap(tmp_path, [1.2, 1.8, 2.0])
    with pytest.raises(PlanError, match="measured.*mix model"):
        csp._validate_against_timings(p, t)


def test_timings_no_gap_keys_backward_compatible(tmp_path):
    # timings without gap/offset/tail behave as straight concat (old tests)
    p = _plan([_sc("a", 3.0, 0, 1)])
    t = _timings_file(tmp_path, [1.2, 1.8])
    csp._validate_against_timings(p, t)  # no raise


def _make_turn_mp3(path, seconds=1.0):
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
         "-i", f"sine=frequency=440:duration={seconds}",
         "-c:a", "libmp3lame", path], check=True)


def test_refit_gap_aware(tmp_path):
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "refit", os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              os.pardir, "refit_durations.py"))
    refit = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(refit)

    turns_dir = tmp_path / "turns"
    turns_dir.mkdir()
    _make_turn_mp3(str(turns_dir / "t00.mp3"), 1.0)
    _make_turn_mp3(str(turns_dir / "t01.mp3"), 1.0)
    tj = _timings_file_gap(tmp_path, [1.0, 1.0])

    plan_path = str(tmp_path / "plan.json")
    plan = {"version": 1, "episode": "t",
            "scenes": [
                {"id": "s0", "slide": "TitleSlide", "duration_sec": 2.0,
                 "transition": "cut", "trans_dur": 0, "turns": [0, 0],
                 "params": {},
                 "overlays": [{"type": "keywordpop", "word": "x",
                               "start": 0.5, "duration": 1.0}]},
                {"id": "s1", "slide": "TitleSlide", "duration_sec": 1.0,
                 "transition": "cut", "trans_dur": 0, "turns": [1, 1],
                 "params": {}, "overlays": []},
            ]}
    with open(plan_path, "w") as f:
        json.dump(plan, f)

    refit.main([plan_path, str(turns_dir), "--timings", tj])
    out = json.load(open(plan_path))
    s0, s1 = out["scenes"]
    # D0 = 1.8 + (1.0+0.6); D1 = (1.0+0.6) + 4.5
    assert abs(s0["duration_sec"] - 3.4) < 0.05
    assert abs(s1["duration_sec"] - 6.1) < 0.05
    # first-scene overlay shifted by +offset
    assert abs(s0["overlays"][0]["start"] - 2.3) < 0.01
    # total == mix total: 1.8 + 2.0 + 1.2 + 4.5 = 9.5
    assert abs(s0["duration_sec"] + s1["duration_sec"] - 9.5) < 0.1
    # idempotent: second run changes nothing
    before = json.load(open(plan_path))
    refit.main([plan_path, str(turns_dir), "--timings", tj])
    after = json.load(open(plan_path))
    assert before == after


def test_find_phrase_scoped():
    turns = ["Three boxes: Jumonville Glen, Pitt's gamble.",
             "Washington's men surround a French camp at Jumonville Glen."]
    assert word_timing.find_phrase(turns, "Jumonville Glen") == (0, 2)
    assert word_timing.find_phrase(turns, "Jumonville Glen", 1, 1) == (1, 7)
    assert word_timing.find_phrase(turns, "Pitt's gamble", 1, 1) is None
    assert word_timing.find_phrase(turns, "pitt's GAMBLE", 0, 0) == (0, 4)
