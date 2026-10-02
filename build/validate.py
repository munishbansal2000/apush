#!/usr/bin/env python3
"""Repo-wide validator for the AP U.S. History content build.

Enforces schema, metadata vocabularies, structural rules, and Fall 2026 CED
format compliance across every content directory. Read-only: it flags, never
rewrites (content judgments belong to the builder, not the gate).

Run:  python3 build/validate.py
Exit code is nonzero when any gate fails; all failures are printed.

Finished content layers:
  BANK-STAGED  build/reclaim-merged/staged/**/*.json (not _raw/) -- 819 MCQs
  BANK-FRESH   build/fresh-written/*.json top-level gap files -- 429 MCQs
  TESTS        build/tests/test-01..10.json -- 10 x 55 MCQ + 3 SAQ + DBQ + LEQ
  TESTS-RECON  build/reconceived/princeton-t4/t5/t6/test.json -- 3 x 55/3/DBQ/LEQ

Gates:
  MCQ-SCHEMA   every bank MCQ carries the required fields with sane values
  MCQ-VOCAB    period/skill/reasoning/difficulty/themes/source_type/format
               come from the controlled vocabularies. Repo standard uses "&"
               (Developments & Processes, Sourcing & Situation,
               Claims & Evidence in Sources, Continuity & Change); "and"
               variants fail. A skill name in the reasoning field
               (e.g. "Contextualization") fails -- reasoning must be one of
               the 3 reasoning processes.
  MCQ-OPTIONS  4 options labelled (A)-(D), key in A-D, option_explanations
               covers all four letters
  MCQ-EXPLAIN  explanation non-empty (>=40 chars); every option explanation
               non-empty (>=20 chars)
  MCQ-IDFMT    ids are lowercase alnum plus -/_ (no spaces, no uppercase)
  MCQ-IDS      item ids unique within the bank stream and within each test
  MCQ-KEYS     key balance: bank-wide each letter 22-28%; per-file (n>=20)
               no letter over 40%
  MCQ-DIFFICULTY no bank period may be 0% or 100% hard
  LENGTHTELL-RPT report % of bank items where the longest option is the key
               (report-only; the repo's stated bar is 0% strictly-longest)
  ORPHAN-JSON  every build/content JSON is classified: MCQ-BANK-STAGED /
               FRQ-BANK-STAGED / MCQ-BANK-FRESH / SAQ-BANK / TEST /
               TEST-SUPPORT / RAW-STAGING / REFERENCE / REVIEW / VALIDATOR /
               SUPPLEMENTAL (drill-excluded surplus, still in repo);
               anything else fails
  TEST-BANK-SEPARATION  two-stream design: ZERO overlap between test MCQ ids
               and bank ids (the opposite of ap_world's test-bank-link).
               Any overlap fails -- currently the honest backlog.
  SAQ-FORMAT   per test: 3 SAQs, Q1 secondary text / Q2 primary text /
               Q3 non-text, parts a-c present, exemplar present, stimulus
               present, 3 distinct periods
  SAQ-BANK     build/tests/saq-bank sets: 3 questions each, q=1/2/3,
               3 parts, exemplar, stimulus text present
  DBQ-FORMAT   per test: 7 documents, each with non-empty text; doc date
               must parse to a year within 1754-1980
  LEQ-FORMAT   single prompt each, no choice language, prompt >= 40 chars
  TEST-STRUCT  10 tests: 55 MCQ (n=1..55 in order) / 3 SAQ / 7-doc DBQ /
               single-prompt LEQ; no duplicate MCQ ids within a test;
               exact per-test period quotas (U1:3 U2:4 U3:8 U4:7 U5:8
               U6:7 U7:8 U8:7 U9:3); new-format directions only
  TEST-EXPLAIN test-01..10 items carry no explanation/option_explanations
               (keys live only in ANSWER_KEYS.md) -- flagged until the
               student-review layer exists
  LINK-KEYS    ANSWER_KEYS.md: 10 sections x 55 ordered entries
               `n. KEY -- item-id` matching each test's question ids in
               order, keys A-D; reconceived tests carry key in-item
  STIMULUS-SETS test stimuli: text stimuli non-empty, image stimuli carry
               an image reference; declared "Questions a-b refer to" ranges
               must span 3-4 items
  IMAGE-LOCAL  LOCAL-ONLY policy: no http(s) image references anywhere in
               finished-layer JSON (bank + tests + saq-bank + dbq docs).
               Remote URLs fail until localized by the image pass.
  COVERAGE     build/coverage-matrix.json (regenerated each run): per-period
               bank shares vs the plan's weight bands (U1 4-6%, U2 6-8%,
               U3-U8 10-17%, U9 4-6%, +/-1pp tolerance); skill x period
               matrix; each period spans >= 3 themes
  CB-CODES-FILE build/cb-codes.json (the verified official CB code list)
               loads and parses; every code below is checked verbatim
               against it. Any code not in that file is an invention.
  CB-SKILL-CODE every finished-layer MCQ carries skill_code that is one
               of the 17 official sub-codes (1.A-6.D), verbatim; the
               sub-code's parent skill name matches the item's skill.
  CB-TOPIC-CODE every finished-layer MCQ carries topic_code that is one
               of the 105 official topic codes, verbatim; the topic's unit
               prefix matches the item's period.
  CB-NO-INVENTION any skill_code/topic_code value not verbatim in
               build/cb-codes.json fails (no locally invented codes, ever).
"""
import glob
import json
import os
import re
import sys
from collections import Counter, defaultdict

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(REPO, "build")

FAILS = []


def fail(gate, msg):
    FAILS.append(f"[{gate}] {msg}")


