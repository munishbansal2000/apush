# Kit API reference

The kit turns a script + an episode spec into a rendered, validated episode. Everything an
episode file may use is listed here; everything else is the shell's job.

```
src/kit/
  types.ts          all types below
  script.ts         parseScript()
  anchors.ts        resolveAnchor(), alignTokens(), wordOffset()
  episode.ts        defineEpisode(), until, compileEpisode(), assertRenderable()
  derive.ts         derived overlays (traps, years, terms, chapters, ranges, stacks, sfx, transitions)
  layout.ts         RenderConfig, measurement, imageToCoverBox()
  layout-engine.ts  resolveLayout(): self-correcting placement over timed boxes
  validate.ts       validateEpisode()
  lint-script.ts    lintScript()
  tts.ts            toTtsText()
  captions.ts       captionChunks(), toSrt()
  timeline.ts       pure per-frame functions (activeTurnAt, duckAt, …)
  EpisodeShell.tsx  the renderer
  guard.tsx         <Track>, <LayoutGuard>, measureTracks()
  components.tsx    background, pause/reveal cards, box tracker, captions, credit, pictogram, ledger
  overlays.tsx      trap card, ribbon, term chip, chapter banner, chains, route map, range bar, stack card, recap board, question card, head pair, sound
  media.tsx         kinetic text, tour, document, figure, transitions, grain, pop
  library.ts        the ONLY import seam to the production component library
```

---

## 1. Script grammar (`script.ts`)

```
# comment / production note       # @episode: u1e3   # @kind: episode|practice
                                   # @boxes: a | b | c   # @midcheck: 1   (episodes)
Maya: text {trap}                  speech; {tags} are production-only
Marcus: {soft tone} text           leading {tag} = emotion marker (allowed list in style-rules)
[10-second pause]                  pause turn (silence + prompt card)
[hold 1.0s]                        silence after the previous turn
## Sources                         parsing stops here
```

`parseScript(src, speakers) → { meta, turns, issues }`. Turn ids are `tNN` in order, pauses
included.

---

## 2. Anchors

```ts
interface Anchor { turn: string; word?: string; nth?: number; delay?: number }
```

- `turn` — snippet matching **exactly one** speech turn (case/punctuation-insensitive).
- `word` — word/phrase in that turn; the beat starts when it is spoken. `nth` for repeats.
- `delay` — seconds added (may be negative).

Resolution: measured (Vosk word times) → interpolated (word misheard, between aligned
neighbours) → estimated (no word times; character position). `validate:prod` rejects estimated.

Ends — `until`:

```ts
until.turnEnd()            // default: end of the turn (held through the gap)
until.turns(2)             // through the next turn
until.at('snippet', 'word')
```

---

## 3. Episode spec (`defineEpisode`)

```ts
defineEpisode({
  id: 'u1e3',
  manifestKey: 'E3',                       // prefix for images.json used_in
  script: 'script/u1e3.v10.md',
  title: { kicker, title, subline, at: Anchor },
  sections: [{ from: Anchor, tone: 'playful' | 'serious' | 'sobering' | 'recap', bg: string }],
  beats: Beat[],
  pauseCards: [{ after: Anchor, kind: 'predict' | 'selftest', prompt: string, reveal: string }],
  traps: [{ at: Anchor, myth: string /* ≤40 */, fact: string /* ≤48 */ }],
  chapters: [{ label: string, at: Anchor, box?: number, short?: boolean }],
});
```

`box` chapters get banners, the NOW marker on the episode sheet, and a Short; `short: true`
chapters (e.g. each practice question) get a Short only.

Episode modules are wired with `buildEpisode(spec, { turns, timing, wordTimes, levels }, seriesLabel)`
from `src/episodes/make.tsx`, which returns `{ compiled, Full, Short, shorts }`. `src/Root.tsx`
registers `Full` as `<ID>` and each Short as `<ID>-BOXn` or `<ID>-Qn`.

### Practice videos

`data/practice/<unit>.json` (`{ unit, title, intro, outro, questions[] }`, each question
`{ id, topic, episode, format, ask, card: { stem, source? }, prompt, pauseSec, answer, reveal, why?, facts[] }`)
is the only source. `tools/build-practice-script.ts` generates the script (`@kind: practice`);
`src/episodes/<unit>-practice.ts` builds the spec (question cards, pause cards, reveals, why
captions, a `short` chapter per question); `tools/export-quiz.ts` writes the quiz CSV and key.

