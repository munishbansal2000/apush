#!/usr/bin/env python3
"""LTX clips: generate-once, reuse-forever ambient clips for vidslide scenes.

Talks to the local LTX Desktop backend (FastAPI on 127.0.0.1:41954) --
the same weights the desktop app serves, driven headlessly. Raw diffusers
loading does NOT work with these files (raw safetensors, no config).

Every job is fingerprinted (anim prompt + base still sha1 + params):
an unchanged job is never re-rendered, a changed job gets a new file,
and the old master stays on disk for other tries. Generation output
(raw masters ``clips/<id>-<fp12>.mp4`` + ``ltx_manifest.json``) is the
input to the ``clips`` pipeline stage, which conforms masters to exact
scene lengths (``clips/<id>.mp4``, the plan-facing name).

Usage:
  python ltx_clips.py <episode> [--dry-run]   # e.g. u1-e2
"""
import hashlib
import io
import json
import os
import shutil
import sys
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = "http://127.0.0.1:41954"
# NOTE: NOT "manifest.json" -- legacy beats clips use clips/MANIFEST.json,
# which is the same file on case-insensitive Windows. Separate name,
# separate format, no clobbering.
MANIFEST = "ltx_manifest.json"
SPECS_TTL = 86400

DEFAULTS = {"model": "fast", "resolution": "1080p", "duration": 5,
            "fps": 24, "seed": 42, "cameraMotion": "none",
            "negative": ("text, watermark, letters, numbers, people, "
                         "faces, modern ships, modern buildings, "
                         "warping, morphing")}


