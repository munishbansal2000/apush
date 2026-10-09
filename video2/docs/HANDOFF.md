# Handoff — state of the project (2026-10-07)

Everything below is in `remotion-src/`. Chrome can't run in the assistant's sandbox, so **you**
run renders; the assistant reads `out/` and `out/logs/`.

## 1. What's done

| Area | Where | Status |
|---|---|---|
| Motion core: world map + camera, routes, ships, flows, spread, Slide (directional in/out) | `src/motion/world.tsx`, `primitives.tsx`, `MotionScene.tsx` | Done; Great Lakes added (`src/data/geo/lakes-50m.json`) |
| Building blocks | `src/motion/territory.tsx` (territory over time, year counter, legend, map numbers, before/after split), `military.tsx` (army arrows, front lines, battle markers), `growth.tsx` (railroads/canals, city growth), `dots.tsx` (people/vote dots), `causechain.tsx` (cause→effect dominoes), `document.tsx` (document lens + HIPP pull quote), `characters.tsx` (cut-out puppets, crowds), `sound.tsx` (sfx cues, music ducking) | Done; server-rendered every frame; **not all rendered in Chrome yet** |
| Scenes | `src/scenes/ExchangeCrossing.tsx` (prototype) + 7 demos in `src/scenes/demos/` | Registered in `src/Root.tsx` |
| One layout checker | `src/kit/guard.tsx` (`src/lib/guard.tsx` re-exports it) | Reports cut / overlap / overflow / clipped / empty / unsafe, tracks map items, skips elements in transit. First real catch fixed (year counter spill). |
| One visual system | `src/theme/tokens.ts`, `src/theme/fonts.ts`, fonts in `public/fonts` (OFL) | 33 kept components migrated; tests enforce no literal fonts/colors, color-blind-safe pairs, contrast |
| Cleanup | `src/legacy/` (26 components), `tests/legacy-imports.test.ts` | Old episodes still build |
| Tools | `tools/check-storyboard.ts`, `tools/motion-check.ts`, `tools/make-motion-sfx.ts`, `tools/build-prototype.ts --word-times`, render summary with item names + times | Done |
| Maps on real geography | Oregon, Louisiana, Jumonville, Territorial Expansion | Done |
| Asset catalog schema + styles | `src/assets/schema.ts`, `data/assets/styles.json` | Done (catalog content: see §3) |

Checks at last run: typecheck clean, 66/66 tests pass, bundle OK.

## 2. Commands you run

```
npm run render:prototype        # ExchangeCrossing → out/exchangecrossing.mp4
npm run render:demos            # all 7 demos
npm run motion-check            # still-screen check on the prototype render
npm run gallery-sheet           # one still per component + guard findings
npm run check:storyboard
npm test
```
Paste any `[kit-layout]` lines or the render summary back to the assistant.

## 3. In progress when we stopped (background agents)

These may have finished or left partial files — check before continuing:

1. **Generic plan system: retired (2026-10-08).** The JSON plan system (`src/plan/`, `tools/validate-plan.ts`,
   `tools/build-narration.ts`) was superseded by the documentary pipeline (`tools/video-pipeline.ts` +
   `src/documentary/DocEpisode.tsx`, docs/LOOK.md) and its leftovers were deleted. The last full copy is in `remotion-src/`.
   Shared overlays `src/motion/overlays.tsx`, `src/motion/measure.ts`, and `src/motion/layout.ts` remain in use.
2. **Fact check — finished partially** (network lookups were denied midway). Details in
   `docs/FACT_CHECK_MOTION.md`.
   - Verified: admission/secession dates, 1860 slave populations, 1790 census (697,681),
     city populations 1820–1880 (Census WP 27), Kansas–Nebraska House 113–100 (free 44–91,
     slave 69–9, Voteview roll 309), Senate 37–14 (S. 22, Mar 4) and 35–13 (May 25).
   - Corrected: St. Louis 1830 = 4,977; Proclamation of 1763 card text; removed an unconfirmed 1790 figure.
   - **Unverified:** all of `civil-war.json` (Antietam 22,717 per ABT vs ≈23,000; Gettysburg
     Confederate losses ≈23k vs ≈28k changes the 52,000 retreat figure; Sherman "≈2,100 losses"
     doubtful), all transportation dates, territorial dates, Road to Revolution card dates.
   - **Caption fixes needed (scene files, not yet edited):**
     - VotesDemo: Senate vote on the final bill was **35–13 (May 25)**, not 37–14.
     - VotesDemo: say "each enslaved person counted as three-fifths of a person".
     - ExchangeCrossing narration: potatoes/tomatoes reached Europe decades after the 1490s — reword ("over the next century…").
     - CivilWarDemo: "bloodiest single day in American **military** history"; strengths depend on the unverified figures.