Rules enforced at compile/validate time: first section at the first turn; exactly one pause card
per pause turn; one trap card per `{trap}` line; chapters for every box (warn).

---

## 4. Beat kinds

Every beat: `{ id: string; at: Anchor; until?: Until; kind: … }`.

| kind | Fields | Renders as |
|---|---|---|
| `text` | `text, level ('hero'\|'title'\|'subtitle'\|'body'), position [x,y], color?, entrance? ('stamp'\|'fade'\|'typewriter'), allowWrap?` | grouped into a **stack card**; kinetic words; `→` makes an **arrow chain** |
| `bubble` | `text, position, width?` | library SpeechBubble with a spring pop |
| `bg` | `image, focus?` (region id) | background segment; focus = push-in + credit label |
| `route` | `routes: {from, to, label?}[]` (place names), `caption, variant ('overview'\|'dark')` | Natural Earth map, great-circle arcs, ripples, self-placing labels |
| `range` | `low, high, unit, label, caption` | uncertainty bar (usually auto from the fact registry) |
| `tour` | `image, caption?, stops: {at, region? \| rect?, callouts?: {point, label}[]}[]` | camera zoom/pan between stops; pulsing callouts with leader lines |
| `document` | `image?, title, attribution, excerpt, quoteStatus ('quote'\|'paraphrase'), highlight?, marks?: {word, point, label?}[], marksVerified?, hipp?: {type, text}` | archival reveal: aspect-true scan, magnifier glides to marks as words type, PARAPHRASED stamp |
| `figure` | `name, dates, role, note?, image?, likeness ('from life'\|'later likeness'\|'none')` | card flips in, portrait develops from sepia (or silhouette) |
| `source` | `documentTitle, attribution, excerpt, quoteStatus, highlightedPhrase, hippType, hippExplanation` | library PrimarySourceSpotlight (prefer `document`) |
| `versus` | `clashTitle, periodLabel, entityA, entityB, verdictSummary` | library VersusPolarization |
| `map` | `mapImage, items, caption, variant` | library MapJourney (prefer `route`) |
| `pictogram` | `total, lost [n, m], label, caption` | figures empty out to outlines |
| `ledger` | `west[], east[], exception?` | two-column inventory, items fly in |
| `board` | `items: {box, at, text}[], footer?: {at, text}` | recap board, cards fill and check off |
| `question` | `number, format, stem, source?: {title, text}` | exam-paper question card |

Coordinates: `position` is frame fractions; `point`/`rect`/focus regions are **full-image
fractions** (mapped through the real aspect via `imageToCoverBox`).

Adding a kind: extend the `Beat` union; TypeScript then fails in every exhaustive switch
(`BeatView`, `beatRect`, `onscreenText`) until it is handled.

---

## 5. Derived overlays (no authoring)

| Overlay | Derived from | In `CompiledEpisode` |
|---|---|---|
| Trap cards | `{trap}` lines + `spec.traps` | `traps` |
| Timeline ribbon | years spoken in the script | `years` |
| Key-term chips | first spoken use of `data/terms.json` terms (delayed if the band is busy) | `terms` |
| Range bars | fact-registry `visual` entries | auto `range` beats |
| Chapter banners, Shorts, YouTube chapters | `spec.chapters` | `chapters` |
| Box tracker | `# @boxes`, "Checking that one.", "Box N, checked." | `boxEvents` |
| Stack cards + word timing | text beats sharing a turn and time | `stack` beats (`items[].wordOffsets`) |
| Sound cues | stamps (playful/recap), checks, trap reveals, banners, tone changes, countdowns | `sfx` |
| Transitions | tone changes + box chapters | `transitions` |

---

## 6. Compile

```ts
compileEpisode(spec, {
  turns: TurnsFile, timing: TimingFile, wordTimes: WordTimesFile,
  config: RenderConfig, terms?: TermsFile, facts?: FactRegistry,
}): CompiledEpisode

assertRenderable(ep)   // throws if ep.issues has errors (used by the composition)
```

`CompiledEpisode` contains the timeline, resolved beats (with `start`, `end`, `turnIdx`,
`method`), sections, pause cards, backgrounds, box events, derived overlays, `boxes`
(every element as a timed box after self-correction), `titleStart`, `totalSec`, `issues`.

### Layout engine (`resolveLayout(beats, overlays, cfg, totalSec)`)

