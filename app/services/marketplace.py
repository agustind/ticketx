"""Marketplace rules shared by the controllers."""
import difflib
import re

import pendulum

from masoniteorm.query import QueryBuilder

from config.database import DB
from app.models.Event import Event

# Ticket times are printed in local time; the market is Dutch.
DEFAULT_TZ = "Europe/Amsterdam"
MATCH_THRESHOLD = 0.85


def parse_starts_at(value):
    """Parse an ISO date or local date-time into UTC; None if missing or invalid."""
    if not value:
        return None
    try:
        parsed = pendulum.parse(value, tz=DEFAULT_TZ)
    except (ValueError, pendulum.parsing.exceptions.ParserError):
        return None
    return parsed.in_timezone("UTC")


def _normalize(name):
    return re.sub(r"[^a-z0-9]+", " ", (name or "").lower()).strip()


def match_event(name, starts_at):
    """Find the existing event this ticket belongs to, or None.

    Candidates are events on the same local calendar day (or, if the ticket has no
    date, undated events); the closest name above MATCH_THRESHOLD wins.
    """
    if not name:
        return None
    if starts_at:
        local = starts_at.in_timezone(DEFAULT_TZ)
        day_start = local.start_of("day").in_timezone("UTC")
        day_end = local.end_of("day").in_timezone("UTC")
        query = Event.where("starts_at", ">=", day_start.to_datetime_string()).where(
            "starts_at", "<=", day_end.to_datetime_string()
        )
    else:
        query = Event.where_null("starts_at")

    target = _normalize(name)
    best, best_score = None, 0.0
    for event in query.get():
        score = difflib.SequenceMatcher(None, target, _normalize(event.name)).ratio()
        if score > best_score:
            best, best_score = event, score
    return best if best_score >= MATCH_THRESHOLD else None


def release_expired_reservations():
    """Expire unpaid orders past their deadline and put their tickets back on sale."""
    now = pendulum.now("UTC").to_datetime_string()
    with DB.transaction():
        QueryBuilder().table("listings").where("status", "reserved").where(
            "reserved_until", "<", now
        ).update({"status": "listed", "buyer_id": None, "reserved_until": None, "updated_at": now})
        QueryBuilder().table("orders").where("status", "pending").where(
            "expires_at", "<", now
        ).update({"status": "expired", "updated_at": now})


def event_summaries(events):
    """Attach available ticket count and lowest price to each event."""
    if not events:
        return []
    rows = (
        QueryBuilder()
        .table("listings")
        .select_raw("event_id, COUNT(*) AS n, MIN(price_cents) AS min_price, MIN(currency) AS currency")
        .where("status", "listed")
        .where_in("event_id", [e.id for e in events])
        .group_by("event_id")
        .get()
    )
    stats = {r["event_id"]: r for r in rows}
    return [
        e.to_api(
            available_count=int(stats[e.id]["n"]) if e.id in stats else 0,
            min_price_cents=stats[e.id]["min_price"] if e.id in stats else None,
            currency=stats[e.id]["currency"] if e.id in stats else "EUR",
        )
        for e in events
    ]
