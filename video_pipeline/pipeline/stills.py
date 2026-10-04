"""Still-image stage: generate AI plates, apply edit variants, and fetch archival search results.

This mirrors the provider / override / fallback / dry-run pattern of clips.py
(video), but for ``visual.base_image`` stills. A scene declares how its base
image comes to exist:

- ``visual.still``:  AI-generate from ``prompt``, or edit ``edit_of`` with
  ``edit_prompt`` (the edit-variant case: same composition, new era/details).
- ``visual.search``: fetch an archival image matching ``query`` (public-domain
  sources only, unless the operator verifies otherwise).

A scene may carry at most one of ``still`` / ``search`` (schema-enforced).
Scenes carrying either are exempt from the base_image file-existence check at
validation time; this stage produces the files before ``planned``.

Every produced file gets a ``<output>.provenance.json`` sidecar and a
CATALOG.json entry, so the license gate can verify it on the next run.
"""
from __future__ import annotations

import datetime
import hashlib
import io
import json
import os
import re
import shlex
import sys
import shutil
import subprocess
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

from .common import PipelineError, atomic_json, read_json, resolve_local

GENERATION_PROVIDERS = {"hatch-media", "command"}
SEARCH_PROVIDERS = {"wikimedia", "image-search"}

_PD_RE = re.compile(r"public domain|\bcc0\b", re.IGNORECASE)


def _run(command: list[str], label: str, timeout: int) -> str:
    print("$ " + " ".join(command), flush=True)
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise PipelineError(f"{label} failed: {exc}") from exc
    if result.returncode != 0:
        raise PipelineError(f"{label} failed (exit {result.returncode}): {result.stderr.strip()[-800:]}")
    return result.stdout


def _resolve_output(value: str, repo_root: Path) -> Path:
    """Resolve a still output path. Unlike resolve_local (which prefers the
    manifest dir), still outputs are repo assets: resolve against the repo
    root unless absolute, so CATALOG registration and the license gate agree
    on the location."""
    path = Path(value)
    return path if path.is_absolute() else repo_root / path


def _verify_image(path: Path, scene_id: str) -> None:
    if not path.is_file() or path.stat().st_size < 1024:
        raise PipelineError(f"still {scene_id}: output is missing or suspiciously small: {path}")
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "stream=width,height",
         "-of", "default=noprint_wrappers=1", str(path)],
        capture_output=True, text=True)
    if result.returncode != 0 or "width=" not in result.stdout:
        raise PipelineError(f"still {scene_id}: output is not a probeable image: {path}")


# ---------------------------------------------------------------------------
# generation providers
# ---------------------------------------------------------------------------

def _discover_media_file(tmpdir: Path) -> Path:
    """Find the generated image inside the provider's output dir."""
    candidates = [p for p in tmpdir.rglob("*")
                  if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}]
    if not candidates:
        raise PipelineError(f"still provider produced no image file in {tmpdir}")
    return max(candidates, key=lambda p: p.stat().st_size)


def _generate_hatch_media(still: dict, output: Path, config: dict, scene_id: str,
                          manifest_dir: Path, repo_root: Path) -> dict:
    """Generate (or edit) via /opt/hatch/bin/media-generation."""
    media_bin = config.get("media_bin", "/opt/hatch/bin/media-generation")
    if not Path(media_bin).is_file():
        raise PipelineError(f"hatch-media provider not found: {media_bin}")
    edit_of = still.get("edit_of")
    if edit_of:
        edit_path = resolve_local(edit_of, manifest_dir, repo_root)
        if not edit_path.is_file():
            raise PipelineError(f"still {scene_id}: edit_of does not exist: {edit_of}")
    conversation = json.dumps([{"text": still.get("edit_prompt") if edit_of else still["prompt"]}])
    tmpdir = Path(tempfile.mkdtemp(prefix="still-"))
    try:
        command = [
            media_bin,
            "--media-subagent-output-type", "image",
            "--conversation-json", conversation,
            "--orientation", still.get("orientation", config.get("orientation", "landscape")),
            "--image-output-format", config.get("image_output_format", "webp"),
            "--output-dir", str(tmpdir),
            "--timeout-secs", str(int(config.get("timeout_seconds", 600))),
        ]
        if edit_of:
            # --image-file uploads the base plate; the text entry carries the edit instruction.
            command += ["--image-file", str(edit_path)]
        stdout = _run(command, f"hatch-media still for {scene_id}",
                      int(config.get("timeout_seconds", 600)) + 60)
        try:
            payload = json.loads(stdout.strip().splitlines()[-1])
            media_paths = payload.get("media_paths") or []
        except ValueError:
            media_paths = []
        produced = None
        for candidate in media_paths:
            if Path(candidate).is_file():
                produced = Path(candidate)
                break
        if produced is None:
            produced = _discover_media_file(tmpdir)
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(produced), str(output))
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
    return {"kind": "edit" if edit_of else "generated", "provider": "hatch-media",
            "prompt": still.get("edit_prompt") if edit_of else still.get("prompt"),
            "edit_of": edit_of}


