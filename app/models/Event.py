"""Event Model."""
import re
import unicodedata

from masoniteorm.models import Model


class Event(Model):
    """An event that tickets are sold for. Created from the first uploaded ticket."""

    __fillable__ = ["slug", "name", "starts_at", "venue", "city", "created_by"]
    __dates__ = ["starts_at"]

    @staticmethod
    def slug_for(name, starts_at=None):
        text = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
        slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:80] or "event"
        if starts_at:
            slug = f"{slug}-{starts_at.strftime('%Y-%m-%d')}"
        base, n = slug, 2
        while Event.where("slug", slug).first():
            slug, n = f"{base}-{n}", n + 1
        return slug

    def to_api(self, available_count=0, min_price_cents=None, currency="EUR"):
        return {
            "id": self.id,
            "slug": self.slug,
            "name": self.name,
            "starts_at": _iso(self.starts_at),
            "venue": self.venue,
            "city": self.city,
            "available_count": available_count,
            "min_price_cents": min_price_cents,
            "currency": currency,
        }


def _iso(value):
    return value.to_iso8601_string() if value else None
