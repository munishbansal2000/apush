# APUSH content QA and controlled-fix pipeline

This pipeline audits the full question library without changing source content. It reuses the
repository's atomic JSON/checkpoint utilities, local image library, AP topic/skill codes, and
the provider pattern used by the lesson-video pipeline.

## What it verifies

- MCQ completeness, four-option/key structure, duplicate and near-duplicate choices
- answer-length, absolute-wording, all/none-of-the-above, and explanation/key tells
- thin or implausible distractors and explanation consistency
- AP period/topic/skill codes and period-to-topic agreement
- full-topic coverage, sparse topics, exact duplicate stems, and per-set key balance
- local image existence, decoding, resolution, caption, source page, and rights rationale
- SAQ parts/scoring guidance and DBQ/LEQ document/rubric/exemplar completeness
- daily review question/answer completeness and broken text-encoding characters
- independent LLM passes for blind key derivation, factual accuracy, distractors, topical
  alignment, image relevance, and writing-rubric quality
- retrieval grounding from the matching local Unit 1-9 review, with separate text/vision models
- browser-readable rendering of the actual question, image, choices, key, and findings

The deterministic audit is fast and needs no model:

```powershell
python content_qa/orchestrator.py --mode audit
```

Add `--check-render` to load the generated packet in headless Edge/Chromium, scroll every lazy
image into view, detect failed assets, empty prompts, console errors, and horizontal overflow,
and save `render-preview.png` plus `render-check.json`.

Run clean-context Ollama reviews (cached per item/pass/model):

```powershell
python content_qa/orchestrator.py --mode review --model qwen2.5:14b --limit 25
```

Use `--vision-model` to override the separate multimodal model used for image relevance.

Remove `--limit` for the entire library. Results are written to `build/content-qa/index.html`,
`report.json`, and `fixes.proposed.json`. The HTML is a visual inspection packet; keys,
explanations, and scoring exemplars stay inside a collapsed section so the first pass can be blind.

## Applying fixes safely

LLM edits are proposals, never automatic. Copy `fixes.proposed.json`, inspect every change,
and set `approved` to `true` only for edits you accept. Then run:

```powershell
python content_qa/orchestrator.py --mode apply --fixes build/content-qa/fixes.approved.json
python content_qa/orchestrator.py --mode audit
```

Application is refused if the source file or expected old value changed after review. Only a
small allowlist of content fields can be patched, and writes are atomic.

## Severity

- `blocker`: missing/bad key, corrupt/missing image, duplicate ID/options, internal contradiction
- `major`: correctness risk, bad distractor/tell, invalid alignment, missing provenance/rubric
- `minor`: quality or presentation weakness that does not make the item unusable
- `info`: reviewer note

The manifest is hard-validated and unknown fields fail. Its formal schema is
`schemas/qa-manifest.schema.json`.
