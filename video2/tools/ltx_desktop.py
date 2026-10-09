#!/usr/bin/env python3
"""Submit one image-to-video job to the already-running LTX Desktop app.

This is intentionally a small stdlib client. It does not import torch,
diffusers, or load model weights in the pipeline process.
"""
import argparse
import json
import os
import shutil
import sys
import urllib.error
import urllib.request

import ltx_auth

DEFAULT_URL = "http://127.0.0.1:41954"
DEFAULT_NEGATIVE = (
    "text, watermark, letters, numbers, people, faces, modern ships, "
    "modern buildings, warping, morphing"
)


def generate(args):
    image = os.path.abspath(args.image)
    output = os.path.abspath(args.out)
    if not os.path.isfile(image):
        raise RuntimeError("LTX input image does not exist: %s" % image)

    request_body = {
        "prompt": args.prompt,
        "imagePath": image,
        "resolution": args.resolution,
        "model": args.model,
        "duration": args.duration,
        "fps": args.fps,
        "seed": args.seed,
        "cameraMotion": args.camera_motion,
        "negativePrompt": args.negative,
    }
    token = ltx_auth.discover_token()
    base_url = os.environ.get("LTX_DESKTOP_URL", DEFAULT_URL).rstrip("/")
    request = urllib.request.Request(
        base_url + "/api/generate",
        data=json.dumps(request_body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=args.timeout) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise RuntimeError(
            "LTX Desktop returned HTTP %d: %s" % (error.code, detail)) from error
    except urllib.error.URLError as error:
        raise RuntimeError(
            "cannot reach LTX Desktop at %s: %s" % (base_url, error.reason)) from error

    source = result.get("video_path")
    if not source or not os.path.isfile(source):
        raise RuntimeError("LTX Desktop returned no readable video: %r" % result)
    os.makedirs(os.path.dirname(output), exist_ok=True)
    temporary = output + ".copying"
    try:
        shutil.copyfile(source, temporary)
        if os.path.getsize(temporary) == 0:
            raise RuntimeError("LTX Desktop produced an empty video")
        os.replace(temporary, output)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print("[ltx-desktop] saved %s" % output, flush=True)


def parser():
    value = argparse.ArgumentParser(description=__doc__)
    value.add_argument("--check", action="store_true",
                       help="only verify that the Desktop backend/token exists")
    value.add_argument("--image")
    value.add_argument("--prompt")
    value.add_argument("--out")
    value.add_argument("--duration", type=int, default=5)
    value.add_argument("--seed", type=int, default=42)
    value.add_argument("--model", default="fast")
    value.add_argument("--resolution", default="1080p")
    value.add_argument("--fps", type=int, default=24)
    value.add_argument("--camera-motion", default="none")
    value.add_argument("--negative", default=DEFAULT_NEGATIVE)
    value.add_argument("--timeout", type=int, default=1800)
    return value


def main(argv=None):
    args = parser().parse_args(argv)
    if args.check:
        token = ltx_auth.discover_token()
        print("[ltx-desktop] backend ready; token prefix: %s" % token[:8])
        return 0
    missing = [name for name in ("image", "prompt", "out")
               if not getattr(args, name)]
    if missing:
        parser().error("required for generation: " + ", ".join(
            "--" + name for name in missing))
    generate(args)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print("[ltx-desktop] ERROR: %s" % error, file=sys.stderr)
        raise SystemExit(1)
