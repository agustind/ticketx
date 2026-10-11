import hashlib
import io
import json
import uuid

import pendulum
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from masonite.configuration import config
from masonite.controllers import Controller
from masonite.request import Request
from masonite.response import Response

from app.models.Event import Event
from app.models.Listing import Listing
from app.services.api import ApiError, api, find_or_404, require_user
from app.services.marketplace import match_event, parse_starts_at
from app.services.ticket_reader import TicketDetails, TicketReaderUnavailable, read_ticket
from app.services.ticket_storage import TicketStorage

# Listings that still hold a ticket (a cancelled one has given it up).
ACTIVE = ["draft", "listed", "reserved", "sold"]


def pdf_response(response, content, filename):
    response.header("Content-Type", "application/pdf")
    response.header("Content-Disposition", f'attachment; filename="{filename}"')
    response.header("Cache-Control", "private, no-store")
    response.header("X-Content-Type-Options", "nosniff")
    return response.view(content)


class ListingsController(Controller):
    @api
    def store(self, request: Request, response: Response):
        user = require_user(request)

        hour_ago = pendulum.now("UTC").subtract(hours=1).to_datetime_string()
        recent = Listing.where("seller_id", user.id).where("created_at", ">=", hour_ago).count()
        if recent >= config("tickets.uploads_per_hour"):
            raise ApiError(429, "You've uploaded a lot of tickets. Try again in an hour.")

        content = self._validated_pdf(request.input("file"))
        digest = hashlib.sha256(content).hexdigest()

        existing = Listing.where("pdf_sha256", digest).first()
        if existing:
            if existing.status != "cancelled" or existing.seller_id != user.id:
                raise ApiError(422, "This ticket has already been uploaded.", {"file": "Already uploaded."})
            # The seller cancelled this exact file before; let them upload it again.
            existing.delete()

        try:
            details = read_ticket(content)
        except TicketReaderUnavailable:
            raise ApiError(503, "We can't read tickets right now. Please try again in a few minutes.")
        except ValueError as e:
            raise ApiError(422, str(e), {"file": str(e)})

        if not details.is_ticket:
            message = details.notes or "This doesn't look like an event ticket."
            raise ApiError(422, message, {"file": message})

        barcode = (details.barcode or "").strip() or None
        if barcode and Listing.where("barcode", barcode).where_in("status", ACTIVE).first():
            raise ApiError(422, "This ticket is already on ticketex.", {"file": "Already listed."})

        key = f"{user.id}/{uuid.uuid4().hex}.pdf"
        TicketStorage().put(key, content)

        face_value = details.face_value_cents if (details.face_value_cents or 0) > 0 else None
        currency = (details.currency or "EUR").upper()
        listing = Listing.create(
            {
                "seller_id": user.id,
                "status": "draft",
                "ticket_type": details.ticket_type,
                "seat": details.seat,
                "face_value_cents": face_value,
                # A face value read from the ticket can't be raised by the seller,
                # otherwise the 120% price cap would be meaningless.
                "face_value_locked": face_value is not None,
                "currency": currency if len(currency) == 3 else "EUR",
                "pdf_key": key,
                "pdf_sha256": digest,
                "barcode": barcode,
                "extraction": details.model_dump_json(),
            }
        )
        listing = Listing.find(listing.id)

        starts_at = parse_starts_at(details.starts_at)
        matched = match_event(details.event_name, starts_at)
        return response.json(
            {
                "listing": listing.to_api(user),
                "extraction": self._public_extraction(details),
                "matched_event": matched.to_api() if matched else None,
            },
            status=201,
        )

    @api
    def show(self, request: Request, response: Response, id: str):
        """The seller's own listing, with what was read from the ticket (for the confirm step)."""
        user = require_user(request)
        listing = self._own_listing(user, id)
        extraction, matched = None, None
        if listing.extraction:
            details = TicketDetails.model_validate_json(listing.extraction)
            extraction = self._public_extraction(details)
            if listing.status == "draft":
                found = match_event(details.event_name, parse_starts_at(details.starts_at))
                matched = found.to_api() if found else None
        return response.json({"listing": listing.to_api(user), "extraction": extraction, "matched_event": matched})

    @api
    def publish(self, request: Request, response: Response, id: str):
        user = require_user(request)
        listing = self._own_listing(user, id)
        if listing.status != "draft":
            raise ApiError(409, "This ticket has already been published.")

        errors = {}
        event = self._event_from_input(request, user, errors)

        face_value = listing.face_value_cents
        if not listing.face_value_locked:
            face_value = _positive_int(request.input("face_value_cents"))
            if not face_value:
                errors["face_value_cents"] = "Enter the price printed on the ticket."

        price = _positive_int(request.input("price_cents"))
        max_price = Listing.max_price_for(face_value)
        if not price:
            errors["price_cents"] = "Enter a price."
        elif max_price is not None and price > max_price:
            errors["price_cents"] = "The price can be at most 120% of the face value."

        if errors:
            raise ApiError(422, "Please fix the highlighted fields.", errors)

        listing.update(
            {
                "event_id": event.id,
                "ticket_type": _text(request.input("ticket_type")),
                "seat": _text(request.input("seat")),
                "face_value_cents": face_value,
                "price_cents": price,
                "status": "listed",
            }
        )
        return response.json({"listing": Listing.find(listing.id).to_api(user)})

    @api
    def destroy(self, request: Request, response: Response, id: str):
        user = require_user(request)
        listing = self._own_listing(user, id)
        if listing.status not in ("draft", "listed"):
            raise ApiError(409, "This ticket is being bought or has been sold, so it can't be removed.")
        listing.update({"status": "cancelled"})
        # The PDF is the ticket; don't keep it once the seller has withdrawn it.
        TicketStorage().delete(listing.pdf_key)
        return response.json({"listing": Listing.find(listing.id).to_api(user)})

    @api
    def pdf(self, request: Request, response: Response, id: str):
        user = require_user(request)
        listing = self._own_listing(user, id)
        if listing.status == "cancelled":
            raise ApiError(404, "This ticket was removed.")
        return pdf_response(response, TicketStorage().get(listing.pdf_key), f"ticket-{listing.id}.pdf")

    @api
    def mine(self, request: Request, response: Response):
        user = require_user(request)
        listings = (
            Listing.with_("event", "seller")
            .where("seller_id", user.id)
            .where("status", "!=", "cancelled")
            .order_by("id", "desc")
            .get()
        )
        return response.json({"listings": [listing.to_api(user) for listing in listings]})

    def _own_listing(self, user, id):
        listing = find_or_404(Listing, id, "Ticket not found.")
        if listing.seller_id != user.id:
            # Same answer as "missing" so ids of other people's tickets aren't confirmed.
            raise ApiError(404, "Ticket not found.")
        return listing

    def _validated_pdf(self, upload):
        if isinstance(upload, list):
            upload = upload[0] if upload else None
        if upload is None or not hasattr(upload, "get_content"):
            raise ApiError(422, "Choose a PDF to upload.", {"file": "Choose a PDF to upload."})
        content = upload.get_content()
        if len(content) > config("tickets.max_pdf_bytes"):
            raise ApiError(422, "The PDF must be 10 MB or smaller.", {"file": "Max 10 MB."})
        if not content.startswith(b"%PDF"):
            raise ApiError(422, "Only PDF tickets are supported.", {"file": "Not a PDF."})
        try:
            reader = PdfReader(io.BytesIO(content))
            if reader.is_encrypted:
                raise ApiError(422, "Password-protected PDFs aren't supported.", {"file": "PDF is encrypted."})
            pages = len(reader.pages)
        except PdfReadError:
            raise ApiError(422, "We couldn't open this PDF.", {"file": "Unreadable PDF."})
        if pages > config("tickets.max_pdf_pages"):
            raise ApiError(422, "Upload one ticket at a time (max 10 pages).", {"file": "Too many pages."})
        return content

    def _event_from_input(self, request, user, errors):
        event_id = request.input("event_id")
        if event_id:
            event = Event.find(int(event_id)) if str(event_id).isdigit() else None
            if not event:
                errors["event_id"] = "Pick an event."
            return event

        data = request.input("event") or {}
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except ValueError:
                data = {}
        name = _text(data.get("name"))
        if not name:
            errors["event.name"] = "Event name is required."
            return None
        starts_at = parse_starts_at(data.get("starts_at"))
        if data.get("starts_at") and not starts_at:
            errors["event.starts_at"] = "Enter a valid date."
            return None

        # Someone may have created the same event since this ticket was read.
        existing = match_event(name, starts_at)
        if existing:
            return existing
        return Event.create(
            {
                "slug": Event.slug_for(name, starts_at),
                "name": name,
                "starts_at": starts_at.to_datetime_string() if starts_at else None,
                "venue": _text(data.get("venue")),
                "city": _text(data.get("city")),
                "created_by": user.id,
            }
        )

    def _public_extraction(self, details):
        data = details.model_dump()
        data.pop("barcode", None)
        return data


def _positive_int(value):
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def _text(value, limit=255):
    value = (value or "").strip() if isinstance(value, str) else None
    return value[:limit] if value else None
