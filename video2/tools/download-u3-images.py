#!/usr/bin/env python3
"""
Download cataloged images for Unit 3 lessons and register them with the pipeline.

Reads data/u3-catalogs/<lesson>-images.json and, for each image:
  1. saves it as public/historic/<lesson>/<slug>.<ext> (slug = catalog id with "." -> "-",
     e.g. portrait.george-grenville -> portrait-george-grenville.jpg). A copy already downloaded
     under the old name (<id>.<ext>) is moved there, not downloaded again.
  2. registers it: data/<lesson>/images.json gets {description, source_url, ...} (existing entries are
     left alone) and data/images.lock.json gets {source_url, sha256, width, height}. Without both, the
     documentary director never sees the image.
Downloads primary_url, falling back to alt_url; rejects non-images and files under 50KB (thumbnails, error pages).
Polite by design (safe to leave running over all of Unit 3): one request at a time per host, Wikimedia at 12/min
with jitter and a contact User-Agent; a 429 honours Retry-After and halves that host's pace for the rest of the run;
three 429s in a row cool off for 10 minutes. Files already on disk are never fetched again, and the registry and
lock are saved after every image, so stopping (Ctrl-C) and re-running resumes where it left off. TIFFs are converted to JPEG (browsers cannot draw TIFF;
needs Pillow, otherwise they are skipped).

Usage: python tools/download-u3-images.py --all                 every Unit 3 catalog (u3e1..u3e11)
       python tools/download-u3-images.py --lesson u3e1 [--force]
       python tools/download-u3-images.py --lesson u3e1 --register-only   (no network: move + register files on disk)
"""
import hashlib
import http.client
import json
import os
import random
import struct
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

VIDEO2 = Path(__file__).resolve().parent.parent
CATALOG_DIR = VIDEO2 / "data" / "u3-catalogs"
PUBLIC = VIDEO2 / "public"
LOCK_PATH = VIDEO2 / "data" / "images.lock.json"
MIN_BYTES = 50 * 1024

# Requests per minute per host, one at a time. Wikimedia throttles bursts and anonymous-looking clients, so it gets
# the slowest pace and a User-Agent naming the tool and a contact URL (https://meta.wikimedia.org/wiki/User-Agent_policy).
RATE_LIMITS = {"upload.wikimedia.org": 12, "commons.wikimedia.org": 12, "cdn.loc.gov": 20, "tile.loc.gov": 20, "loc.gov": 20,
               "images.nypl.org": 20, "default": 20}
USER_AGENT = "APUSH-video2-image-downloader/2.0 (https://github.com/munishbansal2000/apush; educational video assets) Python-urllib"
COOL_OFF = 10 * 60
FORCE = "--force" in sys.argv
REGISTER_ONLY = "--register-only" in sys.argv
EXTS = (".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff")


def slug(img_id):
    return img_id.replace(".", "-")


def ext_for(url, ctype=""):
    low = (url or "").lower().split("?")[0]
    for ext in (".png", ".webp", ".tif", ".tiff", ".jpeg", ".jpg"):
        if low.endswith(ext) or ext[1:] in ctype:
            return ".jpg" if ext == ".jpeg" else ext
    return ".jpg"


def image_size(path):
    """(width, height) from the file header: JPEG, PNG or WebP. None if unreadable."""
    with open(path, "rb") as f:
        head = f.read(32)
        if head[:8] == b"\x89PNG\r\n\x1a\n":
            return struct.unpack(">II", head[16:24])
        if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
            kind = head[12:16]
            if kind == b"VP8 ":
                f.seek(26)
                w, h = struct.unpack("<HH", f.read(4))
                return w & 0x3FFF, h & 0x3FFF
            if kind == b"VP8L":
                f.seek(21)
                b = f.read(4)
                return 1 + (((b[1] & 0x3F) << 8) | b[0]), 1 + (((b[3] & 0xF) << 10) | (b[2] << 2) | ((b[1] & 0xC0) >> 6))
            if kind == b"VP8X":
                f.seek(24)
                b = f.read(6)
                return 1 + int.from_bytes(b[0:3], "little"), 1 + int.from_bytes(b[3:6], "little")
            return None
        if head[:2] == b"\xff\xd8":
            f.seek(2)
            while True:
                marker = f.read(2)
                if len(marker) < 2 or marker[0] != 0xFF:
                    return None
                if marker[1] in (0xD8, 0x01) or 0xD0 <= marker[1] <= 0xD7:
                    continue
                length = struct.unpack(">H", f.read(2))[0]
                if marker[1] in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    h, w = struct.unpack(">xHH", f.read(5))
                    return w, h
                f.seek(length - 2, 1)
    return None


