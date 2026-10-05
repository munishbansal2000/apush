#!/usr/bin/env python3
"""The LLM director: locked script turns + asset manifest -> scene plan JSON.

Design rule: the director PLANS (it may call a model); compile_scene_plan.py
RENDERS (never calls a model). The scene plan is the reviewable artifact —
a human reads "scene-12 -> DuoSlide(Las Casas, Sepulveda)" and fixes it
before a single frame renders.

Providers (mirrors slideforge's gen.py plugin pattern):
  mock    deterministic stub for tests: one TitleSlide per turn, titled with
          the turn's first 8 words, duration = the turn's duration.
  agent   prints the full director prompt + schema to stdout and reads the
          scene plan JSON back from a file path (--plan-file). For human or
          outer-agent loops.
  openai  Responses API structured output (needs OPENAI_API_KEY).
  ollama  local Ollama chat API, JSON mode (no key; needs Ollama serving
          a capable model, e.g. OLLAMA_MODEL=qwen3.8:27b).
  meta    Meta API Responses API, strict JSON schema (needs
          MODEL_API_KEY; see sat_question_runner/new_eng_qs/lib/
          meta_api.js, ported to stdlib — same endpoint, model pin,
          and strict-schema conversion).

Model providers (openai, ollama) share one contract: the system prompt is
the canonical docs/director-prompt-v6.txt (word-anchored v2 output, never
hand-written seconds) and the user block carries turns with measured word
times plus the asset manifest. The returned plan is an ANCHORED draft -
stages/direct.py resolves it via resolve_cues.py before validation.

Turns: [{"speaker": "Maya", "text": "...", "duration_sec": 12.3}, ...]
Manifest: [{"path": "portraits/las_casas.jpg", "kind": "portrait",
            "description": "Bartolome de Las Casas, Dominican friar"}, ...]
"""
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_SCHEMA_PATH = os.path.join(_HERE, "scene_plan_schema.json")
_PROMPT_DOC = os.path.join(os.path.dirname(_HERE), "docs",
                           "director-prompt-v10.txt")
_PROMPT_CUT = "Output ONLY the JSON object. No prose, no markdown fences."


def _director_system():
    """Canonical director system prompt (single source of truth).

    docs/director-prompt-v10.txt (= v9 rules on the v6 anchor
    format) mixes the canonical prompt with a worked
    u1-e1 example; only the head (through the Output-ONLY line) is the
    reusable system prompt. The example stays in the doc, not in
    model calls for other episodes.
    """
    with open(_PROMPT_DOC, encoding="utf-8") as f:
        doc = f.read()
    head, sep, _ = doc.partition(_PROMPT_CUT)
    if not sep:
        raise RuntimeError("director prompt doc lost its cut marker: "
                       f"{_PROMPT_DOC}")
    return (head + sep).strip() + "\n"

