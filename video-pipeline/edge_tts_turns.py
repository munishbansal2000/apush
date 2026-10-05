#!/usr/bin/env python3
"""Test-voice TTS: script turns -> per-turn MP3s via Microsoft Edge TTS.

Fish voices are the final dialogue; Edge neural voices are free and fast
enough to time the pipeline against (same turn boundaries, same mix
recipe, different timbre). Same turns JSON -> same file layout
(t00.mp3, ...), skipped when already present (incremental).

Usage:
    python edge_tts_turns.py <script_turns.json> <tts_dir>
        [--voices Maya=en-US-AriaNeural Marcus=en-US-GuyNeural]
        [--rate +0%] [--force]

script_turns.json: [{"speaker": "Maya", "text": "..."}, ...]
Unknown speakers fail fast (no silent default voice).
"""
import asyncio
import json
import os
import sys

DEFAULT_VOICES = {
    "Maya": "en-US-AriaNeural",
    "Marcus": "en-US-GuyNeural",
}


def turn_filename(i):
    """tNN.mp3, matching stages/timing.py's t00-t99 filter."""
    if not 0 <= i <= 99:
        raise ValueError(f"turn index {i} out of t00-t99 range")
    return "t%02d.mp3" % i


def voice_for(speaker, voices):
    try:
        return voices[speaker]
    except KeyError:
        raise ValueError(
            f"no voice for speaker {speaker!r} "
            f"(known: {', '.join(sorted(voices))})") from None


async def _synth_edge(text, voice, out, rate):
    import edge_tts  # deferred: only needed for real synthesis
    await edge_tts.Communicate(text, voice, rate=rate).save(out)


def synthesize_turns(turns, tts_dir, voices=None, rate="+0%", force=False,
                     synth=None):
    """Render every turn to tts_dir/tNN.mp3. Returns [paths].

    synth(text, voice, out, rate) overrides the Edge call (tests stub it).
    Existing files >1KB are kept unless force=True.
    """
    voices = dict(DEFAULT_VOICES, **(voices or {}))
    os.makedirs(tts_dir, exist_ok=True)
    synth = synth or (lambda t, v, o, r: asyncio.run(
        _synth_edge(t, v, o, r)))
    paths = []
    for i, turn in enumerate(turns):
        speaker = turn["speaker"]
        voice = voice_for(speaker, voices)
        out = os.path.join(tts_dir, turn_filename(i))
        if (not force and os.path.exists(out)
                and os.path.getsize(out) > 1000):
            print(f"edge_tts: keep t{i:02d} ({speaker})", flush=True)
        else:
            synth(turn["text"], voice, out, rate)
            print(f"edge_tts: t{i:02d} ({speaker}, {voice})", flush=True)
        paths.append(out)
    return paths


def main(argv):
    args = list(argv)
    force = "--force" in args
    args = [a for a in args if a != "--force"]
    rate = "+0%"
    if "--rate" in args:
        i = args.index("--rate")
        if i + 1 >= len(args):
            sys.exit("--rate needs a value (e.g. +10%)")
        rate = args[i + 1]
        del args[i:i + 2]
    voices = {}
    if "--voices" in args:
        i = args.index("--voices")
        del args[i]
        while i < len(args) and not args[i].startswith("--"):
            spec = args.pop(i)
            spk, _, voice = spec.partition("=")
            if not voice:
                sys.exit(f"bad --voices entry {spec!r} (want Spk=Voice)")
            voices[spk] = voice
    if len(args) != 2:
        sys.exit("usage: edge_tts_turns.py <script_turns.json> <tts_dir> "
                 "[--voices Spk=V ...] [--rate +0%] [--force]")
    turns_path, tts_dir = args
    with open(turns_path, encoding="utf-8") as f:
        turns = json.load(f)
    synthesize_turns(turns, tts_dir, voices=voices, rate=rate, force=force)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
