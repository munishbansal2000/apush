#!/usr/bin/env python3
"""Simple rendering app for the APUSH grading videos.

Run:  pip install flask pillow
      python app.py
Then open http://localhost:5000

Lists every video (built-ins + manifests/*.json), shows narration-audio
status, renders on demand with a progress bar, and serves the finished MP4
for preview/download. Rendered files go to video/output/ (gitignored).
"""
import json
import os
import re
import shutil
import subprocess
import threading
import time
import uuid

from flask import Flask, jsonify, request, send_from_directory

HERE = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(HERE, "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = Flask(__name__)
jobs = {}


def load_videos():
    sys_path = __import__("sys")
    sys_path.path.insert(0, HERE)
    import build_video
    import importlib as _il
    _il.reload(build_video)
    videos = []
    for name, (mod_name, stage_dir, plan) in sorted(build_video.VIDEOS.items()):
        audio_dir = os.path.join(HERE, "audio", name)
        need, have = [], 0
        for _stage, spec in plan:
            mp3 = spec["mp3"] if isinstance(spec, dict) else spec
            need.append(mp3)
        for mp3 in dict.fromkeys(need):
            if os.path.exists(os.path.join(audio_dir, mp3)):
                have += 1
        stages = sorted({s for s, _ in plan})
        out_name = build_video.DEFAULT_OUT.get(name, f"{name}.mp4")
        out_path = os.path.join(OUTPUT_DIR, out_name)
        title = _title_from_slug(out_name)
        videos.append({
            "name": name, "title": title, "stages": len(stages),
            "audio_have": have, "audio_need": len(set(need)),
            "rendered": os.path.exists(out_path),
            "rendered_size": os.path.getsize(out_path) if os.path.exists(out_path) else 0,
            "out": out_name,
        })
    return videos


def _title_from_slug(slug):
    m = re.match(r"(\d{4})-(dbq|leq\d?|saq\d?)-(\d)of(\d)-graded\.mp4", slug)
    if m:
        year, typ, score, top = m.groups()
        return f"{year} {typ.upper()} · graded {score}/{top}"
    m = re.match(r"dbq-graded-(4of7|7of7|2025)\.mp4", slug)
    if m:
        return {"4of7": "DBQ walkthrough · 4/7", "7of7": "DBQ walkthrough · 7/7",
                "2025": "2025 DBQ · graded 5/7"}[m.group(1)]
    if slug == "leq-graded-2025.mp4":
        return "2025 LEQ2 · graded 4/6"
    if slug == "saq-graded-2025.mp4":
        return "2025 SAQ2 · graded 2/3"
    return slug


def read_script(name):
    sys_path = __import__("sys")
    sys_path.path.insert(0, HERE)
    import build_video
    import importlib as _il
    _il.reload(build_video)
    _mod, _dir, plan = build_video.VIDEOS[name]
    script_dir = os.path.join(HERE, "scripts", name)
    parts = []
    for stage, _spec in plan:
        p = os.path.join(script_dir, f"{stage}.txt")
        text = open(p).read().strip() if os.path.exists(p) else "(no script)"
        parts.append({"stage": stage, "text": text})
    return parts


def run_render(job_id, name):
    job = jobs[job_id]
    job["log"] = []
    try:
        out_name = next(v["out"] for v in load_videos() if v["name"] == name)
    except StopIteration:
        job.update(state="error", log=["unknown video"])
        return
    out_path = os.path.join(OUTPUT_DIR, out_name)
    cmd = [__import__("sys").executable, "-u", os.path.join(HERE, "build_video.py"), name,
           "--out", out_path]
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                text=True, cwd=HERE, bufsize=1)
        step_re = re.compile(r"\[(\d)/4\]")
        for line in proc.stdout:
            job["log"].append(line.rstrip())
            job["log"] = job["log"][-40:]
            m = step_re.search(line)
            if m:
                job["progress"] = {1: 15, 2: 35, 3: 75, 4: 95}[int(m.group(1))]
            if line.startswith("done:"):
                job["progress"] = 100
        proc.wait()
    except Exception as e:  # never die silently; the UI polls this
        job.update(state="error", log=job["log"] + [f"render failed: {e}"])
        return
    if proc.returncode == 0 and os.path.exists(out_path):
        job.update(state="done", progress=100, out=out_name)
    else:
        job.update(state="error")


@app.route("/")
def index():
    return INDEX_HTML


@app.route("/api/videos")
def api_videos():
    return jsonify(load_videos())


@app.route("/api/script/<name>")
def api_script(name):
    try:
        return jsonify(read_script(name))
    except KeyError:
        return jsonify({"error": "unknown video"}), 404


@app.route("/api/render/<name>", methods=["POST"])
def api_render(name):
    job_id = uuid.uuid4().hex[:8]
    jobs[job_id] = {"state": "running", "progress": 5, "log": [], "out": None,
                    "started": time.time()}
    threading.Thread(target=run_render, args=(job_id, name), daemon=True).start()
    return jsonify({"job": job_id})


@app.route("/api/job/<job_id>")
def api_job(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "unknown job"}), 404
    return jsonify(job)


