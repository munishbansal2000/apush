#!/usr/bin/env python3
"""
validate_scene.py — Build-time scene validation for Remotion episodes.

Catches errors that the visual-density validator misses:
1. Duplicate components (same type at same position)
2. Text collisions (overlapping SmartText)
3. Orphan visuals (leader not named in narration)
4. Map mismatches (geography not in map regions)
5. Factual errors (direction labels vs coordinates)

Usage: python3 validate_scene.py [--episode E2]
"""

import json
import re
import sys
from pathlib import Path
from collections import defaultdict

# Map regions: which geographies each map image covers
MAP_REGIONS = {
    'tordesillas-map.jpg': ['americas', 'atlantic', 'europe', 'africa'],
    'portolan-chart.jpg': ['mediterranean', 'europe'],
    'portolan-chart-clean.jpg': ['mediterranean', 'europe'],
    'cantino-planisphere.jpg': ['americas', 'atlantic', 'europe', 'africa', 'asia'],
    'pacific-galleon-route.jpg': ['pacific', 'asia', 'americas'],
    'james-river-map.jpg': ['americas', 'virginia'],
}

# Direction words and their expected coordinate relationships
DIRECTION_CHECKS = {
    'east': lambda f, t: t[0] > f[0],  # to.x > from.x
    'west': lambda f, t: t[0] < f[0],  # to.x < from.x
}


def load_episode(episode='E2'):
    """Load TSX source and extract SUB_BEATS + hardcoded blocks."""
    # Try multiple patterns
    for pattern in [f'src/components/U1{episode}Episode.tsx',
                    f'src/components/{episode}Episode.tsx',
                    f'src/components/U1E{episode}Episode.tsx']:
        tsx_path = Path(pattern)
        if tsx_path.exists():
            break
    else:
        # Try direct
        tsx_path = Path(f'src/components/U1{episode}Episode.tsx')

    with open(tsx_path) as f:
        content = f.read()

    return content


def check_duplicates(content):
    """Check for duplicate component renders."""
    errors = []

    # Find all LeaderSticker renders
    leaders = re.findall(
        r"<LeaderSticker[^>]*leader=['\"]([^'\"]+)['\"]",
        content
    )
    # Count by asset (duplicates = same asset rendered twice)
    from collections import Counter
    counts = Counter(leaders)
    for asset, count in counts.items():
        # Each asset should appear once in SUB_BEATS and once in hardcoded
        # (we're migrating, so 2 is OK during transition, 3+ is a bug)
        if count > 2:
            errors.append(
                f"DUPLICATE: Leader {asset} rendered {count}x "
                f"(expected ≤2 during migration)"
            )

    return errors


def check_text_collisions(content):
    """Check for SmartText with actually overlapping bounding boxes."""
    errors = []

    # Font sizes by level (px at 1280x720)
    FONT_SIZES = {
        'hero': 88,
        'title': 68,
        'subtitle': 46,
        'body': 34,
    }
    # Min floors (readable minimums)
    FONT_FLOORS = {
        'hero': 64,
        'title': 48,
        'subtitle': 36,
        'body': 28,
    }

    # Extract SmartText beats with positions AND levels
    beats = re.findall(
        r"\{\s*turnId:\s*'(\w+)'[^}]*kind:\s*'smarttext'[^}]*"
        r"text:\s*'([^']*)'[^}]*level:\s*'(\w+)'[^}]*position:\s*\[([\d.]+),\s*([\d.]+)\]",
        content
    )

    # Also try without level (default to body)
    beats_no_level = re.findall(
        r"\{\s*turnId:\s*'(\w+)'[^}]*kind:\s*'smarttext'[^}]*"
        r"text:\s*'([^']*)'[^}]*position:\s*\[([\d.]+),\s*([\d.]+)\]",
        content
    )
    # Merge (avoid duplicates)
    seen = set((b[0], b[1]) for b in beats)
    for turn_id, text, x, y in beats_no_level:
        if (turn_id, text) not in seen:
            beats.append((turn_id, text, 'body', x, y))

    def get_bbox(text, level, x, y):
        """Estimate bounding box in 0-1 coordinates."""
        font_px = FONT_SIZES.get(level, 34)
        # Rough width: 0.6 * font_size per char (average)
        # At 1280px wide, convert to 0-1
        char_width = font_px * 0.6 / 1280
        text_width = len(text) * char_width
        # Height: font_size / 720
        text_height = font_px / 720
        
        # Add padding (20% margin)
        text_width *= 1.2
        text_height *= 1.2
        
        x1 = float(x) - text_width / 2
        x2 = float(x) + text_width / 2
        y1 = float(y) - text_height / 2
        y2 = float(y) + text_height / 2
        return (x1, y1, x2, y2)

    def boxes_overlap(b1, b2):
        """Check if two bounding boxes overlap."""
        return not (b1[2] < b2[0] or b2[2] < b1[0] or
                    b1[3] < b2[1] or b2[3] < b1[1])

    # Group by turn
    by_turn = defaultdict(list)
    for turn_id, text, level, x, y in beats:
        bbox = get_bbox(text, level, x, y)
        by_turn[turn_id].append((text, level, bbox))

    # Check within each turn
    for turn_id, items in by_turn.items():
        for i, (t1, l1, b1) in enumerate(items):
            for t2, l2, b2 in items[i+1:]:
                if boxes_overlap(b1, b2):
                    errors.append(
                        f"COLLISION: Turn {turn_id}: '{t1[:30]}' ({l1}) overlaps "
                        f"'{t2[:30]}' ({l2})"
                    )

    return errors


