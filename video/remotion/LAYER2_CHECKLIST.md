# Layer 2 Validation Checklist

Objective, binary checks for EVERY keyframe. No creative judgment — just facts.
Run this on all extracted beats before creative QA.

## Per-Keyframe Checks

For each `beat_XXX.png` with manifest entry:

### 1. Text Readability
- [ ] All text is legible (not too small, not blurred)
- [ ] Text has sufficient contrast against background
- [ ] No text is cut off at frame edges

**Fail if:** Any text <28px equivalent, beige-on-beige, or clipped.

### 2. Text Overlap
- [ ] No two text elements overlap
- [ ] Text does not overlap faces/heads
- [ ] Text does not overlap key visual elements

**Fail if:** Any bounding boxes intersect.

### 3. Frame Not Empty
- [ ] Frame has a visual beyond background + talking head
- [ ] At least one component is visible (text, image, map, leader, etc.)

**Fail if:** Only background texture and head visible.

### 4. Caption Match
- [ ] If caption/label present, it matches the manifest `text` field
- [ ] Labels (e.g. "SPAIN", "PORTUGAL") are on correct sides

**Fail if:** Caption contradicts beat metadata.

### 5. Map Correctness (if map visible)
- [ ] Map shows the geography being discussed
- [ ] Items move in correct direction (east = right, west = left)
- [ ] Labels match positions

**Fail if:** Wrong map for topic, or directions inverted.

### 6. Leader Correctness (if leader visible)
- [ ] Only ONE leader visible (no duplicates)
- [ ] Leader has name label
- [ ] Leader has role label (not just name)

**Fail if:** Duplicate leaders, missing labels.

## Output Format

```json
{
  "beat_000": {"pass": true, "checks": {"readability": true, "overlap": true, ...}},
  "beat_001": {"pass": false, "checks": {"readability": false, ...}, 
               "failures": ["Text 'OCTOBER 12' overlaps 'INDIANS'"]},
  ...
}
```

## After Layer 2

- All `pass: true` → proceed to Layer 3 (creative QA)
- Any `pass: false` → fix code, re-render, re-extract, re-run Layer 2
- Do NOT proceed to creative QA with Layer 2 failures
