"""Build assets/images/CATALOG.json: one entry per localized PD image.

Subjects are derived from (a) the Wikimedia Commons filename in the
download-report source-URL key (Commons filenames name the subject),
(b) the item_id / files fields (which question it was attached to -> topic
context), enriched by the repo's own provenance docs:
  - build/tests/visual-pool/IMAGES-U*.md (id -> pd_rationale)
  - build/reclaim-merged/IMAGES*.md + staged IMAGES-*.md (id -> rationale)
  - build/fresh-written drafts (id -> image_caption)

Output schema per entry:
  id, local_path, subject, period, topic_tags, provenance {source_url, direct, date, license_note}

Usage (repo root): python3 build/build_image_catalog.py
"""
import glob
import json
import os
import re
from urllib.parse import unquote

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT = os.path.join(HERE, "build", "image-download-report.json")
OUT = os.path.join(HERE, "assets", "images", "CATALOG.json")


def load_rationale_index():
    """item_id -> PD rationale / caption from repo provenance docs."""
    idx = {}
    for pat in ("build/tests/visual-pool/IMAGES-U*.md",
                "build/reclaim-merged/IMAGES*.md",
                "build/reclaim-merged/staged/*/IMAGES-*.md"):
        for p in glob.glob(os.path.join(HERE, pat)):
            for line in open(p, encoding="utf-8", errors="ignore"):
                line = line.strip()
                if not line.startswith("|") or "image_url" in line or "---" in line:
                    continue
                cells = [c.strip() for c in line.strip("|").split("|")]
                if len(cells) >= 4 and cells[0]:
                    idx.setdefault(cells[0], cells[3])
    # fresh-written drafts: id -> image_caption
    for root, _d, files in os.walk(os.path.join(HERE, "build", "fresh-written")):
        for f in files:
            if not f.endswith(".json"):
                continue
            try:
                data = json.load(open(os.path.join(root, f), encoding="utf-8"))
            except Exception:
                continue
            stack = [data]
            while stack:
                obj = stack.pop()
                if isinstance(obj, dict):
                    iid = obj.get("id")
                    stim = obj.get("stimulus") or {}
                    cap = stim.get("image_caption") if isinstance(stim, dict) else None
                    if iid and cap:
                        idx.setdefault(iid, cap)
                    stack.extend(obj.values())
                elif isinstance(obj, list):
                    stack.extend(obj)
    return idx


KEYWORD_TAGS = [
    (r"\bmap\b|\bchart\b|atlas|carte|territory", ["map", "geography"]),
    (r"portrait|bust|statue", ["portrait"]),
    (r"battle|siege|war|troops|soldiers|army|naval|fleet", ["war", "military"]),
    (r"painting|engraving|woodcut|lithograph|illustration|drawing|sketch|print", ["artwork"]),
    (r"photograph|photo\b", ["photograph"]),
    (r"cartoon|caricature|satire", ["political-cartoon"]),
    (r"letter|manuscript|document|charter|treaty|constitution|declaration|proclamation|speech", ["document"]),
    (r"newspaper|headline|broadside|poster", ["print-media"]),
    (r"church|mission|cathedral|temple", ["religion"]),
    (r"plantation|farm|cotton|tobacco|harvest", ["agriculture"]),
    (r"factory|mill|railroad|locomotive|steel|industrial|bridge|canal|ship|steamboat", ["industry", "transport"]),
    (r"city|street|town|village|pueblo|skyline", ["urban", "place"]),
    (r"flag|seal|emblem|coat of arms", ["symbol"]),
    (r"coin|banknote|currency|money", ["money"]),
    (r"slave|slavery|plantation", ["slavery"]),
    (r"indian|native|tribe|pueblo|cahokia", ["native-peoples"]),
    (r"columbus|voyage|expedition|explorer", ["exploration"]),
    (r"president|congress|senate|capitol|white house|election|vote|suffrage", ["politics"]),
    (r"protest|strike|riot|march|demonstration", ["protest"]),
    (r"school|university|college", ["education"]),
    (r"immigra|ellis|steerage", ["immigration"]),
]


