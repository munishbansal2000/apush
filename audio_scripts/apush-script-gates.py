#!/usr/bin/env python3
"""Hard gates for Maya + Marcus APUSH episode scripts.

Usage:
    python3 apush-script-gates.py <script.md> [--minutes 8]

Exit 0: every hard gate passed (warnings may still need a human eye).
Exit 1: at least one hard gate failed.

Every gate below was learned across E1 v1-v11. Gates catch the mechanical
tells; G12 is a regression net over the fact registry (it cannot verify new
claims -- see apush-script-guide.md for the fact-check layer).
"""
import os
import re
import sys

WPM_CAP = 180

BANNED_STARTERS = re.compile(r"^(\"[^\"]*\"\s*)?(That's|Here's|Here is)\b")
# G1 is a density gate: 1-2 in an episode is human; 3+ is the tic.
BANNED_STARTER_LIMIT = 3
CURRICULUM_JARGON = re.compile(
    r"\b(objective (one|two|three|1|2|3)|LO\d+|causal chain|historiography|"
    r"learning objectives?)\b",
    re.IGNORECASE,
)
EXAM_CLICHE = re.compile(r"\bexam (counts|loves)\b", re.IGNORECASE)
PAUSE_TAG = re.compile(r"\[[^\]\n]*pause[^\]\n]*\]", re.IGNORECASE)
# 2026-10-07: Fish direction tags ([confident tone], [chuckle], …) are render
# instructions, not spoken words. Strip them from turn bodies at parse time so
# no gate counts, matches, or sentence-splits on tag text. Pause tags are a
# subset — G7 still reads them from the raw text, not from parsed bodies.
# Emphatic negation (were not, was not) and uncontractible forms
# (it was, that was) are exempt -- only flag likely stiffness.
UNCONTRACTED = re.compile(
    r"\b(it is|that is|this is|there is|do not|does not|did not|can not|"
    r"could not|will not|would not|should not|I am|you are|we are|they are)\b",
    re.IGNORECASE,
)
TRIPLE = re.compile(r",[^,?!]{1,40}, and |\bno \w+, no \w+")
MONTHS = re.compile(
    r"\b(January|February|March|April|May|June|July|August|September|"
    r"October|November|December)\b"
)
# G9: "Not X, just Y" punchline antitheses
ANTI = [
    # ", not <up to 4 words>." — the X, not Y punchline family ("Gasoline,
    # not the spark." / "the trigger, not the cause."). 2026-10-07 (U6-L6):
    # the old single-word pattern missed two-word closers like ", not the
    # spark." — six instances sailed through the gate. Budget: <3 per episode.
    re.compile(r",\s*not\s+\w+(\s+\w+){0,3}(?=[.!?;])"),
    re.compile(r"didn['\u2019]t \w+, (they|it|he|she|we) \w+"),
    re.compile(r"\bnot \w+( \w+)?, just\b"),
]
# G10: phrases retired series-wide — never again, in any episode
RETIRED = [
    "that's the last of it",
    "there's a twist", "then a twist", "but here's the twist",
    "here's the twist",
    "here's the nuance",
    "now the box that matters most",
    "that's what makes it tricky",
    "on this much, historians agree",
]
ENTER_NAME = re.compile(r"^Enter [A-Z]")
# G11: school-safe vocabulary (APUSH = high school; content filters exist)
PROFANITY = re.compile(
    r"\b(fuck(er|ing)?|shit(ter|ty)?|bitch|asshole|dick|pussy|cunt)\b",
    re.IGNORECASE,
)
# 2026-10-06: generic speaker pattern — hardcoding guest names kept missing
# debate voices (Brutus/Henry/Jeffersonian/Haswell, Sepulveda w/o accent, …).
# Matches any line-leading "Name:" label; NON_SPEAKER blocklist excludes
# stage directions (SCREEN:) and self-test question numbers (Two:/Three:).
# G13: spoken CER labels — "Claim:/Evidence:/Reasoning:" aloud is bad TTS
# (banned 2026-10-06, user order, no exceptions). The CER logic stays;
# the labels must be carried by natural connective tissue.
CER_LABEL = re.compile(r"\b(Claim|Evidence|Reasoning):")
# G12: known-falsehood regression. Patterns come from apush-fact-registry.yaml
# (sibling of this script, else ./apush-fact-registry.yaml). Every corrected
# factual error must add its falsehood pattern there, or it will regress.
def load_registry():
    cands = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     "apush-fact-registry.yaml"),
        os.path.join(os.getcwd(), "apush-fact-registry.yaml"),
    ]
    for p in cands:
        if os.path.exists(p):
            import yaml
            with open(p) as f:
                return yaml.safe_load(f).get("facts", [])
    return []


