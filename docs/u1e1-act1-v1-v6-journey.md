# U1-E1 Act 1: v1 → v6 Journey

**Date:** 2026-10-05
**Episode:** APUSH U1-E1, Act 1 (t00–t11, 104.6s)
**Goal:** Rebuild to final production standards, act by act

---

## The Problem We Started With

**v1 (original):**
- StaggerSlide title not rendering (library bug)
- 3-second blank/black screen at opening
- Old inappropriate images (modern museum wampum, prairie burn, Yellowstone bison)
- Panels entering 0.6s AFTER words spoken (text lagging)
- Scenes cut at turn boundaries, visuals 5+ seconds misaligned from narration
- "Three boxes" had 4 panels crammed in

**User feedback that drove the rebuild:**
- "still old" / "the 3 images at start, 3 sec blank screen"
- "there is so much spoken text between first slide and 2nd with no matching?"
- "these slides feel wrong, text is always lagging"
- "did you fk up the 3 image code? now it is showing up on half the screen"
- "we move to next slide and the content on the slide is discussed 5 sec later"
- "on three box slide, why cram 4th?"

---

## Version History

### v1 → v2: Title Bug Fix
**Problem:** StaggerSlide title not rendering.
**Root cause:** Title was drawn on PIL image but never copied back to frame before panel rendering.
**Fix (library code):** `slideforge/slideforge/slides.py` — convert title-modified PIL back to frame.
**Result:** Title visible, but still blank opening + old images.

### v2 → v3: Image Replacement + Blank Screen
**Problem:** 3s blank screen at start; old images (wampum museum photo, prairie burn).
**Fixes:**
- Added `bg` image to StaggerSlide (dimmed wilderness) so frame 0 isn't black
- Replaced all 3 opening images:
  - Maize: 19th-c. botanical illustration
  - Iroquois: McKenney-Hall portrait (face_top crop)
  - Wilderness: atmospheric still from LTX plate
**Result:** No blank screen, new images. But text still lagging.

### v3 → v4: Text Timing Fix (Library Code)
**Problem:** Panels started entering AT the word time, finishing 0.6s later. Text lagged narration.
**Root cause:** StaggerSlide `at` parameter meant "entrance starts at" not "visible by".
**Fix (library code):** Changed `at` semantics to "fully visible BY this time":
```python
# Before:
k = a01(t, p["at"], self.entrance_dur, ease=smooth)
# After:
k = a01(t, p["at"] - self.entrance_dur, self.entrance_dur, ease=smooth)
```
Also fixed label fade to occur DURING entrance (was starting after panel settled).
**Result:** Panels land exactly on spoken words. Added 4th panel (Cahokia) for narration gap.

### v4 → v5: Topic Alignment (Scene Structure)
**Problem:** Scenes cut at turn boundaries, but topics change WITHIN turns.
Example: "Two societies" headline appeared at 20.1s (turn start) but phrase spoken at 24.4s (4.3s later).
**Fix:** Split turns at topic boundaries using word timings:
- t01 (20.1-27.7s) → 20.1-24.4s ("Four topics") + 24.4-28.7s ("Two societies")
- t02 (27.7-35.6s) → 28.7-35.6s ("Environment" at 28.7s)
- t09-t10 → 82.4-87.0s ("One thing") + 87.0-93.2s ("Tipis, maybe?") + 93.2-104.6s ("Never one culture")
**Result:** Every visual appears WHEN its topic is spoken.

### v5 → v6: Three Boxes Fix
**Problem:** "Three boxes" slide had 4 panels (Cahokia crammed in).
**Fix:** Removed Cahokia panel. Created separate ImageSlide scene at 13.5s for Cahokia narration.
**Result:** Three boxes = three panels. Clean.

### v6 → Director: Prompt Engineering
**Problem:** Director prompt FORCED turn-boundary scenes, causing v1-v4 misalignment.
**Prompt changes (v1 → v6 prompt):**
1. **Schema v1 → v2:** Scenes use `start_sec`/`duration_sec` (absolute time) instead of `turns: [first, last]` (turn indices). Allows sub-turn splits.
2. **TOPIC ALIGNMENT rule added:** "A visual must appear WHEN its topic is spoken, not seconds before or after. Use WORD TIMES to find the exact moment. Scenes may split turns at topic boundaries."
3. **StaggerSlide docs updated:** "`at` is when it must be FULLY VISIBLE" (was "entrance time").
4. **RevealSlide added** to slide list (28 types, was 27).
5. **Headline timing rule:** "For DisplayHeadline scenes, start_sec must equal the absolute word time when the headline phrase is spoken, not the turn start time."
6. **Explicit topic map** in prompt: Lists each topic with absolute time ranges.

**Result:** Director generated v6-quality plan for t00-t11 on first try.

---

## Pipeline Fixes (Library Code)

