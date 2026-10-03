#!/usr/bin/env python3
"""Generate duration-sized SILENT placeholder MP3s for sample videos.

Pace is measured from the Cuba v4 pilot: 398 narration words over 161.9s of
rendered fish-speech audio = 2.4583 words/sec. Each key's placeholder is
sized as (speakable words / pace) + (pause-tag seconds), so the motion
scenes built on motion.dur() match the real narration's timing window.

These are PLACEHOLDERS. Delete them (or just overwrite) when the real
fish-speech render lands, then re-run video/validate_video.py.

Usage (from the apush repo root):
    python video/samples/make_placeholders.py vid-u1-01
    python video/samples/make_placeholders.py vid-u1-01 vid-u1-03 vid-u1-04

Requires: ffmpeg on PATH.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))          # video/samples/
VIDEO = os.path.dirname(HERE)                              # video/
REPO = os.path.dirname(VIDEO)

sys.path.insert(0, VIDEO)
from render_narration import split_pauses  # noqa: E402  (tag parsing, shared)

# measured: video/cuba_narration.json = 398 words; rendered audio = 161.9s
WPS = 398 / 161.9


def key_duration(segments):
    """Seconds of audio a key's segments would take at pilot pace."""
    words, pauses = 0, 0.0
    for s in segments:
        for kind, payload in split_pauses(s["text"]):
            if kind == "silence":
                pauses += payload
            else:
                words += len(payload.split())
    return words / WPS + pauses


def main():
    ids = sys.argv[1:]
    if not ids:
        sys.exit("usage: make_placeholders.py <lesson-id> [...]")
    for lid in ids:
        narr = os.path.join(HERE, lid, "narration.json")
        segs = json.load(open(narr, encoding="utf-8"))
        order, groups = [], {}
        for s in segs:
            if s["key"] not in groups:
                groups[s["key"]] = []
                order.append(s["key"])
            groups[s["key"]].append(s)
        adir = os.path.join(VIDEO, "audio", lid)
        os.makedirs(adir, exist_ok=True)
        total = 0.0
        for key in order:
            dur = max(4.0, key_duration(groups[key]))
            total += dur
            out = os.path.join(adir, key + ".mp3")
            subprocess.run(
                ["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
                 "-i", "anullsrc=r=44100:cl=stereo", "-t", f"{dur:.3f}",
                 "-c:a", "libmp3lame", "-b:a", "128k", out],
                check=True)
            n_w = sum(len(p[1].split()) for s in groups[key]
                      for p in split_pauses(s["text"]) if p[0] == "say")
            print(f"  {lid}/{key}.mp3: {dur:.1f}s ({n_w} words)")
        print(f"{lid}: {len(order)} placeholders, {total:.1f}s total "
              f"(pace {WPS:.2f} wps)")


if __name__ == "__main__":
    main()
