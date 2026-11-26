#!/usr/bin/env python3
"""PassMaster validator (stdlib only). Checks questions/*.json against the
SPEC: required fields, id ranges, topic/skill/theme codes, MCQ option and
rationale rules, FRQ point totals, stimulus-set sizes, duplicate stems,
figure references, and pool quotas. Usage: python3 validate_passmaster.py
[--strict] (strict fails on quota shortfalls; default reports them).
Exit 0 = pass, 1 = fail.
"""
import json, os, re, sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QDIR = os.path.join(ROOT, "questions")
POOL = os.path.expanduser("~/workspace/apush/assets/images")
SKILLS = {"1.A","1.B","2.A","2.B","2.C","3.A","3.B","3.C","3.D","4.A","4.B",
          "5.A","5.B","6.A","6.B","6.C","6.D"}
THEMES = {"NAT","WXT","GEO","MIG","PCE","WOR","ARC","SOC"}
REASONING = {"comparison","causation","continuity-change"}
RANGES = {  # (type, unit) -> (lo, hi) for id numbers
    ("mcq",1):(1,150),("mcq",2):(151,360),("mcq",3):(361,775),("mcq",4):(776,1190),
    ("mcq",5):(1191,1605),("mcq",6):(1606,2020),("mcq",7):(2021,2435),
    ("mcq",8):(2436,2850),("mcq",9):(2851,3000),
    ("saq",1):(1,33),("saq",2):(34,66),("saq",3):(67,100),("saq",4):(101,133),
    ("saq",5):(134,167),("saq",6):(168,200),("saq",7):(201,234),
    ("saq",8):(235,267),("saq",9):(268,300),
    ("dbq",3):(1,17),("dbq",4):(18,34),("dbq",5):(35,51),("dbq",6):(52,68),
    ("dbq",7):(69,84),("dbq",8):(85,100),
    ("leq",1):(1,11),("leq",2):(12,22),("leq",3):(23,33),("leq",4):(34,44),
    ("leq",5):(45,55),("leq",6):(56,66),("leq",7):(67,77),("leq",8):(78,88),
    ("leq",9):(89,100),
}
QUOTAS = {  # unit -> {type: total}
    1:{"mcq":150,"saq":33,"dbq":0,"leq":11}, 2:{"mcq":210,"saq":33,"dbq":0,"leq":11},
    3:{"mcq":415,"saq":34,"dbq":17,"leq":11}, 4:{"mcq":415,"saq":33,"dbq":17,"leq":11},
    5:{"mcq":415,"saq":34,"dbq":17,"leq":11}, 6:{"mcq":415,"saq":33,"dbq":17,"leq":11},
    7:{"mcq":415,"saq":34,"dbq":16,"leq":11}, 8:{"mcq":415,"saq":33,"dbq":16,"leq":11},
    9:{"mcq":150,"saq":33,"dbq":0,"leq":12},
}
TEST_QUOTAS = {  # unit -> {type: test count}
    1:{"mcq":28,"saq":3,"dbq":0,"leq":1}, 2:{"mcq":39,"saq":3,"dbq":0,"leq":1},
    3:{"mcq":76,"saq":4,"dbq":2,"leq":1}, 4:{"mcq":76,"saq":3,"dbq":2,"leq":1},
    5:{"mcq":76,"saq":4,"dbq":2,"leq":1}, 6:{"mcq":76,"saq":3,"dbq":2,"leq":1},
    7:{"mcq":76,"saq":4,"dbq":1,"leq":1}, 8:{"mcq":76,"saq":3,"dbq":1,"leq":1},
    9:{"mcq":27,"saq":3,"dbq":0,"leq":2},
}
TOPIC_QUOTAS_U1 = {  # topic -> {type: count} (Unit 1 only for now)
    "1.1":{"mcq":12,"saq":3,"leq":1}, "1.2":{"mcq":24,"saq":5,"leq":2},
    "1.3":{"mcq":22,"saq":5,"leq":1}, "1.4":{"mcq":28,"saq":6,"leq":2},
    "1.5":{"mcq":24,"saq":5,"leq":2}, "1.6":{"mcq":28,"saq":6,"leq":2},
    "1.7":{"mcq":12,"saq":3,"leq":1},
}

