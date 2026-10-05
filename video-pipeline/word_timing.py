#!/usr/bin/env python3
"""Word-level timing helpers (item 5 of the resilience plan).

Places overlay events (keyword pops, captions) on *computed* word times
instead of eyeballed seconds:

    word_time = turn_start + (word_index / word_count) * turn_duration

`turn_start` comes from the measured audio timeline (timings.json), so a
pop lands on the word even after TTS re-renders change the pacing.

Usage:
    from word_timing import plan_keyword_pops
    pops = plan_keyword_pops(script_turns, timings, ["maize", "Cahokia"])
    # -> [{"word": "maize", "scene": ..., "start": 12.4, "duration": 2.0}, ...]

`script_turns` is the ordered list of dialogue strings (pauses as "").
`timings` is the parsed timings.json dict (turns carry start/dur).
"""
import re

FPS = 30


def _words(text):
    return text.split()


def _norm(w):
    return re.sub(r"[^a-z0-9']", "", w.lower())


def find_word(turns, word):
    """First (turn_idx, word_idx) where `word` appears; None if absent.

    `turns` is a list of dialogue strings. Matching is case-insensitive
    and ignores surrounding punctuation.
    """
    target = _norm(word)
    for ti, text in enumerate(turns):
        for wi, w in enumerate(_words(text)):
            if _norm(w) == target:
                return ti, wi
    return None


def find_phrase(turns, phrase, turn_lo=0, turn_hi=None):
    """First (turn_idx, word_idx) where `phrase` starts; None if absent.

    Matches consecutive words, case-insensitive, punctuation-tolerant.
    Single-word phrases behave like find_word. `turn_lo`/`turn_hi`
    (inclusive) restrict the search to a scene's turn range.
    """
    pwords = [_norm(w) for w in _words(phrase)]
    if not pwords:
        return None
    n = len(pwords)
    hi = len(turns) - 1 if turn_hi is None else turn_hi
    for ti in range(turn_lo, hi + 1):
        words = [_norm(w) for w in _words(turns[ti])]
        for wi in range(len(words) - n + 1):
            if words[wi:wi + n] == pwords:
                return ti, wi
    return None


def word_time(text, word_index, turn_start_sec, turn_duration_sec):
    """Seconds (absolute, episode timeline) when word_index is spoken."""
    words = _words(text)
    if not words:
        raise ValueError("empty turn text")
    if not 0 <= word_index < len(words):
        raise ValueError(f"word_index {word_index} out of range "
                         f"(0..{len(words) - 1})")
    frac = word_index / len(words)
    return turn_start_sec + frac * turn_duration_sec


def word_frame(text, word_index, turn_start_sec, turn_duration_sec, fps=FPS):
    """Frame index when word_index is spoken (cumulative, exact)."""
    return int(round(word_time(text, word_index, turn_start_sec,
                               turn_duration_sec) * fps))


def plan_keyword_pops(script_turns, timings, words, duration=2.0, lead=1.0):
    """Compute keywordpop overlay specs from measured timing.

    Returns a list of {"word", "turn", "start", "duration"} with `start`
    `lead` seconds before the computed word time (clamped >= 0). Words
    not found in the script are reported, not silently dropped.
    """
    tinfo = {int(str(t["turn"]).lstrip("t")): t
             for t in timings.get("turns", [])}
    pops, missing = [], []
    for word in words:
        found = find_word(script_turns, word)
        if found is None:
            missing.append(word)
            continue
        ti, wi = found
        if ti not in tinfo:
            missing.append(f"{word} (turn {ti} not in timings)")
            continue
        t = tinfo[ti]
        start = max(0.0, word_time(script_turns[ti], wi,
                                  float(t["start"]), float(t["dur"])) - lead)
        pops.append({"word": word, "turn": ti,
                     "start": round(start, 2), "duration": duration})
    if missing:
        raise ValueError(f"keywordpop words not placed: {missing}")
    return pops


if __name__ == "__main__":
    import json
    import sys
    # Smoke: python word_timing.py <timings.json> <word> [word ...]
    # reads script turns from stdin as JSON list of strings.
    timings = json.load(open(sys.argv[1], encoding="utf-8"))
    turns = json.load(sys.stdin)
    for p in plan_keyword_pops(turns, timings, sys.argv[2:]):
        print(p)
