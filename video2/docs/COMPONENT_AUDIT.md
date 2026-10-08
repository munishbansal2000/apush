# Component audit (src/components)

## Status after cleanup

The library was cut down to a small kept set. 26 superseded files moved to `src/legacy/`
(see `src/legacy/README.md` for what replaces each). New lessons must not import from
`src/legacy`; `tests/legacy-imports.test.ts` enforces this.

**Kept (src/components)**
- Titles and text: TitleCard, Callout, KineticCaptions, SmartText, QuoteSlide, CinematicLowerThird, SpeechBubble
- Layout slides: CompareSlide, StaggerSlide, SpectrumSlide, CausalChainSlide, HighlightSlide, CollageSlide, VersusPolarization, TacticalSlide
- Timelines and sources: TimelineRibbon, PrimarySourceSpotlight
- Images and camera: KenBurnsSlide, PhotoPin, CutoutFigure, IrisTransition
- Characters: CharacterDialogue, CharacterFace, TalkingHead
- Maps: OregonTrailCinematicMap, LouisianaPurchaseMap, JumonvilleGlenTacticalMap, TerritorialExpansionMap (all on `src/components/geo`); new map work goes in the `src/motion` world map
- Effects: AnimatedChart, ParticleSystem, GravityDrop, Projectile, Ship
- Plumbing: EpisodeShell, KitComponents, KitLayer, KitMedia, KitOverlays, motionStudioPresets, motionStudioTypes

**Legacy (src/legacy)**: EpisodeMusic, LtxClip, Demo, ComponentShowcase, MapArrow, TradeRoutes,
ShipRoute, MapJourney, RegionMap, TerritorySlide, TitleSlide, DisplayHeadline, TextCallout,
SplitSlide, DuoSlide, HistoricalTimeline, DocumentReveal, DocumentOverlay, TimedText, WordPop,
Duel, Argument, DualTalkingHeads, MapZoomSlide, SeamlessZoom, ThreeBoxes.

**Already fixed in earlier passes** (most findings below): Remotion `<Img>` everywhere instead
of plain `<img>`; animation driven by the frame, not wall-clock/CSS; SVG ids from `useId`
(no clashes); AutoLayout rewritten to be deterministic; sizes scale by `width/1280`;
`box-sizing: border-box` (no wider-than-frame roots); maps rebuilt on shared geography in
`src/components/geo`. The findings below are the original audit, kept for history; entries for
legacy components will not be fixed.

---

## Original audit

Source: code review of all 56 visual components while building `ComponentGallery`
(`src/gallery/`). Not yet confirmed by rendering — run `npm run gallery-sheet` to see each one
and get runtime guard findings per component (`out/logs/gallery-layout.json`).

### Will break a render (missing or empty assets)

| Component | Problem |
|---|---|
| ShipRoute (`:223`), Ship (`:88`) | hard-coded `tallship-real.webp`, no prop to override |
| SpeechBubble (`:14-25`) | every style points at `bubbles/*.webp` |
| ThreeBoxes (`:18-20`) | three hard-coded images; content fixed to U1E1 |
| RegionMap (`:20-22,44`) | four hard-coded images, no prop override |
| motionStudioPresets.ts (`:7,11,12`), KineticCaptions (`:4`), PrimarySourceSpotlight (`:4`), CinematicLowerThird (`:4`) | background image constants are `''` → `url()` → blank layer (Jumonville, Louisiana, Territorial Expansion maps) |

