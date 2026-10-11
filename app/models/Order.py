"""Order Model."""
from masoniteorm.models import Model
from masoniteorm.relationships import belongs_to

# How long a buyer holds a ticket while checking out.
RESERVATION_MINUTES = 10


class Order(Model):
    """A buyer's purchase of one listing."""

    __fillable__ = [
        "listing_id", "buyer_id", "status", "amount_cents", "currency",
        "payment_provider", "payment_ref", "expires_at", "paid_at",
    ]
    __dates__ = ["expires_at", "paid_at"]

    @belongs_to("listing_id", "id")
    def listing(self):
        from app.models.Listing import Listing

        return Listing

    def to_api(self, viewer=None):
        return {
            "id": self.id,
            "status": self.status,
            "amount_cents": self.amount_cents,
            "currency": self.currency,
            "expires_at": self.expires_at.to_iso8601_string() if self.expires_at else None,
            "paid_at": self.paid_at.to_iso8601_string() if self.paid_at else None,
            "listing": self.listing.to_api(viewer),
            "can_download": self.status == "paid",
        }
