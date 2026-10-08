#!/usr/bin/env python3
"""Offline Vosk word timestamps for one directory of per-turn audio."""
import argparse, hashlib, json, os, subprocess, tempfile, wave

def file_hash(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--audio-dir', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--model', default=os.environ.get('VOSK_MODEL_PATH', ''))
    ap.add_argument('--cache', default='')
    args = ap.parse_args()
    if not args.model or not os.path.isdir(args.model):
        raise SystemExit('Vosk model missing; pass --model or set VOSK_MODEL_PATH')
    try:
        from vosk import Model, KaldiRecognizer
    except ImportError as exc:
        raise SystemExit('vosk is not installed in this Python environment') from exc
    model = Model(args.model)
    old_result = {}
    old_hashes = {}
    if os.path.isfile(args.out):
        with open(args.out, encoding='utf-8') as handle: old_result = json.load(handle)
    if args.cache and os.path.isfile(args.cache):
        with open(args.cache, encoding='utf-8') as handle: old_hashes = json.load(handle)
    result = {}
    hashes = {}
    reused = 0
    measured = 0
    for name in sorted(os.listdir(args.audio_dir)):
        if not name.lower().endswith(('.mp3', '.wav', '.m4a')):
            continue
        turn_id = os.path.splitext(name)[0]
        source = os.path.join(args.audio_dir, name)
        fingerprint = file_hash(source)
        hashes[turn_id] = fingerprint
        if old_hashes.get(turn_id) == fingerprint and turn_id in old_result:
            result[turn_id] = old_result[turn_id]
            reused += 1
            continue
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            wav_path = tmp.name
        try:
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', source,
                            '-ar', '16000', '-ac', '1', '-sample_fmt', 's16', wav_path], check=True)
            rows = []
            with wave.open(wav_path, 'rb') as stream:
                rec = KaldiRecognizer(model, stream.getframerate())
                rec.SetWords(True)
                while True:
                    data = stream.readframes(4000)
                    if not data: break
                    if rec.AcceptWaveform(data): rows += json.loads(rec.Result()).get('result', [])
                rows += json.loads(rec.FinalResult()).get('result', [])
            result[turn_id] = [{'w': row['word'], 's': row['start'], 'e': row['end']} for row in rows]
            measured += 1
        finally:
            if os.path.exists(wav_path): os.unlink(wav_path)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, 'w', encoding='utf-8') as handle:
        json.dump(result, handle, indent=2)
        handle.write('\n')
    if args.cache:
        with open(args.cache, 'w', encoding='utf-8') as handle:
            json.dump(hashes, handle, indent=2)
            handle.write('\n')
    print(f'vosk: {measured} measured, {reused} reused')

if __name__ == '__main__': main()
