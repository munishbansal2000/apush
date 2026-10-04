"""Tests for the stills stage (pipeline.stills): generation, edit variants, search."""
import json
import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "video_pipeline"))

from pipeline.common import PipelineError
from pipeline.schema import validate_manifest
from pipeline import stills


def manifest(scene_visual, still_generation=None):
    data = {
        "schema_version": 1,
        "lesson_id": "test-lesson",
        "title": "Test",
        "output": "out.mp4",
        "tts": {"engine": "edge"},
        "scenes": [{
            "id": "s1",
            "narration": {"text": "A plain narration with [beat] simple words."},
            "visual": {"base_image": "assets/images/test-lesson/s1.webp", **scene_visual},
            "animation": {"type": "ken_burns"},
        }],
    }
    if still_generation is not None:
        data["still_generation"] = still_generation
    return data


def repo_with_catalog(root: Path):
    assets = root / "assets" / "images"
    assets.mkdir(parents=True, exist_ok=True)
    (assets / "CATALOG.json").write_text(json.dumps(
        {"version": 1, "generated": "2026-01-01", "count": 0, "entries": []}))


class StillSchemaTests(unittest.TestCase):
    def validate(self, data, root, **kwargs):
        return validate_manifest(data, root / "lesson.json", root, **kwargs)

    def test_generate_spec_validates(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = manifest({"still": {"prompt": "an engraving of a galleon", "seed": 7}})
            self.validate(data, root, require_files=False)

    def test_edit_spec_validates(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = manifest({"still": {
                "edit_of": "assets/images/test-lesson/base.webp",
                "edit_prompt": "same room, add pamphlets",
            }})
            self.validate(data, root, require_files=False)

    def test_edit_of_requires_edit_prompt(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = manifest({"still": {"edit_of": "assets/images/test-lesson/base.webp"}})
            with self.assertRaises(PipelineError):
                self.validate(data, root, require_files=False)

    def test_edit_prompt_requires_edit_of(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = manifest({"still": {"edit_prompt": "add pamphlets"}})
            with self.assertRaises(PipelineError):
                self.validate(data, root, require_files=False)

    def test_still_and_search_mutually_exclusive(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = manifest({
                "still": {"prompt": "a galleon"},
                "search": {"query": "galleon engraving"},
            })
            with self.assertRaises(PipelineError):
                self.validate(data, root, require_files=False)

    def test_search_spec_validates(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = manifest({"search": {"query": "de Bry engraving torture", "pick": 1}})
            self.validate(data, root, require_files=False)

    def test_search_requires_query(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = manifest({"search": {"pick": 0}})
            with self.assertRaises(PipelineError):
                self.validate(data, root, require_files=False)

    def test_bad_still_provider_rejected(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = manifest({"still": {"prompt": "x", "provider": "midjourney"}})
            with self.assertRaises(PipelineError):
                self.validate(data, root, require_files=False)

    def test_missing_base_image_exempt_with_still_spec(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = manifest({"still": {"prompt": "an engraving of a galleon"}})
            # require_files=True would fail without the exemption
            self.validate(data, root, require_files=True)

    def test_missing_base_image_fails_without_spec(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = manifest({})
            with self.assertRaises(PipelineError):
                self.validate(data, root, require_files=True)


class WikimediaSelectTests(unittest.TestCase):
    def pages(self):
        def page(title, license_short, width, url="https://upload.wikimedia.org/x.jpg"):
            return {"title": title, "imageinfo": [{
                "url": url, "width": width,
                "descriptionurl": "https://commons.wikimedia.org/wiki/" + title,
                "extmetadata": {
                    "LicenseShortName": {"value": license_short},
                    "Artist": {"value": "<a>Someone</a>"},
                }}]}
        return [
            page("File:Copyrighted.jpg", "© All rights reserved", 2000),
            page("File:PD-small.jpg", "Public domain", 400),
            page("File:PD-big.jpg", "Public domain", 2000),
            page("File:CC0.jpg", "CC0", 1600),
        ]

    def test_skips_non_pd_and_small(self):
        chosen = stills._select_wikimedia(self.pages(), pick=0, min_width=800)
        self.assertEqual(chosen["title"], "File:PD-big.jpg")

    def test_pick_selects_later_candidate(self):
        chosen = stills._select_wikimedia(self.pages(), pick=1, min_width=800)
        self.assertEqual(chosen["title"], "File:CC0.jpg")

    def test_pick_out_of_range_fails(self):
        with self.assertRaises(PipelineError):
            stills._select_wikimedia(self.pages(), pick=5, min_width=800)

    def test_no_pd_candidates_fails(self):
        pages = [p for p in self.pages() if "PD-big" not in p["title"] and "CC0" not in p["title"]]
        pages = [p for p in pages if p["title"] != "File:PD-small.jpg"]
        with self.assertRaises(PipelineError):
            stills._select_wikimedia(pages, pick=0, min_width=800)

    def test_artist_html_stripped(self):
        chosen = stills._select_wikimedia(self.pages(), pick=0, min_width=800)
        self.assertEqual(chosen["author"], "Someone")

    def test_download_converts_bytes_to_requested_format(self):
        from PIL import Image
        source = io.BytesIO()
        Image.effect_noise((200, 200), 20).convert("RGB").save(source, format="JPEG")
        with tempfile.TemporaryDirectory() as value:
            output = Path(value) / "plate.webp"
            with mock.patch.object(stills.urllib.request, "urlopen",
                                   return_value=io.BytesIO(source.getvalue())):
                digest = stills._download("https://example.test/plate.jpg", output, "s1")
            self.assertEqual(len(digest), 64)
            with Image.open(output) as rendered:
                self.assertEqual(rendered.format, "WEBP")


class GenerateStillsTests(unittest.TestCase):
    def test_dry_run_plans_without_creating(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            repo_with_catalog(root)
            data = manifest(
                {"still": {"prompt": "an engraving", "provider": "command"}},
                {"provider": "command", "command": "false"})
            out = stills.generate_stills(data, root / "lesson.json", root, dry_run=True)
            self.assertEqual(out, [])
            target = root / "assets" / "images" / "test-lesson" / "s1.webp"
            self.assertFalse(target.exists())

    def test_existing_file_skipped(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            repo_with_catalog(root)
            target = root / "assets" / "images" / "test-lesson" / "s1.webp"
            target.parent.mkdir(parents=True)
            target.write_bytes(b"\xff\xd8" + b"\x00" * 5000)
            data = manifest({"still": {"prompt": "an engraving", "provider": "command"}},
                            {"provider": "command", "command": "false"})
            out = stills.generate_stills(data, root / "lesson.json", root)
            self.assertEqual([p.name for p in out], ["s1.webp"])

    def test_command_provider_generates_and_catalogs(self):
        try:
            from PIL import Image  # noqa
        except ImportError:
            self.skipTest("PIL not available")
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            repo_with_catalog(root)
            data = manifest(
                {"still": {"prompt": "an engraving", "provider": "command"}},
                {"provider": "command",
                 "command": ["{python}", "-c", "from PIL import Image; "
                             "Image.effect_noise((800,600), 25).convert('RGB').save(r'{output}')"]})
            out = stills.generate_stills(data, root / "lesson.json", root)
            target = root / "assets" / "images" / "test-lesson" / "s1.webp"
            self.assertTrue(target.is_file())
            self.assertEqual(len(out), 1)
            prov = json.loads((target.with_suffix(".webp.provenance.json")).read_text())
            self.assertEqual(prov["kind"], "generated")
            catalog = json.loads((root / "assets" / "images" / "CATALOG.json").read_text())
            entries = [e for e in catalog["entries"]
                       if e["local_path"] == "assets/images/test-lesson/s1.webp"]
            self.assertEqual(len(entries), 1)
            self.assertIn("AI-generated", entries[0]["provenance"]["license_note"])

    def test_no_provider_and_missing_file_fails(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            repo_with_catalog(root)
            data = manifest({"still": {"prompt": "an engraving"}})  # provider none
            with self.assertRaises(PipelineError):
                stills.generate_stills(data, root / "lesson.json", root)

    def test_search_job_dispatched(self):
        try:
            from PIL import Image  # noqa
        except ImportError:
            self.skipTest("PIL not available")
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            repo_with_catalog(root)
            data = manifest({"search": {"query": "galleon", "provider": "wikimedia"}})

            def fake_search(spec, output, scene_id):
                output.parent.mkdir(parents=True, exist_ok=True)
                Image.effect_noise((800,600), 25).convert("RGB").save(output)
                return {"kind": "search", "provider": "wikimedia",
                        "license_note": "Public domain via Wikimedia Commons",
                        "query": "galleon", "page_url": "https://commons.wikimedia.org/wiki/File:X.jpg"}

            with mock.patch.object(stills, "_search_wikimedia", side_effect=fake_search) as m:
                out = stills.generate_stills(data, root / "lesson.json", root, force=True)
                self.assertTrue(m.called)
                self.assertEqual(len(out), 1)
            catalog = json.loads((root / "assets" / "images" / "CATALOG.json").read_text())
            entries = [e for e in catalog["entries"]
                       if e["local_path"] == "assets/images/test-lesson/s1.webp"]
            self.assertEqual(len(entries), 1)
            self.assertIn("Public domain", entries[0]["provenance"]["license_note"])


if __name__ == "__main__":
    unittest.main()


class TestStillsFixes(unittest.TestCase):
    def test_resolve_output_prefers_repo_root(self):
        from pipeline.stills import _resolve_output
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "repo"
            out = _resolve_output("assets/images/x.webp", root)
            self.assertEqual(out, root / "assets/images/x.webp")
            abs_p = (Path(tmp) / "abs.webp").resolve()
            self.assertEqual(_resolve_output(str(abs_p), root), abs_p)

    def test_command_license_note_override(self):
        from pipeline.stills import _generate_command
        with tempfile.TemporaryDirectory() as tmp:
            still = {"prompt": 'SPLIT top=a.webp bottom=b.webp',
                     "license_note": "Composite of AI-generated and public-domain images"}
            config = {"command": ["{python}", "-c", "open(r'{output}','w').write('x')"],
                      "timeout_seconds": 30}
            out = Path(tmp) / "repo" / "comp.webp"
            info = _generate_command(still, out, config, "s1", Path(tmp), Path(tmp) / "repo")
            self.assertEqual(info["license_note"],
                             "Composite of AI-generated and public-domain images")

    def test_command_runs_last(self):
        # command-provider stills sort after search/generate jobs
        from pipeline import stills as st
        with tempfile.TemporaryDirectory() as tmp:
            calls = []
            orig_search = st._search_wikimedia
            orig_gen = st._generate_one
            orig_verify = st._verify_image
            orig_prov = st._write_provenance
            orig_cat = st._register_catalog
            def fake_gen(*a, **k):
                calls.append(("gen", a[4]))
                Path(a[2]).parent.mkdir(parents=True, exist_ok=True)
                Path(a[2]).write_bytes(b"x" * 2048)
                return {"kind": "generated", "provider": "command"}
            def fake_search(spec, output, sid):
                calls.append(("search", sid))
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_bytes(b"x" * 2048)
                return {"kind": "search", "provider": "wikimedia", "license_note": "PD"}
            st._generate_one = fake_gen
            st._search_wikimedia = fake_search
            st._verify_image = lambda *a, **k: None
            st._write_provenance = lambda *a, **k: None
            st._register_catalog = lambda *a, **k: None
            try:
                manifest = {
                    "lesson_id": "order-test",
                    "still_generation": {"provider": "command",
                                         "command": "{python} -c \"1\"",
                                         "search_provider": "wikimedia"},
                    "scenes": [
                        {"id": "s1", "visual": {"base_image": "assets/images/order-test/a.webp",
                                                "still": {"prompt": "SPLIT top=x bottom=y", "provider": "command"}},
                         "source": {}},
                        {"id": "s2", "visual": {"base_image": "assets/images/order-test/b.webp",
                                                "search": {"query": "q", "pick": 0}},
                         "source": {}},
                    ],
                }
                mp = Path(tmp) / "m.json"
                mp.write_text("{}")
                st.generate_stills(manifest, mp, Path(tmp), force=True)
                kinds = [c[0] for c in calls]
                self.assertEqual(kinds, ["search", "gen"],
                                 f"command should run after search, got {calls}")
            finally:
                st._search_wikimedia = orig_search
                st._generate_one = orig_gen
                st._verify_image = orig_verify
                st._write_provenance = orig_prov
                st._register_catalog = orig_cat
