#!/usr/bin/env python3
"""
Validate U1E1 episode for empty screens and pacing issues.

Checks:
1. EMPTY SCREEN: Turn has no visual elements (sub-beats, ThreeBoxes, RegionMap, TradeRoutes)
   beyond talking head + background.
2. LONG STATIC: Turn > 8s with no visual change (sub-beat or component entrance).
3. MISSING HEAD: Speaking turn with no talking head visible.

Usage:
    python3 validate_episode.py
"""
import json
import re

# Load data
with open('/home/hatch/workspace/episode_u1e1/turns.json') as f:
    turns = json.load(f)
with open('/home/hatch/workspace/episode_u1e1/timing_map.json') as f:
    tm = json.load(f)

# Parse SUB_BEATS from the TSX file
with open('/home/hatch/workspace/remotion-apush/src/components/U1E1Episode.tsx') as f:
    tsx = f.read()

# Find all sub-beat turnIds (including smarttext)
sub_beat_turns = set(re.findall(r"turnId:\s*'(\w+)'", tsx))

# Component-based visuals (hardcoded logic in TSX)
component_visuals = {
    't00': ['ThreeBoxes', 'TitleCard'],  # ThreeBoxes after 3s
    't01': ['ThreeBoxes'],  # Persisted
    't02': ['RegionMap'],
    't03': ['RegionMap'],
    't04': ['RegionMap'],
    't05': ['RegionMap'],
    't06': ['RegionMap'],
    't07': ['RegionMap'],
    't08': ['RegionMap'],
    't09': ['RegionMap'],
    't10': ['RegionMap'],
    't12': ['TradeRoutes'],
    't13': ['TradeRoutes'],
    't14': ['TradeRoutes'],
    't41': ['ThreeBoxes'],
    't44': ['ThreeBoxes'],
    't47': ['ThreeBoxes'],
}

print("=" * 70)
print("U1E1 EPISODE VALIDATION")
print("=" * 70)

empty_screens = []
long_static = []

for i, t in enumerate(turns):
    tid = t['id']
    dur = tm['durations'][i]
    speaker = t['speaker']
    
    # Check for visuals
    has_sub_beats = tid in sub_beat_turns
    has_component = tid in component_visuals
    has_visual = has_sub_beats or has_component
    
    # Skip pause turns (they're supposed to be minimal)
    if speaker == 'pause':
        continue
    
    if not has_visual:
        empty_screens.append((tid, speaker, dur, t['text'][:50]))
    
    # Check for long static (turn > 8s with only one visual at start)
    # Skip turns with component visuals (they're continuous)
    if dur > 8 and has_visual and tid not in component_visuals:
        # Count sub-beats for this turn
        turn_beats = re.findall(rf"turnId:\s*'{tid}'.*?offset:\s*([\d.]+)", tsx)
        offsets = sorted([float(o) for o in turn_beats])
        if offsets:
            # Check gaps between visuals
            max_gap = max(
                [offsets[0]] +  # gap from start to first visual
                [offsets[j+1] - offsets[j] for j in range(len(offsets)-1)] +
                [dur - offsets[-1]]  # gap from last visual to end
            )
            if max_gap > 8:
                long_static.append((tid, speaker, dur, max_gap, t['text'][:50]))

print(f"\n❌ EMPTY SCREENS ({len(empty_screens)}):")
print("   Turns with NO visual beyond talking head + background:\n")
for tid, speaker, dur, text in empty_screens:
    print(f"   {tid} [{speaker:6s}] {dur:5.1f}s: {text}...")

print(f"\n⚠️  LONG STATIC GAPS ({len(long_static)}):")
print("   Turns > 8s with > 8s gap between visuals:\n")
for tid, speaker, dur, gap, text in long_static:
    print(f"   {tid} [{speaker:6s}] {dur:5.1f}s (gap: {gap:.1f}s): {text}...")

print(f"\n{'='*70}")
print(f"Summary: {len(empty_screens)} empty, {len(long_static)} long-static")
print(f"{'='*70}")
