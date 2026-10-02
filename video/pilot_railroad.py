#!/usr/bin/env python3
"""Pilot: motion-graphics explainer — "The Railroad That Built America".

6 scenes, ~90s. Mixes Ken Burns public-domain imagery with presentation
slides, TTS narration per scene.
Run: python3 pilot_railroad.py
"""
import os
import subprocess

from PIL import Image, ImageDraw

import motion
from motion import (W, H, FB, FR, caption_scene, font, kb_scene, slide_scene,
                    title_scene, wrap_px)

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets", "railroad")
AUDIO = os.path.join(HERE, "audio", "pilot-railroad")
OUT = "/home/hatch/workspace/your_files/railroad-pilot.mp4"
TTS = "/opt/hatch/bin/tts"
VOICE = "avocado_v2:MAI_01"

SCENES = [
    dict(kind="title", img="across_continent.jpg",
         title="The Railroad\nThat Built America", sub="Westward expansion, 1862–1869",
         text=("In 1862, the United States was a nation split in two: by a civil war, "
               "and by three thousand miles of mountains, desert, and plains. "
               "One railroad promised to stitch it back together.")),
    dict(kind="slide", title="1860: A Nation in Two Pieces",
         bullets=["By wagon: about six months to California",
                  "By sea: a long voyage around South America",
                  "The West had gold and farmland — but no fast link east"],
         text=("In 1860, reaching California from New York took six months by wagon, "
               "or a long sea voyage around South America. The West held gold, silver, "
               "and farmland, but it might as well have been another country.")),
    dict(kind="caption", img="dale_creek.jpg",
         caption="Two companies raced: Union Pacific from the east, Central Pacific from the west",
         text=("Congress funded two companies to build toward each other: the Union Pacific "
               "laying track west from Omaha, the Central Pacific blasting through the Sierra "
               "Nevada from Sacramento. It was the largest construction project America had ever attempted.")),
    dict(kind="slide", title="Who Built It",
         bullets=["About 20,000 laborers in total",
                  "Union Pacific: Irish immigrants and Civil War veterans",
                  "Central Pacific: some 12,000 Chinese immigrants, blasting through solid Sierra granite"],
         text=("The work fell to about twenty thousand laborers: Irish immigrants and Civil War "
               "veterans on the Union Pacific, and some twelve thousand Chinese immigrants carving "
               "the Central Pacific through solid Sierra granite.")),
    dict(kind="caption", img="golden_spike.jpg",
         caption="May 10, 1869 — Promontory, Utah: the golden spike joins the nation",
         text=("On May 10, 1869, at Promontory, Utah, the two lines met, and a golden spike "
               "marked the moment. A journey that took months now took about a week.")),
    dict(kind="slide", title="Why It Matters",
         bullets=["Opened the West to settlement — and accelerated Native displacement",
                  "Tied the nation into one industrial market",
                  "Railroads even standardized time itself"],
         text=("For the exam, the railroad is the engine of the Gilded Age. It opened the West "
               "to settlement, accelerated Native displacement, tied the nation into one industrial "
               "market, and even standardized time itself.")),
]


def bullet_slide(title, bullets):
    img = Image.new("RGB", (W, H), (20, 22, 29))
    d = ImageDraw.Draw(img)
    tf = font(FB, 60)
    bf = font(FR, 50)
    title_lines = wrap_px(d, title, tf, W - 160)
    body_lines = []
    for b in bullets:
        body_lines += wrap_px(d, "•  " + b, bf, W - 180)
        body_lines.append("")  # spacer between bullets
    t_asc, t_desc = tf.getmetrics()
    b_asc, b_desc = bf.getmetrics()
    t_lh, b_lh = t_asc + t_desc + 14, b_asc + b_desc + 22
    content_h = len(title_lines) * t_lh + 60 + len(body_lines) * b_lh
    y = max(240, (H - content_h) // 2 - 60)
    for line in title_lines:
        d.text((80, y), line, font=tf, fill=(233, 196, 106))
        y += t_lh
    y += 60
    for line in body_lines:
        if line:
            d.text((90, y), line, font=bf, fill=(232, 232, 232))
        y += b_lh
    d.text((90, H - 140), "APUSH · Westward Expansion", font=font(FR, 34), fill=(120, 126, 140))
    return img


def synth(text, out):
    subprocess.run([TTS, "speak", "--voice", VOICE, "--speed", "92",
                    "--output", out, "--text", text], check=True)


def dur(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip())


def main():
    os.makedirs(AUDIO, exist_ok=True)
    clips, audios = [], []
    for i, s in enumerate(SCENES):
        mp3 = os.path.join(AUDIO, f"s{i}.mp3")
        if not os.path.exists(mp3) or dur(mp3) == 0:
            print(f"TTS scene {i}...", flush=True)
            synth(s["text"], mp3)
        d = dur(mp3) + 1.2  # breathing room
        ip = os.path.join(ASSETS, s["img"]) if s.get("img") else None
        if s["kind"] == "title":
            clips.append(title_scene(ip, s["title"], s["sub"], d))
        elif s["kind"] == "caption":
            clips.append(caption_scene(ip, s["caption"], d, pan_x=0.65))
        else:
            clips.append(slide_scene(bullet_slide(s["title"], s["bullets"]), d))
        audios.append(mp3)
        print(f"scene {i}: {d:.1f}s", flush=True)
    print("assembling...", flush=True)
    motion.assemble(clips, audios, OUT)
    print("done:", OUT, flush=True)


if __name__ == "__main__":
    main()
