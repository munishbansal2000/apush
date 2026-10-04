from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from video_pipeline.pipeline.common import PipelineError, atomic_json  # noqa: E402
from content_qa.pipeline.audit import audit_records  # noqa: E402
from content_qa.pipeline.config import load_config  # noqa: E402
from content_qa.pipeline.discovery import discover  # noqa: E402
from content_qa.pipeline.fixes import apply_approved, make_fix_manifest  # noqa: E402
from content_qa.pipeline.models import Finding  # noqa: E402
from content_qa.pipeline.render_report import write_reports  # noqa: E402
from content_qa.pipeline.reviewer import review_records  # noqa: E402


def _resolve(value: str, base: Path) -> Path:
    path = Path(value)
    return path.resolve() if path.is_absolute() else (base / path).resolve()


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verify APUSH content and produce controlled fixes.")
    parser.add_argument("--manifest", default="content_qa/examples/apush-library.qa.json")
    parser.add_argument("--mode", choices=("audit", "review", "all", "apply"), default="audit")
    parser.add_argument("--fixes", help="Approved fixes manifest; required for --mode apply")
    parser.add_argument("--limit", type=int, help="Limit records sent to an LLM (mechanical audit still scans all)")
    parser.add_argument("--provider", choices=("ollama", "openai-compatible"), help="Override review provider")
    parser.add_argument("--model", help="Override review model")
    parser.add_argument("--vision-model", help="Override the multimodal model used for image relevance")
    parser.add_argument("--check-render", action="store_true", help="Open the HTML packet in Chromium and detect broken images/overflow")
    return parser


def main() -> int:
    args = _parser().parse_args()
    manifest_path = _resolve(args.manifest, REPO_ROOT)
    config = load_config(manifest_path)
    if args.mode == "apply":
        if not args.fixes:
            raise PipelineError("--mode apply requires --fixes")
        changed = apply_approved(_resolve(args.fixes, REPO_ROOT), REPO_ROOT)
        print(f"Applied approved fixes to {len(changed)} file(s). Re-running audit is recommended.")
        for path in changed:
            print(f"  {path}")
        return 0

    output_dir = _resolve(config["output"], REPO_ROOT)
    standards_path = _resolve(config["standards"], REPO_ROOT)
    try:
        standards = json.loads(standards_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PipelineError(f"cannot read standards file {standards_path}: {exc}") from exc
    records, discovery_errors = discover(REPO_ROOT, config)
    findings = audit_records(records, REPO_ROOT, standards, config.get("policies", {}))
    reviews: list[dict] = []
    if args.mode in {"review", "all"}:
        review_config = dict(config.get("review", {}))
        if args.provider:
            review_config["provider"] = args.provider
        if args.model:
            review_config["model"] = args.model
        if args.vision_model:
            review_config["vision_model"] = args.vision_model
        llm_findings, reviews = review_records(records, review_config, REPO_ROOT, output_dir, args.limit)
        findings.extend(llm_findings)
    report = write_reports(output_dir, REPO_ROOT, records, findings, reviews, discovery_errors)
    if args.check_render:
        command = ["node", str(HERE / "tools" / "check_render.js"), str(output_dir / "index.html"), str(output_dir / "render-preview.png")]
        result = subprocess.run(command, capture_output=True, text=True, timeout=180)
        if result.returncode:
            findings.append(Finding("__render__", str(output_dir / "index.html"), "", "browser_render", "major", "browser render check could not run", {"stderr": result.stderr[-2000:]}))
        else:
            render_result = json.loads(result.stdout)
            atomic_json(output_dir / "render-check.json", render_result)
            if not render_result.get("ok"):
                findings.append(Finding("__render__", str(output_dir / "index.html"), "", "browser_render", "blocker", "browser detected broken images, overflow, empty prompts, or load errors", render_result))
        report = write_reports(output_dir, REPO_ROOT, records, findings, reviews, discovery_errors)
    fixes = make_fix_manifest(records, findings)
    atomic_json(output_dir / "fixes.proposed.json", fixes)
    counts = Counter(x.severity for x in findings)
    print(f"Audited {len(records)} records: {len(findings)} finding(s), {len(discovery_errors)} discovery warning(s).")
    print("Severity: " + ", ".join(f"{name}={counts.get(name, 0)}" for name in ("blocker", "major", "minor", "info")))
    print(f"Report: {output_dir / 'index.html'}")
    print(f"Machine report: {output_dir / 'report.json'}")
    print(f"Proposed fixes: {output_dir / 'fixes.proposed.json'}")
    fail_on = set(config.get("policies", {}).get("fail_on", ["blocker"]))
    return 2 if discovery_errors or any(counts[x] for x in fail_on) else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PipelineError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
