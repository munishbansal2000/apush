# examples

Self-contained examples that use slideforge as a library, without modifying it.

- `plugin_slide.py` — a third-party plugin slide: subclass `Slide`, decorate
  with `@slide("name")` from `slideforge.plugins`, and it becomes available
  through `slide_registry` (and `Movie.add` indirectly). Run it with
  `python3 examples/plugin_slide.py`; it renders a 3-second sample to
  `/tmp/plugin_slide_example.mp4`.

To ship a plugin as a package, expose it via entry points instead of the
decorator-at-import pattern:

```toml
[project.entry-points."slideforge.slides"]
my-slide = "my_package:MySlide"
```

slideforge discovers these automatically on import. The same mechanism works
for `slideforge.transitions`, `slideforge.backgrounds`, and
`slideforge.visions`.