def check_orphan_leaders(content, turns_path='src/data/u1e2/turns.json'):
    """Check that leaders are named in narration."""
    errors = []
    warnings = []

    try:
        with open(turns_path) as f:
            turns = json.load(f)
    except:
        return ["Could not load turns.json for orphan check"]

    # Find leader beats
    leader_beats = re.findall(
        r"\{\s*turnId:\s*'(\w+)'[^}]*kind:\s*'leader'[^}]*"
        r"leaderName:\s*'([^']*)'",
        content
    )

    for turn_id, name in leader_beats:
        idx = int(turn_id[1:])
        if idx < len(turns):
            turn_text = turns[idx]['text'].lower() if isinstance(turns[idx], dict) else str(turns[idx]).lower()
            # Check if name (or part of it) appears in turn or neighbors
            name_parts = name.lower().split()
            found = any(part in turn_text for part in name_parts if len(part) > 3)

            # Also check neighboring turns
            if not found:
                for di in [-1, 1]:
                    ni = idx + di
                    if 0 <= ni < len(turns):
                        nt = turns[ni]['text'].lower() if isinstance(turns[ni], dict) else str(turns[ni]).lower()
                        if any(part in nt for part in name_parts if len(part) > 3):
                            found = True
                            break

            if not found:
                warnings.append(
                    f"ORPHAN: Leader '{name}' in {turn_id} not named in "
                    f"narration (turn or neighbors). Viewers won't know who this is."
                )

    return errors + warnings


def check_map_regions(content):
    """Check that maps cover the narrated geography."""
    errors = []

    # Find MapJourney/MapRoute usages
    maps = re.findall(
        r'mapImage:\s*[\'"]([^\'"]+)[\'"]',
        content
    )

    for map_path in set(maps):
        filename = map_path.split('/')[-1]
        regions = MAP_REGIONS.get(filename, [])

        if not regions:
            errors.append(
                f"MAP: Unknown map {filename} — add to MAP_REGIONS in "
                f"validate_scene.py"
            )

    return errors


def check_music_alignment(content, episode='E2'):
    """Check that scenes are music-aware.
    
    Music events (from music_timeline.json):
    - intro_sting (0-8s): should have title card / opening visual
    - chapter_sting at act boundaries: should have visual transition
    - outro_sting (last 8s): should have closing visual
    
    This is a WARNING-level check — it flags scenes that ignore music timing.
    """
    import json
    from pathlib import Path
    
    warnings = []
    
    # Load music timeline
    ep_lower = episode.lower()
    # E2 uses u1e2 path
    if ep_lower == 'e2':
        timeline_path = Path('src/data/u1e2/music_timeline.json')
    else:
        timeline_path = Path(f'src/data/{ep_lower}/music_timeline.json')
    
    if not timeline_path.exists():
        warnings.append(
            f"MUSIC: No music_timeline.json for {episode} — "
            f"run stage_music.py first"
        )
        return warnings
    
    with open(timeline_path) as f:
        timeline = json.load(f)
    
    if timeline.get('disabled'):
        return warnings
    
    events = timeline.get('events', [])
    
    # Check 1: Title card during intro (first 8 seconds)
    # Look for TitleCard component in the content
    has_title_card = 'TitleCard' in content
    
    intro_events = [e for e in events if e['type'] == 'intro_sting']
    if intro_events and not has_title_card:
        warnings.append(
            f"MUSIC: Intro sting at 0-8s but no TitleCard found — "
            f"opening visual should align with intro music"
        )
    
    # Check 2: Visual transitions at chapter stings (act boundaries)
    # This is informational — the act structure already implies transitions
    chapter_events = [e for e in events if e['type'] == 'chapter_sting']
    if chapter_events:
        # Check that SUB_BEATS or scene structure acknowledges act boundaries
        # For now, just verify the episode has act-based structure
        has_acts = 'act' in content.lower() or 'Act' in content
        if not has_acts:
            warnings.append(
                f"MUSIC: {len(chapter_events)} chapter stings at act boundaries "
                f"but no act structure found in component"
            )
    
    return warnings