def tiff_to_jpeg(path):
    """Converts a TIFF in place to <stem>.jpg; returns the new path, or None without Pillow."""
    try:
        from PIL import Image
    except ImportError:
        return None
    out = path.with_suffix(".jpg")
    with Image.open(path) as im:
        # Pillow opens TIFFs lazily. Materialize and explicitly close the
        # converted image so its TIFF decoder/file mapping is released before
        # Windows is asked to remove the source file.
        im.load()
        rgb = im.convert("RGB")
        try:
            rgb.save(out, "JPEG", quality=92)
        finally:
            rgb.close()

    # Windows, antivirus, and image indexers can retain a just-closed TIFF for
    # a short time. The JPEG is already complete, so cleanup must not abort the
    # entire resumable download. Retry briefly, then leave the redundant TIFF
    # for a later run while continuing with the valid JPEG.
    for attempt in range(5):
        try:
            path.unlink()
            break
        except PermissionError:
            if attempt == 4:
                print(f"    warning: converted {path.name}, but it is still locked; leaving the TIFF in place")
                break
            time.sleep(0.25 * (attempt + 1))
    return out


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def read_json(path, default):
    if not path.exists():
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)


def existing_file(out_dir, img_id):
    """The image already on disk, under the new slug name or the old id name."""
    for stem in (slug(img_id), img_id):
        for ext in EXTS:
            p = out_dir / f"{stem}{ext}"
            if p.exists() and p.stat().st_size > 0:
                return p
    return None


class Throttle:
    """
    One request at a time per host, spaced by RATE_LIMITS (with a little jitter), shared by every lesson in the run.
    A 429 slows that host for the rest of the run; three 429s in a row on a host trigger a long cool-off.
    """

    def __init__(self):
        self.last = {}
        self.gap = {}
        self.strikes = {}

    @staticmethod
    def host(url):
        return next((h for h in RATE_LIMITS if h in (url or "")), "default")

    def wait(self, url):
        host = self.host(url)
        gap = self.gap.setdefault(host, 60.0 / RATE_LIMITS[host])
        since = time.time() - self.last.get(host, 0)
        if since < gap:
            time.sleep(gap - since + random.uniform(0, gap * 0.2))
        self.last[host] = time.time()

    def ok(self, url):
        self.strikes[self.host(url)] = 0

    def throttled(self, url, retry_after):
        """Called on a 429: returns how long to wait before retrying, and slows the host down."""
        host = self.host(url)
        self.gap[host] = min(self.gap.get(host, 5.0) * 2, 60.0)
        self.strikes[host] = self.strikes.get(host, 0) + 1
        if self.strikes[host] >= 3:
            print(f"      {host} keeps throttling; cooling off {COOL_OFF // 60} min (now 1 request per {self.gap[host]:.0f}s)")
            self.strikes[host] = 0
            return COOL_OFF
        return max(retry_after or 0, 60)


def retry_after_seconds(headers):
    value = (headers or {}).get("Retry-After") if headers else None
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        try:
            return max(0, int((parsedate_to_datetime(value) - datetime.now(timezone.utc)).total_seconds()))
        except (TypeError, ValueError):
            return None


def fetch(url, throttle):
    """Bytes of an image at url, or raises with the reason. Waits its turn per host; backs off on 429 and 5xx."""
    delay = 10
    for attempt in range(5):
        throttle.wait(url)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "image/*"})
            with urllib.request.urlopen(req, timeout=90) as resp:
                ctype = resp.headers.get("Content-Type", "")
                if not ctype.startswith("image/"):
                    raise ValueError(f"not an image ({ctype or 'no content type'})")
                data = resp.read()
                declared = resp.headers.get("Content-Length")
                if declared and len(data) != int(declared):
                    raise http.client.IncompleteRead(data, int(declared) - len(data))
            throttle.ok(url)
            if len(data) < MIN_BYTES:
                raise ValueError(f"too small ({len(data) // 1024}KB), likely a thumbnail or error page")
            return data, ctype
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 4:
                wait = throttle.throttled(url, retry_after_seconds(e.headers))
                print(f"      HTTP 429, waiting {wait}s")
                time.sleep(wait)
                continue
            if e.code >= 500 and attempt < 4:
                print(f"      HTTP {e.code}, retrying in {delay}s")
                time.sleep(delay)
                delay *= 2
                continue
            raise ValueError(f"HTTP {e.code}")
        except (urllib.error.URLError, http.client.IncompleteRead,
                http.client.RemoteDisconnected, TimeoutError, ConnectionError) as e:
            if attempt < 4:
                print(f"      interrupted download ({str(getattr(e, 'reason', e))[:100]}), retrying in {delay}s")
                time.sleep(delay)
                delay *= 2
                continue
            raise ValueError(str(getattr(e, "reason", e))[:80])
    raise ValueError("gave up after retries")


