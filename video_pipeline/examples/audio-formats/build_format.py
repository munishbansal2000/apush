#!/usr/bin/env python3
"""Generic format builder: scripted turns -> Fish voices -> numpy music mix.
Usage: build_format.py <script.txt> <outname> <gap> <sting_anchor_1> <sting_anchor_2> <spk=refid> [spk=refid ...]
Turns parsed as 'Speaker: text'. Stingers placed after the turn containing each anchor."""
import subprocess, re, os, sys
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import wave

script_path, outname, gap_s, anchor1, anchor2 = sys.argv[1:6]
GAP = float(gap_s)
VOICES = dict(a.split("=", 1) for a in sys.argv[6:])
OFF = 1.8

W = f"/home/hatch/workspace/your_files/tts-scripts/fishperf/{outname}"
MUS = "/home/hatch/workspace/apush/video_pipeline/music"
STING = f"{MUS}/alex_kizenkov-stomps-and-claps-percussion-and-rhythm-141190.mp3"
BED = f"{MUS}/papulina-lost-signal-coffee-371869.mp3"
OUTRO_SRC = f"{MUS}/absounds-inspiring-acoustic-folk-music-255650.mp3"
SR = 44100
os.makedirs(W, exist_ok=True)

def sh(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-400:])

turns = []
for line in open(script_path):
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    m = re.match(r"^([A-Za-z]+):\s*(.*)$", line)
    if m and m.group(1) in VOICES:
        turns.append((m.group(1), m.group(2)))
print(f"{outname}: {len(turns)} turns", flush=True)

def render(job):
    i, speaker, text = job
    out = f"{W}/t{i:02d}.mp3"
    if os.path.exists(out) and os.path.getsize(out) > 1000:
        return f"skip t{i:02d}"
    r = subprocess.run(["python3", "/home/hatch/workspace/skills/fish-audio/bin/fish_tts.py",
                        "--text", text, "--out", out, "--reference-id", VOICES[speaker]],
                       capture_output=True, text=True, timeout=240)
    return f"{'OK' if r.returncode==0 else 'FAIL'} t{i:02d} {speaker}"

with ThreadPoolExecutor(max_workers=2) as ex:
    for res in ex.map(render, [(i, s, t) for i, (s, t) in enumerate(turns)]):
        print(res, flush=True)

durs = [float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration",
        "-of","csv=p=0",f"{W}/t{i:02d}.mp3"], text=True)) for i in range(len(turns))]
sh(["ffmpeg","-v","error","-y","-f","lavfi","-i","anullsrc=r=44100:cl=stereo","-t",str(GAP),f"{W}/sil.mp3"])
with open(f"{W}/concat.txt","w") as f:
    for i in range(len(turns)):
        f.write(f"file 't{i:02d}.mp3'\nfile 'sil.mp3'\n")
sh(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{W}/concat.txt","-c","copy",f"{W}/raw.mp3"])
dia_dur = sum(durs) + GAP*len(turns)
nend = OFF + dia_dur
total = nend + 4.5

def cum_end(idx):
    return OFF + sum(durs[:idx+1]) + GAP*(idx+1)
st1 = st2 = None
for i, (s, t) in enumerate(turns):
    if anchor1.lower() in t.lower(): st1 = cum_end(i)
    if anchor2.lower() in t.lower(): st2 = cum_end(i)
print(f"stingers at {st1} / {st2}, total {total:.1f}s", flush=True)

def load_wav(path):
    with wave.open(path, "rb") as w:
        n = w.getnframes()
        return np.frombuffer(w.readframes(n), dtype=np.int16).reshape(-1,2).astype(np.float64)/32768.0

def save_wav(path, data):
    data = np.clip(data, -1.0, 1.0)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((data*32767.0).astype(np.int16).tobytes())

def place(src, out, filt=""):
    args = ["ffmpeg","-v","error","-y","-i",src]
    if filt:
        args += ["-filter_complex", f"[0:a]aformat=sample_rates=44100:channel_layouts=stereo{filt}[e]", "-map", "[e]"]
    else:
        args += ["-ar","44100","-ac","2"]
    sh(args + [out])
    return load_wav(out)

N = int(total*SR)
def at_offset(el, at):
    buf = np.zeros((N,2)); o = int(at*SR); n = min(len(el), N-o)
    buf[o:o+n] = el[:n]; return buf

dialogue = at_offset(place(f"{W}/raw.mp3", f"{W}/n1.wav"), OFF)
mix = dialogue + at_offset(place(STING, f"{W}/n2.wav", ",atrim=0:2.4,volume=0.2,afade=t=in:st=0:d=0.3"), 0)
if st1: mix += at_offset(place(STING, f"{W}/n3.wav", ",atrim=0:1.1,volume=0.16"), st1)
if st2: mix += at_offset(place(STING, f"{W}/n4.wav", ",atrim=0:1.1,volume=0.16"), st2)
mix += at_offset(place(OUTRO_SRC, f"{W}/n5.wav",
    ",atrim=0:4,volume=0.18,afade=t=in:st=0:d=0.8,afade=t=out:st=3:d=1"), nend-1.0)

sh(["ffmpeg","-v","error","-y","-stream_loop","3","-i",BED,
    "-filter_complex",f"[0:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:{total:.1f},volume=0.14[b]",
    "-map","[b]",f"{W}/n6.wav"])
bed = np.zeros((N,2)); braw = load_wav(f"{W}/n6.wav"); bed[:min(len(braw),N)] = braw[:min(len(braw),N)]

mono = dialogue.mean(axis=1); win = int(SR*0.05)
env = np.sqrt(np.convolve(mono**2, np.ones(win)/win, mode="same"))
target = np.where(env < 0.02, 1.0, np.maximum(0.45, 0.02/np.maximum(env,1e-6)))
att = np.exp(-1.0/(SR*0.018)); rel = np.exp(-1.0/(SR*0.420))
gain = np.ones_like(target); g = 1.0
for i in range(len(target)):
    c = att if target[i] < g else rel
    g = c*g + (1-c)*target[i]; gain[i] = g
mix += bed * gain[:,None]

save_wav(f"{W}/mix.wav", mix)
sh(["ffmpeg","-v","error","-y","-i",f"{W}/mix.wav","-c:a","libmp3lame","-b:a","128k",
    f"{W}/{outname}-mixed.mp3"])
got = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration",
    "-of","csv=p=0",f"{W}/{outname}-mixed.mp3"], text=True))
print(f"{outname} mixed: {got:.1f}s (target {total:.1f}s)", flush=True)
assert abs(got-total) < 3.0
for i in range(1,7):
    try: os.remove(f"{W}/n{i}.wav")
    except OSError: pass
os.remove(f"{W}/mix.wav")
print(f"{outname} ALL DONE")
