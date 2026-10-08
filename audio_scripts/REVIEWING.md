# Meta UI lesson-script review

`tools/review_lessons.js` sends each selected Markdown lesson to a fresh Meta
AI browser conversation. It directly reuses the established
`sat_question_runner/new_eng_qs/lib/meta.js` adapter for cookies, attachments,
Thinking mode, submission, response waiting, and response extraction.

Meta checks grammar, AI-slop, factual accuracy, misleading omissions, and
exaggeration. Before submission, the script also runs
`apush-script-gates.py` and builds a compact `review-context.md` containing the
editorial guidelines plus only the most relevant fact-registry entries. The
complete 400KB registry is deliberately not attached.

## Run

From the repository root:

```powershell
# Requested unit<n>\*lesson*.md convention
node audio_scripts\tools\review_lessons.js `
  --unit 3 `
  --pattern "*lesson*.md"

# Current checkout generally names lessons *script*.md
node audio_scripts\tools\review_lessons.js `
  --unit 3 `
  --pattern "*script*.md" `
  --limit 1

# One explicit lesson
node audio_scripts\tools\review_lessons.js `
  --file audio_scripts\unit3\apush-audio-u3-e1-script-v2-DRAFT.md
```

Defaults:

- Cookie: `ramsham21.json`
- Browser: headed Chrome
- Timeout: 20 minutes per lesson
- Output: `audio_scripts/_reviews/<unit>/<lesson>/<content-hash>/`
- Successful responses are cached; use `--force` to review again.
- Add `--keep-browser-on-error` to leave a failed Meta page open until Enter is
  pressed, making UI changes or response-extraction failures diagnosable.

Each output directory contains the deterministic gate result, selected review
context, raw Meta response, validated JSON, and readable `report.md`.
`audio_scripts/_reviews/latest-run.json` indexes the most recent batch. Source
lesson files are never modified.

Validation commands:

```powershell
node --test audio_scripts\tools\review_lessons.test.js
node audio_scripts\tools\review_lessons.js --unit 3 --pattern "*script*.md" --limit 2 --dry-run
```
