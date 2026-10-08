# LLM Prompts

Copy-paste prompts for each stage. Each one points the model at the same guides the validator
enforces, and each output goes back through `npm run validate` — the model's output is a draft,
the validator is the gate.

Attach the files named in **Inputs** to the conversation.

---

## 1. Script writer (new episode)

**Inputs:** docs/STYLE_GUIDE.md, docs/FACT_STANDARDS.md, data/fact-registry.json,
data/style-rules.json, the previous episode's script, the CED topic text, Tier 1 source notes.

```
You are writing an APUSH audio/video episode script for two hosts, Maya and Marcus.
Follow docs/STYLE_GUIDE.md exactly. It is the contract; data/style-rules.json and
data/fact-registry.json are machine-checked versions of it.

Topic: <CED topic number and title>
Boxes (3–4, each one sentence a student could explain): <list, or propose them>
Previous episode ends with: "<next-time line>"
Next episode: <title>

Hard requirements:
- Header lines: # @episode: <id>, # @boxes: a | b | c | d, # @midcheck: <n>.
- Structure in STYLE_GUIDE §3, in order: cold open (no "last time"), [hold 0.8s], one-line
  previously, four boxes, content, exactly one "Checking that one.", exactly two prediction
  beats ("Your turn." + [10-second pause]), recap with "Box N, checked." in order, one fast
  quick check ([5-second pause]), a one-line pointer to the unit practice video, next time,
  split tagline with an em dash and [hold 1.0s]. Do NOT write AP-style questions into the
  episode; propose 2–3 for the unit practice file instead (see prompt 2).
- Header also includes: # @kind: episode
- One {trap} line per box: Maya states the mistake a real student would make; Marcus's very
  next turn corrects it, opening with Careful / Not so fast / Almost / That's the box-N trap.
- Every number carries scope and certainty. Every contested claim is hedged or attributed.
  Use only claims you can tie to a registry ID or a cited source; list new claims with
  proposed registry entries after the Sources block.
- ≤1,500 words of speech. ≤80 words per turn. Each host 35–65% of words. No host speaks
  more than 4 turns in a row.
- None of the banned phrases or avoided terms in data/style-rules.json.
- Do not respell names; list any new names needing pronunciation entries at the end.

Write Maya as a student who guesses, objects, and is sometimes wrong — never as someone who
asks the perfect setup question. Write Marcus as a warm, precise historian with dry humor.
Serious sections contain no jokes and at least one human-scale detail from a primary source.

Output: the script in the exact line grammar (Name: text / [N-second pause] / [hold Ns] /
# comments), then "## Sources", then "## Proposed registry entries", then
"## Pronunciation entries needed".
```

## 2. Practice question writer (unit practice file)

**Inputs:** docs/STYLE_GUIDE.md §8, data/fact-registry.json, all of the unit's episode scripts,
the existing data/practice/<unit>.json, the CED unit text.

```
Write new questions for data/practice/<unit>.json, matching its JSON shape exactly.

Rules:
- Mix topics across the unit; don't follow episode order. Balance formats: stimulus short
  answer, defend/refute, causation, comparison, continuity and change.
- Only test what the unit's episodes actually taught; cite the episode and the fact-registry
  ids each question depends on (facts[]).
- ask: spoken by Marcus, starts with "Question <n>." and ends with a question or a prompt verb
  (Defend, Explain, Compare…). Keep it under 45 words.
- card.stem: the exam-paper wording; card.source only for stimulus questions, labeled
  PARAPHRASED if it is one.
- prompt (≤110 chars) and reveal (≤70 chars) for the on-screen countdown and answer chip.
- answer: a model answer with a claim and specific evidence (≤45 words).
- why: one or two sentences, in Maya's voice, on what earns the point.
- pauseSec: 15 for short answers, 20 for arguments.
- Hedge contested claims and scope numbers exactly as the fact registry requires.

Output only the JSON array of new question objects.
```

Then: `npm run setup:practice` (regenerates the practice script and validates it) and
`npm run export:quiz`.

## 3. Script reviewer / fact-checker