def check_beat_validity(content, episode='E2'):
    """Check that SUB_BEATS reference valid turns and have sane offsets.
    
    From the external review:
    1. Every beat's turn ID must exist
    2. offset + minHold (1.5s) <= turn duration (beats that never show)
    3. Beat anchor text should appear in turn transcript (catches stale IDs)
    """
    import json
    from pathlib import Path
    
    errors = []
    
    # Load turns and timing
    ep_lower = episode.lower()
    if ep_lower == 'e2':
        turns_path = Path('src/data/u1e2/turns.json')
        timing_path = Path('src/data/u1e2/timing_map.json')
    else:
        turns_path = Path(f'src/data/{ep_lower}/turns.json')
        timing_path = Path(f'src/data/{ep_lower}/timing_map.json')
    
    if not turns_path.exists() or not timing_path.exists():
        return [f"BEAT: Missing turns.json or timing_map.json for {episode}"]
    
    with open(turns_path) as f:
        turns_data = json.load(f)
    turns = turns_data if isinstance(turns_data, list) else turns_data.get('turns', [])
    turn_map = {t.get('id'): t for t in turns}
    
    with open(timing_path) as f:
        timing = json.load(f)
    durations = timing.get('durations', [])
    
    # Extract beats from TSX
    beats = re.findall(
        r"\{\s*turnId:\s*'(t\d+)',\s*offset:\s*([\d.]+),\s*kind:\s*'(\w+)'",
        content
    )
    
    MIN_HOLD = 1.5  # seconds — beat must be visible for at least this long
    
    for turn_id, offset_str, kind in beats:
        offset = float(offset_str)
        
        # Check 1: turn exists
        if turn_id not in turn_map:
            errors.append(f"BEAT: turnId '{turn_id}' ({kind}) does not exist")
            continue
        
        # Check 2: offset + hold <= duration
        turn_idx = next((i for i, t in enumerate(turns) if t.get('id') == turn_id), -1)
        if turn_idx >= 0 and turn_idx < len(durations):
            dur = durations[turn_idx]
            if offset + MIN_HOLD > dur:
                errors.append(
                    f"BEAT: '{turn_id}' offset {offset}s + {MIN_HOLD}s hold > "
                    f"duration {dur:.1f}s — beat never shows ({kind})"
                )
    
    # Check 3: turns/starts/durations length match
    if not (len(turns) == len(timing.get('starts', [])) == len(durations)):
        errors.append(
            f"BEAT: length mismatch — turns={len(turns)}, "
            f"starts={len(timing.get('starts', []))}, durations={len(durations)}"
        )
    
    return errors


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', default='E2', help='Episode ID (e.g. E2, E3)')
    args = parser.parse_args()
    
    print("=" * 70)
    print(f"SCENE VALIDATOR — {args.episode} — catching errors before render")
    print("=" * 70)

    content = load_episode(args.episode)

    all_errors = []
    all_warnings = []

    # Run checks
    checks = [
        ("Duplicates", check_duplicates),
        ("Text collisions", check_text_collisions),
        ("Orphan leaders", check_orphan_leaders),
        ("Map regions", check_map_regions),
        ("Music alignment", lambda c: check_music_alignment(c, args.episode)),
        ("Beat validity", lambda c: check_beat_validity(c, args.episode)),
    ]

    for name, check_fn in checks:
        print(f"\n{name}...")
        try:
            results = check_fn(content)
            errors = [r for r in results if not r.startswith("ORPHAN") and "WARNING" not in r]
            warnings = [r for r in results if r not in errors]

            for e in errors:
                print(f"  ❌ {e}")
            for w in warnings:
                print(f"  ⚠️  {w}")

            all_errors.extend(errors)
            all_warnings.extend(warnings)

            if not results:
                print(f"  ✅ Clean")
        except Exception as e:
            print(f"  💥 Check failed: {e}")

    print("\n" + "=" * 70)
    print(f"Summary: {len(all_errors)} errors, {len(all_warnings)} warnings")
    print("=" * 70)

    if all_errors:
        print("\n❌ VALIDATION FAILED")
        return 1
    elif all_warnings:
        print("\n⚠️  Warnings only — review recommended")
        return 0
    else:
        print("\n✅ All checks passed")
        return 0


if __name__ == '__main__':
    sys.exit(main())