SYSTEM_PROMPT = """\
You are the visual director for an APUSH study-video series. You turn a
locked two-host dialogue script (Maya + Marcus) into a shot-by-shot SCENE
PLAN for slideforge, a Python animation library that renders every frame.

You do NOT render anything. You output ONLY a JSON object matching the
scene plan schema (version 1): {"version": 1, "episode": "...",
"scenes": [{"id": "scene-00", "slide": "TitleSlide",
"params": {...}, "duration_sec": 8.2, "transition": "cut", "trans_dur": 0,
"overlays": [...]}]}.

The 27 slide types you may use: TitleSlide, BulletSlide, StepsSlide,
DisplayPointsSlide, DisplayHeadline, CompareSlide, HighlightSlide,
CollageSlide, TitleCardSlide, DuoSlide, ImageSlide, SplitSlide, QuoteSlide,
StatSlide, KenBurnsSlide, CalloutSlide, MapZoomSlide, RouteSlide,
TerritorySlide, RecallSlide, SpectrumSlide, SketchSlide, CausalChainSlide,
VidSlide, EraCardSlide, StaggerSlide, TacticalSlide.
Overlays: keywordpop (giant outlined term), caption, lowerthird
(name+role), sticker (cutout photo), regionglow (pulsing map tint).

VISUAL GRAMMAR — follow it exactly:
- Key-term KeywordPop: when the script introduces a testable term
  (e.g. "triangular trade", "salutary neglect"), add a keywordpop overlay
  starting within ~1 second of the spoken term.
- DuoSlide whenever TWO PEOPLE are compared or discussed together
  (portraits + name plates), never a single portrait for a comparison.
- RouteSlide for voyages and journeys (route names available in the
  manifest; e.g. columbus_1492, cortes_1519). MapZoomSlide for map tours
  with labeled pins. CalloutSlide to zoom into labeled regions of an image.
- QuoteSlide for primary-source quotes and for the episode's closing kicker.
- CompareSlide for explicit X-vs-Y comparisons (empires, regions, systems).
- StatSlide for numbers that deserve a count-up (population collapses,
  silver flows, "500 settlers to 60").
- BulletSlide / StepsSlide for spoken enumerations — bullets reveal
  staggered, paced to the narration, never all at once.
- StaggerSlide when the narration NAMES 2-4 items in sequence (e.g. "Three
  boxes: maize, Iroquois, wilderness" or "Southwest, Plains, Northeast").
  Each panel enters FROM the direction of its position as its name is SPOKEN.
  Set each panel's "at" to the EXACT word-time from the WORD TIMES line
  for that turn (e.g. if WORD TIMES shows "maize@3.7s", use "at": 3.7).
  NEVER estimate — the measured times are in the prompt.
  Panels: {"image": manifest path, "label": "...", "at": seconds, "from":
  "left"|"right"|"top"|"bottom"}. Use "face_top": true for portrait images.
- TacticalSlide for battles/ambushes with two forces: {"blue_label": "...",
  "red_label": "...", "red_start": seconds when surrounding begins,
  "red_end": seconds when surround completes, "title": "..."}. Blue dots hold
  position (the ambushed force); red dots animate inward over the time window.
  Deterministic seeded placement — same inputs, same output.
- DisplayPointsSlide / DisplayHeadline for section headers and big numbered
  points. TitleSlide opens the episode; TitleCardSlide works as a
  chapter card ("Greetings from ..."). EraCardSlide is the designed title
  card: kicker pill ("APUSH - UNIT 2 - EP. 8"), giant title, subtitle, up
  to three gold boxes with icons, footer tag — pass "unit" (1-9) and it
  picks the period background automatically. Use it for episode opens and
  major section cards.
- TerritorySlide for territorial control/claims maps; RecallSlide for
  self-test beats; SpectrumSlide for spectrums and spectrums-of-opinion;
  SketchSlide for hand-drawn-style diagrams; CausalChainSlide for
  cause->effect chains.
- VidSlide + anim_prompt for ATMOSPHERIC VIDEO: when no historic image fits
  the beat but motion would help (e.g. mist over a river at dawn, desert wind,
  rain on leaves, empty forest). Write a detailed "anim_prompt" (text-to-video
  prompt, ≤15s): describe the shot, camera movement, palette, lighting, and
  what to EXCLUDE (no people, no text, no modern objects, no faces).
  The clips stage renders it via LTX; VidSlide plays it with your overlays.
  NEVER use anim_prompt for factual content — maps, portraits, documents,
  diagrams, and anything the viewer might take as evidence stay as historic
  images or slideforge-rendered graphics. If a good historic image exists in
  the manifest, use ImageSlide with that image instead of generating video.
- NEVER a blank background: every text slide gets the textured default,
  a contextual image from the manifest (era art, map, photo), or an era
  background: "bg": {"type": "era", "unit": N} tints any slide to the
  unit's period (1=parchment contact era ... 6=steel Gilded Age ...
  8=cold-slate Cold War, 9=dark contemporary). Prefer era art or photos
  where the manifest has them; era bg beats the generic default.
- Eyes-closed-safe: the audio must stand alone. Visuals ADD (a term pops as
  it is spoken, a face appears as the person is discussed) — they never
  carry meaning the narration does not also state.
- One scene per narration beat; scene duration_sec MUST equal the spoken
  audio duration of the turns it covers (the compiler muxes the real audio
  over the rendered video, so drift breaks sync). COPY durations EXACTLY from
  the turn list above — do not round, estimate, or "clean up" the numbers.
  If turns [3,8] have durations 4.3+13.7+5.2+10.3+3.5+9.8, the scene duration
  is 46.8, not 47, not 45. The compiler REJECTS any scene whose duration
  differs from its turns' sum by >= 1 frame (0.033s). Default transition "cut"
  (trans_dur 0) unless a crossfade is motivated.
- Every scene MUST carry "turns": [first_turn_index, last_turn_index]
  (0-based, inclusive). The scenes' turns ranges must partition ALL script
  turns contiguously: scene 0 starts at turn 0, each scene starts where the
  previous ended, no gaps, no overlaps. The compiler rejects plans that
  break this contract.
- params.image / map_image / left.image / right.image / card.image /
  cards[].image / bg.path / sticker image: repo-relative paths resolved
  against the episode assets dir. Use ONLY paths present in the manifest.
  Absolute paths are rejected.

Output ONLY the JSON object. No prose, no markdown fences.\
"""

