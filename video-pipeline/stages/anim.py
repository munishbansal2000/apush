"""Stage: anim.

Emits LTX/video-generation prompts for beats that carry "anim_prompt", so
Munish can render them on his Windows RTX 5090 (or the clips stage can
generate them in-pipeline). The pipeline picks up a finished clip at
<episode>/clips/<bid>.mp4 when its duration matches the beat (+/-1s);
otherwise the Ken Burns fallback renders.

Every prompt passes the ambient-motion-only safety filter
(video/animate_still.py) before it is emitted: prompts may describe water,
smoke, clouds, flags, fire, mist, etc. — never people, content changes,
or camera moves. Rejected prompts fail the stage.

Writes: <episode>/anim_prompts/<bid>.txt + MANIFEST.json
"""
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.dirname(os.path.dirname(_HERE))

PROMPT_TEMPLATE = """# LTX clip prompt — {ep} / beat {bid}
# Render on Windows RTX 5090, then drop the finished clip at:
#   {clip_rel}
# The pipeline uses it automatically when duration matches ({dur:.1f}s +/- 1s).
# No text in the clip — narration carries all words. No competing captions.

Duration: {dur:.1f}s
Resolution: 1920x1080, 30fps
Style: cinematic documentary, natural light, photorealistic, static locked-off camera

Shot:
{prompt}

Negative: text, captions, subtitles, watermark, logo, people speaking to camera,
cartoon, painting, oversaturated colors, camera movement, camera zoom, camera pan,
morphing, added people
"""


def _check_prompt_safety(prompt, bid):
    """Enforce the ambient-motion-only contract; raise on rejection."""
    sys.path.insert(0, os.path.join(_REPO_ROOT, "video"))
    try:
        from animate_still import check_prompt_safety
    except ImportError as exc:
        raise RuntimeError(f"cannot load prompt safety filter: {exc}")
    ok, detail = check_prompt_safety(prompt)
    if not ok:
        raise RuntimeError(f"beat {bid}: anim_prompt rejected: {detail}")


def run(ep_dir, cfg):
    with open(os.path.join(ep_dir, "work", "beats_resolved.json"), encoding="utf-8") as f:
        beats = json.load(f)["beats"]
    outdir = os.path.join(ep_dir, "anim_prompts")
    os.makedirs(outdir, exist_ok=True)
    manifest = []
    for b in beats:
        prompt = b.get("anim_prompt")
        if not prompt:
            continue
        bid = b["id"]
        _check_prompt_safety(prompt.strip(), bid)
        clip_rel = os.path.join("clips", f"{bid}.mp4")
        txt = PROMPT_TEMPLATE.format(
            ep=cfg.get("episode", ""), bid=bid,
            clip_rel=clip_rel, dur=b["dur"], prompt=prompt.strip())
        with open(os.path.join(outdir, f"{bid}.txt"), "w", encoding="utf-8") as f:
            f.write(txt)
        manifest.append({"beat": bid, "duration": round(b["dur"], 2),
                         "clip": clip_rel,
                         "ready": os.path.exists(os.path.join(ep_dir, clip_rel))})
    with open(os.path.join(outdir, "MANIFEST.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)
    ready = sum(1 for m in manifest if m["ready"])
    print(f"anim: {len(manifest)} prompts emitted, {ready} clips already present",
          flush=True)
    return outdir
