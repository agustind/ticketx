# ticketex API

JSON API served by Masonite under `/api`, consumed by the React app in `frontend/`.
Same origin as the app, so auth is the Masonite session cookie (no tokens in JS).

## Conventions

- Money is integer cents (`price_cents`, `face_value_cents`) plus a `currency` (ISO 4217, default `EUR`).
- Datetimes are ISO 8601 strings in UTC, or `null` when unknown.
- Every non-GET request must send the header `X-CSRF-TOKEN: <csrf_token>` from `GET /api/session`.
  Refresh it after login, logout and register.
- Errors: `{"message": "...", "errors": {"field": "message"}}` with status
  `401` (not logged in), `403` (not yours), `404`, `409` (state conflict, e.g. already sold),
  `422` (validation), `503` (ticket reading unavailable).

## Types

```ts
type User    = { id: number; name: string; email: string };
type Event   = { id: number; slug: string; name: string; starts_at: string | null;
                 venue: string | null; city: string | null;
                 available_count: number; min_price_cents: number | null; currency: string };
type Listing = { id: number; status: "draft" | "listed" | "reserved" | "sold" | "cancelled";
                 event: Event | null; ticket_type: string | null; seat: string | null;
                 face_value_cents: number | null; face_value_locked: boolean;
                 price_cents: number | null; max_price_cents: number | null; currency: string;
                 file_type: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
                 seller_name: string; is_mine: boolean; created_at: string };
type Extraction = { is_ticket: boolean; event_name: string | null; starts_at: string | null;
                    venue: string | null; city: string | null; ticket_type: string | null;
                    seat: string | null; face_value_cents: number | null; currency: string | null;
                    notes: string | null };
type Order   = { id: number; status: "pending" | "paid" | "expired" | "cancelled";
                 amount_cents: number; currency: string; expires_at: string | null;
                 paid_at: string | null; listing: Listing; can_download: boolean };
```

## Endpoints

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/session` | – | – | `{ user: User \| null, csrf_token: string }` |
| POST | `/api/auth/register` | – | `{ name, email, password }` (password ≥ 8) | `{ user }` |
| POST | `/api/auth/login` | – | `{ email, password }` | `{ user }` · 422 on bad credentials |
| POST | `/api/auth/logout` | user | – | `{ ok: true }` |
| GET | `/api/events?q=` | – | – | `{ events: Event[] }` upcoming first, then undated |
| GET | `/api/events/{slug}` | – | – | `{ event: Event, listings: Listing[] }` only `listed`, cheapest first |
| POST | `/api/listings` | user | multipart `file` (PDF, JPG, PNG or WebP, ≤ 10 MB) | 201 `{ listing: Listing, extraction: Extraction, matched_event: Event \| null }` |
| GET | `/api/listings/{id}` | seller | – | `{ listing, extraction: Extraction \| null, matched_event: Event \| null }` (for reloading the confirm step) |
| POST | `/api/listings/{id}/publish` | seller | `{ event_id?, event?: { name, starts_at, venue, city }, ticket_type, seat, face_value_cents, price_cents }` | `{ listing }` |
| DELETE | `/api/listings/{id}` | seller | – | `{ listing }` (cancelled; only draft/listed) |
| GET | `/api/listings/{id}/file` | seller | – | the ticket file (download) |
| GET | `/api/me/listings` | user | – | `{ listings: Listing[] }` |
| POST | `/api/orders` | user | `{ listing_id }` | 201 `{ order }` reserves the ticket for 10 minutes |
| GET | `/api/orders/{id}` | buyer | – | `{ order }` |
| POST | `/api/orders/{id}/pay` | buyer | – | `{ order }` simulated payment; listing becomes `sold` |
| GET | `/api/me/orders` | user | – | `{ orders: Order[] }` |
| GET | `/api/orders/{id}/ticket` | buyer, paid | – | the ticket file (download) |

## Rules

- Upload: a PDF, or a photo / screenshot (JPG, PNG, WebP), read by Claude. Not a ticket → 422.
  Same file uploaded twice → 422. The type is detected from the file contents, not its name.
  Images are re-saved without metadata (EXIF/GPS) before storing; the buyer gets that copy.
- Publish: either `event_id` (an existing event, usually `matched_event`) or `event` (creates one).
  `price_cents` must be > 0 and ≤ `max_price_cents` = 120% of face value.
  If the face value was read from the ticket, it is locked (`face_value_locked`); otherwise the seller enters it.
- Buying your own listing → 422. Listing not available → 409.
- A pending order expires after 10 minutes and the ticket goes back on sale.
- Payment is simulated (no real money) behind a payment interface, so a real provider can replace it later.
