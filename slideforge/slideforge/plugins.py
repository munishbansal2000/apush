"""Plugin model: registries + entry-point discovery.

Four plugin kinds:
  slide       a Scene subclass, e.g. ``slides.register("title", TitleSlide)``
  transition  a ``(frame_a, frame_b, k) -> frame`` function
  background  a ``(slide, w, h, t, spec) -> frame`` function
  vision      a ``(image_path, places) -> raw_text`` waypoint reader
  gen         an image-generation ``(prompt, out_path, **opts) -> out_path``

Built-ins register themselves with the decorators below at import time.
Third-party packages expose plugins via entry points::

    [project.entry-points."slideforge.slides"]
    my_slide = "my_package:my_slide_cls"

and they are picked up by :func:`discover`.
"""

from importlib.metadata import entry_points


class PluginRegistry:
    def __init__(self, kind):
        self.kind = kind
        self._d = {}

    def register(self, name, obj):
        if name in self._d:
            raise ValueError(f"duplicate {self.kind} plugin: {name!r}")
        self._d[name] = obj

    def get(self, name):
        try:
            return self._d[name]
        except KeyError:
            known = ", ".join(self.names()) or "(none)"
            raise KeyError(
                f"unknown {self.kind} plugin {name!r}; known: {known}")

    def names(self):
        return sorted(self._d)


slide_registry = PluginRegistry("slide")
transition_registry = PluginRegistry("transition")
background_registry = PluginRegistry("background")
vision_registry = PluginRegistry("vision")
gen_registry = PluginRegistry("gen")


def _decorator(registry):
    def deco(name):
        def wrap(obj):
            registry.register(name, obj)
            obj.plugin_name = name
            return obj
        return wrap
    return deco


slide = _decorator(slide_registry)
transition = _decorator(transition_registry)
background = _decorator(background_registry)
vision = _decorator(vision_registry)
gen = _decorator(gen_registry)


_ENTRY_GROUPS = (
    (slide_registry, "slideforge.slides"),
    (transition_registry, "slideforge.transitions"),
    (background_registry, "slideforge.backgrounds"),
    (vision_registry, "slideforge.visions"),
    (gen_registry, "slideforge.gens"),
)


def discover():
    """Load third-party plugins declared via entry points. Idempotent-ish:
    already-registered names are skipped so double discovery is harmless."""
    for registry, group in _ENTRY_GROUPS:
        try:
            eps = entry_points(group=group)
        except TypeError:  # very old importlib.metadata
            eps = [ep for ep in entry_points().get(group, [])]
        for ep in eps:
            if ep.name not in registry._d:
                registry.register(ep.name, ep.load())
