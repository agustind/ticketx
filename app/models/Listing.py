"""Listing Model."""
import math

from masoniteorm.models import Model
from masoniteorm.relationships import belongs_to

# Resale price may not exceed this multiple of the ticket's face value.
PRICE_CAP = 1.2


class Listing(Model):
    """One uploaded ticket offered for sale by its seller.

    pdf_key / pdf_sha256 predate image support: they hold the storage key and upload
    hash of the ticket file whatever its type (see file_type).
    """

    __fillable__ = [
        "seller_id", "event_id", "buyer_id", "status", "ticket_type", "seat",
        "face_value_cents", "face_value_locked", "price_cents", "currency",
        "pdf_key", "pdf_sha256", "file_type", "barcode", "extraction", "reserved_until",
    ]
    __dates__ = ["reserved_until"]
    # Never serialize where the PDF lives or what its barcode is.
    __hidden__ = ["pdf_key", "pdf_sha256", "barcode", "extraction"]

    @belongs_to("event_id", "id")
    def event(self):
        from app.models.Event import Event

        return Event

    @belongs_to("seller_id", "id")
    def seller(self):
        from app.models.User import User

        return User

    @staticmethod
    def max_price_for(face_value_cents):
        if not face_value_cents:
            return None
        return math.floor(face_value_cents * PRICE_CAP)

    def to_api(self, viewer=None):
        seller = self.seller
        return {
            "id": self.id,
            "status": self.status,
            "event": self.event.to_api() if self.event else None,
            "ticket_type": self.ticket_type,
            "seat": self.seat,
            "face_value_cents": self.face_value_cents,
            "face_value_locked": bool(self.face_value_locked),
            "price_cents": self.price_cents,
            "max_price_cents": self.max_price_for(self.face_value_cents),
            "currency": self.currency,
            "file_type": self.file_type,
            # First name only: buyers don't need the seller's full name or email.
            "seller_name": (seller.name.split(" ")[0] if seller and seller.name else ""),
            "is_mine": bool(viewer and viewer.id == self.seller_id),
            "created_at": self.created_at.to_iso8601_string() if self.created_at else None,
        }