def _generate_command(still: dict, output: Path, config: dict, scene_id: str,
                      manifest_dir: Path, repo_root: Path) -> dict:
    """Generate via an operator-configured shell template.

    Template variables: {prompt}, {edit_prompt}, {edit_of}, {output}, {seed},
    {orientation}, {repo_root}, {python}. The command must write exactly one
    image to {output}.
    """
    template = config.get("command")
    if not template:
        raise PipelineError("command still provider requires still_generation.command")
    edit_of = still.get("edit_of") or ""
    if edit_of:
        edit_path = resolve_local(edit_of, manifest_dir, repo_root)
        if not edit_path.is_file():
            raise PipelineError(f"still {scene_id}: edit_of does not exist: {edit_of}")
        edit_of = str(edit_path)
    mapping = {
        "prompt": still.get("prompt", ""),
        "edit_prompt": still.get("edit_prompt", ""),
        "edit_of": edit_of,
        "output": str(output),
        "seed": str(still.get("seed", 42)),
        "orientation": still.get("orientation", config.get("orientation", "landscape")),
        "repo_root": str(repo_root),
        "python": sys.executable,
    }
    try:
        if isinstance(template, list):
            command = [token.format(**mapping) for token in template]
        else:
            command = shlex.split(template.format(**mapping), posix=os.name != "nt")
            if os.name == "nt":
                command = [token[1:-1] if len(token) >= 2 and token[0] == token[-1] == '"'
                           else token for token in command]
    except KeyError as exc:
        raise PipelineError(f"command template has unknown variable: {exc}") from exc
    output.parent.mkdir(parents=True, exist_ok=True)
    _run(command, f"command still for {scene_id}", int(config.get("timeout_seconds", 600)) + 60)
    return {"kind": "edit" if still.get("edit_of") else "generated", "provider": "command",
            "prompt": still.get("edit_prompt") if still.get("edit_of") else still.get("prompt"),
            "edit_of": still.get("edit_of"),
            "license_note": still.get("license_note")}


def _generate_one(selected: str, still: dict, output: Path, config: dict,
                  scene_id: str, manifest_dir: Path, repo_root: Path) -> dict:
    if selected == "hatch-media":
        return _generate_hatch_media(still, output, config, scene_id, manifest_dir, repo_root)
    if selected == "command":
        return _generate_command(still, output, config, scene_id, manifest_dir, repo_root)
    raise PipelineError(f"unsupported still generator: {selected}")


# ---------------------------------------------------------------------------
# search providers
# ---------------------------------------------------------------------------

_WIKIMEDIA_UA = "APUSHVideoPipeline/1.0 (educational use; contact: pipeline)"


def _wikimedia_api(params: dict) -> dict:
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": _WIKIMEDIA_UA})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except (OSError, ValueError) as exc:
        raise PipelineError(f"Wikimedia Commons search failed: {exc}") from exc


def _select_wikimedia(pages: list[dict], pick: int, min_width: int) -> dict:
    """Pick a public-domain bitmap from Commons search results (pure; testable)."""
    candidates = []
    for page in pages:
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata") or {}
        license_short = str((meta.get("LicenseShortName") or {}).get("value", ""))
        if not _PD_RE.search(license_short):
            continue
        width = int(info.get("width") or 0)
        if width and width < min_width:
            continue
        artist = str((meta.get("Artist") or {}).get("value", ""))
        artist = re.sub(r"<[^>]+>", "", artist).strip()
        candidates.append({
            "title": page.get("title", ""),
            "url": info.get("url", ""),
            "description_url": info.get("descriptionurl", ""),
            "width": width,
            "license": license_short,
            "author": artist,
        })
    candidates = [c for c in candidates if c["url"]]
    if not candidates:
        raise PipelineError("Wikimedia Commons: no public-domain results for query")
    if pick >= len(candidates):
        raise PipelineError(
            f"Wikimedia Commons: pick={pick} out of range ({len(candidates)} PD candidates)")
    return candidates[pick]


