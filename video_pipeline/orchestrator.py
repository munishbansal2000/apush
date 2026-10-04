#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent
sys.path.insert(0, str(HERE))

from pipeline.common import PipelineError, atomic_json, canonical_hash, file_hash, read_json, resolve_local
from pipeline.clips import generate_clips
from pipeline.curriculum import expand_curriculum
from pipeline.providers import plan_animation
from pipeline.layout import validate_text_layout
from pipeline.render import render_video
from pipeline.schema import validate_manifest
from pipeline.state import Checkpoint, STAGES
from pipeline.stills import generate_stills
from pipeline.tts import health, render_scene
from pipeline.validate import validate_output


def load_targets(args) -> list[tuple[Path, dict | None]]:
    targets = [(Path(item).resolve(), None) for item in args.manifest]
    if args.manifests:
        index_path = Path(args.manifests).resolve()
        value = read_json(index_path)
        entries = value.get("lessons") if isinstance(value, dict) else value
        if not isinstance(entries, list):
            raise PipelineError("--manifests JSON must be an array or {\"lessons\": [...]}")
        for entry in entries:
            raw = entry.get("manifest") if isinstance(entry, dict) else entry
            if not isinstance(raw, str):
                raise PipelineError("each --manifests entry must be a path string or {\"manifest\": path}")
            targets.append(((index_path.parent / raw).resolve(), None))
    if args.curriculum:
        curriculum_path = Path(args.curriculum).resolve()
        if not curriculum_path.is_file():
            raise PipelineError(f"curriculum file not found: {curriculum_path}")
        curriculum = read_json(curriculum_path)
        configured = curriculum.get("defaults", {}).get("clip_generation", {}).get("provider", "none")
        provider = configured if args.video_gen == "manifest" else args.video_gen
        if args.poc and args.video_gen == "manifest" and provider == "none":
            provider = "meta-ui"
        lessons = expand_curriculum(
            curriculum, curriculum_path, REPO_ROOT,
            allow_missing_clips=provider != "none")
        targets.extend((curriculum_path, lesson) for lesson in lessons)
    if not targets:
        raise PipelineError("provide --manifest PATH, --manifests PATH, or --curriculum PATH")
    missing = [str(path) for path, source in targets if source is None and not path.is_file()]
    if missing:
        raise PipelineError("manifest file(s) not found: " + ", ".join(missing))
    return targets


def asset_fingerprint(manifest: dict, manifest_path: Path) -> str:
    refs = []
    if manifest["tts"].get("engine", "fish") == "fish":
        refs += [manifest["tts"]["reference_audio"], manifest["tts"]["reference_text"]]
    for scene in manifest["scenes"]:
        refs.extend(scene["visual"].get(key) for key in ("base_image", "secondary_image", "clip")
                    if scene["visual"].get(key))
        refs.extend(layer["image"] for layer in scene["visual"].get("layers", []))
        if scene.get("audio", {}).get("ambience"):
            refs.append(scene["audio"]["ambience"])
        refs.extend(effect["file"] for effect in scene.get("audio", {}).get("effects", [])
                    if effect.get("file"))
        refs.extend(scene["narration"].get(key) for key in ("reference_audio", "reference_text") if scene["narration"].get(key))
    rows = []
    for ref in refs:
        path = resolve_local(ref, manifest_path.parent, REPO_ROOT)
        rows.append((str(path), file_hash(path) if path.is_file() else "PENDING_GENERATED_ASSET"))
    return canonical_hash(rows)