# ---------------------------------------------------------------- vocabularies
SKILLS = {
    "Developments & Processes",
    "Sourcing & Situation",
    "Claims & Evidence in Sources",
    "Contextualization",
    "Making Connections",
    "Argumentation",
}
# "and" variants are the ap_world spelling -- wrong here, flag as deviations
AND_VARIANTS = {
    "Developments and Processes": "Developments & Processes",
    "Sourcing and Situation": "Sourcing & Situation",
    "Claims and Evidence in Sources": "Claims & Evidence in Sources",
    "Continuity and Change": "Continuity & Change",
}
REASONING = {"Causation", "Comparison", "Continuity & Change"}
PERIODS = {f"U{i}" for i in range(1, 10)}
DIFFICULTY = {"easy", "medium", "hard"}
THEMES = {"NAT", "WXT", "GEO", "MIG", "PCE", "WOR", "ARC", "SOC"}
SOURCE_TYPES = {"original", "pd-quote", "paraphrase", "fact"}
OLD_FORMAT_PATTERNS = [
    r"choose 1 of 3", r"choose one of three", r"either Q3 or Q4",
    r"answer three of the four", r"complete 3 of 4", r"answer Q1\+Q2",
]
CHOICE_PATTERNS = [
    r"\bchoose (one|1) of (three|3)\b", r"\beither\b.*\bor\b",
    r"\bselect one of the following\b",
]

MCQ_REQUIRED = ["id", "type", "format", "source_type", "inspired_by",
                "period", "skill", "reasoning", "themes", "difficulty",
                "stem", "options", "key", "explanation",
                "option_explanations"]

# per-test period quotas (TEST_BLUEPRINT / plan weights)
TEST_QUOTAS = {"U1": 3, "U2": 4, "U3": 8, "U4": 7, "U5": 8,
               "U6": 7, "U7": 8, "U8": 7, "U9": 3}
# plan weight bands for the bank coverage gate
WEIGHT_BANDS = {"U1": (4, 6), "U2": (6, 8), "U3": (10, 17), "U4": (10, 17),
                "U5": (10, 17), "U6": (10, 17), "U7": (10, 17),
                "U8": (10, 17), "U9": (4, 6)}
WEIGHT_TOL_PP = 1.0


# ------------------------------------------------------------------- layers
def load_items(path):
    """Return the MCQ-ish item list in a JSON file, or None."""
    with open(path) as f:
        d = json.load(f)
    if isinstance(d, list):
        if d and isinstance(d[0], dict) and "stem" in d[0]:
            return d
        return None
    if isinstance(d, dict):
        vals = list(d.values())
        if (vals and isinstance(vals[0], dict) and "stem" in vals[0]
                and "options" in vals[0]):
            return vals  # dict-of-items (fresh-written top-level files)
        for k in ("items", "questions", "mcqs", "bank"):
            v = d.get(k)
            if (isinstance(v, list) and v and isinstance(v[0], dict)
                    and "stem" in v[0]):
                return v
    return None


def bank_mcq_files():
    files = []
    for f in sorted(glob.glob(os.path.join(
            BUILD, "reclaim-merged", "staged", "**", "*.json"),
            recursive=True)):
        if "/_raw/" in f:
            continue
        files.append(f)
    for f in sorted(glob.glob(os.path.join(BUILD, "fresh-written",
                                            "*.json"))):
        files.append(f)
    return files


def bank_mcqs():
    """Yield (path, item) for every finished bank-layer MCQ."""
    for path in bank_mcq_files():
        items = load_items(path)
        if items and all(isinstance(i, dict) for i in items):
            if items and items[0].get("type") == "mcq":
                for it in items:
                    yield path, it


def test_paths():
    tens = [os.path.join(BUILD, "tests", f"test-{n:02d}.json")
            for n in range(1, 11)]
    recon = [os.path.join(BUILD, "reconceived", f"princeton-t{i}",
                          "test.json") for i in (4, 5, 6)]
    return tens, recon


def load_test(path):
    with open(path) as f:
        return json.load(f)


# ================================================================ MCQ gates
def gate_mcq_schema(items):
    for path, it in items:
        for f in MCQ_REQUIRED:
            # inspired_by documents book provenance -- genuinely original
            # items have no book source, so it is required only for
            # reclaimed source_types (paraphrase / pd-quote / fact)
            if f == "inspired_by" and it.get("source_type") == "original":
                continue
            if f not in it or it[f] is None:
                fail("MCQ-SCHEMA",
                     f"{it.get('id', '?')} in {rel(path)}: missing/None field '{f}'")
        if it.get("type") not in (None, "mcq"):
            fail("MCQ-SCHEMA",
                 f"{it.get('id', '?')} in {rel(path)}: type={it.get('type')!r}")
        opts = it.get("options")
        if isinstance(opts, list) and len(opts) != 4:
            fail("MCQ-SCHEMA",
                 f"{it.get('id', '?')} in {rel(path)}: options len={len(opts)}")
        elif isinstance(opts, list):
            bad = [o for o in opts if not isinstance(o, str)]
            if bad:
                fail("MCQ-SCHEMA",
                     f"{it.get('id', '?')} in {rel(path)}: {len(bad)} options "
                     f"are dicts, not labelled strings ('A. ...') -- "
                     f"mixed option schema in file")
        th = it.get("themes")
        if isinstance(th, list) and not th:
            fail("MCQ-SCHEMA",
                 f"{it.get('id', '?')} in {rel(path)}: empty themes list")


def rel(path):
    return os.path.relpath(path, REPO)


