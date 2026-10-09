# Roadmap: a production machine that beats Heimler

Goal: every APUSH lesson rendered as a visuals-first documentary (docs/LOOK.md) from its locked script, with accurate
art and maps, excellent voices, Shorts, and study material, at a pace no hand-made channel can match.
Defects live in `docs/ISSUES.md`; the asset library brief is `docs/ASSET_LIBRARY.md`.

Status: ✅ done · 🔶 in progress · ⬜ not started · Owner: **C** = Claude (code), **U** = you, **A** = research agents

## Milestones

| | Milestone | Definition of done |
|---|---|---|
| M1 | **One great lesson** | u3e1 rendered end-to-end from the automated director, approved by you side-by-side with Heimler |
| M2 | **One great unit** | All Unit 3 lessons + cram + Shorts, from the library, no hand edits |
| M3 | **Channel launch** | Unit 3 published with thumbnails, chapters, captions, descriptions with sources, study sheets |
| M4 | **Full course** | Units 1–9, retention data feeding back into LOOK.md rules |

## 1. Visual engine (renderer)

| ID | Item | Status | Owner |
|---|---|---|---|
| V1 | Documentary renderer: full-bleed shots, crossfades, grain, vignette, year stamps, sound cues | ✅ | C |
| V2 | Shot types: image move, portrait + name tag, map, point card | ✅ | C |
| V3 | Episode Sheet: opens mid-screen, flies to corner, translucent tab, pops on box events | ✅ | C |
| V4 | 2.5D parallax from depth maps (Depth Anything V2 + deterministic CPU warp) | ✅ code; depth maps run on the 5090 | C |
| V5 | Period map engine: terrain relief, rivers, labels, towns/forts, arrows, tilt, library geo ids | ✅ | C |
| V6 | `clip` shot type + `tools/doc-clips.ts`: LTX Desktop by default (`LTX_BACKEND=diffusers` optional), 16:9 crop before sending, painting-safe negative prompt, boomerang loop, content-keyed cache | ✅ code; generation on the 5090 | C |
| V7 | `document` shot: zoom to a transcribed phrase and highlight it as spoken (DocumentLens exists) | ⬜ | C |
| V8 | Atmosphere layers: dust, smoke, embers, fog, candle | ✅ | C |
| V9 | Shorts: vertical 1080×1920 cut per Episode Sheet box, auto-reframed | ⬜ | C |
| V10 | Layout guard reporting in real renders (heartbeat showed 0 measured frames: the guard read its parent ref before React attached it on mount; now falls back to [data-kit-root], unverified until the next real render) | 🔶 | C |

## 2. Asset library (the moat)

| ID | Item | Status | Owner |
|---|---|---|---|
| L1 | Schema, taxonomy, validator, CLI, collection map, seed examples | ✅ | C |
| L2 | Wishlists (briefs) for every lesson, Units 1–9 | 🔶 u3 seed | A |
| L3 | Collect originals for Unit 3 (≥ 2000px, licensed, deduped) | ⬜ | A |
| L4 | Review and approve (accuracy, sensitivity, focus boxes) | ⬜ | U / A |
| L5 | Period geography for Unit 3: 1763 borders, Proclamation line, forts, campaigns, Native homelands (approx./contested) | ⬜ | A |
| L6 | Derivation tools: depth maps, subject masks, LTX clips attached to records | ⬜ | C |
| L7 | Migrate legacy per-lesson images.json into records; replace the images stage with library briefs (ISSUES P35) | ⬜ | C |

## 3. Director (script → shot plan)

| ID | Item | Status | Owner |
|---|---|---|---|
| D1 | Shot-plan format, phrase anchors, resolver enforcing LOOK.md rules | ✅ | C |
| D2 | Hand-directed u3e1 cold open (quality target) | ✅ | C |
| D3 | Outline step: thesis, acts, Episode Sheet boxes + cues | ✅ | C |
| D4 | Per-act shot-plan step from the catalog + library geography, with same-chat review | ✅ | C |
| D5 | Code checks + per-act repair loop; image repetition and clip limits | ✅ | C |
| D6 | Caching per act (Meta prompt cache; agent answers keyed by prompt hash) | ✅ | C |
| D7 | Contact-sheet approval gate before full render | ✅ (pipeline stops at contact) | C |

## 4. Voice and sound

| ID | Item | Status | Owner |
|---|---|---|---|
| S1 | Content-addressed TTS cache, pronunciations, prod Fish direction | ✅ | C |
| S2 | Fish voices for character speakers (ISSUES P30) | ⬜ | U |
| S3 | Vosk word timing on Mac and Windows (`setup:pipeline:unix` / `.ps1`) | 🔶 | U |
| S4 | Voice quality bar: listen test of Fish vs Edge on one lesson; pick per host | ⬜ | U |
| S5 | Music beds by mood/era; ducking tuned; SFX library expanded | ⬜ | C |

## 5. Pipeline and operations

| ID | Item | Status | Owner |
|---|---|---|---|
| O1 | Correctness fixes, caches, parsing (all 55 scripts), cross-platform tools | ✅ | C |
| O2 | Pipeline back half runs the documentary path (director with `--agent`, clips, guarded contact, segmented render + full audio mix); legacy slide director/renderer deleted | ✅ | C |
| O3 | End-to-end run on the Windows 5090 machine (Fish, Vosk, LTX) | ⬜ | U |
| O4 | Render performance: parallel segment renders, GPU encode, timing per lesson | ⬜ | C |
| O5 | Independent review pass of all changes (fresh-context reviewer) | ⬜ | C |

## 6. Accuracy and trust

| ID | Item | Status | Owner |
|---|---|---|---|
| T1 | Fact registry checks on narration | ✅ | C |
| T2 | Fact checks on on-screen text (point cards, name tags, map labels) | ⬜ | C |
| T3 | Retrospective/sensitivity flags respected by the director (no 19th-c. imagining as eyewitness) | ⬜ | C |
| T4 | Known content fixes: ISSUES P33, P34 | ⬜ | U |

## 7. Distribution (where Heimler is actually beaten)

| ID | Item | Status | Owner |
|---|---|---|---|
| G1 | Titles/descriptions by CED topic, sources and credits from the library | ⬜ | C |
| G2 | Chapters and SRT captions (exporters exist: `export-chapters.ts`, `export-captions.ts`) | 🔶 | C |
| G3 | Thumbnails: template + per-lesson portrait/map from the library | ⬜ | C |
| G4 | Study sheet PDF per lesson (boxes, key terms, practice questions; `export-quiz.ts` exists) | ⬜ | C |
| G5 | YouTube policy check: synthetic-media disclosure, mass-produced-content rules | ⬜ | U |
| G6 | Upload automation and analytics loop (retention → LOOK.md rule changes) | ⬜ | C |

## Next three steps

1. **V4 + V5** (parallax + period maps), re-render the u3e1 cold open, and you judge it.
2. **L2–L5 for Unit 3** in parallel by research agents, using `docs/ASSET_LIBRARY.md`.
3. **D3–D6**: the automated director emitting this shot-plan format; M1 when u3e1 renders end-to-end and you approve it.