3. **Generated-asset prompt catalog** → `data/assets/catalog/{characters,props,vehicles,flags,textures,backdrops,icons}.json`
   (text only, no downloads).

Not started (you declined): **portraits.json / documents.json catalog** and the
**orchestrator + consumer** (spec below).

## 4. Asset pipeline spec (to build next)

- **Rule:** never AI-generate real people. Real people and real documents = public-domain
  images (`fetch-pd`, optionally `fetch-pd+stylize` into the house engraving style). AI
  (`generate`) only for generic people/costumes, props, vehicles, textures, backdrops, icons.
- **Catalog** `data/assets/catalog/<category>.json` (schema `src/assets/schema.ts`): id, kind,
  units, strategy, style, subject (prompt body), details (accuracy checklist), avoid, size,
  background, variants (poses), pd source, sensitivity, priority.
- **Orchestrator** `tools/assets.ts`: `status`, `prompts` (JSONL export), `generate`
  (providers: openai gpt-image-1, gemini imagen, replicate, `cmd` template for internal tools,
  `mock`; cost cap, resumable, logs), `fetch` (Wikimedia, PD/CC0 only, credits into
  `data/images.json`), `review` (HTML contact sheet), `approve`/`reject`/`reset`, `post`
  (size/transparency checks), `index` (→ `src/data/assets-index.json`), `validate`.
  Tracker: `data/assets/status.json` (status, prompt hash → stale detection, candidates, credit).
- **Consumer:** `src/assets/catalog.ts` (`asset`, `assetSrc`, `requireAsset`),
  `src/assets/AssetImg.tsx` (`<AssetImg>` with theme placeholder + `asset-missing` guard item),
  `<AssetCatalog>` review composition.
- **You** run: set API key → `assets status` → `assets generate --priority 1 --n 2 --max-cost 5`
  → `assets review` → `assets approve <id> --pick n` → `assets index`; `assets fetch` for portraits/documents.

## 5. Coverage plan for all 9 units

Libraries needed: ~150 leader portraits (PD), ~25 costume packs, ~60 props (books, parchment,
quills, muskets, flags, ballot box, newspapers…), ships/vehicles by era, ~60 primary-source
scans, ~30 map presets (world countries, historical boundaries, war theaters), ~15 datasets
(elections by state, census, immigration, economy, court cases, legislation), era music.
Missing blocks: leader card, Supreme Court case / legislation cards, data chart, election map,
world country choropleth, archival photo montage, era band. Tools: course-coverage tracker
(AP topics → plans), shared fact registry.

## 6. Other suggestions (not done)

Audio loudness normalization (−16 LUFS); before/after image comparison of stills; faster
renders (rasterize coastline once); script → storyboard → plan with an LLM; vertical Shorts
from plans; thumbnail generator; practice questions linked to scene timestamps; on-screen
source lines + teacher worksheet; retention analytics; Spanish dubs.

## 7. Known issues

- 8 lint errors in `src/legacy/` (pre-existing).
- `src/kit/ui` + `data/render-config.json` still use Georgia and their own colors; mapping in
  the theme-migration notes; re-measure `text.glyphW` / `bubble.charW` when switching fonts.
- Sound effects and narration voices are placeholders (macOS `say`, synthesized sfx).
- Word timing is estimated from `say`; use Vosk/Whisper for real voices.
- Unit positions in the Jumonville close-up and front lines are labelled approximations.
- The original kit in `apush/src/kit` didn't get the guard upgrade (only `remotion-src`).

## 8. Permission prompts you may see from agents

| Request | From | Meaning |
|---|---|---|
| `curl` to wikipedia / nps / census / archives / loc / senate / house | fact check | read-only source lookups |
| web-search tool | fact check, prompt catalog | read-only |
| `say`, `ffmpeg`, `ffprobe`, writes to `public/audio/` | plan system | local narration audio |

Deny anything that uploads (`curl -X POST`, `-d`, `-F`) or goes to paste/upload sites — nothing here needs that.
