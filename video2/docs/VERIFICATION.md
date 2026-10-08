# Verification Log

Evidence for each fix in `ISSUES.md`. Commands run from `video2/` on macOS (darwin, Node 26.5).
Items marked **UNVERIFIED** need a run on the Windows pipeline machine.

## Baseline (branch `fix/pipeline`, before any fix)

Setup: restored `tsconfig.json` + `eslint.config.js` from `remotion-src/`, `npm ci`, copied the gitignored
downloads (`src/data/geo/*`, `data/images.lock.json`) and generated kit data (`data/e3`, `data/u1-practice`)
from `remotion-src/`.

| Gate | Result |
|---|---|
| `npm run typecheck` | **6 errors**, all `tools/pipeline-core.ts`: `roadmap` missing from `DirectedPlan` (P14) |
| `npm run lint` | **20 errors**: `no-explicit-any` (pipeline-core, video-pipeline, contact-sheet-components), `require()` + unused vars in `meta-ui-runner.cjs`, unused vars in `pipeline-smoke.ts` |
| `npm test` | **74/76 pass**. 2 failures in `tests/pipeline.test.ts` ("derives scene boundaries…", "rejects visual drift…"): fixtures lack the stagger scene that commit 2201114 made mandatory |

## Green gate + P14 (roadmap types)

- `DirectedPlan.roadmap?: string[]` and `DirectedScene.roadmapIndex?: number` added; `as any` removed from roadmap validation.
- Lint fixed: typed Remotion dynamic imports and turns in `contact-sheet-components.ts`; typed pronunciation/fact JSON;
  `.cjs` override for `require()`; optional catch bindings; dead vars in `pipeline-smoke.ts`.
- Stale fixtures updated to include the mandatory stagger scene (`tests/pipeline.test.ts`, `tools/pipeline-smoke.ts`);
  smoke script now resolves the current u3e1 script via `resolveAudioScript` (it hard-coded a deleted v2 file).

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors |
| `npm test` | 76/76 pass |
| `npx tsx tools/pipeline-smoke.ts` | All smoke tests passed |

## Phase 1: split `video-pipeline.ts` into modules (no behavior change)

`tools/video-pipeline.ts` (774 lines) → thin orchestrator + `tools/pipeline/{context,speech,plan-refs}.ts` and
`tools/pipeline/stages/{turns,pronounce,audio,timing,words,images,direct,clips,render}.ts`. Stage bodies were
moved programmatically (extracted by marker, re-indented), not retyped.

Parity check: `npx tsx tools/video-pipeline.ts --episode u3e1 --dry-run --force --full` before vs after.

| Artifact | Result |
|---|---|
| stdout | identical (`diff` empty) |
| `director.prompt.md`, `director.review.prompt.md`, `images.prompt.md` | byte-identical (`cmp`) |
| typecheck / lint / tests | 0 / 0 / 76 of 76 pass |

Limitation: dry-run doesn't reach the non-dry branches (TTS, plan validation, sync gate, render). Those get
covered by the fixture harness in Phase 2.

## P5, P6, P7, P29: audio stage

Offline harness: `tests/helpers/fake-pipeline.ts` (temp-dir context, fake TTS writes real tone mp3s via ffmpeg,
canned Meta responses). Orchestration moved to `runPipeline(ctx)` so tests drive the real stage order.

Each test below was run against the unfixed code first and failed for the targeted reason:

| Test (`tests/pipeline-audio.test.ts`) | Before fix | After |
|---|---|---|
| P6 escapes regex metacharacters | `'Stx Croix'` became `'saint croy'` (`.` acted as wildcard) | pass |
| P5 same-run pronunciations | TTS text `'Powhatan led the confederacy.'` (term ignored) | pass |
| P5 prod Fish text | `'[calm] Powhatan led…'` (substitution never applied in prod) | pass |
| P7 insert one line | 3 TTS calls (expected 1) | pass, and shifted turns get byte-identical audio |
| P7 legacy-layout migration | (new behavior) | pass: 0 TTS calls after upgrading an existing episode |

