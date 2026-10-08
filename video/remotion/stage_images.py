#!/usr/bin/env python3
"""
stage_images.py — Image Collection Phase.

Scans episode TSX for image references, checks what's missing locally,
downloads from source URLs in images.json.

Persistence rules:
- images.json IS committed (the catalog: paths, sources, licenses, metadata)
- Image FILES are NOT committed (downloaded on demand)

Usage:
  python3 stage_images.py --episode E2              # check + download missing
  python3 stage_images.py --episode E2 --check-only # just report what's missing
  python3 stage_images.py --episode E2 --scan       # rebuild images.json from TSX

The images.json schema:
{
  "historic/u1e2/gold-coins.jpg": {
    "source_url": "https://upload.wikimedia.org/...",
    "license": "public domain",
    "description": "Spanish gold coins, 16th century",
    "used_in": ["E2:t01", "E2:t05"]
  }
}
"""

import argparse
import json
import re
import subprocess
import urllib.request
from pathlib import Path

# Base directory: this script's location. All paths anchor here, not cwd.
_BASE = Path(__file__).parent



def scan_tsx_for_images(episode):
    """Find all image references in episode TSX."""
    tsx_path = _BASE / f'src/components/U1{episode}Episode.tsx'
    if not tsx_path.exists():
        print(f"ERROR: {tsx_path} not found")
        return {}
    
    content = tsx_path.read_text()
    
    # Find all image references
    images = {}
    
    # bgImage: 'historic/...'
    for m in re.finditer(r"bgImage:\s*['\"]([^'\"]+)['\"]", content):
        path = m.group(1)
        # Find which turn it's in
        turn_m = re.search(r"turnId:\s*'(\w+)'[^}]*bgImage:\s*['\"]" + re.escape(path), content)
        turn = turn_m.group(1) if turn_m else 'unknown'
        images.setdefault(path, []).append(f"{episode}:{turn}")
    
    # mapImage: 'historic/...' or "historic/..."
    for m in re.finditer(r'mapImage:\s*["\']([^"\']+)["\']', content):
        path = m.group(1)
        if path.startswith('historic/'):
            images.setdefault(path, []).append(f"{episode}:map")
    
    # staticFile('historic/...')
    for m in re.finditer(r"staticFile\(['\"]([^'\"]+)['\"]\)", content):
        path = m.group(1)
        if path.startswith('historic/'):
            images.setdefault(path, []).append(f"{episode}:static")
    
    # Img src={staticFile(...)} already covered
    
    return images


def load_catalog():
    """Load images.json catalog."""
    catalog_path = _BASE / 'src/data/images.json'
    if catalog_path.exists():
        return json.loads(catalog_path.read_text())
    return {}


def save_catalog(catalog):
    """Save images.json catalog."""
    catalog_path = _BASE / 'src/data/images.json'
    catalog_path.parent.mkdir(parents=True, exist_ok=True)
    catalog_path.write_text(json.dumps(catalog, indent=1, sort_keys=True))
    print(f"Saved catalog: {catalog_path} ({len(catalog)} entries)")


def download_image(path, source_url):
    """Download image from source URL to public/ path."""
    dest = _BASE / f'public/{path}'
    dest.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"  Downloading {path}...")
    print(f"    from {source_url[:60]}...")
    
    try:
        urllib.request.urlretrieve(source_url, dest)
        print(f"    ✓ {dest.stat().st_size} bytes")
        return True
    except Exception as e:
        print(f"    ✗ Failed: {e}")
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', required=True, help='Episode ID (e.g. E2)')
    parser.add_argument('--check-only', action='store_true', help='Just report missing')
    parser.add_argument('--scan', action='store_true', help='Rebuild catalog from TSX scan')
    args = parser.parse_args()
    
    episode = args.episode.upper()
    
    # Scan TSX for image refs
    print(f"Scanning {episode} for image references...")
    found = scan_tsx_for_images(episode)
    print(f"  Found {len(found)} unique images")
    
    # Load catalog
    catalog = load_catalog()
    
    if args.scan:
        # Rebuild catalog entries for found images
        for path, used_in in found.items():
            if path not in catalog:
                catalog[path] = {
                    'source_url': '',  # TODO: fill in
                    'license': 'unknown',
                    'description': '',
                    'used_in': used_in,
                }
            else:
                # Update used_in
                existing = set(catalog[path].get('used_in', []))
                existing.update(used_in)
                catalog[path]['used_in'] = sorted(existing)
        
        save_catalog(catalog)
        print("\nCatalog rebuilt. Fill in source_url/license/description for new entries.")
        return 0
    
    # Check what's missing
    missing = []
    for path in found:
        local_path = _BASE / f'public/{path}'
        if not local_path.exists():
            missing.append(path)
    
    if not missing:
        print("✅ All images present locally")
        return 0
    
    print(f"\n❌ {len(missing)} images missing:")
    for path in missing:
        entry = catalog.get(path, {})
        source = entry.get('source_url', '(no source URL in catalog)')
        print(f"  {path}")
        print(f"    source: {source[:70]}")
    
    if args.check_only:
        return 1
    
    # Download missing
    print(f"\nDownloading {len(missing)} images...")
    failed = []
    for path in missing:
        entry = catalog.get(path, {})
        source_url = entry.get('source_url', '')
        if not source_url:
            print(f"  SKIP {path} (no source URL)")
            failed.append(path)
            continue
        if not download_image(path, source_url):
            failed.append(path)
    
    if failed:
        print(f"\n❌ {len(failed)} failed. Add source URLs to src/data/images.json")
        return 1
    
    print(f"\n✅ All images downloaded")
    return 0


if __name__ == '__main__':
    import sys
    sys.exit(main())
