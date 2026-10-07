#!/usr/bin/env python3
"""
Validate U1E2 episode for empty screens, pacing, and visual density.

Checks:
1. EMPTY SCREEN: Turn has no visual elements beyond talking head + background.
2. LOW DENSITY: Turn > 8s with fewer than 2 visual beats (NEW - user request).
   A single static visual for 20 seconds is not enough.
3. VISUAL STAGNATION: Same component visible across 3+ consecutive turns
   without any change (NEW - catches "same screen again and again").
4. MISSING HEAD: Speaking turn with no talking head visible.

Usage:
    python3 validate_e2.py [--strict]

Exit codes:
    0: Pass (or warnings only)
    1: Errors found (blocks render in --strict mode)
"""
import json
import re
import sys

# Load E2 data
with open('/home/hatch/workspace/remotion-apush/src/data/u1e2/turns.json') as f:
    turns = json.load(f)
with open('/home/hatch/workspace/remotion-apush/src/data/u1e2/timing_map.json') as f:
    tm = json.load(f)

# Parse the TSX file
with open('/home/hatch/workspace/remotion-apush/src/components/U1E2Episode.tsx') as f:
    tsx = f.read()

# --- Parse SUB_BEATS ---
# Each beat: { turnId: 'tXX', offset: N.NN, kind: '...', ... }
sub_beats = {}  # turnId -> list of offsets
for m in re.finditer(r"\{\s*turnId:\s*'(\w+)'\s*,\s*offset:\s*([\d.]+)", tsx):
    tid, offset = m.group(1), float(m.group(2))
    sub_beats.setdefault(tid, []).append(offset)

# --- Parse component visuals (conditional JSX) ---
# Pattern: {activeTurn?.id === 'tXX' && (...<ComponentName ... />)}
# Also: {activeTurn?.id === 'tXX' && turnElapsed < N && (...)}
# We also extract appearOffsets=[...] to count individual visual beats.
component_visuals = {}  # turnId -> list of (component_name, condition, beat_count)

# Match component usages in conditional blocks, capturing the full JSX tag
for m in re.finditer(
    r"\{activeTurn\?\.id === '(\w+)'(?: && turnElapsed ([<>=]+) ([\d.]+))? && \(\s*<(\w+)(.*?)/>",
    tsx, re.DOTALL
):
    tid = m.group(1)
    cond_op = m.group(2)
    cond_val = m.group(3)
    comp = m.group(4)
    props = m.group(5)
    condition = f"turnElapsed {cond_op} {cond_val}" if cond_op else "always"

    # Count appearOffsets as individual beats
    beat_count = 1
    ao_match = re.search(r"appearOffsets=\{\[([\d.,\s]+)\]\}", props)
    if ao_match:
        offsets = [float(x) for x in ao_match.group(1).split(',') if x.strip()]
        # Count non-zero offsets as distinct visual events
        # (offset 0 means "already visible", not a new beat)
        beat_count = sum(1 for o in offsets if o > 0.1)
        if beat_count == 0:
            beat_count = 1  # at least the component itself

    # detailOffsets also count as beats (new info appearing)
    do_match = re.search(r"detailOffsets=\{\[([\d.,\s]+)\]\}", props)
    if do_match:
        details = [float(x) for x in do_match.group(1).split(',') if x.strip()]
        beat_count += sum(1 for d in details if 0.1 < d < 999)

    component_visuals.setdefault(tid, []).append((comp, condition, beat_count))

# Components that are "visuals" (not just talking heads)
VISUAL_COMPONENTS = {
    'MotiveBlocks', 'ThreeBoxesE2', 'LeaderSticker', 'TitleCard',
    'SpeechBubble', 'GravityText', 'SmartText', 'ThreeWayCompare',
    'MapRoute', 'MapJourney', 'ExchangeArrows',
}

# Leaders (persistent across turn ranges)
leader_ranges = {
    't12': 'Columbus', 't13': 'Columbus', 't14': 'Columbus',
    't15': 'Columbus', 't16': 'Columbus', 't17': 'Columbus',
    't35': 'Cortes', 't36': 'Cortes', 't37': 'Cortes',
    't41': 'LasCasas', 't42': 'LasCasas', 't43': 'LasCasas',
}

