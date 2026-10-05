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


# --- chunked idempotency: _chunk_is_fresh gate --------------------------------


def test_chunk_is_fresh(tmp_path):
    p = str(tmp_path / "c.mp4")
    assert csp._chunk_is_fresh(p, 60) is False  # missing file
    _make_src(p, 2)  # 60 frames
    assert csp._chunk_is_fresh(p, 60) is True
    assert csp._chunk_is_fresh(p, 61) is False  # wrong frame count


# --- item 6: _probe_frame_count sanity ----------------------------------------

def test_probe_frame_count(tmp_path):
    p = str(tmp_path / "s.mp4")
    _make_src(p, 2)
    assert csp._probe_frame_count(p) == 60
