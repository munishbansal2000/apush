"""v6 prompt assembly + word-anchor enforcement (hermetic fixtures)."""
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import build_v6_prompt as bvp
import check_word_times as cwt


@pytest.fixture
def ep_dir(tmp_path):
    d = tmp_path / "ep"
    (d / "work").mkdir(parents=True)
    (d / "images").mkdir()
    (d / "images" / "a.jpg").write_bytes(b"x")
    turns = [{"speaker": "Maya", "text": "Three boxes: maize and corn."},
             {"speaker": "Marcus", "text": "Two societies side by side."}]
    (d / "script_turns.json").write_text(json.dumps(turns), encoding="utf-8")
    timings = {"offset": 1.8, "gap": 0.6, "tail": 4.5,
               "computed_total": 20.0,
               "turns": [
                   {"turn": "t00", "file": "t00.mp3", "start": 1.8,
                    "end": 8.0, "dur": 6.2, "onset": 0.1},
                   {"turn": "t01", "file": "t01.mp3", "start": 8.6,
                    "end": 15.5, "dur": 6.9, "onset": 0.1}]}
    (d / "work" / "timings.json").write_text(json.dumps(timings),
                                             encoding="utf-8")
    words = {
        "t00": [{"word": "three", "start": 0.1, "end": 0.3},
                {"word": "boxes", "start": 0.4, "end": 0.6},
                {"word": "mais", "start": 1.0, "end": 1.2},
                {"word": "corn", "start": 1.5, "end": 1.7}],
        "t01": [{"word": "two", "start": 0.2, "end": 0.4},
                {"word": "societies", "start": 0.5, "end": 0.9}]}
    (d / "work" / "word_times.json").write_text(json.dumps(words),
                                                encoding="utf-8")
    return str(d)


def _plan_v1():
    return {
        "version": 1, "episode": "ep",
        "scenes": [
            {"id": "s0", "slide": "StaggerSlide",
             "params": {"title": "T",
                        "panels": [{"image": "images/a.jpg",
                                    "label": "Maize", "at": 2.8}]},
             "duration_sec": 6.8, "turns": [0, 0],
             "word_times": {"maize": 2.8}},
            {"id": "s1", "slide": "DisplayHeadline",
             "params": {"headline": "Two societies"},
             "duration_sec": 7.5, "turns": [1, 1],
             "overlays": [{"type": "keywordpop", "word": "societies",
                           "start": 2.4, "duration": 2.0}]},
        ]}


def test_prompt_assembles_measured_blocks(ep_dir):
    text = bvp.build(ep_dir)
    assert "EPISODE: ep" in text
    assert "[00] Maya (6.2s)" in text
    assert "mais@1.0s" in text  # measured words, verbatim
    assert "images/a.jpg" in text  # manifest scan fallback


def test_prompt_slices_turns(ep_dir):
    text = bvp.build(ep_dir, turns_slice=(1, 1))
    assert "[01]" in text and "[00]" not in text


def test_prompt_refuses_unmeasured(ep_dir):
    os.remove(os.path.join(ep_dir, "work", "timings.json"))
    with pytest.raises(SystemExit):
        bvp.build(ep_dir)


def test_checker_passes_anchored(ep_dir):
    plan = _plan_v1()
    timings = json.load(open(os.path.join(ep_dir, "work", "timings.json")))
    words = json.load(open(os.path.join(ep_dir, "work", "word_times.json")))
    # scene-0 abs cue = 0 + 2.8; mais abs = 1.8 + 1.0 = 2.8
    errs = cwt.check(plan, timings, words, {"maize": "mais"})
    assert errs == []


def test_checker_catches_stale_word_time(ep_dir):
    plan = _plan_v1()
    plan["scenes"][0]["word_times"] = {"maize": 5.0}  # drifted estimate
    plan["scenes"][0]["params"]["panels"][0]["at"] = 5.0
    timings = json.load(open(os.path.join(ep_dir, "work", "timings.json")))
    words = json.load(open(os.path.join(ep_dir, "work", "word_times.json")))
    errs = cwt.check(plan, timings, words, {"maize": "mais"})
    assert any("word_times['maize']" in e for e in errs)