def gate_mcq_vocab(bank_items, test_items):
    def check(tag, layer, path, it):
        iid = it.get("id", "?")
        skill = it.get("skill")
        if skill in AND_VARIANTS:
            fail("MCQ-VOCAB",
                 f"{layer} {iid}: skill uses 'and' spelling "
                 f"{skill!r} -- repo standard is {AND_VARIANTS[skill]!r}")
        elif skill and skill not in SKILLS:
            fail("MCQ-VOCAB", f"{layer} {iid}: unknown skill {skill!r}")
        rsn = it.get("reasoning")
        if rsn and rsn not in REASONING:
            if rsn in SKILLS or rsn in AND_VARIANTS:
                fail("MCQ-VOCAB",
                     f"{layer} {iid}: reasoning field holds a SKILL name "
                     f"{rsn!r} -- must be one of {sorted(REASONING)}")
            else:
                fail("MCQ-VOCAB",
                     f"{layer} {iid}: unknown reasoning {rsn!r}")
        per = it.get("period")
        if per and per not in PERIODS:
            fail("MCQ-VOCAB", f"{layer} {iid}: unknown period {per!r}")
        diff = it.get("difficulty")
        if diff and diff not in DIFFICULTY:
            fail("MCQ-VOCAB", f"{layer} {iid}: unknown difficulty {diff!r}")
        th = it.get("themes")
        if isinstance(th, list):
            for t in th:
                if t not in THEMES:
                    fail("MCQ-VOCAB",
                         f"{layer} {iid}: unknown theme {t!r}")
        st = it.get("source_type")
        if st and st not in SOURCE_TYPES:
            fail("MCQ-VOCAB",
                 f"{layer} {iid}: unknown source_type {st!r}")
        fmt = it.get("format")
        if fmt and fmt != "new":
            fail("MCQ-VOCAB", f"{layer} {iid}: format={fmt!r} (want 'new')")

    for path, it in bank_items:
        check("MCQ-VOCAB", "bank", path, it)
    for path, it in test_items:
        check("MCQ-VOCAB", "test", path, it)


def gate_mcq_options(items):
    """Options must be 4 labelled strings. The repo carries two label
    conventions -- 'A. ...' and '(A) ...' -- both are accepted, but a
    single file must use one convention and labels must sit in A-D order.
    (Task spec: "(A)-(D) labels" required; the glyph choice is reported
    for the owner to settle.)"""
    file_convs = {}
    for path, it in items:
        iid = it.get("id", "?")
        opts = it.get("options") or []
        if len(opts) != 4 or any(not isinstance(o, str) for o in opts):
            continue  # counted in MCQ-SCHEMA
        convs = set()
        ordered = True
        for pos, (letter, opt) in enumerate(zip("ABCD", opts)):
            m = re.match(r"^\(([A-D])\)\s", opt)
            if m:
                convs.add("paren")
                lab = m.group(1)
            else:
                m = re.match(r"^([A-D])\.\s", opt)
                if m:
                    convs.add("dot")
                    lab = m.group(1)
                else:
                    convs.add("unlabeled")
                    lab = None
            if lab is not None and lab != letter:
                ordered = False
        if "unlabeled" in convs:
            fail("MCQ-OPTIONS",
                 f"{iid} in {rel(path)}: unlabeled options present -- "
                 f"every option must carry an (A)-(D) or A.- style label")
        if len(convs - {"unlabeled"}) > 1:
            fail("MCQ-OPTIONS",
                 f"{iid} in {rel(path)}: mixed label conventions in one item")
        if not ordered:
            fail("MCQ-OPTIONS",
                 f"{iid} in {rel(path)}: labels out of A-D positional order")
        file_convs.setdefault(path, set()).update(convs - {"unlabeled"})
        if it.get("key") not in set("ABCD"):
            fail("MCQ-OPTIONS", f"{iid} in {rel(path)}: bad key {it.get('key')!r}")
        oe = it.get("option_explanations")
        if isinstance(oe, dict):
            for letter in "ABCD":
                if letter not in oe:
                    fail("MCQ-OPTIONS",
                         f"{iid} in {rel(path)}: option_explanations missing {letter}")
        elif oe is not None:
            fail("MCQ-OPTIONS",
                 f"{iid} in {rel(path)}: option_explanations not a dict")
    for path, convs in file_convs.items():
        if len(convs) > 1:
            fail("MCQ-OPTIONS",
                 f"{rel(path)}: mixed option-label conventions in one file "
                 f"({sorted(convs)}) -- pick one")
    paren_files = sum(1 for c in file_convs.values() if c == {"paren"})
    dot_files = sum(1 for c in file_convs.values() if c == {"dot"})
    print(f"[MCQ-OPTIONS] label conventions by file: paren-style={paren_files} "
          f"dot-style={dot_files}")


def gate_mcq_explain(items):
    for path, it in items:
        iid = it.get("id", "?")
        expl = it.get("explanation") or ""
        if len(expl) < 30:
            fail("MCQ-EXPLAIN",
                 f"{iid} in {rel(path)}: explanation too short "
                 f"({len(expl)} chars, want >=30)")
        oe = it.get("option_explanations") or {}
        for letter in "ABCD":
            v = oe.get(letter) or ""
            if len(v) < 20:
                fail("MCQ-EXPLAIN",
                     f"{iid} in {rel(path)}: option_explanations[{letter}] "
                     f"too short ({len(v)} chars, want >=20)")


def gate_mcq_idfmt(items):
    for path, it in items:
        iid = it.get("id")
        if not iid or not re.match(r"^[a-z0-9][a-z0-9_\-]*$", iid):
            fail("MCQ-IDFMT", f"bad id format {iid!r} in {rel(path)}")


