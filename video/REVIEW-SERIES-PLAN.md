# REVIEW SERIES PLAN — "Point by Point" (unit review walkthroughs)

## Concept
Every episode takes one real question, shows a realistic student answer, and puts
it on trial against the rubric — point by point. The viewer sees exactly which
sentence earned which point, which point died and why, and the rewritten sentence
that takes it back. Thesis: the rubric grades the relationship between a sentence
and the question, never the sentence's truth.

## Episode template (every episode, all 4 formats)
1. **Cold open (0:00–0:20):** the question on screen, key phrase highlight-swept.
2. **The attempt (0:20–1:30):** realistic student answer, read in STUDENT voice,
   typed live as it's read. It earns partial credit — never 0, never full.
3. **The autopsy (bulk):** HOST walks the rubric point by point. Each point gets a
   verdict card: EARNED (green underline + point badge) or LOST (red dashed
   underline + "0/1" stamp + zoom into the exact rubric language that killed it).
4. **The rewrite:** the missing sentences typed live, each tagged to its point.
   The score counter climbs as points land.
5. **The takeaway (last 30s):** one transferable rule — "the exam asks this move
   again in every unit."

**Interactive device:** two "pause and try" beats per episode — a 3s card
("find the thesis — pause me"), then the reveal. Built with existing primitives.

## Visual grammar → pipeline primitives
| Move | Primitive |
|---|---|
| Key phrase in stem | highlight sweep (annotate layer) |
| Earning sentence | green underline + point badge slam (kinetic_text) |
| Missing element | red dashed underline + "0/1" stamp (myth_stamp variant) |
| Rubric language | doc_zoom into rubric side panel |
| Sentence rewrite | typewriter_scene, tagged to point |
| Chief Reader stat / exemplar ref | reference card slide-in (callout_scene) |
| Score | counter_scene (X/7 climbs live) |

## TTS cast
- **HOST** — the judge. Warm but exacting. Runs the autopsy.
- **STUDENT** — the attempt. Slightly nervous, real-student cadence. Never a strawman:
  the attempt is always plausible and earns partial credit.
- (No third voice — the rubric speaks through HOST's deadpan read.)

## Content sources (never burn test-stream questions)
- **CB released:** build/released/2023–2026 (DBQ/LEQ/SAQ sets, both forms) +
  Chief Reader reports (the bleed stats are the content: sourcing 0.39/1,
  complexity 0.15/1, evidence-beyond-docs 0.47/1 — every DBQ episode targets
  exactly these three).
- **Ours:** drill bank only (build/tests/*-bank, reconceived). Test-stream
  questions never appear in walkthroughs.

## Episode map — 4 per unit × 9 units = 36 episodes
| # | Format | Length | Content |
|---|---|---|---|
| 1 | MCQ Autopsy | ~6 min | 5 MCQs: stem highlight, option elimination with plain-language why-each-wrong (no "trap" jargon, per standing rule) |
| 2 | SAQ: 2/3 vs 3/3 | ~6 min | 2 SAQs (a/b/c): weak answer vs full answer, sentence-level diff |
| 3 | DBQ Point by Point | ~8 min | 7-pt rubric walk: thesis, contextualization, 3 evidence, sourcing, beyond-docs, complexity — one sample essay on trial |
| 4 | LEQ Point by Point | ~7 min | 6-pt rubric walk, same trial format, no documents |

Capstone (optional 37th): "The 5 deadliest point-losers" — cross-unit, built from
Chief Reader bleed stats.

## Unit-specific notes
- DBQ docs must stay in 1754–1980 (CB range); our pre-1930 PD rule covers quoting.
- SAQ format per Fall 2026 CED: Q1 secondary text, Q2 primary text, Q3 non-text —
  every SAQ episode uses exactly this rotation.
- The complexity point (0.15/1 earned) gets its own recurring segment in every DBQ
  episode until the number moves — it's the highest-leverage point on the exam.

## Build order
1. Pilot A: Unit 3 DBQ Point by Point (richest released material, worst bleed stats).
2. Pilot B: Unit 1 MCQ Autopsy (template for the fastest format).
3. Roll unit by unit 1→9 after pilot approval. DBQ episodes first within each unit
   (25% of the exam, lowest student scores).
