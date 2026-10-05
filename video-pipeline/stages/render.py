"""Stage: render.

Renders one cached segment per beat into <episode>/work/segs/<bid>.mp4.
Segment cache: a beat is skipped when its output exists and is valid
(non-zero, ffprobe-readable). Delete the file to force re-render.

Beat kinds:
  kb    Ken Burns over an image (zin/zout/panl/panr), text locked for pans.
  vid   Plays a pre-rendered mp4 (map animations, zooms). Optional "gen"
        command builds it first when missing, so it stays reproducible.
  chain Animated node chain; node reveals come from word-level alignment
        (work/chain-word-times.json) when available, else even spacing.

Clip pickup (Munish renders LTX clips on Windows): when a beat carries
"anim_prompt" and <episode>/clips/<bid>.mp4 exists with a matching duration
(+/-1s), the clip is used instead of the Ken Burns render.
"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from shared.html import kb_html

FPS = 30
W, H = 1920, 1080

CHROME_CANDIDATES = [
    os.path.expanduser("~/.cache/puppeteer/chrome-headless-shell/linux-153.0.8010.36/"
                       "chrome-headless-shell-linux64/chrome-headless-shell"),
]


def sh(cmd, timeout=1200):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"FAILED {' '.join(cmd[:4])}: {r.stderr[-600:]}")


def find_chrome():
    env = os.environ.get("CHROME_HEADLESS_SHELL")
    if env and os.path.exists(env):
        return env
    for p in CHROME_CANDIDATES:
        if os.path.exists(p):
            return p
    raise RuntimeError(
        "chrome-headless-shell not found; set CHROME_HEADLESS_SHELL env var "
        "to its full path, or add the path to CHROME_CANDIDATES")


def valid_mp4(p):
    if not os.path.exists(p) or os.path.getsize(p) == 0:
        return False
    try:
        d = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries",
                                     "format=duration", "-of", "csv=p=0", p],
                                    text=True, timeout=60)
        return float(d.strip()) > 0
    except Exception:
        return False


def screenshot(html_path, png_path, transparent=False):
    chrome = find_chrome()
    cmd = [chrome, "--headless", "--disable-gpu", "--no-sandbox"]
    if transparent:
        cmd.append("--default-background-color=00000000")
    cmd += ["--window-size=1920,1080", "--hide-scrollbars",
            f"--screenshot={png_path}", f"file://{html_path}"]
    sh(cmd, timeout=300)


def scaled_image(ep_dir, img_path, max_w=2560):
    """Pre-scale huge source images once (cached). Per-frame scale of a 33MP
    photo is what makes pan renders take minutes."""
    work = os.path.join(ep_dir, "work", "scaled")
    os.makedirs(work, exist_ok=True)
    base = os.path.basename(img_path)
    dst = os.path.join(work, base)
    if os.path.exists(dst):
        return dst
    try:
        from PIL import Image
        im = Image.open(img_path)
        if im.width > max_w:
            im = im.resize((max_w, int(im.height * max_w / im.width)), Image.LANCZOS)
            im.save(dst)
            print(f"  pre-scaled {base} {im.width}x{im.height}", flush=True)
            return dst
    except Exception as e:
        print(f"  pre-scale failed for {base}: {e}", flush=True)
    return img_path


def render_kb(ep_dir, beat, meta, images, force=False):
    bid = beat["id"]
    dur = beat["dur"]
    frames = int(round(dur * FPS))
    work = os.path.join(ep_dir, "work")
    shots = os.path.join(work, "shots")
    segs = os.path.join(work, "segs")
    os.makedirs(shots, exist_ok=True)
    os.makedirs(segs, exist_ok=True)
    sp = os.path.join(segs, f"{bid}.mp4")
    if valid_mp4(sp) and not force:
        return sp

    # Windows-rendered clip wins when present and duration matches.
    clip = os.path.join(ep_dir, "clips", f"{bid}.mp4")
    if beat.get("anim_prompt") and valid_mp4(clip):
        cd = float(subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", clip], text=True).strip())
        if abs(cd - dur) <= 1.0:
            sh(["ffmpeg", "-v", "error", "-y", "-i", clip,
                "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,"
                       f"crop={W}:{H},fps={FPS}",
                "-frames:v", str(frames), "-c:v", "libx264",
                "-pix_fmt", "yuv420p", "-preset", "medium", sp])
            print(f"  {bid}: used Windows clip", flush=True)
            return sp
        print(f"  {bid}: clip duration {cd:.1f}s != beat {dur:.1f}s, Ken Burns fallback",
              flush=True)

    img_key = beat["image"]
    img_path = images[img_key]["file"]
    if not os.path.isabs(img_path):
        img_path = os.path.join(ep_dir, img_path)
    img_path = scaled_image(ep_dir, img_path)
    motion = beat.get("motion", "zin")
    inner = beat.get("html", "")
    caption = beat.get("caption")
    pan = motion in ("panl", "panr")

    hp = os.path.join(shots, f"{bid}.html")
    ip = os.path.join(shots, f"{bid}.png")
    # image path relative to the shots dir for the file:// page
    webp_rel = os.path.relpath(img_path, shots)
    with open(hp, "w", encoding="utf-8") as f:
        f.write(kb_html(webp_rel, inner, caption,
                         transparent=pan, meta=meta))
    screenshot(hp, ip, transparent=pan)

    if pan:
        # Pan the IMAGE, keep text locked: transparent text overlay composited
        # over a separately panning background. Text never clips.
        bg = os.path.join(segs, f"{bid}_bg.mp4")
        xexpr = f"384*n/{frames}" if motion == "panr" else f"384*(1-n/{frames})"
        sh(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", str(FPS),
            "-i", img_path,
            "-vf", f"scale=2304:1296,crop={W}:{H}:x='{xexpr}':y=108",
            "-frames:v", str(frames), "-c:v", "libx264",
            "-pix_fmt", "yuv420p", "-preset", "medium", bg])
        sh(["ffmpeg", "-v", "error", "-y", "-i", bg, "-i", ip,
            "-filter_complex", "[0:v][1:v]overlay=0:0",
            "-frames:v", str(frames), "-c:v", "libx264",
            "-pix_fmt", "yuv420p", "-preset", "medium", sp])
        try:
            os.remove(bg)
        except FileNotFoundError:
            pass
        return sp

    if motion == "zin":
        vf = (f"scale={W}:{H},zoompan=z='1+0.00012*on':d={frames}:"
              f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS}")
    else:  # zout
        vf = (f"scale=2112:1188,zoompan=z='max(1.0,1.1-0.00012*on)':d={frames}:"
              f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS}")
    sh(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", str(FPS),
        "-i", ip, "-vf", vf, "-frames:v", str(frames), "-c:v", "libx264",
        "-pix_fmt", "yuv420p", "-preset", "medium", sp])
    return sp


def render_vid(ep_dir, beat, force=False):
    bid = beat["id"]
    dur = beat["dur"]
    frames = int(round(dur * FPS))
    segs = os.path.join(ep_dir, "work", "segs")
    os.makedirs(segs, exist_ok=True)
    sp = os.path.join(segs, f"{bid}.mp4")
    if valid_mp4(sp) and not force:
        return sp
    src = beat["src"]
    if not os.path.isabs(src):
        src = os.path.join(ep_dir, src)
    if not valid_mp4(src) and beat.get("gen"):
        print(f"  {bid}: building {src} via gen command", flush=True)
        sh(beat["gen"], timeout=1800)
    if not valid_mp4(src):
        raise RuntimeError(f"beat {bid}: vid src missing/invalid: {src}")
    # normalize to exact duration/fps so concat stays seamless
    sh(["ffmpeg", "-v", "error", "-y", "-i", src,
        "-vf", f"scale={W}:{H},fps={FPS}",
        "-frames:v", str(frames), "-c:v", "libx264",
        "-pix_fmt", "yuv420p", "-preset", "medium", sp])
    return sp


def render_chain(ep_dir, beat, force=False):
    """Animated node chain. Reveals are word-aligned when
    work/chain-word-times.json exists, else evenly spaced (deterministic)."""
    bid = beat["id"]
    dur = beat["dur"]
    start_s = beat["start_s"]
    segs = os.path.join(ep_dir, "work", "segs")
    os.makedirs(segs, exist_ok=True)
    dst = os.path.join(segs, f"{bid}.mp4")
    if valid_mp4(dst) and not force:
        return dst

    nodes = beat["nodes"]
    words = beat.get("words", [])
    reveals = None
    wt = None
    for cand in (os.path.join(ep_dir, "work", f"word-times-{bid}.json"),
                 os.path.join(ep_dir, "work", "chain-word-times.json")):
        if os.path.exists(cand):
            with open(cand, encoding="utf-8") as f:
                wt = json.load(f)
            break
    if words and wt is not None:
        by_word = {}
        entries = wt if isinstance(wt, list) else wt.get("entries") or wt.get("words", [])
        for e in entries:
            by_word.setdefault(e["word"].lower(), e["t_start"])
        rs = []
        for w in words:
            if w.lower() in by_word:
                rs.append(by_word[w.lower()] - start_s)
        if len(rs) == len(words):
            reveals = [max(0.3, min(r, dur - 0.5)) for r in rs]
            print(f"  {bid}: word-aligned reveals "
                  f"{[round(r,2) for r in reveals]}", flush=True)
    if reveals is None:
        q = dur / len(nodes)
        reveals = [q * 0.5 + q * i for i in range(len(nodes))]
        print(f"  {bid}: even-spacing fallback reveals "
              f"{[round(r,2) for r in reveals]}", flush=True)

    bg_key = beat.get("bg_image", "hero")
    with open(os.path.join(ep_dir, "images.json"), encoding="utf-8") as f:
        images = json.load(f)["images"]
    bg_path = images[bg_key]["file"]
    if not os.path.isabs(bg_path):
        bg_path = os.path.join(ep_dir, bg_path)
    meta_kicker = beat.get("kicker", "")
    caption = beat.get("chain_caption", "")
    with open(os.path.join(ep_dir, "work", "beats_resolved.json"), encoding="utf-8") as f:
        bmeta = json.load(f)["meta"]
    me = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chain_anim.py")
    built = os.path.join(segs, "chain_anim.mp4")
    sh([sys.executable, me, built,
        bg_path, f"{dur:.3f}",
        json.dumps(nodes), json.dumps([round(r, 3) for r in reveals]),
        meta_kicker, caption, bmeta.get("subject", ""), bmeta.get("tag", "")],
       timeout=1200)
    if not valid_mp4(built):
        raise RuntimeError(f"beat {bid}: chain_anim.py did not produce {built}")
    sh(["ffmpeg", "-v", "error", "-y", "-i", built, "-c", "copy", dst])
    return dst


def run(ep_dir, cfg, force=False):
    with open(os.path.join(ep_dir, "work", "beats_resolved.json"), encoding="utf-8") as f:
        data = json.load(f)
    beats = data["beats"]
    meta = data["meta"]
    with open(os.path.join(ep_dir, "images.json"), encoding="utf-8") as f:
        images = json.load(f)["images"]
    paths = []
    for b in beats:
        kind = b["kind"]
        if kind == "kb":
            sp = render_kb(ep_dir, b, meta, images, force)
        elif kind == "vid":
            sp = render_vid(ep_dir, b, force)
        elif kind == "chain":
            sp = render_chain(ep_dir, b, force)
        else:
            raise RuntimeError(f"unknown kind {kind}")
        paths.append(sp)
        print(f"beat {b['id']} {b['dur']:.1f}s", flush=True)
    return paths
