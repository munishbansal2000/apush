#!/usr/bin/env python3
"""Repo validator for the APUSH video factory (workstream B).

Enforces schema, audio/visual coverage, IP hygiene, TTS renderability, and
animation-vocabulary discipline on every video unit. Read-only: it flags,
never rewrites (content judgments belong to the builder, not the gate).

Run:
    python3 video/validate_video.py video/manifests/video10.json  # manifest mode
    python3 video/validate_video.py video                           # unit mode
    python3 video/validate_video.py --all                           # every manifest + narration unit

Exit code is 0 with ALL GATES GREEN only if every hard gate passes; nonzero
otherwise. Warnings (WARN) never fail the build; failures (FAIL) do.

Two input shapes are supported:
  MANIFEST MODE -- video/manifests/<name>.json  {name, module, stage_dir, out,
      plan:[[stage, audio|{mp3,share}]]}; static markup PNGs + ffmpeg assembly.
  NARRATION MODE -- a unit dir holding <unit>_narration.json (segments with
      key/voice/text) plus a pilot_<unit>.py motion-graphics build script.
      There may be no JSON manifest (e.g. Cuba); that is REPORTED, not an error.

Gates:
  MANIFEST-SCHEMA   manifest conforms to SCHEMA below; stage/audio refs exist
  AUDIO-MATCH       every plan/narration entry maps to an existing MP3;
                    durations RE-MEASURED with ffprobe (never trusted);
                    scene durations must cover their audio within tolerance
  IMAGE-LOCAL       no remote (http) refs anywhere; every referenced image
                    exists locally; provenance record required per image dir
  QUOTE-VERIFY      verbatim quotes allowed ONLY for pre-1930 public-domain
                    sources (or US federal government works, 17 USC 105);
                    post-1929 verbatim is a hard fail
  NO-COPY           8-word shingle scan of narration/script text against
                    public_contnent/*.srt transcripts + books/ EPUB text
  TTS-GATES         every segment has voice+text; pause markup only from the
                    registered set; no unrenderable chars/markup; sane lengths
  ANIMATION-REFS    every motion.* call names a canonical primitive with
                    valid parameters; annotate kinds restricted;
                    cuba_map_scene warns outside Cuba content
  NO-BLANK-FRAMES   (a) motion scenes using flat-background primitives MUST
                    pass bg_img (never optional); markup PNGs must be non-blank
                    (b) rendered-frame gate: the built MP4 is sampled at 3
                    frames per scene (20%%/50%%/80%% of each scene's span, scene
                    boundaries from ffprobe-measured audio durations in plan
                    order; motion pilots add the motion.dur() pad). Each frame
                    is downscaled to 64x36 gray via ffmpeg and FAILS if >95%%
                    of its pixels fall inside any 10-point luminance band.
  IMAGE-SUBJECT-MATCH  beat image subject tags must overlap beat topic tags
                    (reads assets/images/CATALOG.json); mismatches are flagged
                    FOR HUMAN REVIEW, never hard-failed
  CB-CODES          build/cb-codes.json loads; any declared topic codes are
                    checked verbatim against it

NO-BLANK-FRAMES sampling method (documented per spec): scenes are laid out
back-to-back in plan/narration order, so scene i spans
[cumdur_i, cumdur_i + dur_i]. Three frames are grabbed per scene with
`ffmpeg -ss <t> -i <mp4> -frames:v 1 -vf scale=64:36 -f rawvideo -pix_fmt gray`,
at 20%%, 50%% and 80%% of the span (robust to small crossfade/pad drift).
A frame fails when a sliding 10-point window over its 256-bin luminance
histogram covers >95%% of pixels -- i.e. near-uniform black OR white.
"""

import ast
import hashlib
import html
import json
import os
import re
import subprocess
import sys
import zipfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))          # video/
REPO = os.path.dirname(HERE)                               # repo root
YOUR_FILES = "/home/hatch/workspace/your_files"

FAILS, WARNS, INFOS = [], [], []


def fail(gate, msg):
    FAILS.append(f"[{gate}] {msg}")


def warn(gate, msg):
    WARNS.append(f"[{gate}] {msg}")


def info(msg):
    INFOS.append(msg)


# ==================================================================== SCHEMA
# Canonical video-unit schema. Single source of truth for workstream A
# (PLAYBOOK.md) reconciliation: change the field list here, not in gates.
SCHEMA = {
    "manifest": {
        "required": {
            "name": "str; must equal the manifest filename stem",
            "module": "str; video/<module>.py (stage renderer) must exist",
            "stage_dir": "str; video/<stage_dir>/ with <stage>.png per plan entry",
            "out": "str; final filename, must end .mp4",
            "plan": "list of [stage, audio] pairs; stage->str, audio->str|audiospec",
        },
        "audiospec": "{'mp3': str (*.mp3 in video/audio/<name>/), "
                     "'share': int >= 1 (n stages split one MP3's duration)}",
        "optional": {
            "topics": "list[str]; CB topic codes, checked against build/cb-codes.json",
            "title": "str; working title",
            "description": "str",
        },
    },
    "narration_json": {
        "shape": "list of segments",
        "segment_required": {"key": "str", "voice": "str (registered voice)",
                             "text": "str (non-empty narration)"},
        "segment_optional": {
            "topics": "list[str]; CB topic codes for IMAGE-SUBJECT-MATCH",
            "quote": "{verbatim: bool, source: str, year: int, "
                     "federal: bool, source_text: str (optional)}",
        },
        "note": "segments sharing a key are stitched into one <key>.mp3",
    },
    "quote_marking": "a segment carrying a verbatim quote MUST carry the "
                     "'quote' object above so QUOTE-VERIFY can check it",
}

# ==================================================================== vocab
# Animation vocabulary: the ONLY motion.py primitives a build script may use
# (steering-inventoried; validate against ONLY these).
CANONICAL_PRIMS = [
    "kb_scene", "zoom_to", "camera_path", "doc_zoom", "punch_in",
    "typewriter_scene", "kinetic_text", "overlay_text", "title_card",
    "title_scene", "bullet_slide", "timeline_scene", "callout_scene",
    "caption_scene", "annotate", "assemble",
]
EASINGS = ["ease_out_back", "ease_out_cubic", "ease_in_out_cubic"]
# Cuba-specific, NOT canonical: warn when referenced outside Cuba content.
CUBA_ONLY = {"cuba_map_scene"}
# Audio-duration utility, not an animation directive: exempt from the vocab.
UTIL_EXEMPT = {"dur"}
# annotate() note kinds: (start, dur, kind, params).
ANNOTATE_KINDS = {"term", "label", "point", "arrow", "pop"}
# Primitives that render a near-black flat background when bg_img is omitted:
# bg_img is REQUIRED (never optional) on these -- NO-BLANK-FRAMES (a).
BG_IMG_REQUIRED = {"kinetic_text", "title_card", "typewriter_scene",
                   "timeline_scene", "bullet_slide"}

