"""Original, non-AI sonic branding for APUSH Remotion episodes.

Ported from federal-tax-update-2026/tools/podcast-pipeline/pipeline/audio_brand.py.
The format chooses the sonic family; the host persona chooses a restrained
accent variant. Audio is synthesized from simple tones at render time, so it
has no third-party licensing or provenance ambiguity.

This is the fallback when no --music-dir is given. When music assets are
provided (music/podcast-pack-v1/), those are used instead.
"""

BRAND_VERSION = 2

# APUSH uses narrative_explainer format
FORMAT_SONIC_PROFILES = {
    "narrative_explainer": {
        "family": "warm_explainer", "root_hz": 196.0,
        "intervals": (1.0, 1.2, 1.5), "pulse_ms": 900,
    },
    "expert_interview": {
        "family": "clean_exchange", "root_hz": 220.0,
        "intervals": (1.0, 1.25, 1.5), "pulse_ms": 720,
    },
}

# APUSH hosts: Maya (primary), Marcus (co-host), Jay (E6/E9)
PERSONA_ACCENTS = {
    "maya": {"variant": "warm_bright", "ratio": 2.0, "gain_db": -17},
    "marcus": {"variant": "precise", "ratio": 1.25, "gain_db": -19},
    "jay": {"variant": "clear_open", "ratio": 1.5, "gain_db": -18},
}


def identity(production_format="narrative_explainer", persona_id="maya"):
    format_profile = dict(FORMAT_SONIC_PROFILES.get(
        production_format, FORMAT_SONIC_PROFILES["narrative_explainer"]))
    accent = dict(PERSONA_ACCENTS.get(
        str(persona_id or "").lower(),
        {"variant": "network_default", "ratio": 1.5, "gain_db": -19}))
    format_profile["intervals"] = list(format_profile["intervals"])
    return {
        "brand_version": BRAND_VERSION,
        "family": format_profile.pop("family"),
        "persona_variant": accent.pop("variant"),
        "format_profile": format_profile,
        "persona_accent": accent,
        "source": "procedural_non_ai",
        "license": "original",
    }


def render_asset(asset_id, duration_ms, production_format="narrative_explainer",
                 persona_id="maya", out_path=None):
    """Render a brand asset to WAV file.
    
    asset_id: intro_sting, chapter_sting, outro_sting, bed_loop
    duration_ms: target duration in milliseconds
    out_path: where to write the WAV (required)
    """
    from pydub import AudioSegment
    from pydub.generators import Sine, Triangle, WhiteNoise

    if out_path is None:
        raise ValueError("out_path is required")

    sonic = identity(production_format, persona_id)
    profile = sonic["format_profile"]
    accent = sonic["persona_accent"]
    root = profile["root_hz"]
    duration_ms = max(250, int(duration_ms))
    canvas = AudioSegment.silent(duration=duration_ms, frame_rate=44100)

    def tone(freq, length, gain=-25, triangle=False):
        generator = Triangle(freq) if triangle else Sine(freq)
        return (generator.to_audio_segment(duration=max(80, int(length)))
                .apply_gain(gain).fade_in(35).fade_out(160))

    if asset_id in {"intro_sting", "outro_sting"}:
        # Theme: restrained repeating harmonic bed
        intervals = profile["intervals"]
        accent_interval = min(
            intervals, key=lambda value: abs(value - accent["ratio"]))
        motif = (intervals[0], intervals[1], accent_interval, intervals[-1])
        canvas = canvas.overlay(tone(root / 2, duration_ms, -40))
        pulse = max(480, int(profile.get("pulse_ms", 720)))
        position = 100
        step = 0
        while position < duration_ms:
            interval = motif[step % len(motif)]
            length = min(int(pulse * 0.9), duration_ms - position)
            if length > 80:
                canvas = canvas.overlay(
                    tone(root * interval, length, -31), position=position)
                canvas = canvas.overlay(
                    tone(root * interval * 2, min(length, 420),
                         accent["gain_db"] - 6, triangle=True),
                    position=position + 35)
            position += pulse
            step += 1
        result = canvas.fade_in(180).fade_out(min(700, duration_ms // 3))
    
    elif asset_id == "chapter_sting":
        # Transition: soft noise swell into low chord
        swell = (WhiteNoise().to_audio_segment(duration=duration_ms)
                 .low_pass_filter(1100).apply_gain(-37)
                 .fade_in(min(320, duration_ms // 2))
                 .fade_out(min(420, duration_ms // 2)))
        canvas = canvas.overlay(swell)
        for interval in profile["intervals"][:3]:
            canvas = canvas.overlay(
                tone((root / 2) * interval, duration_ms, -32), position=0)
        result = canvas.fade_in(120).fade_out(min(420, duration_ms // 2))
    
    elif asset_id == "bed_loop":
        # Warm neutral bed, very low, for under dialogue
        intervals = profile["intervals"]
        canvas = canvas.overlay(tone(root / 2, duration_ms, -42))
        for interval in intervals:
            canvas = canvas.overlay(
                tone(root * interval, duration_ms, -38), position=0)
        result = canvas.fade_in(500).fade_out(500)
    
    else:
        raise ValueError(f"Unknown asset_id: {asset_id}")

    result.export(out_path, format="wav")
    return out_path
