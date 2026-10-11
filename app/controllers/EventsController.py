import pendulum
from masonite.controllers import Controller
from masonite.request import Request
from masonite.response import Response

from app.models.Event import Event
from app.models.Listing import Listing
from app.services.api import ApiError, api
from app.services.marketplace import event_summaries, release_expired_reservations


class EventsController(Controller):
    @api
    def index(self, request: Request, response: Response):
        release_expired_reservations()
        # Hide events that ended more than a day ago; undated events stay visible.
        cutoff = pendulum.now("UTC").subtract(days=1).to_datetime_string()
        query = Event.where(lambda q: q.where("starts_at", ">=", cutoff).or_where_null("starts_at"))
        # Strip LIKE wildcards from the search text; "?" placeholders work on SQLite and Postgres.
        q = (request.input("q") or "").strip().lower().replace("%", "").replace("_", "")
        if q:
            like = f"%{q}%"
            query = query.where_raw(
                "(LOWER(name) LIKE ? OR LOWER(venue) LIKE ? OR LOWER(city) LIKE ?)", (like, like, like)
            )
        events = query.order_by("starts_at", "asc").limit(100).get()
        dated = [e for e in events if e.starts_at] + [e for e in events if not e.starts_at]
        return response.json({"events": event_summaries(dated)})

    @api
    def show(self, request: Request, response: Response, slug: str):
        release_expired_reservations()
        event = Event.where("slug", slug).first()
        if not event:
            raise ApiError(404, "Event not found.")
        listings = (
            Listing.with_("seller", "event")
            .where("event_id", event.id)
            .where("status", "listed")
            .order_by("price_cents", "asc")
            .get()
        )
        viewer = request.user() or None
        return response.json(
            {
                "event": event_summaries([event])[0],
                "listings": [listing.to_api(viewer) for listing in listings],
            }
        )