def subject_from_url(source_url):
    """Decode the Commons/upload filename; it names the subject."""
    from urllib.parse import urlparse
    parsed = urlparse(source_url)
    path = parsed.path
    if "wikimedia.org" in parsed.netloc:
        # upload.wikimedia.org: /wikipedia/commons/<hash>/<hash>/<filename>
        # thumb.wikimedia.org:  /wikipedia/commons/thumb/<h>/<h>/<file>/<size>px-<file>
        tail = path.rsplit("/", 1)[-1]
        tail = re.sub(r"^\d+px-", "", tail)  # thumb size prefix
        for prefix in ("File:", "Special:FilePath/"):
            if tail.startswith(prefix):
                tail = tail[len(prefix):]
        name = unquote(tail)
    else:
        if "/wiki/" in source_url:
            tail = source_url.split("/wiki/")[-1].split("?", 1)[0]
        else:
            # opaque CDN paths (e.g. tile.loc.gov): last segment only
            tail = path.rsplit("/", 1)[-1]
        for prefix in ("File:", "Special:FilePath/"):
            if tail.startswith(prefix):
                tail = tail[len(prefix):]
        name = unquote(tail)
    # strip extension
    name = re.sub(r"\.(jpg|jpeg|png|gif|tif|tiff|svg|webp|pdf)$", "", name,
                  flags=re.I)
    name = name.replace("_", " ").strip()
    return name or "untitled"


def guess_tags(subject, rationale, item_id):
    tags = set()
    blob = f"{subject} {rationale or ''}".lower()
    for rx, ts in KEYWORD_TAGS:
        if re.search(rx, blob):
            tags.update(ts)
    if item_id.startswith("saq-set"):
        tags.add("saq-stimulus")
    elif re.match(r"^(5s24|pr25e|barrons)", item_id):
        tags.add("reclaim")
    elif item_id.startswith("original-"):
        tags.add("fresh-written")
    elif re.match(r"^t\d+-|exam", item_id):
        tags.add("test-stream")
    return sorted(tags)


def main():
    report = json.load(open(REPORT, encoding="utf-8"))
    rationale = load_rationale_index()
    catalog = []
    seen_paths = set()
    for source_url, v in sorted(report["downloaded"].items()):
        local_path = v.get("local_path", "").lstrip("./")
        item_id = v.get("id") or v.get("item_id") or os.path.splitext(
            os.path.basename(local_path))[0]
        period = v.get("period", "")
        disk = os.path.join(HERE, local_path)
        exists = os.path.isfile(disk)
        if local_path in seen_paths:
            continue
        seen_paths.add(local_path)
        subject = subject_from_url(source_url)
        rat = rationale.get(item_id)
        snote = v.get("subject_note")
        opaque = re.fullmatch(r"[a-z0-9]{3,14}", subject.lower()) is not None
        if rat:
            # combine: commons filename subject + repo's PD rationale detail
            subject = f"{subject} — {rat}" if not opaque else rat
        if snote:
            # precise subject detail recorded at sourcing time (gap images)
            subject = f"{subject} — {snote}"
        catalog.append({
            "id": item_id,
            "local_path": local_path,
            "subject": subject,
            "period": period,
            "topic_tags": guess_tags(subject, rat, item_id),
            "provenance": {
                "source_url": source_url,
                "direct": v.get("direct", ""),
                "date": report.get("date", ""),
                "license_note": v.get("license_note") or rat or "PD: pre-1930 / CC0 (verified at download)",
            },
            "on_disk": exists,
        })
    missing = [c for c in catalog if not c["on_disk"]]
    json.dump({"version": 1,
               "generated": report.get("date", ""),
               "count": len(catalog),
               "entries": catalog}, open(OUT, "w", encoding="utf-8"),
              indent=1, ensure_ascii=False)
    print(f"catalog entries: {len(catalog)}; missing on disk: {len(missing)}")
    for c in missing[:10]:
        print("  MISSING:", c["local_path"])


if __name__ == "__main__":
    main()
