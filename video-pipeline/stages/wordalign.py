"""Stage: wordalign (optional but recommended for chain beats).

Runs faster-whisper word-level transcription on the chain beat's turn MP3s
and records the absolute episode timestamp of each chain word, so node
reveals land exactly when the words are spoken (not evenly spaced).

Reads beats_resolved.json; for each chain beat with "words" and "align_turns",
writes <episode>/work/word-times-<bid>.json. Skips beats whose output exists.

Requires the faster-whisper venv at ~/workspace/.fwvenv (or FWPYTHON env).
"""
import json
import os
import subprocess
import sys

FWPYTHON = os.environ.get("FWPYTHON",
                           os.path.expanduser("~/workspace/.fwvenv/bin/python"))


def _model_path(model="base"):
    """Resolve to the local HF snapshot dir (proxy env breaks hub lookups)."""
    snap_base = os.path.expanduser(
        "~/.cache/huggingface/hub/models--Systran--faster-whisper-base/snapshots")
    if model == "base" and os.path.isdir(snap_base):
        snaps = [d for d in os.listdir(snap_base)
                 if os.path.exists(os.path.join(snap_base, d, "model.bin"))]
        if snaps:
            return os.path.join(snap_base, snaps[0])
    return model


def align_turn(tts_dir, turn_file, model="base"):
    model_ref = _model_path(model)
    code = (
        "import json, sys, subprocess\n"
        "import numpy as np\n"
        "from faster_whisper import WhisperModel\n"
        "m = WhisperModel(sys.argv[2], device='cpu', compute_type='int8')\n"
        "raw = subprocess.check_output(['ffmpeg','-v','error','-i',sys.argv[1],\n"
        "    '-ar','16000','-ac','1','-f','f32le','-'])\n"
        "audio = np.frombuffer(raw, dtype=np.float32)\n"
        "segs, _ = m.transcribe(audio, word_timestamps=True)\n"
        "words = []\n"
        "for s in segs:\n"
        "    for w in (s.words or []):\n"
        "        words.append({'word': w.word.strip().lower(), 'start': round(w.start, 3),\n"
        "                    'end': round(w.end, 3), 'prob': round(w.probability, 3)})\n"
        "print(json.dumps(words))\n"
    )
    r = subprocess.run([FWPYTHON, "-c", code,
                        os.path.join(tts_dir, turn_file), model_ref],
                       capture_output=True, text=True, timeout=1200,
                       env={**os.environ, "HF_HUB_OFFLINE": "1"})
    if r.returncode != 0:
        raise RuntimeError(f"whisper failed on {turn_file}: {r.stderr[-500:]}")
    return json.loads(r.stdout)


def run(ep_dir, cfg, model="base"):
    if not os.path.exists(FWPYTHON):
        print("wordalign: faster-whisper venv not found, skipping", flush=True)
        return
    with open(os.path.join(ep_dir, "work", "beats_resolved.json"), encoding="utf-8") as f:
        beats = json.load(f)["beats"]
    with open(os.path.join(ep_dir, "work", "timings.json"), encoding="utf-8") as f:
        tj = json.load(f)
    tts_dir = os.path.normpath(os.path.join(ep_dir, cfg["tts_dir"]))
    t_by_idx = {int(t["turn"][1:]): t for t in tj["turns"]}

    for b in beats:
        if b["kind"] != "chain" or not b.get("words"):
            continue
        out = os.path.join(ep_dir, "work", f"word-times-{b['id']}.json")
        if os.path.exists(out):
            print(f"wordalign: {b['id']} cached", flush=True)
            continue
        align_turns = b.get("align_turns")
        if not align_turns:
            # default: the turns the beat spans
            s_idx = int(b["start"]["turn"]) if "turn" in b["start"] else 0
            e_idx = int(b["end"]["turn"]) if "turn" in b["end"] else s_idx
            align_turns = list(range(s_idx, e_idx + 1))
        # transcribe each turn once, search words in order
        transcripts = {}
        for ti in align_turns:
            t = t_by_idx[ti]
            transcripts[ti] = (t["start"], align_turn(tts_dir, t["file"], model))
            print(f"wordalign: transcribed t{ti:02d}", flush=True)
        entries = []
        cursor = 0  # word order cursor across (turn, word-index)
        flat = []
        for ti in align_turns:
            t0, words = transcripts[ti]
            for w in words:
                flat.append((ti, t0 + w["start"], t0 + w["end"], w["word"], w["prob"]))
        for target in b["words"]:
            want = target.lower().strip(".,!?;:'\"")
            hit = None
            for j in range(cursor, len(flat)):
                if flat[j][3].strip(".,!?;:'\"") == want:
                    hit = j
                    break
            if hit is None:
                # retry from start (word may precede cursor if repeated)
                for j in range(0, cursor):
                    if flat[j][3].strip(".,!?;:'\"") == want:
                        hit = j
                        break
            if hit is None:
                heard = sorted({w for _, _, _, w, _ in flat})
                raise RuntimeError(
                    f"wordalign: '{target}' not found in turns {align_turns} "
                    f"for beat {b['id']}; heard: {heard[:40]}")
            ti, a0, a1, _, prob = flat[hit]
            entries.append({"word": target, "turn": f"t{ti:02d}",
                            "t_start": round(a0, 3), "t_end": round(a1, 3),
                            "prob": prob})
            cursor = hit + 1
        with open(out, "w", encoding="utf-8") as f:
            json.dump({"model": f"faster-whisper {model} (int8, cpu)",
                       "entries": entries}, f, indent=1)
        print(f"wordalign: {b['id']} -> "
              + ", ".join(f"{e['word']}@{e['t_start']}" for e in entries), flush=True)
