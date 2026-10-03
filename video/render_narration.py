#!/usr/bin/env python3
"""Render APUSH explainer-video narration with fish-speech (5090, GPU torch).

Generalized successor to video/render_narration_fish.py (which is hardcoded
to the Cuba pilot's paths and a single quote voice). Same fish-speech CLI
mechanics; adds:
  --narration PATH        narration JSON: [{key, voice, text}, ...]
  --audio-dir DIR         output dir; one <key>.mp3 per key
  --voice NAME=audio:text repeatable; registers a quote voice (e.g.
                          --voice columbus=ref/columbus.wav:ref/columbus.txt).
                          voice "narrator" (or anything unregistered) routes
                          to --reference/--reference-text.
  pause-tag handling      [pause:N], [short pause]/[pause]/[long pause]/[beat]
                          are split out before TTS and stitched back as
                          silence (anullsrc), exactly like the multi-part key
                          stitching. Direction tags [slow]/[fast]/[emphasis]/
                          [TIP]...[/TIP]/[MEMORIZE] are stripped (no parser
                          support yet); they never reach the TTS engine.

Fish clones the speaking STYLE (energy, pitch movement, pacing) from the
reference audio, not just the voice. Pick an energetic reference -- same
fire as a top explainer channel, but an original voice, never a real
person's. Reference: ~10-30s WAV + its EXACT transcript.

Usage (from the apush repo root, on the 5090):
    python video/render_narration.py ^
        --narration video/samples/vid-u1-01/narration.json ^
        --audio-dir video/audio/vid-u1-01 ^
        --reference ref/narrator_energetic.wav ^
        --reference-text ref/narrator_energetic.txt ^
        --voice columbus=ref/columbus.wav:ref/columbus.txt ^
        --voice diaz=ref/diaz.wav:ref/diaz.txt ^
        --voice cortes=ref/cortes.wav:ref/cortes.txt

Outputs:
    <audio-dir>/<key>.mp3   (multi-part keys stitched narrator->quote->narrator)

Requires: fish-speech installed with torch (GPU). Tested against the
fish-speech CLI: `python -m fish_speech.inference`.
If your checkout uses a different entry point, adjust run_fish() below.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile

# pause-tag convention (PLAYBOOK section 1, canonical):
#   [pause:N]      N seconds of silence
#   [short pause]  0.45s, [pause] 0.75s, [long pause] 1.5s, [beat] 0.4s
PAUSE_RE = re.compile(r"\[(?:pause:([\d.]+)|short pause|pause|long pause|beat)\]")
PAUSE_ALIAS = {"short pause": 0.45, "pause": 0.75, "long pause": 1.5,
               "beat": 0.4}
# direction tags with no TTS support yet: strip the TAGS, never the speech.
# [TIP]...[/TIP] and [MEMORIZE] inner text IS spoken -- the tags only cue
# the visual sting / memory-cue card, so the words must reach the TTS engine.
STRIP_RES = [
    re.compile(r"\[/?TIP\]"),
    re.compile(r"\[(?:slow|fast|emphasis|MEMORIZE)\]"),
]


def split_pauses(text):
    """Split narration text into (kind, payload) chunks.

    kind "say" -> payload is speakable text; kind "silence" -> payload is
    seconds (float). Direction tags are stripped first.
    """
    for rx in STRIP_RES:
        text = rx.sub(" ", text)
    chunks, pos = [], 0
    for m in PAUSE_RE.finditer(text):
        before = text[pos:m.start()].strip()
        if before:
            chunks.append(("say", before))
        secs = float(m.group(1)) if m.group(1) else PAUSE_ALIAS[
            m.group(0)[1:-1]]
        chunks.append(("silence", secs))
        pos = m.end()
    tail = text[pos:].strip()
    if tail:
        chunks.append(("say", tail))
    return [c for c in chunks if c[0] == "silence" or c[1].strip()]


def run_fish(text, out_wav, ref_audio, ref_text):
    """Synthesize one segment with fish-speech CLI."""
    cmd = [
        sys.executable, "-m", "fish_speech.inference",
        "--text", text,
        "--reference-audio", ref_audio,
        "--reference-text", ref_text,
        "--output", out_wav,
    ]
    print("  fish:", text[:60], "...", flush=True)
    subprocess.run(cmd, check=True)


def silence_wav(seconds, out_wav):
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
         "-i", f"anullsrc=r=44100:cl=stereo", "-t", f"{seconds:.3f}",
         out_wav],
        check=True)


def to_mp3(wav, mp3):
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", wav, "-c:a", "libmp3lame",
         "-b:a", "128k", mp3],
        check=True)
    os.remove(wav)


def parse_voice_spec(spec):
    name, rest = spec.split("=", 1)
    audio, text = rest.split(":", 1)
    return name.strip(), audio.strip(), text.strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--narration", required=True,
                    help="narration JSON: list of {key, voice, text}")
    ap.add_argument("--audio-dir", required=True,
                    help="output dir for <key>.mp3 files")
    ap.add_argument("--reference", required=True,
                    help="energetic narrator reference audio (wav/mp3, ~10-30s)")
    ap.add_argument("--reference-text", required=True,
                    help="transcript of the narrator reference audio")
    ap.add_argument("--voice", action="append", default=[],
                    help="repeatable: NAME=ref_audio:ref_text for a quote voice")
    args = ap.parse_args()

    voices = {}
    for spec in args.voice:
        name, audio, text = parse_voice_spec(spec)
        with open(text, encoding="utf-8") as f:
            ref_text = f.read().strip()
        voices[name] = (audio, ref_text)

    with open(args.reference_text, encoding="utf-8") as f:
        narrator_text = f.read().strip()
    with open(args.narration, encoding="utf-8") as f:
        segs = json.load(f)

    os.makedirs(args.audio_dir, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="apushnarr_")

    # group segments by key (multi-voice keys stitch into one mp3)
    order, groups = [], {}
    for s in segs:
        if s["key"] not in groups:
            groups[s["key"]] = []
            order.append(s["key"])
        groups[s["key"]].append(s)

    for key in order:
        parts = groups[key]
        out_mp3 = os.path.join(args.audio_dir, f"{key}.mp3")
        print(f"[{key}] {len(parts)} segment(s) -> {out_mp3}", flush=True)
        wavs = []
        for i, s in enumerate(parts):
            voice = s.get("voice", "narrator")
            ref_audio, ref_text = voices.get(voice,
                                             (args.reference, narrator_text))
            for j, (kind, payload) in enumerate(split_pauses(s["text"])):
                wav = os.path.join(tmp, f"_{key}_p{i}c{j}.wav")
                if kind == "silence":
                    silence_wav(payload, wav)
                else:
                    run_fish(payload, wav, ref_audio, ref_text)
                wavs.append(wav)
        if len(wavs) == 1:
            to_mp3(wavs[0], out_mp3)
        else:
            inputs = []
            for w in wavs:
                inputs += ["-i", w]
            filt = "".join(f"[{i}:a]" for i in range(len(wavs)))
            filt += f"concat=n={len(wavs)}:v=0:a=1[a]"
            subprocess.run(
                ["ffmpeg", "-y", "-v", "error"] + inputs +
                ["-filter_complex", filt, "-map", "[a]",
                 "-c:a", "libmp3lame", "-b:a", "128k", out_mp3],
                check=True)
            for w in wavs:
                os.remove(w)
    try:
        os.rmdir(tmp)
    except OSError:
        pass
    print("done. Commit the mp3s and push.")


if __name__ == "__main__":
    main()
