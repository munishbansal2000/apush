import unittest

from slideforge import cli


class TestFetchArgs(unittest.TestCase):
    def test_fetch_no_args_returns_usage_error(self):
        self.assertEqual(cli.main(["fetch"]), 2)

    def test_fetch_title_without_out_returns_usage_error(self):
        self.assertEqual(cli.main(["fetch", "--title", "File:X.jpg"]), 2)


if __name__ == "__main__":
    unittest.main()
