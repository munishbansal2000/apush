#!/usr/bin/env python3
"""Compose a vertical split-screen still: top image over bottom image.

Used by the stills stage (command provider) for scenes the motion renderer
cannot compose itself, e.g. the Valladolid study/mines split.

The scene's still.prompt carries the spec:  SPLIT top=<path> bottom=<path>
Paths resolve against the repo root (or cwd).
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

WIDTH, HEIGHT = 1080, 1920


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", required=True, help='SPLIT top=<path> bottom=<path>')
    ap.add_argument("--out", required=True)
    ap.add_argument("--repo-root", default=".")
    args = ap.parse_args(argv)

    match = re.match(r"\s*SPLIT\s+top=(\S+)\s+bottom=(\S+)\s*$", args.prompt)
    if not match:
        raise SystemExit(f"compose_split: prompt must be 'SPLIT top=<path> bottom=<path>', got {args.prompt!r}")
    root = Path(args.repo_root)
    top_path = (root / match.group(1)).resolve() if not Path(match.group(1)).is_absolute() else Path(match.group(1))
    bottom_path = (root / match.group(2)).resolve() if not Path(match.group(2)).is_absolute() else Path(match.group(2))
    for label, path in (("top", top_path), ("bottom", bottom_path)):
        if not path.is_file():
            raise SystemExit(f"compose_split: {label} image not found: {path}")

    from PIL import Image
    top = Image.open(top_path).convert("RGB")
    bottom = Image.open(bottom_path).convert("RGB")

    def cover(image: Image.Image, w: int, h: int) -> Image.Image:
        scale = max(w / image.width, h / image.height)
        resized = image.resize((int(image.width * scale) + 1, int(image.height * scale) + 1), Image.LANCZOS)
        left = (resized.width - w) // 2
        upper = (resized.height - h) // 2
        return resized.crop((left, upper, left + w, upper + h))

    canvas = Image.new("RGB", (WIDTH, HEIGHT))
    canvas.paste(cover(top, WIDTH, HEIGHT // 2), (0, 0))
    canvas.paste(cover(bottom, WIDTH, HEIGHT // 2), (0, HEIGHT // 2))
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out)
    print(f"compose_split: wrote {out} ({WIDTH}x{HEIGHT})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
