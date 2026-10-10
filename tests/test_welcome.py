from tests.TestCase import TestCase


class TestWelcome(TestCase):
    def test_welcome_page(self):
        self.get("/").assertOk().assertContains("Masonite")
