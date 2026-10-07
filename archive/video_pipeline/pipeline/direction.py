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
  - Edge: plain text. edge-tts has no SSML passthrough (it XML-escapes
    its input, so markup would be read aloud as literal words), so the
    Edge target compiles tags to punctuation pauses and spoken-out
    years, and [VOICE:name] splits the narration into per-voice
    segments, the same shape as the Fish targets.
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


_ONES = ["zero", "one", "two", "three", "four", "five", "six",
         "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen",
         "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
         "nineteen"]
_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty",
         "seventy", "eighty", "ninety"]


def _under_hundred(n: int) -> str:
    if n < 20:
        return _ONES[n]
    tens, ones = divmod(n, 10)
    return _TENS[tens] if ones == 0 else f"{_TENS[tens]}-{_ONES[ones]}"


def spoken_year(year: int) -> str:
    """Spell out a [date:] year the way a narrator reads it.

    parse() guarantees 100 <= year <= 2100: 1492 -> "fourteen
    ninety-two", 1500 -> "fifteen hundred", 1905 -> "nineteen oh
    five", 2005 -> "two thousand five", 2019 -> "twenty nineteen".
    """
    if year < 1000:
        hundreds, rest = divmod(year, 100)
        if rest == 0:
            return f"{_ONES[hundreds]} hundred"
        return f"{_ONES[hundreds]} hundred {_under_hundred(rest)}"
    high, low = divmod(year, 100)
    if 2000 <= year < 2010:
        return "two thousand" if low == 0 else f"two thousand {_under_hundred(low)}"
    base = _under_hundred(high)
    if low == 0:
        return f"{base} hundred"
    if low < 10:
        return f"{base} oh {_ONES[low]}"
    return f"{base} {_under_hundred(low)}"


def strip_for_edge(text: str, where: str) -> str:
    """Convert direction tags to plain text Edge speaks naturally.

    edge-tts XML-escapes its input, so SSML markup would be read aloud
    as literal words; the Edge target is therefore plain text. Pauses
    become punctuation Edge honors, [date:] years are spelled out, and
    [es]/rate/emphasis/emotion coloring is dropped (inner text kept).
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
            out.append(spoken_year(int(arg)))
        # slow/fast/emphasis/refrain/es/VOICE/emotions have no plain-text
        # equivalent; VOICE is handled by segment splitting.
    return "".join(out)


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


def _voice_spans(text: str, where: str) -> list[tuple[str | None, str]]:
    """Split narration on [VOICE:name] into (voice_name_or_None, raw_chunk).

    Each chunk keeps its raw tags through the split so the caller's
    strip function can convert them.
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
    return spans


def voice_segments(text: str, where: str,
                   fish_emotion_markers: bool = False) -> list[tuple[str | None, str]]:
    """Split narration on [VOICE:name] into (voice_name_or_None, plain_text).

    Each chunk keeps its raw tags through the split so strip_for_fish can
    convert them; empty chunks are dropped.
    """
    segments = [(voice, strip_for_fish(chunk, where, fish_emotion_markers))
                for voice, chunk in _voice_spans(text, where)]
    segments = [(voice, chunk) for voice, chunk in segments if chunk.strip()]
    if not segments:
        raise PipelineError(f"{where}: narration is empty")
    return segments


def edge_timeline(text: str, where: str) -> list[tuple]:
    """Split narration into ('speech', voice, plain_text) / ('silence', seconds).

    [pause:N] becomes real inserted silence instead of "..." -- Edge honors
    "..." with only a short beat, so authored dramatic pauses never landed.
    All other tags compile exactly as strip_for_edge (beat -> ",", [date:]
    spoken out, pair/rate/emphasis/emotion tags dropped with inner text
    kept). Pair tags may span a pause; they are dropped at the item level
    so the split never breaks well-formedness.
    """
    out: list[tuple] = []
    for voice, chunk in _voice_spans(text, where):
        buf: list[str] = []

        def flush() -> None:
            piece = "".join(buf).strip()
            if piece:
                out.append(("speech", voice, piece))
            buf.clear()

        for item in parse(chunk, where):
            if item[0] == "text":
                buf.append(item[1])
                continue
            _, name, arg, _closing = item
            if name == "pause":
                flush()
                out.append(("silence", float(arg)))
            elif name == "beat":
                buf.append(",")
            elif name == "date":
                buf.append(spoken_year(int(arg)))
            # slow/fast/emphasis/refrain/es/VOICE/emotions have no plain-text
            # equivalent and are dropped; VOICE was handled by the split.
        flush()
    if not any(kind == "speech" for kind, *_ in out):
        raise PipelineError(f"{where}: narration is empty")
    return out


def edge_segments(text: str, where: str) -> list[tuple[str | None, str]]:
    """Split narration on [VOICE:name] into (voice_name_or_None, plain_text).

    Mirrors voice_segments for the Edge target: each chunk keeps its raw
    tags through the split so strip_for_edge can convert them; empty
    chunks are dropped.
    """
    segments = [(voice, strip_for_edge(chunk, where))
                for voice, chunk in _voice_spans(text, where)]
    segments = [(voice, chunk) for voice, chunk in segments if chunk.strip()]
    if not segments:
        raise PipelineError(f"{where}: narration is empty")
    return segments
