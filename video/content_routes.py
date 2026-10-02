"""Read-only content browser for the APUSH prep book.

Routes (mounted by app.py):
  /browse                  hub with counts
  /browse/questions        MCQ/SAQ/DBQ/LEQ browser with filters
  /browse/question/<qid>   single item view
  /browse/tests            10 practice tests
  /browse/test/<n>         full test view
  /browse/periods          9 period reviews
  /browse/period/<u>       one period review (markdown -> HTML)
  /browse/essays           60 exemplar essays
  /browse/essay/<slug>     one exemplar (markdown -> HTML)
"""
import glob
import html
import json
import os
import re

import markdown as md_lib

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
STAGED = os.path.join(REPO, "build", "reclaim-merged", "staged")

_bank = None
_tests = None


def _load_bank():
    global _bank
    if _bank is not None:
        return _bank
    items = []
    for path in sorted(glob.glob(os.path.join(STAGED, "*", "*.json"))):
        if "/_raw/" in path:
            continue
        try:
            d = json.load(open(path))
        except Exception:
            continue
        entries = d.get("items", [])
        if isinstance(entries, dict):
            entries = [entries]
        book = path.split(os.sep)[-2]
        for e in entries:
            if not isinstance(e, dict):
                continue
            e = dict(e)
            e["_source"] = book
            e["_file"] = os.path.basename(path)
            items.append(e)
    _bank = items
    return items


def _load_tests():
    global _tests
    if _tests is not None:
        return _tests
    tests = []
    for i in range(1, 11):
        p = os.path.join(REPO, "build", "tests", f"test-{i:02d}.json")
        if os.path.exists(p):
            t = json.load(open(p))
            t["_n"] = i
            tests.append(t)
    _tests = tests
    return tests


def md_html(path):
    text = open(path).read()
    return md_lib.markdown(text, extensions=["tables", "fenced_code"])


def esc(s):
    return html.escape(str(s or ""))


def stim_html(stim, limit=1200):
    """Render a stimulus that may be None, a string, or a {kind,text/image_url} dict."""
    if not stim:
        return ""
    if isinstance(stim, dict):
        if stim.get("kind") == "image" and stim.get("image_url"):
            return (f'<div class="stim"><img src="{esc(stim["image_url"])}" '
                    f'style="max-width:100%;border-radius:6px">'
                    f'<div class="meta">{esc(stim.get("caption", ""))}</div></div>')
        text = stim.get("text") or ""
        return f'<div class="stim">{esc(text[:limit])}</div>' if text else ""
    return f'<div class="stim">{esc(str(stim)[:limit])}</div>'


# ---------- rendering helpers ----------

CSS = """
<style>
body{font-family:system-ui,sans-serif;background:#14161d;color:#e8e8e8;max-width:960px;margin:0 auto;padding:24px}
a{color:#e9c46a}h1,h2{color:#e9c46a}
.card{background:#1d2029;border-radius:12px;padding:18px;margin:14px 0}
.stim{background:#262a36;border-left:4px solid #e9c46a;padding:12px 16px;border-radius:0 8px 8px 0;margin:12px 0;font-style:italic}
.opts{list-style:none;padding:0}.opts li{padding:8px 12px;border-radius:8px;margin:6px 0;background:#242832}
.opts li.key{background:#1e4633;border:1px solid #2ea05a}
.expl{background:#20242f;border-radius:8px;padding:12px 16px;margin-top:12px}
details{margin-top:8px}summary{cursor:pointer;color:#e9c46a}
.meta{color:#9aa0ae;font-size:13px}.meta b{color:#cfd3dc}
.filters{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}
.filters select,.filters input{background:#242832;color:#eee;border:1px solid #3a3f4d;border-radius:8px;padding:8px}
.pager{margin:20px 0;display:flex;gap:16px;align-items:center}
table.grid{width:100%;border-collapse:collapse}table.grid td,table.grid th{padding:10px;border-bottom:1px solid #2a2e3a;text-align:left}
.doc{border:1px solid #3a3f4d;border-radius:8px;padding:12px;margin:8px 0}
.prose{line-height:1.65}.prose h1,.prose h2,.prose h3{color:#e9c46a}.prose table{border-collapse:collapse;margin:12px 0}
.prose td,.prose th{border:1px solid #3a3f4d;padding:8px}.prose code{background:#262a36;padding:2px 6px;border-radius:4px}
.topnav{display:flex;gap:18px;margin-bottom:8px;font-size:15px}
</style>"""

