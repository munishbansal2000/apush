#!/usr/bin/env python3
"""Local AI stills animation for the APUSH video factory ("living engravings").

Takes a public-domain still image + an ambient-motion-only prompt and produces
a 3-6s MP4 where ONLY ambient elements move (water, smoke, clouds, flags).
Historically safe by construction: the prompt filter rejects anything that
adds, removes, or changes scene content.

Model: LTX-Video 13B distilled via diffusers (no API keys, no cloud).
Runs on the 5090 (32GB VRAM, torch already set up for fish-speech).

Usage:
    python video/animate_still.py --image assets/images/u3/ship.jpg \
        --prompt "Gentle waves ripple across the harbor water; thin clouds drift overhead." \
        --out video/ai_clips/ship-harbor.mp4 --duration 5 --seed 42

    python video/animate_still.py --image ... --prompt ... --out ... --dry-run
"""
import argparse
import os
import random
import re
import sys
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

MODEL_DEFAULT = "Lightricks/LTX-Video-0.9.8-13B-distilled"
MODEL_FALLBACK = "Lightricks/LTX-Video"  # 2B; guaranteed diffusers format
FPS = 24
NEGATIVE_PROMPT = ("worst quality, inconsistent motion, blurry, jittery, "
                   "distorted, morphing, extra limbs, changing faces, "
                   "people appearing, text, watermark, camera movement, "
                   "camera zoom, camera pan")

# --- prompt safety: ambient motion ONLY -------------------------------------
# A prompt passes iff (a) no banned pattern matches and (b) at least one
# ambient keyword is present. Anything else is rejected: the model must never
# be asked to add/remove/change scene content (that's the historical-safety
# guarantee, enforced again by the AI-CLIP validator gate).
AMBIENT_KEYWORDS = {
    "water", "wave", "waves", "river", "stream", "current", "ripple",
    "ripples", "smoke", "cloud", "clouds", "fog", "mist", "haze",
    "flag", "flags", "fabric", "flame", "flames", "fire", "flicker",
    "rain", "snow", "leaf", "leaves", "grass", "breeze", "wind",
    "candle", "torch", "dust", "ember", "embers", "spark", "sparks",
    "reflection", "reflections", "shimmer", "drift", "drifts", "sway",
    "sways", "flow", "flows", "billow", "billows",
}
BANNED_PATTERNS = [
    # content verbs: add / remove / replace / transform / ...
    r"\badd(s|ed|ing)?\b", r"\bremov(e|es|ed|ing)\b",
    r"\breplac(e|es|ed|ing)\b", r"\btransform(s|ed|ing)?\b",
    r"\bmorph(s|ed|ing)?\b", r"\bswap(s|ped|ping)?\b",
    r"\beras(e|es|ed|ing)\b", r"\binsert(s|ed|ing)?\b",
    r"\bdelet(e|es|ed|ing)\b", r"\bintroduc(e|es|ed|ing)\b",
    r"\bturn\b.{0,20}\binto\b", r"\bchang(e|es|ed|ing)\b.{0,20}\binto\b",
    r"\bbecom(e|es|ing)\b",
    # person nouns: the model must never add or move people
    r"\bpersons?\b", r"\bpeople\b", r"\b(man|men|woman|women)\b",
    r"\b(child|children)\b", r"\bsoldiers?\b", r"\btroops?\b",
    r"\bcrowds?\b", r"\barm(y|ies)\b", r"\bfigures?\b",
    # person-motion verbs
    r"\bwalk(s|ed|ing)?\b", r"\brun(s|ning)?\b", r"\bmarch(es|ed|ing)?\b",
    r"\bdanc(e|es|ed|ing)\b", r"\bfight(s|ing)?\b",
]
BANNED_RES = [re.compile(p, re.IGNORECASE) for p in BANNED_PATTERNS]
CAMERA_WORDS = re.compile(
    r"\b(zoom|pan|dolly|orbit|tilt|tracking shot|crane)\b", re.IGNORECASE)

