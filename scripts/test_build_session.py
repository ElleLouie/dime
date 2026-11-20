import unittest

from build_session import _near_lane, make_rate, score_option, shot_value


class ScoringTest(unittest.TestCase):
    def test_three_point_line(self):
        self.assertEqual(shot_value(24, 20, 25), 3)
        self.assertEqual(shot_value(22, 5, 1), 3)  # corner three
        self.assertEqual(shot_value(15, 10, 25), 2)

    def test_shooters_shoot_better_threes(self):
        self.assertGreater(make_rate(24, 3, 'Klay Thompson'), make_rate(24, 3, 'Andrew Bogut'))
        self.assertLess(make_rate(32, 3, 'Stephen Curry'), make_rate(24, 3, 'Stephen Curry'))

    def test_lane_blocked_by_a_defender_in_the_way(self):
        self.assertTrue(_near_lane((0, 0), (20, 0), (10, 1)))
        self.assertFalse(_near_lane((0, 0), (20, 0), (10, 8)))
        self.assertFalse(_near_lane((0, 0), (20, 0), (19.5, 0.5)))  # guarding the receiver isn't blocking the pass

    def test_open_shooter_beats_covered_one(self):
        hoop = (5.25, 25)
        open_three = score_option((5.25, 1), hoop, [(20, 25)], (30, 25), 'Klay Thompson')
        covered = score_option((5.25, 49), hoop, [(6, 48)], (30, 25), 'Klay Thompson')
        self.assertGreater(open_three['points'], covered['points'])


if __name__ == '__main__':
    unittest.main()
