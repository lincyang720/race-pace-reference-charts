import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))
import racepace as rp  # noqa: E402


class RacePaceTests(unittest.TestCase):
    def test_marathon_in_miles(self):
        self.assertAlmostEqual(rp.DISTANCES_M["marathon"] / rp.MILE_M, 26.2188, places=4)

    def test_worked_examples(self):
        # 10K in 50:00 -> about 8:03 per mile
        self.assertEqual(rp.fmt_time(rp.pace_per_unit(3000, 10000, "mi")), "8:03")
        # 9:00/mi half marathon -> 1:57:59
        self.assertEqual(rp.fmt_time(rp.finish_time(540, rp.DISTANCES_M["half"], "mi")), "1:57:59")
        # 7:00/mi marathon: 420 s x 26.21876 mi = 11011.88 s -> 3:03:32
        self.assertEqual(rp.fmt_time(rp.finish_time(420, rp.DISTANCES_M["marathon"], "mi")), "3:03:32")

    def test_marathon_goal_pace(self):
        # 3:00:00 marathon -> 4:16/km, 6:52/mi
        self.assertEqual(rp.fmt_time(rp.pace_per_unit(10800, 42195, "km")), "4:16")
        self.assertEqual(rp.fmt_time(rp.pace_per_unit(10800, 42195, "mi")), "6:52")

    def test_run_walk_is_harmonic(self):
        # 3 min at 6:00/km + 1 min at 10:00/km = 0.5 + 0.1 km in 4 min -> 6:40/km
        self.assertEqual(rp.fmt_time(rp.run_walk_average(3, 1, 360, 600)), "6:40")

    def test_riegel_identity(self):
        self.assertAlmostEqual(rp.riegel(1500, 5000, 5000), 1500)

    def test_splits_end_at_finish(self):
        s = rp.splits(3600, 10000, "mi")
        self.assertAlmostEqual(s[-1][0], 10000)
        self.assertAlmostEqual(s[-1][1], 3600)


if __name__ == "__main__":
    unittest.main()
