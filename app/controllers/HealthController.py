from masonite.controllers import Controller
from masonite.response import Response


class HealthController(Controller):
    def show(self, response: Response):
        return response.json({"status": "ok"})
