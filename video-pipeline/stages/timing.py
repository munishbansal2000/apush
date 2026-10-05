"""Stage: timing.

Deterministic turn timings computed from the actual turn MP3 durations using
the exact build_format.py assembly recipe (offset 1.8s, 0.6s gap between
turns). Plus per-turn speech-onset detection: the first non-silent instant in
each turn's MP3, so visuals can key off the voice starting, not the file
starting (answers were appearing ~1s before the speaker).

Writes: <episode>/work/timings.json
"""
import json
import os
import re
import subprocess


def sh_out(cmd):
    return subprocess.check_output(cmd, text=True)


def mp3_duration(path):
    return float(sh_out(["ffprobe", "-v", "error", "-show_entries",
                         "format=duration", "-of", "csv=p=0", path]))


def speech_onset(path, noise_db=-40, min_dur=0.25):
    """Seconds from file start to first non-silent audio.

    Uses silencedetect: the first silence_end after t=0 is the onset. If the
    file starts with speech (no leading silence), onset is 0. Returns 0.0 on
    any parse failure (fail-open to old behavior, never blocks the build).
    """
    try:
        r = subprocess.run(
            ["ffmpeg", "-v", "info", "-i", path, "-af",
             f"silencedetect=noise={noise_db}dB:d={min_dur}",
             "-f", "null", "-"],
            capture_output=True, text=True, timeout=120)
        out = r.stderr
        # leading silence looks like: silence_start: 0 ... silence_end: 0.83
        m = re.search(r"silence_end:\s*([\d.]+)", out)
        if m:
            return round(float(m.group(1)), 3)
        return 0.0
    except Exception:
        return 0.0


def build(tts_dir, offset=1.8, gap=0.6, tail=4.5):
    files = sorted(f for f in os.listdir(tts_dir)
                   if f.startswith("t") and f.endswith(".mp3")
                   and len(f) == 7 and f[1:3].isdigit())
    if not files:
        raise RuntimeError(f"no turn MP3s found in {tts_dir}")
    turns = []
    t = offset
    total_dur = 0.0
    for i, f in enumerate(files):
        p = os.path.join(tts_dir, f)
        d = mp3_duration(p)
        onset = speech_onset(p)
        start = t
        end = t + d
        turns.append({"turn": f"t{i:02d}", "file": f,
                      "start": round(start, 3), "end": round(end, 3),
                      "dur": round(d, 3), "onset": onset})
        total_dur += d
        t = end + gap
    total = offset + total_dur + gap * len(files) + tail
    # The mix recipe (offset/gap/tail) must round-trip through this
    # file: refit + the compiler validator read it back to rebuild the
    # same model. A missing tail silently drops 4.5s of outro (seen live).
    return {"gap": gap, "offset": offset, "tail": tail, "turns": turns,
            "dialogue_end": round(t - gap, 3),
            "computed_total": round(total, 3)}


def run(ep_dir, cfg):
    tts_dir = os.path.normpath(os.path.join(ep_dir, cfg["tts_dir"]))
    data = build(tts_dir, offset=cfg.get("offset", 1.8),
                 gap=cfg.get("gap", 0.6), tail=cfg.get("tail", 4.5))
    out = os.path.join(ep_dir, "work", "timings.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1)
    n = len(data["turns"])
    late = sum(1 for x in data["turns"] if x["onset"] > 0.4)
    print(f"timing: {n} turns, computed total {data['computed_total']:.1f}s, "
          f"{late} turns with onset > 0.4s", flush=True)
    return out
