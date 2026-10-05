"""Meta director provider (stubbed HTTP; needs MODEL_API_KEY live)."""
import json
import os
import sys
import urllib.request

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import director as director_mod

TURNS = [
    {"speaker": "Maya", "text": "Silver mountain.", "duration_sec": 5.0,
     "word_times": [{"word": "silver", "start": 0.2}]},
]
MANIFEST = [{"path": "images/coin.jpg", "kind": "photo",
             "description": "a coin"}]
PLAN = {"version": 2, "episode": "t", "scenes": [
    {"id": "s0", "slide": "DisplayHeadline",
     "params": {"headline": "H"},
     "end_anchor": {"turn": 0, "end": True}}]}


class _Resp:
    def __init__(self, payload):
        self._payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def read(self):
        return json.dumps(self._payload).encode()


def test_meta_request_shape_and_parse(monkeypatch):
    seen = {}

    def fake_open(req, timeout=None):
        seen["url"] = req.full_url
        seen["headers"] = dict(req.header_items())
        seen["body"] = json.loads(req.data.decode())
        return _Resp({"output": [{"content": [
            {"type": "output_text",
             "text": json.dumps(PLAN)}]}]})

    monkeypatch.setattr(urllib.request, "urlopen", fake_open)
    monkeypatch.setenv("MODEL_API_KEY", "k")
    monkeypatch.delenv("META_API_BASE_URL", raising=False)
    out = director_mod.direct("t", TURNS, MANIFEST, provider="meta")
    assert out == PLAN
    assert seen["url"] == "https://api.meta.ai/v1/responses"
    assert seen["headers"]["Authorization"] == "Bearer k"
    body = seen["body"]
    assert body["model"] == "muse-spark-1.3-contributor"
    fmt = body["text"]["format"]
    assert fmt["type"] == "json_schema" and fmt["strict"] is True
    assert fmt["schema"]["additionalProperties"] is False
    prompt = body["input"][0]["content"][0]["text"]
    assert "WORD ANCHOR" in prompt and "Silver mountain" in prompt
    assert "STRUCTURED OUTPUT NOTE" in prompt


def test_meta_key_and_model_pin(monkeypatch):
    monkeypatch.delenv("MODEL_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="MODEL_API_KEY"):
        director_mod.direct("t", TURNS, MANIFEST, provider="meta")
    monkeypatch.setenv("MODEL_API_KEY", "k")
    with pytest.raises(RuntimeError, match="must be muse-spark"):
        director_mod.direct("t", TURNS, MANIFEST, provider="meta",
                            model="other")


def test_meta_output_text_shapes(monkeypatch):
    def fake_open(req, timeout=None):
        return _Resp({"output_text": json.dumps(PLAN)})

    monkeypatch.setattr(urllib.request, "urlopen", fake_open)
    monkeypatch.setenv("MODEL_API_KEY", "k")
    assert director_mod.direct("t", TURNS, MANIFEST,
                               provider="meta") == PLAN

    def fake_empty(req, timeout=None):
        return _Resp({"output": []})

    monkeypatch.setattr(urllib.request, "urlopen", fake_empty)
    with pytest.raises(RuntimeError, match="no output text"):
        director_mod.direct("t", TURNS, MANIFEST, provider="meta")


def test_strict_schema_and_null_stripping():
    schema = {"type": "object",
              "properties": {"a": {"type": "string"},
                             "b": {"type": "string"}},
              "required": ["a"],
              "uniqueItems": True}
    strict = director_mod._strict_schema_for(schema)
    assert "uniqueItems" not in strict
    assert strict["required"] == ["a", "b"]
    assert strict["properties"]["b"] == {
        "anyOf": [{"type": "string"}, {"type": "null"}]}
    val = {"a": "x", "b": None}
    assert director_mod._strip_optional_nulls(val, schema) == {"a": "x"}
    val2 = {"a": None}
    assert director_mod._strip_optional_nulls(val2, schema) == {"a": None}
