"""Edge test-voice TTS + portable mix recipe (no network in tests)."""
import json
import os
import subprocess
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import edge_tts_turns as ett
import mix_turns


def test_turn_filename_format():
    assert ett.turn_filename(0) == "t00.mp3"
    assert ett.turn_filename(9) == "t09.mp3"
    with pytest.raises(ValueError):
        ett.turn_filename(100)


def test_voice_for_unknown_speaker_fails_fast():
    with pytest.raises(ValueError, match="no voice"):
        ett.voice_for("Narrator", ett.DEFAULT_VOICES)


def test_synthesize_stub_files_skip_and_force(tmp_path):
    turns = [{"speaker": "Maya", "text": "hi"},
             {"speaker": "Marcus", "text": "yo"}]
    calls = []

    def stub(text, voice, out, rate):
        calls.append((text, voice, out))
        with open(out, "wb") as f:
            f.write(b"x" * 2048)

    tts = str(tmp_path / "tts")
    ett.synthesize_turns(turns, tts, synth=stub)
    assert calls[0][1] == "en-US-AriaNeural"
    assert calls[1][1] == "en-US-GuyNeural"
    assert os.path.exists(os.path.join(tts, "t00.mp3"))
    # second run keeps files without re-synthesizing
    ett.synthesize_turns(turns, tts, synth=stub)
    assert len(calls) == 2
    # force re-synthesizes
    ett.synthesize_turns(turns, tts, synth=stub, force=True)
    assert len(calls) == 4


def _tone(path, seconds):
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
         "-i", f"sine=frequency=440:duration={seconds}",
         "-c:a", "libmp3lame", path],
        check=True)


def test_mix_matches_model(tmp_path):
    tts = tmp_path / "tts"
    tts.mkdir()
    for i in range(3):
        _tone(str(tts / f"t{i:02d}.mp3"), 0.5)
    out = str(tmp_path / "mix.mp3")
    mix_turns.mix(str(tts), out, offset=1.0, gap=0.5, tail=2.0)
    durs = [mix_turns.mp3_duration(str(tts / f"t{i:02d}.mp3"))
            for i in range(3)]
    model = mix_turns.mix_model_total(durs, 1.0, 0.5, 2.0)
    got = mix_turns.mp3_duration(out)
    assert abs(got - model) <= 0.1


def test_mix_no_turns_refuses(tmp_path):
    tts = tmp_path / "empty"
    tts.mkdir()
    with pytest.raises(RuntimeError, match="no turn MP3s"):
        mix_turns.mix(str(tmp_path / "empty"), str(tmp_path / "mix.mp3"))


def test_timing_persists_mix_recipe(tmp_path):
    from stages.timing import build
    tts = tmp_path / "tts"
    tts.mkdir()
    for i in range(2):
        _tone(str(tts / f"t{i:02d}.mp3"), 0.5)
    data = build(str(tts), offset=1.8, gap=0.6, tail=4.5)
    # refit + the compiler rebuild the mix model from these keys; a
    # missing tail silently drops the outro (seen live: 4.5s drift).
    assert data["offset"] == 1.8
    assert data["gap"] == 0.6
    assert data["tail"] == 4.5
    model = mix_turns.mix_model_total(
        [t["dur"] for t in data["turns"]], 1.8, 0.6, 4.5)
    assert abs(data["computed_total"] - model) < 0.01
