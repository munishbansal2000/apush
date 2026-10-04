"""Tests for Edge TTS synthesis (no network; edge-tts is stubbed)."""
import sys
import tempfile
import types
import unittest
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "video_pipeline"))

from pipeline.tts import _shift_boundaries, render_edge


def _tone_wav(path: Path, seconds: float = 0.5) -> None:
    frames = int(24000 * seconds)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(24000)
        handle.writeframes(b"\0\0" * frames)


class ShiftBoundariesTests(unittest.TestCase):
    def test_shifts_offsets(self):
        rows = [{"text": "hi", "offset": 1.0, "duration": 0.2},
                {"text": "there", "offset": 1.5, "duration": 0.3}]
        shifted = _shift_boundaries(rows, 10.0)
        self.assertEqual([row["offset"] for row in shifted], [11.0, 11.5])
        self.assertEqual([row["text"] for row in shifted], ["hi", "there"])
        self.assertEqual(rows[0]["offset"], 1.0)  # input untouched

    def test_empty(self):
        self.assertEqual(_shift_boundaries([], 5.0), [])


class RenderEdgeTests(unittest.TestCase):
    def test_plain_text_passthrough_with_word_boundaries(self):
        seen: dict = {}

        class FakeCommunicate:
            audio: bytes = b""

            def __init__(self, text, voice, **kwargs):
                seen["text"] = text
                seen["voice"] = voice
                seen["kwargs"] = kwargs

            async def stream(self):
                yield {"type": "audio", "data": FakeCommunicate.audio}
                yield {"type": "WordBoundary", "text": "hi",
                       "offset": 0, "duration": 2_000_000}

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            tone = root / "tone.wav"
            _tone_wav(tone)
            FakeCommunicate.audio = tone.read_bytes()
            stub = types.ModuleType("edge_tts")
            stub.Communicate = FakeCommunicate
            real = sys.modules.get("edge_tts")
            sys.modules["edge_tts"] = stub
            try:
                duration, boundaries = render_edge(
                    "hi there", root / "scene.wav",
                    "en-US-GuyNeural", "+0%", "+0Hz")
            finally:
                if real is None:
                    del sys.modules["edge_tts"]
                else:
                    sys.modules["edge_tts"] = real
            # Plain text reaches the service untouched: no SSML wrapping,
            # which edge-tts would read aloud as literal words.
            self.assertEqual(seen["text"], "hi there")
            self.assertEqual(seen["voice"], "en-US-GuyNeural")
            self.assertEqual(seen["kwargs"].get("boundary"), "WordBoundary")
            self.assertAlmostEqual(duration, 0.5, places=2)
            self.assertEqual(boundaries,
                             [{"text": "hi", "offset": 0.0, "duration": 0.2}])


if __name__ == "__main__":
    unittest.main()
