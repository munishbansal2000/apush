#!/usr/bin/env python3
"""vid-u1-01 "The World in 1491" -- stage renderer (DOCUMENT/QUOTE-DRIVEN sample).

Adapted from PRODUCTION-GUIDE exemplar V01 ("Three Worlds Collide"),
reconciled to COURSE-PLAN.md lesson vid-u1-01 (topics 1.1).

Showcases: typewriter_scene (three primary-source voices: Columbus 1492,
Bernal Diaz 1632, Cortes 1522) + doc_zoom (Florentine Codex smallpox).

Every stage is built from motion.py steering-vocabulary primitives and sized
from the measured narration MP3 (motion.dur = ffprobe + 1.2s pad), so the
same module renders the placeholder PNGs now and the real frames later.
Scenes are never flat: bg_img is passed on every text primitive.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import motion
from PIL import Image

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

STAGES = {}


def stage(name):
    def deco(fn):
        STAGES[name] = fn
        return fn
    return deco


def _frame(clip, t):
    return Image.fromarray(clip.get_frame(t))


def _dur(key):
    return motion.dur(os.path.join(AUDIO, key + ".mp3"))


@stage("hook")
def _hook():
    dur = _dur("hook")
    clip = motion.kinetic_text("TWO WORLDS. ONE OCEAN.", dur,
                               sub="Three worlds. One collision.",
                               bg_img=IMG_STRADANUS, darken=120)
    clip = motion.punch_in(clip)
    clip = motion.annotate(clip, [
        (1.0, 3.0, "pop", {"text": "what if"}),
    ])
    return _frame(clip, 2.2)


@stage("contexta")
def _contexta():
    dur = _dur("contexta")
    clip = motion.caption_scene(
        IMG_CAHOKIA,
        "Cahokia \u2014 a Mississippian city while Europe built cathedrals",
        dur)
    clip = motion.annotate(clip, [
        (2.0, 4.0, "term", {"term": "Mississippian",
                            "gloss": "mound-building farming societies"}),
        (8.0, 4.0, "arrow", {"text": "the mounds", "x": 0.5, "y": 0.38,
                             "lx": 0.74, "ly": 0.56}),
    ])
    return _frame(clip, 4.0)


@stage("contextb")
def _contextb():
    dur = _dur("contextb")
    clip = motion.kb_scene(IMG_STRADANUS, dur, zoom=0.14,
                           pan_x=0.5, pan_y=0.5)
    clip = motion.annotate(clip, [
        (2.0, 4.0, "label", {"text": "tribute + kinship", "x": 0.24,
                             "y": 0.20}),
        (8.0, 4.0, "label", {"text": "crusade + crown", "x": 0.76,
                             "y": 0.20}),
        (14.0, 4.0, "label", {"text": "gold + trade", "x": 0.50, "y": 0.86}),
    ])
    return _frame(clip, 10.0)


@stage("beat1a")
def _beat1a():
    dur = _dur("beat1a")
    clip = motion.timeline_scene(
        [("Southwest", "Pueblo desert farmers"),
         ("Southeast", "Mississippian towns"),
         ("Woodlands", "maize villages"),
         ("Mexico", "Mexica tribute empire"),
         ("Andes", "Inca: millions")],
        dur, title="Native America, 1491",
        bg_img=IMG_DEBRY_HUNT, darken=150)
    clip = motion.annotate(clip, [
        (2.0, 4.0, "term", {"term": "maize agriculture",
                            "gloss": "farming \u2192 denser populations"}),
    ])
    return _frame(clip, dur * 0.75)


@stage("beat1b")
def _beat1b():
    dur = _dur("beat1b")
    clip = motion.kb_scene(IMG_DEBRY_PLANT, dur, zoom=0.14,
                           pan_x=0.5, pan_y=0.6)
    clip = motion.annotate(clip, [
        (1.5, 5.0, "pop", {"text": "remember this"}),
        (8.0, 5.0, "point", {"text": "farming \u2192 density \u2192 complexity"}),
    ])
    return _frame(clip, 10.0)


@stage("beat1c")
def _beat1c():
    dur = _dur("beat1c")
    clip = motion.kb_scene(IMG_STRADANUS, dur, zoom=0.14,
                           pan_x=0.35, pan_y=0.3)
    clip = motion.annotate(clip, [
        (2.0, 4.0, "label", {"text": "Reconquista", "x": 0.30, "y": 0.20}),
        (9.0, 4.0, "term", {"term": "caravel",
                            "gloss": "sails into the wind \u2014 and home again"}),
    ])
    return _frame(clip, 11.0)


@stage("beat1d")
def _beat1d():
    dur = _dur("beat1d")
    clip = motion.kb_scene(IMG_STRADANUS, dur, zoom=0.14,
                           pan_x=0.65, pan_y=0.6)
    clip = motion.annotate(clip, [
        (2.0, 4.0, "label", {"text": "Songhai gold trade", "x": 0.50,
                             "y": 0.25}),
        (9.0, 4.0, "point", {"text": "three old, confident worlds"}),
    ])
    return _frame(clip, 11.0)


@stage("beat2a")
def _beat2a():
    dur = _dur("beat2a")
    clip = motion.typewriter_scene(
        "\u201cThey are very well built, with very handsome bodies "
        "and very good faces.\u201d",
        dur, bg_img=IMG_DEBRY_LANDING, darken=120,
        sub="Columbus, journal, 13 October 1492")
    return _frame(clip, dur * 0.55)


@stage("beat2b")
def _beat2b():
    dur = _dur("beat2b")
    clip = motion.kb_scene(IMG_DEBRY_LANDING, dur, zoom=0.14,
                           pan_x=0.5, pan_y=0.5)
    clip = motion.annotate(clip, [
        (2.0, 4.0, "point", {"text": "curiosity and conquest, one ship"}),
    ])
    return _frame(clip, 4.0)


@stage("beat2c")
def _beat2c():
    dur = _dur("beat2c")
    clip = motion.doc_zoom(
        IMG_CODEX, dur, highlight_box=(0.15, 0.15, 0.85, 0.90),
        caption="Florentine Codex, c. 1585 \u2014 Nahua witnesses")
    clip = motion.annotate(clip, [
        (2.0, 4.0, "term", {"term": "virgin-soil epidemic",
                            "gloss": "no immunity \u2192 catastrophic death"}),
    ])
    return _frame(clip, dur * 0.5)


@stage("beat2d")
def _beat2d():
    dur = _dur("beat2d")
    clip = motion.kinetic_text("90% GONE IN A CENTURY", dur,
                               sub="the dying went one way",
                               bg_img=IMG_CODEX, darken=140)
    clip = motion.punch_in(clip)
    clip = motion.annotate(clip, [
        (1.0, 3.0, "pop", {"text": "emptied"}),
    ])
    return _frame(clip, 2.5)


@stage("beat3a")
def _beat3a():
    dur = _dur("beat3a")
    clip = motion.typewriter_scene(
        "\u201cThings never heard of, seen or dreamed of before.\u201d",
        dur, bg_img=IMG_LIENZO, darken=120,
        sub="Bernal D\u00edaz, Historia verdadera (1632)")
    return _frame(clip, dur * 0.6)


@stage("beat3b")
def _beat3b():
    dur = _dur("beat3b")
    clip = motion.typewriter_scene(
        "\u201cWhere there are daily assembled more than sixty "
        "thousand souls.\u201d",
        dur, bg_img=IMG_LIENZO, darken=120,
        sub="Cort\u00e9s, Second Letter (1522)")
    clip = motion.annotate(clip, [
        (max(2.0, dur - 6.0), 4.0, "point",
         {"text": "a robbery the robbers wrote down"}),
    ])
    return _frame(clip, dur * 0.6)


@stage("significance")
def _significance():
    dur = _dur("significance")
    clip = motion.kinetic_text("THREE WORLDS. ONE CATASTROPHE.", dur,
                               sub="The exchange rewired the planet.",
                               bg_img=IMG_WALDSEEMULLER, darken=130)
    clip = motion.annotate(clip, [
        (2.0, 5.0, "point", {"text": "never equal"}),
        (10.0, 5.0, "point", {"text": "one world system came out"}),
    ])
    return _frame(clip, 4.0)


@stage("close")
def _close():
    dur = _dur("close")
    clip = motion.title_card("Next: Three Ways to Live in America", dur,
                             sub="vid-u1-02 + drill set at the link",
                             bg_img=IMG_THANKSGIVING, darken=120)
    return _frame(clip, 1.5)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name in sorted(STAGES):
        STAGES[name]().save(os.path.join(OUT, name + ".png"))
    print(f"{len(STAGES)} stages rendered to {OUT}")
