import unittest

import numpy as np

from slideforge import transitions as T
from slideforge.plugins import transition_registry


def _frames():
    a = np.zeros((100, 160, 3), dtype=np.uint8)
    b = np.full((100, 160, 3), 255, dtype=np.uint8)
    return a, b


class TestTransitions(unittest.TestCase):
    def test_all_registered_callable(self):
        a, b = _frames()
        for name in transition_registry.names():
            fn = transition_registry.get(name)
            out = fn(a, b, 0.5)
            self.assertEqual(out.shape, a.shape, name)
            self.assertEqual(out.dtype, np.uint8, name)

    def test_crossfade_endpoints(self):
        a, b = _frames()
        np.testing.assert_array_equal(T.crossfade(a, b, 0.0), a)
        np.testing.assert_array_equal(T.crossfade(a, b, 1.0), b)
        mid = T.crossfade(a, b, 0.5)
        self.assertTrue(np.all(mid == 127) or np.all(mid == 128))

    def test_dip_goes_through_black(self):
        a, b = _frames()
        start = T.dip_to_black(a, b, 0.0)
        middle = T.dip_to_black(a, b, 0.5)
        end = T.dip_to_black(a, b, 1.0)
        np.testing.assert_array_equal(start, a)
        np.testing.assert_array_equal(end, b)
        self.assertLess(middle.mean(), 128)  # dips, not blends

    def test_wipe_progresses(self):
        a, b = _frames()
        w0 = T.wipe(a, b, 0.0)
        w1 = T.wipe(a, b, 1.0)
        np.testing.assert_array_equal(w0, a)
        np.testing.assert_array_equal(w1, b)

    def test_backwards_compat_dict(self):
        self.assertEqual(set(T.TRANSITIONS),
                         set(transition_registry.names()))

    def test_backwards_compat_map_is_live(self):
        from slideforge.plugins import transition

        @transition("test-tmp-live")
        def _tmp(a, b, k):
            return b

        try:
            self.assertIn("test-tmp-live", T.TRANSITIONS)
            self.assertIs(T.TRANSITIONS["test-tmp-live"], _tmp)
        finally:
            del transition_registry._d["test-tmp-live"]


if __name__ == "__main__":
    unittest.main()