All in `slideforge/slideforge/slides.py` unless noted:

1. **StaggerSlide title rendering** (v2)
   - Bug: Title drawn on PIL but not copied back to frame
   - Fix: Convert title-modified PIL back to numpy frame

2. **StaggerSlide `at` semantics** (v4)
   - Changed from "entrance starts at" to "fully visible by"
   - Entrance now begins `entrance_dur` seconds earlier
   - Panels land exactly on spoken words

3. **StaggerSlide label timing** (v4)
   - Was: Label fade started AFTER panel settled (`at + 0.4*dur`)
   - Now: Label fades DURING entrance (`at - 0.6*dur`)
   - Eliminates additional 0.4s lag

4. **StaggerSlide entrance offset** (v4)
   - Was: Offset by 0.6 * screen width (panels invisible 45% of entrance)
   - Now: Offset by panel width + 40px (visible throughout)
   - Fixes "showing up on half the screen" / empty screen during entrance

5. **New RevealSlide** (v6)
   - Heimler-style: red banner, parchment bg, typewriter points
   - Supports cutaway/resume: `at: -1` keeps point visible on return
   - Registered as `@slide('reveal')`

6. **New parchment background** (v6)
   - In `slideforge/slideforge/backgrounds.py`
   - Light paper texture, warm off-white, subtle grain
   - Registered as `@background('parchment')`

---

## Prompt Evolution

### Original Director Prompt (v1)
- 27 slide types
- Schema v1: `{"turns": [first, last]}` — FORCED turn-boundary scenes
- "Scenes' turns ranges must partition ALL script turns contiguously"
- StaggerSlide: "`at`: entrance time in seconds"
- No topic alignment rule
- **Result:** v1-v4 misalignment (visuals 5s early/late)

### Updated Director Prompt (v6)
- 28 slide types (added RevealSlide)
- Schema v2: `{"start_sec": 0.0, "duration_sec": 8.2}` — allows sub-turn splits
- "Scenes must partition the timeline contiguously... MAY split turns at topic boundaries"
- **TOPIC ALIGNMENT (critical):** "A visual must appear WHEN its topic is spoken, not seconds before or after. Use WORD TIMES to find the exact moment."
- StaggerSlide: "`at` is when it must be FULLY VISIBLE"
- **Headline timing rule:** "start_sec must equal the absolute word time when the headline phrase is spoken, not the turn start time"
- Explicit topic map with absolute times
- **Result:** Director generates v6-quality plans

---

## Director vs v6: Gap Analysis

After director generated the full Act 1 plan, review found 3 gaps:

1. **Tipis headline 4.2s early (critical)**
   - Director: Appears at 82.4s (turn start)
   - Should: Appear at 87.0s (when "tipis" spoken)
   - Root cause: Director fell back to turn-boundary for this scene
   - Fix: Added headline timing rule to prompt; split scene in render

2. **Plains panel timing (judgment call)**
   - Director: 57.2s (Maya asks "the Plains were nomads?")
   - v6: 59.1s (Marcus answers "The Plains, yes")
   - Decision: Keep director's 57.2s (question introduces topic, per alignment rule)

3. **Wilderness panel 0.4s late (minor)**
   - Director: 6.5s ("wilderness")
   - v6: 6.09s ("pristine")
   - Fix: Use first word of phrase ("pristine wilderness" → 6.1s)

---

## Key Lessons

1. **Turn boundaries ≠ topic boundaries.** Scenes must split turns at topic introductions, using word timings.

2. **`at` means "visible by", not "starts at".** Animation timing must account for entrance duration.

3. **Panels must be visible during entrance.** Screen-relative offsets hide panels; use panel-relative offsets.

4. **Headlines need word-timed starts.** A headline appearing at turn start when the phrase is spoken 4s later is the same bug as panels lagging.

5. **The director can do it — with the right prompt.** The gap was prompt engineering (topic alignment rule, v2 schema, explicit topic map), not model capability.

6. **Library fixes > hand fixes.** All timing issues were fixed in `slides.py`, benefiting every future episode. Scene plans come from the director, not hand-authored Python.

---

## Files Changed

**Pushed to `munishbansal2000/apush` main (`d6f84152`):**
- `slideforge/slideforge/slides.py` — StaggerSlide fixes + RevealSlide
- `slideforge/slideforge/backgrounds.py` — parchment background

**Local only (episode work):**
- `~/workspace/episode_u1e1/final/act1/u1e1_act1_final.mp4` — Act 1 final render
- `/tmp/director_prompt_v6.txt` — Updated director prompt
- `/tmp/director_prompt_act1_full.txt` — Full Act 1 prompt

---

## Next: Act 2 (t12-t22)

Act 2 covers trade networks and Cahokia (76.8s, 104.7-181.5s absolute).
The v6 prompt is ready. The headline timing rule is baked in.
