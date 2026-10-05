#!/usr/bin/env python3
"""Portable mix recipe: per-turn MP3s -> mixed dialogue MP3.

Implements the house recipe stages/timing.py models (silence for the
intro offset, a silence gap after every turn, silence tail):

    mix = offset + t00 + gap + t01 + gap + ... + tNN + gap + tail

The layout is exact by construction (concat demuxer over decoded audio
plus generated silence, one mp3 encode). Prints the model total and
refuses to finish if the mixed file drifts from it (mp3 encode padding
lives inside the 0.1s tolerance; a wav-first chain would be sample-exact
and is the documented upgrade path for final delivery).

Usage:
    python mix_turns.py <tts_dir> <out.mp3>
        [--offset 1.8] [--gap 0.6] [--tail 4.5]

Turn files are t00.mp3, t01.mp3, ... (same filter as the timing stage).
"""
import os
import subprocess
import sys
import tempfile

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from stages.timing import mp3_duration  # noqa: E402


def turn_files(tts_dir):
    """tNN.mp3 files in turn order (same filter as stages/timing.py)."""
    files = sorted(f for f in os.listdir(tts_dir)
                   if f.startswith("t") and f.endswith(".mp3")
                   and len(f) == 7 and f[1:3].isdigit())
    if not files:
        raise RuntimeError(f"no turn MP3s found in {tts_dir}")
    return [os.path.join(tts_dir, f) for f in files]


def _silence(dur, out):
    r = subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "lavfi",
         "-i", "anullsrc=r=44100:cl=stereo", "-t", str(dur), out],
        capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"silence gen failed: {r.stderr[-300:]}")
    return out


def mix_model_total(durs, offset, gap, tail):
    return offset + sum(durs) + gap * len(durs) + tail


def _to_wav(src, out):
    # Normalize to the silence format (44100Hz stereo): the concat
    # demuxer takes the FIRST segment's codec/params and mis-decodes
    # anything else (seen live: mp3 segments decoded as PCM, silently
    # dropped, rc stayed 0). Uniform wav in, one mp3 encode out.
    r = subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", src,
         "-ar", "44100", "-ac", "2", out],
        capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"decode failed for {src}: {r.stderr[-300:]}")
    return out


def mix(tts_dir, out_mp3, offset=1.8, gap=0.6, tail=4.5, tol=0.1):
    files = turn_files(tts_dir)
    durs = [mp3_duration(p) for p in files]
    model = mix_model_total(durs, offset, gap, tail)
    with tempfile.TemporaryDirectory(prefix="mixturns") as tmp:
        parts = []
        if offset > 0:
            parts.append(_silence(offset, os.path.join(tmp, "offset.wav")))
        for i, p in enumerate(files):
            parts.append(_to_wav(p, os.path.join(tmp, f"turn{i:02d}.wav")))
            if gap > 0:
                parts.append(_silence(gap, os.path.join(
                    tmp, f"gap{i:02d}.wav")))
        if tail > 0:
            parts.append(_silence(tail, os.path.join(tmp, "tail.wav")))
        lst = os.path.join(tmp, "list.txt")
        with open(lst, "w", encoding="utf-8") as f:
            for p in parts:
                f.write("file '%s'\n" % os.path.abspath(p).replace("'", "'\\''"))
        r = subprocess.run(
            ["ffmpeg", "-v", "warning", "-y", "-f", "concat", "-safe", "0",
             "-i", lst, "-c:a", "libmp3lame", "-q:a", "3", out_mp3],
            capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError(f"mix failed: {r.stderr[-400:]}")
        if "error" in r.stderr.lower():
            raise RuntimeError(
                f"mix demuxer reported errors: {r.stderr[-400:]}")
    got = mp3_duration(out_mp3)
    print(f"mix: {len(files)} turns -> {out_mp3} "
          f"(model {model:.2f}s, mixed {got:.2f}s)", flush=True)
    if abs(got - model) > tol:
        raise RuntimeError(
            f"mix drifted: {got:.2f}s vs model {model:.2f}s "
            f"(tol {tol}s)")
    return out_mp3


def main(argv):
    args = list(argv)
    offset, gap, tail = 1.8, 0.6, 4.5
    for flag, slot in (("--offset", 0), ("--gap", 1), ("--tail", 2)):
        if flag in args:
            i = args.index(flag)
            if i + 1 >= len(args):
                sys.exit(f"{flag} needs a value")
            try:
                val = float(args[i + 1])
            except ValueError:
                sys.exit(f"{flag} needs a number, got {args[i + 1]!r}")
            if slot == 0:
                offset = val
            elif slot == 1:
                gap = val
            else:
                tail = val
            del args[i:i + 2]
    if len(args) != 2:
        sys.exit("usage: mix_turns.py <tts_dir> <out.mp3> "
                 "[--offset 1.8] [--gap 0.6] [--tail 4.5]")
    mix(args[0], args[1], offset=offset, gap=gap, tail=tail)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