NAV = """<div class="topnav"><a href="/">&#9666; Videos</a><a href="/browse">Content home</a>
<a href="/browse/questions">Questions</a><a href="/browse/tests">Tests</a>
<a href="/browse/periods">Periods</a><a href="/browse/essays">Essays</a></div>"""


def page(title, body):
    return f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title>{CSS}</head>
<body>{NAV}<h1>{esc(title)}</h1>{body}</body></html>"""


def render_mcq(q, show_key=True):
    h = [stim_html(q.get("stimulus"))]
    h.append(f'<p style="font-size:17px">{esc(q.get("stem"))}</p>')
    h.append('<ul class="opts">')
    for i, opt in enumerate(q.get("options", [])):
        letter = chr(65 + i)
        cls = "key" if (show_key and q.get("key") == letter) else ""
        h.append(f'<li class="{cls}">{esc(opt)}</li>')
    h.append("</ul>")
    meta = q.get("period", ""), q.get("skill", ""), q.get("difficulty", ""), q.get("_source", "")
    h.append(f'<div class="meta">Period <b>{esc(meta[0])}</b> · {esc(meta[1])} · {esc(meta[2])} · {esc(meta[3])} · <code>{esc(q.get("id"))}</code></div>')
    expl = q.get("explanation")
    if expl:
        h.append(f'<div class="expl"><b>Explanation.</b> {esc(expl)}</div>')
    oexp = q.get("option_explanations") or {}
    if oexp:
        h.append("<details><summary>Why each option is right/wrong</summary><ul>")
        for letter in ["A", "B", "C", "D"]:
            if oexp.get(letter):
                mark = " ✓" if q.get("key") == letter else ""
                h.append(f"<li><b>({letter})</b>{mark} {esc(oexp[letter])}</li>")
        h.append("</ul></details>")
    return "\n".join(h)


def render_saq(q):
    h = [stim_html(q.get("stimulus_text") or q.get("stimulus"), 1500)]
    if q.get("attribution"):
        h.append(f'<div class="meta">{esc(q["attribution"])}</div>')
    h.append(f'<p style="font-size:17px">{esc(q.get("q") or q.get("stem"))}</p>')
    parts = q.get("parts") or []
    if parts:
        h.append("<ol>")
        for p in parts:
            h.append(f"<li>{esc(p if isinstance(p, str) else p.get('text', p))}</li>")
        h.append("</ol>")
    h.append(f'<div class="meta">Period <b>{esc(q.get("period"))}</b> · {esc(q.get("source_kind") or "")} · {esc(q.get("skill") or "")} · <code>{esc(q.get("id"))}</code></div>')
    ex = q.get("exemplar")
    if ex:
        h.append(f'<details><summary>Exemplar response</summary><div class="expl">{esc(ex)}</div></details>')
    return "\n".join(h)


def render_dbq(q):
    h = [f'<p style="font-size:17px">{esc(q.get("prompt"))}</p>']
    docs = q.get("documents") or q.get("docs") or []
    h.append(f"<h3>{len(docs)} documents</h3>")
    for i, d in enumerate(docs, 1):
        if isinstance(d, dict):
            title = d.get("title") or d.get("source") or f"Document {i}"
            body = d.get("text") or d.get("excerpt") or d.get("description") or ""
            attr = d.get("attribution") or ""
        else:
            title, body, attr = f"Document {i}", str(d), ""
        h.append(f'<div class="doc"><b>{esc(title)}</b> <span class="meta">{esc(attr)}</span><br>{esc(body[:800])}</div>')
    h.append(f'<div class="meta">Period <b>{esc(q.get("period"))}</b> · <code>{esc(q.get("id"))}</code></div>')
    return "\n".join(h)


def render_leq(q):
    h = [f'<p style="font-size:17px">{esc(q.get("prompt"))}</p>']
    if q.get("guidance"):
        h.append(f'<div class="expl">{esc(q["guidance"])}</div>')
    h.append(f'<div class="meta">Period <b>{esc(q.get("period"))}</b> · <code>{esc(q.get("id"))}</code></div>')
    return "\n".join(h)


def render_item(q, show_key=True):
    t = (q.get("type") or "").lower()
    if t == "mcq":
        return render_mcq(q, show_key)
    if t == "saq":
        return render_saq(q)
    if t == "dbq":
        return render_dbq(q)
    if t == "leq":
        return render_leq(q)
    return f"<pre>{esc(json.dumps(q, indent=1)[:2000])}</pre>"


# ---------- route handlers (called from app.py) ----------

def hub():
    items = _load_bank()
    counts = {}
    for q in items:
        counts[q.get("type", "?")] = counts.get(q.get("type", "?"), 0) + 1
    tests = _load_tests()
    rows = "".join(f"<tr><td>{esc(k)}</td><td>{v}</td></tr>" for k, v in sorted(counts.items()))
    body = f"""
