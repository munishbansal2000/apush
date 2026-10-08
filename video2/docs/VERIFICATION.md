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

