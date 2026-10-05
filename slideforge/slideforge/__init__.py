"""slideforge — a tiny reusable engine for animated slide videos.

Pure Python: PIL + numpy render every frame, ffmpeg encodes.
No moviepy, no ImageMagick, no browser needed.

Quick start:
    from slideforge import Movie, Config, TitleSlide, KenBurnsSlide

    movie = Movie(Config(w=1280, h=720, fps=30), progress_bar=True)
    movie.add(TitleSlide("Hello", "A reusable animated-slides engine"))
    movie.add(KenBurnsSlide("photo.jpg",
                            stops=[(0.5, 0.5, 1.0), (0.3, 0.35, 0.45)],
                            caption="Pan & zoom to any region"))
    movie.render("out.mp4")

Plugin model: slides, transitions, backgrounds, and vision readers are
plugins. Register your own::

    from slideforge.plugins import slide

    @slide("my-slide")
    class MySlide(Slide):
        ...

Third-party packages expose plugins via entry points
(``slideforge.slides``, ``slideforge.transitions``,
``slideforge.backgrounds``, ``slideforge.visions``); they are discovered
automatically on import.
"""

__version__ = "0.2.0"

from .timeline import Config, Scene, Movie
from . import easing
from . import transitions
from .kenburns import KenBurns, zoom_on, full_view
from . import plugins
from .plugins import slide_registry, transition_registry, \
    background_registry, vision_registry, gen_registry
from .slides import (
    Slide,
    TitleSlide,
    BulletSlide,
    StepsSlide,
    DisplayPointsSlide,
    DisplayHeadline,
    DuoSlide,
    MapZoomSlide,
    RouteSlide,
    ImageSlide,
    SplitSlide,
    QuoteSlide,
    StatSlide,
    KenBurnsSlide,
    CalloutSlide,
    CompareSlide,
    HighlightSlide,
    CollageSlide,
    TitleCardSlide,
)
from .overlays import (LowerThird, Caption, KeywordPop, Sticker, RegionGlow,
                       card_image, with_overlays)
from . import apush
from . import backgrounds
from . import vision
from . import gen
from . import assets
from . import routes
from . import validate

# Built-in plugins self-register on import above; now pick up third-party
# entry points. Failures here must never break the core library.
try:
    plugins.discover()
except Exception:
    pass

__all__ = [
    "__version__",
    "Config", "Scene", "Movie",
    "easing", "transitions",
    "KenBurns", "zoom_on", "full_view",
    "Slide",
    "TitleSlide", "BulletSlide", "StepsSlide", "DisplayPointsSlide",
    "DisplayHeadline", "DuoSlide",
    "MapZoomSlide", "RouteSlide",
    "ImageSlide", "SplitSlide",
    "QuoteSlide", "StatSlide", "KenBurnsSlide", "CalloutSlide",
    "CompareSlide", "HighlightSlide", "CollageSlide", "TitleCardSlide",
    "LowerThird", "Caption", "KeywordPop", "Sticker", "RegionGlow",
    "card_image", "with_overlays",
    "apush", "backgrounds", "vision", "gen", "assets", "routes", "validate",
    "plugins", "slide_registry", "transition_registry",
    "background_registry", "vision_registry", "gen_registry",
]