**Inputs:** the draft script, docs/FACT_STANDARDS.md, data/fact-registry.json, the
validator output (`npm run validate -- --json`).

```
Review this APUSH script as a skeptical AP Reader and a historian. The validator output is
attached; do not repeat its findings, go beyond them.

For each problem give: line, quote, category (accuracy | hedge | chronology | causation |
missing actor | pedagogy | voice | TTS), why it matters for a student, and a replacement line
in the script's voice.

Check specifically:
1. Every factual claim: is it true, is its scope stated, is its certainty right for its
   registry status? Flag claims with no registry ID or source.
2. Chronology: any "first/then" or ordering claim, including taglines.
3. Causation: does the script say *why*, and does it avoid single-cause explanations?
4. Actors: are Native peoples, Africans, and Europeans all shown making choices?
5. Traps: is each {trap} a mistake real students make on this topic? Is the correction
   complete enough to answer an exam question?
6. Questions: is the quick check genuinely quick? For practice files: does each question match
   an AP format, test only what the unit taught, and model the reasoning in its answer?
7. Voice: lines that exist only to set up the next line; announcer phrasing; jokes in
   serious sections.
8. Proposed new fact-registry rules (forbid/hedge/require) that would catch the errors you
   found in future scripts.

Be specific. No praise section.
```

## 4. Scene author (beats from a locked script)

**Inputs:** docs/SCENE_GUIDE.md, src/episodes/u1e3.ts (as the reference example),
data/render-config.json, the locked script, images.json (entries with license + credit).

```
Write src/episodes/<ep>.ts for this locked script, following docs/SCENE_GUIDE.md and using
src/episodes/u1e3.ts as the pattern.

Rules:
- Anchors only: at: { turn: '<first 4–7 words of the line>', word: '<the word the visual
  lands on>' }. Never turn numbers or offsets. Snippets must be unique.
- Sections at each tone change (playful / serious / sobering / recap) with a background
  that depicts the subject being discussed.
- Exactly one pause card per [N-second pause], with a short on-screen prompt and a reveal.
- Text: x = 0.38, stacked at y 0.20/0.34/0.48/0.62; ≤3 elements at once; within the max
  characters for its level; lands on the spoken word; holds ≥1.2s (use until.turns(2) when
  anchoring to a turn's last words).
- No emoji in serious/sobering sections. No on-screen text that contradicts a registry
  hedge (e.g. "ONE WAY ONLY", "THE WINNERS", unscoped "8–9 OF 10 DIED").
- Use only images present in images.json with license, source_url, and credit. If the right
  image doesn't exist, add a TODO comment naming what's needed.
- Most solemn moment: one image, no text.
- Aim for a visual change at least every 9 seconds of speech.

Output only the TypeScript file.
```

Then: `npm run validate` and fix every error before review.

## 5. Visual QA (contact sheet)

**Inputs:** out/<ep>-contact.png and out/<ep>-contact.txt (tile index), docs/SCENE_GUIDE.md.

```
This contact sheet samples an educational video at every turn start, every visual beat,
every pause, and the final second. The .txt file maps tiles to labels.

For each tile with a problem, report tile number, label, and the issue:
- text cut off, overlapping other elements, or unreadable against the background
- anything covering the talking head, box tracker, captions, or credit line
- blank or near-blank frames; placeholder art; debug text
- a pause card missing during a pause, or a reveal missing after it
- tone mismatch: emoji, stamps, or bright colour in the disease/slavery sections
- an image that doesn't depict what the label says is being discussed
- the head art not matching the speaker named in the label
Then list the three changes that would most improve the episode visually.
```

## 6. TTS prep check

**Inputs:** tts/<ep>/*.txt, data/pronunciations.json.

```
These files are the exact text sent to a TTS voice. Flag anything a TTS model is likely to
mispronounce or mis-pace: names and non-English words without a respelling, abbreviations,
numbers that could be read two ways (1500s, 1619 vs "sixteen nineteen"), symbols, very long
sentences, and lines under four words that will sound flat in isolation. Propose entries for
data/pronunciations.json in its JSON format (term, guide with stress in caps, tts respelling
in lowercase, approved: false).
```