def gate_mcq_ids(bank_items, test_tens, test_recon):
    seen = {}
    for path, it in bank_items:
        iid = it.get("id")
        if iid in seen:
            fail("MCQ-IDS",
                 f"duplicate bank id {iid!r}: {rel(seen[iid])} and {rel(path)}")
        else:
            seen[iid] = path
    for path in test_tens + test_recon:
        t = load_test(path)
        ids = [i.get("id") for i in t["section_1a"]["items"]]
        dupes = [k for k, c in Counter(ids).items() if c > 1]
        for d in dupes:
            fail("MCQ-IDS", f"duplicate id {d!r} within {rel(path)}")


def gate_mcq_keys(bank_items):
    keys = [it.get("key") for _, it in bank_items]
    keys = [k for k in keys if k in set("ABCD")]
    n = len(keys)
    c = Counter(keys)
    for letter in "ABCD":
        share = 100.0 * c.get(letter, 0) / n if n else 0
        if not (22.0 <= share <= 28.0):
            fail("MCQ-KEYS",
                 f"bank-wide key {letter} at {share:.1f}% (want 22-28%)")
    byfile = defaultdict(list)
    for path, it in bank_items:
        if it.get("key") in set("ABCD"):
            byfile[path].append(it["key"])
    for path, ks in byfile.items():
        if len(ks) >= 20:
            cc = Counter(ks)
            for letter in "ABCD":
                share = 100.0 * cc.get(letter, 0) / len(ks)
                if share > 40.0:
                    fail("MCQ-KEYS",
                         f"{rel(path)} (n={len(ks)}): key {letter} at "
                         f"{share:.1f}% (>40%)")


def gate_mcq_difficulty(bank_items):
    byperiod = defaultdict(list)
    for path, it in bank_items:
        if it.get("period") in PERIODS:
            byperiod[it["period"]].append(it.get("difficulty"))
    for per in sorted(byperiod):
        ds = [d for d in byperiod[per] if d]
        if not ds:
            continue
        hard = sum(1 for d in ds if d == "hard") / len(ds)
        if hard == 0:
            fail("MCQ-DIFFICULTY", f"bank {per}: 0% hard items")
        if hard == 1:
            fail("MCQ-DIFFICULTY", f"bank {per}: 100% hard items")


def gate_lengthtell(bank_items):
    """Report-only: % of items where the longest option is the key."""
    strict = ties = total = 0
    for path, it in bank_items:
        opts = it.get("options") or []
        key = it.get("key")
        if (len(opts) != 4 or key not in set("ABCD")
                or any(not isinstance(o, str) for o in opts)):
            continue
        total += 1
        lens = [len(o) for o in opts]
        keylen = lens["ABCD".index(key)]
        if keylen == max(lens) and lens.count(keylen) == 1:
            strict += 1
        elif keylen == max(lens):
            ties += 1
    pct = 100.0 * strict / total if total else 0
    print(f"[LENGTHTELL-RPT] n={total} strictly-longest-is-key: "
          f"{strict} ({pct:.1f}%), tied-longest-is-key: {ties}")


# ============================================================ layer / orphan
def classify_json(path):
    p = os.path.relpath(path, REPO)
    if p in ("build/cb-codes.json", "build/coverage-matrix.json"):
        return "VALIDATOR"
    if p == "build/image-download-report.json":
        return "GENERATED"
    if p.startswith("build/tagging/") or p.startswith("build/tagging-audit/"):
        return "TAGGING-AUDIT"
    if p.startswith("build/supplemental/"):
        return "SUPPLEMENTAL"
    if any(seg in p for seg in ("/_raw/", "/drafts/", "/audit/",
                                "/audit_stripped/", "/charts/")):
        return "RAW-STAGING"
    if p.startswith("build/released/") or p.startswith("build/cb-packs/"):
        return "REFERENCE"
    if p.startswith("build/reviews/") or p.startswith("build/content/"):
        return "REVIEW"
    if p.startswith("build/reconceived/"):
        return "TEST" if p.endswith("/test.json") else "RAW-STAGING"
    if p.startswith("build/reclaim-merged/staged/"):
        items = load_items(path)
        if items:
            return ("MCQ-BANK-STAGED" if items[0].get("type") == "mcq"
                    else "FRQ-BANK-STAGED")
        return "RAW-STAGING"
    if p.startswith("build/reclaim-merged/"):
        return "REVIEW"
    fw_mcq = {"build/fresh-written/contextualization.json",
              "build/fresh-written/misc-gaps.json",
              "build/fresh-written/u1-gaps.json",
              "build/fresh-written/u3-gaps.json",
              "build/fresh-written/u4-gaps.json",
              "build/fresh-written/u5-gaps.json",
              "build/fresh-written/u6-gaps.json",
              "build/fresh-written/u9-gaps.json"}
    if p in fw_mcq:
        return "MCQ-BANK-FRESH"
    if p == "build/fresh-written/saq.json":
        return "SAQ-BANK"
    if p.startswith("build/tests/saq-bank/new/"):
        return "RAW-STAGING"
    if p.startswith("build/tests/saq-bank/"):
        return "SAQ-BANK"
    if re.match(r"build/tests/test-\d\d\.json$", p):
        return "TEST"
    if p.startswith("build/tests/visual-pool/") and p.endswith(".json"):
        return "TEST-SUPPORT"
    if p in ("build/tests/doc_images.json", "build/tests/_selection.json",
             "build/tests/tag_overrides.json"):
        return "TEST-SUPPORT"
    return None


