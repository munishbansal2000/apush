# video2 Look: documentary, visuals-first

Target: a top-tier YouTube history video that beats Heimler's History. Heimler is a talking head plus text slides. We
win with **continuous, moving visuals cut to the narration, real archival art, animated maps, and sound design**, with
almost no text on screen.

## The rules

1. **Full-bleed, always moving.** Every frame is a full-screen visual. No slide boxes, no stage frame, no permanent
   chrome. Nothing holds still for more than ~2 seconds: if the shot isn't animating, the camera is.
2. **Cut on the spoken word.** A new shot starts on a word the narrator says (a name, a place, a date, a turn of
   argument). Median shot 4s; 8s max except a map that is still animating.
3. **Text only to make a point.** Allowed on screen:
   - **Point card:** 1–3 bullets, ≤ 6 words each, appearing on their spoken cue, only when the narration enumerates or
     lands a thesis.
   - **Name tag:** person's name + role/years, for 2s when a person is introduced.
   - **Year stamp** on maps; **highlighted phrase** inside a real document.
   - The **Episode Sheet** (see Frame).
   No titles over images, no captions burned in (subtitles ship as an SRT), no paragraphs, ever.
4. **Real material.** Public-domain paintings, engravings, portraits, period maps, documents. Generated clips only to
   add motion to a real still, never to invent people or events.
5. **One palette.** Warm "living museum": ink-dark backgrounds, parchment, one gold accent, one red for conflict.
   Film grain + soft vignette on everything. One serif (Cinzel for names/points, body serif for documents).
6. **Sound carries the cuts.** Music bed ducked under voices; soft whoosh on camera moves, quill on point bullets,
   impact on conflict beats, tick/check on the Episode Sheet.

## Shot vocabulary (all the director can choose)

| Shot | What it looks like | Use for |
|---|---|---|
| `image_move` | Camera glides between two focus points on an archival image (push to a face, pan along a scene, pull back to reveal) | Most of the runtime: people, events, places |
| `portrait` | Slow push into a portrait + name tag for 2s | First mention of a person |
| `map` | Parchment world/US map; camera flies to a region; lines draw, regions fill, arrows sweep, year stamp ticks, all on spoken cues | Geography, borders, campaigns, change over time |
| `document` | Paper lens over a real document; zooms to a phrase; highlighter sweeps as it is spoken | Primary sources, laws, quotes |
| `point` | Full-bleed dimmed backdrop image + 1–3 bullets on cues | Enumerations, theses, "three reasons" |
| `clip` | LTX motion generated from a real still (static camera, ambient motion only: smoke, water, flags, trees), cropped never stretched to 16:9, looped as a seamless forward/reverse boomerang; falls back to a camera move on the still until generated | 1–2 hero moments per lesson (battles, crowds) |

## Atmosphere

Optional layers on image, clip, portrait and point shots (never maps), chosen to match the scene; procedural and
seeded, so nothing visibly loops:

| Layer | Use for |
|---|---|
| `dust` | Interiors, old paper, quiet portraits: motes drifting in the light |
| `smoke` | Battles, cities, protests: powder smoke drifting across |
| `embers` | Fire, revolt, the thesis landing |
| `fog` | Frontier, sea, dawn landscapes |
| `candle` | 18th-century interiors and portraits: warm light that breathes |

## Frame

- **Episode Sheet:** opens large mid-screen as the boxes are named, flies to the top-right corner, then shrinks to a
  small translucent tab. It pops forward with a tick when a box is checked and when a new box starts, then recedes.
- **Hosts are voice-only.** Speaker identity lives in the voices, not on screen.

## Worked example: the first 45 seconds of u3e1

| Cue (spoken) | Shot |
|---|---|
| "Last time: two centuries of English colonies" | `map`: parchment North America, the three colonial regions fill in turn on "New England", "middle colonies", "the South" |
| "start arguing with London" | `map`: camera flies across the Atlantic to London |
| "1763" | year stamp slams in; `image_move` on West's *Death of General Wolfe*, push to Wolfe |
| "the prime minister opens the books and turns pale" | `portrait`: Grenville (Hoare, 1764), slow push |
| "Three boxes on your sheet" | Episode Sheet opens big; rows land on "salutary neglect", "Proclamation Line of 1763", "Pontiac's Rebellion"; flies to the corner |
| "The war left London drowning in debt" | `image_move`: Kitchin's 1763 map, pull back to reveal the whole empire |
| "Canada to garrison, Florida to administer, a frontier" | `map`: Canada fills, Florida fills, the western frontier glows, on each word |
| "The thesis for your notes" | `point`: "Britain won the war" / "and wrecked the arrangement" over a dimmed *Death of Wolfe* |
| "George Grenville. Prime minister from 1763." | `portrait` + name tag "George Grenville · Prime Minister, 1763" |

## How we judge

A sample passes only if a viewer would watch it on YouTube next to Heimler and prefer it. Concretely: no frame looks
like a slide, no text a viewer must read while listening, every cut lands on a word, and nothing on screen is
placeholder art.
