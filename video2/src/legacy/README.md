# src/legacy

Superseded visual components, moved here (not deleted) during the component-library cleanup.
They still compile because older code imports them: the old episodes
(`src/components/U1E*Episode.tsx`, `U2E*Episode.tsx`, `U2E5Act1.tsx`), `src/Root.tsx`
(the `Demo` and showcase compositions) and the ComponentGallery (`src/gallery/`, where these
slots are tagged `notes: 'legacy'`).

## Rules

- **New lessons must not import from `src/legacy`.** Use the replacement in the table.
  `tests/legacy-imports.test.ts` (`npm test`) fails if any file under `src/` imports `legacy/`,
  except `src/legacy/**`, `src/gallery/**`, `src/Root.tsx` and the old episode files.
- **Once nothing imports a legacy file, delete it.** Remove its gallery slot too.
- Do not fix or extend these files. Fix the replacement instead.

## What is here and what replaces it

| Legacy file | Why it moved | Use instead |
|---|---|---|
| EpisodeMusic | dead; music handled elsewhere | kit `EpisodeShell` (music bed from render config) |
| LtxClip | dead; LTX video assets never shipped (always fell back to Ken Burns) | `KenBurnsSlide` |
| Demo | early demo composition | ComponentGallery (`src/gallery/`) |
| ComponentShowcase | showcase scenes | ComponentGallery (`src/gallery/`) |
| MapArrow | replaced by shared world map | `src/motion` world map |
| TradeRoutes | replaced by shared world map | `src/motion` world map |
| ShipRoute | replaced by shared world map | `src/motion` world map |
| MapJourney | replaced by shared world map | `src/motion` world map |
| RegionMap | replaced by shared world map | `src/motion` world map |
| TerritorySlide | replaced by shared world map | `src/motion` world map (or `TerritorialExpansionMap`) |
| TitleSlide | duplicate | `TitleCard` |
| DisplayHeadline | duplicate | `TitleCard` |
| TextCallout | duplicate | `Callout` |
| SplitSlide | duplicate | `CompareSlide` |
| DuoSlide | duplicate | `CompareSlide` |
| HistoricalTimeline | duplicate | `TimelineRibbon` |
| DocumentReveal | duplicate | `PrimarySourceSpotlight` |
| DocumentOverlay | duplicate | `PrimarySourceSpotlight` |
| TimedText | duplicate | `KineticCaptions` |
| WordPop | duplicate | `KineticCaptions` |
| Duel | duplicate | `CharacterDialogue` |
| Argument | duplicate | `CharacterDialogue` |
| DualTalkingHeads | duplicate | `CharacterDialogue` |
| MapZoomSlide | duplicate | `KenBurnsSlide` |
| SeamlessZoom | duplicate | `KenBurnsSlide` |
| ThreeBoxes | too lesson-specific (hard-coded U1E1 content and images) | `StaggerSlide` / `CompareSlide` |

## Current importers (as of the cleanup)

- U1E1Episode: TextCallout, ThreeBoxes, RegionMap, TradeRoutes
- U1E2/U1E4/U1E5/U2E1/U2E5/U2E7/U2E8/U2E9 episodes: MapJourney
- U2E5Act1: TitleSlide, DisplayHeadline, MapZoomSlide, WordPop
- Root.tsx: Demo, ComponentShowcase
- Inside legacy: Demo and ComponentShowcase import other legacy files
- Nothing imports EpisodeMusic, so it can be deleted now.