# Phrases that explicitly forbid camera motion or content change. Stripped
# before the banned-pattern scan so negative instructions ("do not add",
# "without removing", "keep the camera steady") never trip the filter.
NEGATION_RES = [re.compile(p, re.IGNORECASE) for p in [
    r"\bkeep the camera (steady|still|static|fixed)\b",
    r"\b(static|fixed|locked) camera\b",
    r"\bdo not\b[^,.;]*",
    r"\bdon't\b[^,.;]*",
    r"\bdoes not\b[^,.;]*",
    r"\bdoesn't\b[^,.;]*",
    r"\bnever\b[^,.;]*",
    r"\bwithout\b[^,.;]*",
    r"\bavoid\b[^,.;]*",
]]

# Camera-move instructions: rejected outright (the factory does its own
# camera work; AI clips are static-camera by contract).
CAMERA_MOVE_RES = [re.compile(p, re.IGNORECASE) for p in [
    # any remaining mention of "camera" after static-camera phrases and
    # negations are stripped is a move instruction ("the camera pans", ...)
    r"\bcamera\b",
    r"\b(push|pull)\s+(in|out)\b",
    r"\b(zoom|zooms|zooming|pan|pans|panning|dolly|dollies|orbit|orbits|tilting?|tracking)\b",
    r"\btracking shot\b",
    r"\bcrane shot\b",
]]


def check_prompt_safety(prompt):
    """Return (ok, detail). ok=False means the prompt must not be used.

    Importable by video/validate_video.py's AI-CLIP gate and by
    video_pipeline/pipeline/clips.py: the same function enforces the rule
    at generation time and at validation time.

    Negation-aware: "do not add", "without removing", "keep the camera
    steady" are stripped before the banned-pattern scan, so prohibitions
    never trip the filter. Camera-move instructions are rejected outright.
    """
    if not prompt or not prompt.strip():
        return False, "prompt is empty"
    scrubbed = prompt
    for rx in NEGATION_RES:
        scrubbed = rx.sub(" ", scrubbed)
    for rx in CAMERA_MOVE_RES:
        m = rx.search(scrubbed)
        if m:
            return (False,
                    f"banned camera-move phrase {m.group(0)!r}: AI clips are "
                    f"static-camera by contract; the factory does its own "
                    f"camera work")
    for rx in BANNED_RES:
        m = rx.search(scrubbed)
        if m:
            return (False,
                    f"banned content phrase {m.group(0)!r}: prompts may only "
                    f"describe ambient motion (water, smoke, clouds, flags, "
                    f"fire, mist, ...); they must never add, remove, or "
                    f"change scene content or people")
    words = set(re.findall(r"[a-z]+", prompt.lower()))
    if not (words & AMBIENT_KEYWORDS):
        return (False,
                "no ambient-motion vocabulary found: describe moving water, "
                "smoke, clouds, flags, fire, mist, etc. "
                f"(known words: {sorted(AMBIENT_KEYWORDS)})")
    detail = "ambient-motion prompt accepted"
    if CAMERA_WORDS.search(scrubbed):
        detail += ("; note: camera-adjacent word detected -- the factory does "
                   "its own camera work, so keep AI clips static-camera")
    return True, detail