@app.route("/output/<path:fname>")
def serve_output(fname):
    return send_from_directory(OUTPUT_DIR, fname, as_attachment=False)


# ---- content browser ----
import content_routes as CR


@app.route("/browse")
def browse_hub():
    return CR.hub()


@app.route("/browse/questions")
def browse_questions():
    return CR.questions(request.args)


@app.route("/browse/question/<qid>")
def browse_question(qid):
    return CR.question(qid)


@app.route("/browse/tests")
def browse_tests():
    return CR.tests_list()


@app.route("/browse/test/<int:n>")
def browse_test(n):
    return CR.test_view(n)


@app.route("/browse/periods")
def browse_periods():
    return CR.periods_list()


@app.route("/browse/period/<u>")
def browse_period(u):
    return CR.period_view(u)


@app.route("/browse/essays")
def browse_essays():
    return CR.essays_list()


@app.route("/browse/essay/<slug>")
def browse_essay(slug):
    return CR.essay_view(slug)


INDEX_HTML = """<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>APUSH Video Renderer</title>
<style>
body{font-family:system-ui,sans-serif;background:#14161d;color:#eee;max-width:1000px;margin:0 auto;padding:24px}
h1{color:#e9c46a}.card{background:#1d2029;border-radius:12px;padding:16px;margin:12px 0}
.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.title{font-weight:700;font-size:17px}.meta{color:#9aa0ae;font-size:13px}
.badge{font-size:12px;padding:3px 10px;border-radius:20px;background:#2a2e3a}
.badge.ok{background:#1e4633;color:#7ce3a8}.badge.warn{background:#4a3a1a;color:#e9c46a}
button{background:#e9c46a;border:0;border-radius:8px;padding:8px 16px;font-weight:700;cursor:pointer}
button:disabled{opacity:.4;cursor:default}
button.ghost{background:#2a2e3a;color:#eee}
.bar{height:8px;background:#2a2e3a;border-radius:4px;overflow:hidden;margin-top:8px}
.bar>i{display:block;height:100%;background:#e9c46a;width:0}
.log{background:#101218;border-radius:8px;padding:10px;font-family:monospace;font-size:12px;
max-height:160px;overflow:auto;white-space:pre-wrap;margin-top:8px}
video{width:100%;border-radius:8px;margin-top:8px}
.script{margin-top:8px;font-size:14px}.script summary{cursor:pointer;color:#e9c46a}
.script li{margin:6px 0;color:#cfd3dc}.script b{color:#fff}
a{color:#e9c46a}
</style></head><body>
<h1>APUSH Video Renderer</h1>
<div style="margin-bottom:16px"><a href="/browse" style="font-size:16px">📖 Browse the full content →</a></div>
<div id="list"></div>
<script>
async function refresh(){
  const vs = await (await fetch('/api/videos')).json();
  const el = document.getElementById('list');
  el.innerHTML = vs.map(v=>`
   <div class="card" id="c-${v.name}">
    <div class="row">
      <div style="flex:1"><div class="title">${v.title}</div>
      <div class="meta">${v.stages} stages ·
        <span class="badge ${v.audio_have===v.audio_need?'ok':'warn'}">audio ${v.audio_have}/${v.audio_need}</span>
        ${v.rendered?`<span class="badge ok">rendered ${(v.rendered_size/1e6).toFixed(1)} MB</span>`:`<span class="badge">not rendered</span>`}
      </div></div>
      <button onclick="render('${v.name}')" ${v.audio_have===0?'disabled':''}>Render</button>
      <button class="ghost" onclick="toggleScript('${v.name}')">Script</button>
      ${v.rendered?`<a href="/output/${v.out}" download><button class="ghost">Download</button></a>`:''}
    </div>
    <div class="prog" style="display:none"><div class="bar"><i></i></div><div class="log"></div></div>
    <div class="script" style="display:none"></div>
    ${v.rendered?`<video controls preload="metadata" src="/output/${v.out}"></video>`:''}
   </div>`).join('');
}
async function render(name){
  const card=document.querySelector(`#c-${name} .prog`);
  card.style.display='block';
  const bar=card.querySelector('.bar>i'), log=card.querySelector('.log');
  const {job}=await (await fetch('/api/render/'+name,{method:'POST'})).json();
  const t=setInterval(async()=>{
    const j=await (await fetch('/api/job/'+job)).json();
    bar.style.width=j.progress+'%';
    log.textContent=(j.log||[]).join('\\n');
    if(j.state!=='running'){clearInterval(t);refresh();}
  },1500);
}
async function toggleScript(name){
  const d=document.querySelector(`#c-${name} .script`);
  if(d.style.display!=='none'){d.style.display='none';return;}
  const parts=await (await fetch('/api/script/'+name)).json();
  d.innerHTML='<ol>'+parts.map(p=>`<li><b>${p.stage}</b> — ${p.text}</li>`).join('')+'</ol>';
  d.style.display='block';
}
refresh();
</script></body></html>"""


if __name__ == "__main__":
    for exe in ("ffmpeg", "ffprobe", "python"):
        if not shutil.which(exe):
            print(f"warning: {exe} not on PATH")
    print("Open http://localhost:5000")
    app.run(host="0.0.0.0", port=5000)
