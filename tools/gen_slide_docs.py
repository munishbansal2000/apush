#!/usr/bin/env python3
"""Generate slide API reference from code signatures.

Usage: python3 tools/gen_slide_docs.py
Output: video-pipeline/docs/slide-api-reference.md

Run this whenever a slide's __init__ signature changes. The director prompt
includes this file by reference — docs can never drift from code.
"""
import sys, inspect
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "slideforge"))
import slideforge.slides as m

classes = []
for name in dir(m):
    obj = getattr(m, name)
    if inspect.isclass(obj) and name.endswith("Slide") and name != "Slide":
        classes.append((name, obj))
classes.sort()

lines = [
    "# Slide API Reference (auto-generated from code)",
    "",
    "> DO NOT EDIT MANUALLY. Regenerate with:",
    "> `python3 tools/gen_slide_docs.py`",
    "",
]
for name, cls in classes:
    sig = inspect.signature(cls.__init__)
    params = []
    for pname, p in sig.parameters.items():
        if pname in ("self", "cfg"):
            continue
        if p.default is inspect.Parameter.empty:
            params.append(f"**{pname}** (required)")
        else:
            ds = repr(p.default)
            if len(ds) > 40:
                ds = ds[:40] + "..."
            params.append(f"*{pname}* = `{ds}`")
    doc = (cls.__doc__ or "").strip().split("\n")[0]
    lines.append(f"## {name}")
    if doc:
        lines.append(f"_{doc}_")
    lines.append("")
    for p in params:
        lines.append(f"- {p}")
    lines.append("")

out = ROOT / "video-pipeline" / "docs" / "slide-api-reference.md"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text("\n".join(lines))
print(f"Wrote {out} ({len(classes)} slides)")
