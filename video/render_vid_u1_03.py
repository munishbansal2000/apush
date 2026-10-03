#!/usr/bin/env python3
"""vid-u1-03 "Why Europe Sailed West" -- stage renderer (SEQUENCE-DRIVEN sample).

Adapted from PRODUCTION-GUIDE exemplar V03 ("Why Europe Came"),
reconciled to COURSE-PLAN.md lesson vid-u1-03 (topics 1.3).

Showcases: timeline_scene (the voyage sequence 1492-1507) + camera_path
over the Hart Four Voyages map -- the documented interim for the unbuilt
general map_scene primitive (PLAYBOOK section 4, FUN-CATALOG #17).

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
AUDIO = os.path.join(HERE, "audio", "vid-u1-03")
OUT = os.path.join(HERE, "samples", "vid-u1-03", "markup")

IMG_CANTINO = "assets/images/u1/saq-set-06-q3.jpg"
IMG_LANDING = "assets/images/u1/saq-set-19-q3.jpg"
IMG_STRADANUS = "assets/images/u1/5s24-ch06-mcq-01.jpg"
IMG_POTOSI = "assets/images/u1/barrons-2027-ch03-01.jpg"
IMG_LIENZO = "assets/images/u1/5s24-ch06-mcq-06.jpg"
IMG_VOYAGES = "assets/images/u1/original-u1-columbus-voyages-01.jpg"
IMG_WALDSEEMULLER = "assets/images/u1/original-ctx-u1-03.jpg"

# waypoint camera tracing the 1492 outward route on the Hart map:
# Iberia -> Canaries -> mid-Atlantic -> Caribbean landfall -> pull back.
# Coordinates read off the map image (0..1 frame space).
VOYAGE_PATH = [(0.93, 0.15, 1.0), (0.90, 0.42, 1.6), (0.55, 0.58, 1.8),
               (0.18, 0.50, 2.2), (0.50, 0.50, 1.0)]

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
    clip = motion.kinetic_text("WHY SAIL INTO THE BLANK?", dur,
                               sub="God. Gold. Glory.",
                               bg_img=IMG_CANTINO, darken=120)
    clip = motion.punch_in(clip)
    clip = motion.annotate(clip, [
        (1.0, 3.0, "pop", {"text": "three words"}),
    ])
    return _frame(clip, 2.2)


@stage("contexta")
def _contexta():
    dur = _dur("contexta")
    clip = motion.caption_scene(
        IMG_LANDING,
        "Why did Europe move first? Start with the ships.",
        dur)
    clip = motion.annotate(clip, [
        (2.0, 4.0, "term", {"term": "caravel",
                            "gloss": "lateen sails \u2014 beats home upwind"}),
    ])
    return _frame(clip, 4.0)


@stage("contextb")
def _contextb():
    dur = _dur("contextb")
    clip = motion.kb_scene(IMG_CANTINO, dur, zoom=0.14,
                           pan_x=0.5, pan_y=0.5)
    clip = motion.annotate(clip, [
        (2.0, 4.0, "point", {"text": "profit, prayer, and pride"}),
    ])
    return _frame(clip, 4.0)


@stage("beat1a")
def _beat1a():
    dur = _dur("beat1a")
    clip = motion.bullet_slide(
        "Three motives",
        ["GOLD \u2014 Europe is cash-hungry; Asia is paved with it",
         "GOD \u2014 convert the heathen; outflank Islam",
         "GLORY \u2014 plant the flag first, win the prestige"],
        dur, footer="the exam asks which mattered most",
        bg_img=IMG_STRADANUS, darken=130, stagger=0.45)
    clip = motion.annotate(clip, [
        (max(2.0, dur - 6.0), 4.0, "point",
         {"text": "three motives, one ocean"}),
    ])
    return _frame(clip, dur * 0.7)


@stage("beat1b")
def _beat1b():
    dur = _dur("beat1b")
    clip = motion.typewriter_scene(
        "\u201cGold is most excellent; gold is treasure, and he who "
        "possesses it does all he wishes to in this world.\u201d",
        dur, bg_img=IMG_POTOSI, darken=120,
        sub="Columbus to Ferdinand and Isabella, Jamaica, 1503")
    clip = motion.annotate(clip, [
        (max(2.0, dur - 6.0), 4.0, "point",
         {"text": "obsession outran the evidence"}),
    ])
    return _frame(clip, dur * 0.6)


@stage("beat1c")
def _beat1c():
    dur = _dur("beat1c")
    clip = motion.typewriter_scene(
        "\u201cWee shall by plantinge there inlarge the glory of "
        "the Gospell.\u201d",
        dur, bg_img=IMG_LIENZO, darken=120,
        sub="Hakluyt, Discourse of Western Planting, 1584")
    clip = motion.annotate(clip, [
        (max(2.0, dur - 6.0), 4.0, "point",
         {"text": "faith and greed, same man"}),
    ])
    return _frame(clip, dur * 0.6)


@stage("beat2a")
def _beat2a():
    dur = _dur("beat2a")
    clip = motion.timeline_scene(
        [("1492", "Granada falls; Columbus sails"),
         ("1493", "17 ships: colonization begins"),
         ("1498", "South American mainland"),
         ("1502", "Fourth voyage"),
         ("1507", "Waldseem\u00fcller names America")],
        dur, title="The voyages, 1492\u20131507",
        bg_img=IMG_VOYAGES, darken=150)
    clip = motion.annotate(clip, [
        (2.0, 4.0, "point", {"text": "motives don't move ships"}),
    ])
    return _frame(clip, dur * 0.75)


@stage("beat2b")
def _beat2b():
    dur = _dur("beat2b")
    clip = motion.camera_path(IMG_VOYAGES, dur, VOYAGE_PATH,
                              caption="the 1492 route, traced")
    clip = motion.annotate(clip, [
        (2.0, 4.0, "label", {"text": "trade winds", "x": 0.45, "y": 0.62}),
        (max(2.0, dur - 7.0), 5.0, "point",
         {"text": "he never knew what he'd found"}),
    ])
    return _frame(clip, dur * 0.5)


@stage("beat3a")
def _beat3a():
    dur = _dur("beat3a")
    clip = motion.caption_scene(
        IMG_STRADANUS,
        "Spain's glory \u2014 the prize every rival chased",
        dur)
    clip = motion.annotate(clip, [
        (2.0, 4.0, "label", {"text": "France: furs, not gold", "x": 0.30,
                             "y": 0.22}),
        (8.0, 4.0, "label", {"text": "England: Roanoke, 1587", "x": 0.70,
                             "y": 0.30}),
        (14.0, 5.0, "term", {"term": "joint-stock company",
                             "gloss": "pooled capital, shared risk"}),
    ])
    return _frame(clip, 16.0)


@stage("significance")
def _significance():
    dur = _dur("significance")
    clip = motion.kinetic_text("GOD. GOLD. GLORY. ONE OCEAN.", dur,
                               sub="Three motives, three empires.",
                               bg_img=IMG_WALDSEEMULLER, darken=130)
    clip = motion.annotate(clip, [
        (2.0, 5.0, "point", {"text": "motives designed the empires"}),
        (10.0, 5.0, "point", {"text": "the dying made room"}),
    ])
    return _frame(clip, 4.0)


@stage("close")
def _close():
    dur = _dur("close")
    clip = motion.title_card("Next: Conquest, Silver, and the Exchange", dur,
                             sub="vid-u1-04 + drill set at the link",
                             bg_img=IMG_LANDING, darken=120)
    return _frame(clip, 1.5)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name in sorted(STAGES):
        STAGES[name]().save(os.path.join(OUT, name + ".png"))
    print(f"{len(STAGES)} stages rendered to {OUT}")
