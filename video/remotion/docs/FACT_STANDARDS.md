# Fact Standards

How a claim gets into an episode, how it is hedged, and how the pipeline enforces it.
The machine-readable half lives in `data/fact-registry.json`.

## 1. Source tiers

| Tier | What | Use |
|---|---|---|
| 1 | AP prep texts aligned to the CED (premium2027, 5steps2024), CED itself | Baseline: what the exam expects |
| 2 | Scholarly monographs and peer-reviewed articles (Crosby, Mintz, Thornton, Klein) | Correct and nuance Tier 1 |
| 3 | Primary sources in reputable translation (Florentine Codex, Anderson & Dibble) | Voice, stimulus questions |
| 4 | Databases (slavevoyages.org) | Numbers, with their ranges |

**Tier 1 is not automatically right.** When a prep book states a contested claim flatly (e.g.
syphilis origin), we follow Tier 2 and hedge, and record the disagreement in the registry.

## 2. Claim status → required wording

| Status | Meaning | Script must… | Screen must… |
|---|---|---|---|
| `settled` | Scholarly consensus | State plainly | State plainly |
| `settled-with-nuance` | True with a scope | Include the scope ("many Europeans") | Include the scope |
| `estimate` | A range | Say "estimates", "roughly", the range | Show the range or the scope ("hardest-hit towns") |
| `contested` | Live debate | Attribute both sides or hedge ("maybe", "historians still argue") | Use "?" or "DEBATED" |
| `framing` | An interpretive frame | Attribute it ("Crosby's argument") and show the pushback | Avoid one-sided labels ("THE WINNERS") |

## 3. Registry entries

Every non-obvious claim gets an ID (`F-U<unit>-NNN`) in `data/fact-registry.json`:

```json
{
  "id": "F-U1-019", "status": "estimate",
  "claim": "Estimates … roughly 50–90% … 8–9 of 10 applies to the hardest-hit towns.",
  "sources": ["premium2027 ch03"],
  "forbid": [{ "pattern": "\\bone textbook (estimates|says)\\b", "why": "…", "scope": ["script"] }],
  "hedge": { "trigger": "…nine out of ten…", "words": ["hardest-hit", "some towns"], "window": 1, "scope": ["script", "onscreen"] }
}
```

- **forbid** — wording that is wrong or misleading. Fails the script (S006) and/or on-screen text
  (B006). Lines tagged `{trap}` are exempt: they are deliberate mistakes that the next turn corrects.
- **hedge** — a trigger that must appear with a hedge word in the same turn or `window` turns
  before (S007). On screen, the hedge may be in any element visible at the same time (B006).
- **require** — something the episode must say at least once (S023), e.g. encomienda before the
  African labor shift; African states as actors.

Patterns cannot see negation ("don't write that it started with cotton" still matches). That is
intentional: the announce-the-mistake device is retired; state mistakes as `{trap}` lines.

**Add a rule every time a reviewer catches an error.** The registry is how one catch protects
every future episode.

## 4. Primary sources

- **Quote** only verbatim text from a named translation, and cite it in the Sources block.
- **Paraphrase** must be flagged in dialogue ("in our own words") and on screen
  (`quoteStatus: 'paraphrase'` is a required field; the shell labels it). A paraphrase may not be
  styled as a quotation **[B008]**.
- Always give HIPP context a student can use: who produced it, when relative to events, for whom.
  (The Florentine Codex: compiled under Sahagún, with Nahua scholars, decades after 1520.)

## 5. Images

- Every image in `images.json` has `license`, `source_url`, and `credit` (with a date)
  **[I003, I005]**. No exceptions for "reused" assets.
- The credit renders on screen while the image is visible. If an image's date or place doesn't
  match the narration (Brookes, 1788, British, under 1500s narration), the credit is what keeps it
  honest; if the mismatch would mislead even with a credit, use a different image.
- Backgrounds must depict the subject being discussed. A European plague doctor is not a
  background for smallpox in the Americas.

### Focus regions and magnifier marks

`focus` rects in `images.json` and `marks` on documents are fractions of the **full image**
(x0, y0, x1, y1 / x, y). Components map them through the image's real aspect ratio (sizes in
`data/images.lock.json`), so they stay on target whatever the crop. Set `verified: true` /
`marksVerified: true` only after checking them against the real image; strict validation
refuses unverified regions.

## 6. Chronology claims

"First X, then Y" claims get a registry entry with dates (F-U1-015: chains c. 1502 before Potosí
silver 1545). Taglines are claims too.

## 7. Before a script is locked

1. `npm run validate` — zero S006/S007/S023.
2. A second reader checks every registry ID cited in the Sources block against its source.
3. New claims without an ID: add one, or cut the claim.