def gate_orphan_json():
    seen = Counter()
    for path in sorted(glob.glob(os.path.join(REPO, "build", "**",
                                               "*.json"), recursive=True)):
        cls = classify_json(path)
        if cls is None:
            fail("ORPHAN-JSON",
                 f"unclassified JSON: {os.path.relpath(path, REPO)}")
        else:
            seen[cls] += 1
    for path in sorted(glob.glob(os.path.join(REPO, "content", "**",
                                               "*.json"), recursive=True)):
        cls = classify_json(path)
        if cls is None:
            fail("ORPHAN-JSON",
                 f"unclassified JSON: {os.path.relpath(path, REPO)}")
        else:
            seen[cls] += 1
    print("[ORPHAN-JSON] classes: " +
          ", ".join(f"{k}={v}" for k, v in sorted(seen.items())))


def gate_test_bank_separation(bank_ids, tens, recon):
    test_ids = set()
    for path in tens + recon:
        t = load_test(path)
        for i in t["section_1a"]["items"]:
            test_ids.add(i.get("id"))
    overlap = sorted(test_ids & bank_ids)
    if overlap:
        fail("TEST-BANK-SEPARATION",
             f"{len(overlap)} test MCQ ids also in bank "
             f"(two-stream design requires ZERO overlap): "
             + ", ".join(overlap[:10])
             + (" ..." if len(overlap) > 10 else ""))


# ================================================================ SAQ / DBQ
def gate_saq_format(tens, recon):
    """Per test: 3 SAQs with mandated source types, distinct periods."""
    want = {1: "secondary text", 2: "primary text", 3: "non-text"}
    for path in tens + recon:
        t = load_test(path)
        qs = t["section_1b"].get("questions", [])
        if len(qs) != 3:
            fail("SAQ-FORMAT",
                 f"{rel(path)}: {len(qs)} SAQs (want 3)")
            continue
        periods = []
        for q in qs:
            qn = q.get("q")
            tag = rel(path)
            if qn not in want:
                fail("SAQ-FORMAT", f"{tag}: SAQ with q={qn!r} (want 1/2/3)")
                continue
            sk = {"secondary-text": "secondary text",
                  "primary-text": "primary text"}.get(
                      q.get("source_kind"), q.get("source_kind"))
            if sk != want[qn]:
                fail("SAQ-FORMAT",
                     f"{tag}: Q{qn} source_kind={q.get('source_kind')!r} "
                     f"(mandated {want[qn]!r})")
            parts = q.get("parts") or []
            if not (isinstance(parts, list) and len(parts) == 3
                    and all(isinstance(x, str) and x.strip() for x in parts)):
                fail("SAQ-FORMAT", f"{tag}: Q{qn} parts != 3 non-empty")
            if not q.get("exemplar"):
                fail("SAQ-FORMAT", f"{tag}: Q{qn} missing exemplar")
            stim = q.get("stimulus_text")
            if isinstance(stim, dict):
                stim = stim.get("text")
            if not (stim or "").strip():
                fail("SAQ-FORMAT", f"{tag}: Q{qn} empty stimulus_text")
            if q.get("period") in PERIODS:
                periods.append(q["period"])
        if len(set(periods)) != 3:
            fail("SAQ-FORMAT",
                 f"{rel(path)}: SAQs not in 3 distinct periods: {periods}")


def gate_saq_bank():
    n_files = n_sets = 0
    for path in sorted(glob.glob(os.path.join(
            BUILD, "tests", "saq-bank", "set-*.json"))):
        n_files += 1
        with open(path) as f:
            d = json.load(f)
        items = d.get("items") if isinstance(d, dict) else None
        if items is None:  # plain set shape {id, questions:[...]}
            items = d.get("questions") if isinstance(d, dict) else None
        if not isinstance(items, list) or len(items) != 3:
            fail("SAQ-BANK",
                 f"{rel(path)}: expected 3 questions, "
                 f"got {len(items) if isinstance(items, list) else items!r}")
            continue
        n_sets += 1
        for q in items:
            tag = f"{rel(path)}:{q.get('id', '?')}"
            parts = q.get("parts") or []
            if not (isinstance(parts, list) and len(parts) == 3
                    and all(isinstance(x, str) and x.strip() for x in parts)):
                fail("SAQ-BANK", f"{tag}: parts != 3 non-empty")
            if not q.get("exemplar"):
                fail("SAQ-BANK", f"{tag}: missing exemplar")
            stim = q.get("stimulus") or {}
            if not (stim.get("text") or "").strip():
                fail("SAQ-BANK", f"{tag}: empty stimulus text")
    print(f"[SAQ-BANK] {n_sets}/{n_files} set files well-formed")


def extract_year(text):
    if not text:
        return None
    m = re.search(r"\b(1[6-9]\d{2}|20\d{2})\b", str(text))
    if m:
        return int(m.group(1))
    m = re.search(r"\b(1[6-9]\d0)s\b", str(text))  # "1930s" -> mid-decade
    return int(m.group(1)) + 5 if m else None


def gate_dbq_format(tens):
    n_missing = n_unparse = n_range = n_empty = 0
    for path in tens:
        t = load_test(path)
        docs = t["section_2a"]["dbq"].get("documents", [])
        if len(docs) != 7:
            fail("DBQ-FORMAT",
                 f"{rel(path)}: {len(docs)} docs (want 7)")
        for d in docs:
            tag = f"{rel(path)} doc {d.get('n')}"
            text = (d.get("text") or "").strip()
            if len(text) < 20:
                n_empty += 1
                fail("DBQ-FORMAT", f"{tag}: empty/short doc text")
            if not d.get("kind"):
                fail("DBQ-FORMAT", f"{tag}: missing doc kind")
            if d.get("date") is None:
                n_missing += 1
            year = extract_year(d.get("date"))
            if d.get("date") is not None and year is None:
                n_unparse += 1
                fail("DBQ-FORMAT",
                     f"{tag}: date unparseable: {d.get('date')!r}")
            if year is not None and not (1754 <= year <= 1980):
                n_range += 1
                fail("DBQ-FORMAT",
                     f"{tag}: doc year {year} outside 1754-1980")
    if n_missing:
        fail("DBQ-FORMAT",
             f"{n_missing} docs have date=None (year unverifiable)")


