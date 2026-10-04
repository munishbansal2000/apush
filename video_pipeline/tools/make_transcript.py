#!/usr/bin/env python3
"""Generate lesson transcripts from a manifest.

Produces two artifacts per lesson:
- <lesson_id>-transcript.txt : plain text, speaker-labeled, with scene timestamps
- <lesson_id>-transcript.srt : scene-level SRT (timing from the manifest's
  scene order and estimated durations — NOT word-timed; word-timed captions
  require TTS integration)

Usage: python tools/make_transcript.py --manifest <path> --out-dir <dir>
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

TAG_RE = re.compile(r"\[(?:beat|pause(?::[\d.]+)?|emphasis|slow|fast|solemn|fierce(?::[\d.]+)?|wry|awed|whisper|urgent|es)\]")
DATE_RE = re.compile(r"\[date:(\d+)\]")
VOICE_RE = re.compile(r"\[VOICE:([^\]]+)\]")


def clean_narration(text: str) -> tuple[str, list[tuple[str, str]]]:
    """Return (plain_text, [(voice, segment)]). Strips direction tags."""
    segments: list[tuple[str, str]] = []
    current_voice = "HOST"
    pos = 0
    for m in VOICE_RE.finditer(text):
        chunk = text[pos:m.start()]
        chunk = DATE_RE.sub(r"\1", chunk)
        chunk = TAG_RE.sub("", chunk).strip()
        chunk = re.sub(r"\[/[A-Za-z]+\]", "", chunk)
        if chunk:
            segments.append((current_voice, chunk))
        current_voice = m.group(1).upper()
        pos = m.end()
    chunk = text[pos:]
    chunk = DATE_RE.sub(r"\1", chunk)
    chunk = TAG_RE.sub("", chunk).strip()
    chunk = re.sub(r"\[/[A-Za-z]+\]", "", chunk)
    if chunk:
        segments.append((current_voice, chunk))
    plain = " ".join(seg for _, seg in segments)
    plain = re.sub(r"\s+", " ", plain).strip()
    return plain, segments


def srt_time(sec: float) -> str:
    h, rem = divmod(int(sec), 3600)
    m, s = divmod(rem, 60)
    ms = int((sec - int(sec)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--out-dir", required=True)
    args = ap.parse_args(argv)

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    lesson_id = manifest.get("lesson_id", "lesson")
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    scenes = manifest.get("scenes", [])
    # Estimate timing: ~150 wpm + per-scene base; use manifest min_duration if present
    t = 0.0
    entries: list[dict] = []
    for s in scenes:
        narration = (s.get("narration") or {}).get("text", "")
        if not narration.strip():
            continue
        plain, segments = clean_narration(narration)
        words = len(plain.split())
        dur = max(s.get("min_duration", 0), words / 150 * 60 + 1.0)
        entries.append({
            "id": s.get("id", "?"),
            "start": t,
            "end": t + dur,
            "segments": segments,
            "plain": plain,
        })
        t += dur

    # Plain-text transcript
    txt_lines = [f"# Transcript — {manifest.get('title', lesson_id)}", ""]
    for e in entries:
        txt_lines.append(f"[{srt_time(e['start'])[:5]}] --- {e['id']} ---")
        for voice, seg in e["segments"]:
            txt_lines.append(f"{voice}: {seg}")
        txt_lines.append("")
    (out_dir / f"{lesson_id}-transcript.txt").write_text("\n".join(txt_lines), encoding="utf-8")

    # Scene-level SRT
    srt_lines = []
    for i, e in enumerate(entries, 1):
        srt_lines.append(str(i))
        srt_lines.append(f"{srt_time(e['start'])} --> {srt_time(e['end'])}")
        for voice, seg in e["segments"]:
            srt_lines.append(f"{voice}: {seg}")
        srt_lines.append("")
    (out_dir / f"{lesson_id}-transcript.srt").write_text("\n".join(srt_lines), encoding="utf-8")

    print(f"wrote {lesson_id}-transcript.txt and {lesson_id}-transcript.srt "
          f"({len(entries)} scenes, ~{t:.0f}s estimated)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
