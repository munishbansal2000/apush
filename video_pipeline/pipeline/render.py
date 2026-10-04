from __future__ import annotations

import gc
import subprocess
import sys
from pathlib import Path

from .common import PipelineError, atomic_json, read_json, resolve_local
from .tts import wav_duration
from .timing import resolve_scene_timing


def _motion(repo_root: Path, preview: bool):
    video_dir = repo_root / "video"
    sys.path.insert(0, str(video_dir))
    try:
        import motion
    except Exception as exc:
        raise PipelineError(f"cannot load reusable video/motion.py: {exc}") from exc
    motion.set_scale(2 / 3 if preview else 1.0)
    return motion


def build_clip(motion, scene: dict, duration: float, manifest_path: Path, repo_root: Path):
    animation = scene["animation"]
    visual = scene["visual"]
    kind = animation["type"]
    path = lambda key: str(resolve_local(visual[key], manifest_path.parent, repo_root)) if key in visual else None
    caption = animation.get("caption", "")
    if kind == "title":
        clip = motion.title_card(animation.get("title", scene["id"]), duration, animation.get("subtitle"), path("base_image"))
    elif kind == "ken_burns":
        clip = motion.caption_scene(path("base_image"), caption, duration, zoom=animation.get("zoom", 0.08), pan_x=animation.get("pan_x", 0.5), pan_y=animation.get("pan_y", 0.5))
    elif kind == "zoom":
        clip = motion.zoom_to(path("base_image"), duration, animation.get("cx", 0.5), animation.get("cy", 0.5), animation.get("end_zoom", 2.0), animation.get("zoom_duration", 1.4), caption, animation.get("highlight_box"))
    elif kind == "camera_path":
        clip = motion.camera_path(path("base_image"), duration, animation["waypoints"], caption)
    elif kind == "callout":
        clip = motion.callout_scene(path("base_image"), duration, animation["points"], caption)
    elif kind == "timeline":
        clip = motion.timeline_scene(animation["events"], duration, animation.get("title", ""), path("base_image"))
    elif kind == "bullets":
        clip = motion.bullet_slide(animation.get("title", ""), animation["bullets"], duration, animation.get("footer", ""), path("base_image"), stagger=animation.get("stagger", 0.45))
    elif kind == "objectives":
        # los falls back to the manifest's learning_objectives so the slide
        # always shows the lesson's declared objectives unless overridden.
        los = animation.get("los")
        if los is None:
            los = read_json(manifest_path).get("learning_objectives", [])
        clip = motion.objectives_slide(animation.get("title", "BY THE END OF THIS LESSON"), los, duration, animation.get("footer", ""), path("base_image"), stagger=animation.get("stagger", 0.45))
    elif kind == "typewriter":
        clip = motion.typewriter_scene(animation.get("text", scene["narration"]["text"]), duration, path("base_image"), sub=animation.get("subtitle"))
    elif kind == "map":
        clip = motion.map_scene(path("base_image"), duration, animation["moves"], animation.get("title", ""), caption)
    elif kind == "counter":
        clip = motion.counter_scene(animation["target"], duration, animation["label"], path("base_image"), animation.get("prefix", ""), animation.get("suffix", ""), animation.get("start", 0), animation.get("decimals", 0), animation.get("at", 0))
    elif kind == "versus":
        clip = motion.vs_scene(path("base_image"), path("secondary_image"), duration, animation["name_left"], animation["name_right"], animation.get("title", ""))
    elif kind == "wipe":
        clip = motion.wipe_scene(path("base_image"), path("secondary_image"), duration, animation.get("label_a", ""), animation.get("label_b", ""), animation.get("direction", "left"))
    elif kind == "ai_clip":
        clip = motion.ai_clip_scene(path("clip"), duration)
    elif kind == "parallax":
        layers = [{**layer, "image": str(resolve_local(layer["image"], manifest_path.parent, repo_root))}
                  for layer in visual["layers"]]
        clip = motion.parallax_scene(path("base_image"), layers, duration, caption,
                                     animation.get("background_drift", 0.03),
                                     animation.get("background_zoom", 0.05))
    elif kind == "source_analysis":
        clip = motion.source_analysis_scene(path("base_image"), duration,
                                            animation["highlights"],
                                            animation.get("title", ""))
    elif kind == "diagram":
        clip = motion.diagram_scene(path("base_image"), duration,
                                    animation["nodes"], animation["edges"],
                                    animation.get("title", ""))
    else:
        raise PipelineError(f"scene {scene['id']} still has unsupported animation type {kind}")
    if scene.get("device"):
        if hasattr(motion, "device_overlay"):
            clip = motion.device_overlay(
                clip, scene["device"], scene.get("device_params", {}), duration)
        else:
            # The device registry (schema) and cue timing are in place, but
            # the motion renderer does not implement device_overlay yet.
            # Degrade loudly instead of crashing: the scene renders without
            # its creative-device treatment until the implementation lands.
            print(f"[render] scene {scene['id']}: device "
                  f"'{scene['device']}' declared but motion.device_overlay "
                  f"is not implemented; rendering without it", flush=True)
    if scene.get("beats"):
        clip = motion.beat_overlay(clip, scene["beats"], duration)
    return clip


