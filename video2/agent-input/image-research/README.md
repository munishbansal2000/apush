# Image-research agent handoff

This folder contains one canonical audio script per lesson and the contract for the final `data/<episode>/images.json` file.

## Inputs and output

- `audio-scripts/index.json` maps each episode ID to its copied script, original source, version, lock status, and SHA-256.
- `audio-scripts/unit*/<episode>.md` are exact copies. A `DRAFT` filename can still be canonical: the pipeline chooses the newest numbered draft, except that a lock wins until a newer draft supersedes the version named in its header.
- `images.schema.json` is the strict JSON Schema for the agent's final answer.
- `images.example.json` is illustrative only. Do not reuse its subject or URLs for unrelated lessons.
- Save each completed manifest as `results/<episode>/images.json`.

## Agent task

For one episode, read the complete script and research a useful, varied set of historically accurate images. Return a single JSON object conforming to `images.schema.json`; its keys are destination paths such as `historic/u3e1/george-grenville-portrait.jpg`.

1. Prefer public-domain or openly licensed primary sources, portraits, documents, maps, artifacts, and contemporary scenes from Wikimedia Commons, the Library of Congress, National Archives, government sites, and museum collections.
2. Choose images that teach specific spoken material. Avoid generic filler, modern reenactments, AI images, tiny thumbnails, paywalled pages, search-result URLs, and multiple crops of the same work.
3. Verify identity, date, provenance, and license from an authoritative page. Never infer a license from age alone and never write `unknown`.
4. `source_url` identifies the authoritative record. `download_urls` contains 1-4 directly downloadable full-resolution or large-rendition URLs for that exact work, best first. When possible, include an alternative host to reduce throttling.
5. Use lowercase ASCII slugs and the lesson's own folder: `historic/<episode>/<slug>.<ext>`. The extension must match the expected downloaded format.
6. `used_in` lists only speech turns where the picture directly matches the narration. Script dialogue and pause markers become sequential turns beginning at `t00`; headings and production notes do not. Never attach an image to a pause turn.
7. Set `retrospective: true` for a later depiction of an earlier event. Explain the actual work and date in `description`; do not present it as eyewitness evidence.
8. Aim for enough distinct, relevant material to sustain the lesson without excessive reuse. Favor coverage and visual variety over near-duplicates.
9. Output JSON only when answering programmatically. Do not add `verified`, `placeholder`, `catalog_id`, `fetchedAt`, dimensions measured from a local download, or other downloader-owned state.

The pipeline downloader will verify URLs, inspect image bytes, record local dimensions/checksums, and report failures. Passing the JSON Schema establishes shape, not historical accuracy or URL availability; the agent must check those separately.

## Refreshing script copies

From `video2`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/export-image-agent-input.ps1
```

