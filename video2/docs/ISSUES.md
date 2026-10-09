# video2 Pipeline Issue Tracker

Findings from the 2026-10-08 review of the directed pipeline (`tools/video-pipeline.ts`,
`tools/pipeline-core.ts`, `src/directed/DirectedEpisode.tsx`). Check an item off when its
fix lands, and note the commit.

Status: `[ ]` open · `[~]` in progress or superseded · `[x]` fixed

The forward plan lives in `docs/ROADMAP.md`; this file tracks defects.

## High — wrong output or a check that silently passes

- [ ] **P1. Layout guard never runs for DirectedEpisode.** Contact/render parse `[layout-guard]`/`[kit-layout]`
  browser logs, but only `src/kit/guard.tsx` emits them and none of the 11 directed components use it.
  The gate always reports clean. Fix: wrap `SceneFrame` in `LayoutGuard`, or drop the claim from `PIPELINE.md`.
  — `src/directed/DirectedEpisode.tsx`, `tools/video-pipeline.ts:53`
- [x] **P2. Roadmap edits don't invalidate cached stills or segments.** Fingerprints hash `scene` but not
  `plan.roadmap`, so old TimelineRibbon labels are reused. — `tools/video-pipeline.ts:656`, `:722`
- [x] **P3. Stagger panel images missing from the segment fingerprint.** Only `props.image`/`props.clip` are hashed.
  — `tools/video-pipeline.ts:652`
- [x] **P4. Contact stills are saved by position but cached by key.** Adding or removing a scene makes cache
  hits point at another scene's PNG. Fix: store the file path in the cache entry (as the render cache does).
  — `tools/video-pipeline.ts:720-729`
- [x] **P5. Pronunciations are applied one run late, and never in prod.** `PRONUNCIATIONS` loads before the
  `pronounce` stage adds terms; prod Fish texts replace the substituted text. — `tools/video-pipeline.ts:193`, `:235`
- [x] **P6. The pronunciation regex escape is broken.** The character class closes early, so nothing is escaped
  (an unbalanced `(` throws). LLM terms are also auto-approved globally. — `tools/video-pipeline.ts:188`, `:210`

## Medium

- [x] **P7. TTS cache is keyed by position-based turn ID.** Inserting or deleting a line re-renders every later
  turn (costs Fish credits). Fix: cache by text hash. — `tools/video-pipeline.ts:263`, `:277`
- [x] **P8. Per-segment AAC audio joined with `concat -c copy`.** Risk of clicks or gaps at each scene boundary;
  the check only compares total duration. Fix: render silent segments, then mux one audio track.
  — `tools/video-pipeline.ts:691`
- [x] **P9. "Crossfade" is actually a dip to dark.** Scenes don't overlap, and a `cut` after a fade pops in
  from dark. — `src/directed/DirectedEpisode.tsx:61`
- [x] **P10. LLM image paths can escape `public/`.** The `..` check is missing. — `tools/video-pipeline.ts:361`
- [x] **P11. Vosk gate is skipped with `--from direct`.** `direct` never calls `readCheckedWords()`.
  — `tools/video-pipeline.ts:399`

## Low / housekeeping

- [x] **P12.** Windows-only paths and hard-coded `C:\Users\munis\...` (`video-pipeline.ts:77`, `meta-ui-runner.cjs:44-45`, `setup-pipeline.ps1`).
- [x] **P13.** `data/` and `src/data/` hold diverging copies of fact-registry, pronunciations, images, render-config.
- [x] **P14.** `DirectedPlan` lacks `roadmap`/`roadmapIndex`; `pipeline-core.ts` uses `as any`.
- [x] **P15.** `--from render` without `--full` selects no stages and quietly does nothing.
- [x] **P16.** Validation gaps: `syncIssues` skips the first-scene gap; `normalizeTurns` accepts NaN pauses and empty text;
  any `Word: ...` line parses as speech.
