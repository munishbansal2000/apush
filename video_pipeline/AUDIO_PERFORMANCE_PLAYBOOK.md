# APUSH Audio Performance Playbook

Companion to `CREATIVE_VIDEO_PLAYBOOK.md`. The video playbook scores music,
foley, and silence; this one scores the voice. Lesson narration may be heard
as pure audio (podcast), so it must perform with eyes closed. A script that
only works over pictures is unfinished.

Proven in the History's Courtroom / Office Hours pilots: the same 1,350 words
rendered flat versus performed. The flat read was rejected; the performed
read passed. The difference was never the words alone — it was direction.

## The non-negotiable idea

Write for the ear first, then direct the performance like a human speaker.

- **Zero visual references in narration.** Never "look at this engraving,"
  "as you can see," "this map shows." Describe the thing or cut the line.
  (The blind review caught six of these; they break every pure-audio use.)
- **Eyes-closed test.** Read the narration aloud with the screen off. If a
  sentence needs the picture to make sense, rewrite the sentence.
- **One voice, one job.** In single-host narration the host may play every
  part theatrically, but must signpost honestly: "in his own words — a close
  paraphrase," never implying exact quotation.

## Sentence rhythm

- Average 8–16 words per sentence (video playbook §4), but **vary the rhythm
  deliberately**: a short punch after a long build. Unvarying sentence length
  is the single most reliable marker of synthetic narration.
- Mix very short sentences with medium ones; avoid long subordinate clauses.
  If a sentence needs two commas to survive, split it.
- Alternate compression with breath: claim, image, pause, consequence.
- Prefer concrete nouns and active verbs. Introduce one unfamiliar term at a
  time.
- Use contractions and spoken connectors ("so," "now," "here's the thing").
  Write the way people talk, not the way essays read.
- Spell out numbers, dates, and abbreviations the way you'd say them
  ("eighteen sixty-one," not "1861"; "the Civil War," not "C.W.").
- Ask a rhetorical question before a key point — it primes the ear for
  what matters.
- Repeat important ideas in slightly different words. The ear needs the
  second pass; the eye doesn't.
- In dialogue, allow human mess: backchannels ("mm," "right?"), a few light
  fillers or reactions, one self-correction per episode at most, uneven turn
  lengths. Never more than one piece of mess per turn — real talk is messy,
  not chaotic. Too many fillers sound fake.

## Punctuation before tags

Commas, em dashes, ellipses, and paragraph breaks shape pacing better than
explicit break tags — fix the punctuation first. Use `[pause]`-style break
tags ONLY for deliberate dramatic beats (max 1 per beat; never stack).
If a passage needs three tags to sound right, the sentences are wrong:
rewrite the sentences, don't tag-wrestle them.

## Performance direction by engine

Direction tags are engine-specific. Author only what the engine can render;
a tag the engine cannot perform is worse than no tag.

### Fish S2 (performs direction)

Use S2-native `[bracket]` tags. Every tag must be motivated — a tag without
a reason is decoration.

| Tag | Use | Rule |
|---|---|---|
| `[pause]` / `[short pause]` | Weight after a consequential line | Max 1 per beat; never stack |
| `[inhale]` / `[exhale]` | Before long dramatic reads; at heavy beats | Inhale before, exhale after — a real speaker breathes |
| `[chuckle]` / `[laughing]` | Where a joke landed | Only at genuine humor, never at victims or suffering |
| `[sigh]` | Genuinely heavy beats (regret, irony, loss) | At most once or twice per episode; more is melodrama |
| Emotion tags (`[fierce]`, `[quiet]`, `[pompous]`, `[solemn]`, `[dry]`, …) | Character voices and tonal shifts | Only at real turning points — max ~1 per 3–5 sentences. Default is NO tag: let the model infer prosody from the words. A tag on every sentence makes delivery swing robotically. One tag per turn absolute max; the host reacts in their own voice between characters |
| Character reads | Quoting historical actors | Shift delivery AND signpost: "this is, essentially, what he argued" |

### Edge (no SSML passthrough)

Edge XML-escapes its input: emotion, laughter, sighs, and emphasis tags are
flattened or read aloud. Therefore:

- **Do not author** `[chuckle]`, `[sigh]`, or emotion tags for Edge. The humor
  and feeling must live in the words and the pacing.
- `[pause:N]` compiles to **real inserted silence** in the stitched audio
  (see `pipeline/direction.py: edge_timeline`). Use it for every dramatic
  beat — Edge's "..." is a ~0.3s shrug, not a pause.
- Punctuation Edge honors: commas, periods, em-dashes, paragraph breaks.
  Write the rhythm into the sentences themselves.

## Character voices (both engines)

- When historical actors speak, shift the delivery: pompous for the
  syllogism, fierce for the eyewitness, quiet for the line that doesn't need
  shouting.
- The narrator **reacts** between voices ("Ouch. Okay — round two?"). The
  reaction is the human part; a voice shift without one feels like a demo
  reel.
- Funny about the debaters' absurdity, never about the victims. This is a
  hard line, not a tone suggestion.

## Anti-slop checklist (audio)

Reject narration that:

- Runs three or more sentences at the same length and cadence.
- Explains a joke, a pause, or an emotion instead of performing it
  ("dramatically," "with great feeling" as stage directions in prose).
- Uses parallel phrasing across turns ("In one corner X. In the other Y.
  In the third corner Z.").
- Delivers a mini-lecture inside dialogue — if a turn exceeds ~60 words,
  it is a monologue wearing a conversation's clothes. Break it or give the
  other speaker a genuine reaction first.
- Stacks more than two direction tags in one turn.

## Pure-audio suitability gate

Before a lesson ships, its narration must pass:

1. **Eyes-closed read** — no sentence depends on the picture.
2. **No visual deixis** — grep for "look," "see," "this map," "as shown";
   every hit is rewritten or cut.
3. **Engine check** — the narration's direction tags are legal for the
   engine it will render on (Fish set vs. Edge set; never mixed).
4. **Rhythm check** — no three consecutive sentences share a length band;
   at least one real silence per 90 seconds.

## Render chunking (TTS calls)

- Generate in paragraph-sized chunks: roughly 1–3 paragraphs per TTS call.
  Very long inputs drift; single sentences lose context and sound choppy.
- Keep generation settings (temperature/top_p) consistent across chunks so
  the voice doesn't wander mid-episode.
- Regenerate bad chunks instead of tag-wrestling them. If a chunk sounds
  wrong twice, the text is wrong — rewrite it.
- Chunk boundaries should fall on paragraph breaks, never mid-sentence.

## Enforcement

Audio performance is scored under the video playbook's rubric (Audio
direction, 5 points) **and** as part of blind review: the reviewer reads the
narration aloud (or renders it) and fails any lesson that sounds synthetic
when performed. "The TTS will fix it" is not a defense — direction is
authored, not rendered.