# --- sizing ------------------------------------------------------------------
def snap32(n):
    """LTX-Video needs height/width divisible by 32."""
    return max(32, int(n) // 32 * 32)


def crop_to_aspect(image, width, height, focus=(0.5, 0.5)):
    """Crop (never stretch) the still to width:height around focus (0..1), so historical art is not distorted."""
    target = width / height
    w, h = image.size
    if w / h > target:  # too wide: crop the sides
        cw = int(round(h * target))
        left = int(round(min(max(focus[0] * w - cw / 2, 0), w - cw)))
        return image.crop((left, 0, left + cw, h))
    ch = int(round(w / target))  # too tall: crop top/bottom
    top = int(round(min(max(focus[1] * h - ch / 2, 0), h - ch)))
    return image.crop((0, top, w, top + ch))


def snap_frames(duration_s, fps=FPS):
    """LTX-Video needs num_frames = 8N+1; round to nearest."""
    n = max(9, int(round(duration_s * fps)))
    return int(round((n - 1) / 8)) * 8 + 1


# --- model availability (no torch needed) ------------------------------------
def hf_cache_dir(model_id):
    return os.path.join(os.path.expanduser("~"), ".cache", "huggingface",
                        "hub", "models--" + model_id.replace("/", "--"))


def check_model_cached(model_id):
    d = hf_cache_dir(model_id)
    if os.path.isdir(d):
        # a snapshot dir with weight files counts as downloaded
        for root, _dirs, files in os.walk(d):
            if any(f.endswith((".safetensors", ".bin")) for f in files):
                return True, f"found in HF cache: {d}"
    return False, (
        f"not in HF cache. Download on the 5090 with:\n"
        f"    huggingface-cli download {model_id}\n"
        f"  (~40GB disk for the 13B distilled; needs HF login only if the "
        f"repo were gated -- it is public)")


# --- dry run -----------------------------------------------------------------
def cmd_dry_run(args):
    """Validate everything except the actual GPU generation."""
    ok = True
    img = args.image if os.path.isabs(args.image) else os.path.join(REPO, args.image)
    if not os.path.isfile(img):
        print(f"FAIL: image not found: {img}")
        ok = False
    else:
        try:
            from PIL import Image
            im = Image.open(img)
            im.verify()
            print(f"ok: image readable: {img}")
        except Exception as e:
            print(f"FAIL: image unreadable: {e}")
            ok = False
    good, detail = check_prompt_safety(args.prompt)
    print(f"{'ok' if good else 'FAIL'}: prompt safety: {detail}")
    ok = ok and good
    if not (3 <= args.duration <= 6):
        print(f"FAIL: --duration must be 3..6s (got {args.duration})")
        ok = False
    else:
        print(f"ok: duration {args.duration}s -> "
              f"{snap_frames(args.duration)} frames @ {FPS}fps, "
              f"{snap32(args.width)}x{snap32(args.height)}")
    cached, cdetail = check_model_cached(args.model)
    print(f"{'ok' if cached else 'WARN'}: model {args.model}: {cdetail}")
    try:
        import torch
        cuda = torch.cuda.is_available()
        print(f"ok: torch {torch.__version__}, CUDA available: {cuda}"
              + (f" ({torch.cuda.get_device_name(0)})" if cuda else ""))
        if not cuda:
            print("WARN: no CUDA here -- generation runs on the 5090 only")
    except ImportError:
        print("WARN: torch not installed here -- generation runs on the 5090 "
              "only (dry-run does not need it)")
    try:
        import diffusers  # noqa
        print(f"ok: diffusers {diffusers.__version__} importable")
    except ImportError:
        print("WARN: diffusers not installed here -- needed on the 5090 only")
    print("dry-run:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


# --- generation (5090 only; torch/diffusers imported lazily) ------------------
def _load_pipeline(model_id, pipeline_kind, cpu_offload):
    import torch
    from diffusers import LTXImageToVideoPipeline

    tried = []
    kinds = [pipeline_kind] if pipeline_kind != "auto" else ["i2v", "condition"]

    for kind in kinds:
        try:
            if kind == "i2v":
                pipe = LTXImageToVideoPipeline.from_pretrained(
                    model_id, torch_dtype=torch.bfloat16)
            else:
                from diffusers import LTXConditionPipeline
                pipe = LTXConditionPipeline.from_pretrained(
                    model_id, torch_dtype=torch.bfloat16)
            if cpu_offload:
                pipe.enable_model_cpu_offload()
            else:
                pipe.to("cuda")
            return pipe, kind
        except Exception as e:
            tried.append(f"{kind}: {e}")
    raise RuntimeError(
        "could not load an LTX pipeline for "
        f"{model_id} (tried: {'; '.join(tried)}). "
        f"Fallback: --model {MODEL_FALLBACK}")


def _condition_video_from_image(pipe, image, out_dir):
    """LTXConditionPipeline path: wrap the still as a 1-frame video first
    (the model was trained on video-compressed conditioning)."""
    import torch
    from diffusers.pipelines.ltx.pipeline_ltx_condition import LTXVideoCondition
    from diffusers.utils import export_to_video, load_video
    tmp = os.path.join(out_dir, "_cond_src.mp4")
    export_to_video([image], tmp, fps=FPS)
    return LTXVideoCondition(video=load_video(tmp), frame_index=0)


def cmd_generate(args):
    good, detail = check_prompt_safety(args.prompt)
    if not good:
        sys.exit(f"error: prompt rejected: {detail}")
    if not (3 <= args.duration <= 6):
        sys.exit(f"error: --duration must be 3..6s (got {args.duration})")
    img_path = args.image if os.path.isabs(args.image) else os.path.join(REPO, args.image)
    if not os.path.isfile(img_path):
        sys.exit(f"error: image not found: {img_path}")

    import torch
    if not torch.cuda.is_available():
        sys.exit("error: no CUDA -- generation runs on the 5090 only")

    from diffusers.utils import export_to_video, load_image

    width, height = snap32(args.width), snap32(args.height)
    num_frames = snap_frames(args.duration)
    seed = args.seed if args.seed is not None else random.randrange(2**31)
    print(f"loading {args.model} ...")
    pipe, kind = _load_pipeline(args.model, args.pipeline, args.cpu_offload)
    print(f"pipeline: {kind}; {width}x{height}, {num_frames} frames, "
          f"seed {seed}")

    image = load_image(img_path).convert("RGB")
    # Crop to the output aspect around --focus, then scale: never stretch the painting.
    focus = tuple(float(v) for v in args.focus.split(",")) if args.focus else (0.5, 0.5)
    image = crop_to_aspect(image, width, height, focus).resize((width, height))

    gen_kwargs = dict(
        prompt=args.prompt,
        negative_prompt=args.negative_prompt or NEGATIVE_PROMPT,
        width=width,
        height=height,
        num_frames=num_frames,
        num_inference_steps=args.steps,
        guidance_scale=1.0,  # distilled checkpoints expect ~1.0
        generator=torch.Generator("cuda").manual_seed(seed),
    )
    if kind == "condition":
        out_dir = os.path.dirname(os.path.abspath(args.out)) or "."
        gen_kwargs["conditions"] = [
            _condition_video_from_image(pipe, image, out_dir)]
        gen_kwargs.pop("width")  # condition path infers from media
        gen_kwargs.pop("height")
    else:
        gen_kwargs["image"] = image

    print("generating ... (first run also downloads weights, ~40GB)")
    frames = pipe(**gen_kwargs).frames[0]
    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    export_to_video(frames, args.out, fps=FPS)
    print(f"done: {args.out} ({len(frames)} frames, seed {seed})")
    print("Log this for the manifest ai_clips record: "
          f"image={args.image} seed={seed} model={args.model}")


# --- CLI ----------------------------------------------------------------------
RUNBOOK = """
5090 RUNBOOK -- local AI stills animation ("living engravings")
================================================================
No API keys. Everything runs on your RTX 5090 (32GB VRAM).

1) Install (torch already set up for fish-speech; add diffusers):

    pip install -U "diffusers[torch]" transformers accelerate huggingface_hub imageio imageio-ffmpeg

    # diffusers main is safest for LTX (the model card recommends it):
    # pip install -U git+https://github.com/huggingface/diffusers

2) Download the model (~40GB disk):

    huggingface-cli download Lightricks/LTX-Video-0.9.8-13B-distilled

    Fallback (smaller, guaranteed diffusers format, ~10GB VRAM):
        huggingface-cli download Lightricks/LTX-Video   # 2B version

3) Generate a clip:

    python video/animate_still.py --image assets/images/u3/ship.jpg \
        --prompt "Gentle waves ripple across the harbor water; thin clouds drift slowly overhead." \
        --out video/ai_clips/ship-harbor.mp4 --duration 5 --seed 42

    Always --dry-run first (validates prompt safety without the GPU):
        python video/animate_still.py --image ... --prompt ... --out ... --dry-run

4) VRAM notes:
   - 13B distilled in bf16 with CPU offload (default): fits 32GB comfortably
     (~20GB peak). Offload costs some speed; quality is unchanged.
   - --no-offload keeps everything on CUDA: faster, but borderline on 32GB.
     If you OOM, drop back to the default.
   - 2B fallback runs anywhere >=10GB VRAM, slightly softer motion.

5) Expected time per clip (CALIBRATE ON FIRST RUN -- these are estimates):
   - 5s @ 24fps, 704x1248, 8 distilled steps on a 5090: roughly 1-4 minutes.
   - First run also downloads weights; time that separately.

6) The safety contract (enforced by --dry-run AND the AI-CLIP validator gate):
   - Prompts describe AMBIENT MOTION ONLY: water, smoke, clouds, flags,
     fire/flicker, mist, rain, snow, leaves, grass, breeze.
   - NEVER add/remove/replace/transform content, NEVER people. The filter
     rejects those prompts; the validator re-checks every manifest.

7) Copy-paste example prompts (all ambient-only, history-safe):

   ship on water:
     "Gentle waves ripple across the harbor water; the tall ship sways almost
     imperceptibly at anchor; thin clouds drift slowly overhead."

   campfire smoke:
     "Thin smoke rises lazily from the campfire and drifts on a light breeze;
     embers glow and flicker; nearby grass trembles faintly."

   flag waving:
     "The regimental flag ripples and waves in a steady breeze; dust motes
     drift through shafts of light."

   clouds over battlefield:
     "Heavy clouds churn and roll slowly over the distant field; mist drifts
     low across the ground; grass ripples in gusts."

   river current:
     "The river current flows steadily past the landing; reflections shimmer
     and break on the water; leaves drift downstream."

8) After generating: commit the clip (video/ai_clips/*.mp4), record it in the
   manifest's ai_clips section (image / prompt / seed / clip path), and use
   motion.ai_clip_scene("video/ai_clips/<name>.mp4", dur) in the stage BUILDERS.
   The validator's AI-CLIP gate checks: clip committed + prompt on record +
   prompt passes the ambient-only filter.
"""

EXAMPLES = [
    ("ship on water",
     "Gentle waves ripple across the harbor water; the tall ship sways almost "
     "imperceptibly at anchor; thin clouds drift slowly overhead."),
    ("campfire smoke",
     "Thin smoke rises lazily from the campfire and drifts on a light breeze; "
     "embers glow and flicker; nearby grass trembles faintly."),
    ("flag waving",
     "The regimental flag ripples and waves in a steady breeze; dust motes "
     "drift through shafts of light."),
    ("clouds over battlefield",
     "Heavy clouds churn and roll slowly over the distant field; mist drifts "
     "low across the ground; grass ripples in gusts."),
    ("river current",
     "The river current flows steadily past the landing; reflections shimmer "
     "and break on the water; leaves drift downstream."),
]


def build_parser():
    ap = argparse.ArgumentParser(
        description="Local AI stills animation (LTX-Video, no API keys).",
        epilog=RUNBOOK,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--image",
                    help="input still (repo-relative or absolute)")
    ap.add_argument("--prompt",
                    help="ambient-motion description ONLY (filter-enforced)")
    ap.add_argument("--out", help="output MP4 path")
    ap.add_argument("--duration", type=float, default=5,
                    help="clip length in seconds, 3..6 (default 5)")
    ap.add_argument("--seed", type=int, default=None,
                    help="random seed (default: random; log it for the manifest)")
    ap.add_argument("--model", default=MODEL_DEFAULT,
                    help=f"HF model id (default {MODEL_DEFAULT})")
    ap.add_argument("--pipeline", default="auto",
                    choices=["auto", "i2v", "condition"],
                    help="diffusers pipeline flavor (default auto with fallback)")
    ap.add_argument("--width", type=int, default=704,
                    help="output width (snapped to multiple of 32)")
    ap.add_argument("--height", type=int, default=1248,
                    help="output height (snapped to multiple of 32)")
    ap.add_argument("--steps", type=int, default=8,
                    help="inference steps (distilled models: ~8)")
    ap.add_argument("--focus", default=None,
                    help="x,y (0..1) to centre the crop on when the still's aspect differs from the output")
    ap.add_argument("--negative-prompt", default=None,
                    help="override the built-in negative prompt")
    ap.add_argument("--cpu-offload", action="store_true", default=True,
                    help="CPU-offload the pipeline (default on; safe on 32GB)")
    ap.add_argument("--no-offload", dest="cpu_offload", action="store_false",
                    help="keep everything on CUDA (faster, borderline on 32GB)")
    ap.add_argument("--dry-run", action="store_true",
                    help="validate args/prompt/model availability, no GPU work")
    ap.add_argument("--list-examples", action="store_true",
                    help="print the 5 copy-paste ambient prompts and exit")
    return ap


def main(argv=None):
    ap = build_parser()
    args = ap.parse_args(argv)
    if args.list_examples:
        for name, prompt in EXAMPLES:
            print(f"--- {name} ---\n{prompt}\n")
        return 0
    missing = [f"--{f}" for f in ("image", "prompt", "out")
               if not getattr(args, f)]
    if missing:
        ap.error(f"the following arguments are required: {', '.join(missing)}")
    if args.dry_run:
        return cmd_dry_run(args)
    return cmd_generate(args)


if __name__ == "__main__":
    sys.exit(main())
