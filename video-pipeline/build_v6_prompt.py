#!/usr/bin/env python3
"""Assemble a v6 director prompt from measured episode data.

The director (LLM) does the semantic work — finding topic shifts. This tool
does the mechanical work: it gathers script turns, measured turn durations,
measured word times, and the asset manifest into the canonical prompt
(docs/director-prompt-v10.txt), so prompts are never hand-assembled (and
word times never hand-copied, estimated, or left stale).

Usage:
    python build_v6_prompt.py <episode> [--turns A-B] [--out path]
        [--prompt docs/director-prompt-v10.txt] [--topics topics.txt]

--turns slices one act (default: all turns). --topics appends an explicit
topic map (same "Turn N has TWO topics..." prose as the canonical example)
when the human wants training wheels; by default the director derives
topics from WORD TIMES itself.

Reads (all measured, never estimated):
    episodes/<ep>/script_turns.json
    episodes/<ep>/work/timings.json
    episodes/<ep>/work/word_times.json
    episodes/<ep>/images.json ({"images": {...}}) or --manifest path,
        else the images/ directory listing.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
IMG_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp")


def _load_manifest(ep_dir, override=None):
    if override:
        with open(override, encoding="utf-8") as f:
            data = json.load(f)
    else:
        for name in ("images.json", "manifest.json"):
            p = os.path.join(ep_dir, name)
            if os.path.exists(p):
                with open(p, encoding="utf-8") as f:
                    data = json.load(f)
                break
        else:
            data = None
    if data is None:
        # No manifest file: deterministic directory listing instead.
        img_dir = os.path.join(ep_dir, "images")
        if not os.path.isdir(img_dir):
            sys.exit(f"no manifest and no images/ dir in {ep_dir}")
        return [f"images/{n} [?]: {n}"
                for n in sorted(os.listdir(img_dir))
                if n.lower().endswith(IMG_EXTS)]
    if isinstance(data, dict) and isinstance(data.get("images"), dict):
        return [f"{v.get('file')} [{v.get('kind', '?')}]: "
                f"{v.get('credit', v.get('description', ''))}"
                for _, v in sorted(data["images"].items())]
    if isinstance(data, list):
        return [f"{v.get('path')} [{v.get('kind', '?')}]: "
                f"{v.get('description', '')}" for v in data]
    sys.exit(f"unrecognized manifest shape in {ep_dir}")


def build(ep_dir, turns_slice=None, topics_text=None,
          prompt_path=None, manifest_path=None):
    episode = os.path.basename(os.path.normpath(ep_dir))
    with open(os.path.join(ep_dir, "script_turns.json"),
              encoding="utf-8") as f:
        turns = json.load(f)
    try:
        with open(os.path.join(ep_dir, "work", "timings.json"),
                  encoding="utf-8") as f:
            timings = json.load(f)
    except OSError:
        sys.exit(f"no work/timings.json for {episode}; run the timing "
                 f"stage first (durations are measured, never estimated)")
    try:
        with open(os.path.join(ep_dir, "work", "word_times.json"),
                  encoding="utf-8") as f:
            word_times = json.load(f)
    except OSError:
        sys.exit(f"no work/word_times.json for {episode}; run the "
                 f"wordtiming stage first")
    if turns_slice:
        lo, hi = turns_slice
        turns = turns[lo:hi + 1]
    else:
        lo = 0
    dur_by_file = {}
    for t in timings.get("turns", []):
        dur_by_file[t.get("file", "")] = t.get("dur")

    prompt_path = (prompt_path or os.path.join(ROOT, os.pardir, "docs",
                                               "director-prompt-v6.txt"))
    with open(prompt_path, encoding="utf-8") as f:
        base = f.read()
    cut = base.find("\nEPISODE:")
    if cut == -1:
        sys.exit(f"{prompt_path} has no EPISODE: example block")
    out = [base[:cut].rstrip() + "\n"]

    out.append(f"\nEPISODE: {episode}\n")
    out.append("\nSCRIPT TURNS (speaker, duration_sec, text):\n")
    for k, t in enumerate(turns):
        i = lo + k
        if t.get("speaker") == "pause":
            out.append(f"[{i:02d}] pause ({t.get('duration_sec', 0)}s): "
                       f"[silence]\n")
            continue
        fname = "t%02d.mp3" % i
        dur = dur_by_file.get(fname, "?")
        out.append(f"[{i:02d}] {t['speaker']} ({dur}s): {t['text']}\n")
        words = word_times.get("t%02d" % i, [])
        if words:
            seq = " ".join(f"{w['word']}@{w['start']}s" for w in words)
            out.append(f"  WORD TIMES: {seq}\n")
    out.append("\nASSET MANIFEST:\n")
    for line in _load_manifest(ep_dir, manifest_path):
        out.append(line + "\n")
    out.append("\nWrite the scene plan JSON now. Remember TOPIC ALIGNMENT: "
               "visuals appear WHEN their topic is spoken.\n")
    if topics_text:
        out.append(topics_text if topics_text.endswith("\n")
                   else topics_text + "\n")
    return "".join(out)


def main(argv):
    args = list(argv)
    if not args or "-h" in args or "--help" in args:
        sys.exit(__doc__)
    episode = args.pop(0)
    turns_slice, out_path, prompt_path = None, None, None
    manifest_path, topics_text = None, None
    while args:
        a = args.pop(0)
        if a == "--turns" and args:
            span = args.pop(0)
            lo, _, hi = span.partition("-")
            turns_slice = (int(lo), int(hi))
        elif a == "--out" and args:
            out_path = args.pop(0)
        elif a == "--prompt" and args:
            prompt_path = args.pop(0)
        elif a == "--manifest" and args:
            manifest_path = args.pop(0)
        elif a == "--topics" and args:
            with open(args.pop(0), encoding="utf-8") as f:
                topics_text = f.read()
        else:
            sys.exit(f"bad arg {a!r}\n{__doc__}")
    ep_dir = os.path.join(ROOT, "episodes", episode)
    text = build(ep_dir, turns_slice, topics_text, prompt_path,
                 manifest_path)
    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"prompt -> {out_path} ({len(text)} chars)")
    else:
        print(text)


if __name__ == "__main__":
    main(sys.argv[1:])