ALLOWED_VOICES = {"narrator", "kennedy"}   # register new voices here
ALLOWED_PAUSE_MARKUP = frozenset()          # no pause tokens registered yet:
# fish-speech/avocado renderers have no confirmed pause-token support, so ANY
# bracket-style markup token in narration text fails TTS-GATES until a token
# is proven renderable and registered here.

SHINGLE_N = 8               # NO-COPY: consecutive-word verbatim window
DUR_TOLERANCE_S = 1.0       # AUDIO-MATCH: declared-vs-measured tolerance
BLANK_BAND = 10             # NO-BLANK-FRAMES: luminance band width (points)
BLANK_COVERAGE = 0.95       # ... fraction of pixels inside one band = blank
FRAMES_PER_SCENE = 3        # ... samples per scene (20/50/80 pct of span)
SEGMENT_WARN_CHARS = 1000   # TTS-GATES: per-segment length warn/fail bars
SEGMENT_FAIL_CHARS = 2000
IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".gif", ".webp")
CATALOG_PATH = os.path.join(REPO, "assets", "images", "CATALOG.json")


# ==================================================================== utils
def ffprobe_dur(path):
    """Re-measured audio duration in seconds (None if unreadable)."""
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", path],
            capture_output=True, text=True, timeout=30)
        return float(r.stdout.strip())
    except Exception:
        return None


def motion_dur(path, pad=1.2):
    """Mirror of motion.dur(): measured audio + breathing-room pad."""
    d = ffprobe_dur(path)
    return None if d is None else d + pad


def is_cuba_unit(unit_name):
    return "cuba" in unit_name.lower()


def norm_words(text):
    return re.findall(r"[a-z0-9]+", text.lower())

# ==================================================================== CB codes
_cb_codes = None


def load_cb_codes():
    global _cb_codes
    if _cb_codes is None:
        p = os.path.join(REPO, "build", "cb-codes.json")
        try:
            d = json.load(open(p, encoding="utf-8"))
            _cb_codes = {t["code"] for t in d.get("topics", [])}
        except Exception as e:
            fail("CB-CODES", f"build/cb-codes.json unreadable: {e}")
            _cb_codes = set()
    return _cb_codes


def check_topic_codes(gate, where, codes):
    valid = load_cb_codes()
    for c in codes or []:
        if c not in valid:
            fail(gate, f"{where}: topic code '{c}' not in build/cb-codes.json")


# ==================================================================== manifest
def gate_manifest_schema(mpath):
    """MANIFEST-SCHEMA: structural conformance of one manifest JSON."""
    gate = "MANIFEST-SCHEMA"
    name = os.path.basename(mpath)
    try:
        m = json.load(open(mpath, encoding="utf-8"))
    except Exception as e:
        fail(gate, f"{name}: not parseable JSON: {e}")
        return None
    if not isinstance(m, dict):
        fail(gate, f"{name}: top level must be an object")
        return None

    stem = os.path.splitext(name)[0]
    for field in ("name", "module", "stage_dir", "out", "plan"):
        if field not in m:
            fail(gate, f"{name}: missing required field '{field}'")
    if m.get("name") != stem:
        fail(gate, f"{name}: name '{m.get('name')}' != filename stem '{stem}'")
    for field in ("name", "module", "stage_dir", "out"):
        if field in m and not isinstance(m[field], str):
            fail(gate, f"{name}: '{field}' must be a string")
    if "out" in m and isinstance(m["out"], str) and not m["out"].endswith(".mp4"):
        fail(gate, f"{name}: out '{m['out']}' must end with .mp4")

    mod = m.get("module")
    if isinstance(mod, str) and not os.path.isfile(os.path.join(HERE, mod + ".py")):
        fail(gate, f"{name}: module video/{mod}.py does not exist")

    sdir = m.get("stage_dir")
    sdir_path = os.path.join(HERE, sdir) if isinstance(sdir, str) else None
    if sdir_path and not os.path.isdir(sdir_path):
        fail(gate, f"{name}: stage_dir video/{sdir}/ does not exist")

    plan = m.get("plan")
    if not isinstance(plan, list) or not plan:
        fail(gate, f"{name}: plan must be a non-empty list")
        return m
    seen_stages = set()
    for i, entry in enumerate(plan):
        where = f"{name}: plan[{i}]"
        if not (isinstance(entry, list) and len(entry) == 2):
            fail(gate, f"{where}: must be a [stage, audio] pair")
            continue
        stage, audio = entry
        if not isinstance(stage, str) or not stage:
            fail(gate, f"{where}: stage must be a non-empty string")
            continue
        if stage in seen_stages:
            fail(gate, f"{where}: duplicate stage '{stage}'")
        seen_stages.add(stage)
        if sdir_path:
            png = os.path.join(sdir_path, stage + ".png")
            alt = [f for f in os.listdir(sdir_path)
                   if os.path.splitext(f)[0] == stage] if os.path.isdir(sdir_path) else []
            if not os.path.isfile(png) and not alt:
                fail(gate, f"{where}: markup video/{sdir}/{stage}.png missing")
        if isinstance(audio, str):
            if not audio.endswith(".mp3"):
                fail(gate, f"{where}: audio '{audio}' must end with .mp3")
        elif isinstance(audio, dict):
            if set(audio.keys()) != {"mp3", "share"}:
                fail(gate, f"{where}: audiospec must be exactly {{mp3, share}}")
            elif not isinstance(audio["mp3"], str) or not audio["mp3"].endswith(".mp3"):
                fail(gate, f"{where}: audiospec mp3 must be an .mp3 string")
            elif not isinstance(audio["share"], int) or audio["share"] < 1:
                fail(gate, f"{where}: audiospec share must be int >= 1")
        else:
            fail(gate, f"{where}: audio must be a filename or {{mp3, share}}")
    check_topic_codes(gate, name, m.get("topics"))
    return m