def gate_leq_format(tens):
    for path in tens:
        t = load_test(path)
        leq = t["section_2b"].get("leq", {})
        prompt = (leq.get("prompt") or "").strip()
        if len(prompt) < 40:
            fail("LEQ-FORMAT",
                 f"{rel(path)}: LEQ prompt too short/missing")
        blob = prompt + " " + (leq.get("guidance") or "")
        for pat in CHOICE_PATTERNS:
            if re.search(pat, blob, re.I):
                fail("LEQ-FORMAT",
                     f"{rel(path)}: LEQ shows old-format choice language "
                     f"({pat!r})")
                break


# =========================================================== test structure
def gate_test_struct(tens, recon):
    for path in tens + recon:
        t = load_test(path)
        tag = rel(path)
        items = t["section_1a"].get("items", [])
        if len(items) != 55:
            fail("TEST-STRUCT", f"{tag}: {len(items)} MCQs (want 55)")
        for it in items:  # student-facing options must be labelled
            opts = it.get("options") or []
            for pos, (letter, opt) in enumerate(zip("ABCD", opts)):
                if not (isinstance(opt, str)
                        and re.match(rf"^(\({letter}\)|{letter}\.)\s", opt)):
                    fail("TEST-STRUCT",
                         f"{tag}: {it.get('id')} option {letter} unlabelled "
                         f"or misordered")
                    break
        if path in tens:  # the 10 blueprint tests carry n=1..55 in order
            for expect, it in enumerate(items, start=1):
                if it.get("n") != expect:
                    fail("TEST-STRUCT",
                         f"{tag}: item n={it.get('n')} at position {expect} "
                         f"(n must run 1..55 in order)")
                    break
        if len(t["section_1b"].get("questions", [])) != 3:
            fail("TEST-STRUCT", f"{tag}: SAQ count != 3")
        if len(t["section_2a"]["dbq"].get("documents", [])) != 7:
            fail("TEST-STRUCT", f"{tag}: DBQ doc count != 7")
        if not (t["section_2b"].get("leq", {}).get("prompt") or "").strip():
            fail("TEST-STRUCT", f"{tag}: LEQ prompt missing")
        dirs = (t["section_1a"].get("directions", "")
                + t["section_1b"].get("directions", ""))
        for pat in OLD_FORMAT_PATTERNS:
            if re.search(pat, dirs, re.I):
                fail("TEST-STRUCT",
                     f"{tag}: old-format language in directions ({pat!r})")
                break
    for path in tens:  # quota check on the 10 blueprint tests
        t = load_test(path)
        per = Counter(i.get("period")
                      for i in t["section_1a"]["items"]
                      if i.get("period") in PERIODS)
        for unit, want in TEST_QUOTAS.items():
            if per.get(unit, 0) != want:
                fail("TEST-STRUCT",
                     f"{rel(path)}: {unit} has {per.get(unit, 0)} items "
                     f"(quota {want})")


def gate_test_explain(tens):
    """test-01..10 items carry no explanations -- student-review gap."""
    missing = 0
    for path in tens:
        t = load_test(path)
        for i in t["section_1a"]["items"]:
            if not (i.get("explanation") or i.get("option_explanations")):
                missing += 1
    if missing:
        fail("TEST-EXPLAIN",
             f"{missing} test items have no explanation/option_explanations "
             f"(keys live only in ANSWER_KEYS.md) -- student review layer "
             f"missing")


def parse_answer_keys():
    path = os.path.join(BUILD, "tests", "ANSWER_KEYS.md")
    sections = {}
    cur = None
    with open(path) as f:
        for line in f:
            m = re.match(r"##\s+test-(\d+)", line)
            if m:
                cur = f"test-{int(m.group(1)):02d}"
                sections[cur] = []
                continue
            m = re.match(r"^(\d+)\.\s+([A-D])\s+[—\-–]\s+(\S+)\s*$", line)
            if m and cur:
                sections[cur].append((int(m.group(1)), m.group(2),
                                      m.group(3)))
    return sections


def gate_link_keys(tens):
    sections = parse_answer_keys()
    for path in tens:
        t = load_test(path)
        name = os.path.basename(path).replace(".json", "")
        entries = sections.get(name)
        tag = rel(path)
        if entries is None:
            fail("LINK-KEYS", f"{tag}: no '## {name}' section in "
                 f"ANSWER_KEYS.md")
            continue
        if len(entries) != 55:
            fail("LINK-KEYS", f"{tag}: ANSWER_KEYS.md has {len(entries)} "
                 f"entries (want 55)")
        items = t["section_1a"]["items"]
        for (n, key, iid), it in zip(entries, items):
            if n != it.get("n"):
                fail("LINK-KEYS",
                     f"{tag}: ANSWER_KEYS entry {n} != item n={it.get('n')}")
            if iid != it.get("id"):
                fail("LINK-KEYS",
                     f"{tag}: entry {n} id {iid!r} != item id "
                     f"{it.get('id')!r}")
    # reconceived tests carry the key in-item
    for path in test_paths()[1]:
        t = load_test(path)
        bad = [i.get("id") for i in t["section_1a"]["items"]
               if i.get("key") not in set("ABCD")]
        if bad:
            fail("LINK-KEYS",
                 f"{rel(path)}: {len(bad)} items with bad/missing in-item key")


