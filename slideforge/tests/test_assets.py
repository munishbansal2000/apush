import io
import json
import os
import tempfile
import unittest
from unittest import mock

from slideforge import assets


def _fake_urlopen(responses):
    """responses: list of bytes to return in order."""
    it = iter(responses)

    def _open(req, timeout=None):
        data = next(it)

        class R:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return data

        return R()

    return _open


SEARCH_JSON = json.dumps({
    "query": {"search": [{"title": "File:Henry ford 1919.jpg"},
                         {"title": "File:Other.jpg"}]}}).encode()

INFO_JSON = json.dumps({
    "query": {"pages": {"1": {"imageinfo": [{
        "url": "https://upload.wikimedia.org/x.jpg",
        "extmetadata": {"LicenseShortName": {"value": "Public domain"}}}]}}}}).encode()


class TestAssets(unittest.TestCase):
    def test_search_parses_titles(self):
        with mock.patch("urllib.request.urlopen",
                        _fake_urlopen([SEARCH_JSON])):
            titles = assets.search("Henry Ford 1919 portrait")
        self.assertEqual(titles,
                         ["File:Henry ford 1919.jpg", "File:Other.jpg"])

    def test_file_info_parses_url_and_license(self):
        with mock.patch("urllib.request.urlopen",
                        _fake_urlopen([INFO_JSON])):
            url, lic = assets.file_info("File:Henry ford 1919.jpg")
        self.assertEqual(url, "https://upload.wikimedia.org/x.jpg")
        self.assertEqual(lic, "Public domain")

    def test_file_info_missing_raises(self):
        empty = json.dumps({"query": {"pages": {"1": {}}}}).encode()
        with mock.patch("urllib.request.urlopen", _fake_urlopen([empty])):
            with self.assertRaises(ValueError):
                assets.file_info("File:Nope.jpg")

    def test_download_writes_bytes(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "sub", "f.jpg")
            fake_img = b"\xff\xd8fakejpeg"
            with mock.patch("urllib.request.urlopen",
                            _fake_urlopen([INFO_JSON, fake_img])):
                path, lic = assets.download("File:Henry ford 1919.jpg", out)
            self.assertEqual(path, out)
            self.assertEqual(lic, "Public domain")
            with open(out, "rb") as f:
                self.assertEqual(f.read(), fake_img)


if __name__ == "__main__":
    unittest.main()