errors, warnings = [], []

def err(msg): errors.append(msg)
def warn(msg): warnings.append(msg)

# Tone (SPEC section 9, LESSON-SPEC section 8): trap language is banned in
# OUR prose. Quoted source text (stimulus.text, DBQ documents) is exempt:
# it is the source's words, not ours.
BANNED_TONE = [
    (r"\btrap\b", "trap"), (r"\btraps\b", "traps"),
    (r"trick question", "trick question"), (r"\bgotcha\b", "gotcha"),
    (r"fall for", "fall for"), (r"designed to catch", "designed to catch"),
    (r"don't be fooled", "don't be fooled"), (r"watch out for", "watch out for"),
    (r"don't fall for", "don't fall for"),
]

def check_tone(text, where):
    if not isinstance(text, str): return
    for pat, label in BANNED_TONE:
        if re.search(pat, text, re.I):
            err(f"{where}: trap/tone language banned phrase {label!r}")

def check_blocks(text, where):
    """Paragraph cap (SPEC section 9): no block over 90 words. Blocks are
    split on blank lines and single newlines (numbered steps are lines)."""
    if not isinstance(text, str): return
    for i, blk in enumerate(re.split(r"\n\s*\n|\n", text)):
        w = len(blk.split())
        if w > 90:
            err(f"{where}: paragraph/block {i} is {w} words (max 90)")

def main():
    strict = "--strict" in sys.argv
    files = sorted(f for f in os.listdir(QDIR) if f.endswith(".json"))
    questions, seen_ids, stems = [], set(), defaultdict(list)
    for f in files:
        path = os.path.join(QDIR, f)
        try:
            q = json.load(open(path, encoding="utf-8"))
        except Exception as e:
            err(f"{f}: unparsable JSON: {e}"); continue
        questions.append((f, q))
        check_common(f, q)
        if q.get("type") == "mcq": check_mcq(f, q)
        elif q.get("type") == "saq": check_saq(f, q)
        elif q.get("type") == "dbq": check_dbq(f, q)
        elif q.get("type") == "leq": check_leq(f, q)
        else: err(f"{f}: unknown type {q.get('type')!r}")
        if q.get("id") in seen_ids: err(f"{f}: duplicate id {q.get('id')}")
        seen_ids.add(q.get("id"))
        stem = (q.get("stem") or q.get("prompt") or "").strip().lower()
        if stem: stems[stem].append(q.get("id"))
    for stem, ids in stems.items():
        if len(ids) > 1: err(f"duplicate stem across {ids}: {stem[:80]!r}")
    check_sets(questions)
    check_figures(questions)
    check_quotas(questions, strict)
    check_key_distribution(questions)
    n_lessons = check_lessons()
    print(f"checked {len(questions)} questions, {n_lessons} lessons: {len(errors)} errors, {len(warnings)} warnings")
    for w in warnings: print("WARN:", w)
    for e in errors: print("ERROR:", e)
    return 1 if errors else 0

LESSON_DIR = os.path.join(ROOT, "lessons")