def _mixed_audio(scene: dict, narration: Path, duration: float,
                 manifest_path: Path, repo_root: Path, output: Path,
                 music: dict | None = None, music_offset: float = 0,
                 is_first: bool = False, is_last: bool = False,
                 chapter_change: bool = False) -> Path:
    """Mix narration, music, ambience, foley, and effects with ffmpeg."""
    spec = scene.get("audio") or {}
    music = music or {}
    if not spec and not music:
        return narration
    command = ["ffmpeg", "-y", "-v", "error", "-i", str(narration)]
    has_bed = bool(music.get("background"))
    duck = music.get("ducking", {}) or {}
    duck_enabled = has_bed and duck.get("enabled", True)
    filters = (["[0:a]volume=1,asplit=2[narration][duckkey]"]
               if duck_enabled else ["[0:a]volume=1[narration]"])
    inputs = ["[narration]"]
    input_index = 1

    if has_bed:
        bed_path = resolve_local(music["background"], manifest_path.parent, repo_root)
        command += ["-stream_loop", "-1", "-ss", f"{music_offset:.3f}",
                    "-i", str(bed_path)]
        volume = float(music.get("background_volume", 0.12))
        chain = (f"[{input_index}:a]atrim=0:{duration:.3f},asetpts=N/SR/TB,"
                 f"volume={volume}")
        if is_first and float(music.get("fade_in_sec", 1.0)) > 0:
            fade = min(float(music.get("fade_in_sec", 1.0)), duration / 2)
            chain += f",afade=t=in:st=0:d={fade:.3f}"
        if is_last and float(music.get("fade_out_sec", 1.5)) > 0:
            fade = min(float(music.get("fade_out_sec", 1.5)), duration / 2)
            chain += f",afade=t=out:st={duration-fade:.3f}:d={fade:.3f}"
        if duck_enabled:
            filters.append(chain + "[musicraw]")
            filters.append(
                "[musicraw][duckkey]sidechaincompress="
                f"threshold={float(duck.get('threshold', 0.03))}:"
                f"ratio={float(duck.get('ratio', 8))}:"
                f"attack={float(duck.get('attack_ms', 20))}:"
                f"release={float(duck.get('release_ms', 350))}[musicbed]")
        else:
            filters.append(chain + "[musicbed]")
        inputs.append("[musicbed]")
        input_index += 1

    def add_cue(field: str, label: str, volume_field: str,
                duration_field: str, start: float = 0) -> None:
        nonlocal input_index
        if not music.get(field):
            return
        cue_path = resolve_local(music[field], manifest_path.parent, repo_root)
        default_duration = {"intro_duration_sec": 3.0,
                            "outro_duration_sec": 4.0,
                            "chapter_change_duration_sec": 1.5}[duration_field]
        cue_duration = min(duration - start,
                           float(music.get(duration_field, default_duration)))
        if cue_duration <= 0:
            return
        command.extend(["-i", str(cue_path)])
        volume = float(music.get(volume_field, 0.3))
        fade = min(0.35, cue_duration / 3)
        chain = (f"[{input_index}:a]atrim=0:{cue_duration:.3f},asetpts=N/SR/TB,"
                 f"volume={volume},afade=t=out:st={cue_duration-fade:.3f}:d={fade:.3f}")
        if start > 0:
            delay = int(start * 1000)
            chain += f",adelay={delay}|{delay}"
        filters.append(chain + f"[{label}]")
        inputs.append(f"[{label}]")
        input_index += 1

    if is_first:
        add_cue("intro", "musicintro", "intro_volume", "intro_duration_sec")
    if chapter_change:
        add_cue("chapter_change", "chaptercue", "chapter_change_volume",
                "chapter_change_duration_sec")
    if is_last:
        outro_duration = min(duration, float(music.get("outro_duration_sec", 4.0)))
        add_cue("outro", "musicoutro", "outro_volume", "outro_duration_sec",
                max(0, duration - outro_duration))
    ambience = spec.get("ambience")
    if ambience:
        ambience_path = resolve_local(ambience, manifest_path.parent, repo_root)
        command += ["-stream_loop", "-1", "-i", str(ambience_path)]
        volume = float(spec.get("ambience_volume", 0.12))
        filters.append(f"[{input_index}:a]atrim=0:{duration:.3f},volume={volume}[ambience]")
        inputs.append("[ambience]")
        input_index += 1
    foley_sources = {
        "paper_rustle": "anoisesrc=color=pink:amplitude=0.18:sample_rate=48000",
        "quill_scratch": "anoisesrc=color=white:amplitude=0.10:sample_rate=48000",
    }
    foley = spec.get("foley")
    if foley:
        command += ["-f", "lavfi", "-i", foley_sources[foley]]
        gain = float(spec.get("foley_gain", 0.12))
        fade = min(float(spec.get("foley_fade_sec", 0.5)), duration / 2)
        tone = ("highpass=f=250,lowpass=f=3600" if foley == "paper_rustle"
                else "highpass=f=1700,lowpass=f=6800,tremolo=f=7:d=0.35")
        fade_out = max(0.0, duration - fade)
        filters.append(
            f"[{input_index}:a]atrim=0:{duration:.3f},{tone},volume={gain},"
            f"afade=t=in:st=0:d={fade:.3f},"
            f"afade=t=out:st={fade_out:.3f}:d={fade:.3f}[foley]")
        inputs.append("[foley]")
        input_index += 1
    sound_sources = {
        "impact": "sine=frequency=85:duration=0.24:sample_rate=48000",
        "tick": "sine=frequency=1100:duration=0.07:sample_rate=48000",
        "chime": "sine=frequency=660:duration=0.42:sample_rate=48000",
        "whoosh": "anoisesrc=color=pink:duration=0.38:amplitude=0.18:sample_rate=48000",
        "page_turn": "anoisesrc=color=white:duration=0.20:amplitude=0.10:sample_rate=48000",
        # Typewriter key strike: sharp noise attack + decaying 2.6kHz metallic
        # ping. Use for stamped/typed labels (e.g. DAY ONE / DAY THREE / DAY FIVE).
        "typewriter": ("anoisesrc=color=white:duration=0.11:amplitude=0.5:sample_rate=48000[n];"
                       "aevalsrc=0.55*sin(2*PI*2600*t)*exp(-50*t):s=48000:d=0.11[p];"
                       "[n][p]amix=inputs=2:duration=shortest:normalize=0,"
                       "highpass=f=900,lowpass=f=10000")
    }
    for effect_index, effect in enumerate(spec.get("effects", [])):
        if effect.get("file"):
            effect_path = resolve_local(effect["file"], manifest_path.parent, repo_root)
            command += ["-i", str(effect_path)]
        else:
            command += ["-f", "lavfi", "-i", sound_sources[effect["kind"]]]
        delay = int(float(effect["at"]) * 1000)
        volume = float(effect.get("volume", 0.35))
        label = f"effect{effect_index}"
        filters.append(f"[{input_index}:a]adelay={delay}|{delay},volume={volume}[{label}]")
        inputs.append(f"[{label}]")
        input_index += 1
    filters.append("".join(inputs) + f"amix=inputs={len(inputs)}:duration=first:normalize=0[mix]")
    output.parent.mkdir(parents=True, exist_ok=True)
    command += ["-filter_complex", ";".join(filters), "-map", "[mix]", "-t", f"{duration:.3f}",
                "-ar", "48000", "-ac", "2", str(output)]
    try:
        subprocess.run(command, check=True)
    except (OSError, subprocess.CalledProcessError) as exc:
        raise PipelineError(f"audio design failed for {scene['id']}: {exc}") from exc
    return output


