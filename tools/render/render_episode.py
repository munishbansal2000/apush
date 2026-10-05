#!/usr/bin/env python3
"""Render an approved Maya+Marcus episode script to a single MP3 via Fish Audio.

Self-service: the user runs this themselves. No work is done without the
script file being passed explicitly.

Pipeline per episode script (markdown):
  1. Parse turns: paragraphs starting with "Maya:" / "Marcus:".
     Header/read-note lines starting with "#" are stripped and never sent.
  2. Each turn is synthesized individually with that speaker's Fish voice.
     Parenthetical direction tags like (dry) or (laughs) pass through untouched
     -- Fish interprets them.
  3. [N-second pause] tags become N seconds of real silence (never sent to TTS).
  4. Segments are concatenated in order with ffmpeg -> one MP3.

Auth (two modes, no raw keys in chat or files):
  - If the FISH_API_KEY environment variable is set, it is used as a Bearer
    token (this is the Windows path).
  - Otherwise the Linux VM's Secure Vault credential (custom.fish-audio) is
    used via the surrogate helper (this is the VM path).

Voices: voice model ids live in voices.yaml next to this script. Fill them in
once from the Fish Audio dashboard (a voice's model id). The script refuses to
render until both are set.

Turn audio is cached by content hash, so re-running after a script tweak only
re-synthesizes changed turns. Use --rebuild to force everything.

Example:
    python3 render_episode.py --script ../apush-audio-u1-e4-script-v4-DRAFT.md
    python3 render_episode.py --script ../apush-audio-u1-e4-script-v4-DRAFT.md --out e4.mp3
    python3 render_episode.py --script X.md --list-turns   # preview parsing only
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
FISH_TTS_URL = "https://api.fish.audio/v1/tts"
FISH_HOST = ("api.fish.audio",)

TURN_RE = re.compile(r"^(Maya|Marcus):\s*(.*)$", re.S)
PAUSE_RE = re.compile(r"\[(\d+)-second pause\]")
BARE_PAUSE_RE = re.compile(r"\[pause\]", re.I)
HEADER_RE = re.compile(r"^#")


def parse_script(path: Path):
    """Return a list of segments: ("say", speaker, text) or ("silence", seconds)."""
    raw = path.read_text(encoding="utf-8")
    # Drop header / read-note lines; keep everything else.
    body = "\n".join(
        line for line in raw.split("\n") if not HEADER_RE.match(line.strip())
    )
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    segments = []
    for para in paragraphs:
        # Standalone pause-tag paragraph (e.g. "[5-second pause]" on its own line).
        pm = PAUSE_RE.fullmatch(para.strip())
        if pm:
            segments.append(("silence", int(pm.group(1))))
            continue
        if BARE_PAUSE_RE.fullmatch(para.strip()):
            segments.append(("silence", 2))
            continue
        m = TURN_RE.match(para)
        if not m:
            continue  # safety: only voiced turns render; nothing else sneaks in
        speaker, text = m.group(1).lower(), m.group(2).strip()
        # A turn may contain inline pause tags: split into say/silence pieces.
        pos = 0
        for pm in PAUSE_RE.finditer(text):
            chunk = text[pos:pm.start()].strip()
            if chunk:
                segments.append(("say", speaker, chunk))
            segments.append(("silence", int(pm.group(1))))
            pos = pm.end()
        # Bare [pause] -> 2s silence.
        tail = text[pos:]
        tail, n_bare = BARE_PAUSE_RE.subn("", tail)
        tail = tail.strip()
        if tail:
            segments.append(("say", speaker, tail))
        for _ in range(n_bare):
            segments.append(("silence", 2))
    # Merge adjacent silences.
    merged = []
    for seg in segments:
        if seg[0] == "silence" and merged and merged[-1][0] == "silence":
            merged[-1] = ("silence", merged[-1][1] + seg[1])
        else:
            merged.append(seg)
    return merged


def load_voices(path: Path):
    """Minimal YAML reader for the two voice ids (avoids a dependency)."""
    text = path.read_text(encoding="utf-8")
    cfg = {}
    for line in text.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            k, v = line.split(":", 1)
            cfg[k.strip()] = v.strip().strip('"').strip("'")
    for who in ("maya", "marcus"):
        vid = cfg.get(who, "")
        if not vid or vid.startswith("PASTE"):
            raise SystemExit(
                f"voices.yaml: set a real Fish Audio voice model id for '{who}'.\n"
                "Find it on the Fish Audio dashboard (voice -> model id) and paste it in."
            )
    return cfg


def make_synthesizer(model: str):
    """Return synthesize(text, reference_id) -> mp3 bytes. Chooses auth mode."""
    api_key = os.environ.get("FISH_API_KEY")

    if api_key:
        def synth_direct(text, reference_id):
            payload = {"text": text, "format": "mp3", "latency": "normal"}
            if reference_id:
                payload["reference_id"] = reference_id
            req = urllib.request.Request(
                FISH_TTS_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                    "model": model,
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=180) as resp:
                    return resp.read()
            except urllib.error.HTTPError as exc:
                raise SystemExit(
                    f"Fish Audio API error: HTTP {exc.code}: {exc.read()[:400]!r}"
                )

        return synth_direct

    # VM path: Secure Vault surrogate credential.
    sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
    try:
        from dynamic_credentials import add_surrogate_to_request, read_response_body
    except ImportError:
        raise SystemExit(
            "No FISH_API_KEY set and the Secure Vault helper is unavailable.\n"
            "Set FISH_API_KEY to your Fish Audio key and re-run."
        )

    def synth_vault(text, reference_id):
        payload = {"text": text, "format": "mp3", "latency": "normal"}
        if reference_id:
            payload["reference_id"] = reference_id
        req = urllib.request.Request(
            FISH_TTS_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "model": model},
            method="POST",
        )
        add_surrogate_to_request(req, "custom.fish-audio", allowed_hosts=FISH_HOST)
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                return read_response_body(resp)
        except urllib.error.HTTPError as exc:
            raise SystemExit(
                f"Fish Audio API error: HTTP {exc.code}: {exc.read()[:400]!r}"
            )

    return synth_vault


def silence_mp3(seconds: int, out: Path):
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
         "-i", f"anullsrc=r=44100:cl=stereo:d={seconds}",
         "-c:a", "libmp3lame", "-q:a", "4", str(out)],
        check=True,
    )


def concat_mp3(parts: list, out: Path):
    lst = out.parent / "_concat_list.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in parts), encoding="utf-8")
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
         "-i", str(lst), "-c", "copy", str(out)],
        check=True,
    )
    lst.unlink()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--script", required=True, help="Approved episode .md file")
    ap.add_argument("--out", default=None, help="Output MP3 (default: <script-stem>.mp3)")
    ap.add_argument("--voices", default=str(HERE / "voices.yaml"))
    ap.add_argument("--rebuild", action="store_true", help="Re-synthesize all turns")
    ap.add_argument("--list-turns", action="store_true",
                    help="Print parsed segments and exit (no API calls)")
    args = ap.parse_args()

    script = Path(args.script)
    segments = parse_script(script)
    if args.list_turns:
        for seg in segments:
            if seg[0] == "say":
                print(f"[{seg[1]}] {seg[2][:80]}")
            else:
                print(f"[silence {seg[1]}s]")
        print(f"{len(segments)} segments")
        return

    voices = load_voices(Path(args.voices))
    model = voices.get("model", "s2.1-pro-free")
    synth = make_synthesizer(model)

    out = Path(args.out) if args.out else script.with_suffix(".mp3")
    cache = script.parent / f"{script.stem}_cache"
    cache.mkdir(exist_ok=True)

    parts = []
    say_i = sil_i = 0
    for seg in segments:
        if seg[0] == "silence":
            sil_i += 1
            p = cache / f"sil_{seg[1]}s.mp3"
            if not p.exists():
                silence_mp3(seg[1], p)
            parts.append(p)
            continue
        _, speaker, text = seg
        say_i += 1
        key = hashlib.sha1(f"{voices[speaker]}|{text}".encode("utf-8")).hexdigest()[:16]
        p = cache / f"{say_i:03d}_{speaker}_{key}.mp3"
        if p.exists() and not args.rebuild:
            print(f"  cached  {say_i:3d} [{speaker}] {text[:60]}")
        else:
            print(f"  synth   {say_i:3d} [{speaker}] {text[:60]}")
            audio = synth(text, voices[speaker])
            if len(audio) < 1000:
                raise SystemExit(f"Turn {say_i} returned suspiciously small audio "
                                 f"({len(audio)} bytes); refusing to bake it in.")
            p.write_bytes(audio)
            # Drop stale cache files for this turn index (text changed).
            for stale in cache.glob(f"{say_i:03d}_{speaker}_*.mp3"):
                if stale != p:
                    stale.unlink()
        parts.append(p)

    concat_mp3(parts, out)
    size_mb = out.stat().st_size / 1e6
    print(f"\nwrote {out} ({size_mb:.1f} MB, {len(parts)} segments)")


if __name__ == "__main__":
    main()