- Fixed chrome: head, box tracker, ribbon, captions, credit.
- Timed overlays: pause cards (exclusive), reveals, trap cards, term chips, chapter banners.
- Stage components never move (conflicts → B003).
- Text/bubbles: tried at the authored spot, then other `textSlotsY` (never above a line authored
  above them in the same turn), then smaller levels, then clamped / shifted to the stage's right
  half. Stamp entrances reserve `stampOvershoot`. Every fix → info `L001` moved, `L002` shrunk,
  `L003` clamped. Unfixable → error.

---

## 7. Validate

```ts
validateEpisode({
  spec, scriptSrc, turns, timing, wordTimes, manifest, config, style, facts, pron, strict,
  audioDurations?, publicFileExists?, publicImages?, terms?, places?, imageLock?, publicFileSha?,
}): { issues: Issue[]; compiled: CompiledEpisode | null; stats }
```

Pure — all IO is injected (the CLI supplies ffprobe, fs, hashes). Families: S script, T timing/
audio, A anchors, B beats/on-screen, L auto-fixes, C coverage, V variety, P pause cards,
I images, G geography, X sound, H heads, E spec, CFG render config.

---

## 8. Shell (`<EpisodeShell>`)

```ts
interface EpisodeShellProps {
  episode: CompiledEpisode;
  config: RenderConfig;
  manifest: Manifest;
  wordTimes: WordTimesFile;
  places: Record<string, [lon, lat]>;
  levels: Record<turnId, number[]>;        // per-frame loudness (build:timing)
  imageSizes?: Record<path, { width, height }>;  // data/images.lock.json
  captions?: boolean;                      // default true (karaoke)
  embedded?: boolean;                      // Shorts: no head/tracker/guard of its own
}
```

Owns: active turn (held through gaps), audio (ceil), sfx, music ducking, backgrounds (texture,
focus, kick), every element in `<Sequence>` + `<Track>` + exit, derived overlays, chrome,
transitions, guard, Studio-only debug.

`<ShortFrame chapter seriesLabel {...shellProps}>` — 9:16 Short for one chapter.

---

## 9. Runtime guard (`guard.tsx`)

```tsx
<Track id="beat:x" role="text|stage|overlay|chrome|cover|bg" allowOverlap? allowUnsafe?>…</Track>
<LayoutGuard cfg rootRef />            // inside the root; logs `[kit-layout] {json}` per frame
GUARD_WRAPPER                          // spread on structural wrapper divs (measured through children)
data-guard-item="name"                 // on component parts that must not overlap each other
measureTracks(root, cfg)               // pure DOM measurement (exported for tools/tests)
```

Measurement is clip-aware (intersects each element with its overflow-clipping ancestors) and
opacity-aware. Thresholds in `render-config.json guard` (`epsilon`, `overlapMinArea`,
`clipTolerancePx`).

---

## 10. Library seam (`library.ts`)

Exports `TalkingHead, TitleCard, SpeechBubble, SmartText, MapJourney (+JourneyItem),
PrimarySourceSpotlight, VersusPolarization, ToneProvider, AutoLayoutProvider`. Point these at
the production components. Contract (see `src/stubs/README.md`): animate from `at` (the shell
passes `at={0}` inside a Sequence), stage components fill their parent, and `TalkingHead`
is keyed by speaker.

---

## 11. Data files

| File | Owner | Shape |
|---|---|---|
| `data/render-config.json` | human | geometry (rects as `[x0,y0,x1,y1]` fractions), timing rules, speakers, tones, sfx/music, guard thresholds — self-checked (CFG001–4) |
| `data/style-rules.json` | human | speakers, banned phrases, terminology, limits, trap markers, emotion markers, on-screen limits |
| `data/fact-registry.json` | human | facts with status, sources, `forbid`, `hedge`, `require`, `visual` |
| `data/pronunciations.json` | human | terms (`guide`, `tts`, `approved`), number rules, watch patterns |
| `data/terms.json` | human | glossary terms, spoken `match` forms, definitions |
| `data/places.json` | human | place → `[lon, lat]` |
| `data/images.json` | human + `sync:manifest` | per image: description, license, source_url, credit, `focus[]`, `used_in[]` (generated) |
| `data/images.lock.json` | `fetch:images` | per image: source_url, sha256, width, height, license, fetchedAt |
| `data/<ep>/turns.json` | `build:turns` | generated |
| `data/<ep>/timing_map.json`, `levels.json` | `build:timing` | generated |
| `data/<ep>/word_times.json` | `import:vosk` | generated |