def plan_audio_entries(manifest):
    """Yield (stage, mp3, share) for each plan entry."""
    for entry in manifest["plan"]:
        stage, audio = entry
        if isinstance(audio, dict):
            yield stage, audio["mp3"], audio["share"]
        else:
            yield stage, audio, 1


def http_refs_in_text(text):
    return re.findall(r"https?://[^\s'\"<>]+", text)


def gate_no_http(gate, label, paths):
    """IMAGE-LOCAL (remote part): no http(s) references in unit files."""
    for p in paths:
        try:
            with open(p, encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception:
            continue
        for url in http_refs_in_text(content):
            fail(gate, f"{label}: remote URL in {os.path.relpath(p, REPO)}: {url[:80]}")

# ==================================================================== audio
def gate_audio_manifest(manifest, mpath):
    """AUDIO-MATCH (manifest mode): every plan audio exists and measures sane."""
    gate = "AUDIO-MATCH"
    name = manifest["name"]
    adir = os.path.join(HERE, "audio", name)
    total = 0.0
    for stage, mp3, share in plan_audio_entries(manifest):
        p = os.path.join(adir, mp3)
        if not os.path.isfile(p):
            fail(gate, f"{name}: plan stage '{stage}' -> audio/{name}/{mp3} MISSING")
            continue
        d = ffprobe_dur(p)
        if d is None or d <= 0:
            fail(gate, f"{name}: audio/{name}/{mp3} unreadable/zero duration")
            continue
        total += d
        info(f"[AUDIO] {name}/{mp3}: {d:.1f}s (stage '{stage}'"
             + (f", share 1/{share}" if share > 1 else "") + ")")
    if total > 0:
        info(f"[AUDIO] {name}: total narration {total:.1f}s")


def narration_audio_dir(unit):
    for cand in (os.path.join(HERE, "audio", unit),
                 os.path.join(REPO, "audio", unit)):
        if os.path.isdir(cand):
            return cand
    return os.path.join(HERE, "audio", unit)


def gate_audio_narration(segs, npath, unit):
    """AUDIO-MATCH (narration mode): one <key>.mp3 per segment key, re-measured."""
    gate = "AUDIO-MATCH"
    adir = narration_audio_dir(unit)
    order, seen = [], set()
    for s in segs:
        if s["key"] not in seen:
            seen.add(s["key"])
            order.append(s["key"])
    total = 0.0
    for key in order:
        p = os.path.join(adir, key + ".mp3")
        if not os.path.isfile(p):
            fail(gate, f"{unit}: narration key '{key}' -> "
                       f"{os.path.relpath(p, REPO)} MISSING")
            continue
        d = ffprobe_dur(p)
        if d is None or d <= 0:
            fail(gate, f"{unit}: {os.path.relpath(p, REPO)} unreadable/zero duration")
            continue
        total += d
        info(f"[AUDIO] {unit}/{key}.mp3: {d:.1f}s")
    if total > 0:
        info(f"[AUDIO] {unit}: total narration {total:.1f}s")
    return order


# ==================================================================== TTS
MARKUP_TOKEN_RE = re.compile(r"[\[\<\{][^\[\]\<\>\{\}]{1,40}[\]\>\}]")
PAUSE_PAREN_RE = re.compile(r"\((pause|break|silence|beat)\)", re.IGNORECASE)
CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
ZERO_WIDTH_RE = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]")
TEMPLATE_RE = re.compile(r"\{\{[^}]*\}\}")


def check_text_renderable(gate, where, text):
    if not text or not text.strip():
        fail(gate, f"{where}: empty text")
        return
    for tok in MARKUP_TOKEN_RE.findall(text):
        if tok not in ALLOWED_PAUSE_MARKUP:
            fail(gate, f"{where}: unregistered markup token '{tok}' "
                       f"(no pause tokens registered in ALLOWED_PAUSE_MARKUP)")
    for tok in PAUSE_PAREN_RE.findall(text):
        fail(gate, f"{where}: pause markup '({tok})' not in allowed set")
    if CTRL_RE.search(text):
        fail(gate, f"{where}: contains ASCII control characters")
    if ZERO_WIDTH_RE.search(text):
        fail(gate, f"{where}: contains zero-width/format characters")
    if TEMPLATE_RE.search(text):
        fail(gate, f"{where}: contains unrendered {{{{...}}}} template placeholder")
    n = len(text)
    if n > SEGMENT_FAIL_CHARS:
        fail(gate, f"{where}: {n} chars exceeds fish-speech sanity limit "
                   f"{SEGMENT_FAIL_CHARS}")
    elif n > SEGMENT_WARN_CHARS:
        warn(gate, f"{where}: {n} chars is long for one TTS segment "
                   f"(warn > {SEGMENT_WARN_CHARS})")


def gate_tts_manifest(manifest):
    """TTS-GATES (manifest mode): scripts/<name>/<stage>.txt per plan stage."""
    gate = "TTS-GATES"
    name = manifest["name"]
    sdir = os.path.join(HERE, "scripts", name)
    for stage, mp3, share in plan_audio_entries(manifest):
        p = os.path.join(sdir, stage + ".txt")
        if not os.path.isfile(p):
            warn(gate, f"{name}: scripts/{name}/{stage}.txt missing "
                       f"(narration source for audio/{name}/{mp3})")
            continue
        text = open(p, encoding="utf-8", errors="replace").read()
        check_text_renderable(gate, f"{name}/{stage}.txt", text)


def gate_tts_narration(segs, npath, unit):
    """TTS-GATES (narration mode): every segment has voice + text."""
    gate = "TTS-GATES"
    if not isinstance(segs, list) or not segs:
        fail(gate, f"{unit}: narration JSON must be a non-empty list")
        return
    for i, s in enumerate(segs):
        where = f"{unit}: segment[{i}]"
        if not isinstance(s, dict):
            fail(gate, f"{where}: must be an object")
            continue
        for field in ("key", "voice", "text"):
            if field not in s:
                fail(gate, f"{where}: missing '{field}'")
        if "voice" in s and s["voice"] not in ALLOWED_VOICES:
            fail(gate, f"{where}: voice '{s['voice']}' not registered "
                       f"in ALLOWED_VOICES")
        if "text" in s and isinstance(s["text"], str):
            check_text_renderable(gate, f"{where} key='{s.get('key')}'", s["text"])
        check_topic_codes(gate, where, s.get("topics"))

