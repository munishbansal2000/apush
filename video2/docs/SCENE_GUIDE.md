# Scene Guide: authoring an episode's visuals

> Practice videos don't need a hand-written scene: `src/episodes/<unit>-practice.ts` builds
> question cards, countdown cards, reveals, "why it works" captions and per-question Shorts from
> `data/practice/<unit>.json`. This guide is for episodes.

An episode file (`src/episodes/<ep>.ts`) is **data**: sections, beats, and pause cards, all
addressed by script text. The `EpisodeShell` renders it; the validator checks it. You never
write turn numbers, offsets, `<Sequence>`, `<Audio>`, or `useCurrentFrame` in an episode file
(ESLint blocks them).

## 1. Anchors

```ts
at: { turn: 'Not so fast. The Americas got calories', word: 'comanche' }
```

- `turn`: a snippet that matches **exactly one** speech turn (case- and punctuation-insensitive).
  Use the first 4–7 words of the line. Ambiguous or missing → **A001**.
- `word`: the word or phrase the beat lands on. The time comes from Vosk word timings
  (`data/<ep>/word_times.json`). Not in the turn → **A002**. `nth: 2` for the second occurrence;
  `delay: 0.3` to nudge.
- Without Vosk data the time is **estimated** (A003 warns in dev, **fails in `--strict`**).
- When you edit the script, anchors either still resolve or fail loudly. They never drift.

Ends (`until`): default is the end of the turn (held through the gap to the next turn).
`until.turns(2)` holds through the next turn; `until.at('snippet', 'word')` ends on a word.

## 2. Beat kinds

| kind | Use | Notes |
|---|---|---|
| `text` | A phrase the learner should remember | `level` hero/title/subtitle/body; max chars 18/34/42/64 **[B007]** |
| `bubble` | Maya's reaction, in her words | Short; never the trap claim itself |
| `bg` | Background image change | Holds until the next `bg` or section end; credit renders automatically |
| `map` | Movement across the Atlantic | Text labels, not emoji, for items |
| `source` | Primary source + HIPP | `quoteStatus` required; paraphrase is labeled |
| `versus` | Two-sided comparison | Both sides must have gains/losses (no "THE WINNERS") |
| `pictogram` | Proportions (8–9 of 10) | Caption carries the scope |
| `ledger` | Two-way inventory | `exception` marks the rule-breaker |
| `route` | Movement between real places | Names from `data/places.json`; great-circle arcs draw in, labels self-place |
| `range` | An estimate with its uncertainty | Usually auto-generated from a fact-registry `visual` |

| `tour` | Zoom/pan over an image, with callouts | `stops[]` (region or rect) glide in as their anchors are spoken; callouts draw a pulsing ring, leader line, label (≤34 chars) |
| `document` | Archival document reveal | scan slides in, magnifier passes over it, excerpt types as it is read, PARAPHRASED stamp, HIPP line |
| `figure` | Historical figure card | portrait develops from sepia (or silhouette with initials); always state `likeness` |

**Motion everywhere (automatic):** every text line is **kinetic** (words rise and unblur as they
are spoken; numbers count up; numbers/places/glossary terms get a highlighter swipe); captions
are **karaoke** (current word in the speaker colour); bubbles **pop** with a spring; tone changes
and box chapters get a **sweep transition**; stamps kick the background **camera**; **film
grain** over everything; maps ripple at destinations; the ribbon zips to each new year; the
episode sheet marks the box being covered (NOW + progress), draws checks with a burst, and
plays a finale.

Any `text` beat containing `→` renders as an **arrow chain**: each part lights up when its
first word is spoken (falls back to even spacing; always finishes ≥0.8s before the beat ends).
`bg` beats accept `focus: '<region id>'` (regions live in `images.json`): the image pushes into
the region over ~3s and the credit line gains the region's label.

Adding a kind: add it to the `Beat` union in `src/kit/types.ts`. TypeScript will then fail in
every exhaustive switch (shell, layout, validator) until it is handled.

## 3. Layout (data/render-config.json)

```
┌──────────────────────────────────────────────┬───────────────┐
│ stage [0.06–0.70 × 0.08–0.82]                │ box tracker   │
│  text centred at x = 0.38                    │               │
│  maps / sources / versus / diagrams fill it  ├───────────────┤
│                                              │               │
│                                              │ talking head  │
├──────────────────────────────────────────────┤               │
│ captions                                     │               │
│ image credit                                 │               │
└──────────────────────────────────────────────┴───────────────┘
```

Stage is now [0.06–0.70 × 0.13–0.78]: the top band (0.025–0.115) holds key terms and chapter
banners; the timeline ribbon sits at 0.795–0.84 above captions. Stack text at y = 0.20 / 0.34 /
0.48 / 0.62 / 0.72; the layout engine (§8) moves anything that doesn't fit. Headlines should
fit on one line (B012) unless marked `allowWrap`.

## 4. Timing rules

- A beat must be visible **≥1.2s** **[B001]**. A beat that lands on a turn's last word usually
  needs `until: until.turns(2)`.
- No speech stretch longer than **9s** without a visual change (warn) **[C001]**; at least **70%**
  of speech should have an element on screen (warn) **[C002]**.
- Text lands **on** the word, never before it. Spoiling a punchline ("THE COLUMBIAN EXCHANGE"
  six seconds early) is the most common legacy bug; anchors fix it only if you anchor to the word.

