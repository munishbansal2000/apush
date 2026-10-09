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

CATALOG_DIR = Path(__file__).parent / "data" / "u3-catalogs"
OUTPUT_BASE = Path(__file__).parent / "public" / "historic"

# Rate limits per host (requests per minute)
RATE_LIMITS = {
    "upload.wikimedia.org": 20,
    "cdn.loc.gov": 20,
    "tile.loc.gov": 20,
    "images.nypl.org": 30,
    "default": 30,
}

def get_rate_limit(url):
    for host, limit in RATE_LIMITS.items():
        if host in url:
            return limit
    return RATE_LIMITS["default"]

def download_one(img, out_dir):
    img_id = img["id"]
    # Determine extension from URL or default to .jpg
    for url_key in ["primary_url", "alt_url"]:
        url = img.get(url_key)
        if not url:
            continue
        ext = ".jpg"
        if ".png" in url.lower():
            ext = ".png"
        elif ".webp" in url.lower():
            ext = ".webp"
        elif ".tif" in url.lower():
            ext = ".tif"
        
        out_path = out_dir / f"{img_id}{ext}"
        if out_path.exists() and out_path.stat().st_size > 0:
            return f"skip (exists): {img_id}"
        
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "APUSH-Educational/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                ctype = resp.headers.get("Content-Type", "")
                if not ctype.startswith("image/"):
                    continue  # Not an image, try alt
                data = resp.read()
                if len(data) < 1024:
                    continue  # Too small, likely error page
                out_path.parent.mkdir(parents=True, exist_ok=True)
                with open(out_path, "wb") as f:
                    f.write(data)
                return f"ok ({url_key}): {img_id} ({len(data)//1024}KB)"
        except Exception as e:
            continue  # Try alt_url
    
    return f"FAILED: {img_id}"

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
        url = img.get("primary_url", "")
        host = next((h for h in RATE_LIMITS if h in url), "default")
        limit = RATE_LIMITS.get(host, 30)
        min_interval = 60.0 / limit
        
        # Rate limit
        now = time.time()
        if host in last_host_time:
            elapsed = now - last_host_time[host]
            if elapsed < min_interval:
                time.sleep(min_interval - elapsed)
        last_host_time[host] = time.time()
        
        result = download_one(img, out_dir)
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
