"""resolve_cues: anchors -> measured seconds; lint anchor/default fixes."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import lint_plan
import resolve_cues as rc

TIMINGS = {"gap": 0.6, "offset": 1.8, "tail": 4.5, "turns": [
    {"turn": "t00", "file": "t00.mp3", "start": 1.8, "end": 11.8, "dur": 10.0},
    {"turn": "t01", "file": "t01.mp3", "start": 12.4, "end": 22.4, "dur": 10.0},
]}
WORDS = {
    "t00": [{"word": "start", "start": 0.2},
            {"word": "silver", "start": 2.0},
            {"word": "flooded", "start": 5.0}],
    "t01": [{"word": "money", "start": 0.2},
            {"word": "silver", "start": 4.0},
            {"word": "again", "start": 8.0}],
}


def _plan(scenes):
    return {"version": 2, "episode": "t", "scenes": scenes}


def test_boundaries_and_cues():
    plan = _plan([
        {"id": "a", "slide": "DisplayHeadline",
         "params": {"headline": "H"},
         "overlays": [
             {"type": "keywordpop", "word": "silver",
              "anchor": {"word": "silver"}}]},
        {"id": "b", "slide": "DisplayHeadline",
         "params": {"headline": "H2"},
         "start_anchor": {"turn": 1, "word": "money"},
         "end_anchor": {"turn": 1, "end": True},
         "overlays": [
             {"type": "keywordpop", "word": "silver",
              "anchor": {"word": "silver"}}]},
    ])
    out, errors, warns = rc.resolve(plan, TIMINGS, WORDS)
    assert not errors, errors
    assert out["scenes"][0]["start_sec"] == 0.0
    assert out["scenes"][0]["duration_sec"] == 12.6  # to money@12.6
    assert out["scenes"][1]["start_sec"] == 12.6
    assert out["scenes"][1]["duration_sec"] == 9.8  # to t01 end 22.4
    # scene 0 spans 0-12.6; silver heard at 3.8 (t00) -> rel 3.8
    assert out["scenes"][0]["overlays"][0]["start"] == 3.8
    assert out["scenes"][1]["overlays"][0]["start"] == 3.8  # 16.4-12.6
    assert "anchor" not in out["scenes"][0]["overlays"][0]
    assert out["resolved_from_anchors"] is True


def test_ambiguity_needs_nth():
    plan = _plan([
        {"id": "a", "slide": "DisplayHeadline",
         "params": {"headline": "H"},
         "end_anchor": {"turn": 1, "end": True},
         "overlays": [{"type": "keywordpop", "word": "silver",
                       "anchor": {"word": "silver"}}]},
    ])
    out, errors, _ = rc.resolve(plan, TIMINGS, WORDS)
    assert len(errors) == 1 and "2x" in errors[0] and "nth" in errors[0]
    plan["scenes"][0]["overlays"][0]["anchor"]["nth"] = 2
    out, errors, _ = rc.resolve(plan, TIMINGS, WORDS)
    assert not errors, errors
    assert out["scenes"][0]["overlays"][0]["start"] == 16.4


def test_missing_word_names_scope():
    plan = _plan([
        {"id": "a", "slide": "DisplayHeadline",
         "params": {"headline": "H"},
         "end_anchor": {"turn": 0, "end": True},
         "overlays": [{"type": "keywordpop", "word": "gold",
                       "anchor": {"word": "gold"}}]},
    ])
    _, errors, _ = rc.resolve(plan, TIMINGS, WORDS)
    assert len(errors) == 1 and "never spoken" in errors[0]


def test_anchor_plus_start_rejected_and_mixed_modes():
    plan = _plan([
        {"id": "a", "slide": "DisplayHeadline",
         "params": {"headline": "H"},
         "end_anchor": {"turn": 0, "end": True},
         "overlays": [{"type": "keywordpop", "word": "silver",
                       "anchor": {"word": "silver"}, "start": 1.0}]},
    ])
    _, errors, _ = rc.resolve(plan, TIMINGS, WORDS)
    assert any("do not mix" in e for e in errors)
    plan2 = _plan([
        {"id": "a", "slide": "DisplayHeadline",
         "params": {"headline": "H"}, "start_sec": 0.0,
         "duration_sec": 10.0},
        {"id": "b", "slide": "DisplayHeadline",
         "params": {"headline": "H"},
         "start_anchor": {"turn": 1, "word": "money"},
         "end_anchor": {"turn": 1, "end": True}},
    ])
    _, errors, _ = rc.resolve(plan2, TIMINGS, WORDS)
    assert any("do not mix" in e for e in errors)


def test_stagger_synthesis_and_reveal_resume():
    plan = _plan([
        {"id": "a", "slide": "StaggerSlide",
         "params": {"title": "T", "panels": [
             {"image": "i.jpg", "label": "Silver",
              "anchor": {"word": "silver"}}]}},
        {"id": "b", "slide": "RevealSlide",
         "params": {"title": "T", "points": [
             {"text": "Old", "at": -1},
             {"text": "New", "anchor": {"word": "money"}}]},
         "start_anchor": {"turn": 0, "word": "flooded"},
         "end_anchor": {"turn": 1, "end": True}},
    ])
    out, errors, _ = rc.resolve(plan, TIMINGS, WORDS)
    assert not errors, errors
    assert out["scenes"][0]["params"]["panels"][0]["at"] == 3.8
    assert out["scenes"][0]["word_times"]["silver"] == 3.8
    pts = out["scenes"][1]["params"]["points"]
    assert pts[0]["at"] == -1 and pts[1]["at"] == 5.8  # 12.6-6.8


def test_pop_duration_clipped_and_positions_alternate():
    plan = _plan([
        {"id": "a", "slide": "DisplayHeadline",
         "params": {"headline": "H"},
         "end_anchor": {"turn": 0, "word": "flooded"},
         "overlays": [
             {"type": "keywordpop", "word": "silver",
              "anchor": {"word": "silver"}},
             {"type": "keywordpop", "word": "start",
              "anchor": {"word": "start"}}]},
    ])
    # scene 0-6.8; silver@3.8 (3.0s fits), start@2.0 overlaps it
    out, errors, warns = rc.resolve(plan, TIMINGS, WORDS)
    assert not errors, errors
    pops = out["scenes"][0]["overlays"]
    by_word = {p["word"]: p for p in pops}
    assert by_word["silver"]["duration"] == 3.0
    assert by_word["start"]["duration"] == 3.0
    assert {by_word["silver"]["position"],
            by_word["start"]["position"]} == {"left", "right"}
    assert any("auto-positioned" in w for w in warns)


def test_explicit_overflow_rejected():
    plan = _plan([
        {"id": "a", "slide": "DisplayHeadline",
         "params": {"headline": "H"},
         "end_anchor": {"turn": 0, "word": "silver"},
         "overlays": [{"type": "keywordpop", "word": "start",
                       "anchor": {"word": "start"}, "duration": 9.0}]},
    ])
    _, errors, _ = rc.resolve(plan, TIMINGS, WORDS)
    assert len(errors) == 1 and "overflows" in errors[0]


def test_until_derives_back_to_back_captions():
    plan = _plan([
        {"id": "a", "slide": "DisplayHeadline",
         "params": {"headline": "H"},
         "end_anchor": {"turn": 0, "end": True},
         "overlays": [
             {"type": "caption", "text": "first",
              "anchor": {"word": "start"},
              "until": {"word": "silver"}},
             {"type": "caption", "text": "second",
              "anchor": {"word": "silver"}}]},
    ])
    out, errors, _ = rc.resolve(plan, TIMINGS, WORDS)
    assert not errors, errors
    caps = out["scenes"][0]["overlays"]
    assert caps[0]["start"] == 2.0  # start@2.0 abs, scene base 0.0
    assert caps[0]["duration"] == 1.8  # silver@3.8 - start@2.0
    assert caps[1]["start"] == 3.8
    assert "duration" not in caps[1]  # rest of scene (renderer default)


def test_until_without_start_rejected():
    plan = _plan([
        {"id": "a", "slide": "DisplayHeadline",
         "params": {"headline": "H"},
         "end_anchor": {"turn": 0, "end": True},
         "overlays": [{"type": "caption", "text": "x",
                       "until": {"word": "silver"}}]},
    ])
    _, errors, _ = rc.resolve(plan, TIMINGS, WORDS)
    assert len(errors) == 1 and "until needs" in errors[0]


def test_multi_hearing_alias_matches_either_form():
    plan = _plan([
        {"id": "a", "slide": "DisplayHeadline",
         "params": {"headline": "H"},
         "end_anchor": {"turn": 0, "end": True},
         "overlays": [{"type": "keywordpop", "word": "SILVER",
                       "anchor": {"word": "silver"}}]},
    ])
    out, errors, _ = rc.resolve(plan, TIMINGS, WORDS,
                                {"silver": ["silver", "sliver"]})
    assert not errors, errors
    assert out["scenes"][0]["overlays"][0]["start"] == 3.8


def test_v1_rejected():
    _, errors, _ = rc.resolve({"version": 1, "scenes": []},
                              TIMINGS, WORDS)
    assert errors and "v2-only" in errors[0]


def test_lint_rejects_unresolved_anchors():
    plan = _plan([{"id": "a", "slide": "DisplayHeadline",
                   "params": {"headline": "H"},
                   "start_anchor": {"turn": 0, "word": "start"},
                   "end_anchor": {"turn": 0, "end": True},
                   "overlays": [{"type": "caption", "text": "t",
                                 "anchor": {"word": "start"}}]}])
    errors, _ = lint_plan.lint_plan(plan)
    assert len(errors) == 1 and "resolve_cues.py" in errors[0]


def test_lint_pop_default_is_3s_not_rest_of_scene():
    # Two right-side pops 4s apart in a 20s scene: no time overlap
    # under the renderer-true 3.0s default (the old rest-of-scene
    # default invented a collision).
    plan = {"version": 1, "episode": "t", "scenes": [
        {"id": "a", "slide": "DisplayHeadline", "turns": [0, 0],
         "params": {"headline": "H"}, "duration_sec": 20.0,
         "overlays": [
             {"type": "keywordpop", "word": "one", "start": 1.0},
             {"type": "keywordpop", "word": "two", "start": 5.0}]},
    ]}
    errors, _ = lint_plan.lint_plan(plan)
    assert not errors, errors
