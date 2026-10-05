# slideforge

A tiny, reusable engine for building animated slide videos in pure Python.
PIL + numpy render every frame; ffmpeg encodes. No moviepy, no ImageMagick.

## Install

```bash
pip install -e .          # from this directory
# or: pip install slideforge
```

Requires Python ≥ 3.10, Pillow, numpy, and an `ffmpeg` binary on PATH.

## Quick start

```python
from slideforge import Movie, Config, TitleSlide, KenBurnsSlide, zoom_on, full_view

movie = Movie(Config(w=1920, h=1080, fps=30), progress_bar=True)

movie.add(TitleSlide("Hello", "A reusable animated-slides engine"))

movie.add(KenBurnsSlide(
    "photo.jpg",                                   # path or numpy RGB array
    stops=[full_view(),                            # start wide...
           zoom_on(0.30, 0.35, 2.5),               # ...push into top-left at 2.5x
           zoom_on(0.70, 0.60, 2.0)],              # ...pan across to bottom-right
    hold=1.2,                                      # seconds to linger on each view
    title="The Ken Burns camera",
    caption="Pan and zoom to any part of an image"))

movie.render("out.mp4")
```

Runnable examples: `python -m slideforge.demo_duo` → `demo_duo.mp4`
(also `demo`, `demo_points`, `demo_apush`, `demo_apush2`, `demo_routes`).

## Concepts

- **Scene** — anything with a `duration` and a `frame(t)` method returning an
  RGB numpy array. Subclass it (or write a plugin) to build components.
- **Movie** — ordered scenes joined by transitions; `frame_at(t)` resolves the
  timeline (transitions overlap the boundary); `render()` pipes raw frames to
  ffmpeg (`libx264`, `yuv420p`, faststart).
- **Views** — a camera view is `(cx, cy, fw)`: center as fractions of the image,
  plus view-width as a fraction of image width (smaller = more zoom). The crop
  box always matches the output aspect ratio, so nothing ever stretches.
  `full_view()` = the whole image; `zoom_on(cx, cy, zoom)` = centered at a
  point, zoomed in `zoom`×.

## Components (`slideforge.slides`)

| Slide | What it does |
|---|---|
| `TitleSlide(title, subtitle)` | Centered title, staggered word entrance, breathing glow |
| `BulletSlide(title, bullets)` | Bullets reveal one by one with slide+fade; `("parent", ["child", ...])` tuples nest indented child bullets |
| `StepsSlide(title, steps, banner=...)` | Numbered points with big accent numerals + sub-bodies; optional red banner chip on top ("Cause #1: Gold") |
| `DisplayPointsSlide(points)` | Huge punchy display type ("1. New Tech") over drifting bg; `**bold**` markers pop keywords heavier |
| `DisplayHeadline(head, sub)` | Centered section header: huge outlined headline + smaller sub; `**bold**` markers supported |
| `CompareSlide(title, left, right)` | Red banner header + two-column comparison with subheads and staggered bullets ("Conflicting Worldviews") |
| `HighlightSlide(text, card=...)` | Bold paper-style paragraph; `==highlight==` markers get red marker swashes that wipe in; optional tilted photo `card` with caption pinned top-right |
| `CollageSlide(cards, banner, notes)` | Scrapbook layout: positioned photo cards (sticker/frame/circle borders) + center banner + marker text notes |
| `TitleCardSlide(image, title, kicker)` | Postcard title: script kicker + giant heavy title over full-bleed drifting art ("Greetings from CAHOKIA") |
| `DuoSlide(left, right)` | Two panels: portraits with name plates ("two people") or portrait + big outlined bullets; per-panel `focus` fixes headroom on tall photos |
| `ImageSlide(image, caption, title)` | Full-bleed image, slow drift, scrims for readability |
| `SplitSlide(image, heading, body, side)` | Image half + text panel |
| `QuoteSlide(quote, byline)` | Serif pull-quote with giant quotation mark |
| `StatSlide(value, label, prefix, suffix)` | Animated count-up number |
| `KenBurnsSlide(image, stops, hold, title, caption)` | Multi-stop camera tour with holds |
| `CalloutSlide(image, callouts)` | Full view → zoom into labeled regions with pulsing rings → pull back |
| `MapZoomSlide(map, markers)` | Vintage-map tour: dive to labeled locations with pulsing pins |
| `RouteSlide(map, waypoints)` | Animated travel route: arcing dashed line draws as camera hops stops; or `RouteSlide.from_route("columbus_1492")` |

Overlays (`slideforge.overlays`): `LowerThird(name, role)`, `Caption(text)`,
`KeywordPop(word, position=...)` — a giant outlined keyword that punches in
beside the action (the "MAIZE" beat),
`Sticker(image, at=..., label=...)` — cutout photo with a rough white
sticker edge (or circle badge) placed anywhere on the frame,
`RegionGlow(at=..., label=...)` — a pulsing tint blob marking a map region —
wrap any scene with `with_overlays(scene, [...])`.

Rich text markers (display + paper slides): `**bold**` renders keywords
heavier; `==highlight==` renders a red marker swash behind the words
(HighlightSlide wipes it in).