def check_lessons():
    """LESSON-SPEC sections 2-3, 8: narrative/length/tone bounds."""
    if not os.path.isdir(LESSON_DIR): return 0
    files = sorted(f for f in os.listdir(LESSON_DIR) if f.endswith(".md"))
    for f in files:
        text = open(os.path.join(LESSON_DIR, f), encoding="utf-8").read()
        fm, body = {}, text
        m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
        if m:
            for line in m.group(1).split("\n"):
                if ":" in line:
                    k, v = line.split(":", 1)
                    fm[k.strip()] = v.strip()
            body = m.group(2)
        else:
            warn(f"lessons/{f}: no YAML frontmatter")
        if not fm.get("id"): err(f"lessons/{f}: frontmatter missing id")
        if fm.get("id") and f != f"{fm['id']}.md": err(f"lessons/{f}: filename does not match frontmatter id")
        if not fm.get("topics"): err(f"lessons/{f}: frontmatter missing topics")
        if "grounding:" not in m.group(1): warn(f"lessons/{f}: frontmatter missing grounding")
        # Split body into H2 sections.
        sections = re.split(r"(?m)^##\s+", body)
        opening = sections[0] if sections else ""
        h2 = [s for s in sections[1:]]
        narrative, n_sections = [], 0
        key_terms, worked = 0, 0
        for s in h2:
            title = s.split("\n", 1)[0].strip().lower()
            rest = s.split("\n", 1)[1] if "\n" in s else ""
            if title.startswith("key terms"):
                key_terms = len([l for l in rest.split("\n") if re.match(r"^\s*[-*]\s+\S", l)])
                continue
            if title.startswith("worked items"):
                worked = len(re.findall(r"(?m)^###\s+worked item", rest, re.I))
                continue
            if title.startswith("closing check"):
                continue
            narrative.append(rest)
            n_sections += 1
        nar_words = sum(len(s.split()) for s in narrative) + len(opening.split())
        if nar_words > 1850: err(f"lessons/{f}: narrative {nar_words} words (max about 1800)")
        elif nar_words > 1800: warn(f"lessons/{f}: narrative {nar_words} words (over 1800)")
        if not (4 <= n_sections <= 6): warn(f"lessons/{f}: {n_sections} narrative sections (want 4-6)")
        for i, s in enumerate(narrative):
            w = len(s.split())
            if not (150 <= w <= 300): warn(f"lessons/{f}: section {i+1} is {w} words (want 150-300)")
        if key_terms > 12: err(f"lessons/{f}: {key_terms} key terms (max 12)")
        if worked and not (2 <= worked <= 3): warn(f"lessons/{f}: {worked} worked items (want 2-3)")
        # Paragraphs and tone in the body (blockquotes are quoted sources).
        for i, blk in enumerate(re.split(r"\n\s*\n", body)):
            lines = [l for l in blk.split("\n") if l.strip() and not l.strip().startswith(">")]
            w = len(" ".join(lines).split())
            if w > 90: err(f"lessons/{f}: paragraph {i} is {w} words (max 90)")
        for pat, label in BANNED_TONE:
            for line in body.split("\n"):
                if line.strip().startswith(">"): continue
                if re.search(pat, line, re.I):
                    err(f"lessons/{f}: trap/tone language banned phrase {label!r}")
                    break
        for line in body.split("\n"):
            if re.match(r"^\s*(\*|_)?figure\b", line, re.I):
                w = len(line.split())
                if w > 35: err(f"lessons/{f}: figure caption {w} words (max about 30)")
                elif w > 30: warn(f"lessons/{f}: figure caption {w} words (over 30)")
    return len(files)

