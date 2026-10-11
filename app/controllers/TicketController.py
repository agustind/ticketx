from masonite.controllers import Controller
from masonite.request import Request
from masonite.response import Response
from masonite.views import View

from masoniteorm.exceptions import ModelNotFound

from app.models.Ticket import Ticket


class TicketController(Controller):
    def index(self, view: View):
        tickets = Ticket.order_by("id", "desc").get()
        return view.render("tickets.index", {"tickets": tickets})

    def create(self, view: View):
        return self._form(view, Ticket(), {})

    def store(self, view: View, request: Request, response: Response):
        data, errors = self._validated(request)
        if errors:
            return self._form(view, Ticket().fill(data), errors)
        ticket = Ticket.create(data)
        return response.redirect(f"/tickets/{ticket.id}")

    def show(self, view: View, request: Request):
        ticket = self._find(request)
        return view.render("tickets.show", {"ticket": ticket})

    def edit(self, view: View, request: Request):
        ticket = self._find(request)
        return self._form(view, ticket, {})

    def update(self, view: View, request: Request, response: Response):
        ticket = self._find(request)
        data, errors = self._validated(request)
        if errors:
            return self._form(view, ticket.fill(data), errors)
        ticket.update(data)
        return response.redirect(f"/tickets/{ticket.id}")

    def destroy(self, request: Request, response: Response):
        self._find(request).delete()
        return response.redirect("/tickets")

    def _find(self, request):
        # Non-numeric ids would otherwise reach Postgres and fail as a 500.
        ticket_id = request.param("id")
        if not str(ticket_id).isdigit():
            raise ModelNotFound()
        return Ticket.find_or_fail(int(ticket_id))

    def _form(self, view, ticket, errors):
        return view.render(
            "tickets.form",
            {"ticket": ticket, "form_errors": errors, "statuses": Ticket.STATUSES},
        )

    def _validated(self, request):
        data = {
            "title": (request.input("title") or "").strip(),
            "description": (request.input("description") or "").strip() or None,
            "status": request.input("status") or "open",
        }
        errors = {}
        if not data["title"]:
            errors["title"] = "Title is required."
        elif len(data["title"]) > 255:
            errors["title"] = "Title must be 255 characters or fewer."
        if data["status"] not in Ticket.STATUSES:
            errors["status"] = "Pick a valid status."
        return data, errors
