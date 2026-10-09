#!/usr/bin/env python3
"""
Download cataloged images for Unit 3 lessons.
Reads /home/hatch/workspace/u3-assets/u3e<N>-images.json,
downloads primary_url (falls back to alt_url), saves to
video2/public/historic/<episode>/.

Usage: python3 download-u3-images.py [--lesson u3e2] [--all]
"""
import json, os, sys, time, urllib.request, urllib.error
from pathlib import Path

CATALOG_DIR = Path(__file__).parent.parent / "data" / "u3-catalogs"
OUTPUT_BASE = Path(__file__).parent.parent / "public" / "historic"

# Rate limits per host (requests per minute)
RATE_LIMITS = {
    "upload.wikimedia.org": 20,
    "cdn.loc.gov": 20,
    "tile.loc.gov": 20,
    "images.nypl.org": 30,
    "default": 30,
}

def rate_bucket(url):
    for host in RATE_LIMITS:
        if host != "default" and host in url:
            return host
    return "default"

def wait_for_host(url, last_host_time):
    """Pace only real requests, using the host actually being requested."""
    host = rate_bucket(url)
    min_interval = 60.0 / RATE_LIMITS[host]
    elapsed = time.time() - last_host_time.get(host, 0)
    if elapsed < min_interval:
        time.sleep(min_interval - elapsed)
    last_host_time[host] = time.time()

FORCE = "--force" in sys.argv

def output_path(img_id, url, out_dir):
    ext = ".jpg"
    if ".png" in url.lower():
        ext = ".png"
    elif ".webp" in url.lower():
        ext = ".webp"
    elif ".tif" in url.lower():
        ext = ".tif"
    return out_dir / f"{img_id}{ext}"

def download_one(img, out_dir, last_host_time):
    img_id = img["id"]
    last_error = "no URLs"
    urls = [img.get(key) for key in ["primary_url", "alt_url"] if img.get(key)]
    # A fallback may have a different extension. Check every possible output
    # before sleeping or touching the network.
    if not FORCE:
        for url in urls:
            existing = output_path(img_id, url, out_dir)
            if existing.exists() and existing.stat().st_size > 0:
                return f"skip (exists): {img_id}"

    for url_key in ["primary_url", "alt_url"]:
        url = img.get(url_key)
        if not url:
            continue
        out_path = output_path(img_id, url, out_dir)
        for _retry in range(3):
            try:
                wait_for_host(url, last_host_time)
                req = urllib.request.Request(url, headers={"User-Agent": "APUSH-Educational/1.0"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    ctype = resp.headers.get("Content-Type", "")
                    if not ctype.startswith("image/"):
                        last_error = f"unusable content type {ctype}"
                        break  # Try the alternate URL; this response will not improve on retry.
                    data = resp.read()
                    if len(data) < 50 * 1024:
                        last_error = f"image too small ({len(data)} bytes)"
                        break  # Likely a thumbnail or error image; try the alternate URL.
                    out_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(out_path, "wb") as f:
                        f.write(data)
                    return f"ok ({url_key}): {img_id} ({len(data)//1024}KB)"
            except Exception as e:
                last_error = str(e)[:60]
                # Retry this exact source up to three times before using the
                # alternate. wait_for_host() paces every actual retry.
                continue
    
    return f"FAILED: {img_id} ({last_error})"

def download_lesson(lesson):
    catalog_path = CATALOG_DIR / f"{lesson}-images.json"
    if not catalog_path.exists():
        print(f"No catalog: {catalog_path}")
        return
    
    with open(catalog_path) as f:
        catalog = json.load(f)
    
    images = catalog.get("images", [])
    out_dir = OUTPUT_BASE / lesson
    print(f"\n=== {lesson}: {len(images)} images → {out_dir} ===")
    
    last_host_time = {}
    for i, img in enumerate(images):
        result = download_one(img, out_dir, last_host_time)
        print(f"  [{i+1}/{len(images)}] {result}")

if __name__ == "__main__":
    if "--all" in sys.argv:
        for lesson in ["u3e1", "u3e2", "u3e3", "u3e4", "u3e6", "u3e7", "u3e9", "u3e10", "u3e11"]:
            download_lesson(lesson)
    elif "--lesson" in sys.argv:
        idx = sys.argv.index("--lesson")
        download_lesson(sys.argv[idx + 1])
    else:
        print("Usage: python3 download-u3-images.py [--lesson u3e2] [--all]")
