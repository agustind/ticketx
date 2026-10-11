import os

from masonite.controllers import Controller
from masonite.response import Response
from masonite.utils.location import base_path

# Built by `npm run build` in frontend/ (see frontend/vite.config.ts).
INDEX = base_path("storage/compiled/app/index.html")


class SpaController(Controller):
    def show(self, response: Response):
        """Serve the React app for every non-API path; React Router takes it from there."""
        if not os.path.exists(INDEX):
            return response.view("The frontend isn't built yet. Run `npm run build` in frontend/.", status=503)
        with open(INDEX, "rb") as f:
            content = f.read()
        response.header("Content-Type", "text/html; charset=utf-8")
        response.header("Cache-Control", "no-cache")
        return response.view(content)

    def api_not_found(self, response: Response):
        return response.json({"message": "Not found.", "errors": {}}, status=404)