<div class="card"><h2>Question bank</h2>
<table class="grid">{rows}</table>
<p><a href="/browse/questions">Browse questions →</a></p></div>
<div class="card"><h2>Practice tests</h2><p>{len(tests)} full tests (55 MCQ + 3 SAQ + DBQ + LEQ)</p>
<p><a href="/browse/tests">Browse tests →</a></p></div>
<div class="card"><h2>Period reviews</h2><p>9 periods</p><p><a href="/browse/periods">Read →</a></p></div>
<div class="card"><h2>Exemplar essays</h2><p>60 annotated exemplars</p><p><a href="/browse/essays">Read →</a></p></div>"""
    return page("Content", body)


def questions(args):
    items = _load_bank()
    f_type = args.get("type", "mcq")
    f_period = args.get("period", "")
    f_source = args.get("source", "")
    f_skill = args.get("skill", "")
    f_q = args.get("q", "").strip().lower()
    pg = max(1, int(args.get("pg", 1) or 1))
    PER = 20

    filtered = [x for x in items if (x.get("type", "").lower() == f_type)]
    if f_period:
        filtered = [x for x in filtered if x.get("period") == f_period]
    if f_source:
        filtered = [x for x in filtered if x.get("_source") == f_source]
    if f_skill:
        filtered = [x for x in filtered if f_skill.lower() in str(x.get("skill", "")).lower()]
    if f_q:
        filtered = [x for x in filtered
                    if f_q in str(x.get("stem", "")).lower()
                    or f_q in str(x.get("stimulus", "")).lower()
                    or f_q in str(x.get("prompt", "")).lower()]

    periods = sorted({x.get("period") for x in items if x.get("period")})
    sources = sorted({x.get("_source") for x in items if x.get("_source")})
    types = sorted({x.get("type") for x in items if x.get("type")})

    def sel(name, opts, cur, labels=None):
        o = "".join(
            f'<option value="{esc(v)}"{" selected" if v == cur else ""}>{esc((labels or {}).get(v, v) or "all")}</option>'
            for v in [""] + opts)
        return f'<select name="{name}" onchange="this.form.submit()">{o}</select>'

    pages = max(1, (len(filtered) + PER - 1) // PER)
    pg = min(pg, pages)
    chunk = filtered[(pg - 1) * PER:pg * PER]

    cards = []
    for q in chunk:
        cards.append(f'<div class="card"><div class="meta"><code>{esc(q.get("id"))}</code> · '
                     f'<a href="/browse/question/{esc(q.get("id"))}">open →</a></div>'
                     + render_item(q) + "</div>")

    qparams = f"&type={f_type}&period={f_period}&source={f_source}&skill={esc(f_skill)}&q={esc(f_q)}"
    pager = (f'<div class="pager"><a href="?pg={pg-1}{qparams}">← prev</a> '
             f'page {pg} of {pages} ({len(filtered)} items) '
             f'<a href="?pg={pg+1}{qparams}">next →</a></div>' if pages > 1 else
             f'<div class="meta">{len(filtered)} items</div>')

    body = f"""