## 5. Visual grammar by tone

Sections set the tone (`playful | serious | sobering | recap`); the shell applies the grade.

| | Playful | Serious | Sobering | Recap |
|---|---|---|---|---|
| Background | full colour, slow drift | desaturated (0.35), slow push-in | near mono (0.15), push-in | colour, drift |
| Text entrance | `stamp` allowed | `fade` | `fade` | `stamp` allowed |
| Colour | gold/green accents | bone `#e8dcc8`; red only for scope words | bone | gold |
| Emoji | allowed (warns: font-dependent) | **forbidden** [B005] | **forbidden** [B005] | allowed |
| Bubbles | yes | only for Maya's honest questions | no | yes |
| Density | 2–3 elements | 1–2 elements | 1 element or none | 2 |

The most solemn moment of an episode (Middle Passage, the Codex account) gets **one** image and
no text. Let the credit line carry the date.

## 6. Pause cards

Every `[N-second pause]` needs exactly one card **[P001]**:

```ts
{ after: { turn: 'Your turn. Crops and animals crossed' }, kind: 'predict',
  prompt: 'Germs mostly crossed one way. Which side empties out?',
  reveal: 'The side with no immunity. Emptied land is easier to conquer.' }
```

The card (prompt + countdown ring) fills the stage during the pause; the reveal ("CHECK YOUR
ANSWER") sits at the top of the stage during the answer turn. Keep the answer turn otherwise
clear.

## 7. Derived overlays (nothing to author but short text)

| Overlay | Source | Where | Motion |
|---|---|---|---|
| **Trap card** | `{trap}` line + `spec.traps` (myth ≤40, fact ≤48 chars) | upper stage, spans trap + correction turns | myth struck through as the correction starts; fact slides in; whoosh |
| **Timeline ribbon** | every year spoken (`1492`, `1840s`) | strip above captions | spoken year pulses gold for 5s, then stays lit |
| **Key-term chip** | first spoken use of a `data/terms.json` term | top band | fades in/out over 4.5s; delayed automatically if a chapter banner holds the band (L004) |
| **Chapter banner** | `spec.chapters` with `box` | top band | wipes in for 2.6s; whoosh |
| **Range bar** | fact-registry `visual` | stage | bar grows; range hatched; caption carries the hedge |
| **Sound** | stamps (playful/recap only), box checks, trap reveals, banners, countdown ticks | — | volumes in `render-config.json sfx` |
| **Music bed** | `render-config.json music` | — | per-tone volume (silent in sobering), ducks under speech with 0.35s ramps |
| **Head pair** | `heads.mode: pair` | head rect | speaker enlarged and bouncing to the real audio amplitude; listener dimmed |

Chapters also drive `npm run chapters` (YouTube chapter list) and one 9:16 **Short** per box
(`U1E3-BOX1…4` compositions): letterboxed episode, fitted header, large captions, inside a
Shorts-safe area that avoids the platform's right rail and description.

## 8. Self-correction and the runtime guard

Two layers keep every element inside the frame and off every other element:

1. **Compile-time layout engine** (`src/kit/layout-engine.ts`). Every element is a timed box:
   chrome (head, tracker, ribbon, captions, credit), overlays (pause cards, reveals, trap
   cards, term chips, banners), stage components, text. Text and bubbles that collide or leave
   the safe area are **moved** to the nearest free slot (`textSlotsY`), then **shrunk** a level,
   then **clamped** horizontally. Each fix is logged as info (L001 moved, L002 shrunk, L003
   clamped). Only unfixable cases fail (B003/B004/B010). Stage components never move; their
   conflicts are errors.
2. **Runtime guard** (`src/kit/guard.tsx`). Every mounted element is wrapped in `<Track>`.
   After each frame commits, the guard measures the real DOM and reports `cut` (past the frame
   edge), `unsafe` (outside the safe area), `overlap`, and `clipped` (text overflowing a box
   that hides overflow). `npm run contact-sheet` collects these from the browser console and
   fails on anything but `unsafe`; the full list goes to `out/<ep>-layout.json`. In Studio,
   offenders get red outlines.

Kit components also fit their own text with real browser metrics (`fitTextOnNLines`), and
the route map places labels with a collision-avoiding search, so their contents can't overflow.

## 9. Variety (monotony checks)

V001 warns on 6 plain text beats in a row with nothing else happening; V002 on any minute
with ≤2 kinds of visual; V003 when one background returns more than 3 times. The validator
prints `varietyPerMin`; aim for ≥4.

## 10. Box tracker, captions, credits, title

All derived, nothing to author:
- **Box tracker**: boxes from `# @boxes:`; check-offs from "Checking that one." and "Box N, checked."
- **Captions**: chunks from the script text timed by Vosk; same chunks export to SRT
  (`npm run captions`).
- **Credits**: from `images.json` `credit` for the current background.
- **Title card**: `title.at` (after the cold open), for `titleCardSec`.
- **Debug overlay**: Remotion Studio only.

## 11. Images

Place an image only through a `bg`/`map` beat or a section. Then run `npm run sync:manifest`;
`used_in` is generated, never typed **[I004]**. New images need license, source_url, and a dated
credit in `images.json` before the validator passes **[I001, I003, I005]**.
