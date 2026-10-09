# Storyboard → treatment → build

The documentary is made in steps that can each be reviewed, approved (frozen) and revised on their own, so every round
fixes issues instead of redoing a lesson. Creativity and iteration live in the storyboard; the build is bookkeeping
plus an editor pass.

| # | Step | Output | Decides | Review |
|---|---|---|---|---|
| 1 | Script | locked script (`audio_scripts/`) | fleet | gates, audit |
| 1b | Audio | voiced lines + word timings | Fish | listen, `review approve audio` |
| 2 | Images | approved images per lesson | you | image sheet, `review image` |
| 3 | **Storyboard** | per turn: visuals, the phrase each lands on, priority, pace | LLM proposes, you approve per act | storyboard sheet |
| 4 | Treatment | per image: named framings, move, parallax / LTX eligibility | code/LLM proposes, you approve | framing stills |
| 5 | Build | the timed shot plan (`shots.json`) | code + one editor pass | contact sheet, preview |

## Data

`data/<lesson>/storyboard.json` (committed):

```json
{"episode": "u3e1",
 "acts": [{"title": "...", "purpose": "...", "turns": {"from": 0, "to": 9}}],
 "turns": [{"key": "maya:3f2a9c01de", "index": 0,
            "visuals": [{"kind": "image", "image": "historic/u3e1/x.jpg", "framing": "face", "at": {"phrase": "george grenville"},
                         "priority": "essential", "pace": "hold"}]}]}
```

- **kind**: `image` (any still; `framing` names a treatment framing), `map` (a map shot spec, usually `{"view": ...}`),
  `point` (bullets), `custom` (explainer), `clip` (hero still with LTX motion). Question cards are automatic (every 5s+
  pause) and never appear in the storyboard.
- **at.phrase**: 2-6 words verbatim from that turn, unique within it (or `occurrence` for repeats).
- **priority**: `essential` | `optional`; optional visuals are dropped first when cuts would be too dense.
- **pace**: `hold` (key line: long, slow), `quick` (lists), `reveal` (pull-back), or absent.
- **span**: a visual may continue over the next N turns (short exchanges hold one image instead of cutting per line).
  A turn may have no visuals of its own.

## Decisions (each answers a corner case)

1. **Turns are keyed by identity, not index**: `speaker:sha(text)`. Inserting a line renumbers turns but only changed
   turns lose their visuals; their act returns to "needs review"; anchors are re-checked against the new text.
2. **Visuals can span turns; a turn can have none.** No ping-pong cutting in quick exchanges.
3. **Treatments are named framings per image** (`wide`, `face`, `detail-…`); the storyboard names one. The build
   copies the resolved framing into the plan, so a later treatment change never alters a frozen lesson silently.
4. **Long turns**: the build splits one image into several framings (one image use) before asking the storyboard for
   another visual. A turn still short of visuals is reported back to step 3, never filled with a substitute.
5. **Recap / practice / tease** sections get their own reuse allowance (a recap should revisit images).
6. **Priority** decides what is dropped or merged when two visuals land < 1.2s apart.
7. **Storyboard intent beats variety rules**; the rules warn, they do not override a deliberate choice.
8. **Explainer phases are timed from cue phrases**, so the animation lands on the words.
9. **Focus points are never trusted unseen**: chosen from thumbnails (attached to the prompt) or marked on stills.
10. **Framings respect overlay safe areas** (docked Episode Sheet top-right, year stamps, name tags).
11. **Low-confidence anchors** (word timing could not find the phrase; estimated) are flagged on review sheets.
12. Retrospective images (later imaginings) are warned when used as "what happened", and approved explicitly.
13. An image rejected after approval invalidates only the turns that use it.

## Stages (all landed)

- **S1** data model, bootstrap from an existing plan, checks, storyboard sheet: `npm run storyboard -- u3e1 bootstrap | check | sheet`
- **S2** storyboard director (`tools/pipeline/storyboard-director.ts`): outline shared with the old director, one small
  prompt per act, verbatim/unique/ordered anchors, at most twice per image per act, one clip per act, lesson budget
  pushed back to the acts holding the extra uses (recap revisits allowed: budget + 2), repairs and reviewer notes
  re-ask only their acts. Review: `review u3e1 approve storyboard [--acts]`, `review u3e1 note --storyboard --turn 18 "…"`.
- **S3** treatments (`tools/pipeline/treatments.ts`, `data/library/treatments.json`): kind from name/description
  (portrait, map, document, object, scene), named framings within the zoom limit, an alternative with a different move,
  parallax off for maps and documents, focus kept out of the docked sheet's corner. Framing stills:
  `npm run storyboard -- u3e1 framings`; review: `review treatment <path> approve | needs-work`. LTX clips are keyed
  by image + prompt + seed + focus, so re-cutting never regenerates them.
- **S4** scene builder (`tools/pipeline/scene-builder.ts`): repeated phrases made unique, framings copied into the
  plan, automatic verbatim question cards, optional visuals dropped first, long holds split at a new line (or
  mid-line) into another framing of the same image (`continues`: one image use), variety on runs of three identical
  moves unless the storyboard said hold, explainer beats timed from cue phrases; lines it cannot cover are reported as
  storyboard items. Editor pass (`--editor`): switch framing or drop an optional shot per act; invalid edits discarded.
- **S5** the pipeline's direct stage runs storyboard -> treatments -> build (`tools/pipeline/stages/storyboard.ts`):
  bootstraps from an existing plan, moves plan notes to the storyboard, auto-notes acts whose lines changed, freezes
  approved steps, `--keep-plan` keeps an existing plan, `--legacy-director` runs the previous director.

Not built yet: overlay staggering (decision 10's year stamps vs point cards; nothing checks it today), and focus points
from images (they come from code proposals until someone edits them after the framing stills; thumbnails are not
attached to prompts yet).