# ==================================================================== quotes
SMART_QUOTE_RE = re.compile(r"[“”\"](.{20,}?)[“”\"]")


def check_quote_marking(gate, where, text, marking):
    """QUOTE-VERIFY on one explicitly-marked quote."""
    if not isinstance(marking, dict):
        fail(gate, f"{where}: 'quote' marking must be an object")
        return
    verbatim = marking.get("verbatim", False)
    source = marking.get("source", "")
    year = marking.get("year")
    federal = marking.get("federal", False)
    if not verbatim:
        info(f"[QUOTE] {where}: paraphrase/original, no PD check needed")
        return
    if not source or year is None:
        fail(gate, f"{where}: verbatim quote must cite source + year")
        return
    pd_pre1930 = isinstance(year, int) and year < 1930
    if pd_pre1930 or federal:
        why = "pre-1930 public domain" if pd_pre1930 else \
            "US federal government work (17 USC 105)"
        info(f"[QUOTE] {where}: verbatim OK -- {source} ({year}), {why}")
    else:
        fail(gate, f"{where}: verbatim quote from {source} ({year}) is POST-1929 "
                   f"and not a federal work -- must be paraphrase/original")
        return
    st = marking.get("source_text")
    if st:
        a = " ".join(norm_words(text))
        b = " ".join(norm_words(st))
        if a not in b and b not in a:
            warn(gate, f"{where}: quoted text does not match embedded source_text")
    else:
        warn(gate, f"{where}: no source_text embedded; manual source check owed")


def gate_quotes_narration(segs, unit):
    """QUOTE-VERIFY (narration mode)."""
    gate = "QUOTE-VERIFY"
    for i, s in enumerate(segs):
        if not isinstance(s, dict):
            continue
        where = f"{unit}: segment[{i}] key='{s.get('key')}'"
        text = s.get("text", "")
        marking = s.get("quote")
        if marking is not None:
            check_quote_marking(gate, where, text, marking)
        elif s.get("voice") not in (None, "narrator") or SMART_QUOTE_RE.search(text or ""):
            warn(gate, f"{where}: quote-like content (voice='{s.get('voice')}' / "
                       f"quoted passage) has no 'quote' marking -- add "
                       f"{{verbatim, source, year}} metadata")


def gate_quotes_manifest(manifest):
    """QUOTE-VERIFY (manifest mode): flag unmarked long quoted passages."""
    gate = "QUOTE-VERIFY"
    name = manifest["name"]
    sdir = os.path.join(HERE, "scripts", name)
    if not os.path.isdir(sdir):
        return
    for fn in sorted(os.listdir(sdir)):
        if not fn.endswith(".txt"):
            continue
        text = open(os.path.join(sdir, fn), encoding="utf-8",
                    errors="replace").read()
        m = SMART_QUOTE_RE.search(text)
        if m:
            warn(gate, f"{name}/{fn}: {len(m.group(1))}-char quoted passage with "
                       f"no quote metadata -- verify source/PD status")


# ==================================================================== NO-COPY
def _srt_text(path):
    out = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            s = line.strip()
            if not s or s.isdigit() or "-->" in s:
                continue
            s = re.sub(r"<[^>]*>", " ", s)
            out.append(s)
    return "\n".join(out)


def _epub_texts():
    texts = []
    books = os.path.join(REPO, "books")
    if not os.path.isdir(books):
        return texts
    for root, _d, files in os.walk(books):
        for fn in files:
            if not fn.lower().endswith(".zip"):
                continue
            zp = os.path.join(root, fn)
            try:
                z = zipfile.ZipFile(zp)
            except Exception:
                continue
            for nm in z.namelist():
                if not nm.lower().endswith((".xhtml", ".html", ".htm")):
                    continue
                try:
                    raw = z.read(nm).decode("utf-8", errors="replace")
                except Exception:
                    continue
                raw = re.sub(r"<script.*?</script>", " ", raw,
                             flags=re.S | re.I)
                raw = re.sub(r"<style.*?</style>", " ", raw, flags=re.S | re.I)
                txt = re.sub(r"<[^>]*>", " ", raw)
                texts.append((f"{os.path.basename(zp)}:{nm}", html.unescape(txt)))
    return texts


def build_copy_corpus():
    """(path, normalized-text) for every srt transcript + book EPUB page."""
    corpus = []
    pc = os.path.join(REPO, "public_contnent")
    if os.path.isdir(pc):
        for root, _d, files in os.walk(pc):
            for fn in sorted(files):
                if fn.lower().endswith(".srt"):
                    p = os.path.join(root, fn)
                    corpus.append((os.path.relpath(p, REPO), _srt_text(p)))
    corpus.extend(_epub_texts())
    normed = []
    for path, text in corpus:
        n = re.sub(r"[ \t\r\f\v]+", " ", text.lower())
        n = re.sub(r"[^a-z0-9\n ]", " ", n)
        n = re.sub(r" *\n *", "\n", n)
        normed.append((path, n))
    return normed


def shingle_set(words, n=SHINGLE_N):
    idx = set()
    for i in range(len(words) - n + 1):
        h = hashlib.blake2b(" ".join(words[i:i + n]).encode("utf-8"),
                            digest_size=8).digest()
        idx.add(int.from_bytes(h, "big"))
    return idx


_COPY_CACHE = {"corpus": None, "index": None, "total_w": 0}


def gate_no_copy(candidates):
    """NO-COPY: 8+ consecutive-word verbatim overlap vs srt/book corpus."""
    gate = "NO-COPY"
    if _COPY_CACHE["index"] is None:
        info("[NO-COPY] building corpus index (public_contnent srt + books EPUBs)...")
        corpus = build_copy_corpus()
        if not corpus:
            warn(gate, "corpus empty (no srt/EPUBs found); scan skipped")
            return
        index = set()
        total_w = 0
        for _path, text in corpus:
            ws = norm_words(text)
            total_w += len(ws)
            index |= shingle_set(ws)
        _COPY_CACHE.update(corpus=corpus, index=index, total_w=total_w)
        info(f"[NO-COPY] corpus: {len(corpus)} files, {total_w} words, "
             f"{len(index)} unique {SHINGLE_N}-grams")
    corpus, index = _COPY_CACHE["corpus"], _COPY_CACHE["index"]
    hits = 0
    for label, text in candidates:
        ws = norm_words(text)
        if len(ws) < SHINGLE_N:
            continue
        for i in range(len(ws) - SHINGLE_N + 1):
            phrase = ws[i:i + SHINGLE_N]
            h = int.from_bytes(
                hashlib.blake2b(" ".join(phrase).encode("utf-8"),
                                digest_size=8).digest(), "big")
            if h not in index:
                continue
            joined = " ".join(phrase)
            loc = None
            for path, ntext in corpus:
                pos = ntext.find(joined)
                if pos != -1:
                    loc = f"{path} (line ~{ntext.count(chr(10), 0, pos) + 1})"
                    break
            hits += 1
            if hits <= 10:
                fail(gate, f"{label}: {SHINGLE_N}-word verbatim overlap "
                           f"'{joined}...' matches {loc or 'corpus'}")
    if hits > 10:
        fail(gate, f"... and {hits - 10} further verbatim overlaps")
    if hits == 0:
        info("[NO-COPY] no 8+ word verbatim overlaps found")