def check_common(f, q):
    for field in ("id","type","pool","unit","topics","skills","themes",
                  "reasoning","difficulty","status","source"):
        if field not in q: err(f"{f}: missing {field}")
    m = re.match(r"^apush-(mcq|saq|dbq|leq)-([0-9]{4})$", str(q.get("id","")))
    if not m:
        err(f"{f}: bad id {q.get('id')!r}"); return
    typ, num = m.group(1), int(m.group(2))
    if typ != q.get("type"): err(f"{f}: id infix {typ} != type {q.get('type')}")
    if f != f"{q.get('id')}.json": err(f"{f}: filename does not match id")
    lo, hi = RANGES.get((typ, q.get("unit")), (None, None))
    if lo is None: err(f"{f}: no id range for {typ} unit {q.get('unit')}")
    elif not (lo <= num <= hi): err(f"{f}: id {num} outside range {lo}-{hi} for {typ} U{q.get('unit')}")
    if not (1 <= q.get("unit", 0) <= 9): err(f"{f}: unit out of range")
    topics = q.get("topics") or []
    if topics:
        primary = topics[0]
        if not re.match(r"^[0-9]+\.[0-9]+$", str(primary)): err(f"{f}: bad primary topic {primary!r}")
        elif int(str(primary).split(".")[0]) != q.get("unit"): err(f"{f}: primary topic {primary} not in unit {q.get('unit')}")
        for t in topics:
            if not re.match(r"^[0-9]+\.[0-9]+$", str(t)): err(f"{f}: bad topic {t!r}")
    if not set(q.get("skills") or []) <= SKILLS: err(f"{f}: bad skill code {q.get('skills')}")
    if not (1 <= len(q.get("skills") or []) <= 2): err(f"{f}: skills must be 1-2")
    if not set(q.get("themes") or []) <= THEMES: err(f"{f}: bad theme {q.get('themes')}")
    if q.get("reasoning") not in REASONING: err(f"{f}: bad reasoning {q.get('reasoning')!r}")
    if not (1 <= q.get("difficulty", 0) <= 5): err(f"{f}: difficulty out of 1-5")
    if q.get("pool") not in ("practice","test"): err(f"{f}: bad pool {q.get('pool')!r}")
    if q.get("status") not in ("draft","review","final"): err(f"{f}: bad status {q.get('status')!r}")
    if not q.get("lesson"): warn(f"{f}: no lesson field (tie-out pending, LESSON-SPEC section 4)")
    elif not re.match(r"^apush-u[1-9]-l[0-9]+$", str(q.get("lesson"))): err(f"{f}: bad lesson {q.get('lesson')!r}")
    g = q.get("grounding") or {}
    books = g.get("books") or []
    if not books: err(f"{f}: missing grounding.books (SPEC section 13: every question traces to a book passage)")
    for b in books:
        if b.get("book") not in ("barrons-2027","5steps-2024","princeton-25e"): err(f"{f}: bad grounding book {b.get('book')!r}")
        if not b.get("chapter"): err(f"{f}: grounding book entry needs a chapter")

def check_mcq(f, q):
    opts = q.get("options") or []
    if len(opts) != 4: err(f"{f}: MCQ must have exactly 4 options")
    keys = [o.get("key") for o in opts]
    if keys != ["A","B","C","D"]: err(f"{f}: option keys must be A-D in order")
    if q.get("answerKey") not in keys: err(f"{f}: answerKey {q.get('answerKey')!r} not among options")
    for o in opts:
        if o.get("key") == q.get("answerKey"):
            if "misconception" in o: err(f"{f}: correct option {o['key']} must not carry misconception")
        else:
            if len(str(o.get("misconception",""))) < 10: err(f"{f}: distractor {o.get('key')} needs misconception >= 10 chars")
    r = q.get("rationales") or {}
    for k in ("A","B","C","D"):
        if len(str(r.get(k,"")).strip()) < 25: err(f"{f}: rationale {k} too short or missing")
        lines=[l for l in str(r.get(k,"")).split("\n") if l.strip()]
        if len(lines) > 2: err(f"{f}: rationale {k} is {len(lines)} lines (max 2: error plus fix)")
        check_tone(r.get(k,""), f"{f} rationale {k}")
        check_blocks(r.get(k,""), f"{f} rationale {k}")
    for o in opts:
        check_tone(o.get("text",""), f"{f} option {o.get('key')}")
        check_tone(o.get("misconception",""), f"{f} option {o.get('key')} misconception")
        check_blocks(o.get("text",""), f"{f} option {o.get('key')}")
    check_tone(q.get("stem",""), f"{f} stem")
    check_blocks(q.get("stem",""), f"{f} stem")
    g = str(r.get("general",""))
    if "Remember:" not in g: err(f"{f}: rationales.general must end with a Remember: line")
    words = len(g.split())
    if not (60 <= words <= 120): err(f"{f}: general note {words} words (must be 60-120)")
    check_blocks(g, f"{f} general")
    check_tone(g, f"{f} general")
    # No explanation block longer than the question it explains: the general
    # note (the main block) must stay shorter than stem + stimulus + options.
    qwords = len(str(q.get("stem","")).split())
    qwords += sum(len(str(o.get("text","")).split()) for o in opts)
    st = q.get("stimulus") or {}
    qwords += len(str(st.get("text","")).split())
    if words > qwords: warn(f"{f}: general note {words}w longer than question {qwords}w")
    if not q.get("stem"): err(f"{f}: missing stem")
    if q.get("stimulus") is None: err(f"{f}: missing stimulus object")