DIRECTOR_USER_TEMPLATE = """\
EPISODE: {episode}

SCRIPT TURNS (speaker, duration_sec, text):
{turns}

ASSET MANIFEST (path, kind, description):
{manifest}

Write the scene plan JSON now. One scene per beat; durations must match the
spoken durations above so the rendered video syncs with the real audio.\
"""


def _load_schema():
    with open(_SCHEMA_PATH, encoding="utf-8") as f:
        return json.load(f)


def _user_block(episode, turns, manifest, recipe=None):
    """User block: turns with measured word times + asset manifest.

    recipe: {"gap", "offset", "tail"} from timings.json — when nonzero, the
    prompt states the scene-duration formula so the LLM's arithmetic matches
    the compiler's measured-timing gate.
    """
    turn_lines = []
    for i, t in enumerate(turns):
        turn_lines.append(
            f"[{i:02d}] {t.get('speaker', '?')} "
            f"({t.get('duration_sec', 0):.1f}s): {t.get('text', '')}")
        # Include measured word times so within-slide timings are exact
        wt = t.get("word_times", [])
        if wt:
            # Compact: only words likely to trigger visuals (nouns/proper nouns
            # are not POS-tagged; include all words — the LLM filters)
            wt_str = " ".join(f"{w['word']}@{w['start']:.1f}s" for w in wt)
            turn_lines.append(f"  WORD TIMES: {wt_str}")
    if recipe and any(recipe.get(k, 0) for k in ("gap", "offset", "tail")):
        turn_lines.append(
            f"AUDIO RECIPE: {recipe['offset']:.1f}s intro, "
            f"{recipe['gap']:.1f}s silence after every turn, "
            f"{recipe['tail']:.1f}s tail. Scene durations MUST follow: "
            f"first scene = offset + Σ(turn+gap); middle scenes = Σ(turn+gap); "
            f"last scene = Σ(turn+gap) + tail. The compiler rejects "
            f"anything else — do not use raw turn sums.")
    man_lines = []
    for m in manifest:
        man_lines.append(
            f"{m.get('path')} [{m.get('kind', '?')}]: "
            f"{m.get('description', '')}")
    user = DIRECTOR_USER_TEMPLATE.format(
        episode=episode,
        turns="\n".join(turn_lines),
        manifest="\n".join(man_lines) or "(no assets)")
    return user