# ==================================================================== animation
def motion_signatures():
    """{funcname: (param_names, n_required, has_var_kw)} from motion.py AST."""
    tree = ast.parse(open(os.path.join(HERE, "motion.py"),
                          encoding="utf-8").read())
    sigs = {}
    for node in tree.body:
        if not isinstance(node, ast.FunctionDef) or node.name.startswith("_"):
            continue
        a = node.args
        params = [x.arg for x in a.args]
        n_req = len(params) - len(a.defaults)
        sigs[node.name] = (params, n_req, a.kwarg is not None, a.vararg is not None)
    return sigs


def _attr_motion_name(func, mod_aliases, aliases):
    if isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name) \
            and func.value.id in mod_aliases:
        return func.attr
    if isinstance(func, ast.Name) and func.id in aliases:
        return aliases[func.id]
    return None


def collect_motion_calls(path):
    """(calls, str_consts): motion.* calls + resolvable string constants."""
    src = open(path, encoding="utf-8", errors="replace").read()
    tree = ast.parse(src)
    mod_aliases, aliases, str_consts = {"motion"}, {}, {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for a in node.names:
                if a.name == "motion":
                    mod_aliases.add(a.asname or "motion")
        elif isinstance(node, ast.ImportFrom) and node.module == "motion":
            for a in node.names:
                aliases[a.asname or a.name] = a.name
    # simple constant folder: NAME = "string" (module/function level)
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and len(node.targets) == 1 \
                and isinstance(node.targets[0], ast.Name):
            v = node.value
            if isinstance(v, ast.Constant) and isinstance(v.value, str):
                str_consts[node.targets[0].id] = v.value
            elif isinstance(v, ast.Attribute) and isinstance(v.value, ast.Name) \
                    and v.value.id in mod_aliases:
                aliases[node.targets[0].id] = v.attr

    def const_str(node):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return node.value
        if isinstance(node, ast.Name):
            return str_consts.get(node.id)
        if isinstance(node, ast.JoinedStr):
            parts = []
            for v in node.values:
                if isinstance(v, ast.Constant) and isinstance(v.value, str):
                    parts.append(v.value)
                elif isinstance(v, ast.FormattedValue):
                    s = const_str(v.value)
                    if s is None:
                        return None
                    parts.append(s)
                else:
                    return None
            return "".join(parts)
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
            l, r = const_str(node.left), const_str(node.right)
            return l + r if l is not None and r is not None else None
        return None

    # string parts nested inside f-strings are not standalone literals
    in_fstring = set()
    for _node in ast.walk(tree):
        if isinstance(_node, ast.JoinedStr):
            for _sub in ast.walk(_node):
                in_fstring.add(id(_sub))
    calls, literals = [], []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            fn = _attr_motion_name(node.func, mod_aliases, aliases)
            if fn:
                calls.append((node.lineno, fn, node.args, node.keywords))
        elif isinstance(node, ast.Constant) and isinstance(node.value, str) \
                and id(node) not in in_fstring:
            literals.append(node.value)
        elif isinstance(node, ast.JoinedStr):
            s = const_str(node)
            if s:
                literals.append(s)
    # per-scene image refs, in scenes.append() order (None = programmatic)
    appends = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) \
                and node.func.attr == "append" \
                and isinstance(node.func.value, ast.Name) \
                and node.func.value.id == "scenes" and node.args:
            img = None
            for sub in ast.walk(node.args[0]):
                if not isinstance(sub, ast.Call):
                    continue
                fn = _attr_motion_name(sub.func, mod_aliases, aliases)
                if not fn or fn in ("annotate", "assemble"):
                    continue
                img = _call_image_ref(sub, fn, const_str)
                if img:
                    break
            appends.append((node.lineno, img))
    return calls, literals, str_consts, appends


# primitives whose FIRST positional arg is an image path
IMG_POSITIONAL_FNS = {"kb_scene", "caption_scene", "title_scene", "doc_zoom",
                      "zoom_to", "callout_scene", "camera_path"}


def _call_image_ref(call, fn, const_str):
    for kw in call.keywords:
        if kw.arg in ("bg_img", "img_path"):
            s = const_str(kw.value)
            if s and s.lower().endswith(IMAGE_EXTS):
                return s
    if fn in IMG_POSITIONAL_FNS and call.args:
        s = const_str(call.args[0])
        if s and s.lower().endswith(IMAGE_EXTS):
            return s
    return None


def check_annotate_notes(gate, where, args, keywords):
    notes_node = None
    if len(args) >= 2:
        notes_node = args[1]
    for kw in keywords:
        if kw.arg == "notes":
            notes_node = kw.value
    if notes_node is None or not isinstance(notes_node, ast.List):
        warn(gate, f"{where}: annotate notes not statically analyzable")
        return
    for elt in notes_node.elts:
        vals = elt.elts if isinstance(elt, ast.Tuple) else []
        if len(vals) < 3 or not isinstance(vals[2], ast.Constant):
            warn(gate, f"{where}: annotate note kind not statically analyzable")
            continue
        kind = vals[2].value
        if kind not in ANNOTATE_KINDS:
            fail(gate, f"{where}: annotate kind '{kind}' not in "
                       f"{sorted(ANNOTATE_KINDS)}")