def check_saq(f, q):
    parts = q.get("parts") or []
    if len(parts) != 3: err(f"{f}: SAQ must have exactly 3 parts")
    total = 0
    for p in parts:
        if p.get("points") != 1: err(f"{f}: SAQ part {p.get('part')} must be 1 point")
        total += p.get("points", 0)
        if len(str(p.get("modelAnswer",""))) < 30: err(f"{f}: SAQ part {p.get('part')} modelAnswer too short")
        ns = len([x for x in re.split(r"[.!?]\s+", str(p.get("modelAnswer","")).strip()) if x.strip()])
        if not (2 <= ns <= 4): warn(f"{f}: SAQ part {p.get('part')} modelAnswer is {ns} sentences (want 2-4)")
        check_blocks(p.get("modelAnswer",""), f"{f} SAQ part {p.get('part')} modelAnswer")
        check_tone(p.get("modelAnswer",""), f"{f} SAQ part {p.get('part')} modelAnswer")
        check_tone(p.get("prompt",""), f"{f} SAQ part {p.get('part')} prompt")
        check_blocks(p.get("prompt",""), f"{f} SAQ part {p.get('part')} prompt")
        if len(str(p.get("prompt",""))) < 15: err(f"{f}: SAQ part {p.get('part')} prompt too short")
        sc = p.get("scoring") or []
        if sum(s.get("points",0) for s in sc) != 1: err(f"{f}: SAQ part {p.get('part')} scoring must sum to 1")
        for s in sc:
            if len(str(s.get("criterion",""))) < 15: err(f"{f}: SAQ part {p.get('part')} criterion too short")
            check_tone(s.get("criterion",""), f"{f} SAQ part {p.get('part')} criterion")
            check_tone(s.get("notEarned",""), f"{f} SAQ part {p.get('part')} notEarned")
    if q.get("totalPoints") != 3: err(f"{f}: SAQ totalPoints must be 3")
    if q.get("saq_slot") not in (1,2,3): err(f"{f}: saq_slot must be 1, 2, or 3")

def check_rubric(f, q, want):
    rub = q.get("rubric") or []
    total = sum(r.get("points",0) for r in rub)
    if total != want: err(f"{f}: rubric sums to {total}, want {want}")
    for r in rub:
        if len(str(r.get("criterion",""))) < 15: err(f"{f}: rubric criterion too short: {str(r.get('criterion'))[:40]!r}")
        check_tone(r.get("criterion",""), f"{f} rubric criterion")
        check_tone(r.get("notEarned",""), f"{f} rubric notEarned")
        check_blocks(r.get("criterion",""), f"{f} rubric criterion")
    if len(str(q.get("modelOutline",""))) < 30: err(f"{f}: modelOutline too short")
    check_blocks(q.get("modelOutline",""), f"{f} modelOutline")
    check_tone(q.get("modelOutline",""), f"{f} modelOutline")
    check_tone(q.get("prompt",""), f"{f} prompt")
    check_blocks(q.get("prompt",""), f"{f} prompt")

