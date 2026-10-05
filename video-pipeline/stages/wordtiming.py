"""Stage: wordtiming.

Run Vosk word-timing on per-turn audio BEFORE the director runs.
Outputs work/word_times.json: {turn_id: [{word, start, end}, ...]}.

The director prompt includes measured word times so StaggerSlide panel
entrances, KeywordPop overlays, and other within-slide timings use
EXACT measured times — never estimates.
"""
import json
import os
import subprocess
import sys
import tempfile

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, os.pardir))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)


def _model_path():
    """Vosk model dir: VOSK_MODEL_PATH wins, then a few likely spots."""
    env = os.environ.get("VOSK_MODEL_PATH")
    if env and os.path.isdir(env):
        return env
    candidates = [
        os.path.expanduser("~/vosk-model-small-en-us-0.15"),
        os.path.expanduser("~/workspace/vosk-model-small-en-us-0.15"),
        os.path.join(_ROOT, "models", "vosk-model-small-en-us-0.15"),
    ]
    for c in candidates:
        if os.path.isdir(c):
            return c
    raise RuntimeError(
        "Vosk model not found. Set VOSK_MODEL_PATH to the model dir "
        "(vosk-model-small-en-us-0.15, ~40MB from alphacephei.com/vosk/models), "
        f"tried: {candidates}")


def _to_wav_mono16k(src, dst):
    r = subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", src,
         "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", dst],
        capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg wav convert failed for {src}")


def measure_words(audio_path, model):
    """Return [{word, start, end}] via Vosk offline ASR. model is a loaded
    vosk.Model (load once, reuse across turns)."""
    from vosk import KaldiRecognizer
    import wave
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        tmp = tf.name
    try:
        _to_wav_mono16k(audio_path, tmp)
        wf = wave.open(tmp, "rb")
        rec = KaldiRecognizer(model, wf.getframerate())
        rec.SetWords(True)
        words = []
        while True:
            data = wf.readframes(4000)
            if not data:
                break
            if rec.AcceptWaveform(data):
                for w in json.loads(rec.Result()).get("result", []):
                    words.append({"word": w["word"],
                                  "start": round(w["start"], 2),
                                  "end": round(w["end"], 2)})
        for w in json.loads(rec.FinalResult()).get("result", []):
            words.append({"word": w["word"],
                          "start": round(w["start"], 2),
                          "end": round(w["end"], 2)})
        wf.close()
        return words
    finally:
        try:
            os.unlink(tmp)
        except OSError:
            pass


def run(ep_dir, cfg):
    work = os.path.join(ep_dir, "work")
    os.makedirs(work, exist_ok=True)
    tts_dir = os.path.normpath(os.path.join(ep_dir, cfg.get("tts_dir", "tts")))
    # Find per-turn audio files
    import glob
    turn_files = sorted(glob.glob(os.path.join(tts_dir, "per_turn", "t*.mp3")))
    if not turn_files:
        turn_files = sorted(glob.glob(os.path.join(tts_dir, "t*.mp3")))
    if not turn_files:
        raise RuntimeError(f"no per-turn audio in {tts_dir}")

    out = {}
    try:
        from vosk import Model
    except ImportError:
        print("wordtiming: vosk not installed — skipping "
              "(install vosk + model on the render machine for word times)",
              flush=True)
        return {}
    model = Model(_model_path())  # load once — not per turn
    failed = 0
    for f in turn_files:
        tid = os.path.splitext(os.path.basename(f))[0]
        try:
            words = measure_words(f, model)
            out[tid] = words
            print(f"wordtiming: {tid} -> {len(words)} words", flush=True)
        except Exception as e:
            failed += 1
            print(f"wordtiming: {tid} FAILED ({e})", flush=True)
            out[tid] = []

    out_path = os.path.join(work, "word_times.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)
    print(f"wordtiming: {len(out)} turns -> {out_path}", flush=True)
    if failed:
        print(f"wordtiming: WARNING {failed}/{len(out)} turns have no word "
              f"times — StaggerSlide 'at' values for those turns cannot be "
              f"exact", flush=True)
    return out_path
