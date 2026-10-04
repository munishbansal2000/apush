"""Tests for direction tags: parsing, SSML compilation, Fish stripping, gate."""
import unittest

from pipeline.common import PipelineError
from pipeline.direction import parse, to_ssml, strip_for_fish, voice_segments, tag_names
from pipeline.gates import direction_gate

VOICES = {"host": {"edge_voice": "en-US-GuyNeural"},
          "guest": {"edge_voice": "en-US-DavisNeural"}}


class ParseTests(unittest.TestCase):
    def test_plain_text_has_no_tags(self):
        self.assertEqual(tag_names("Just words here."), set())

    def test_point_and_pair_tags(self):
        names = tag_names("Hello [beat] world [emphasis]big[/emphasis] [pause:2] end")
        self.assertEqual(names, {"beat", "emphasis", "pause"})

    def test_unknown_tag_fails(self):
        with self.assertRaises(PipelineError):
            parse("Hello [dramatic] world", "w")

    def test_unclosed_pair_fails(self):
        with self.assertRaises(PipelineError):
            parse("Hello [slow] world", "w")

    def test_misnested_pair_fails(self):
        with self.assertRaises(PipelineError):
            parse("[slow]a[emphasis]b[/slow]c[/emphasis]", "w")

    def test_closing_point_tag_fails(self):
        with self.assertRaises(PipelineError):
            parse("a [/beat] b", "w")

    def test_pause_requires_number(self):
        with self.assertRaises(PipelineError):
            parse("a [pause:soon] b", "w")

    def test_pause_range(self):
        with self.assertRaises(PipelineError):
            parse("a [pause:30] b", "w")
        tag_names("a [pause:1.5] b")  # ok

    def test_voice_tag(self):
        names = tag_names("[VOICE:guest] hello")
        self.assertEqual(names, {"VOICE"})

    def test_es_pair(self):
        names = tag_names("He reached [es]Tenochtitlan[/es] in 1519 [beat]")
        self.assertEqual(names, {"es", "beat"})

    def test_es_unclosed_fails(self):
        with self.assertRaises(PipelineError):
            parse("He reached [es]Tenochtitlan", "w")

    def test_es_misnested_fails(self):
        with self.assertRaises(PipelineError):
            parse("[es]a[emphasis]b[/es]c[/emphasis]", "w")

    def test_date_ok(self):
        names = tag_names("In [date:1492] Columbus sailed [beat]")
        self.assertEqual(names, {"date", "beat"})

    def test_date_requires_year(self):
        for bad in ("[date:soon]", "[date:99]", "[date:2200]", "[date:1492.5]"):
            with self.assertRaises(PipelineError, msg=bad):
                parse(f"In {bad} x [beat]", "w")

    def test_date_requires_argument(self):
        with self.assertRaises(PipelineError):
            parse("In [date] x [beat]", "w")

    def test_emotion_intensity_ok(self):
        names = tag_names("[fierce:1.5] Arise! [beat]")
        self.assertEqual(names, {"fierce", "beat"})

    def test_emotion_intensity_bad(self):
        for bad in ("[fierce:fast]", "[fierce:9]", "[fierce:0.1]", "[solemn:0]"):
            with self.assertRaises(PipelineError, msg=bad):
                parse(f"{bad} Arise! [beat]", "w")


class SsmlTests(unittest.TestCase):
    def test_beat_and_pause(self):
        ssml = to_ssml("One [beat] two [pause:2] three", "w", "en-US-GuyNeural", VOICES)
        self.assertIn('<break time="500ms"/>', ssml)
        self.assertIn('<break time="2000ms"/>', ssml)
        self.assertTrue(ssml.startswith("<speak"))
        self.assertIn('xmlns:mstts=', ssml)

    def test_emphasis_pair(self):
        ssml = to_ssml("a [emphasis]big[/emphasis] b", "w", "en-US-GuyNeural", VOICES)
        self.assertIn('<emphasis level="strong">big</emphasis>', ssml)

    def test_slow_fast(self):
        ssml = to_ssml("[slow]a[/slow] [fast]b[/fast]", "w", "en-US-GuyNeural", VOICES)
        self.assertIn('<prosody rate="slow">a</prosody>', ssml)
        self.assertIn('<prosody rate="fast">b</prosody>', ssml)

    def test_emotion_maps_to_express_as(self):
        ssml = to_ssml("[fierce] Arise!", "w", "en-US-GuyNeural", VOICES)
        self.assertIn('<mstts:express-as style="angry">', ssml)

    def test_emotion_intensity_maps_to_styledegree(self):
        ssml = to_ssml("[fierce:1.5] Arise!", "w", "en-US-GuyNeural", VOICES)
        self.assertIn('<mstts:express-as style="angry" styledegree="1.5">', ssml)

    def test_emotion_without_intensity_has_no_styledegree(self):
        ssml = to_ssml("[fierce] Arise!", "w", "en-US-GuyNeural", VOICES)
        self.assertNotIn("styledegree", ssml)

    def test_es_maps_to_lang(self):
        ssml = to_ssml("He reached [es]Tenochtitlan[/es] in 1519.", "w",
                       "en-US-GuyNeural", VOICES)
        self.assertIn('<lang xml:lang="es-ES">Tenochtitlan</lang>', ssml)

    def test_es_nests_inside_emphasis(self):
        ssml = to_ssml("[emphasis]seize [es]Atahualpa[/es][/emphasis]", "w",
                       "en-US-GuyNeural", VOICES)
        self.assertIn('<emphasis level="strong">seize '
                      '<lang xml:lang="es-ES">Atahualpa</lang></emphasis>', ssml)

    def test_date_maps_to_say_as(self):
        ssml = to_ssml("In [date:1492] Columbus sailed.", "w",
                       "en-US-GuyNeural", VOICES)
        self.assertIn('<say-as interpret-as="date">1492</say-as>', ssml)

    def test_voice_switch(self):
        ssml = to_ssml("[VOICE:guest] Hello.", "w", "en-US-GuyNeural", VOICES)
        self.assertIn('<voice name="en-US-DavisNeural">', ssml)

    def test_voice_unknown_fails(self):
        with self.assertRaises(PipelineError):
            to_ssml("[VOICE:stranger] hi", "w", "en-US-GuyNeural", VOICES)

    def test_escapes_xml(self):
        ssml = to_ssml("fish & chips", "w", "en-US-GuyNeural", VOICES)
        self.assertIn("fish &amp; chips", ssml)


