"""Direction tags for TTS performance.

Narration text may carry bracket commands (the system from video/UNIT-1-PLAN.md):

    [beat]                 half-second dramatic pause
    [pause:N]              timed silence, N seconds (e.g. [pause:2])
    [slow]...[/slow]       rate shift down for landings
    [fast]...[/fast]       rate shift up for lists and triads
    [emphasis]...[/emphasis]  stressed phrase
    [wry] [awed] [solemn] [fierce] [whisper] [urgent]   emotional color
    [refrain]...[/refrain] the memory line, delivered identically every time
    [es]...[/es]           Spanish/Nahuatl name or phrase, read with Spanish
                           phonology (<lang xml:lang="es-ES"> on Edge)
    [date:1491]            a year, guaranteed to read as "fourteen ninety-one"
                           (<say-as interpret-as="date"> on Edge)
    [fierce:1.5]           emotion tags take an optional intensity 0.5-2.0
                           (Edge styledegree; Fish picks the stronger marker)
    [VOICE:name]           speaker switch mid-scene; name must be in tts.voices

Compilation targets:
  - Edge: full SSML (breaks, prosody, emphasis, mstts expressive styles,
    <lang>, <say-as>, styledegree, <voice>).
  - Fish: the cloud API takes plain text, so performance tags are converted
    to punctuation pauses ([beat] -> ",", [pause:N] -> "." / "...") and
    stripped otherwise; [es]/[date:] keep their text; [VOICE:name] splits
    the narration into per-voice segments. Emotion tags compile to Fish's
    native (parenthesis) markers only when fish_emotion_markers is enabled
    in tts settings -- off by default until a human ear-checks that the
    target model honors them instead of speaking them literally.

A hard gate (gates.direction_gate) enforces: every tag is known and well-formed,
every [VOICE:name] resolves against tts.voices, and every narration carries at
least one direction tag -- performance direction is mandatory, not optional.
"""
from __future__ import annotations

import re

from .common import PipelineError

# tag -> kind. "pair" tags require a matching [/tag]; "point" tags stand alone;
# "param" tags take a colon argument. Emotion point tags also accept an
# optional :intensity suffix, e.g. [fierce:1.5].
_PAIR_TAGS = {"slow", "fast", "emphasis", "refrain", "es"}
_POINT_TAGS = {"beat", "wry", "awed", "solemn", "fierce", "whisper", "urgent"}
_PARAM_TAGS = {"pause", "VOICE", "date"}
_KNOWN = _PAIR_TAGS | _POINT_TAGS | _PARAM_TAGS

_TAG_RE = re.compile(r"\[(/?)([A-Za-z]+)(?::([^\]]+))?\]")

# mstts expressive styles are approximate by design; documented here so the
# mapping is a conscious choice, not an accident.
_EMOTION_STYLE = {
    "wry": "friendly",
    "awed": "excited",
    "solemn": "sad",
    "fierce": "angry",
    "whisper": "whispering",
    "urgent": "excited",
}


def parse(text: str, where: str) -> list[tuple]:
    """Tokenize narration into ('text', str) and ('tag', name, arg, closing) items.

    Raises PipelineError on unknown tags, unclosed pairs, or mis-nested pairs.
    """
    items: list[tuple] = []
    stack: list[str] = []
    pos = 0
    for match in _TAG_RE.finditer(text):
        start, end = match.span()
        if start > pos:
            items.append(("text", text[pos:start]))
        closing, name, arg = match.group(1), match.group(2), match.group(3)
        if name not in _KNOWN:
            raise PipelineError(f"{where}: unknown direction tag [{name}]")
        if name in _PARAM_TAGS and arg is None:
            raise PipelineError(f"{where}: [{name}] requires an argument, e.g. [{name}:2]")
        if name == "pause":
            try:
                value = float(arg)
            except (TypeError, ValueError):
                raise PipelineError(f"{where}: [pause:{arg}] is not a number") from None
            if not 0 < value <= 10:
                raise PipelineError(f"{where}: [pause:{arg}] must be between 0 and 10 seconds")
        if name == "date":
            if not (arg or "").isdigit() or not 100 <= int(arg) <= 2100:
                raise PipelineError(
                    f"{where}: [date:{arg}] must be a year like 1492")
        if name in _EMOTION_STYLE and arg is not None:
            try:
                degree = float(arg)
            except ValueError:
                raise PipelineError(
                    f"{where}: [{name}:{arg}] intensity must be a number") from None
            if not 0.5 <= degree <= 2.0:
                raise PipelineError(
                    f"{where}: [{name}:{arg}] intensity must be between 0.5 and 2.0")
        if closing:
            if name not in _PAIR_TAGS:
                raise PipelineError(f"{where}: [/{name}] has no opening pair")
            if not stack or stack[-1] != name:
                raise PipelineError(f"{where}: [/{name}] closes {stack[-1] if stack else 'nothing'}")
            stack.pop()
            items.append(("tag", name, arg, True))
        else:
            if name in _PAIR_TAGS:
                stack.append(name)
            items.append(("tag", name, arg, False))
        pos = end
    if pos < len(text):
        items.append(("text", text[pos:]))
    if stack:
        raise PipelineError(f"{where}: unclosed direction tag [{stack[-1]}]")
    return items


def tag_names(text: str) -> set[str]:
    """All tag names used in text (validates as a side effect)."""
    names = set()
    for item in parse(text, "narration"):
        if item[0] == "tag":
            names.add(item[1])
    return names