- [x] **P17.** No `tsconfig.json` or ESLint config, so `npm run typecheck|lint|check` fail.
  Working versions exist in the older `remotion-src/` copy (`tsconfig.json`, `eslint.config.js`); restore those.
- [x] **P18.** No tests cover cache invalidation (P2–P4, P7).

- [x] **P29. `--only audio`/`--only pronounce` crashed on a fresh episode** (demanded timing_map.json). Found while testing P5.
- [ ] **P30. Prod has no Fish voice for character speakers.** Scripts use `henry`, `editor`, `tomas`, `nullifier`, `brutus`,
  `biddle`, `haswell`, `jefferson`, `rafael`, `loyalist`, `ellis`, `sepúlveda`, and `both`; `data/pipeline.json` only maps maya/marcus/jay,
  so `--mode prod` throws on those episodes. (Dev falls back to the narrator voice.)
  **Decision (2026-10-08): no code workaround and no script edits.** Owner adds Fish voice IDs for these characters to
  `fish.voices` in `data/pipeline.json`. Status: waiting on owner.
- [x] **P31. Spectrum marker labels collide with axis labels** (e.g. "Sons of Liberty" over "Patriot" at at=0.9). Seen in the visual baseline.
- [x] **P32. Causal chain hugs the left frame edge and reveals nodes on a fixed timer** (only 3 of 4 nodes visible at mid-scene), not on narration.
- [ ] **P33. U1E3 on-screen claim violates fact F-U1-EXCHANGE-05:** "NO TOMATOES IN ROME BEFORE 1492" (use "UNTIL AFTER 1492").
  Surfaced by the P13 merge. Owner content fix in `src/episodes/u1e3.ts`.
- [ ] **P34. Stale image registry entry** `historic/u1e2/potatoes.jpg` lists E3:t05/t06 but no beat uses it. Run `npm run sync:manifest`.

## Found by the branch review (2026-10-08)

Fixed in the review commit: director roadmap fields rejected (now accepted and dropped); committed scene plans failing the
first-scene-at-0 rule; render/contact caches ignoring caption words and head levels; "never spoken" in a spoken line
ending the transcript; clips stage bypassing findTool; per-turn tool lookups; doc-render `--seconds` NaN.

- [ ] **P36. The legacy directed path (`video-pipeline.ts` direct stage + DirectedEpisode) never produces Episode Sheet boxes or
  reveal cues**, so those episodes render without the sheet. The documentary path (`doc-direct.ts` → DocEpisode) does produce
  boxes; move the pipeline's direct/contact/render stages onto it (ROADMAP O2) instead of extending the legacy prompt.
- [ ] **P37. Commons `maxlag` errors may arrive as HTTP 200 + JSON error**, which `getWithRetry` doesn't retry; fetch-images
  would treat them as "no image". Unverified (status code not confirmed). Images work paused by owner.
- [ ] **P38. A pre-dialogue header line shaped like `Format: …` (no `#` or `**`) parses as a speaker.** Current scripts are safe
  (headers are `#`-prefixed or bold); tighten if new scripts add plain header lines.

## Found by comparing with `remotion-src/` (older ancestor of video2)

- [x] **P19. Kit episodes U1E3 and U1-PRACTICE can't build in video2.** `src/episodes/u1e3.ts` and `u1-practice.ts`
  point at `script/u1e3.v10.md` and `script/u1-practice.md`, and `U1E3Episode.tsx`/`U1PracticeEpisode.tsx` import
  `data/e3/*.json` and `data/u1-practice/*.json`. None of these exist in video2; they only exist in `remotion-src/`.
  Missing JSON imports can break the whole `src/index.ts` bundle (studio, `tools/render.ts`), not just these episodes.
  The data files match `.gitignore` patterns, so they're regenerated by `npm run setup`, but the `script/` files are source.
