#!/usr/bin/env python3
"""
One line of narration through the Fish Audio cloud API (the pipeline's prod TTS; tools/pipeline/stages/audio.ts).

  python tools/fish_tts.py --text "[firm] The line held." --out t05.mp3 --model s2.1-pro-free \
      --reference-id 57785406027844b29b63a772a8477bc2 --format mp3

The API key comes from FISH_API_KEY (the pipeline sets it per lesson from FISH_API_KEYS / FISH_API_KEYS_FILE).
Square-bracket direction tags ([firm], [curious, inquisitive tone]) are sent as written: Fish S2 reads them as
performance commands. Retries 429/5xx with backoff (honours Retry-After). Standard library only.
Override the endpoint with FISH_API_URL if Fish changes it.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

API_URL = os.environ.get("FISH_API_URL", "https://api.fish.audio/v1/tts")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", required=True, help="Fish model, sent as the 'model' header (data/pipeline.json fish.model)")
    ap.add_argument("--reference-id", required=True, help="Fish voice model id (data/pipeline.json fish.voices)")
    ap.add_argument("--format", default="mp3", choices=("mp3", "wav", "opus", "pcm"))
    args = ap.parse_args()

    key = os.environ.get(os.environ.get("FISH_KEY_ENV", "FISH_API_KEY"), "").strip()
    if not key:
        sys.exit("fish_tts: no API key; set FISH_API_KEY, or FISH_API_KEYS / FISH_API_KEYS_FILE for the pipeline")

    body = json.dumps({"text": args.text, "reference_id": args.reference_id, "format": args.format,
                       "mp3_bitrate": 128, "normalize": True, "latency": "normal"}).encode("utf-8")
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json", "model": args.model,
               "User-Agent": "apush-video2-pipeline/1.0"}
    delay = 10
    for attempt in range(5):
        req = urllib.request.Request(API_URL, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                audio = resp.read()
            if len(audio) < 1000:
                sys.exit(f"fish_tts: response too small ({len(audio)} bytes): {audio[:200]!r}")
            tmp = args.out + ".part"
            with open(tmp, "wb") as f:
                f.write(audio)
            os.replace(tmp, args.out)
            return
        except urllib.error.HTTPError as e:
            detail = e.read()[:300].decode("utf-8", "replace")
            if (e.code == 429 or e.code >= 500) and attempt < 4:
                wait = int(e.headers.get("Retry-After") or delay) if e.headers else delay
                print(f"fish_tts: HTTP {e.code}, retrying in {wait}s", file=sys.stderr)
                time.sleep(wait)
                delay *= 2
                continue
            sys.exit(f"fish_tts: HTTP {e.code} (key ...{key[-4:]}): {detail}")
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < 4:
                time.sleep(delay)
                delay *= 2
                continue
            sys.exit(f"fish_tts: network error: {getattr(e, 'reason', e)}")


if __name__ == "__main__":
    main()