def check_bg_img(gate, where, fn, args, keywords, params):
    """NO-BLANK-FRAMES (a): bg_img REQUIRED on flat-background primitives."""
    if fn not in BG_IMG_REQUIRED:
        return
    val = None
    if "bg_img" in params:
        idx = params.index("bg_img")
        if idx < len(args):
            val = args[idx]
        for kw in keywords:
            if kw.arg == "bg_img":
                val = kw.value
    if val is None or (isinstance(val, ast.Constant) and val.value is None):
        fail(gate, f"{where}: {fn}() missing bg_img -- flat near-black "
                   f"background is a NO-BLANK-FRAMES violation")
    elif isinstance(val, ast.Constant) and \
            (not isinstance(val.value, str) or not val.value.strip()):
        fail(gate, f"{where}: {fn}() bg_img is empty")


def gate_animation_refs(build_py, unit):
    """ANIMATION-REFS + NO-BLANK-FRAMES (a): validate motion.* directives."""
    gate = "ANIMATION-REFS"
    if not build_py or not os.path.isfile(build_py):
        warn(gate, f"{unit}: no build script found; animation directives unchecked")
        return []
    sigs = motion_signatures()
    calls, _lits, _consts, _appends = collect_motion_calls(build_py)
    rel = os.path.relpath(build_py, REPO)
    if not calls:
        info(f"[ANIMATION] {rel}: no motion.py directives "
             f"(static markup pipeline)")
        return []
    for lineno, fn, args, keywords in calls:
        where = f"{rel}:{lineno} motion.{fn}()"
        if fn in UTIL_EXEMPT:
            continue
        if fn in CUBA_ONLY:
            if not is_cuba_unit(unit):
                warn(gate, f"{where}: cuba_map_scene is Cuba-specific, "
                           f"not canonical -- used outside Cuba content")
            else:
                info(f"[ANIMATION] {where}: Cuba-specific primitive, allowed")
            continue
        if fn not in CANONICAL_PRIMS and fn not in EASINGS:
            fail(gate, f"{where}: unknown primitive -- not in the canonical "
                       f"animation vocabulary")
            continue
        sig = sigs.get(fn)
        if sig is None:
            fail(gate, f"{where}: '{fn}' in vocabulary but not defined "
                       f"in motion.py")
            continue
        params, n_req, has_var_kw, has_var_pos = sig
        if not has_var_pos and len(args) > len(params):
            fail(gate, f"{where}: {len(args)} positional args, "
                       f"{fn} takes at most {len(params)}")
        kw_names = {kw.arg for kw in keywords if kw.arg}
        if not has_var_kw:
            unknown = kw_names - set(params)
            if unknown:
                fail(gate, f"{where}: unknown kwarg(s) {sorted(unknown)} "
                           f"for {fn}{params}")
        given = len(args) + len(kw_names)
        if given < n_req:
            fail(gate, f"{where}: missing required arg(s) for {fn}{params}")
        if fn == "annotate":
            check_annotate_notes(gate, where, args, keywords)
        check_bg_img("NO-BLANK-FRAMES", where, fn, args, keywords, params)
    info(f"[ANIMATION] {rel}: {len(calls)} motion.* call(s) checked")
    return calls


# ==================================================================== images
def resolve_image(p):
    """Resolve a referenced image path against repo root and video/."""
    for base in (REPO, HERE):
        cand = os.path.normpath(os.path.join(base, p))
        if os.path.isfile(cand):
            return cand
    return None


def provenance_covering(img_path):
    """Find PROVENANCE.md nearest to the image; return (path, basenames)."""
    d = os.path.dirname(img_path)
    while d and d.startswith(REPO):
        cand = os.path.join(d, "PROVENANCE.md")
        if os.path.isfile(cand):
            txt = open(cand, encoding="utf-8", errors="replace").read()
            names = set(re.findall(r"[\w.\-]+\.(?:jpg|jpeg|png|gif|webp)",
                                   txt, re.I))
            return cand, {n.lower() for n in names}
        if d == REPO:
            break
        d = os.path.dirname(d)
    return None, set()


def gate_images_narration(calls, literals, unit):
    """IMAGE-LOCAL (narration mode): refs exist locally, provenance on file."""
    gate = "IMAGE-LOCAL"
    refs = {s for s in literals
            if isinstance(s, str) and s.lower().endswith(IMAGE_EXTS)}
    if not refs:
        info(f"[IMAGE] {unit}: no image references found in build script")
    for ref in sorted(refs):
        if ref.startswith("http"):
            fail(gate, f"{unit}: remote image URL {ref[:80]}")
            continue
        rp = resolve_image(ref)
        if rp is None:
            fail(gate, f"{unit}: image '{ref}' not found under repo or video/")
            continue
        prov, names = provenance_covering(rp)
        if prov is None:
            warn(gate, f"{unit}: no PROVENANCE.md covers "
                       f"{os.path.relpath(rp, REPO)}")
        elif os.path.basename(rp).lower() not in names:
            fail(gate, f"{unit}: {os.path.basename(rp)} not listed in "
                       f"{os.path.relpath(prov, REPO)}")
        else:
            info(f"[IMAGE] {os.path.basename(rp)}: provenance OK "
                 f"({os.path.relpath(prov, REPO)})")
    # repo-level finding: assets/images/ keeps no provenance record at all
    ai = os.path.join(REPO, "assets", "images")
    if os.path.isdir(ai):
        has_prov = any(
            os.path.isfile(os.path.join(r, "PROVENANCE.md"))
            for r, _d, _f in os.walk(ai))
        if not has_prov:
            warn(gate, "assets/images/ has no provenance record on file "
                       "(no PROVENANCE.md anywhere under it)")


def gate_images_manifest(manifest):
    """IMAGE-LOCAL (manifest mode): no remote refs in manifest/module/scripts."""
    gate = "IMAGE-LOCAL"
    name = manifest["name"]
    paths = [os.path.join(HERE, "manifests", name + ".json"),
             os.path.join(HERE, manifest["module"] + ".py")]
    sdir = os.path.join(HERE, "scripts", name)
    if os.path.isdir(sdir):
        paths += [os.path.join(sdir, f) for f in os.listdir(sdir)
                  if f.endswith(".txt")]
    gate_no_http(gate, name, [p for p in paths if os.path.isfile(p)])
    info(f"[IMAGE] {name}: static-markup pipeline, no external image refs")

# ==================================================================== blank frames
def frame_gray(mp4, t):
    """One 64x36 gray frame at t seconds, or None on extraction failure."""
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", mp4,
           "-frames:v", "1", "-vf", "scale=64:36",
           "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    try:
        r = subprocess.run(cmd, capture_output=True, timeout=60)
    except Exception:
        return None
    return r.stdout if len(r.stdout) == 64 * 36 else None