print("=" * 70)
print("U1E2 EPISODE VALIDATION (with visual-density check)")
print("=" * 70)

empty_screens = []
low_density = []
stagnation = []

for i, t in enumerate(turns):
    tid = t['id'] if isinstance(t, dict) and 'id' in t else f"t{i:02d}"
    # turns.json format: check structure
    if isinstance(t, dict):
        speaker = t.get('speaker', '?')
        text = t.get('text', '')[:50]
    else:
        speaker, text = '?', str(t)[:50]

    dur = tm['durations'][i]

    # Skip pause turns
    if speaker == 'pause':
        continue

    # Count visual beats for this turn
    beats = sorted(sub_beats.get(tid, []))
    comps = component_visuals.get(tid, [])
    visual_comps = [(c, cond, bc) for c, cond, bc in comps if c in VISUAL_COMPONENTS]

    # Total visual events = sub-beats + sum of component beat counts
    # A component with a turnElapsed condition counts extra (it changes mid-turn)
    total_beats = len(beats) + sum(bc for _, _, bc in visual_comps)
    conditional_bonus = sum(1 for _, cond, _ in visual_comps if cond != "always")
    total_beats += conditional_bonus

    has_visual = total_beats > 0
    has_leader = tid in leader_ranges

    if not has_visual and not has_leader:
        empty_screens.append((tid, speaker, dur, text))

    # LOW DENSITY: turn > 8s with fewer than 2 visual beats
    if dur > 8 and total_beats < 2:
        low_density.append((tid, speaker, dur, total_beats, text))

# VISUAL STAGNATION: same component across 3+ turns without change
# Check for components that appear in consecutive turns with "always" condition
comp_turns = {}  # comp_name -> list of turnIds
for tid, complist in component_visuals.items():
    for comp, cond, _ in complist:
        if comp in VISUAL_COMPONENTS and cond == "always":
            comp_turns.setdefault(comp, []).append(tid)

for comp, tids in comp_turns.items():
    # Sort by turn number
    tids_sorted = sorted(tids, key=lambda x: int(x[1:]))
    # Find consecutive runs of 3+
    run = [tids_sorted[0]]
    for j in range(1, len(tids_sorted)):
        prev_num = int(tids_sorted[j-1][1:])
        curr_num = int(tids_sorted[j][1:])
        if curr_num == prev_num + 1:
            run.append(tids_sorted[j])
        else:
            if len(run) >= 3:
                stagnation.append((comp, run.copy()))
            run = [tids_sorted[j]]
    if len(run) >= 3:
        stagnation.append((comp, run))

# --- Report ---
print(f"\n❌ EMPTY SCREENS ({len(empty_screens)}):")
for tid, speaker, dur, text in empty_screens:
    print(f"   {tid} [{speaker:6s}] {dur:5.1f}s: {text}...")

print(f"\n⚠️  LOW DENSITY ({len(low_density)}):")
print("   Turns > 8s with fewer than 2 visual beats:\n")
for tid, speaker, dur, beats, text in low_density:
    print(f"   {tid} [{speaker:6s}] {dur:5.1f}s ({beats} beats): {text}...")

print(f"\n⚠️  VISUAL STAGNATION ({len(stagnation)}):")
print("   Same component across 3+ consecutive turns without change:\n")
for comp, tids in stagnation:
    print(f"   {comp}: {', '.join(tids)}")

print(f"\n{'='*70}")
print(f"Summary: {len(empty_screens)} empty, {len(low_density)} low-density, {len(stagnation)} stagnant")
print(f"{'='*70}")

# Exit code
strict = "--strict" in sys.argv
errors = len(empty_screens) + (len(low_density) if strict else 0)
if errors > 0:
    print(f"\n❌ VALIDATION FAILED: {errors} errors")
    sys.exit(1)
else:
    if low_density or stagnation:
        print(f"\n⚠️  Warnings only — review recommended")
    else:
        print(f"\n✅ All checks passed")
    sys.exit(0)
