// Mirrors docs/api.md. Keep in sync with the backend.

export type User = { id: number; name: string; email: string }

export type Event = {
  id: number
  slug: string
  name: string
  starts_at: string | null
  venue: string | null
  city: string | null
  available_count: number
  min_price_cents: number | null
  currency: string
}

export type ListingStatus = "draft" | "listed" | "reserved" | "sold" | "cancelled"

export type Listing = {
  id: number
  status: ListingStatus
  event: Event | null
  ticket_type: string | null
  seat: string | null
  face_value_cents: number | null
  face_value_locked: boolean
  price_cents: number | null
  max_price_cents: number | null
  currency: string
  seller_name: string
  is_mine: boolean
  created_at: string
}

export type Extraction = {
  is_ticket: boolean
  event_name: string | null
  starts_at: string | null
  venue: string | null
  city: string | null
  ticket_type: string | null
  seat: string | null
  face_value_cents: number | null
  currency: string | null
  notes: string | null
}

export type OrderStatus = "pending" | "paid" | "expired" | "cancelled"

export type Order = {
  id: number
  status: OrderStatus
  amount_cents: number
  currency: string
  expires_at: string | null
  paid_at: string | null
  listing: Listing
  can_download: boolean
}

export type UploadResult = {
  listing: Listing
  extraction: Extraction
  matched_event: Event | null
}

export type PublishPayload = {
  event_id?: number
  event?: { name: string; starts_at: string | null; venue: string | null; city: string | null }
  ticket_type: string | null
  seat: string | null
  face_value_cents: number | null
  price_cents: number
}