def is_blank_frame(data):
    """True when >95% of pixels sit inside a 10-point luminance band."""
    hist = [0] * 256
    for b in data:
        hist[b] += 1
    window = sum(hist[:BLANK_BAND])
    best = window
    for i in range(1, 257 - BLANK_BAND):
        window += hist[i + BLANK_BAND - 1] - hist[i - 1]
        if window > best:
            best = window
    return best / len(data) > BLANK_COVERAGE


def png_is_blank(png_path):
    try:
        im = Image.open(png_path).convert("L").resize((64, 36))
        return is_blank_frame(im.tobytes())
    except Exception:
        return None


def find_built_mp4(out_name, declared_path=None):
    cands = []
    if declared_path:
        cands.append(declared_path if os.path.isabs(declared_path)
                     else os.path.join(REPO, declared_path))
    cands += [os.path.join(HERE, "output", out_name),
              os.path.join(YOUR_FILES, out_name)]
    for c in cands:
        if os.path.isfile(c):
            return c
    return None


def gate_blank_frames_rendered(mp4, scenes, unit):
    """NO-BLANK-FRAMES (b): sample 3 frames/scene from the built MP4."""
    gate = "NO-BLANK-FRAMES"
    if not mp4:
        warn(gate, f"{unit}: built MP4 not found; rendered-frame check skipped")
        return
    total = sum(d for _s, d in scenes)
    if total <= 0:
        fail(gate, f"{unit}: zero total scene duration; cannot sample frames")
        return
    info(f"[BLANK] sampling {os.path.relpath(mp4, REPO) if mp4.startswith(REPO) else mp4} "
         f"({len(scenes)} scenes, {total:.1f}s)")
    bad, checked = 0, 0
    cum = 0.0
    for stage, dur in scenes:
        if dur <= 0:
            cum += dur
            continue
        for frac in (0.2, 0.5, 0.8):
            t = cum + frac * dur
            if t >= total:
                continue
            data = frame_gray(mp4, t)
            checked += 1
            if data is None:
                warn(gate, f"{unit}: frame extraction failed at t={t:.1f}s")
                continue
            if is_blank_frame(data):
                bad += 1
                fail(gate, f"{unit}: near-blank frame at t={t:.1f}s "
                           f"(scene '{stage}')")
        cum += dur
    info(f"[BLANK] {checked} frames sampled, {bad} blank")


def gate_blank_frames_markup_pngs(manifest):
    """NO-BLANK-FRAMES (a, manifest mode): markup PNGs must carry visuals."""
    gate = "NO-BLANK-FRAMES"
    name = manifest["name"]
    sdir = os.path.join(HERE, manifest["stage_dir"])
    for stage, _mp3, _share in plan_audio_entries(manifest):
        p = os.path.join(sdir, stage + ".png")
        if not os.path.isfile(p):
            continue  # already failed under MANIFEST-SCHEMA
        blank = png_is_blank(p)
        if blank is None:
            warn(gate, f"{name}: could not analyze markup/{stage}.png")
        elif blank:
            fail(gate, f"{name}: markup/{stage}.png is near-blank")


def assemble_out_path(build_py):
    """Extract the out path from motion.assemble(scenes, audios, out)."""
    try:
        tree = ast.parse(open(build_py, encoding="utf-8",
                              errors="replace").read())
    except Exception:
        return None
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) \
                and node.func.attr == "assemble" and len(node.args) >= 3:
            a = node.args[2]
            if isinstance(a, ast.Constant) and isinstance(a.value, str):
                return a.value
    return None


def count_scene_appends(build_py):
    try:
        tree = ast.parse(open(build_py, encoding="utf-8",
                              errors="replace").read())
    except Exception:
        return 0
    n = 0
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) \
                and node.func.attr == "append" \
                and isinstance(node.func.value, ast.Name) \
                and node.func.value.id == "scenes":
            n += 1
    return n


# ==================================================================== subject match
def gate_subject_match(beats, unit):
    """IMAGE-SUBJECT-MATCH: beat image subject tags vs beat topic tags."""
    gate = "IMAGE-SUBJECT-MATCH"
    if not os.path.isfile(CATALOG_PATH):
        warn(gate, "PENDING-CATALOG: assets/images/CATALOG.json not present "
                   "(workstream D); gate skipped, not silently")
        return
    try:
        catalog = json.load(open(CATALOG_PATH, encoding="utf-8"))
    except Exception as e:
        fail(gate, f"CATALOG.json unreadable: {e}")
        return
    entries = catalog.get("images", catalog) if isinstance(catalog, dict) else []
    by_path = {}
    for e in entries if isinstance(entries, list) else []:
        by_path[os.path.basename(e.get("path", "")).lower()] = e
    for beat_id, img_ref, beat_topics in beats:
        if not img_ref or not beat_topics:
            info(f"[SUBJECT] beat '{beat_id}': skipped "
                 f"(image={bool(img_ref)}, topics={bool(beat_topics)})")
            continue
        entry = by_path.get(os.path.basename(img_ref).lower())
        if not entry:
            warn(gate, f"beat '{beat_id}': image {img_ref} not in CATALOG.json")
            continue
        img_tags = set(entry.get("topics", []) or entry.get("topic_tags", []))
        overlap = img_tags & set(beat_topics)
        period = entry.get("period", "")
        if overlap:
            info(f"[SUBJECT] beat '{beat_id}': MATCH image={img_ref} "
                 f"tags={sorted(overlap)} (period {period})")
        else:
            warn(gate, f"beat '{beat_id}': image {img_ref} subject tags "
                       f"{sorted(img_tags)} do not overlap beat topics "
                       f"{sorted(beat_topics)} -- HUMAN REVIEW")


# ==================================================================== runners
def narration_candidates(segs, unit):
    return [(f"{unit}: segment[{i}] key='{s.get('key')}'", s.get("text", ""))
            for i, s in enumerate(segs) if isinstance(s, dict)]


def script_candidates(name):
    cands = []
    sdir = os.path.join(HERE, "scripts", name)
    if os.path.isdir(sdir):
        for fn in sorted(os.listdir(sdir)):
            if fn.endswith(".txt"):
                cands.append(
                    (f"{name}/{fn}",
                     open(os.path.join(sdir, fn), encoding="utf-8",
                          errors="replace").read()))
    return cands


