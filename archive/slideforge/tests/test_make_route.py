import json
import os
import shutil
import tempfile
import unittest

import numpy as np
from PIL import Image


class TestMakeRouteCheck(unittest.TestCase):
    """The --check gate must abort the render on an invalid route."""

    def test_check_aborts_before_render(self):
        from slideforge.tools import make_route
        from slideforge import routes as routes_mod

        route_name = "sf_test_tmp_check"
        build_dir = os.path.join(
            os.path.dirname(os.path.dirname(routes_mod.__file__)),
            "build", route_name)
        self.addCleanup(lambda: shutil.rmtree(build_dir, ignore_errors=True))

        with tempfile.TemporaryDirectory() as d:
            Image.fromarray(np.zeros((120, 120, 3),
                                     dtype=np.uint8)).save(
                os.path.join(d, "map.png"))
            places = {"title": "T", "subtitle": "",
                      "places": [{"name": "A", "label": "A", "sub": ""}]}
            places_path = os.path.join(d, "places.json")
            with open(places_path, "w") as f:
                json.dump(places, f)
            # x=1.82 is out of the 0..1 map range -> --check must fail
            wp = [{"name": "A", "at": [1.82, 0.3], "label": "A", "sub": ""},
                  {"name": "B", "at": [0.5, 0.5], "label": "B", "sub": ""}]
            wp_path = os.path.join(d, "wp.json")
            with open(wp_path, "w") as f:
                json.dump(wp, f)
            out = os.path.join(d, "out.mp4")

            rc = make_route.main([
                "--map", os.path.join(d, "map.png"),
                "--places", places_path,
                "--name", route_name,
                "--out", out,
                "--waypoints", wp_path,
                "--routes-dir", d,
                "--check",
            ])
            self.assertEqual(rc, 1)
            # the rejected route JSON lands in tmp, never the source tree
            tmp_route = os.path.join(d, "routes", route_name + ".json")
            self.assertTrue(os.path.exists(tmp_route))
            self.assertFalse(os.path.exists(out),
                             "render must not run when --check fails")

    def test_name_traversal_rejected(self):
        from slideforge.tools import make_route
        from slideforge import routes as routes_mod

        routes_dir = os.path.dirname(routes_mod.__file__)
        escape = os.path.join(os.path.dirname(routes_dir), "evil.json")
        self.addCleanup(lambda: os.path.exists(escape)
                        and os.unlink(escape))
        with tempfile.TemporaryDirectory() as d:
            places_path = os.path.join(d, "places.json")
            with open(places_path, "w") as f:
                json.dump({"title": "T", "places": []}, f)
            for bad in ("../../evil", "..\\..\\evil", "..", ""):
                rc = make_route.main([
                    "--map", os.path.join(d, "map.png"),
                    "--places", places_path,
                    "--name", bad,
                    "--out", os.path.join(d, "out.mp4"),
                ])
                self.assertEqual(rc, 1, bad)
                self.assertFalse(os.path.exists(escape), bad)


if __name__ == "__main__":
    unittest.main()
