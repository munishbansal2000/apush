#!/usr/bin/env python3
"""Hard gates for Maya + Marcus APUSH episode scripts.

Usage:
    python3 apush-script-gates.py <script.md> [--minutes 8]

Exit 0: every hard gate passed (warnings may still need a human eye).
Exit 1: at least one hard gate failed.

Every gate below was learned across E1 v1-v11. Gates catch the mechanical
tells; they cannot catch voice, facts, or fun -- see apush-script-guide.md.
"""
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
    re.compile(r",\s*not \w+(?=[.!?,;])"),
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
SPEAKER = re.compile(r"^(Maya|Marcus):\s*(.*)$")


def parse(path):
    text = open(path).read()
    notes, spoken = [], []
    for i, line in enumerate(text.split("\n"), 1):
        if line.startswith("#"):
            notes.append(line)
        else:
            m = SPEAKER.match(line)
            if m:
                spoken.append((i, m.group(1), m.group(2).strip()))
    return text, "\n".join(notes), spoken


def sentences(body):
    return [s.strip() for s in re.split(r"(?<=[.?!])\s+", body) if s.strip()]


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

    # G1: banned sentence starters (density gate -- the tic is the habit)
    hits = [(ln, b[:60]) for ln, _, b in spoken if BANNED_STARTERS.match(b)]
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

    # G4: pacing cap
    words = sum(len(b.split()) for _, _, b in spoken)
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
              "G11 school-safe vocabulary"]
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
