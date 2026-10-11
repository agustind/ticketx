import pendulum
from masonite.controllers import Controller
from masonite.request import Request
from masonite.response import Response

from config.database import DB
from app.controllers.ListingsController import ticket_file_response
from app.models.Listing import Listing
from app.models.Order import RESERVATION_MINUTES, Order
from app.services.api import ApiError, api, find_or_404, require_user
from app.services.marketplace import release_expired_reservations
from app.services.payments import payment_provider


class OrdersController(Controller):
    @api
    def store(self, request: Request, response: Response):
        user = require_user(request)
        release_expired_reservations()
        listing_id = request.input("listing_id")
        find_or_404(Listing, listing_id, "Ticket not found.")

        with DB.transaction():
            # Row lock: two buyers clicking at once can't both reserve the ticket.
            listing = Listing.where("id", int(listing_id)).lock_for_update().first()
            if listing.seller_id == user.id:
                raise ApiError(422, "You can't buy your own ticket.")
            if listing.status != "listed":
                raise ApiError(409, "This ticket is no longer available.")

            expires_at = pendulum.now("UTC").add(minutes=RESERVATION_MINUTES).to_datetime_string()
            listing.update({"status": "reserved", "buyer_id": user.id, "reserved_until": expires_at})
            order = Order.create(
                {
                    "listing_id": listing.id,
                    "buyer_id": user.id,
                    "status": "pending",
                    "amount_cents": listing.price_cents,
                    "currency": listing.currency,
                    "expires_at": expires_at,
                }
            )
        return response.json({"order": Order.find(order.id).to_api(user)}, status=201)

    @api
    def show(self, request: Request, response: Response, id: str):
        user = require_user(request)
        release_expired_reservations()
        return response.json({"order": self._own_order(user, id).to_api(user)})

    @api
    def pay(self, request: Request, response: Response, id: str):
        user = require_user(request)
        self._own_order(user, id)

        with DB.transaction():
            order = Order.where("id", int(id)).lock_for_update().first()
            if order.status == "paid":
                return response.json({"order": order.to_api(user)})
            if order.status != "pending" or order.expires_at < pendulum.now("UTC"):
                raise ApiError(409, "Your reservation expired. The ticket may still be available.")

            listing = Listing.where("id", order.listing_id).lock_for_update().first()
            if listing.status != "reserved" or listing.buyer_id != user.id:
                raise ApiError(409, "Your reservation expired. The ticket may still be available.")

            provider = payment_provider()
            result = provider.charge(order)
            if not result.ok:
                raise ApiError(402, result.error or "The payment didn't go through.")

            now = pendulum.now("UTC").to_datetime_string()
            order.update(
                {"status": "paid", "paid_at": now, "payment_provider": provider.name, "payment_ref": result.reference}
            )
            listing.update({"status": "sold", "reserved_until": None})
        return response.json({"order": Order.find(order.id).to_api(user)})

    @api
    def mine(self, request: Request, response: Response):
        user = require_user(request)
        release_expired_reservations()
        orders = (
            Order.where("buyer_id", user.id)
            .where_in("status", ["pending", "paid"])
            .order_by("id", "desc")
            .get()
        )
        return response.json({"orders": [order.to_api(user) for order in orders]})

    @api
    def ticket(self, request: Request, response: Response, id: str):
        user = require_user(request)
        order = self._own_order(user, id)
        if order.status != "paid":
            raise ApiError(403, "The ticket is available once the order is paid.")
        return ticket_file_response(response, order.listing, f"ticket-{order.id}")

    def _own_order(self, user, id):
        order = find_or_404(Order, id, "Order not found.")
        if order.buyer_id != user.id:
            raise ApiError(404, "Order not found.")
        return order