def _download(url: str, output: Path, scene_id: str,
              expected_sha256: str | None = None) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": _WIKIMEDIA_UA})
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            data = response.read()
    except OSError as exc:
        raise PipelineError(f"still {scene_id}: download failed: {exc}") from exc
    if len(data) < 1024:
        raise PipelineError(f"still {scene_id}: downloaded file suspiciously small")
    source_hash = hashlib.sha256(data).hexdigest()
    if expected_sha256 and source_hash.casefold() != expected_sha256.casefold():
        raise PipelineError(
            f"still {scene_id}: source checksum changed (expected {expected_sha256}, got {source_hash})")
    output.parent.mkdir(parents=True, exist_ok=True)
    try:
        with Image.open(io.BytesIO(data)) as source:
            image = source.convert("RGB")
            suffix = output.suffix.lower()
            if suffix == ".webp":
                image.save(output, format="WEBP", quality=92, method=6)
            elif suffix == ".png":
                image.save(output, format="PNG", optimize=True)
            elif suffix in {".jpg", ".jpeg"}:
                image.save(output, format="JPEG", quality=94, optimize=True)
            else:
                raise PipelineError(f"still {scene_id}: unsupported output image type {suffix}")
    except (OSError, ValueError) as exc:
        raise PipelineError(f"still {scene_id}: downloaded content is not a valid image: {exc}") from exc
    return source_hash


def _search_wikimedia(spec: dict, output: Path, scene_id: str) -> dict:
    params = {"action": "query", "format": "json",
              "prop": "imageinfo", "iiprop": "url|size|extmetadata"}
    if spec.get("page_title"):
        params["titles"] = spec["page_title"]
    else:
        params.update({"generator": "search",
                       "gsrsearch": spec["query"] + " filetype:bitmap",
                       "gsrnamespace": 6, "gsrlimit": 25})
    data = _wikimedia_api(params)
    pages = list((data.get("query") or {}).get("pages", {}).values())
    chosen = _select_wikimedia(
        pages, 0 if spec.get("page_title") else int(spec.get("pick", 0)),
        int(spec.get("min_width", 800)))
    print(f"[stills] {scene_id}: wikimedia -> {chosen['title']} ({chosen['width']}px, {chosen['license']})", flush=True)
    source_hash = _download(chosen["url"], output, scene_id, spec.get("sha256"))
    return {
        "kind": "search", "provider": "wikimedia", "query": spec.get("query", ""),
        "page_title": chosen["title"], "source_sha256": source_hash,
        "source_url": chosen["description_url"], "page_url": chosen["description_url"],
        "direct_url": chosen["url"], "author": chosen["author"],
        "license": chosen["license"],
        "license_note": f"{chosen['license']} via Wikimedia Commons",
    }


def _search_image_search(spec: dict, output: Path, config: dict, scene_id: str) -> dict:
    cli = config.get("image_search_bin", "/opt/hatch/bin/image-search")
    if not Path(cli).is_file():
        raise PipelineError(f"image-search provider not found: {cli}")
    stdout = _run([cli, spec["query"], "--max-results", "10"], f"image search for {scene_id}", 120)
    try:
        results = json.loads(stdout).get("results", [])
    except ValueError as exc:
        raise PipelineError(f"image-search returned invalid JSON: {exc}") from exc
    pick = int(spec.get("pick", 0))
    if pick >= len(results):
        raise PipelineError(f"image-search: pick={pick} out of range ({len(results)} results)")
    chosen = results[pick]
    url = chosen.get("media_url") or chosen.get("thumbnail_cdn_url")
    if not url:
        raise PipelineError("image-search: chosen result has no renderable URL")
    print(f"[stills] {scene_id}: image-search -> {chosen.get('page_url', url)}", flush=True)
    source_hash = _download(url, output, scene_id, spec.get("sha256"))
    page = chosen.get("page_url", "")
    return {
        "kind": "search", "provider": "image-search", "query": spec["query"],
        "source_url": page, "page_url": page, "direct_url": url,
        "source_sha256": source_hash,
        "author": "", "license": "UNVERIFIED",
        "license_note": "UNVERIFIED — operator must verify the license before use",
    }


# ---------------------------------------------------------------------------
# provenance + catalog
# ---------------------------------------------------------------------------

def _write_provenance(output: Path, scene_id: str, lesson_id: str, info: dict) -> None:
    record = {
        "scene": scene_id, "lesson": lesson_id,
        "created_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"),
        **info,
    }
    atomic_json(output.with_suffix(output.suffix + ".provenance.json"), record)


