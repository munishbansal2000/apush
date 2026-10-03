#!/usr/bin/env python3
"""vid-u1-04 "The Spanish Machine" -- stage renderer (ARGUMENT-DRIVEN sample).

Adapted from PRODUCTION-GUIDE exemplar V02 ("The Spanish Machine"),
reconciled to COURSE-PLAN.md lesson vid-u1-04
("Conquest, Silver, and the Exchange", topics 1.4, 1.5).

Showcases: kinetic_text thesis slams + annotate "point" verdicts carrying
the video's argument -- "encomienda = labor, not land" -- plus doc_zoom
(the encomienda's legal fiction in print), zoom_to (Potosi), callout_scene
(the casta panels), and typewriter_scene (the crown's voice, Las Casas).

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
AUDIO = os.path.join(HERE, "audio", "vid-u1-04")
OUT = os.path.join(HERE, "samples", "vid-u1-04", "markup")

IMG_POTOSI = "assets/images/u1/barrons-2027-ch03-01.jpg"
IMG_DEBRY_LASCASAS = "assets/images/u1/barrons-2027-ch03-03.jpg"
IMG_LASCASAS_TITLE = "assets/images/u1/original-ctx-u1-05.jpg"
IMG_CASTA16 = "assets/images/u1/original-u1-encomienda-20.jpg"
IMG_CASTA_PANEL = "assets/images/u1/original-u1-encomienda-07.jpg"
IMG_MISSION = "assets/images/u1/original-u1-spanish-mission-01.jpg"
IMG_LIENZO = "assets/images/u1/5s24-ch06-mcq-06.jpg"

# title-block of the 1665 Las Casas edition (0..1 frame space), read off
# the title-page image.
LASCASAS_TITLE_BOX = (0.28, 0.28, 0.72, 0.62)

# three casta panels, top row of the 16-panel set (0..1 frame space).
CASTA_POINTS = [(0.125, 0.12, "mestizo"), (0.375, 0.12, "castizo"),
                (0.625, 0.12, "espanol")]

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
    clip = motion.kinetic_text("THE SPANISH MACHINE", dur,
                               sub="Paperwork and whips.",
                               bg_img=IMG_POTOSI, darken=120)
    clip = motion.punch_in(clip)
    clip = motion.annotate(clip, [
        (1.0, 3.0, "pop", {"text": "extraction"}),
    ])
    return _frame(clip, 2.2)


@stage("context")
def _context():
    dur = _dur("context")
    clip = motion.caption_scene(
        IMG_DEBRY_LASCASAS,
        "The conquest, administered \u2014 last video: why they sailed",
        dur)
    clip = motion.annotate(clip, [
        (2.0, 4.0, "label", {"text": "a law firm with an army", "x": 0.50,
                             "y": 0.22}),
        (9.0, 4.0, "point", {"text": "theft, documented"}),
    ])
    return _frame(clip, 11.0)


@stage("beat1a")
def _beat1a():
    dur = _dur("beat1a")
    clip = motion.doc_zoom(
        IMG_LASCASAS_TITLE, dur, highlight_box=LASCASAS_TITLE_BOX,
        caption="The legal fiction, in print \u2014 Las Casas, 1665 edition")
    clip = motion.annotate(clip, [
        (2.0, 4.0, "term", {"term": "encomienda",
                            "gloss": "royal grant of Native labor + tribute"}),
    ])
    return _frame(clip, dur * 0.5)


@stage("beat1b")
def _beat1b():
    dur = _dur("beat1b")
    clip = motion.kinetic_text("LABOR, NOT LAND", dur,
                               sub="the thesis of this video",
                               bg_img=IMG_LASCASAS_TITLE, darken=140)
    clip = motion.punch_in(clip)
    clip = motion.annotate(clip, [
        (1.0, 4.0, "pop", {"text": "remember this"}),
    ])
    return _frame(clip, 2.5)


@stage("beat1c")
def _beat1c():
    dur = _dur("beat1c")
    clip = motion.typewriter_scene(
        "\u201cI certify to you that, with the help of God, we shall "
        "powerfully enter into your country, and shall make war against "
        "you in all ways and manners that we can.\u201d",
        dur, bg_img=IMG_DEBRY_LASCASAS, darken=120,
        sub="El Requerimiento, 1513 \u2014 the voice of the crown")
    clip = motion.annotate(clip, [
        (max(2.0, dur - 6.0), 4.0, "point",
         {"text": "violence, filed"}),
    ])
    return _frame(clip, dur * 0.6)


@stage("beat2a")
def _beat2a():
    dur = _dur("beat2a")
    clip = motion.zoom_to(IMG_POTOSI, dur, cx=0.5, cy=0.45, end_zoom=2.2,
                          caption="Potos\u00ed, 1545 \u2014 the silver mountain")
    clip = motion.annotate(clip, [
        (2.0, 4.0, "term", {"term": "mita",
                            "gloss": "draft labor for the mines"}),
        (9.0, 5.0, "point", {"text": "a mountain rewired the world"}),
    ])
    return _frame(clip, dur * 0.6)


@stage("beat2b")
def _beat2b():
    dur = _dur("beat2b")
    clip = motion.typewriter_scene(
        "\u201cLa causa porque han muerto y destru\u00eddo tantas y tales "
        "e tan infinito n\u00famero de \u00e1nimas los cristianos ha sido "
        "solamente por tener por su fin \u00faltimo el oro y henchirse de "
        "riquezas en muy breves d\u00edas.\u201d",
        dur, bg_img=IMG_DEBRY_LASCASAS, darken=120,
        sub="Las Casas, Brev\u00edsima relaci\u00f3n (1552)")
    return _frame(clip, dur * 0.6)


@stage("beat2c")
def _beat2c():
    dur = _dur("beat2c")
    clip = motion.kb_scene(IMG_DEBRY_LASCASAS, dur, zoom=0.14,
                           pan_x=0.5, pan_y=0.5)
    clip = motion.annotate(clip, [
        (2.0, 4.0, "point", {"text": "bigger than its critics"}),
    ])
    return _frame(clip, 4.0)


@stage("beat3a")
def _beat3a():
    dur = _dur("beat3a")
    clip = motion.callout_scene(IMG_CASTA16, dur, CASTA_POINTS,
                                caption="sixteen panels, one filing system")
    clip = motion.annotate(clip, [
        (2.0, 4.0, "term", {"term": "casta",
                            "gloss": "painted racial hierarchy"}),
    ])
    return _frame(clip, dur * 0.75)


@stage("beat3b")
def _beat3b():
    dur = _dur("beat3b")
    clip = motion.typewriter_scene(
        "\u201cDe espa\u00f1ol e india, mestiza.\u201d",
        dur, bg_img=IMG_CASTA_PANEL, darken=120,
        sub="Casta painting inscription, 18th c.")
    clip = motion.annotate(clip, [
        (max(2.0, dur - 6.0), 4.0, "point",
         {"text": "race as paperwork"}),
    ])
    return _frame(clip, dur * 0.6)


@stage("significance")
def _significance():
    dur = _dur("significance")
    clip = motion.kinetic_text("A SYSTEM BUILT TO EXTRACT", dur,
                               sub="Labor. Silver. Hierarchy.",
                               bg_img=IMG_MISSION, darken=150)
    clip = motion.annotate(clip, [
        (2.0, 5.0, "point", {"text": "encomienda = labor, not land"}),
        (10.0, 5.0, "point", {"text": "the paperwork did the work"}),
    ])
    return _frame(clip, 4.0)


@stage("close")
def _close():
    dur = _dur("close")
    clip = motion.title_card("Next: Who Had the Right?", dur,
                             sub="vid-u1-05 + drill set at the link",
                             bg_img=IMG_LIENZO, darken=120)
    return _frame(clip, 1.5)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name in sorted(STAGES):
        STAGES[name]().save(os.path.join(OUT, name + ".png"))
    print(f"{len(STAGES)} stages rendered to {OUT}")
