#!/usr/bin/env python3
"""Render one representative frame per lesson scene plus a contact sheet."""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve()
PIPELINE_ROOT = HERE.parents[1]
REPO_ROOT = HERE.parents[2]
sys.path.insert(0, str(PIPELINE_ROOT))

from pipeline.render import _motion, build_clip  # noqa: E402
from pipeline.timing import resolve_scene_timing  # noqa: E402


def estimated_duration(scene: dict) -> float:
    spoken = len(scene["narration"]["text"].split()) / 2.35 + 1.0
    return max(float(scene.get("min_duration", 0)), spoken, 3.0)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--out-dir", required=True)
    args = parser.parse_args()

    manifest_path = Path(args.manifest).resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    output = Path(args.out_dir).resolve()
    output.mkdir(parents=True, exist_ok=True)
    motion = _motion(REPO_ROOT, preview=False)
    motion.set_scale(0.25)
    frames: list[tuple[str, Image.Image]] = []
    try:
        for index, scene in enumerate(manifest["scenes"]):
            duration = estimated_duration(scene)
            timed = resolve_scene_timing(scene, duration)
            clip = build_clip(motion, timed, duration, manifest_path, REPO_ROOT)
            try:
                # Late-middle frames show the scene's developed visual state,
                # while avoiding final-frame fades and expired short beats.
                frame = Image.fromarray(clip.get_frame(duration * 0.84)).convert("RGB")
            finally:
                clip.close()
            name = f"{index + 1:02d}-{scene['id']}.jpg"
            frame.save(output / name, quality=90)
            frames.append((scene["id"], frame))

        columns = 4
        label_height = 34
        cell_w, cell_h = motion.W, motion.H + label_height
        rows = math.ceil(len(frames) / columns)
        sheet = Image.new("RGB", (columns * cell_w, rows * cell_h), (12, 14, 20))
        draw = ImageDraw.Draw(sheet)
        font = ImageFont.truetype(str(REPO_ROOT / "video" / "fonts" / "DejaVuSans-Bold.ttf"), 16)
        for index, (scene_id, frame) in enumerate(frames):
            x, y = (index % columns) * cell_w, (index // columns) * cell_h
            sheet.paste(frame, (x, y))
            draw.text((x + 8, y + motion.H + 8), f"{index + 1:02d}  {scene_id}",
                      font=font, fill=(235, 235, 235))
        sheet_path = output / "contact-sheet.jpg"
        sheet.save(sheet_path, quality=92)
        print(f"rendered {len(frames)} storyboard frames -> {sheet_path}")
    finally:
        motion.set_scale(1.0)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