def _register_catalog(repo_root: Path, lesson_id: str, scene_id: str,
                      output: Path, info: dict, subject: str) -> None:
    catalog_path = repo_root / "assets" / "images" / "CATALOG.json"
    try:
        local_path = output.resolve().relative_to(repo_root.resolve()).as_posix()
    except ValueError:
        print(f"[stills] {scene_id}: output is outside the repo; skipping CATALOG registration")
        return
    data = read_json(catalog_path)
    entries = data.get("entries", [])
    if info["kind"] in ("generated", "edit"):
        license_note = info.get("license_note") or "AI-generated original"
    else:
        license_note = info.get("license_note", "")
    entry = {
        "id": f"{lesson_id}-{scene_id}",
        "local_path": local_path,
        "subject": subject or info.get("query") or info.get("prompt") or "",
        "period": "",
        "topic_tags": [],
        "provenance": {
            "source_url": info.get("page_url") or info.get("source_url") or "",
            "direct": info.get("direct_url", ""),
            "page_title": info.get("page_title", ""),
            "source_sha256": info.get("source_sha256", ""),
            "date": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"),
            "license_note": license_note,
            "generator": info.get("provider", ""),
            "prompt": info.get("prompt", "") or info.get("query", ""),
        },
        "on_disk": True,
    }
    entries = [e for e in entries if e.get("local_path") != local_path] + [entry]
    data["entries"] = entries
    data["count"] = len(entries)
    atomic_json(catalog_path, data)
    print(f"[stills] {scene_id}: cataloged {local_path} ({license_note})")


# ---------------------------------------------------------------------------
# stage entry point
# ---------------------------------------------------------------------------

def generate_stills(manifest: dict, manifest_path: Path, repo_root: Path,
                    provider_override: str = "manifest",
                    search_override: str = "manifest",
                    force: bool = False, dry_run: bool = False) -> list[Path]:
    config = dict(manifest.get("still_generation", {}))
    provider = (provider_override if provider_override != "manifest"
                else config.get("provider", "none"))
    search_default = (search_override if search_override != "manifest"
                      else config.get("search_provider", "wikimedia"))
    lesson_id = manifest.get("lesson_id", "<unknown>")
    jobs = [scene for scene in manifest["scenes"]
            if (scene.get("visual") or {}).get("still") or (scene.get("visual") or {}).get("search")]
    if not jobs:
        print("[stills] no still jobs -- skipped")
        return []
    if provider == "none" and provider_override == "manifest":
        # Search jobs never need a generation provider; only generate jobs do.
        # (The per-scene loop below skips jobs whose files already exist.)
        gen_missing = [scene["id"] for scene in jobs
                       if (scene.get("visual") or {}).get("still")
                       and not _resolve_output(scene["visual"]["base_image"],
                                               repo_root).is_file()]
        if gen_missing:
            raise PipelineError("still images are missing and no still generator is configured: "
                                + ", ".join(gen_missing))
    # Command-provider stills run last: they are deterministic local operations
    # (e.g. compositing) that may consume generated/searched plates from
    # earlier scenes. Manifest order is preserved within each phase.
    def _phase(scene: dict) -> int:
        visual = scene.get("visual") or {}
        if visual.get("search"):
            return 0
        still = visual.get("still") or {}
        effective = (provider if provider_override != "manifest"
                     else still.get("provider", provider))
        return 1 if effective == "command" else 0
    jobs = sorted(jobs, key=_phase)
    outputs: list[Path] = []
    for scene in jobs:
        scene_id = scene["id"]
        visual = scene["visual"]
        output = _resolve_output(visual["base_image"], repo_root)
        if output.is_file() and not force:
            print(f"[stills] {scene_id}: exists -- skipped")
            outputs.append(output)
            continue
        if dry_run:
            kind = "search" if visual.get("search") else ("edit" if (visual.get("still") or {}).get("edit_of") else "generate")
            print(f"[stills] {scene_id}: dry-run -- {kind} planned -> {output.name}")
            continue
        if visual.get("search"):
            spec = visual["search"]
            search_provider = (search_override if search_override != "manifest"
                               else spec.get("provider", search_default))
            if search_provider == "wikimedia":
                info = _search_wikimedia(spec, output, scene_id)
            elif search_provider == "image-search":
                info = _search_image_search(spec, output, config, scene_id)
            else:
                raise PipelineError(f"unsupported still search provider: {search_provider}")
        else:
            still = visual["still"]
            scene_provider = (provider if provider_override != "manifest"
                              else still.get("provider", provider))
            fallback = still.get("fallback_provider", config.get("fallback_provider"))
            if scene_provider == "none":
                raise PipelineError(
                    f"still {scene_id} is missing and neither the scene nor "
                    "still_generation config selects a provider")
            try:
                info = _generate_one(scene_provider, still, output, config, scene_id,
                                     manifest_path.parent, repo_root)
            except PipelineError:
                if not fallback or fallback == scene_provider:
                    raise
                print(f"[stills] {scene_id}: {scene_provider} failed; trying {fallback}", flush=True)
                info = _generate_one(fallback, still, output, config, scene_id,
                                      manifest_path.parent, repo_root)
        _verify_image(output, scene_id)
        _write_provenance(output, scene_id, lesson_id, info)
        subject = ((scene.get("source") or {}).get("title", "")
                   or info.get("query") or info.get("prompt") or "")
        _register_catalog(repo_root, lesson_id, scene_id, output, info, subject)
        outputs.append(output)
    return outputs
