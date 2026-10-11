"""Ticket marketplace config: PDF storage and ticket reading."""
from masonite.environment import env

# Private object storage for ticket PDFs. When TICKETS_BUCKET is unset (local dev),
# PDFs are written to storage/private/tickets instead.
BUCKET = env("TICKETS_BUCKET", None)
BUCKET_ENDPOINT = env("TICKETS_BUCKET_ENDPOINT", None)
BUCKET_REGION = env("TICKETS_BUCKET_REGION", "auto")
BUCKET_ACCESS_KEY_ID = env("TICKETS_BUCKET_ACCESS_KEY_ID", None)
BUCKET_SECRET_ACCESS_KEY = env("TICKETS_BUCKET_SECRET_ACCESS_KEY", None)

# Claude reads uploaded PDFs to identify the event. Unset -> uploads return 503.
ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY", None)
READER_MODEL = env("TICKET_READER_MODEL", "claude-opus-5-5")

MAX_PDF_BYTES = 10 * 1024 * 1024
MAX_PDF_PAGES = 10
UPLOADS_PER_HOUR = 20
