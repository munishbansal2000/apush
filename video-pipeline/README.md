# APUSH Video Pipeline

One command from beat sheet + audio to a finished, verified video:

```bash
python3 pipeline.py --episode u1-e1
```

## Stages

| Stage      | What it does |
|------------|--------------|
| `audio`    | Ensures the mixed dialogue MP3 exists (runs `audio_build` from beats.json if missing) |
| `timing`   | Turn timings from the real turn-MP3 durations + per-turn speech-onset detection |
| `beats`    | Validates beats.json, resolves every boundary to absolute seconds (fail-closed: beats must be contiguous, first starts at 0, last ends at total) |
| `wordalign`| faster-whisper word timestamps for chain beats → nodes reveal when words are spoken |
| `anim`     | Emits LTX clip prompts to `anim_prompts/` for Windows rendering |
| `render`   | One cached segment per beat (Ken Burns / pre-rendered vid / animated chain) |
| `assemble` | Concatenates segments + muxes dialogue audio |
| `verify`   | Fail-closed: duration, 1v+1a streams, audio not silent, zero black frames |

Run a subset: `python3 pipeline.py --episode u1-e2 --only timing,beats`
Force re-render: add `--force`. Re-render one beat: delete `work/segs/<bid>.mp4` and re-run.

## The beat sheet (`episodes/<ep>/beats.json`)

The only per-episode creative input. Everything else is deterministic.

```json
{
  "episode": "u1-e2", "unit": 1, "episode_num": 2,
  "subject": "WHY EUROPE SAILED WEST", "tag": "PILOT",
  "tts_dir": "../../../your_files/tts-scripts/fishperf/u1-e2-europe-sailed",
  "audio": "u1-e2-europe-sailed-mixed.mp3",
  "audio_build": "python3 .../build_format.py ...",
  "offset": 1.8, "gap": 0.6, "tail": 4.5,
  "total": null,
  "beats": [
    {"id": "b01", "start": {"time": 0}, "end": {"turn": 0, "at": "start"},
     "kind": "kb", "image": "ship", "motion": "zin", "html": "..."},
    {"id": "b22b", "start": {"turn": 40, "onset": true}, "end": {"turn": 41, "at": "start"},
     "kind": "kb", "image": "portolan", "motion": "zin", "html": "..."},
    {"id": "b19", "start": {"turn": 33, "at": "start"}, "end": {"turn": 35, "at": "start"},
     "kind": "chain", "nodes": ["Technology", "Motives", "Gold"],
     "words": ["technology", "motives", "gold"],
     "bg_image": "ship", "kicker": "THE EXAM MOVE",
     "chain_caption": "Enabling cause → driving cause → your thesis pick: gold."}
  ]
}
```

Time specs: `{"time": X}`, `{"tail": true}`, `{"turn": N, "at": "start"|"end"}`,
`{"turn": N, "split": [parts, k]}`, `{"turn": N, "onset": true}` (voice actually starts —
use for answer reveals so they don't pop during leading silence).

Beat kinds: `kb` (image + motion `zin`/`zout`/`panl`/`panr` + html),
`vid` (pre-rendered mp4 via `src`, optional `gen` build command),
`chain` (animated node chain, word-aligned when `words` is set).

## Images (`episodes/<ep>/images.json`)

```json
{"images": {"ship": {"file": "images/caravel-replicas.jpg", "kind": "photo",
                     "credit": "..."}}}
```

Prefer real public-domain/CC photos (Wikimedia Commons). The sourcing helper is at
`staging/e1-images/commons_fetch.py`. CC images get a credit line on the outro card.

## Windows LTX clips

Any beat with `anim_prompt` gets a prompt file in `anim_prompts/<bid>.txt`
(duration, resolution, style, negative prompts). Render it on the 5090, drop the
finished clip at `episodes/<ep>/clips/<bid>.mp4` — the render stage picks it up
automatically when its duration matches the beat (±1s). No text in clips, ever.

## Requirements

- ffmpeg/ffprobe, python3, PIL, numpy
- chrome-headless-shell (for text overlays) — path in `stages/render.py`
- faster-whisper venv at `~/workspace/.fwvenv` (wordalign stage only)
