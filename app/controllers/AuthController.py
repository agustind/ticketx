import re

from masonite.authentication import Auth
from masonite.controllers import Controller
from masonite.request import Request
from masonite.response import Response

from app.models.User import User
from app.services.api import ApiError, api, require_user

EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AuthController(Controller):
    @api
    def register(self, request: Request, response: Response, auth: Auth):
        name = (request.input("name") or "").strip()
        email = (request.input("email") or "").strip().lower()
        password = request.input("password") or ""

        errors = {}
        if not name:
            errors["name"] = "Name is required."
        if not EMAIL.match(email):
            errors["email"] = "Enter a valid email address."
        elif User.where("email", email).first():
            errors["email"] = "An account with this email already exists."
        if len(password) < 8:
            errors["password"] = "Password must be at least 8 characters."
        if errors:
            raise ApiError(422, "Please fix the highlighted fields.", errors)

        user = auth.register({"name": name, "email": email, "password": password})
        if not user:
            raise ApiError(422, "Could not create the account.")
        return response.json({"user": user.to_api()}, status=201)

    @api
    def login(self, request: Request, response: Response, auth: Auth):
        email = (request.input("email") or "").strip().lower()
        user = auth.attempt(email, request.input("password") or "")
        if not user:
            raise ApiError(422, "Email or password is incorrect.", {"email": "Email or password is incorrect."})
        return response.json({"user": user.to_api()})

    @api
    def logout(self, request: Request, response: Response, auth: Auth):
        user = require_user(request)
        # Rotate the remember token so a copied cookie stops working too.
        user.set_remember_token().save()
        auth.logout()
        return response.json({"ok": True})