def sha1_file(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def fingerprint(prompt, base_sha1, params):
    canon = json.dumps({"p": prompt, "b": base_sha1, "g": params},
                       sort_keys=True)
    return hashlib.sha1(canon.encode()).hexdigest()[:12]


def jobs_for_plan(plan_path, ep_dir):
    """[(scene_id, prompt, fingerprint, base_rel, params)] for vidslide
    scenes carrying anim_prompt. base_rel may be None (pure atmosphere)."""
    with io.open(plan_path, encoding="utf-8") as f:
        plan = json.load(f)
    jobs = []
    for s in plan.get("scenes", []):
        if s.get("slide") != "vidslide" or not s.get("anim_prompt"):
            continue
        params = dict(DEFAULTS)
        params.update(s.get("ltx") or {})
        base_rel = s.get("base_image")
        base_sha1 = sha1_file(os.path.join(ep_dir, base_rel)) \
            if base_rel else None
        fp = fingerprint(s["anim_prompt"], base_sha1, params)
        jobs.append((s["id"], s["anim_prompt"], fp, base_rel, params))
    return jobs


# Back-compat alias (v1 name).
clip_jobs = jobs_for_plan


def read_manifest(clips_dir):
    path = os.path.join(clips_dir, MANIFEST)
    if not os.path.isfile(path):
        return {"version": 1, "clips": {}}
    with io.open(path, encoding="utf-8") as f:
        return json.load(f)


def write_manifest(clips_dir, manifest):
    with io.open(os.path.join(clips_dir, MANIFEST), "w",
                 encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)


def auth_token():
    """Live backend token, discovered per call (restart-safe).

    The backend mints LTX_AUTH_TOKEN per launch, so this is never
    cached: every clips run re-discovers from the running process.
    """
    import ltx_auth
    return ltx_auth.discover_token()


def _post(req, token, timeout=1800):
    data = json.dumps(req).encode()
    r = urllib.request.Request(
        BASE + "/api/generate", data=data,
        headers={"Content-Type": "application/json",
                 "Authorization": "Bearer " + token})
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def note_conformed(clips_dir, sid, fp, frames, out):
    """Record which master a plan-facing conformed clip was built from."""
    man = read_manifest(clips_dir)
    rec = man.setdefault("clips", {}).setdefault(sid, {})
    rec["conformed"] = {"from_fp": fp, "frames": frames,
                        "file": os.path.relpath(out, clips_dir)}
    write_manifest(clips_dir, man)


def conformed_fresh(clips_dir, sid, fp, frames):
    """True only when clips/<sid>.mp4 exists AND was conformed from the
    current master fp at the current frame count. A new master or a
    changed scene duration both force re-conform."""
    man = read_manifest(clips_dir)
    rec = man.get("clips", {}).get(sid, {})
    conf = rec.get("conformed") or {}
    out = os.path.join(clips_dir, "%s.mp4" % sid)
    return bool(os.path.isfile(out) and rec.get("fingerprint") == fp and
                conf.get("from_fp") == fp and
                conf.get("frames") == frames)


def master_path(clips_dir, sid, fp):
    return os.path.join(clips_dir, "%s-%s.mp4" % (sid, fp))


def master_fresh(clips_dir, sid, fp):
    man = read_manifest(clips_dir)
    rec = man.get("clips", {}).get(sid)
    return bool(rec and rec.get("fingerprint") == fp and
                os.path.isfile(master_path(clips_dir, sid, fp)))


def render_master(ep_dir, sid, prompt, fp, base_rel, params, token,
                  _post=_post):
    """Generate one raw master (or reuse). Returns the master path."""
    clips_dir = os.path.join(ep_dir, "clips")
    os.makedirs(clips_dir, exist_ok=True)
    out = master_path(clips_dir, sid, fp)
    base_sha1 = None
    if base_rel:
        base_sha1 = sha1_file(os.path.join(ep_dir, base_rel))
    if master_fresh(clips_dir, sid, fp):
        print("reuse %s-%s.mp4" % (sid, fp), flush=True)
        return out
    req = {"prompt": prompt, "resolution": params["resolution"],
           "model": params["model"], "duration": params["duration"],
           "fps": params["fps"], "seed": params.get("seed", 42),
           "cameraMotion": params.get("cameraMotion", "none"),
           "negativePrompt": params.get("negative", "")}
    if base_rel:
        req["imagePath"] = os.path.abspath(os.path.join(ep_dir, base_rel))
    print("render %s: %s-%s.mp4 (%s/%ss) ..." %
          (sid, sid, fp, params["resolution"], params["duration"]),
          flush=True)
    import time
    t0 = time.time()
    res = _post(req, token)
    src = res.get("video_path")
    if not src or not os.path.isfile(src):
        raise RuntimeError("LTX backend returned no video: %r" % (res,))
    shutil.copyfile(src, out)
    man = read_manifest(clips_dir)
    man.setdefault("clips", {})[sid] = {
        "file": "clips/%s-%s.mp4" % (sid, fp), "fingerprint": fp,
        "anim_prompt": prompt, "base_image": base_rel,
        "base_sha1": base_sha1, "params": params,
        "seconds": round(time.time() - t0, 1),
        "backend": "ltx-desktop-local"}
    write_manifest(clips_dir, man)
    print("saved %s-%s.mp4 (%d KB)" %
          (sid, fp, os.path.getsize(out) // 1024), flush=True)
    return out


def render_ep_dir(ep_dir, _post=_post):
    """Render (or reuse) all masters for an episode dir. Scene-length
    conforming is the clips stage's job (it owns plan durations)."""
    plan_path = os.path.join(ep_dir, "work", "scene_plan.json")
    if not os.path.isfile(plan_path):
        plan_path = os.path.join(ep_dir, "scene_plan.json")
    jobs = jobs_for_plan(plan_path, ep_dir)
    if not jobs:
        print("no vidslide+anim_prompt jobs", flush=True)
        return {}
    token = auth_token()
    return {sid: render_master(ep_dir, sid, prompt, fp, base_rel,
                               params, token, _post=_post)
            for sid, prompt, fp, base_rel, params in jobs}


def render(episode, _post=_post):
    return render_ep_dir(os.path.join(ROOT, "episodes", episode),
                         _post=_post)


def main(argv):
    if len(argv) < 2 or argv[1] in ("-h", "--help"):
        print(__doc__.splitlines()[-2].strip())
        return 0
    ep_dir = os.path.join(ROOT, "episodes", argv[1])
    plan_path = os.path.join(ep_dir, "work", "scene_plan.json")
    if not os.path.isfile(plan_path):
        plan_path = os.path.join(ep_dir, "scene_plan.json")
    jobs = jobs_for_plan(plan_path, ep_dir)
    if "--dry-run" in argv:
        for sid, _p, fp, _b, params in jobs:
            print("would render %s: %s-%s.mp4 (%s/%ss)" %
                  (sid, sid, fp, params["resolution"],
                   params["duration"]))
        return 0
    render_ep_dir(ep_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
