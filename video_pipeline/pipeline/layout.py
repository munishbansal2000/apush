from __future__ import annotations

import gc
from pathlib import Path

import numpy as np
from PIL import Image

from .common import PipelineError
from .timing import resolve_scene_timing


def _duration(scene: dict) -> float:
    spoken = len(scene["narration"]["text"].split()) / 2.35 + 1.0
    return max(float(scene.get("min_duration", 0)), spoken, 3.0)


def _intersection(a: dict, b: dict) -> tuple[float, float]:
    ax0, ay0, ax1, ay1 = a["box"]
    bx0, by0, bx1, by1 = b["box"]
    width = max(0.0, min(ax1, bx1) - max(ax0, bx0))
    height = max(0.0, min(ay1, by1) - max(ay0, by0))
    area = width * height
    smaller = min(max(1e-9, (ax1-ax0)*(ay1-ay0)),
                  max(1e-9, (bx1-bx0)*(by1-by0)))
    return area, area / smaller


def validate_text_layout(manifest: dict, manifest_path: Path,
                         repo_root: Path,
                         durations: dict[str, float] | None = None,
                         alignments: dict[str, list[dict]] | None = None) -> dict:
    """Record every rendered text box and reject temporal/spatial collisions."""
    from .render import _motion, build_clip

    motion = _motion(repo_root, preview=False)
    motion.set_scale(0.25)
    width, height = motion.W, motion.H
    scene_reports = []
    failures = []
    try:
        for scene in manifest["scenes"]:
            duration = ((durations or {}).get(scene["id"], _duration(scene)))
            scene = resolve_scene_timing(
                scene, duration, (alignments or {}).get(scene["id"]))
            clip = None
            with motion.PlanRecorder() as recorder:
                if scene["animation"]["type"] == "ai_clip":
                    clip = motion.slide_scene(
                        Image.fromarray(np.zeros((height, width, 3), dtype=np.uint8) + 24),
                        duration)
                    if scene.get("beats"):
                        clip = motion.beat_overlay(clip, scene["beats"], duration)
                else:
                    clip = build_clip(motion, scene, duration,
                                      manifest_path, repo_root)
            if clip is not None:
                clip.close()

            boxes = []
            for raw in recorder.boxes:
                x0, y0, x1, y1 = raw["box"]
                item = {
                    **raw,
                    "box": [x0/width, y0/height, x1/width, y1/height]
                }
                boxes.append(item)
                if x0 < 0 or y0 < 0 or x1 > width or y1 > height:
                    failures.append({
                        "scene": scene["id"], "type": "out_of_frame",
                        "element": item
                    })

            collisions = []
            for index, left in enumerate(boxes):
                for right in boxes[index+1:]:
                    if (left["kind"] == right["kind"] and
                            left["kind"] in {"bullet", "bullet-title", "title-card"}):
                        continue
                    overlap_time = min(left["t1"], right["t1"]) - max(left["t0"], right["t0"])
                    if overlap_time <= 0.1:
                        continue
                    area, ratio = _intersection(left, right)
                    if area > 0 and ratio >= 0.08:
                        collision = {
                            "left": left, "right": right,
                            "overlap_seconds": round(overlap_time, 3),
                            "overlap_ratio": round(ratio, 3)
                        }
                        collisions.append(collision)
                        failures.append({"scene": scene["id"],
                                         "type": "text_collision", **collision})
            scene_reports.append({
                "scene_id": scene["id"], "estimated_duration": duration,
                "text_elements": boxes, "collisions": collisions
            })
            gc.collect()
    finally:
        motion.set_scale(1.0)

    report = {
        "canvas": {"width": width, "height": height},
        "scenes": scene_reports,
        "text_element_count": sum(len(row["text_elements"]) for row in scene_reports),
        "failure_count": len(failures),
        "failures": failures
    }
    if failures:
        examples = []
        for failure in failures[:5]:
            if failure["type"] == "text_collision":
                examples.append(
                    f"{failure['scene']}: '{failure['left']['text']}' overlaps "
                    f"'{failure['right']['text']}'")
            else:
                examples.append(
                    f"{failure['scene']}: '{failure['element']['text']}' leaves frame")
        raise PipelineError("text layout validation failed: " + "; ".join(examples))
    return report
