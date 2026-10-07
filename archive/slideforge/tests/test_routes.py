import json
import os
import tempfile
import unittest

from slideforge import routes, validate


class TestRoutes(unittest.TestCase):
    def test_list_routes(self):
        names = routes.list_routes()
        self.assertIn("columbus_1492", names)
        self.assertIn("cortes_1519", names)
        self.assertIn("narvaez_1528", names)

    def test_load_route_by_name(self):
        d = routes.load_route("columbus_1492")
        self.assertEqual(len(d["waypoints"]), 3)
        self.assertTrue(os.path.exists(d["map"]))

    def test_load_route_missing_map_raises(self):
        with tempfile.NamedTemporaryFile("w", suffix=".json",
                                         delete=False) as f:
            json.dump({"map": "nope.jpg", "title": "x",
                       "waypoints": [{"at": [0.1, 0.1], "label": "A"},
                                     {"at": [0.2, 0.2], "label": "B"}]}, f)
            path = f.name
        try:
            with self.assertRaises(FileNotFoundError):
                routes.load_route(path)
        finally:
            os.unlink(path)

    def test_validate_good_route(self):
        self.assertEqual(validate.route("columbus_1492"), [])

    def test_validate_missing_file(self):
        issues = validate.route("/tmp/sf-test-nope.json")
        self.assertTrue(any("not found" in i for i in issues), issues)

    def test_validate_bad_json(self):
        with tempfile.NamedTemporaryFile("w", suffix=".json",
                                         delete=False) as f:
            f.write("{not json")
            path = f.name
        try:
            issues = validate.route(path)
            self.assertTrue(any("invalid JSON" in i for i in issues), issues)
        finally:
            os.unlink(path)

    def test_validate_schema_problems(self):
        bad = {"map": "assets/maps/america_gutierrez_1562.jpg",
               "waypoints": [{"at": [1.5, 0.2], "label": ""},
                             {"at": "x", "label": "B"},
                             {"label": "C"}]}
        issues = routes.validate_route_data(bad)
        self.assertTrue(any("outside the 0..1 map range" in i for i in issues), issues)
        self.assertTrue(any("no label" in i for i in issues), issues)
        self.assertTrue(any("[x, y] pair" in i for i in issues), issues)

    def test_validate_too_few_waypoints(self):
        issues = routes.validate_route_data(
            {"map": "m.jpg", "waypoints": [{"at": [0.1, 0.1], "label": "A"}]})
        self.assertTrue(any(">= 2 waypoints" in i for i in issues), issues)

    def test_validate_missing_keys(self):
        issues = routes.validate_route_data({"title": "x"})
        self.assertTrue(any("missing required key" in i for i in issues),
                        issues)


if __name__ == "__main__":
    unittest.main()