def gate_stimulus_sets(tens, recon):
    for path in tens + recon:
        t = load_test(path)
        for it in t["section_1a"]["items"]:
            stim = it.get("stimulus") or {}
            if isinstance(stim, str):
                if not stim.strip():
                    continue  # bare-string stimulus, empty -- flagged below
                stim = {"kind": "text", "text": stim}
            kind = stim.get("kind")
            iid = it.get("id")
            if kind == "text" and not (stim.get("text") or "").strip():
                fail("STIMULUS-SETS",
                     f"{iid} in {rel(path)}: kind=text but empty text")
            if kind == "image" and not (stim.get("image_url")
                                        or stim.get("image_path")
                                        or (stim.get("text") or "").strip()):
                fail("STIMULUS-SETS",
                     f"{iid} in {rel(path)}: kind=image with no image "
                     f"reference at all")
            m = re.search(r"Questions?\s+(\d+)\s*[–\-]\s*(\d+)\s+refer",
                          stim.get("text") or "")
            if m:
                span = int(m.group(2)) - int(m.group(1)) + 1
                if not (3 <= span <= 4):
                    fail("STIMULUS-SETS",
                         f"{iid} in {rel(path)}: declared stimulus set "
                         f"{m.group(1)}-{m.group(2)} spans {span} items "
                         f"(CB sets are 3-4)")


# ========================================================== image-locality
IMG_FIELDS = ("image_url", "stimulus_asset", "image", "image_path",
              "asset_path")
IMG_EXT = re.compile(r"\.(jpe?g|png|gif|svg|webp)(\?|$)", re.I)


def is_remote_image_ref(key, value):
    if not isinstance(value, str) or not value.startswith(("http://",
                                                            "https://")):
        return False
    kl = key.lower()
    if "image" in kl or "asset" in kl or "stimulus" in kl:
        return True
    return bool(IMG_EXT.search(value))