APUSH pack (`slideforge.apush`): `apush_bg(era, dim=0.55, drift=True)` wraps an
era background (colonial, revolution, civilwar, civilrights, twenties,
westward, gilded, ww2, plus `map1863`) into a slide bg spec with a slow
Ken Burns push-in, so text slides get camera motion too.

Background rule: a slide never renders on a blank background. The default
bg is a procedural textured cinematic backdrop (`{"type": "textured"}`),
but authors should always pass a contextual image — `apush_bg(era)`, a map,
or a photo. `validate()` warns on any slide without one (full-bleed image
slides like KenBurns/Callout/MapZoom/Route are exempt — their image IS the
background).

Transitions (`movie.add(scene, transition=..., trans_dur=...)`):
`crossfade`, `wipe`, `slide`, `dip` (through black), `zoom` (scale + fade),
`cut`.

Easing (`slideforge.easing`): `linear`, `smooth`, `ease_in`, `ease_out`,
`ease_in_out`, `ease_out_back`, `ease_out_elastic`. Camera moves default to
`smooth` (smoothstep) — eased moves are what make it feel professional.

## Plugin model

Slides, transitions, backgrounds, and vision readers are plugins, resolved
through registries (`slideforge.plugins`):

```python
from slideforge.plugins import slide, slide_registry
from slideforge.slides import Slide

@slide("big-emoji")
class BigEmoji(Slide):
    def frame(self, t):
        ...  # return an RGB numpy frame

cls = slide_registry.get("big-emoji")   # KeyError lists known plugins
```

Kinds and their contracts:

| Kind | Name | Contract |
|---|---|---|
| slide | `slide_registry` | `Scene` subclass with `frame(t)` |
| transition | `transition_registry` | `(frame_a, frame_b, k) -> frame` |
| background | `background_registry` | `(slide, w, h, t, spec) -> frame` |
| vision | `vision_registry` | `(image_path, places) -> raw JSON text` |

Decorators: `@slide("name")`, `@transition("name")`, `@background("name")`,
`@vision("name")`. Third-party packages expose plugins via entry points —
no import needed:

```toml
[project.entry-points."slideforge.slides"]
my-slide = "my_package:MySlide"
```

They are discovered automatically on `import slideforge`. List everything
with `slideforge plugins` or `slide_registry.names()`.

## CLI

```bash
slideforge make-route --map map.jpg --places places.json --name x --out x.mp4
slideforge make-route --fetch-map "Gutierrez 1562 Americas" --places places.json --name x --out x.mp4
slideforge validate columbus_1492          # route name or .json path
slideforge plugins                         # list registered plugins
slideforge gen "dark 1920s street, empty copy space" --out bg.webp
slideforge fetch --search "Henry Ford 1919 portrait"
slideforge fetch --title "File:Henry ford 1919.jpg" --out ford.jpg
```

## Routes: the LLM + scripted seam (`slideforge.routes`)

A route is a JSON file (`routes/<name>.json`) with a map path and waypoints —
written by the vision LLM off a coordinate-gridded map, rendered by
`RouteSlide.from_route(name)` with zero code changes per route.

```bash
python -m slideforge.tools.map_grid map.jpg grid.png   # 0.0–1.0 overlay
```

E2E pipeline (`tools/make_route.py`, or `slideforge make-route`): map +
places.json → video in one command. Steps: (1) grid the map, (2) vision reads
waypoints (`--vision agent|ollama|openai|anthropic`; agent mode prints the grid
and takes `--waypoints` JSON back), (3) writes `routes/<name>.json`,
(4) validates (`--check`) and renders title + RouteSlide.

## Validation (`slideforge.validate`)

```python
from slideforge import validate
validate.route("columbus_1492")   # [] means clean
```

Checks route JSON schema, waypoint/marker coordinates inside the 0..1 range,
labels present, and map/image assets on disk. Slides expose a `validate()`
hook, so custom plugins participate. It catches typos and missing files —
it cannot tell whether a waypoint sits on the right city; that still needs
eyes on the map.

## Assets: nothing hand-made (`slideforge.gen`, `slideforge.assets`)

Every asset the library needs is producible through library code:

- **Image generation** (`slideforge.gen`): provider interface
  `generate(prompt, out_path, provider="auto")`, registered in the `gen`
  plugin registry (`agent` = the assistant/human fills the slot with explicit
  instructions; `openai` = Images API via `OPENAI_API_KEY`). Custom backends
  via `@gen("name")` or the `slideforge.gens` entry point.
- **Wikimedia Commons** (`slideforge.assets`): `search(query)`,
  `file_info(title)`, `download(title, out_path)` — no API key needed; this
  is how the maps and portraits entered the repo, through code.

`make_route --fetch-map "query"` goes fully end to end: Commons search →
download → grid → vision waypoints → route JSON → validated render.

## Tips

- Work at 1280×720 while iterating, render finals at 1920×1080.
- Keep holds ≥ ~1s on each Ken Burns stop; moves of 0.8–1.5s feel natural.
- Text over images: the slides add scrims/vignettes/strokes automatically.
- `Movie(..., progress_bar=True)` adds a thin progress bar across the whole video.
- Portraits (`assets/portraits/`): public-domain Wikimedia portraits
  (Henry Ford 1919, Frederick Winslow Taylor) for DuoSlide demos.
- Maps (`assets/maps/`): Ortelius 1572 Europe, Gutiérrez 1562 Americas
  (public domain).
