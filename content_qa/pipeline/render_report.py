from __future__ import annotations

import html
import json
import os
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from video_pipeline.pipeline.common import atomic_json

from .audit import clean_option
from .models import ContentRecord, Finding


def _h(value: Any) -> str:
    return html.escape(str(value or ""))


def write_reports(output_dir: Path, repo_root: Path, records: list[ContentRecord], findings: list[Finding], reviews: list[dict[str, Any]], discovery_errors: list[str]) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    counts = Counter(x.severity for x in findings)
    gates = Counter(x.gate for x in findings)
    report = {
        "schema_version": "1.0",
        "summary": {"records": len(records), "findings": len(findings), "by_severity": dict(counts), "by_gate": dict(gates), "discovery_errors": len(discovery_errors)},
        "discovery_errors": discovery_errors,
        "findings": [x.public() for x in findings],
        "reviews": reviews,
    }
    atomic_json(output_dir / "report.json", report)
    by_id: dict[str, list[Finding]] = defaultdict(list)
    for finding in findings:
        by_id[finding.record_id].append(finding)
    cards: list[str] = []
    for record in records:
        item = record.data
        stimulus = item.get("stimulus") if isinstance(item.get("stimulus"), dict) else {}
        image_html = ""
        raw_image = stimulus.get("image_url") or stimulus.get("image")
        if isinstance(raw_image, str) and not raw_image.startswith(("http://", "https://")):
            src = Path(os.path.relpath((repo_root / raw_image).resolve(), output_dir.resolve())).as_posix()
            image_html = f'<figure><img src="{_h(src)}" loading="lazy"><figcaption>{_h(stimulus.get("image_caption"))}</figcaption></figure>'
        options = item.get("options") if isinstance(item.get("options"), list) else []
        options_html = "".join(f'<li><b>{chr(65+i)}</b> {_h(clean_option(value))}</li>' for i, value in enumerate(options))
        findings_html = "".join(f'<li class="{_h(x.severity)}"><b>{_h(x.severity)} · {_h(x.gate)}</b> — {_h(x.message)}</li>' for x in by_id.get(record.uid, [])) or "<li class=pass>No findings</li>"
        prompt = item.get("stem") or item.get("prompt") or item.get("question") or ""
        if not prompt and isinstance(item.get("parts"), list):
            prompt = " ".join(str(x.get("prompt") if isinstance(x, dict) else x) for x in item["parts"])
        elif not prompt and isinstance(item.get("parts"), dict):
            prompt = " ".join(f"{key}. {value}" for key, value in item["parts"].items())
        elif not prompt and isinstance(item.get("parts"), str):
            prompt = item["parts"]
        stimulus_text = ""
        if isinstance(stimulus, dict):
            stimulus_text = stimulus.get("text") or stimulus.get("text_stimulus") or stimulus.get("passage") or ""
        elif isinstance(item.get("stimulus"), str):
            stimulus_text = item["stimulus"]
        stimulus_text = stimulus_text or item.get("stimulus_text") or ""
        stimulus_html = f'<blockquote>{_h(stimulus_text)}</blockquote>' if stimulus_text else ""
        documents_html = ""
        if isinstance(item.get("documents"), list):
            document_rows = []
            for document in item["documents"]:
                if isinstance(document, dict):
                    document_rows.append(f'<li><b>Document {_h(document.get("n"))}: {_h(document.get("source_line"))}</b><p>{_h(document.get("text"))}</p></li>')
            documents_html = '<details><summary>Documents</summary><ol>' + "".join(document_rows) + '</ol></details>'
        answer = item.get("explanation") or item.get("answer") or item.get("exemplar") or item.get("exemplar_thesis") or ""
        option_explanations = item.get("option_explanations") if isinstance(item.get("option_explanations"), dict) else {}
        option_explanation_html = "".join(f'<li><b>{_h(label)}:</b> {_h(text)}</li>' for label, text in option_explanations.items())
        cards.append(f'<article><header><span>{_h(record.kind.upper())}</span><code>{_h(record.uid)}</code></header>{image_html}{stimulus_html}<h2>{_h(prompt)}</h2><ol class=options>{options_html}</ol>{documents_html}<details><summary>Answer and explanation</summary><p><b>Key:</b> {_h(record.answer_key or "—")}</p><p>{_h(answer)}</p><ul>{option_explanation_html}</ul></details><h3>QA findings</h3><ul class=findings>{findings_html}</ul></article>')
    css = """body{margin:0;background:#10141b;color:#e8edf2;font:15px system-ui}main{max-width:1100px;margin:auto;padding:28px}.summary{display:flex;gap:12px;flex-wrap:wrap}.pill,article{background:#19212c;border:1px solid #344155;border-radius:12px}.pill{padding:10px 14px}article{padding:20px;margin:20px 0;overflow:hidden}header{display:flex;justify-content:space-between;color:#a8b4c5}h2{font-size:20px;line-height:1.45}figure{margin:14px 0}img{display:block;max-width:100%;max-height:520px;margin:auto;border-radius:8px}figcaption{color:#abb5c4;margin-top:6px}blockquote{margin:14px 0;padding:14px 18px;border-left:4px solid #7186a5;background:#111821;white-space:pre-wrap}.options{list-style:none;padding:0}.options li{padding:9px;margin:6px 0;background:#111821;border-radius:6px}.findings li{margin:7px}.blocker{color:#ff7777}.major{color:#ffb86b}.minor{color:#f0df75}.info,.pass{color:#70d6a0}details{background:#111821;padding:10px;border-radius:8px;margin:10px 0}code{font-size:12px}@media print{body{background:white;color:black}article{break-inside:avoid;border-color:#bbb}.options li,details{background:#eee}}"""
    pills = "".join(f'<span class="pill {name}">{_h(name)}: {count}</span>' for name, count in counts.items())
    global_findings = [x for x in findings if x.record_id not in {r.uid for r in records}]
    global_html = ""
    if discovery_errors or global_findings:
        entries = [f"Discovery: {value}" for value in discovery_errors] + [f"{x.severity} · {x.gate}: {x.message}" for x in global_findings]
        global_html = '<article><h2>Pipeline-level findings</h2><ul class=findings>' + "".join(f'<li>{_h(value)}</li>' for value in entries) + '</ul></article>'
    page = f'<!doctype html><html><head><meta charset="utf-8"><title>APUSH Content QA</title><style>{css}</style></head><body><main><h1>APUSH Content QA</h1><div class=summary><span class=pill>Records: {len(records)}</span>{pills}</div>{global_html}{"".join(cards)}</main></body></html>'
    (output_dir / "index.html").write_text(page, encoding="utf-8")
    return report