def registry_hits(spoken, facts):
    # A "don't write that [falsehood]" pedagogical construction explicitly
    # labels the falsehood as wrong — it must not trip the gate. Skip any
    # match whose sentence carries a negation frame. 2026-10-06: extended to
    # the "common mistake" / "students write" frames — e.g. Students write
    # "Jackson banned paper money." He didn't. — which quote the error only
    # to refute it. 2026-10-07 (U6-L6): "students? write" only matched bare
    # "write" — extended to writes/wrote/written; added the "is wrong" /
    # "that's wrong" debunking frame ("the 'Hoover did nothing' line is
    # wrong") — same pedagogical family as "classic mistake".
    NEG_FRAME = re.compile(
        r"\b(don't|do not|never)\s+(write|say|claim|argue)\s+that\b"
        r"|\bcommon mistake\b"
        r"|\bclassic mistake\b"
        r"|\btrap (check|answer)\b"
        r"|\breal error\b"
        r"|\bstudents?\s+(writ\w*|wrote)\b"
        r"|\b(is|that's|that is|you're|you are)\s+wrong\b",
        re.IGNORECASE,
    )
    out = []
    # A mid-episode wrong beat: one voice states the falsehood and a
    # DIFFERENT voice corrects it in the immediately following turn
    # ("Common mix-up..." / "that's the legend"). The falsehood is being
    # taught as wrong, not as fact — the same principle as NEG_FRAME, but
    # distributed across two turns. The correction marker must be a strong
    # signal ("actually" alone is too common to count). 2026-10-07: added
    # after U6-L1 v2's Maya/Standard-Oil wrong beat tripped the writer's
    # own new F-U6-006 pattern; the wrong beat is a house device the gate
    # must recognize, not punish.
    CORRECTION_MARK = re.compile(
        r"\bmix[\s-]?up\b|\bnot quite\b|\blegend\b|\bmyth\b"
        r"|\bnot exactly\b|\bthat's not\b|\bcommon mistake\b",
        re.IGNORECASE,
    )
    for fact in facts:
        guards = [re.compile(g, re.IGNORECASE)
                  for g in fact.get("guards", []) or []]
        for pat in fact.get("falsehoods", []) or []:
            try:
                rx = re.compile(pat, re.IGNORECASE)
            except re.error:
                continue
            for i, (ln, spk, b) in enumerate(spoken):
                matched = None
                for s in sentences(b):
                    if rx.search(s) and not NEG_FRAME.search(s) \
                            and not any(g.search(s) for g in guards):
                        matched = s
                        break
                if matched is None:
                    continue
                if i + 1 < len(spoken):
                    _, spk2, b2 = spoken[i + 1]
                    if spk2 != spk and CORRECTION_MARK.search(b2):
                        continue
                out.append((ln, fact["id"], pat, matched[:70]))
                break
    return out
NON_SPEAKER = frozenset({
    "SCREEN",
    "ONE", "TWO", "THREE", "FOUR", "FIVE",
    "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
})
SPEAKER = re.compile(r"^([A-ZÀ-Þ][A-Za-zÀ-ÿ.'-]{0,39}):\s*(.*)$")


def parse(path):
    text = open(path).read()
    notes, spoken = [], []
    last_spk, in_footer = None, False
    for i, line in enumerate(text.split("\n"), 1):
        if line.startswith("#"):
            if line.startswith("## Sources"):
                in_footer = True
            notes.append(line)
            continue
        if in_footer:
            continue
        m = SPEAKER.match(line)
        if m and m.group(1).upper() not in NON_SPEAKER:
            last_spk = m.group(1)
            body = re.sub(r"\[[^\]\n]+\]", "", m.group(2)).strip()
            body = re.sub(r"\s+", " ", body)
            spoken.append((i, m.group(1), body))
        elif (line.strip() and last_spk
              and not line.strip().startswith(("[", "**", "---", "- "))):
            # Continuation paragraph of the current speaker's turn.
            # 2026-10-07: cold-open continuations carry no speaker label;
            # they were skipped entirely — silently undercounting words and
            # dodging every gate (incl. G12). Bracketed pause-tag lines,
            # markdown bullets/rules/headers, and the Sources footer stay out.
            body = re.sub(r"\[[^\]\n]+\]", "", line.strip())
            body = re.sub(r"\s+", " ", body).strip()
            if body:
                spoken.append((i, last_spk, body))
    return text, "\n".join(notes), spoken


