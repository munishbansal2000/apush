"""Ollama director provider (stubbed HTTP) + direct-stage anchor path."""
import io
import json
import os
import sys
import urllib.request

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import director as director_mod
from stages import direct as direct_stage

TURNS = [
    {"speaker": "Maya", "text": "Silver mountain.", "duration_sec": 5.0,
     "word_times": [{"word": "silver", "start": 0.2}]},
    {"speaker": "Marcus", "text": "Missions too.", "duration_sec": 6.0,
     "word_times": [{"word": "missions", "start": 0.3}]},
]
MANIFEST = [{"path": "images/coin.jpg", "kind": "photo",
             "description": "a coin"}]
PLAN = {"version": 2, "episode": "t", "scenes": [
    {"id": "s0", "slide": "DisplayHeadline",
     "params": {"headline": "H"},
     "end_anchor": {"turn": 1, "end": True},
     "overlays": [{"type": "keywordpop", "word": "SILVER",
                   "anchor": {"word": "silver"}}]}]}


class _Resp:
    def __init__(self, payload):
        self._payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def read(self):
        return json.dumps(self._payload).encode()


def _chat(content, done=True):
    return {"message": {"content": content}, "done": done}


def test_ollama_request_shape_and_parse(monkeypatch):
    seen = {}

    def fake_open(req, timeout=None):
        seen["url"] = req.full_url
        seen["body"] = json.loads(req.data.decode())
        seen["timeout"] = timeout
        return _Resp(_chat(json.dumps(PLAN)))

    monkeypatch.setattr(urllib.request, "urlopen", fake_open)
    monkeypatch.delenv("OLLAMA_MODEL", raising=False)
    out = director_mod.direct("t", TURNS, MANIFEST, provider="ollama")
    assert out == PLAN
    assert seen["url"] == "http://localhost:11434/api/chat"
    body = seen["body"]
    assert body["model"] == "qwen3.8:27b"
    assert body["format"] == "json" and body["stream"] is False
    assert body["messages"][0]["role"] == "system"
    assert "WORD ANCHOR" in body["messages"][0]["content"]
    assert "u1-e1-act1-test" not in body["messages"][0]["content"]
    user = body["messages"][1]["content"]
    assert "Silver mountain" in user and "WORD TIMES" in user
    assert "images/coin.jpg" in user


def test_ollama_env_overrides(monkeypatch):
    seen = {}

    def fake_open(req, timeout=None):
        seen["url"] = req.full_url
        seen["body"] = json.loads(req.data.decode())
        return _Resp(_chat(json.dumps(PLAN)))

    monkeypatch.setattr(urllib.request, "urlopen", fake_open)
    monkeypatch.setenv("OLLAMA_MODEL", "custom:1b")
    monkeypatch.setenv("OLLAMA_URL", "http://gpu:11434/")
    director_mod.direct("t", TURNS, MANIFEST, provider="ollama")
    assert seen["url"] == "http://gpu:11434/api/chat"
    assert seen["body"]["model"] == "custom:1b"


def test_ollama_failures(monkeypatch):
    def fake_open(req, timeout=None):
        raise OSError("refused")

    monkeypatch.setattr(urllib.request, "urlopen", fake_open)
    with pytest.raises(RuntimeError, match="is Ollama"):
        director_mod.direct("t", TURNS, MANIFEST, provider="ollama")

    monkeypatch.setattr(urllib.request, "urlopen",
                        lambda req, timeout=None: _Resp(_chat("nope")))
    with pytest.raises(RuntimeError, match="non-JSON"):
        director_mod.direct("t", TURNS, MANIFEST, provider="ollama")

    monkeypatch.setattr(
        urllib.request, "urlopen",
        lambda req, timeout=None: _Resp(_chat(json.dumps(PLAN),
                                              done=False)))
    with pytest.raises(RuntimeError, match="truncated"):
        director_mod.direct("t", TURNS, MANIFEST, provider="ollama")

    bad = {"version": 1, "episode": "t", "scenes": []}
    monkeypatch.setattr(urllib.request, "urlopen",
                        lambda req, timeout=None: _Resp(
                            _chat(json.dumps(bad))))
    with pytest.raises(RuntimeError, match="v2 anchored"):
        director_mod.direct("t", TURNS, MANIFEST, provider="ollama")


def test_build_prompt_defaults_stable():
    out = director_mod.build_prompt("e", TURNS, MANIFEST)
    assert out.startswith(director_mod.SYSTEM_PROMPT)
    out6 = director_mod.build_prompt("e", TURNS, MANIFEST,
                                     system=director_mod._director_system())
    assert "WORD ANCHOR" in out6 and "Silver mountain" in out6


def _ep(tmp_path):
    ep = tmp_path / "ep"
    (ep / "work").mkdir(parents=True)
    timings = {"gap": 0.6, "offset": 1.8, "tail": 4.5, "turns": [
        {"turn": "t00", "file": "t00.mp3", "start": 1.8, "end": 6.8,
         "dur": 5.0},
        {"turn": "t01", "file": "t01.mp3", "start": 7.4, "end": 13.4,
         "dur": 6.0}]}
    words = {"t00": [{"word": "silver", "start": 0.2}],
             "t01": [{"word": "missions", "start": 0.3}]}
    (ep / "work" / "timings.json").write_text(json.dumps(timings),
                                              encoding="utf-8")
    (ep / "work" / "word_times.json").write_text(json.dumps(words),
                                                 encoding="utf-8")
    (ep / "script_turns.json").write_text(json.dumps([
        {"speaker": "Maya", "text": "Silver mountain."},
        {"speaker": "Marcus", "text": "Missions too."}]), encoding="utf-8")
    (ep / "images.json").write_text(json.dumps({"images": {}}),
                                    encoding="utf-8")
    return str(ep)


def test_direct_stage_resolves_anchors(tmp_path, monkeypatch):
    ep = _ep(tmp_path)
    monkeypatch.setattr(director_mod, "direct", lambda *a, **k: PLAN)
    out = direct_stage.run(ep, {"episode": "ep", "manifest": "images.json",
                                "tts_dir": "tts", "audio": "mix.mp3"},
                           provider="ollama")
    assert out.endswith("scene_plan.json")
    resolved = json.load(io.open(out, encoding="utf-8"))
    assert resolved["scenes"][0]["start_sec"] == 0.0
    assert resolved["scenes"][0]["duration_sec"] == 13.4
    draft = json.load(io.open(os.path.join(ep, "work", "director_draft.json"),
                              encoding="utf-8"))
    assert "end_anchor" in draft["scenes"][0]
    assert resolved["scenes"][0]["overlays"][0]["start"] == 2.0


def test_direct_stage_rejects_bad_anchors(tmp_path, monkeypatch):
    ep = _ep(tmp_path)
    bad = {"version": 2, "episode": "t", "scenes": [
        {"id": "s0", "slide": "DisplayHeadline",
         "params": {"headline": "H"},
         "start_anchor": {"turn": 0, "word": "gold"},
         "end_anchor": {"turn": 1, "end": True}}]}
    monkeypatch.setattr(director_mod, "direct", lambda *a, **k: bad)
    with pytest.raises(RuntimeError, match="resolve errors"):
        direct_stage.run(ep, {"episode": "ep", "manifest": "images.json",
                              "tts_dir": "tts", "audio": "mix.mp3"},
                         provider="ollama")