- [x] **P20. Stale references to removed plan modules.** `src/plan/sources.ts` comments describe
  `tools/plan-lib.ts` and `src/data/narration/`, which only exist in `remotion-src/` (along with `src/plan/compile.ts`,
  `registry.tsx`, `validate.ts`, `tests/plan.test.ts`, `tools/validate-plan.ts`). Decide whether the plan system is
  retired (delete `sources.ts`/`schema.ts`/`timing.ts` leftovers) or should be restored.

## Roadmap ("box checked") system

**Decision (2026-10-08): restore the kit's `BoxTracker` ("Episode Sheet", `src/kit/components.tsx`, identical to
`remotion-src`) in DirectedEpisode and drop `TimelineRibbon` from the directed path.** Box labels come from the outline
step (checked against the spoken "N boxes on your sheet: …" line); rows appear when each label is spoken; checks land on
the narration's cue word, verified against Vosk timing. Script drift to handle: 0 of 106 scripts have `# @boxes:`, and
cue phrasing varies ("Box one, done.", "Checked.", "Box two, checked").

**Decision (2026-10-08): directed episodes use the kit frame** (`render-config` rects): scene scaled into `stage`, Episode Sheet
in `boxTracker`, host heads in `head`, captions in `captions`, all inside guard tracks. Slide type sizes get raised (P25) because
scenes render at ~64% width.

- [~] **P21. (superseded by the documentary pipeline, docs/ROADMAP.md) The pipeline prompt forbids `roadmapIndex`.** `video-pipeline.ts:498` says "Every scene uses exactly id, component,
  turnRange, props, and transition", which contradicts the rubric's ROADMAP section. The example output has no `roadmap` either.
- [~] **P22. (superseded by the documentary pipeline, docs/ROADMAP.md) Roadmap is optional everywhere.** If the LLM omits it, the ribbon silently never appears. No validation requires it
  or checks that `roadmapIndex` only ever increases.
- [~] **P23. (superseded by the documentary pipeline, docs/ROADMAP.md) The ribbon flickers and the last box can never be checked.** It only renders on scenes that have `roadmapIndex`, and
  `idx >= roadmap.length` is rejected, so there's no "all done" state. The check mark appears with a hard cut instead of animating
  on the spoken "box two, checked" cue. It covers the bottom 9% of the frame, on top of KenBurns and creative_clip captions.
- [~] **P24. (superseded by the documentary pipeline, docs/ROADMAP.md) The current `data/u3e1/scene_plan.json` predates stagger and roadmap.** It has no `roadmap` and no stagger scene, so
  `ensureSync` will reject it and `direct` must be re-run.

## "Glorified slides" — why output isn't video

- [~] **P25. (superseded by the documentary pipeline, docs/ROADMAP.md) One static component per scene, with long holds.** u3e1: 33 scenes, average 26s, longest 50s, despite the 8–15s target.
  Nothing changes inside a scene once its entrance animation finishes.
- [x] **P26. Word timing is measured and then thrown away.** Vosk `word_times.json` never reaches DirectedEpisode. Components accept
  `wordTimings`/`anchor` (TimingProps, StaggerPanel.anchor), but DirectedEpisode passes neither, so builds aren't synced to speech.
- [~] **P27. (superseded by the documentary pipeline, docs/ROADMAP.md) The director sees ~10 slide components out of a large motion library.** Unused: `src/motion/*` (characters, dots, growth,
  territory, military, world, document), maps (Louisiana, Oregon Trail, TerritorialExpansion, Tactical), TalkingHead/CharacterDialogue,
  KineticCaptions, CinematicLowerThird, Ship/Projectile/ParticleSystem, and the storyboard camera system (`SHOT_CAMERAS`).
- [~] **P28. (superseded by the documentary pipeline, docs/ROADMAP.md) No persistent motion layer.** There are no on-screen hosts, captions, or camera moves across cuts. `ken_burns` stops are
  stripped by the prompt ("omit ken_burns stops"), and transitions are fades to dark.