def sentences(body):
    # Protect honorifics from sentence splitting: "Mr. Lincoln" is one
    # sentence, not a "Mr." button-word (2026-10-06 G6 false positive).
    body = re.sub(r"\b(Mr|Mrs|Ms|Dr|St)\.\s+", "\\1\0 ", body)
    return [s.strip().replace("\x00", ".")
            for s in re.split(r"(?<=[.?!])\s+", body) if s.strip()]


def norm(s):
    return re.sub(r"\s+", " ", s).strip().lower()


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        return 0
    path = sys.argv[1]
    minutes = float(sys.argv[sys.argv.index("--minutes") + 1]) \
        if "--minutes" in sys.argv else 8

    text, notes, spoken = parse(path)
    fails, warns = [], []

    def check(gate_id, ok, detail=""):
        (fails if not ok else []).append((gate_id, detail))

    # G1: banned sentence starters (density gate -- the tic is the habit).
    # Checked per sentence, not per turn: mid-turn "That's the X." is the
    # same tic. 2026-10-06: was turn-start only, missed guest lines.
    hits = [(ln, s[:60]) for ln, _, b in spoken
            for s in sentences(b) if BANNED_STARTERS.match(s)]
    check("G1 starter density < 3", len(hits) < BANNED_STARTER_LIMIT,
          "; ".join(f"L{ln}: {b}" for ln, b in hits))

    # G2: curriculum jargon in dialogue
    hits = [(ln, b[:60]) for ln, _, b in spoken if CURRICULUM_JARGON.search(b)]
    check("G2 curriculum jargon", not hits,
          "; ".join(f"L{ln}: {b}" for ln, b in hits))

    # G3: exam-pitch cliches
    hits = [(ln, b[:60]) for ln, _, b in spoken if EXAM_CLICHE.search(b)]
    check("G3 exam-pitch cliches", not hits,
          "; ".join(f"L{ln}: {b}" for ln, b in hits))

    # G4: pacing cap. Pause tags are stripped: production removes them, so
    # they are not spoken words. 2026-10-06: previously counted as words,
    # producing false FAILs on scripts with several [N-second pause] tags.
    words = sum(len(PAUSE_TAG.sub("", b).split()) for _, _, b in spoken)
    wpm = words / minutes
    check("G4 pacing <= 180 WPM", wpm <= WPM_CAP,
          f"{wpm:.0f} WPM ({words} words / {minutes:g} min)")

    # G5: verbatim repeated sentences (>= 5 words)
    seen, dupes = {}, set()
    for _, _, b in spoken:
        for s in sentences(b):
            if len(s.split()) >= 5:
                k = norm(s)
                if k in seen:
                    dupes.add(s)
                seen[k] = True
    check("G5 no verbatim repeats", not dupes, "; ".join(sorted(dupes)))

    # G6: button-word loops (tiny sentence used 3+ times)
    tiny = {}
    for _, _, b in spoken:
        for s in sentences(b):
            if 1 <= len(s.split()) <= 3:
                k = norm(s.rstrip(".?!"))
                tiny[k] = tiny.get(k, 0) + 1
    loops = {k: c for k, c in tiny.items() if c >= 3}
    check("G6 no button-word loops", not loops,
          "; ".join(f'"{k}" x{c}' for k, c in sorted(loops.items())))

    # G7: pause tags named in the read note
    used = set(PAUSE_TAG.findall(text))
    unnamed = [t for t in used if t not in notes]
    check("G7 pause tags in read note", not unnamed,
          "; ".join(sorted(unnamed)))

    # G8: em-dash density (the 30+ tic, not the occasional beat)
    dashes = sum(b.count("\u2014") for _, _, b in spoken)
    check("G8 em-dash density <= 10", dashes <= 10,
          f"{dashes} em-dashes in dialogue")

    # G9: antithesis budget (max 2 punchline "Not X, just Y" shapes)
    anti_hits = [(ln, s[:60]) for ln, _, b in spoken
                 for s in sentences(b)
                 if any(rx.search(s) for rx in ANTI)]
    check("G9 antithesis budget < 3", len(anti_hits) < 3,
          "; ".join(f"L{ln}: {s}" for ln, s in anti_hits))

    # G10: retired phrases — used once, never again
    retired_hits = []
    for ln, _, b in spoken:
        low = b.lower()
        hit = next((p for p in RETIRED if p in low), None)
        if not hit and ENTER_NAME.match(b):
            hit = "Enter [Name]"
        if hit:
            retired_hits.append((ln, hit, b[:50]))
    check("G10 no retired phrases", not retired_hits,
          "; ".join(f"L{ln} ({p}): {b}" for ln, p, b in retired_hits))

    # G11: school-safe vocabulary
    prof_hits = [(ln, b[:60]) for ln, _, b in spoken if PROFANITY.search(b)]
    check("G11 school-safe vocabulary", not prof_hits,
          "; ".join(f"L{ln}: {b}" for ln, b in prof_hits))

    # G12: known-falsehood regression against the fact registry
    reg = load_registry()
    fh_hits = registry_hits(spoken, reg)
    check("G12 no known falsehoods", not fh_hits,
          "; ".join(f"L{ln} [{fid}] /{pat}/: {b}"
                    for ln, fid, pat, b in fh_hits)
          + ("" if reg else " (registry not found — gate blind)"))
    if not reg:
        warns.append(("G12 registry missing",
                      "apush-fact-registry.yaml not found; falsehood check skipped"))

    # G13: spoken CER labels — bad TTS, banned 2026-10-06, no exceptions
    cer_hits = [(ln, b[:60]) for ln, _, b in spoken if CER_LABEL.search(b)]
    check("G13 no spoken CER labels", not cer_hits,
          "; ".join(f"L{ln}: {b}" for ln, b in cer_hits))

    # W1: uncontracted stiffness
    hits = [(ln, m.group(0)) for ln, _, b in spoken
            for m in UNCONTRACTED.finditer(b)]
    if hits:
        warns.append(("W1 uncontracted phrasing",
                      f"{len(hits)}x e.g. L{hits[0][0]}: '{hits[0][1]}'"))

    # W2: triple / parallel-structure heuristic (long sentences only --
    # short lists like "corn, beans, and squash" are content, not style;
    # date appositives like "October 12, 1492, in the Bahamas" are dismissed)
    hits = [(ln, s[:60]) for ln, _, b in spoken
            for s in sentences(b)
            if len(s.split()) >= 12 and TRIPLE.search(s)
            and not MONTHS.search(s)]
    if hits:
        warns.append(("W2 possible triples",
                      "; ".join(f"L{ln}: {s}" for ln, s in hits[:5])))

    # W3: Maya question ratio
    maya = [b for _, sp, b in spoken if sp == "Maya"]
    if maya:
        q = sum(1 for b in maya if b.rstrip().endswith("?"))
        if q / len(maya) > 0.6:
            warns.append(("W3 Maya mostly asks",
                          f"{q}/{len(maya)} of her lines end in '?'"))

    # W4: standalone micro-turns (a whole turn of <= 4 words). Checkoffs,
    # recap labels and the tagline landing are intentional and routinely sum
    # to ~7; warn only if it becomes a habit.
    micros = [(ln, sp, b) for ln, sp, b in spoken if len(b.split()) <= 4]
    if len(micros) > 8:
        warns.append(("W4 micro-turn pile-up",
                      "; ".join(f"L{ln}: {b}" for ln, _, b in micros[:8])))

    # W5: "exactly" repeats
    n = sum(len(re.findall(r"\bexactly\b", b, re.IGNORECASE))
            for _, _, b in spoken)
    if n >= 2:
        warns.append(("W5 'exactly' repeats", f"{n}x"))

    # W7: Maya declarative presence (not just questions and checkoffs)
    maya_decl = [b for _, sp, b in spoken
                 if sp == "Maya" and not b.rstrip().endswith("?")
                 and len(b.split()) > 6]
    if len(maya_decl) < 4:
        warns.append(("W7 Maya mostly reacts",
                      f"only {len(maya_decl)} declarative Maya turns"))

    # W6: word-count floor (thin for the slot)
    if words < 1150:
        warns.append(("W6 thin script",
                      f"{words} words for {minutes:g} min (target 1150-1350)"))

    print(f"--- {path} ({words} words, {wpm:.0f} WPM @ {minutes:g} min) ---")
    for gid, detail in fails:
        print(f"FAIL {gid}" + (f": {detail}" if detail else ""))
    # re-run passing gates for the report
    passed = ["G1 starter density < 3", "G2 curriculum jargon",
              "G3 exam-pitch cliches", "G4 pacing <= 180 WPM",
              "G5 no verbatim repeats", "G6 no button-word loops",
              "G7 pause tags in read note", "G8 em-dash density <= 10",
              "G9 antithesis budget < 3", "G10 no retired phrases",
              "G11 school-safe vocabulary", "G12 no known falsehoods",
              "G13 no spoken CER labels"]
    failed_ids = {f[0].split()[0] for f in fails}
    for g in passed:
        if g.split()[0] not in failed_ids:
            print(f"PASS {g}")
    for wid, detail in warns:
        print(f"WARN {wid}: {detail}")
    print("RESULT:", "FAIL" if fails else "PASS")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