(The images may exist in your real `public/`; they're not in the synced copy.)

### Wrong output

- **Wider than the frame** (padding without `box-sizing: border-box`, no global reset): CompareSlide `:197-205` (1408×848), DisplayHeadline `:24-35` (~1485×925, off-centre), DocumentReveal `:63-69`.
- **IrisTransition** `:42-47,70-76`: first half runs backwards (iris opens instead of closing).
- **DocumentReveal** `:114`: source line's fade window moves with the frame → never appears; enter/exit props ignored.
- **KineticCaptions** `:155`: renders optional `token.word` instead of required `token.text` → blank words.
- **MapJourney** `:122,131`: scale around (0,0) → items slide in from the top-left corner.
- **MapArrow** `:49`, **TradeRoutes** `:100`: fixed dash length (600 / 300) → long paths never finish drawing.
- **CharacterFace** `:65-72`: `<ellipse>` nested in `<ellipse>` (invalid SVG) → tongue never drawn; scale applied twice.
- **CharacterDialogue** `:150`: bubbles reuse y-slots `i % 3` and columns overlap 45–55% → line 4 covers line 1; tracker y `:58` ≠ rendered y.
- **HistoricalTimeline** `:324,333`: footer text hard-coded ("each internal tax… THEME: POL-1.0"); gauge `:27` tied to frames 10–150.
- **SmartText** `:135-136`: early return before `useAutoLayout` `:145` → Rules of Hooks violation.
- **TalkingHead** `:185`: fullscreen height = width; `:197` plain `<video autoPlay>` (not frame-synced).
- **DualTalkingHeads** `:6-10,89-113`: can't pass art → both hosts identical; flex wrapper ineffective.
- **PrimarySourceSpotlight** `:253`, **HighlightSlide** `:41`: only the first occurrence of a phrase handled; repeats drop text.
- **TitleCard** `:64`: subline fixed 250 px below the card → collides with a 3-line title.
- **SpectrumSlide** `:186`: marker labels collide with axis end labels near 0/1.
- **TextCallout** `:28`: default ink `#1a1512` invisible on dark scenes.
- **AnimatedChart** `:192`: divide by `bars.length - 1` (NaN for one point); `:199` dash length guessed.
- **CutoutFigure** `:93`: `rotate(-1.5 100 50%)` — percent not valid in an SVG transform.
- **validation/timing.ts** `:74-84`: `getWordIndex` ignores `startFrame`.

### Render reliability

- **Plain `<img>`** (no delayRender → blank/flicker): KenBurnsSlide `:53`, MapZoomSlide `:134`, SeamlessZoom `:99,107`, PhotoPin `:84`, CutoutFigure `:104`, DocumentOverlay `:97`, StaggerSlide `:147`, TerritorySlide `:86`. KenBurns/MapZoom/Seamless real usages pass external Wikimedia URLs → renders depend on the network.
- **CSS `background-image` without delayRender**: OregonTrailCinematicMap `:197`, JumonvilleGlenTacticalMap `:42`, LouisianaPurchaseMap `:48`, KineticCaptions `:36`.
- **CSS animations/transitions** (don't run in renders): MapZoomSlide `:158,166-175`, MapJourney `:151`, KineticCaptions `:149`, Argument `:143`, CharacterDialogue `:87`, DualTalkingHeads `:87,102`, TimedText `:81`, the three cinematic maps.
- **LtxClip** `:93` `process.env` in the browser bundle; `:46-60` state from `window.__LTX_MANIFEST__` without delayRender.
- **useAutoLayout** (`validation/AutoLayout.tsx:126`): setState in an effect every frame for moving elements → re-render loops, positions lag a frame, can differ between parallel render workers. Used by TitleCard, SpeechBubble, SmartText, Duel, GravityDrop, TalkingHead…
- **Components defined inside render** (remount every frame): CharacterDialogue `Avatar` `:78`, DuoSlide `Panel` `:31`.

### Hard-coded size / fps

1280×720 pixel math: SmartText `:142-143`, ThreeBoxes `:52,74-75`, TradeRoutes `:58,65,76-79`, RegionMap `:32,57-60`, Callout `:60-79,134`, Duel `:125-130`, Argument `:111,215,246`, DuoSlide `:62`; fixed px fonts in CinematicLowerThird, HistoricalTimeline, CollageSlide, HighlightSlide. 30 fps assumed: MapJourney `:5`, LtxClip `:63`. ~180-frame timelines hard-coded: Jumonville, Louisiana, Oregon maps, PrimarySourceSpotlight.

### Ignored props

StaggerSlide (anchor + timing), SpectrumSlide / TacticalSlide / TerritorySlide (timing), WordPop (no `at`, never fades), Ship (`bg`, `debug`, timing), CinematicLowerThird (`name`, `title`, `duration`), DocumentReveal (enter/exit).

### ID collisions

Fixed SVG ids: DocumentOverlay `torn-paper`/`doc-clip` `:60,64`, PhotoPin `vig` `:95`, CausalChainSlide `arrowhead` `:105`. Length-derived ids: CutoutFigure `:57`, PhotoPin `:49`, MapArrow `:52,60`; Projectile `:81` and GravityDrop `:123` keyed on `at` only.

### Minor

ParticleSystem `:61` memo deps are fresh arrays every render (never caches). No `Math.random()` found (ParticleSystem/TacticalSlide use seeded RNGs).