def walk_strings(obj, cb, path=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            cb(k, v, f"{path}/{k}")
            walk_strings(v, cb, f"{path}/{k}")
    elif isinstance(obj, list):
        for j, v in enumerate(obj):
            walk_strings(v, cb, f"{path}[{j}]")


def gate_image_local(bank_items, tens, recon):
    remote = []
    missing = []

    def scan(key, value, where):
        if not isinstance(value, str) or not value:
            return
        if key not in IMG_FIELDS:
            return  # captions / source_page / prose are not image refs
        if value.startswith(("http://", "https://")):
            remote.append(f"{where}: {value[:90]}")
        elif not value.startswith("data:"):
            p = os.path.join(REPO, value.lstrip("/"))
            if not os.path.exists(p):
                missing.append(f"{where}: local image not found: {value[:80]}")

    def scan_item(tag, it):
        walk_strings(it, lambda k, v, w: scan(k, v, f"{tag}{w}"))
        if it.get("image_unavailable"):
            missing.append(f"{tag}: image_unavailable flagged")

    for path, it in bank_items:
        scan_item(f"bank:{it.get('id')}", it)
    for path in tens + recon:
        t = load_test(path)
        for it in t["section_1a"]["items"]:
            scan_item(f"{rel(path)}:{it.get('id')}", it)
        for q in t["section_1b"].get("questions", []):
            scan_item(f"{rel(path)}:{q.get('id')}", q)
        for d in t["section_2a"]["dbq"].get("documents", []):
            scan_item(f"{rel(path)}:doc{d.get('n')}", d)
    for sp in sorted(glob.glob(os.path.join(
            BUILD, "tests", "saq-bank", "set-*.json"))):
        with open(sp) as f:
            d = json.load(f)
        items = d.get("items") or d.get("questions") or []
        for q in items:
            scan_item(f"{rel(sp)}:{q.get('id')}", q)

    if remote:
        fail("IMAGE-LOCAL",
             f"{len(remote)} remote image refs (local-only policy): "
             + "; ".join(remote[:8])
             + (" ..." if len(remote) > 8 else ""))
    if missing:
        fail("IMAGE-LOCAL",
             f"{len(missing)} missing/flagged local images: "
             + "; ".join(missing[:8])
             + (" ..." if len(missing) > 8 else ""))


# ================================================================ coverage
def gate_coverage(bank_items):
    items = [(p, it) for p, it in bank_items
             if it.get("period") in PERIODS]
    n = len(items)
    per = Counter(it["period"] for _, it in items)
    matrix = {per_: {s: 0 for s in sorted(SKILLS)} for per_ in sorted(PERIODS)}
    themes = {per_: set() for per_ in PERIODS}
    for _, it in items:
        matrix[it["period"]][it["skill"]] += 1
        for th in it.get("themes") or []:
            themes[it["period"]].add(th)
    cov = {"periods": {}, "skill_x_period": matrix,
           "themes_per_period": {p: sorted(t) for p, t in themes.items()}}
    for unit in sorted(PERIODS):
        share = 100.0 * per.get(unit, 0) / n if n else 0
        lo, hi = WEIGHT_BANDS[unit]
        ok = (lo - WEIGHT_TOL_PP) <= share <= (hi + WEIGHT_TOL_PP)
        cov["periods"][unit] = {"n": per.get(unit, 0),
                                "share_pct": round(share, 1),
                                "band": [lo, hi], "in_band": ok}
        if not ok:
            fail("COVERAGE",
                 f"bank {unit}: {share:.1f}% of bank vs plan weight "
                 f"{lo}-{hi}% (n={per.get(unit, 0)})")
        if len(themes[unit]) < 3:
            fail("COVERAGE",
                 f"bank {unit}: only {len(themes[unit])} themes covered "
                 f"(want >=3)")
    with open(os.path.join(BUILD, "coverage-matrix.json"), "w") as f:
        json.dump(cov, f, indent=1)
    print(f"[COVERAGE] bank n={n}; matrix -> build/coverage-matrix.json")


# ================================================================== CB codes
def load_cb_codes():
    path = os.path.join(BUILD, "cb-codes.json")
    if not os.path.exists(path):
        fail("CB-CODES-FILE", "build/cb-codes.json missing")
        return None
    with open(path) as f:
        d = json.load(f)
    skills = d.get("skills", [])
    topics = d.get("topics", [])
    n_skills = len(skills)
    n_topics = len(topics)
    if n_skills != 17:
        fail("CB-CODES-FILE",
             f"build/cb-codes.json has {n_skills} skills (want 17: 1.A-6.D)")
    if n_topics < 100:
        fail("CB-CODES-FILE",
             f"build/cb-codes.json has {n_topics} topics (want 105)")
    seen = Counter()
    for t in topics:
        code = t.get("code")
        seen[code] += 1
        if str(t.get("unit")) != str(code).split(".")[0]:
            fail("CB-CODES-FILE",
                 f"topic {code}: unit field {t.get('unit')!r} != code prefix")
    dupes = [c for c, k in seen.items() if k > 1]
    if dupes:
        fail("CB-CODES-FILE", f"duplicate topic codes: {dupes}")
    return d


def norm_skill(name):
    """cb-codes.json carries CB's own 'and' spelling; the repo item
    standard is '&'. Both name the same six skills."""
    return (name or "").replace(" and ", " & ")


def gate_cb_codes(bank_items, tens, recon, cb):
    if not cb:
        return
    skill_codes = {s["code"]: s for s in cb.get("skills", [])}
    topic_codes = {t["code"]: t for t in cb.get("topics", [])}
    parent_of = {code: norm_skill(s.get("skill"))
                 for code, s in skill_codes.items()}
    unit_of = {code: str(t.get("unit")) for code, t in topic_codes.items()}
    n_tagged = n_missing = 0

    def scan(tag, it):
        nonlocal n_tagged, n_missing
        iid = it.get("id")
        sc, tc = it.get("skill_code"), it.get("topic_code")
        if not sc or not tc:
            n_missing += 1
            return
        n_tagged += 1
        if sc not in skill_codes:
            fail("CB-NO-INVENTION",
                 f"{tag} {iid}: skill_code {sc!r} not in build/cb-codes.json")
        elif parent_of[sc] != norm_skill(it.get("skill")):
            fail("CB-SKILL-CODE",
                 f"{tag} {iid}: skill_code {sc} parents to "
                 f"{parent_of[sc]!r} but item skill is {it.get('skill')!r}")
        if tc not in topic_codes:
            fail("CB-NO-INVENTION",
                 f"{tag} {iid}: topic_code {tc!r} not in build/cb-codes.json")
        elif "U" + unit_of[tc] != it.get("period"):
            fail("CB-TOPIC-CODE",
                 f"{tag} {iid}: topic_code {tc} is unit {unit_of[tc]} but "
                 f"item period is {it.get('period')!r}")

    for path, it in bank_items:
        scan("bank", it)
    for path in tens + recon:
        t = load_test(path)
        for it in t["section_1a"]["items"]:
            scan(rel(path), it)
    if n_missing:
        fail("CB-SKILL-CODE",
             f"{n_missing} finished-layer items lack skill_code")
        fail("CB-TOPIC-CODE",
             f"{n_missing} finished-layer items lack topic_code")
    print(f"[CB-CODES] tagged={n_tagged} missing={n_missing}")


# ==================================================================== main
def main():
    print("== apush validator ==")
    bank_items = list(bank_mcqs())
    print(f"bank MCQs: {len(bank_items)}")
    bank_ids = {it.get("id") for _, it in bank_items}
    tens, recon = test_paths()
    for p in tens + recon:
        if not os.path.exists(p):
            fail("TEST-STRUCT", f"missing test file {rel(p)}")
    tens = [p for p in tens if os.path.exists(p)]
    recon = [p for p in recon if os.path.exists(p)]
    test_items = []
    for p in tens + recon:
        t = load_test(p)
        test_items += [(p, i) for i in t["section_1a"]["items"]]

    gate_orphan_json()
    gate_mcq_schema(bank_items)
    gate_mcq_vocab(bank_items, test_items)
    gate_mcq_options(bank_items)
    gate_mcq_explain(bank_items)
    gate_mcq_idfmt(bank_items)
    gate_mcq_ids(bank_items, tens, recon)
    gate_mcq_keys(bank_items)
    gate_mcq_difficulty(bank_items)
    gate_lengthtell(bank_items)
    gate_test_bank_separation(bank_ids, tens, recon)
    gate_saq_format(tens, recon)
    gate_saq_bank()
    gate_dbq_format(tens + recon)
    gate_leq_format(tens + recon)
    gate_test_struct(tens, recon)
    gate_test_explain(tens)
    gate_link_keys(tens)
    gate_stimulus_sets(tens, recon)
    gate_image_local(bank_items, tens, recon)
    gate_coverage(bank_items)
    cb = load_cb_codes()
    gate_cb_codes(bank_items, tens, recon, cb)

    print()
    if FAILS:
        print(f"FAIL: {len(FAILS)} failures")
        for f in FAILS:
            print("  " + f)
        sys.exit(1)
    print("ALL GATES GREEN")


if __name__ == "__main__":
    main()