def build_prompt(episode, turns, manifest, recipe=None, system=None):
    """Render the full director prompt (system + user) as one string.

    system overrides the default (legacy v1) system prompt — model
    providers pass _director_system().
    """
    sys_prompt = SYSTEM_PROMPT if system is None else system
    return (sys_prompt + "\n\n" + _user_block(
        episode, turns, manifest, recipe=recipe))


# ---------------------------------------------------------------- providers

def _provider_mock(episode, turns, manifest, **kwargs):
    """Deterministic stub for tests: one TitleSlide per turn."""
    scenes = []
    for i, t in enumerate(turns):
        words = str(t.get("text", "")).split()
        title = " ".join(words[:8]) or f"Scene {i}"
        dur = t.get("duration_sec", 0)
        if not isinstance(dur, (int, float)) or dur <= 0:
            raise ValueError(
                f"turn {i}: duration_sec must be a number > 0, got {dur!r}")
        scenes.append({
            "id": f"scene-{i:02d}",
            "slide": "TitleSlide",
            "params": {"title": title,
                       "subtitle": str(t.get("speaker", ""))},
            "duration_sec": float(dur),
            "transition": "cut",
            "trans_dur": 0,
            "turns": [i, i],
            "overlays": [],
        })
    return {"version": 1, "episode": episode, "scenes": scenes}


def _provider_agent(episode, turns, manifest, plan_file=None, **kwargs):
    """Print the prompt; read the finished plan back from --plan-file."""
    print(build_prompt(episode, turns, manifest))
    print("\n---\nWrote the director prompt above. "
          "Save the scene plan JSON and pass it back with --plan-file.",
          file=sys.stderr)
    if not plan_file:
        raise SystemExit(
            "agent provider: re-run with --plan-file <path-to-plan.json>")
    with open(plan_file, encoding="utf-8") as f:
        plan = json.load(f)
    if not isinstance(plan, dict) or plan.get("version") != 1:
        raise ValueError("agent provider: plan file must be a v1 scene plan")
    return plan


def _check_model_plan(plan, provider):
    """Fail fast when a model returns a non-plan (wrong shape/version)."""
    if not isinstance(plan, dict) or plan.get("version") != 2 \
            or not isinstance(plan.get("scenes"), list) \
            or not plan["scenes"]:
        excerpt = json.dumps(plan)[:300]
        raise RuntimeError(
            f"{provider} provider: expected a v2 anchored scene plan, got: "
            f"{excerpt}")
    return plan


