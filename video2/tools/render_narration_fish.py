"""Render Cuba v4 narration with fish-speech on the 5090.

Fish clones the speaking STYLE (energy, pitch movement, pacing) from the
reference audio, not just the voice. Pick an energetic reference — same fire
as a top explainer channel, but an original voice, never a real person's.

Usage (from the apush repo root, on the 5090):
    python video/render_narration_fish.py ^
        --reference ref/narrator_energetic.wav ^
        --reference-text ref/narrator_energetic.txt ^
        --quote-reference ref/kennedy_voice.wav ^
        --quote-reference-text ref/kennedy_voice.txt

Inputs:
    video/cuba_narration.json   narration segments (exported from pilot_cuba.py)
Outputs:
    video/audio/cuba/<key>.mp3  same filenames the assembler expects
    (beat1b parts are stitched into one mp3, narrator -> Kennedy -> narrator)

Requires: fish-speech installed with torch (GPU). Tested against the
fish-speech CLI: `python -m fish_speech.inference`.
If your checkout uses a different entry point, adjust run_fish() below.
"""
import argparse, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NARRATION = os.path.join(HERE, "cuba_narration.json")
AUDIO = os.path.join(HERE, "audio", "cuba")


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


def to_mp3(wav, mp3):
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", wav, "-c:a", "libmp3lame",
         "-b:a", "128k", mp3],
        check=True)
    os.remove(wav)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reference", required=True,
                    help="energetic narrator reference audio (wav/mp3, ~10-30s)")
    ap.add_argument("--reference-text", required=True,
                    help="transcript of the narrator reference audio")
    ap.add_argument("--quote-reference", required=True,
                    help="reference audio for Kennedy's quote voice")
    ap.add_argument("--quote-reference-text", required=True,
                    help="transcript of the quote reference audio")
    args = ap.parse_args()

    with open(args.reference_text, encoding="utf-8") as f:
        ref_text = f.read().strip()
    with open(args.quote_reference_text, encoding="utf-8") as f:
        quote_ref_text = f.read().strip()
    with open(NARRATION, encoding="utf-8") as f:
        segs = json.load(f)

    os.makedirs(AUDIO, exist_ok=True)

    # group segments by key (beat1b has 3 parts -> 1 file)
    order, groups = [], {}
    for s in segs:
        if s["key"] not in groups:
            groups[s["key"]] = []
            order.append(s["key"])
        groups[s["key"]].append(s)

    for key in order:
        parts = groups[key]
        out_mp3 = os.path.join(AUDIO, f"{key}.mp3")
        print(f"[{key}] {len(parts)} part(s) -> {out_mp3}", flush=True)
        wavs = []
        for i, s in enumerate(parts):
            wav = os.path.join(AUDIO, f"_{key}_p{i}.wav")
            if s["voice"] == "kennedy":
                run_fish(s["text"], wav, args.quote_reference, quote_ref_text)
            else:
                run_fish(s["text"], wav, args.reference, ref_text)
            wavs.append(wav)
        if len(wavs) == 1:
            to_mp3(wavs[0], out_mp3)
        else:
            # stitch parts with ffmpeg concat filter (re-encode, robust)
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
    print("done. Commit video/audio/cuba/*.mp3 and push.")


if __name__ == "__main__":
    main()