class FishTests(unittest.TestCase):
    def test_strip_converts_pauses(self):
        out = strip_for_fish("One [beat] two [pause:1] three [pause:3] four [emphasis]x[/emphasis]", "w")
        self.assertEqual(out, "One , two . three ... four x")

    def test_strip_es_and_date_keep_text(self):
        out = strip_for_fish("[es]Tenochtitlan[/es] fell in [date:1521] [beat] done", "w")
        self.assertEqual(out, "Tenochtitlan fell in 1521 , done")

    def test_emotions_stripped_by_default(self):
        out = strip_for_fish("[fierce] Arise! [whisper] shh [beat]", "w")
        self.assertEqual(out, " Arise!  shh ,")

    def test_emotions_become_markers_when_enabled(self):
        out = strip_for_fish("[fierce] Arise! [whisper] shh [beat]", "w",
                             fish_emotion_markers=True)
        self.assertIn("(angry)", out)
        self.assertIn("(whispering)", out)
        self.assertNotIn("[fierce]", out)

    def test_strong_fierce_marker(self):
        out = strip_for_fish("[fierce:2] Arise!", "w", fish_emotion_markers=True)
        self.assertIn("(furious)", out)
        out = strip_for_fish("[fierce] Arise!", "w", fish_emotion_markers=True)
        self.assertIn("(angry)", out)

    def test_voice_segments(self):
        segs = voice_segments("[VOICE:guest] Hi. [VOICE:host] Yo.", "w")
        self.assertEqual(segs[0][0], "guest")
        self.assertIn("Hi", segs[0][1])
        self.assertEqual(segs[1][0], "host")

    def test_no_voice_single_segment(self):
        segs = voice_segments("Just [beat] words.", "w")
        self.assertEqual(len(segs), 1)
        self.assertIsNone(segs[0][0])
        self.assertEqual(segs[0][1], "Just , words.")

    def test_segments_pass_marker_flag(self):
        segs = voice_segments("[fierce] Hi.", "w", fish_emotion_markers=True)
        self.assertIn("(angry)", segs[0][1])
        segs = voice_segments("[fierce] Hi.", "w")
        self.assertNotIn("(angry)", segs[0][1])


class DirectionGateTests(unittest.TestCase):
    def _manifest(self, text, voices=None):
        return {"lesson_id": "l1", "tts": {"voices": voices or {}},
                "scenes": [{"id": "s1", "narration": {"text": text}}]}

    def test_no_tags_fails(self):
        with self.assertRaises(PipelineError):
            direction_gate(self._manifest("Plain flat read."))

    def test_tagged_passes(self):
        direction_gate(self._manifest("Columbus was wrong. [beat] His math shrank the Earth."))

    def test_bad_tag_fails(self):
        with self.assertRaises(PipelineError):
            direction_gate(self._manifest("Hello [dramatic] world [beat]"))

    def test_voice_must_exist(self):
        with self.assertRaises(PipelineError):
            direction_gate(self._manifest("[VOICE:ghost] boo [beat]",
                                          voices={"host": {}}))

    def test_es_and_date_pass(self):
        direction_gate(self._manifest(
            "He reached [es]Tenochtitlan[/es] in [date:1519] [beat]"))

    def test_bad_date_fails(self):
        with self.assertRaises(PipelineError):
            direction_gate(self._manifest("In [date:soon] x [beat]"))

    def test_bad_intensity_fails(self):
        with self.assertRaises(PipelineError):
            direction_gate(self._manifest("[fierce:9] Arise! [beat]"))


if __name__ == "__main__":
    unittest.main()