def place(img, out_dir, throttle):
    """Returns (path, source_url, status) for one catalog image; path is None on failure."""
    img_id = img["id"]
    target_stem = out_dir / slug(img_id)
    have = existing_file(out_dir, img_id)
    if have and not FORCE:
        if have.stem != slug(img_id):
            new = target_stem.with_suffix(have.suffix)
            have.rename(new)
            have = new
            status = "moved"
        else:
            status = "exists"
        return have, img.get("primary_url") or img.get("alt_url"), status
    if REGISTER_ONLY:
        return None, None, "not on disk"
    errors = []
    for key in ("primary_url", "alt_url"):
        url = img.get(key)
        if not url:
            continue
        try:
            data, ctype = fetch(url, throttle)
        except ValueError as e:
            errors.append(f"{key}: {e}")
            continue
        out = target_stem.with_suffix(ext_for(url, ctype))
        out.parent.mkdir(parents=True, exist_ok=True)
        if have and have != out:
            have.unlink()
        out.write_bytes(data)
        return out, url, f"ok {key} {len(data) // 1024}KB"
    return None, None, "FAILED " + ("; ".join(errors) or "no URLs")


def download_lesson(lesson, throttle):
    catalog_path = CATALOG_DIR / f"{lesson}-images.json"
    if not catalog_path.exists():
        print(f"No catalog: {catalog_path}")
        return
    images = read_json(catalog_path, {}).get("images", [])
    out_dir = PUBLIC / "historic" / lesson
    registry_path = VIDEO2 / "data" / lesson / "images.json"
    registry = read_json(registry_path, {})
    lock = read_json(LOCK_PATH, {})
    counts = {"registered": 0, "failed": 0}
    print(f"\n=== {lesson}: {len(images)} images -> {out_dir} ===")
    for i, img in enumerate(images, 1):
        path, url, status = place(img, out_dir, throttle)
        if path and path.suffix in (".tif", ".tiff"):
            converted = tiff_to_jpeg(path)
            if not converted:
                print(f"  [{i}/{len(images)}] {img['id']}: TIFF needs Pillow to convert (pip install pillow); skipped")
                counts["failed"] += 1
                continue
            path = converted
        if not path:
            print(f"  [{i}/{len(images)}] {img['id']}: {status}")
            counts["failed"] += 1
            continue
        size = image_size(path)
        if not size:
            print(f"  [{i}/{len(images)}] {img['id']}: cannot read image size of {path.name}; skipped")
            counts["failed"] += 1
            continue
        rel = path.relative_to(PUBLIC).as_posix()
        digest = sha256(path)
        if lock.get(rel, {}).get("sha256") != digest:
            lock[rel] = {"source_url": url, "sha256": digest, "width": size[0], "height": size[1],
                         "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds")}
        if rel not in registry:
            registry[rel] = {"description": img.get("title", ""), "source_url": lock[rel]["source_url"],
                             "download_urls": [u for u in (img.get("primary_url"), img.get("alt_url")) if u],
                             "source": img.get("source"), "catalog_id": img["id"], "verified": img.get("verified")}
        counts["registered"] += 1
        print(f"  [{i}/{len(images)}] {img['id']}: {status} {size[0]}x{size[1]}")
        # Saved after every image, so a stopped run resumes where it left off.
        write_json(registry_path, registry)
        write_json(LOCK_PATH, dict(sorted(lock.items())))
    print(f"  {counts['registered']} registered, {counts['failed']} failed -> "
          f"{registry_path.relative_to(VIDEO2).as_posix()}, {LOCK_PATH.relative_to(VIDEO2).as_posix()}")


if __name__ == "__main__":
    throttle = Throttle()
    if "--all" in sys.argv:
        for catalog in sorted(CATALOG_DIR.glob("u3e*-images.json"), key=lambda p: int(p.name[3:].split("-")[0])):
            download_lesson(catalog.name.split("-")[0], throttle)
    elif "--lesson" in sys.argv:
        download_lesson(sys.argv[sys.argv.index("--lesson") + 1], throttle)
    else:
        print(__doc__)
