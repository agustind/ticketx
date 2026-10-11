from masonite.controllers import Controller
from masonite.request import Request
from masonite.response import Response


class SessionController(Controller):
    def show(self, request: Request, response: Response):
        user = request.user()
        return response.json(
            {
                "user": user.to_api() if user else None,
                # VerifyCsrfToken accepts the session id as the token (see its create_token).
                "csrf_token": request.cookie("SESSID"),
            }
        )
