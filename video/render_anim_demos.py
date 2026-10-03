#!/usr/bin/env python3
"""Render 5-10s visual demos of the 7 animated-graphics primitives.

Proof renders for the user -- silent, 720x1280 preview scale, 24fps.
Committed so demos are reproducible: python3 video/render_anim_demos.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import motion
from motion import (set_scale, map_scene, counter_scene, vs_scene,
                    wipe_scene, myth_stamp, skit_scene, chapter_bar,
                    kb_scene)

set_scale(2 / 3)  # 720x1280 preview
OUT = os.path.expanduser("~/workspace/your_files/anim-demos")
os.makedirs(OUT, exist_ok=True)
IMG = os.path.join(HERE, "..", "assets", "images")
FPS = 24


def write(clip, name):
    out = os.path.join(OUT, name + ".mp4")
    clip.write_videofile(out, fps=FPS, codec="libx264", audio_codec="aac",
                         preset="fast", logger=None)
    print("demo:", out, f"({clip.duration:.1f}s)")


def d_map():
    # Triangular trade over the 18th-century Atlantic chart
    moves = [
        {"path": [(0.72, 0.22), (0.60, 0.38), (0.52, 0.58)],
         "at": 0.5, "color": (233, 196, 106), "kind": "arrow",
         "label": "Manufactured goods", "label_pos": (0.68, 0.30)},
        {"path": [(0.52, 0.58), (0.38, 0.52), (0.26, 0.44)],
         "at": 2.6, "color": (224, 82, 82), "kind": "dots",
         "label": "Middle Passage", "label_pos": (0.36, 0.62)},
        {"path": [(0.26, 0.44)], "at": 5.0, "color": (120, 200, 140),
         "kind": "fill", "label": "Sugar colonies", "label_pos": (0.26, 0.32)},
    ]
    write(map_scene(os.path.join(IMG, "u2/original-u1-trade-02.jpg"), 8,
                    moves, title="The Triangular Trade",
                    caption="Three routes. One brutal system."), "map_scene")


def d_counter():
    write(counter_scene(750000, 7, "estimated Civil War dead",
                        os.path.join(IMG, "u3/5s24-ch03-mcq-48.jpg"),
                        suffix="", at=0.6), "counter_scene")


def d_vs():
    write(vs_scene(os.path.join(IMG, "u5/5s24-exam2-mcq-37.jpg"),
                   os.path.join(IMG, "u3/original-misc-xyz-02.jpg"), 7,
                   "ABRAHAM LINCOLN", "JOHN ADAMS",
                   title="Two Presidents, Two Visions"), "vs_scene")


def d_wipe():
    write(wipe_scene(os.path.join(IMG, "u3/saq-set-24-q3.jpg"),
                     os.path.join(IMG, "u4/pr25e-test1-q21.jpg"), 7,
                     label_a="1803", label_b="1848"), "wipe_scene")


def d_myth():
    base = kb_scene(os.path.join(IMG, "u3/pr25e-test2-q10.jpg"), 8, zoom=0.1)
    write(myth_stamp(base, at=0.4, dur=7.0,
                     myth_text="The colonists stayed loyal until 1776.",
                     correction="Boycotts and riots began with the Stamp "
                                "Act -- a full decade earlier."),
          "myth_stamp")


def d_skit():
    beats = [
        {"speaker": "A", "name": "Colonist", "text": "It's just a small tax on tea.",
         "color": (90, 140, 200)},
        {"speaker": "B", "name": "Tax Collector",
         "text": "It's taxation WITHOUT representation!",
         "color": (200, 110, 90)},
        {"speaker": "A", "name": "Colonist",
         "text": "...I hate it when he's right.",
         "color": (90, 140, 200)},
    ]
    write(skit_scene(beats, 9), "skit_scene")


def d_chapter():
    base = kb_scene(os.path.join(IMG, "u2/original-u1-trade-02.jpg"), 8,
                    zoom=0.1)
    segs = [("Hook", 0, 2), ("Context", 2, 4), ("Evidence", 4, 6),
            ("Verdict", 6, 8)]
    write(chapter_bar(base, segs), "chapter_bar")


if __name__ == "__main__":
    d_map()
    d_counter()
    d_vs()
    d_wipe()
    d_myth()
    d_skit()
    d_chapter()
    print("all demos done")
