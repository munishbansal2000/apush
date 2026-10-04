from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from content_qa.pipeline.audit import _audit_writing, audit_records
from content_qa.pipeline.config import load_config
from content_qa.pipeline.discovery import extract_records
from content_qa.pipeline.fixes import apply_approved
from content_qa.pipeline.models import ContentRecord, Finding
from video_pipeline.pipeline.common import canonical_hash
from video_pipeline.pipeline.common import PipelineError


class ContentQATests(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp())
        self.standards = {"topics": [{"code": "1.3"}], "skills": [{"code": "4.B"}]}

    def item(self) -> dict:
        return {"id": "q1", "type": "mcq", "stem": "Which development best explains this event?", "options": ["(A) Tiny", "(B) A plausible but incorrect development", "(C) The correct historically defensible development", "(D) Another plausible but incorrect development"], "key": "C", "explanation": "C is correct due to the historical context.", "option_explanations": {"A": "Wrong because it is too early.", "B": "Wrong because it concerns another region.", "C": "Right because it explains the context.", "D": "Wrong because it occurred much later."}, "period": "U1", "topic_code": "1.3", "skill_code": "4.B"}

    def test_extract_and_detect_short_distractor(self) -> None:
        path = self.root / "bank.json"
        records = extract_records(path, {"items": [self.item()]}, {})
        findings = audit_records(records, self.root, self.standards, {})
        self.assertTrue(any(x.gate == "distractor_quality" for x in findings))

    def test_external_test_key(self) -> None:
        item = self.item()
        item.pop("key")
        item["n"] = 1
        records = extract_records(self.root / "test-01.json", {"section_1a": {"items": [item]}}, {("test-01", 1): "B"})
        self.assertEqual(records[0].answer_key, "B")

    def test_alternate_saq_parts_are_supported(self) -> None:
        record = ContentRecord("s1", "saq", self.root / "saq.json", "/items/0", {"id": "s1", "parts": ["A. Identify one cause.", "B. Explain one effect.", "C. Explain one limitation."], "exemplar": "A defensible response."})
        self.assertEqual(_audit_writing(record), [])

    def test_manifest_rejects_unknown_fields(self) -> None:
        path = self.root / "qa.json"
        path.write_text(json.dumps({"schema_version": "1.0", "library": {"include": ["*.json"]}, "standards": "codes.json", "output": "out", "surprise": True}), encoding="utf-8")
        with self.assertRaises(PipelineError):
            load_config(path)

    def test_library_coverage_is_aggregated(self) -> None:
        record = ContentRecord("q1", "mcq", self.root / "bank.json", "/items/0", self.item(), "C")
        standards = {"topics": [{"code": "1.3"}, {"code": "1.4"}], "skills": [{"code": "4.B"}]}
        findings = audit_records([record], self.root, standards, {})
        coverage = [x for x in findings if x.gate == "coverage" and x.severity == "major"]
        self.assertEqual(coverage[0].evidence["missing_topics"], ["1.4"])

    def test_apply_requires_approval_and_preconditions(self) -> None:
        source = self.root / "content.json"
        document = {"items": [self.item()]}
        source.write_text(json.dumps(document), encoding="utf-8")
        fixes = {"patches": [{"id": "f1", "approved": True, "source_file": str(source), "pointer": "/items/0", "source_hash": canonical_hash(document), "field": "stem", "expected_old": document["items"][0]["stem"], "new_value": "Improved stem?"}]}
        fix_path = self.root / "fixes.json"
        fix_path.write_text(json.dumps(fixes), encoding="utf-8")
        changed = apply_approved(fix_path, self.root)
        self.assertEqual(changed, [str(source)])
        self.assertEqual(json.loads(source.read_text(encoding="utf-8"))["items"][0]["stem"], "Improved stem?")


if __name__ == "__main__":
    unittest.main()