def test_checker_catches_unbased_cue(ep_dir):
    plan = _plan_v1()
    del plan["scenes"][0]["word_times"]
    timings = json.load(open(os.path.join(ep_dir, "work", "timings.json")))
    words = json.load(open(os.path.join(ep_dir, "work", "word_times.json")))
    errs = cwt.check(plan, timings, words, {})
    assert any("no word_times basis" in e for e in errs)


def test_checker_catches_v2_offword_start(ep_dir):
    plan = {"version": 2, "episode": "ep",
            "scenes": [
                {"id": "s0", "slide": "DisplayHeadline",
                 "params": {"headline": "A"}, "start_sec": 0.0,
                 "duration_sec": 5.0},
                {"id": "s1", "slide": "DisplayHeadline",
                 "params": {"headline": "B"}, "start_sec": 5.0,
                 "duration_sec": 5.0}]}
    timings = json.load(open(os.path.join(ep_dir, "work", "timings.json")))
    words = json.load(open(os.path.join(ep_dir, "work", "word_times.json")))
    errs = cwt.check(plan, timings, words, {})
    # 5.0s matches no word start (words at 1.9, 2.2, 2.8, 3.3, 8.8, 9.1)
    assert any("start_sec=5.00" in e for e in errs)


def test_checker_catches_unspoken_keywordpop(ep_dir):
    plan = _plan_v1()
    plan["scenes"][1]["overlays"][0]["word"] = "triangular trade"
    timings = json.load(open(os.path.join(ep_dir, "work", "timings.json")))
    words = json.load(open(os.path.join(ep_dir, "work", "word_times.json")))
    errs = cwt.check(plan, timings, words, {})
    assert any("never spoken" in e for e in errs)


def test_checker_matches_possessives_verbatim():
    # Vosk keeps "england's" intact; norm must not strip the apostrophe
    # (Meta UI anchored it and the old norm rejected a real word).
    timings = {"turns": [{"turn": "t00", "file": "t00.mp3",
                          "start": 1.8, "end": 8.0, "dur": 6.2}]}
    words = {"t00": [{"word": "england's", "start": 1.0, "end": 1.4},
                     {"word": "challenge", "start": 1.5, "end": 1.9}]}
    # v1 scene base is 0.0 and the turn starts at 0.0, so the 1.0s
    # claims below want the words at exactly 1.0s/1.5s absolute.
    timings["turns"][0]["start"] = 0.0
    plan = {"version": 1, "episode": "ep",
            "scenes": [
                {"id": "s0", "slide": "StaggerSlide",
                 "params": {"title": "T", "panels": [
                     {"image": "images/a.jpg", "label": "E", "at": 1.0}]},
                 "duration_sec": 6.2, "turns": [0, 0],
                 "word_times": {"england's": 1.0},
                 "overlays": [
                     {"type": "keywordpop", "word": "England's challenge",
                      "start": 1.0, "duration": 1.0}]}]}
    errs = cwt.check(plan, timings, words, {})
    assert not errs, errs


def test_checker_matches_multi_hearing_alias():
    # Vosk hears "potosi" as "potus" in t00 but "pota" in t01; the
    # display term must match whichever form is near the cue.
    timings = {"turns": [{"turn": "t00", "file": "t00.mp3",
                          "start": 0.0, "end": 5.0, "dur": 5.0},
                         {"turn": "t01", "file": "t01.mp3",
                          "start": 5.6, "end": 10.6, "dur": 5.0}]}
    words = {"t00": [{"word": "potus", "start": 1.0, "end": 1.2}],
             "t01": [{"word": "pota", "start": 1.0, "end": 1.2}]}
    plan = {"version": 1, "episode": "ep",
            "scenes": [
                {"id": "s0", "slide": "DisplayHeadline",
                 "params": {"headline": "H"},
                 "duration_sec": 10.6, "turns": [0, 1],
                 "overlays": [
                     {"type": "keywordpop", "word": "Potosi",
                      "start": 6.6, "duration": 1.0}]}]}
    aliases = {"potosi": ["potus", "pota"]}
    errs = cwt.check(plan, timings, words, aliases)
    assert not errs, errs
