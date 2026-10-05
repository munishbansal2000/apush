"""APUSH helpers: era background packs for text-focused slides.

Each background is a dark, cinematic AI-generated scene with empty copy
space. apush_bg() wraps one into a Slide bg spec with an optional slow
Ken Burns drift, so text slides get motion too.

Registered as the ``apush`` background plugin: ``{"type": "apush",
"era": "twenties", "dim": 0.5}``.
"""

from pathlib import Path

from .plugins import background_registry

_ASSETS = Path(__file__).resolve().parent.parent / "assets" / "apush"

ERAS = {
    "colonial": "media-generation-apush-colonial-0-63dd1026-9685-4998-af47-81133bbc7e0a.webp",
    "revolution": "media-generation-apush-revolution-0-920a4993-4e4c-49ff-ab91-5e4981923286.webp",
    "civilwar": "media-generation-apush-civilwar-0-d625d081-b425-4676-b293-3cbcf70028ef.webp",
    "civilrights": "media-generation-apush-civilrights-0-65550cca-5337-4e03-8110-400e9bbaa26b.webp",
    "twenties": "media-generation-apush-twenties-0-c551b4fd-9610-42ad-9ca6-5d9f4ea48862.webp",
    "westward": "media-generation-apush-westward-0-02e0ba3f-dab4-49c5-ac31-647008f9407c.webp",
    "gilded": "media-generation-apush-gilded-0-cbc434e6-c21b-4f9f-9f75-427faf0ba3c7.webp",
    "ww2": "media-generation-apush-ww2-0-5cd4239b-3148-412e-ba66-a880ced151b2.webp",
    "map1863": "media-generation-apush-map-1860-0-8521ca9e-6b60-45cf-9e0f-8c818025a123.webp",
}


def era_path(era):
    if era not in ERAS:
        raise ValueError(f"unknown era {era!r}; choose from {sorted(ERAS)}")
    return str(_ASSETS / ERAS[era])


def apush_bg(era, dim=0.55, drift=True, push=0.14):
    """Background spec for a text slide: dimmed era art + slow push-in.

    dim   — 0..1 brightness multiplier (lower = more readable text)
    drift — slow Ken Burns push across the whole slide duration
    push  — how far to zoom (0.14 ≈ 1.16x)
    """
    if era not in ERAS:
        raise ValueError(f"unknown era {era!r}; choose from {sorted(ERAS)}")
    return {"type": "apush", "era": era, "dim": dim,
            "drift": drift, "push": push}


def _apush_provider(slide, w, h, t, spec):
    from .plugins import background_registry
    era = spec.get("era", "twenties")
    if era not in ERAS:
        raise ValueError(f"unknown era {era!r}; choose from {sorted(ERAS)}")
    ispec = {"type": "image", "path": era_path(era),
             "dim": spec.get("dim", 0.55)}
    if spec.get("drift", True):
        push = spec.get("push", 0.14)
        ispec["drift"] = [(0.5, 0.5, 1.0), (0.53, 0.47, 1.0 - push)]
    return background_registry.get("image")(slide, w, h, t, ispec)


background_registry.register("apush", _apush_provider)
