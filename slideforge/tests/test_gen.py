import os
import unittest
from unittest import mock

from slideforge import gen
from slideforge.plugins import gen_registry


class TestGen(unittest.TestCase):
    def test_providers_registered(self):
        self.assertIn("agent", gen_registry.names())
        self.assertIn("openai", gen_registry.names())

    def test_unknown_provider_raises_helpful(self):
        with self.assertRaises(KeyError) as cm:
            gen.generate("a prompt", "/tmp/x.png", provider="nope")
        self.assertIn("nope", str(cm.exception))

    def test_agent_provider_explains_itself(self):
        with self.assertRaises(RuntimeError) as cm:
            gen.generate("a prompt", "/tmp/x.png", provider="agent")
        msg = str(cm.exception)
        self.assertIn("/tmp/x.png", msg)
        self.assertIn("a prompt", msg)

    def test_openai_without_key(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("OPENAI_API_KEY", None)
            with self.assertRaises(RuntimeError) as cm:
                gen.generate("a prompt", "/tmp/x.png", provider="openai")
        self.assertIn("OPENAI_API_KEY", str(cm.exception))

    def test_autodetect_prefers_openai_when_key_set(self):
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "x"}):
            self.assertEqual(gen.autodetect(), "openai")

    def test_autodetect_falls_back_to_agent(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("OPENAI_API_KEY", None)
            self.assertEqual(gen.autodetect(), "agent")

    def test_custom_provider_pluggable(self):
        from slideforge.plugins import gen as gen_deco
        calls = []

        @gen_deco("test-tmp-gen")
        def _tmp(prompt, out_path, **opts):
            calls.append((prompt, out_path))
            return out_path

        try:
            out = gen.generate("p", "/tmp/y.png", provider="test-tmp-gen")
            self.assertEqual(out, "/tmp/y.png")
            self.assertEqual(calls, [("p", "/tmp/y.png")])
        finally:
            del gen_registry._d["test-tmp-gen"]


if __name__ == "__main__":
    unittest.main()
