"""Ticket Model."""
from masoniteorm.models import Model


class Ticket(Model):
    """Ticket Model."""

    STATUSES = ["open", "in_progress", "closed"]

    __fillable__ = ["title", "description", "status"]
