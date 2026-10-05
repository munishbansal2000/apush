"""Registry/schema parity: every schema slide must compile, and vice versa.

Regression test for the u1-e1 marquee gap: StaggerSlide/TacticalSlide were in
scene_plan_schema.json (and in slideforge) but missing from the compiler's
SLIDE_TYPES, so a lint-clean plan failed at compile time.
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from compile_scene_plan import SLIDE_TYPES  # noqa: E402


def test_registry_matches_schema_enum():
    schema_path = os.path.join(os.path.dirname(__file__), os.pardir,
                               "scene_plan_schema.json")
    with open(schema_path, encoding="utf-8") as f:
        schema = json.load(f)
    schema_slides = set(schema["properties"]["scenes"]["items"]
                        ["properties"]["slide"]["enum"])
    registry_slides = {k for k in SLIDE_TYPES}
    # registry keys are lowercase; schema enum is CamelCase. Subset (not
    # equality): the registry may carry legacy aliases such as
    # "causalchain" that shipped plans still address.
    assert {s.lower() for s in schema_slides} <= registry_slides


def test_image_slides_have_path_entries():
    """Every slide that takes images must be in IMAGE_PARAM_PATHS.

    Without an entry, plan image refs silently skip assets_dir resolution
    and load relative to the process CWD at render time (found live: the
    u1-e1 StaggerSlide scenes passed compile but would have failed render).
    """
    from compile_scene_plan import IMAGE_PARAM_PATHS
    import inspect
    # Param names that carry images directly or in nested dicts/lists.
    image_hints = {"image", "src", "map_image", "left", "right", "panels",
                   "cards", "card"}
    # Slides whose left/right/nodes params are text-only, not images.
    text_only = {"compareslide"}
    for name, cls in sorted(SLIDE_TYPES.items()):
        if name == "causalchain":
            continue  # legacy alias of causalchainslide
        if name in text_only:
            continue
        try:
            params = set(inspect.signature(cls.__init__).parameters)
        except (TypeError, ValueError):
            continue
        if params & image_hints:
            assert name in IMAGE_PARAM_PATHS, name


def test_registered_slides_are_constructible():
    import inspect
    for name, cls in sorted(SLIDE_TYPES.items()):
        sig = inspect.signature(cls.__init__)
        assert "duration" in sig.parameters, name
