from masonite.tests import TestCase as MasoniteTestCase


class TestCase(MasoniteTestCase):
    def setUp(self):
        super().setUp()
