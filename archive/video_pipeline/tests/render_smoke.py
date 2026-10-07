"""Optional real MoviePy/ffmpeg smoke test (not part of unit discovery)."""
import sys
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "video"))

import motion


def main() -> None:
    motion.set_scale(0.2)
    with tempfile.TemporaryDirectory() as value:
        root = Path(value)
        audios = []
        scenes = []
        for index in range(2):
            audio = root / f"{index}.wav"
            with wave.open(str(audio), "wb") as handle:
                handle.setnchannels(1)
                handle.setsampwidth(2)
                handle.setframerate(24000)
                handle.writeframes(b"\0\0" * 12000)
            audios.append(str(audio))
            scenes.append(motion.title_card(
                f"SCENE {index + 1}", 0.5, "timing smoke test"))
        output = root / "smoke.mp4"
        try:
            motion.assemble(scenes, audios, str(output), fps=24,
                            transition=0.1)
            if output.stat().st_size < 1000:
                raise RuntimeError("smoke MP4 is suspiciously small")
            print(f"assembled MP4: {output.stat().st_size} bytes")
        finally:
            for scene in scenes:
                scene.close()


if __name__ == "__main__":
    main()