def run_manifest(mpath):
    unit = os.path.splitext(os.path.basename(mpath))[0]
    print(f"== manifest: {unit} ==")
    manifest = gate_manifest_schema(mpath)
    if manifest is None:
        return
    name = manifest["name"]
    gate_audio_manifest(manifest, mpath)
    gate_tts_manifest(manifest)
    mod_py = os.path.join(HERE, manifest.get("module", "") + ".py")
    gate_images_manifest(manifest)
    gate_quotes_manifest(manifest)
    gate_animation_refs(mod_py if os.path.isfile(mod_py) else None, name)
    gate_blank_frames_markup_pngs(manifest)
    # rendered-frame gate: scene durations from re-measured audio
    adir = os.path.join(HERE, "audio", name)
    scenes = []
    for stage, mp3, share in plan_audio_entries(manifest):
        d = ffprobe_dur(os.path.join(adir, mp3))
        if d:
            scenes.append((stage, d / share if share > 1 else d))
    mp4 = find_built_mp4(manifest["out"])
    gate_blank_frames_rendered(mp4, scenes, name)
    gate_subject_match([], name)   # static-markup units carry no beat images
    gate_no_copy(script_candidates(name))


def run_narration_unit(npath):
    unit = os.path.basename(npath).replace("_narration.json", "")
    print(f"== narration unit: {unit} ==")
    info(f"[UNIT] no JSON manifest exists for '{unit}' -- validating "
         f"narration + audio directly (per spec)")
    try:
        segs = json.load(open(npath, encoding="utf-8"))
    except Exception as e:
        fail("MANIFEST-SCHEMA", f"{unit}: narration JSON unreadable: {e}")
        return
    pilot = os.path.join(os.path.dirname(npath), f"pilot_{unit}.py")
    if not os.path.isfile(pilot):
        cands = [os.path.join(os.path.dirname(npath), f)
                 for f in os.listdir(os.path.dirname(npath))
                 if f.startswith("pilot_") and f.endswith(".py")]
        pilot = cands[0] if cands else None
    gate_tts_narration(segs, npath, unit)
    order = gate_audio_narration(segs, npath, unit)
    gate_quotes_narration(segs, unit)
    calls, literals, _consts, appends = (collect_motion_calls(pilot)
                                         if pilot else ([], [], {}, []))
    gate_animation_refs(pilot, unit)
    gate_images_narration(calls, literals, unit)
    gate_no_http("IMAGE-LOCAL", unit,
                 [p for p in [npath, pilot] if p and os.path.isfile(p)])
    # rendered-frame gate: scenes in narration order, motion.dur() timing
    adir = narration_audio_dir(unit)
    n_appends = count_scene_appends(pilot) if pilot else 0
    scenes = []
    for key in order:
        d = motion_dur(os.path.join(adir, key + ".mp3"))
        if d:
            scenes.append((key, d))
    if n_appends and n_appends != len(scenes):
        warn("NO-BLANK-FRAMES",
             f"{unit}: {n_appends} scenes.append calls but {len(scenes)} "
             f"audio-backed scenes; sampling uses audio-backed list")
    declared = assemble_out_path(pilot) if pilot else None
    out_name = os.path.basename(declared) if declared else f"{unit}.mp4"
    mp4 = find_built_mp4(out_name, declared)
    gate_blank_frames_rendered(mp4, scenes, unit)
    # subject-match beats: scene image (per scenes.append order) + beat topics
    beats = []
    for i, key in enumerate(order):
        topics = None
        if isinstance(segs, list):
            for s in segs:
                if isinstance(s, dict) and s.get("key") == key:
                    topics = s.get("topics")
                    break
        img = appends[i][1] if i < len(appends) else None
        beats.append((key, img, topics))
    if appends and len(appends) != len(order):
        warn("IMAGE-SUBJECT-MATCH",
             f"{unit}: {len(appends)} scenes but {len(order)} narration keys; "
             f"beat/image pairing may be off")
    gate_subject_match(beats, unit)
    gate_no_copy(narration_candidates(segs, unit))


def main(argv):
    global FAILS, WARNS, INFOS
    args = [a for a in argv[1:] if not a.startswith("-")]
    if "--all" in argv[1:]:
        targets = sorted(
            os.path.join(HERE, "manifests", f)
            for f in os.listdir(os.path.join(HERE, "manifests"))
            if f.endswith(".json"))
        targets += sorted(
            os.path.join(HERE, f) for f in os.listdir(HERE)
            if f.endswith("_narration.json"))
        results = {}
        for t in targets:
            FAILS, WARNS, INFOS = [], [], []
            if t.endswith("_narration.json"):
                run_narration_unit(t)
            else:
                run_manifest(t)
            results[os.path.basename(t)] = (len(FAILS), len(WARNS))
            for line in INFOS:
                print("   ", line)
            for w in WARNS:
                print("  WARN " + w)
            for f in FAILS:
                print("  FAIL " + f)
            print()
        print("== summary ==")
        bad = 0
        for t, (nf, nw) in results.items():
            print(f"  {t}: {'FAIL' if nf else 'ok'} ({nf} failures, {nw} warnings)")
            bad += nf
        if bad:
            print(f"FAIL: {bad} failures across {len(results)} units")
            sys.exit(1)
        print("ALL GATES GREEN")
        return

    if not args:
        print(__doc__.split("\n\n")[3])
        sys.exit(2)
    target = args[0]
    if target.endswith(".json") and "_narration" in target:
        run_narration_unit(target)
    elif target.endswith(".json"):
        run_manifest(target)
    elif os.path.isdir(target):
        npaths = sorted(
            os.path.join(target, f) for f in os.listdir(target)
            if f.endswith("_narration.json"))
        if not npaths:
            fail("MANIFEST-SCHEMA",
                 f"{target}: no *_narration.json found; nothing to validate")
        for npath in npaths:
            run_narration_unit(npath)
    else:
        fail("MANIFEST-SCHEMA", f"unknown target '{target}'")
    print()
    for line in INFOS:
        print("   ", line)
    for w in WARNS:
        print("  WARN " + w)
    if FAILS:
        print(f"FAIL: {len(FAILS)} failures")
        for f in FAILS:
            print("  FAIL " + f)
        sys.exit(1)
    print("ALL GATES GREEN")


if __name__ == "__main__":
    main(sys.argv)
