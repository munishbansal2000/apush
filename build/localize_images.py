#!/usr/bin/env python3
"""Localize remote images per Munish's local-only image policy (2026-10-02).

Adapted from ap_world's build/localize_images.py for the apush schema.

- Collects every remote URL in IMG_FIELDS (image_url, stimulus_asset,
  image, image_path, asset_path) from:
    bank: build/reclaim-merged/staged/**/*.json (not _raw/),
          build/fresh-written/*.json
    tests: build/tests/test-*.json (section_1a items, section_1b
           questions, section_2a dbq documents),
           build/reconceived/princeton-t{4,5,6}/test.json
    saq bank: build/tests/saq-bank/set-*.json
    visual pool: build/tests/visual-pool/U*-enriched.json
- commons.wikimedia.org/wiki/File:<name> page URLs are rewritten to
  Special:FilePath/<name> (same file, direct image bytes) before download.
- HTTP 200 + image/* content-type required; otherwise the URL is recorded
  dead and the item is flagged (field rewritten to the intended local path
  with "image_unavailable": true so the validator gate surfaces it).
- Saves under assets/images/<period|unperioded>/<item_id>[-n].<ext>
  (dedupe by URL: one URL -> one file, reused everywhere it appears).
- Images with max dimension > 1600px are downscaled (LANCZOS); JPEG
  re-encoded at quality 82. Never upscaled, never cropped. SVG kept raw.
- Rewrites refs to repo-relative local paths; preserves image_license;
  adds image_source_url + image_local_verified. source_page provenance
  URLs are left untouched (they are not image refs).

Run: python3 build/localize_images.py [--rewrite]
  --rewrite : actually rewrite the content JSON files (default: dry run)
Writes build/image-download-report.json in all modes.
"""
import glob as g
import json
import os
import re
import sys
import urllib.request
from datetime import date
from PIL import Image, ImageFile
# Large but legitimate images exist; raise the limit while keeping a bomb
# guard. Per-image processing errors are caught so one bad file can't
# kill the run, and progress is flushed + resumable.
Image.MAX_IMAGE_PIXELS = 800_000_000

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(REPO, "build")
ASSETS = os.path.join(REPO, "assets", "images")
TODAY = date.today().isoformat()

IMG_FIELDS = ("image_url", "stimulus_asset", "image", "image_path",
              "asset_path")

EXT_BY_CT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/tiff": ".tif",
    "image/bmp": ".bmp",
}

WIKI_FILEPAGE = re.compile(
    r"^https://commons\.wikimedia\.org/wiki/File:(.+)$")


def direct_url(url):
    """Turn a commons File: description-page URL into a direct image URL."""
    m = WIKI_FILEPAGE.match(url)
    if m:
        return "https://commons.wikimedia.org/wiki/Special:FilePath/" \
            + m.group(1)
    return url


def iter_files():
    files = []
    for f in sorted(g.glob(os.path.join(
            BUILD, "reclaim-merged", "staged", "**", "*.json"),
            recursive=True)):
        if "/_raw/" not in f:
            files.append(f)
    for f in sorted(g.glob(os.path.join(BUILD, "fresh-written", "*.json"))):
        files.append(f)
    for f in sorted(g.glob(os.path.join(BUILD, "tests", "test-*.json"))):
        files.append(f)
    for i in (4, 5, 6):
        f = os.path.join(BUILD, "reconceived", f"princeton-t{i}", "test.json")
        if os.path.isfile(f):
            files.append(f)
    for f in sorted(g.glob(os.path.join(BUILD, "tests", "saq-bank",
                                        "set-*.json"))):
        files.append(f)
    for f in sorted(g.glob(os.path.join(BUILD, "tests", "visual-pool",
                                        "U*-enriched.json"))):
        files.append(f)
    return files


def walk_fields(obj, cb, ctx=None, file_tag=""):
    """Walk JSON; cb(field, url, item_id, period) for IMG_FIELDS hits.

    ctx tracks the nearest enclosing question item (dict with id + stem /
    parts / q). DBQ documents carry 'n' instead of 'id' and get a
    synthetic "<file_tag>-doc<n>" id. Container dicts (test roots, set
    roots) never become the item context."""
    if isinstance(obj, dict):
        cid = obj.get("id")
        if cid and any(k in obj for k in ("stem", "parts", "q")):
            ctx = (cid, obj.get("period"))
        elif obj.get("n") is not None and "id" not in obj:
            ctx = (f"{file_tag}-doc{obj.get('n')}",
                   ctx[1] if ctx else None)
        for k, v in obj.items():
            if k in IMG_FIELDS and isinstance(v, str) and v.startswith(
                    ("http://", "https://")):
                iid, per = ctx if ctx else (file_tag or "noid", None)
                cb(k, v, iid, per)
            walk_fields(v, cb, ctx, file_tag)
    elif isinstance(obj, list):
        for v in obj:
            walk_fields(v, cb, ctx, file_tag)


