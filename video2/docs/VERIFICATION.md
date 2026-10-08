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