P29 (found while writing these tests): `--only audio`/`--only pronounce` on a fresh episode crashed with
"missing timing_map.json". `runPipeline` now stops after the last selected stage that doesn't need timing.

Fixes: lookaround-bounded, correctly escaped patterns that skip `[tags]`; pronunciations load after the pronounce
stage; prod applies them after Fish direction; TTS output cached by artifact hash in `tts/<ep>/cache/`, copied to
`public/audio/<ep>/<id>.mp3`; prod reuses directed text by speaker+wording instead of turn id; stale mp3s removed.
Note: in prod, inserting a line still re-sends the Fish-direction prompt (one Meta call); unchanged lines keep their
earlier tags and audio.

Gate: typecheck 0, lint 0, tests 81/81, u3e1 dry-run stdout unchanged.

## P10, P11, P15, P16 (+ P29 widened): validation

`tests/pipeline-validation.test.ts`: 8 of 9 tests failed on the unfixed code, each for its targeted reason
(e.g. P10: `historic/u9e9/../../../evil.jpg` was accepted and handed to the downloader; P11: the director ran
3 Meta calls with no word timing; P15: `--from render` selected nothing).

**Real-corpus check** (`/tmp/v2dry/parse-all.ts`, every canonical script in `../audio_scripts`):

| | Before | After |
|---|---|---|
| Scripts that parse | 32 of 55 (23 crashed on `## Sources` footers) | **55 of 55** |
| Junk "speakers" read aloud | `**format`, `- tier 1`, `- potosí`, `**pronunciation`, … | none; only real speakers |

Old vs new parser on the 32 scripts the old one could parse: **28 byte-identical**; 4 differ only by dropping junk
(u1e5, u3e4 source notes; u5e1 header). **u9cram: the old parser kept 4 of 89 turns** (header junk counted as
speech, then the first `---` ended the transcript).

Fixes: `## Sources`/"never spoken" headings end the transcript; pre-dialogue metadata skipped; speaker labels must be
names (Unicode letters, e.g. `Sepúlveda`); malformed pause numbers rejected; `normalizeTurns` rejects NaN/≤0 pauses,
empty text, bad `holdAfterSec`; shared `isSafePublicPath` (no scheme, leading slash, backslash, empty/dot segments)
for planned and plan image paths; `direct` validates word timing itself; `--from render` implies render; first scene
starts at 0 (covers the lead-in) and `syncIssues` now checks the first scene too; `--only images` no longer needs timing.

Gate: typecheck 0, lint 0, tests 90/90, smoke pass, u3e1 dry-run stdout and prompts unchanged.

## Visual baseline (before renderer fixes), 2026-10-08

Owner ran `npm run verify:render` on their Mac (Playwright headless shell via `REMOTION_BROWSER`; fonts from
`setup:downloads --only fonts`). Fixture: 10 scenes, one per directed component, roadmap of 3 boxes. Saved to
`out/verify-before/` (gitignored). Observed in `contact.png`:

| Finding | Evidence | Issue |
|---|---|---|
| Layout guard reported **0** findings despite visible collisions | `layout.json` empty | P1 confirmed |
| Ken Burns caption "Ships carried the empire." is drawn under/through the ribbon labels | still 0002 | P23 confirmed |
| Spectrum marker "Sons of Liberty" collides with axis label "Patriot" | still 0016 | P31 (new) |
| Causal chain: first node touches the left frame edge; at mid-scene only 3 of 4 nodes are visible | still 0008 | P32 (new) |
| Crossfade scenes at +6 frames show a dimmed scene over dark, not the previous scene | stills 0003, 0007, 0011, 0015, 0019 | P9 confirmed |
| Compare: small text in the top third, large empty area below; Highlight: light card off the dark theme, note label crowds the text | stills 0006, 0010 | P25 (static slide layouts) |
| Ribbon checks advance correctly (0 → 1 → 2 checked); the third box can never be checked | ribbon in all stills | P23 confirmed |

Not a bug: the yellow/black stagger panel is `public/maya-real.webp`, a dev placeholder (`public/PLACEHOLDERS.md`).

