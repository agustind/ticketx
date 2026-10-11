from tests.TestCase import TestCase


class TestWelcome(TestCase):
    def test_health(self):
        self.get("/health").assertOk().assertJson({"status": "ok"})

    def test_session_is_anonymous(self):
        self.get("/api/session").assertOk().assertJson({"user": None})

    def test_unknown_api_path_is_json_404(self):
        self.get("/api/does-not-exist").assertNotFound()
