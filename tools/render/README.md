# APUSH episode audio renderer (self-service)

Turns an approved Maya+Marcus script `.md` into one MP3 via Fish Audio.
You run it yourself — nothing renders unless you invoke it.

## One-time setup

1. Install Python 3 and ffmpeg, then make sure ffmpeg is on PATH:
   - Windows: `winget install Gyan.FFmpeg` (or download from ffmpeg.org)
   - Mac: `brew install ffmpeg`
   - Linux: `apt install ffmpeg`
2. Open `voices.yaml` and paste the Fish Audio **voice model ids** for Maya
   and Marcus (fish.audio dashboard → voice → model id). Once, ever.
3. Tell the script your Fish Audio key:
   - **Windows / Mac:** set the environment variable `FISH_API_KEY` to your key.
     (PowerShell: `$env:FISH_API_KEY="...key..."`)
   - **Linux VM here:** nothing to do — the stored Secure Vault credential is
     used automatically.

## Rendering an episode

```bash
# Preview what will render (no API calls, free):
python3 render_episode.py --script ../apush-audio-u1-e4-script-v4-DRAFT.md --list-turns

# Render:
python3 render_episode.py --script ../apush-audio-u1-e4-script-v4-DRAFT.md
# -> apush-audio-u1-e4-script-v4-DRAFT.mp3 next to the script

# Custom output name:
python3 render_episode.py --script ../apush-audio-u1-e4-script-v4-DRAFT.md --out e4-jamestown.mp3

# Force re-synthesis of every turn (normally only changed turns re-render):
python3 render_episode.py --script X.md --rebuild
```

## What it does with the script

- Lines starting with `#` (header, read note, pronunciation guide) are **stripped**
  and never sent to the voice.
- Only `Maya:` / `Marcus:` paragraphs are voiced, in order, with the matching
  voice from `voices.yaml`.
- `[N-second pause]` becomes N seconds of real silence. It is never spoken.
- Parenthetical direction tags like `(dry)` or `(laughs)` pass through to Fish,
  which interprets them as delivery direction.
- Each turn is cached by content hash in `<script-stem>_cache/`, so fixing one
  line and re-running only re-synthesizes that turn.

## If something goes wrong

- `voices.yaml: set a real Fish Audio voice model id` → paste the ids (step 2).
- `Fish Audio API error: HTTP 401/403` → the key is wrong or missing; check
  `FISH_API_KEY` (Windows/Mac) or reconnect the credential (VM).
- `suspiciously small audio` → a turn came back empty; re-run with `--rebuild`.
  If it persists, check the turn text with `--list-turns`.
- ffmpeg `command not found` → install it and put it on PATH (step 1).