def process(path: Path, args, source_override: dict | None = None) -> None:
    source = copy.deepcopy(source_override) if source_override is not None else read_json(path)
    configured_clip_provider = (
        source.get("clip_generation", {}).get("provider", "none")
        if isinstance(source, dict) else "none")
    clip_provider = (configured_clip_provider if args.video_gen == "manifest"
                     else args.video_gen)
    if args.poc and args.video_gen == "manifest" and clip_provider == "none":
        clip_provider = "meta-ui"
    clip_generation_override = (
        "meta-ui" if args.poc and args.video_gen == "manifest"
        and configured_clip_provider == "none" else args.video_gen)
    manifest = validate_manifest(
        source, path, REPO_ROOT, require_files=True,
        allow_missing_clips=clip_provider != "none")
    lesson_id = manifest["lesson_id"]
    work = Path(args.workdir).resolve() / lesson_id
    work.mkdir(parents=True, exist_ok=True)
    state = Checkpoint(work / "state.json", lesson_id, manifest)
    if args.status:
        print(f"\n== {lesson_id}: status ==")
        rows = state.data.get("stages", {})
        for stage in STAGES:
            row = rows.get(stage, {})
            print(f"{stage:10} {row.get('status', 'pending'):8} {row.get('completed_at', '')}")
        return
    selected = list(STAGES)
    if args.only:
        selected = [args.only]
    elif args.from_stage:
        selected = selected[selected.index(args.from_stage):]
    print(f"\n== {lesson_id}: {' -> '.join(selected)} ==", flush=True)

    validated_fp = canonical_hash(manifest) + ":" + asset_fingerprint(manifest, path)
    if "validated" in selected:
        atomic_json(work / "input_manifest.json", manifest)
        state.record("validated", validated_fp, [str(work / "input_manifest.json")])
        print("[validated] schema, animation contracts, references, and paths")
        if args.only == "validated":
            return

    resolved = copy.deepcopy(manifest)
    plan_path = work / "resolved_manifest.json"
    plan_fp = canonical_hash({"manifest": manifest, "generation": manifest.get("generation", {})})

    stills_fp = canonical_hash({
        "scenes": [{"visual": scene["visual"]} for scene in resolved["scenes"]],
        "provider": args.still_gen,
        "search_provider": args.still_search,
        "config": resolved.get("still_generation", {}),
    })
    if "stills" in selected:
        if not args.force and state.current("stills", stills_fp):
            print("[stills] checkpoint current -- skipped")
        else:
            produced = generate_stills(
                resolved, path, REPO_ROOT, args.still_gen, args.still_search,
                force=args.force, dry_run=args.dry_run)
            if not args.dry_run:
                state.record("stills", stills_fp, [str(item) for item in produced])
        if args.only == "stills":
            return

    if "planned" in selected:
        if not args.force and state.current("planned", plan_fp) and plan_path.exists():
            resolved = read_json(plan_path)
            print("[planned] checkpoint current -- skipped")
        else:
            for scene in resolved["scenes"]:
                if scene["animation"]["type"] == "auto":
                    if args.dry_run:
                        scene["animation"] = {"type": "ken_burns"}
                    else:
                        image = resolve_local(scene["visual"]["base_image"], path.parent, REPO_ROOT)
                        scene["animation"] = plan_animation(resolved.get("generation", {}), scene, image)
                    print(f"[planned] {scene['id']} -> {scene['animation']['type']}")
            validate_manifest(
                resolved, path, REPO_ROOT, require_files=True,
                allow_missing_clips=clip_provider != "none")
            atomic_json(plan_path, resolved)
            atomic_json(work / "resolved_manifest.input_hash", canonical_hash(manifest))
        layout_path = work / "layout_report.json"
        layout_report = validate_text_layout(
            resolved, path, REPO_ROOT, allow_missing_assets=args.dry_run)
        atomic_json(layout_path, layout_report)
        state.record("planned", plan_fp, [str(plan_path), str(layout_path)])
        print(f"[planned] text layout: {layout_report['text_element_count']} elements, no conflicts")
        if args.only == "planned":
            return
    elif plan_path.exists():
        # Never silently build on a resolved manifest written for an older input:
        # fail closed and tell the user to re-run the planned stage.
        hash_path = work / "resolved_manifest.input_hash"
        if (not hash_path.exists()
                or read_json(hash_path) != canonical_hash(manifest)):
            raise PipelineError(
                f"{lesson_id}: input manifest changed since resolved_manifest.json "
                f"was written; re-run the planned stage before {args.only or args.from_stage or 'this stage'}")
        resolved = read_json(plan_path)
    elif any(scene["animation"]["type"] == "auto" for scene in resolved["scenes"]):
        raise PipelineError("resolved manifest is missing; run the planned stage first")

    if args.poc:
        resolved["tts"] = {
            "engine": "edge", "edge_voice": args.edge_voice,
            "edge_rate": args.edge_rate, "edge_pitch": args.edge_pitch
        }
        print(f"[profile] POC: Edge TTS ({args.edge_voice}), video generator {clip_provider}; final media gates remain enabled")

    clips_fp = canonical_hash({
        "scenes": [{"visual": scene["visual"], "animation": scene["animation"]}
                   for scene in resolved["scenes"]],
        "provider": clip_provider,
        "config": resolved.get("clip_generation", {})
    })
    if "clips" in selected:
        generated = generate_clips(
            resolved, path, REPO_ROOT, clip_generation_override, args.ltx_python,
            force=args.force, dry_run=args.dry_run)
        if not args.dry_run:
            state.record("clips", clips_fp, [str(item) for item in generated])
        if args.only == "clips":
            return

    audio_dir = work / "audio"
    tts_fp = canonical_hash({"resolved": resolved, "tts": resolved["tts"]})
    if "tts" in selected:
        if args.dry_run:
            print("[tts] dry-run -- server call skipped")
        elif (not args.force and state.current("tts", tts_fp)
              and all((audio_dir / f"{scene['id']}.wav").is_file()
                      and (audio_dir / f"{scene['id']}.json").is_file()
                      for scene in resolved["scenes"])):
            print("[tts] checkpoint current -- skipped")
        else:
            engine = resolved["tts"].get("engine", "fish")
            if engine == "fish":
                server = health(resolved["tts"]["server_url"])
                print(f"[tts] server ready: {server.get('model', 'Fish')} on {server.get('device', 'unknown')}")
            elif engine == "fish_cloud":
                model = (resolved["tts"].get("settings", {}) or {}).get(
                    "fish_cloud_model", "s2.1-pro-free")
                print(f"[tts] Fish Audio cloud model: {model}")
            else:
                print(f"[tts] Edge voice: {resolved['tts'].get('edge_voice')}")
            artifacts = []
            for scene in resolved["scenes"]:
                out = audio_dir / f"{scene['id']}.wav"
                meta = render_scene(resolved, scene, path, REPO_ROOT, out, args.force)
                artifacts.extend([str(out), str(out.with_suffix('.json'))])
                print(f"[tts] {scene['id']}: {meta['duration']:.2f}s")
            state.record("tts", tts_fp, artifacts)
        if args.only == "tts":
            return

    output = (Path(args.out).resolve() if args.out and len(args.targets) == 1 else resolve_local(resolved["output"], path.parent, REPO_ROOT))
    render_fp = canonical_hash({"resolved": resolved, "preview": args.preview, "tts": tts_fp})
    if "rendered" in selected:
        if args.dry_run:
            print("[rendered] dry-run -- video render skipped")
        elif not args.force and state.current("rendered", render_fp) and output.exists():
            print("[rendered] checkpoint current -- skipped")
        else:
            if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
                raise PipelineError("ffmpeg and ffprobe must be available on PATH")
            render_video(resolved, path, REPO_ROOT, audio_dir, output, args.preview)
            state.record("rendered", render_fp, [str(output)])
            print(f"[rendered] {output}")
        if args.only == "rendered":
            return

    if "complete" in selected:
        if args.dry_run:
            print("[complete] dry-run -- final media gates skipped")
        else:
            report = validate_output(resolved, output, audio_dir, args.preview)
            report_path = work / "validation_report.json"
            atomic_json(report_path, report)
            complete_fp = canonical_hash({"render": render_fp, "output_hash": file_hash(output)})
            state.record("complete", complete_fp, [str(output), str(report_path)], report)
            print(f"[complete] ALL GATES GREEN -- {report['duration']:.1f}s, {report['width']}x{report['height']}")


def parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description="Build validated APUSH lesson videos from declarative manifests.")
    source = ap.add_mutually_exclusive_group(required=True)
    source.add_argument("--manifest", action="append", default=[], help="lesson manifest; repeatable")
    source.add_argument("--manifests", help="JSON array/index of lesson manifest paths")
    source.add_argument("--curriculum", help="unit/chapter/lesson curriculum manifest")
    ap.add_argument("--workdir", default=str(REPO_ROOT / "build" / "lesson-videos"))
    ap.add_argument("--out", help="override output for a single manifest")
    ap.add_argument("--only", choices=STAGES)
    ap.add_argument("--from-stage", choices=STAGES)
    ap.add_argument("--force", action="store_true", help="ignore reusable stage/artifact checkpoints")
    ap.add_argument("--preview", action="store_true", help="render 720x1280 using the existing motion preview scale")
    ap.add_argument("--dry-run", action="store_true", help="validate and plan without TTS or video generation")
    ap.add_argument("--status", action="store_true", help="show durable stage checkpoints without running work")
    ap.add_argument("--poc", action="store_true", help="fast proof-of-concept profile: Edge TTS, preview optional, normal QC")
    ap.add_argument("--edge-voice", default="en-US-GuyNeural")
    ap.add_argument("--edge-rate", default="+0%")
    ap.add_argument("--edge-pitch", default="+0Hz")
    ap.add_argument("--video-gen", choices=("manifest", "none", "ltx", "meta-ui"),
                    default="manifest", help="override the ai_clip generation backend")
    ap.add_argument("--still-gen", choices=("manifest", "none", "hatch-media", "command"),
                    default="manifest", help="override the still-image generation backend")
    ap.add_argument("--still-search", choices=("manifest", "wikimedia", "image-search"),
                    default="manifest", help="override the archival image search backend")
    ap.add_argument("--ltx-python", default=sys.executable,
                    help="Python executable with torch/diffusers for local LTX")
    return ap


def main(argv=None) -> int:
    args = parser().parse_args(argv)
    try:
        args.targets = load_targets(args)
        if args.out and len(args.targets) != 1:
            raise PipelineError("--out requires exactly one manifest")
        for target, source_override in args.targets:
            process(target, args, source_override)
    except PipelineError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