def check_dbq(f, q):
    docs = q.get("documents") or []
    if len(docs) != 7: err(f"{f}: DBQ must have exactly 7 documents")
    for d in docs:
        if len(str(d.get("sourcing",""))) < 10: err(f"{f}: document {d.get('n')} needs sourcing note")
        if d.get("kind") == "text" and len(str(d.get("text",""))) < 20: err(f"{f}: document {d.get('n')} text too short")
    if q.get("totalPoints") != 7: err(f"{f}: DBQ totalPoints must be 7")
    check_rubric(f, q, 7)

def check_leq(f, q):
    if q.get("totalPoints") != 6: err(f"{f}: LEQ totalPoints must be 6")
    check_rubric(f, q, 6)

def check_sets(questions):
    by_set = defaultdict(list)
    for f, q in questions:
        if q.get("type") != "mcq":
            continue  # SAQ stimuli are unique per question; LEQ has none
        s = q.get("stimulus_set")
        if s: by_set[s].append(q["id"])
    for s, ids in by_set.items():
        if not (2 <= len(ids) <= 5): err(f"stimulus set {s}: {len(ids)} questions (want 2-5)")

def check_figures(questions):
    for f, q in questions:
        for fig in list(q.get("figures") or []) + list(q.get("explanation_figures") or []):
            path = os.path.join(POOL, fig.get("file",""))
            if not os.path.isfile(path): err(f"{f}: figure file missing in pool: {fig.get('file')}")
            if len(str(fig.get("alt",""))) < 20: err(f"{f}: figure {fig.get('id')} alt too short")
            if len(str(fig.get("caption","")).split()) > 35: err(f"{f}: figure {fig.get('id')} caption over 35 words")

def check_key_distribution(questions):
    # SPEC section 6: no key position may hold more than 40% or fewer than 10%
    # of a topic's MCQs (topics with 10+ MCQs). A no-content pattern-guesser
    # picking one position must score under 50% on the topic.
    by_topic = defaultdict(Counter)
    for f, q in questions:
        if q.get("type") != "mcq":
            continue
        topics = q.get("topics") or []
        if topics: by_topic[topics[0]][q.get("answerKey")] += 1
    for topic, c in sorted(by_topic.items()):
        total = sum(c.values())
        if total < 10: continue
        for pos in ("A","B","C","D"):
            share = c.get(pos, 0) / total
            if share > 0.40: warn(f"topic {topic}: key {pos} holds {c.get(pos,0)}/{total} ({share:.0%}) — over 40%")
            elif share < 0.10: warn(f"topic {topic}: key {pos} holds {c.get(pos,0)}/{total} ({share:.0%}) — under 10%")

def check_quotas(questions, strict):
    counts = Counter((q["unit"], q["type"]) for _, q in questions if q.get("status")=="final")
    test_counts = Counter((q["unit"], q["type"]) for _, q in questions if q.get("status")=="final" and q.get("pool")=="test")
    for unit in range(1,10):
        for typ, want in QUOTAS[unit].items():
            got = counts.get((unit,typ),0)
            if got != want:
                (err if strict else warn)(f"unit {unit} {typ}: {got}/{want} final")
            tw = TEST_QUOTAS[unit][typ]
            tg = test_counts.get((unit,typ),0)
            if tg != tw:
                (err if strict else warn)(f"unit {unit} {typ} test pool: {tg}/{tw} final")
    u1 = Counter((q["topics"][0], q["type"]) for _, q in questions
                 if q.get("unit")==1 and q.get("status")=="final" and q.get("topics"))
    for topic, want in TOPIC_QUOTAS_U1.items():
        for typ, w in want.items():
            g = u1.get((topic,typ),0)
            if g != w:
                (err if strict else warn)(f"U1 topic {topic} {typ}: {g}/{w} final")

if __name__ == "__main__":
    sys.exit(main())
