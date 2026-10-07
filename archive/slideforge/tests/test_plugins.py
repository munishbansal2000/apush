import unittest

from slideforge import plugins
from slideforge.plugins import (
    slide_registry, transition_registry, background_registry,
    vision_registry, slide, transition,
)


class TestRegistries(unittest.TestCase):
    def test_builtin_slides_registered(self):
        for name in ["title", "bullets", "steps", "display-points",
                     "display-headline", "duo", "image", "split", "quote",
                     "stat", "kenburns", "callout", "map-zoom", "route"]:
            self.assertIn(name, slide_registry.names(), name)

    def test_builtin_transitions_registered(self):
        for name in ["crossfade", "dip", "wipe", "slide", "zoom"]:
            self.assertIn(name, transition_registry.names(), name)

    def test_builtin_backgrounds_registered(self):
        for name in ["solid", "gradient", "image", "apush"]:
            self.assertIn(name, background_registry.names(), name)

    def test_builtin_visions_registered(self):
        for name in ["agent", "ollama", "openai", "anthropic"]:
            self.assertIn(name, vision_registry.names(), name)

    def test_unknown_plugin_raises_helpful_keyerror(self):
        with self.assertRaises(KeyError) as cm:
            slide_registry.get("no-such-slide")
        self.assertIn("no-such-slide", str(cm.exception))
        self.assertIn("title", str(cm.exception))  # lists known plugins

    def test_duplicate_registration_rejected(self):
        with self.assertRaises(ValueError):
            slide_registry.register("title", object)

    def test_decorator_sets_plugin_name(self):
        @slide("test-tmp-slide")
        class Tmp:
            pass
        try:
            self.assertEqual(Tmp.plugin_name, "test-tmp-slide")
            self.assertIs(slide_registry.get("test-tmp-slide"), Tmp)
        finally:
            del slide_registry._d["test-tmp-slide"]

    def test_discover_is_harmless(self):
        before = {r.kind: r.names() for r in
                  (slide_registry, transition_registry,
                   background_registry, vision_registry)}
        plugins.discover()
        after = {r.kind: r.names() for r in
                 (slide_registry, transition_registry,
                  background_registry, vision_registry)}
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