def render_video(manifest: dict, manifest_path: Path, repo_root: Path, audio_dir: Path, output: Path, preview: bool = False) -> None:
    durations, alignments = {}, {}
    for scene in manifest["scenes"]:
        audio = audio_dir / f"{scene['id']}.wav"
        if not audio.is_file():
            raise PipelineError(f"missing rendered audio: {audio}")
        durations[scene["id"]] = wav_duration(audio)
        meta_path = audio.with_suffix(".json")
        if meta_path.is_file():
            alignments[scene["id"]] = read_json(meta_path).get(
                "word_boundaries", [])
    from .layout import validate_text_layout
    actual_layout = validate_text_layout(
        manifest, manifest_path, repo_root, durations=durations,
        alignments=alignments)
    atomic_json(audio_dir.parent / "layout_report.actual.json", actual_layout)
    print(f"[rendered] actual-TTS layout: {actual_layout['text_element_count']} elements, no conflicts")
    motion = _motion(repo_root, preview)
    scenes, audios, transitions = [], [], []
    try:
        output.parent.mkdir(parents=True, exist_ok=True)
        scene_dir = audio_dir.parent / "rendered-scenes"
        scene_dir.mkdir(parents=True, exist_ok=True)
        video = manifest.get("video", {})
        fps = int(video.get("fps", 30))

        # Build and encode one native scene at a time. Keeping every PIL/numpy
        # source and CompositeVideoClip alive until the final encode can consume
        # several GB even for a 720x1280 preview. The small, high-quality scene
        # intermediates are cheap to decode and give the final compositor a
        # stable, bounded memory footprint.
        from moviepy import VideoFileClip
        music = manifest.get("music", {}) or {}
        chapter_scenes = set(music.get("chapter_change_scene_ids", []))
        music_offset = 0.0
        for index, scene in enumerate(manifest["scenes"]):
            audio = audio_dir / f"{scene['id']}.wav"
            if not audio.is_file():
                raise PipelineError(f"missing rendered audio: {audio}")
            duration = durations[scene["id"]]
            timed_scene = resolve_scene_timing(
                scene, duration, alignments.get(scene["id"]))
            native = build_clip(motion, timed_scene, duration, manifest_path, repo_root)
            scene_path = scene_dir / f"{index:03d}-{scene['id']}.mp4"
            try:
                native.write_videofile(
                    str(scene_path), fps=fps, codec="libx264", audio=False,
                    preset="veryfast", threads=1, logger=None,
                    ffmpeg_params=["-crf", "15", "-pix_fmt", "yuv420p"])
            finally:
                native.close()
            gc.collect()
            scenes.append(VideoFileClip(str(scene_path), audio=False))
            mixed = _mixed_audio(timed_scene, audio, duration, manifest_path, repo_root,
                                 audio_dir.parent / "mixed-audio" / f"{scene['id']}.wav",
                                 music=music, music_offset=music_offset,
                                 is_first=index == 0,
                                 is_last=index == len(manifest["scenes"]) - 1,
                                 chapter_change=scene["id"] in chapter_scenes)
            audios.append(str(mixed))
            transitions.append(scene.get("transition", {"type": "crossfade", "duration": 0.2}))
            music_offset += max(0, duration - float(video.get("transition_seconds", 0.2)))
            print(f"[rendered] staged {scene['id']} ({duration:.2f}s)", flush=True)

        motion.assemble(scenes, audios, str(output),
                        fps=fps,
                        transition=float(video.get("transition_seconds", 0.2)),
                        transitions=transitions)
    except PipelineError:
        raise
    except Exception as exc:
        raise PipelineError(f"video render failed: {type(exc).__name__}: {exc}") from exc
    finally:
        for clip in scenes:
            close = getattr(clip, "close", None)
            if close:
                close()