def main():
    rewrite = "--rewrite" in sys.argv
    # url -> {field, item_id, period, files:set, direct}
    urlmap = {}
    for fpath in iter_files():
        try:
            d = json.load(open(fpath))
        except Exception as e:
            print(f"WARN: cannot parse {fpath}: {e}")
            continue

        def hit(field, url, iid, per, fpath=fpath):
            e = urlmap.setdefault(url, {"field": field, "item_id": iid,
                                        "period": per, "files": set(),
                                        "direct": direct_url(url)})
            e["files"].add(fpath)

        ftag = (d.get("id") if isinstance(d, dict) else None) or \
            os.path.splitext(os.path.basename(fpath))[0]
        walk_fields(d, hit, file_tag=ftag)

    print(f"unique remote urls: {len(urlmap)}")
    rp = os.path.join(BUILD, "image-download-report.json")
    report = {"date": TODAY, "downloaded": {}, "dead": {}, "skipped": []}
    # resume: keep progress already written by a previous (crashed) run
    if os.path.isfile(rp):
        try:
            prev = json.load(open(rp))
            for url, rec in prev.get("downloaded", {}).items():
                if os.path.isfile(os.path.join(REPO, rec["local_path"])):
                    report["downloaded"][url] = rec
            report["dead"].update(prev.get("dead", {}))
            print(f"resuming: {len(report['downloaded'])} downloaded, "
                  f"{len(report['dead'])} dead already known")
        except Exception:
            pass
    CT_BY_EXT = {v: k for k, v in EXT_BY_CT.items()}
    used_names = set()

    def resume_dest(url, meta):
        """If a file from a crashed pre-report run already exists for this
        URL (names are deterministic), reuse it without re-downloading."""
        per = (meta["period"] or "unperioded").lower()
        base = re.sub(r"[^a-z0-9_-]", "_", meta["item_id"].lower())[:80]
        d = os.path.join(REPO, "assets", "images", per)
        if not os.path.isdir(d):
            return None
        hits = sorted(f for f in os.listdir(d)
                      if f == base or f.startswith(base + "-") or
                      f.startswith(base + "."))
        for h in hits:
            if h.startswith(base + ".") or h.startswith(base + "-"):
                return os.path.join("assets", "images", per, h)
        return None

    def next_fname(meta, ext):
        per = (meta["period"] or "unperioded").lower()
        base = re.sub(r"[^a-z0-9_-]", "_", meta["item_id"].lower())[:80]
        fname = f"{base}{ext}"
        n = 2
        while fname in used_names:
            fname = f"{base}-{n}{ext}"
            n += 1
        used_names.add(fname)
        return os.path.join("assets", "images", per, fname)

    for url, meta in sorted(urlmap.items()):
        if url in report["downloaded"] or url in report["dead"]:
            report["skipped"].append(url)
            continue
        # crashed-run resume: file already on disk
        rdest = resume_dest(url, meta)
        if rdest:
            full = os.path.join(REPO, rdest)
            ext = "." + rdest.rsplit(".", 1)[-1]
            used_names.add(os.path.basename(rdest))
            report["downloaded"][url] = {
                "local_path": rdest, "bytes": os.path.getsize(full),
                "content_type": CT_BY_EXT.get(ext, "unknown"),
                "note": "resumed: already downloaded by earlier partial run",
                **meta, "files": sorted(meta["files"])}
            print(f"RESUME {rdest}")
            json.dump(report, open(rp, "w"), indent=1)
            continue
        durl = meta["direct"]
        if durl != url:
            print(f"REWRITE page->file {url[:80]}")
        try:
            req = urllib.request.Request(durl, headers={
                "User-Agent": "apush-content-bot/1.0 (localization)"})
            with urllib.request.urlopen(req, timeout=25) as r:
                if r.status != 200:
                    raise IOError(f"HTTP {r.status}")
                ct = r.headers.get("Content-Type", "").split(";")[0].strip()
                if not ct.startswith("image/"):
                    raise IOError(f"content-type {ct}")
                data = r.read()
            if len(data) > 100 * 1024 * 1024:  # 100MB hard cap per file
                raise IOError(f"too large: {len(data)} bytes")
        except Exception as e:
            report["dead"][url] = {"reason": str(e), **meta,
                                   "files": sorted(meta["files"])}
            print(f"DEAD {url[:100]} ({e})")
            json.dump(report, open(rp, "w"), indent=1)  # flush progress
            continue
        ext = EXT_BY_CT.get(ct, ".bin")
        rel = next_fname(meta, ext)
        dest = os.path.join(REPO, rel)
        try:
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            if ct == "image/svg+xml":
                open(dest, "wb").write(data)  # keep raw, never rasterize
                note = "svg kept raw"
            else:
                import io
                im = Image.open(io.BytesIO(data))
                im.load()
                w, h = im.size
                if max(w, h) > 1600:
                    scale = 1600 / max(w, h)
                    im = im.resize((int(w * scale), int(h * scale)),
                                   Image.LANCZOS)
                    note = f"downscaled {w}x{h} -> {im.size[0]}x{im.size[1]}"
                else:
                    note = f"kept as-is {w}x{h}"
                save_kw = {"quality": 82} if ext == ".jpg" else {}
                if ext == ".jpg" and im.mode in ("RGBA", "P"):
                    im = im.convert("RGB")
                im.save(dest, **save_kw)
        except Exception as e:
            report["dead"][url] = {"reason": f"processing failed: {e}",
                                   **meta,
                                   "files": sorted(meta["files"])}
            print(f"DEAD {url[:100]} (processing: {e})")
            json.dump(report, open(rp, "w"), indent=1)  # flush progress
            continue
        sz = os.path.getsize(dest)
        report["downloaded"][url] = {"local_path": rel, "bytes": sz,
                                     "content_type": ct, "note": note,
                                     **meta, "files": sorted(meta["files"])}
        print(f"OK {rel} ({sz}b) {note}")
        json.dump(report, open(rp, "w"), indent=1)  # flush progress

    field_pat = ("(?P<q1>\")(?P<field>" + "|".join(IMG_FIELDS) +
                 ")(?P=q1)\\s*:\\s*(?P<q2>\")")

    def rewrite_file(fpath, url, new_ref, extra_fields):
        text = open(fpath).read()
        # match the exact field: "url" pair to avoid touching source_page etc.
        pat = re.compile(field_pat + re.escape(url) + r'(?P=q2)')
        found = pat.search(text)
        if not found:
            print(f"WARN: {url[:70]} not found as image field in {fpath}")
            return False

        def rep(m):
            indent_match = re.search(r"[ \t]*$", text[:m.start()])
            indent = indent_match.group(0) if indent_match else ""
            out = (f'{m.group("q1")}{m.group("field")}{m.group("q1")}: '
                   f'{m.group("q2")}{new_ref}{m.group("q2")},')
            for k, v in extra_fields:
                out += (f'\n{indent}{json.dumps(k)}: {json.dumps(v)},')
            return out.rstrip(",")

        new_text, n = pat.subn(rep, text)
        open(fpath, "w").write(new_text)
        return True

    if rewrite:
        touched = set()
        for url, rec in report["downloaded"].items():
            for fpath in rec["files"]:
                if rewrite_file(
                        fpath, url, rec["local_path"],
                        [("image_source_url", url),
                         ("image_local_verified", TODAY)]):
                    touched.add(fpath)
        for url, rec in report["dead"].items():
            per = (rec.get("period") or "unperioded").lower()
            rel = os.path.join("assets", "images", per,
                               f"{rec.get('item_id')}.missing")
            for fpath in rec["files"]:
                if rewrite_file(
                        fpath, url, rel,
                        [("image_source_url", url),
                         ("image_local_verified", TODAY),
                         ("image_unavailable", True)]):
                    touched.add(fpath)
        print(f"rewrote {len(touched)} files")

    json.dump(report, open(rp, "w"), indent=1)
    print(f"report: {rp}")
    print(f"downloaded {len(report['downloaded'])}, "
          f"dead {len(report['dead'])}")


if __name__ == "__main__":
    main()