def _escape(text: str) -> str:
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def to_ssml(text: str, where: str, base_voice: str, voices: dict) -> str:
    """Compile narration with direction tags to an SSML document for Edge.

    A stack machine keeps the XML well-formed: pair tags close in LIFO
    order (inner emotion colors close first), emotion colors auto-close at
    voice switches and at the end of the document.
    """
    parts: list[str] = []
    stack: list[tuple[str, str]] = []  # (tag, element), innermost last

    def close_element(tag: str, element: str) -> None:
        parts.append("</mstts:express-as>" if element == "express-as"
                     else f"</{element}>")

    for item in parse(text, where):
        if item[0] == "text":
            parts.append(_escape(item[1]))
            continue
        _, name, arg, closing = item
        if name == "beat":
            parts.append('<break time="500ms"/>')
        elif name == "pause":
            parts.append(f'<break time="{float(arg) * 1000:.0f}ms"/>')
        elif name in _PAIR_TAGS:
            if closing:
                # parse() guarantees LIFO nesting; close inner emotions first
                while stack and stack[-1][0] == "emotion":
                    _, element = stack.pop()
                    close_element("emotion", element)
                if name in ("slow", "fast"):
                    stack.pop()
                    parts.append("</prosody>")
                elif name == "emphasis":
                    stack.pop()
                    parts.append("</emphasis>")
                elif name == "es":
                    stack.pop()
                    parts.append("</lang>")
                else:  # refrain opened prosody + emphasis
                    stack.pop()
                    stack.pop()
                    parts.append("</emphasis></prosody>")
            elif name == "slow":
                parts.append('<prosody rate="slow">')
                stack.append((name, "prosody"))
            elif name == "fast":
                parts.append('<prosody rate="fast">')
                stack.append((name, "prosody"))
            elif name == "emphasis":
                parts.append('<emphasis level="strong">')
                stack.append((name, "emphasis"))
            elif name == "es":
                parts.append('<lang xml:lang="es-ES">')
                stack.append((name, "lang"))
            else:  # refrain
                parts.append('<prosody rate="slow"><emphasis level="moderate">')
                stack.append((name, "prosody"))
                stack.append((name, "emphasis"))
        elif name in _EMOTION_STYLE:
            if closing:
                continue  # emotions are point tags; no closing form
            style = _EMOTION_STYLE[name]
            if arg is not None:
                parts.append(
                    f'<mstts:express-as style="{style}" '
                    f'styledegree="{float(arg):g}">')
            else:
                parts.append(f'<mstts:express-as style="{style}">')
            stack.append(("emotion", "express-as"))
        elif name == "date":
            parts.append(f'<say-as interpret-as="date">{_escape(arg)}</say-as>')
        elif name == "VOICE":
            edge_voice = voices.get(arg, {}).get("edge_voice")
            if not edge_voice:
                raise PipelineError(f"{where}: [VOICE:{arg}] has no edge_voice in tts.voices")
            while stack:  # new speaker starts clean
                _, element = stack.pop()
                close_element("", element)
            parts.append(f'</voice><voice name="{edge_voice}">')
    while stack:
        _, element = stack.pop()
        close_element("", element)
    body = "".join(parts)
    return (
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
        'xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">'
        f'<voice name="{base_voice}">{body}</voice></speak>'
    )


# Fish's native (parenthesis) emotion markers, from the FishAudio S1/S2 docs.
# Only emitted when fish_emotion_markers is enabled in tts settings; the
# default strips emotion tags exactly as before.
_FISH_EMOTION = {
    "wry": "sarcastic",
    "awed": "astonished",
    "solemn": "serious",
    "fierce": "angry",
    "whisper": "whispering",
    "urgent": "impatient",
}
# fierce at intensity >= 1.5 gets the stronger marker.
_FISH_EMOTION_STRONG = {"fierce": "furious"}


def strip_for_fish(text: str, where: str, fish_emotion_markers: bool = False) -> str:
    """Convert direction tags to punctuation Fish renders naturally.

    [es]...[/es] keeps its text (Fish is multilingual); [date:1491] keeps
    the year; emotion tags become (parenthesis) markers only when
    fish_emotion_markers is True, and are dropped otherwise.
    """
    out: list[str] = []
    for item in parse(text, where):
        if item[0] == "text":
            out.append(item[1])
            continue
        _, name, arg, _closing = item
        if name == "beat":
            out.append(",")
        elif name == "pause":
            out.append("..." if float(arg) >= 2 else ".")
        elif name == "date":
            out.append(arg)
        elif name in _EMOTION_STYLE and fish_emotion_markers:
            marker = _FISH_EMOTION[name]
            if arg is not None and float(arg) >= 1.5:
                marker = _FISH_EMOTION_STRONG.get(name, marker)
            out.append(f" ({marker}) ")
        # slow/fast/emphasis/refrain/es/VOICE have no Fish equivalent;
        # VOICE is handled by segment splitting, the rest are dropped.
    return "".join(out)


def voice_segments(text: str, where: str,
                   fish_emotion_markers: bool = False) -> list[tuple[str | None, str]]:
    """Split narration on [VOICE:name] into (voice_name_or_None, plain_text).

    Each chunk keeps its raw tags through the split so strip_for_fish can
    convert them; empty chunks are dropped.
    """
    parse(text, where)  # full validation first; pairs may not span a switch
    spans: list[tuple[str | None, str]] = []
    current: str | None = None
    last = 0
    for match in _TAG_RE.finditer(text):
        if match.group(2) == "VOICE":
            spans.append((current, text[last:match.start()]))
            current = match.group(3)
            last = match.end()
    spans.append((current, text[last:]))
    segments = [(voice, strip_for_fish(chunk, where, fish_emotion_markers))
                for voice, chunk in spans]
    segments = [(voice, chunk) for voice, chunk in segments if chunk.strip()]
    if not segments:
        raise PipelineError(f"{where}: narration is empty")
    return segments