def _provider_openai(episode, turns, manifest, model="gpt-5",
                     timeout=300, **kwargs):
    """Responses API with structured output (needs OPENAI_API_KEY)."""
    import urllib.request  # noqa: E402

    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    schema = _load_schema()
    body = json.dumps({
        "model": model,
        "input": [
            {"role": "system",
             "content": [{"type": "input_text", "text": _director_system()}]},
            {"role": "user", "content": [{
                "type": "input_text",
                "text": _user_block(episode, turns, manifest)}]}],
        "text": {"format": {
            "type": "json_schema",
            "name": "scene_plan",
            "strict": True,
            "schema": schema,
        }},
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.openai.com/v1/responses", data=body,
        headers={"Authorization": f"Bearer {key}",
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    for item in data.get("output", []):
        if item.get("type") == "message":
            for part in item.get("content", []):
                if part.get("type") == "output_text":
                    return _check_model_plan(json.loads(part["text"]),
                                             "openai")
    raise RuntimeError("openai provider: no output_text in response")


def _provider_ollama(episode, turns, manifest, model=None, timeout=900,
                     host=None, temperature=0.2, num_ctx=16384,
                     **kwargs):
    """Local Ollama chat API in JSON mode (no key needed).

    model defaults to $OLLAMA_MODEL (else qwen3.8:27b); host defaults to
    $OLLAMA_URL (else http://localhost:11434, same as ce-forge). Low
    structure; num_ctx must fit prompt + plan (slice per act).
    """
    import urllib.request  # noqa: E402

    model = model or os.environ.get("OLLAMA_MODEL", "qwen3.8:27b")
    host = (host or os.environ.get("OLLAMA_URL",
                                   "http://localhost:11434")).rstrip("/")
    body = json.dumps({
        "model": model,
        "stream": False,
        "format": "json",
        "messages": [
            {"role": "system", "content": _director_system()},
            {"role": "user",
             "content": _user_block(episode, turns, manifest)},
        ],
        "options": {"temperature": temperature, "num_ctx": num_ctx},
    }).encode("utf-8")
    req = urllib.request.Request(
        host + "/api/chat", data=body,
        headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except OSError as e:
        raise RuntimeError(
            f"ollama provider: cannot reach {host} ({e}); is Ollama "
            f"serving (ollama serve / ollama run {model})?")
    content = (data.get("message") or {}).get("content", "")
    if data.get("done") is False:
        raise RuntimeError(
            "ollama provider: response truncated (done=false); raise "
            "num_ctx or slice fewer turns")
    try:
        plan = json.loads(content)
    except ValueError:
        raise RuntimeError(
            "ollama provider: non-JSON output: " + content[:300])
    return _check_model_plan(plan, "ollama")


_META_MODEL = "muse-spark-1.3-contributor"
_META_BASE = "https://api.meta.ai/v1"


def _strict_schema_for(schema):
    """Narrow a JSON Schema to Meta structured-output subset (meta_api.js port).

    Drops transport-incompatible keywords; every object property becomes
    required (logically-optional ones as anyOf [T, null], stripped from
    the response by _strip_optional_nulls).
    """
    if isinstance(schema, list):
        return [_strict_schema_for(s) for s in schema]
    if not isinstance(schema, dict):
        return schema
    out = {k: _strict_schema_for(v) for k, v in schema.items()
           if k != "uniqueItems"}
    if schema.get("type") == "object" and schema.get("properties"):
        required = set(schema.get("required") or [])
        props = {}
        for key, prop in schema["properties"].items():
            conv = _strict_schema_for(prop)
            props[key] = conv if key in required else {
                "anyOf": [conv, {"type": "null"}]}
        out["properties"] = props
        out["required"] = sorted(schema["properties"])
        out["additionalProperties"] = False
    return out


def _strip_optional_nulls(value, schema):
    """Drop nulls the strict conversion introduced (meta_api.js port)."""
    if isinstance(value, list):
        items = schema.get("items") if isinstance(schema, dict) else None
        return [_strip_optional_nulls(v, items) for v in value]
    if not isinstance(value, dict) or not isinstance(schema, dict):
        return value
    if schema.get("type") == "object" and schema.get("properties"):
        required = set(schema.get("required") or [])
        return {k: _strip_optional_nulls(v, schema["properties"].get(k))
                for k, v in value.items()
                if v is not None or k in required}
    return value


def _director_response_schema():
    """Loose strict-mode schema for director output.

    The full scene_plan_schema.json uses if/then/else (v1/v2 conditional),
    which strict structured-output validators reject. The v6 system prompt
    carries the real contract (as with ollama's schemaless JSON mode) and
    resolve_cues.py + lint + check_word_times validate downstream — the
    schema here only enforces "a v2 plan-shaped object".
    """
    return {"type": "object",
            "properties": {"version": {"type": "integer"},
                           "episode": {"type": "string"},
                           "scenes": {"type": "array"}},
            "required": ["version", "episode", "scenes"]}


def _provider_meta(episode, turns, manifest, model=_META_MODEL,
                   timeout=900, **kwargs):
    """Meta API Responses API, strict JSON schema (needs MODEL_API_KEY).

    stdlib port of sat_question_runner/new_eng_qs/lib/meta_api.js:
    same endpoint ($META_API_BASE_URL), model pin, compatibility note,
    and response parsing. Single user message (system + user concatenated),
    matching the lib's proven call shape.
    """
    import urllib.request  # noqa: E402

    key = os.environ.get("MODEL_API_KEY")
    if not key:
        raise RuntimeError("MODEL_API_KEY is not set")
    if model != _META_MODEL:
        raise RuntimeError(f"Meta API model must be {_META_MODEL}")
    base = os.environ.get("META_API_BASE_URL", _META_BASE).rstrip("/")
    schema = _director_response_schema()
    note = ("\n\nSTRUCTURED OUTPUT NOTE: Every schema property is required "
            "by this API. For logically optional sparse-patch fields, return "
            "null when absent; null optional fields are removed locally "
            "before validation.")
    prompt = _director_system() + "\n" + _user_block(episode, turns, manifest) + note
    body = json.dumps({
        "model": model,
        "input": [{"role": "user",
                   "content": [{"type": "input_text", "text": prompt}]}],
        "text": {"format": {
            "type": "json_schema",
            "name": "scene_plan",
            "strict": True,
            "schema": _strict_schema_for(schema),
        }},
    }).encode("utf-8")
    req = urllib.request.Request(
        base + "/responses", data=body,
        headers={"authorization": f"Bearer {key}",
                 "content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw_body = resp.read().decode("utf-8")
    except OSError as e:
        raise RuntimeError(f"meta provider: request failed: {e}")
    try:
        data = json.loads(raw_body)
    except ValueError:
        raise RuntimeError("meta provider: non-JSON response: "
                           + raw_body[:300])
    text = ""
    if isinstance(data.get("output_text"), str) and data["output_text"].strip():
        text = data["output_text"]
    else:
        for item in data.get("output", []):
            for part in item.get("content", []):
                for key in ("text", "output_text"):
                    val = part.get(key)
                    if isinstance(val, str) and val.strip():
                        text = val
                        break
                if text:
                    break
            if text:
                break
    if not text.strip():
        choices = data.get("choices") or []
        if choices and isinstance((choices[0].get("message") or {}).get(
                "content"), str):
            text = choices[0]["message"]["content"]
    if not text.strip():
        raise RuntimeError("meta provider: response has no output text")
    try:
        plan = _strip_optional_nulls(json.loads(text), schema)
    except ValueError:
        raise RuntimeError("meta provider: non-JSON output: " + text[:300])
    return _check_model_plan(plan, "meta")


PROVIDERS = {
    "mock": _provider_mock,
    "agent": _provider_agent,
    "openai": _provider_openai,
    "ollama": _provider_ollama,
    "meta": _provider_meta,
}


def direct(episode, turns, manifest, provider="mock", **kwargs):
    """Run the director. Returns the scene plan dict."""
    if provider not in PROVIDERS:
        raise ValueError(
            f"unknown director provider {provider!r} "
            f"(expected one of: {', '.join(sorted(PROVIDERS))})")
    if not isinstance(turns, list) or not turns:
        raise ValueError("turns must be a non-empty list")
    return PROVIDERS[provider](episode, turns, manifest or [], **kwargs)


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="LLM director: turns -> scene plan")
    ap.add_argument("--turns", required=True,
                    help="JSON list of {speaker, text, duration_sec}")
    ap.add_argument("--manifest", default="",
                    help="JSON list of {path, kind, description}")
    ap.add_argument("--episode", required=True)
    ap.add_argument("--provider", default="mock",
                    choices=sorted(PROVIDERS))
    ap.add_argument("--plan-file", default="",
                    help="agent provider: read the finished plan from here")
    ap.add_argument("--out", required=True, help="output scene plan JSON")
    args = ap.parse_args(argv)

    with open(args.turns, encoding="utf-8") as f:
        turns = json.load(f)
    manifest = []
    if args.manifest:
        with open(args.manifest, encoding="utf-8") as f:
            manifest = json.load(f)
    plan = direct(args.episode, turns, manifest, provider=args.provider,
                  plan_file=args.plan_file or None)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=1)
    print(f"director ({args.provider}): {len(plan['scenes'])} scenes -> "
          f"{args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
