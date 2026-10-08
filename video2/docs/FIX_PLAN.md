# video2 Fix Plan

Covers every item in `ISSUES.md` (P1–P28) plus the director split. Work happens on a branch
(`fix/pipeline`), with one commit per issue or tight group. Nothing counts as fixed until its
evidence is recorded in `docs/VERIFICATION.md`.

## Verification rules (anti-hallucination)

1. **Prove the bug before fixing it.** Each code fix starts with a test that fails on the current
   code. The fix is done when that test passes. The test stays in the suite permanently.
2. **Green gate after every commit:** `npm run typecheck && npm run lint && npm test`. No commit
   lands red. The baseline result is recorded first, so pre-existing failures aren't blamed on fixes.
3. **No unchecked API claims.** Before wiring any component, read its source; remove `as any` from
   DirectedEpisode so the type checker rejects wrong props. A test asserts
   `director-components.json` ↔ component prop types ↔ `pipeline-core` validators stay in sync.
4. **Refactors must not change behavior.** Record `--dry-run` output and the generated prompts for
   u3e1 before the refactor; they must be byte-identical afterwards.
5. **Offline LLM tests.** Meta UI responses are recorded as fixtures; director steps are tested
   against them (good, malformed, and adversarial outputs). No live Meta calls in tests.
6. **Visual evidence.** Render stills of a fixture plan on macOS (if Remotion can fetch its
   headless browser here) and attach the contact sheet. The layout guard (P1) must run and report.
7. **Independent review.** After each phase, a fresh reviewer agent checks the diff against the
   issue list and this plan, looking for claims without evidence. Its findings get fixed or answered.
8. **Honest status.** Anything that can't run here (Windows paths, Edge/Fish TTS, Vosk, Meta UI,
   LTX) is marked **UNVERIFIED** with an exact command for you to run, not marked fixed.

## Phase 0: Baseline (no behavior change)

- Create branch; restore `tsconfig.json`, `eslint.config.js` from `remotion-src/` (P17).
- Restore `script/u1e3.v10.md`, `script/u1-practice.md`; regenerate or copy `data/e3`, `data/u1-practice` (P19).
- `npm install`; record baseline typecheck/lint/test output in `VERIFICATION.md`.
- Freeze fixtures: u3e1 `turns.json`, `timing_map.json`, `word_times.json` (if available), a valid
  plan, recorded Meta responses.

## Phase 1: Split `video-pipeline.ts` into modules

- `tools/pipeline/` with one module per stage plus shared context, cache, and hashing helpers.
  `video-pipeline.ts` becomes a thin orchestrator.
- Evidence: rule 4 (byte-identical dry-run and prompts), existing tests pass.

## Phase 2: Cache and correctness bugs

| Issue | Fix | Proving test |
|---|---|---|
| P2, P3 | Segment/still fingerprints include roadmap and all image refs (shared `planImageRefs`) | Change roadmap or panel image → fingerprint changes |
| P4 | Contact cache stores file path; files named by key | Insert scene → no still reused from wrong slot |
| P5, P6 | Load pronunciations after the pronounce stage; correct escaping; apply in prod after Fish direction; auto-approve kept (user decision) | Term with `.`/`(`; first-run audio uses new term; prod text contains substitution |
| P7 | Content-addressed TTS cache (text hash → file), IDs only map to files | Insert a line → only 1 TTS call |
| P8 | Render segments silent; mux one continuous audio track | ffprobe: one audio stream, duration matches timeline |
| P10 | Reject `..`, absolute, backslash paths for LLM image paths | Traversal path rejected |
| P11 | `direct` validates word timings itself | `--from direct` with bad words fails |
| P13 | One source of truth for shared data (decision needed, see below) | Test: no duplicate file read from both dirs |
| P14 | Add `roadmap`/`roadmapIndex` to types; remove `as any` | Typecheck |
| P15 | `--from render` implies render | Unit test on `selectedStages` |
| P16 | First-scene gap check, NaN pause and empty text rejected, stricter speaker parsing | Unit tests per case |
| P20 | Remove or restore dead plan-system references (decision needed) | Typecheck, grep shows no dangling refs |
| P24 | Re-run direct for u3e1 after Phase 4 | Plan passes `ensureSync` |
| P18 | Tests for all of the above | They exist |

## Phase 3: Renderer

- **P1** Wrap directed scenes in `LayoutGuard`; register tracks for text/panels. Test: a deliberately
  overflowing fixture scene produces a blocking issue; a clean one doesn't.
- **P9** Real crossfades: overlap adjacent scenes by the transition length; `dip` stays a dip.
- **P23** Ribbon on every scene once a roadmap exists, "all done" state, animated check on the
  spoken cue word, reserved bottom band so captions move above it (guard verifies no overlap).
- **P26** Pass word timings (frames) to components; beats reveal on anchor words.
- **P28** Persistent layer: kinetic captions + ribbon across cuts; keep `ken_burns` stops.
- Evidence: rendered stills at transition frames and cue words, guard report.

## Phase 4: Director split

Steps, each cached by its own input hash, each followed by code validation:

1. **Outline** → thesis, 2–5 roadmap boxes, box turn ranges (checked against "box N" cues).
2. **Segment** (per act) → scenes of 8–15s on turn boundaries; `roadmapIndex` derived by code.
3. **Visualize** (per act) → component + props from the full palette.
4. **Beats** (per scene) → in-scene moments anchored to spoken words (must exist in Vosk output).
5. **Review** (per act) → skeptical edit, then re-validate.

Fixes P21, P22, P25. Evidence: fixture-driven tests per step, including malformed/adversarial
responses; retry only re-asks the failing act/scene; editing one turn re-runs only its act.

## Phase 5: Motion library for the director (P27)

- Audit `src/motion/*` and map/character/caption components; pick those with JSON-serializable
  props. Each gets a registry entry, validator, and DirectedEpisode case.
- Evidence: registry-sync test (rule 3), gallery render of every exposed component.

## Phase 6: Cross-platform (P12)

- Replace hard-coded `C:\Users\munis\...` with env/config; platform-aware venv paths
  (`Scripts/*.exe` vs `bin/*`); add a bash setup next to the PowerShell one.
- **UNVERIFIED on Windows** until you run the checklist below.

## Phase 7: Your end-to-end run (Windows)

```
npm run setup:pipeline
npm run pipeline:dev -- --episode u3e1 --force
npm run pipeline:dev -- --episode u3e1 --from render --full
```

Check: contact sheet, ribbon progression, captions in sync, crossfades, segment reuse on a second
run, one-line transcript edit → one TTS call.

## Decisions (answered 2026-10-08)

1. Shared data source of truth: **`src/data/`** (P13). `data/` duplicates get merged in, then removed.
2. Plan system leftovers (P20): **delete**.
3. Pronunciations: **keep auto-approve** (escaping and timing bugs still get fixed).
4. Commits: **one commit per issue fix on `fix/pipeline`, keep going** without stopping between fixes.
