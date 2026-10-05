"""Stage: anim.

Emits LTX/video-generation prompts for beats that carry "anim_prompt", so
Munish can render them on his Windows RTX 5090. The pipeline picks up a
finished clip at <episode>/clips/<bid>.mp4 when its duration matches the
beat (+/-1s); otherwise the Ken Burns fallback renders.

Writes: <episode>/anim_prompts/<bid>.txt + MANIFEST.json
"""
import json
import os

PROMPT_TEMPLATE = """# LTX clip prompt — {ep} / beat {bid}
# Render on Windows RTX 5090, then drop the finished clip at:
#   {clip_rel}
# The pipeline uses it automatically when duration matches ({dur:.1f}s +/- 1s).
# No text in the clip — narration carries all words. No competing captions.

Duration: {dur:.1f}s
Resolution: 1920x1080, 30fps
Style: cinematic documentary, natural light, photorealistic, subtle camera drift

Shot:
{prompt}

Negative: text, captions, subtitles, watermark, logo, people speaking to camera,
cartoon, painting, oversaturated colors
"""


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
