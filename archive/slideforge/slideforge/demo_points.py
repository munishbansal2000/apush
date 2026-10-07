"""Short showcase of the point-based slides. Run: python -m slideforge.demo_points"""

from .timeline import Config, Movie
from .slides import BulletSlide, StepsSlide


def main():
    cfg = Config(w=1280, h=720, fps=30)
    m = Movie(cfg, progress_bar=True)

    m.add(BulletSlide(
        "Why it works",
        ["Every point reveals on its own beat — no wall of text",
         "Accent markers keep the eye anchored while reading",
         "Timing auto-fits the number of points you pass in",
         "Drop it on any background: gradient, solid, or image"],
    ), transition="cut", trans_dur=0)

    m.add(StepsSlide(
        "Three steps to a video",
        [("Write the script", "One slide per idea — the library handles the rest"),
         ("Pick the camera moves", "Zoom and pan to whatever deserves attention"),
         ("Render", "A single call pipes every frame through ffmpeg")],
    ), transition="crossfade", trans_dur=0.6)

    print(f"total duration: {m.total_duration():.1f}s")
    m.render("demo_points.mp4", crf=20, preset="medium")


if __name__ == "__main__":
    main()