<form class="filters" method="get">
{sel("type", types, f_type)} {sel("period", periods, f_period)} {sel("source", sources, f_source)}
<input name="skill" placeholder="skill…" value="{esc(f_skill)}">
<input name="q" placeholder="search text…" value="{esc(f_q)}" style="flex:1;min-width:160px">
<button type="submit" style="background:#e9c46a;border:0;border-radius:8px;padding:8px 16px;font-weight:700">Go</button>
</form>
{pager}
{''.join(cards)}
{pager}"""
    return page("Questions", body)


def question(qid):
    items = _load_bank()
    q = next((x for x in items if x.get("id") == qid), None)
    if not q:
        return page("Not found", "<p>No item with that id.</p>")
    body = f'<div class="card">{render_item(q)}</div>'
    return page(qid, body)


def tests_list():
    tests = _load_tests()
    rows = "".join(
        f'<tr><td><a href="/browse/test/{t["_n"]}">Test {t["_n"]:02d}</a></td>'
        f'<td class="meta">{esc(t.get("id", ""))}</td></tr>' for t in tests)
    return page("Practice tests", f'<div class="card"><table class="grid">{rows}</table></div>')


def test_view(n):
    tests = _load_tests()
    t = next((x for x in tests if x["_n"] == n), None)
    if not t:
        return page("Not found", "<p>No such test.</p>")
    h = [f'<div class="card"><h2>Section 1A — Multiple choice</h2>',
         f'<div class="expl">{esc(t["section_1a"].get("directions", "")[:600])}</div>']
    for i, q in enumerate(t["section_1a"].get("items", []), 1):
        h.append(f'<h3>Q{i}</h3>' + render_mcq(q))
    h.append('</div><div class="card"><h2>Section 1B — Short answer</h2>')
    h.append(f'<div class="expl">{esc(t["section_1b"].get("directions", "")[:600])}</div>')
    for i, q in enumerate(t["section_1b"].get("questions", []), 1):
        h.append(f'<h3>SAQ {i} <span class="meta">{esc(q.get("source_kind", ""))}</span></h3>' + render_saq(q))
    h.append('</div><div class="card"><h2>Section 2A — DBQ</h2>' + render_dbq(t["section_2a"]["dbq"]))
    h.append('</div><div class="card"><h2>Section 2B — LEQ</h2>' + render_leq(t["section_2b"]["leq"]) + '</div>')
    return page(f"Test {n:02d}", "\n".join(h))


def periods_list():
    rows = "".join(
        f'<tr><td><a href="/browse/period/u{i}">Period {i}</a></td></tr>' for i in range(1, 10))
    return page("Period reviews", f'<div class="card"><table class="grid">{rows}</table></div>')


def period_view(u):
    p = os.path.join(REPO, "build", "content", "period-reviews", f"{u}.md")
    if not os.path.exists(p):
        return page("Not found", "<p>No such period.</p>")
    return page(f"Period {u[1:]} review", f'<div class="card prose">{md_html(p)}</div>')


def essays_list():
    files = sorted(glob.glob(os.path.join(REPO, "build", "content", "exemplars", "*.md")))
    rows = "".join(
        f'<tr><td><a href="/browse/essay/{os.path.basename(f)[:-3]}">{esc(os.path.basename(f)[:-3])}</a></td></tr>'
        for f in files)
    return page(f"Exemplar essays ({len(files)})", f'<div class="card"><table class="grid">{rows}</table></div>')


def essay_view(slug):
    if not re.match(r"^[\w\-]+$", slug):
        return page("Not found", "<p>Bad name.</p>")
    p = os.path.join(REPO, "build", "content", "exemplars", slug + ".md")
    if not os.path.exists(p):
        return page("Not found", "<p>No such essay.</p>")
    return page(slug, f'<div class="card prose">{md_html(p)}</div>')
