#!/usr/bin/env python3
"""remix_interview_pack1.py — remix the flagship u3-l3 interview with pack-v1 music.

Replaces the placeholder mix (kizenkov/papulina/absounds) with:
  P1 intro sting @ 0.18 (fade out as dialogue enters)
  P2 chapter stings @ 0.16 at two scripted beats
  P6 warm-neutral bed, ducked under dialogue (trial bed ear-test material)
  P5 outro sting @ 0.16

No Fish re-render: works from the cached dialogue_raw.mp3 + turn timings.
Usage: python3 remix_interview_pack1.py
Output: video_pipeline/examples/audio-formats/interview/u3-l3-INTERVIEW-pack1.mp3
"""
import os
import re
import subprocess
import sys

import numpy as np

APUSH = "/home/hatch/workspace/apush"
IV = "/home/hatch/workspace/your_files/tts-scripts/fishperf/IV"
PACK = f"{APUSH}/video_pipeline/music/pack-v1"
OUTDIR = f"{APUSH}/video_pipeline/examples/audio-formats/interview"
SCRIPT = f"{OUTDIR}/u3-l3-INTERVIEW.txt"
SR = 44100


def sh(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-400:])


def probe_dur(path):
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path], text=True))


def load_wav(path):
    import wave
    with wave.open(path, "rb") as w:
        n = w.getnframes()
        return (np.frombuffer(w.readframes(n), dtype=np.int16)
                .reshape(-1, 2).astype(np.float64) / 32768.0)


def save_wav(path, data):
    import wave
    data = np.clip(data, -1.0, 1.0)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((data * 32767.0).astype(np.int16).tobytes())


def place(src, filt=""):
    tmp = "/tmp/remix_n.wav"
    args = ["ffmpeg", "-v", "error", "-y", "-i", src]
    if filt:
        args += ["-filter_complex",
                 f"[0:a]aformat=sample_rates=44100:channel_layouts=stereo{filt}[e]",
                 "-map", "[e]"]
    else:
        args += ["-ar", "44100", "-ac", "2"]
    sh(args + [tmp])
    return load_wav(tmp)


# --- turn timings from cached turn files ---
turns = sorted(f for f in os.listdir(IV) if re.fullmatch(r"t\d+\.mp3", f))
n = len(turns)
durs = [probe_dur(os.path.join(IV, t)) for t in turns]
total_dia = probe_dur(os.path.join(IV, "dialogue_raw.mp3"))
gap = (total_dia - sum(durs)) / n
print(f"{n} turns, solved gap={gap:.3f}s, dialogue={total_dia:.1f}s", flush=True)

# --- anchor beats from the script text ---
text_turns = []
for line in open(SCRIPT):
    line = line.strip()
    m = re.match(r"^(Maya|Marcus):\s*(.*)$", line)
    if m:
        text_turns.append(m.group(2).lower())
anchors = ["whole ballgame", "never really about the money"]
sting_at = []
t = 0.0
for i, (txt, d) in enumerate(zip(text_turns, durs)):
    t_end = t + d + gap
    for a in anchors:
        if a in txt and len(sting_at) < 2:
            sting_at.append(t_end)
    t = t_end
print(f"stingers at {[f'{s:.1f}s' for s in sting_at]}", flush=True)
assert len(sting_at) == 2, "anchors not found"

# --- mix ---
OFF = 1.8
total = OFF + total_dia + 4.5
N = int(total * SR)


def at_offset(el, at):
    buf = np.zeros((N, 2))
    o = int(at * SR)
    m = min(len(el), N - o)
    buf[o:o + m] = el[:m]
    return buf


dialogue = at_offset(place(os.path.join(IV, "dialogue_raw.mp3")), OFF)
mix = dialogue.copy()
mix += at_offset(place(f"{PACK}/podcast_P1_intro_sting_v1.wav",
                       ",volume=0.18,afade=t=in:st=0:d=0.3,afade=t=out:st=1.0:d=0.8"), 0)
for s in sting_at:
    mix += at_offset(place(f"{PACK}/podcast_P2_chapter_sting_v1.wav",
                           ",volume=0.16"), OFF + s)
mix += at_offset(place(f"{PACK}/podcast_P5_outro_sting_v1.wav",
                       ",volume=0.16,afade=t=in:st=0:d=0.5"), OFF + total_dia - 0.5)

# P6 bed, ducked under dialogue (same ducking curve as build_format.py)
sh(["ffmpeg", "-v", "error", "-y", "-stream_loop", "3", "-i",
    f"{PACK}/podcast_P6_bed_warm_neutral_loop_v1.mp3",
    "-filter_complex",
    f"[0:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:{total:.1f},volume=0.10[b]",
    "-map", "[b]", "/tmp/remix_bed.wav"])
bed = np.zeros((N, 2))
braw = load_wav("/tmp/remix_bed.wav")
bed[:min(len(braw), N)] = braw[:min(len(braw), N)]
mono = dialogue.mean(axis=1)
win = int(SR * 0.05)
env = np.sqrt(np.convolve(mono ** 2, np.ones(win) / win, mode="same"))
target = np.where(env < 0.02, 1.0, np.maximum(0.45, 0.02 / np.maximum(env, 1e-6)))
att = np.exp(-1.0 / (SR * 0.018))
rel = np.exp(-1.0 / (SR * 0.420))
gain = np.ones_like(target)
g = 1.0
for i in range(len(target)):
    c = att if target[i] < g else rel
    g = c * g + (1 - c) * target[i]
    gain[i] = g
mix += bed * gain[:, None]

out_wav = "/tmp/remix_mix.wav"
save_wav(out_wav, mix)
out = os.path.join(OUTDIR, "u3-l3-INTERVIEW-pack1.mp3")
sh(["ffmpeg", "-v", "error", "-y", "-i", out_wav,
    "-c:a", "libmp3lame", "-b:a", "192k", out])
got = probe_dur(out)
print(f"done: {out} {got:.1f}s (target {total:.1f}s)", flush=True)
assert abs(got - total) < 3.0
for f in ("/tmp/remix_n.wav", "/tmp/remix_bed.wav", out_wav):
    try:
        os.remove(f)
    except OSError:
        pass
