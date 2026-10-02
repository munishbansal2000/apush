#!/usr/bin/env python3
"""Batch-generate narration MP3s for videos 6-53.

Reads manifests/videoN.json + scripts/videoN/<stage>.txt, synthesizes any
missing audio/videoN/<mp3>. Resumable: skips MP3s that already exist and probe
valid. Logs failures to batch_tts_failures.log.

Run: python3 batch_tts.py   (takes ~1h for the full set; safe to re-run)
"""
import glob
import json
import os
import re
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
TTS = "/opt/hatch/bin/tts"
VOICE = "avocado_v2:MAI_01"
FAIL_LOG = os.path.join(HERE, "batch_tts_failures.log")


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-300:])


def duration(path):
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", path], capture_output=True, text=True)
        return float(r.stdout.strip())
    except Exception:
        return 0


def synth(text, out):
    run([TTS, "speak", "--voice", VOICE, "--speed", "92",
         "--output", out, "--text", text])


def split_sentences(text):
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p for p in parts if p]


def synth_robust(text, out, words):
    """Synthesize with retries; fall back to per-sentence synthesis + concat."""
    floor = words / 4.5
    for attempt in range(4):
        try:
            synth(text, out)
            if duration(out) >= floor:
                return True
        except Exception:
            pass
        time.sleep(3)
    # fallback: sentence by sentence
    sents = split_sentences(text)
    if len(sents) < 2:
        return False
    parts = []
    try:
        for i, s in enumerate(sents):
            p = out + f".part{i}.mp3"
            ok = False
            for _ in range(2):
                try:
                    synth(s, p)
                    if duration(p) >= len(s.split()) / 5.0:
                        ok = True
                        break
                except Exception:
                    pass
                time.sleep(2)
            if not ok:
                return False
            parts.append(p)
        ins, fc = [], "".join(f"[{i}:a]" for i in range(len(parts)))
        for p in parts:
            ins += ["-i", p]
        run(["ffmpeg", "-y", "-v", "error"] + ins +
            ["-filter_complex", fc + f"concat=n={len(parts)}:v=0:a=1[out]",
             "-map", "[out]", "-c:a", "libmp3lame", out])
        return duration(out) >= floor
    finally:
        for p in parts:
            if os.path.exists(p):
                os.remove(p)


def main():
    only = sys.argv[1:]  # optional: video names to limit to
    jobs = []
    for path in sorted(glob.glob(os.path.join(HERE, "manifests", "video*.json"))):
        m = json.load(open(path))
        if only and m["name"] not in only:
            continue
        n = int(m["name"][5:])
        if n < 6:
            continue
        adir = os.path.join(HERE, "audio", m["name"])
        os.makedirs(adir, exist_ok=True)
        sdir = os.path.join(HERE, "scripts", m["name"])
        for stage, spec in m["plan"]:
            mp3 = spec["mp3"] if isinstance(spec, dict) else spec
            out = os.path.join(adir, mp3)
            txt = os.path.join(sdir, f"{stage}.txt")
            jobs.append((m["name"], stage, txt, out))
    print(f"{len(jobs)} clips total", flush=True)
    done, failed = 0, []
    for name, stage, txt, out in jobs:
        if duration(out) > 0:
            done += 1
            continue
        if not os.path.exists(txt):
            failed.append((name, stage, "missing script"))
            continue
        text = open(txt).read().strip()
        words = len(text.split())
        ok = synth_robust(text, out, words)
        if ok:
            done += 1
        else:
            failed.append((name, stage, "synthesis failed"))
            print(f"FAIL {name}/{stage}", flush=True)
        if done % 25 == 0:
            print(f"progress: {done}/{len(jobs)}", flush=True)
    print(f"done: {done}/{len(jobs)} ok, {len(failed)} failed", flush=True)
    if failed:
        with open(FAIL_LOG, "w") as f:
            for name, stage, why in failed:
                f.write(f"{name}/{stage}: {why}\n")
        print(f"failures logged to {FAIL_LOG}", flush=True)


if __name__ == "__main__":
    main()
