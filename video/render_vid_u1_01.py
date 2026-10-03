#!/usr/bin/env python3
"""vid-u1-01 "The World in 1491" -- stage renderer (DOCUMENT/QUOTE-DRIVEN sample).

Visual-direction overhaul (2026-10-02): every stage carries at least one
INTENTIONAL camera/directed-motion move -- drift-only kb_scene stages are
banned. Tours use camera_path across details the narration names; emphasis
uses zoom_to + callout rings on the specific figures being discussed; opens
use punch_in, never fades. Text collisions fixed (pop/point notes carry
explicit y placement); backgrounds stay visible (darken capped in motion.py,
scrim bands behind text blocks).

Two build modes:
  BUILDERS[name](dur) -> moviepy VideoClip   (animated segments, build_video.py)
  STAGES[name]()       -> PIL.Image           (static markup PNGs for the record)

All scenes built from motion.py steering-vocabulary primitives. bg_img is
passed on every text primitive (no-blank-screen rule).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import motion
from moviepy import CompositeVideoClip, ImageClip
from PIL import Image
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, "audio", "vid-u1-01")
OUT = os.path.join(HERE, "samples", "vid-u1-01", "markup")

IMG_STRADANUS = "assets/images/u1/5s24-ch06-mcq-01.jpg"
IMG_CAHOKIA = "assets/images/u1/original-ctx-u1-07.jpg"
IMG_DEBRY_HUNT = "assets/images/u1/original-u1-native-10.jpg"
IMG_DEBRY_PLANT = "assets/images/u1/original-u1-native-01.jpg"
IMG_DEBRY_LANDING = "assets/images/u1/5s24-ch06-mcq-04.jpg"
IMG_CODEX = "assets/images/u1/5s24-exam1-mcq-36.jpg"
IMG_LIENZO = "assets/images/u1/5s24-ch06-mcq-06.jpg"
IMG_WALDSEEMULLER = "assets/images/u1/original-ctx-u1-03.jpg"
IMG_THANKSGIVING = "assets/images/u1/5s24-exam1-mcq-45.jpg"


def _frame(clip, t):
    return Image.fromarray(clip.get_frame(t))


def _dur(key):
    return motion.dur(os.path.join(AUDIO, key + ".mp3"))


def _caption_over_cam(img_path, caption, dur, waypoints):
    """camera_path tour + the same bottom scrim band caption_scene uses."""
    base = motion.camera_path(img_path, dur, waypoints)
    sc = ImageClip(np.asarray(motion.scrim())).with_duration(dur).with_position(
        (0, motion.H - motion.px(700)))
    sc = sc.with_opacity(0.85)
    comp = CompositeVideoClip([base, sc],
                             size=(motion.W, motion.H)).with_duration(dur)
    return motion.overlay_text(comp, caption, motion.FR, 44, dur)


# ------------------------------------------------------------------ builders
def build_hook(dur):
    clip = motion.kinetic_text("TWO WORLDS. ONE OCEAN.", dur,
                               sub="Three worlds. One collision.",
                               bg_img=IMG_STRADANUS, darken=70)
    clip = motion.punch_in(clip)
    # pop parked at y=0.30: clear of the centered phrase (settled ~y 830-1010)
    clip = motion.annotate(clip, [
        (1.0, 3.0, "pop", {"text": "what if", "y": 0.30}),
    ])
    return clip


def build_contexta(dur):
    # tour the earthworks: wide -> push onto Powell's mound -> settle.
    # (Mound sits center-right of the aerial photo; 1.8x keeps the old
    # photo sharp -- 2.3x dissolved into blur on the frame check.)
    clip = _caption_over_cam(
        IMG_CAHOKIA,
        "Cahokia \u2014 a Mississippian city, c. 1250",
        dur, [(0.5, 0.52, 1.0), (0.62, 0.52, 1.8), (0.50, 0.55, 1.2)])
    clip = motion.annotate(clip, [
        (2.0, 4.0, "term", {"term": "Mississippian",
                            "gloss": "mound-building farming societies"}),
        (8.0, 4.0, "arrow", {"text": "the mounds", "x": 0.62, "y": 0.45,
                             "lx": 0.82, "ly": 0.62}),
    ])
    return clip


def build_contextb(dur):
    # callout rings land on each world in turn -- no drift, directed emphasis
    clip = motion.callout_scene(
        IMG_STRADANUS, dur,
        [(0.24, 0.20, "tribute + kinship"),
         (0.76, 0.20, "crusade + crown"),
         (0.50, 0.86, "gold + trade")],
        caption="Three old worlds, each confident in its own order")
    return clip


def build_beat1a(dur):
    clip = motion.timeline_scene(
        [("Southwest", "Pueblo desert farmers"),
         ("Southeast", "Mississippian towns"),
         ("Woodlands", "maize villages"),
         ("Mexico", "Mexica tribute empire"),
         ("Andes", "Inca: millions")],
        dur, title="Native America, 1491",
        bg_img=IMG_DEBRY_HUNT, darken=70)
    clip = motion.annotate(clip, [
        (2.0, 4.0, "term", {"term": "maize agriculture",
                            "gloss": "farming \u2192 denser populations"}),
    ])
    return clip


def build_beat1b(dur):
    # push into the planting work itself, then land the verdict card low
    clip = motion.zoom_to(IMG_DEBRY_PLANT, dur, cx=0.5, cy=0.55,
                          end_zoom=2.0, zoom_dur=2.2)
    clip = motion.annotate(clip, [
        (1.5, 5.0, "pop", {"text": "remember this", "y": 0.28}),
        (8.0, 5.0, "point", {"text": "farming \u2192 density \u2192 complexity",
                             "y": 0.78}),
    ])
    return clip


def build_beat1c(dur):
    # tour the engraving's left half: ships, armor, cross
    clip = motion.camera_path(
        IMG_STRADANUS, dur,
        [(0.5, 0.5, 1.0), (0.30, 0.32, 2.4), (0.38, 0.38, 1.6)])
    clip = motion.annotate(clip, [
        (2.0, 4.0, "label", {"text": "Reconquista", "x": 0.30, "y": 0.20}),
        (9.0, 4.0, "term", {"term": "caravel",
                            "gloss": "sails into the wind \u2014 and home again"}),
    ])
    return clip


def build_beat1d(dur):
    # tour the right half: the "America" figure and the new world's wealth
    clip = motion.camera_path(
        IMG_STRADANUS, dur,
        [(0.5, 0.5, 1.0), (0.70, 0.60, 2.4), (0.58, 0.52, 1.5)])
    clip = motion.annotate(clip, [
        (2.0, 4.0, "label", {"text": "Songhai gold trade", "x": 0.50,
                             "y": 0.25}),
        (9.0, 4.0, "point", {"text": "three old, confident worlds",
                             "y": 0.78}),
    ])
    return clip


def build_beat2a(dur):
    clip = motion.typewriter_scene(
        "\u201cThey are very well built, with very handsome bodies "
        "and very good faces.\u201d",
        dur, bg_img=IMG_DEBRY_LANDING, darken=55,
        sub="Columbus, journal, 13 October 1492")
    clip = motion.punch_in(clip)
    return clip


def build_beat2b(dur):
    # punch onto the landing party's faces as the narration names them
    clip = motion.zoom_to(IMG_DEBRY_LANDING, dur, cx=0.45, cy=0.45,
                          end_zoom=2.3, zoom_dur=2.0)
    clip = motion.annotate(clip, [
        (2.0, 4.0, "point", {"text": "curiosity and conquest, one ship",
                             "y": 0.78}),
    ])
    return clip


def build_beat2c(dur):
    clip = motion.doc_zoom(
        IMG_CODEX, dur, highlight_box=(0.15, 0.15, 0.85, 0.90),
        caption="Florentine Codex, c. 1585 \u2014 Nahua witnesses")
    clip = motion.annotate(clip, [
        (2.0, 4.0, "term", {"term": "virgin-soil epidemic",
                            "gloss": "no immunity \u2192 catastrophic death"}),
    ])
    return clip


def build_beat2d(dur):
    clip = motion.kinetic_text("90% GONE IN A CENTURY", dur,
                               sub="the dying went one way",
                               bg_img=IMG_CODEX, darken=70)
    clip = motion.punch_in(clip)
    # pop parked low: clear of phrase (~y 830-1010) and sub (~y 1120)
    clip = motion.annotate(clip, [
        (1.0, 3.0, "pop", {"text": "emptied", "y": 0.72}),
    ])
    return clip


def build_beat3a(dur):
    clip = motion.typewriter_scene(
        "\u201cThings never heard of, seen or dreamed of before.\u201d",
        dur, bg_img=IMG_LIENZO, darken=55,
        sub="Bernal D\u00edaz, Historia verdadera (1632)")
    clip = motion.punch_in(clip)
    return clip


def build_beat3b(dur):
    clip = motion.typewriter_scene(
        "\u201cWhere there are daily assembled more than sixty "
        "thousand souls.\u201d",
        dur, bg_img=IMG_LIENZO, darken=55,
        sub="Cort\u00e9s, Second Letter (1522)")
    # verdict card parked below the typed block, above the sub line
    clip = motion.annotate(clip, [
        (max(2.0, dur - 6.0), 4.0, "point",
         {"text": "a robbery the robbers wrote down", "y": 0.68}),
    ])
    return clip


def build_significance(dur):
    clip = motion.kinetic_text("THREE WORLDS. ONE CATASTROPHE.", dur,
                               sub="The exchange rewired the planet.",
                               bg_img=IMG_WALDSEEMULLER, darken=70)
    clip = motion.punch_in(clip)
    clip = motion.annotate(clip, [
        (2.0, 5.0, "point", {"text": "never equal", "y": 0.74}),
        (10.0, 5.0, "point", {"text": "one world system came out",
                              "y": 0.74}),
    ])
    return clip


def build_close(dur):
    clip = motion.title_card("Next: Three Ways to Live in America", dur,
                             sub="vid-u1-02 + drill set at the link",
                             bg_img=IMG_THANKSGIVING, darken=70)
    clip = motion.punch_in(clip, amount=0.04, dur=0.8)
    return clip


BUILDERS = {
    "hook": build_hook,
    "contexta": build_contexta,
    "contextb": build_contextb,
    "beat1a": build_beat1a,
    "beat1b": build_beat1b,
    "beat1c": build_beat1c,
    "beat1d": build_beat1d,
    "beat2a": build_beat2a,
    "beat2b": build_beat2b,
    "beat2c": build_beat2c,
    "beat2d": build_beat2d,
    "beat3a": build_beat3a,
    "beat3b": build_beat3b,
    "significance": build_significance,
    "close": build_close,
}

# Static markup PNGs (the record): sample each builder at a representative t.
STAGES = {
    "hook": lambda: _frame(build_hook(_dur("hook")), 2.2),
    "contexta": lambda: _frame(build_contexta(_dur("contexta")), 6.0),
    "contextb": lambda: _frame(build_contextb(_dur("contextb")), 12.0),
    "beat1a": lambda: _frame(build_beat1a(_dur("beat1a")),
                             _dur("beat1a") * 0.75),
    "beat1b": lambda: _frame(build_beat1b(_dur("beat1b")), 10.0),
    "beat1c": lambda: _frame(build_beat1c(_dur("beat1c")), 11.0),
    "beat1d": lambda: _frame(build_beat1d(_dur("beat1d")), 11.0),
    "beat2a": lambda: _frame(build_beat2a(_dur("beat2a")),
                             _dur("beat2a") * 0.55),
    "beat2b": lambda: _frame(build_beat2b(_dur("beat2b")), 4.0),
    "beat2c": lambda: _frame(build_beat2c(_dur("beat2c")),
                             _dur("beat2c") * 0.5),
    "beat2d": lambda: _frame(build_beat2d(_dur("beat2d")), 2.5),
    "beat3a": lambda: _frame(build_beat3a(_dur("beat3a")),
                             _dur("beat3a") * 0.6),
    "beat3b": lambda: _frame(build_beat3b(_dur("beat3b")),
                             _dur("beat3b") * 0.6),
    "significance": lambda: _frame(build_significance(_dur("significance")),
                                   4.0),
    "close": lambda: _frame(build_close(_dur("close")), 1.5),
}


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name in sorted(STAGES):
        STAGES[name]().save(os.path.join(OUT, name + ".png"))
    print(f"{len(STAGES)} stages rendered to {OUT}")
