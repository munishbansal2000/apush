#!/usr/bin/env python3
"""Run a real LTX prompt to verify end-to-end generation works.

Uses a tiny test image and short prompt. Takes ~2-5 minutes on 5090.
Verifies: model loads, CUDA works, output MP4 is valid.

Usage:
  python tools/test-ltx-generate.py
"""
import sys
import tempfile
from pathlib import Path

# Create a tiny test image (solid color, no download needed)
from PIL import Image
test_img = Path(tempfile.gettempdir()) / "ltx-test-input.png"
Image.new('RGB', (512, 512), color=(100, 150, 200)).save(test_img)
print(f"Test image: {test_img}")

test_out = Path(tempfile.gettempdir()) / "ltx-test-output.mp4"
test_prompt = "subtle clouds drifting across a blue sky, gentle motion"

print("Loading LTX pipeline...")
import torch
from diffusers import LTXImageToVideoPipeline

pipe = LTXImageToVideoPipeline.from_pretrained(
    "Lightricks/LTX-Video-0.9.8-13B-distilled",
    torch_dtype=torch.bfloat16,
)
pipe.to("cuda")
print("Pipeline loaded, generating...")

# Minimal generation: 1 second at low res
output = pipe(
    image=str(test_img),
    prompt=test_prompt,
    num_frames=25,  # ~1s at 24fps
    num_inference_steps=10,  # fast, low quality is fine for test
    guidance_scale=1.0,
).frames[0]

print(f"Generated {len(output)} frames")

# Save as MP4
import imageio
imageio.mimsave(str(test_out), output, fps=24)
print(f"Saved: {test_out} ({test_out.stat().st_size / 1024:.0f} KB)")

# Verify it's a valid video
import subprocess
r = subprocess.run(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
     '-of', 'default=noprint_wrappers=1:nokey=1', str(test_out)],
    capture_output=True, text=True,
)
duration = float(r.stdout.strip())
print(f"Duration: {duration:.1f}s")
assert duration > 0.5, "Output too short!"

print("\n✓ LTX generation works end-to-end.")
