import os
import unittest
from unittest import mock

from slideforge import vision


class TestVision(unittest.TestCase):
    PLACES = [{"name": "western Cuba", "label": "Cuba", "sub": "s1"},
              {"name": "Florida", "label": "La Florida", "sub": "s2"}]

    def test_parse_plain_json(self):
        raw = ('[{"name": "western Cuba", "at": [0.31, 0.41]}, '
               '{"name": "Florida", "at": [0.31, 0.35]}]')
        wps = vision.parse_waypoints(raw, self.PLACES)
        self.assertEqual(wps[0]["at"], [0.31, 0.41])
        self.assertEqual(wps[0]["label"], "Cuba")   # merged from places
        self.assertEqual(wps[0]["sub"], "s1")
        self.assertEqual(wps[1]["label"], "La Florida")

    def test_parse_markdown_fences(self):
        raw = ('```json\n[{"name": "western Cuba", "at": [0.3, 0.4]}]\n```')
        wps = vision.parse_waypoints(raw, self.PLACES)
        self.assertEqual(wps[0]["at"], [0.3, 0.4])

    def test_parse_unknown_place_keeps_name_as_label(self):
        raw = '[{"name": "Atlantis", "at": [0.5, 0.5]}]'
        wps = vision.parse_waypoints(raw, self.PLACES)
        self.assertEqual(wps[0]["label"], "Atlantis")

    def test_agent_reader_explains_itself(self):
        with self.assertRaises(RuntimeError):
            vision.vision_registry.get("agent")("/tmp/x.png", self.PLACES)

    def test_autodetect_falls_back_to_agent(self):
        # no ollama here, no API keys -> agent (mocked: must not depend on
        # whatever happens to listen on localhost, nor leak env changes)
        with mock.patch("slideforge.vision._ollama_up", return_value=False), \
                mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("OPENAI_API_KEY", None)
            os.environ.pop("ANTHROPIC_API_KEY", None)
            self.assertEqual(vision.autodetect(), "agent")


if __name__ == "__main__":
    unittest.main()
