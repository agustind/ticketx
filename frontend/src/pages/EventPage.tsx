import { CalendarDays, MapPin, TicketX } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"

import { DateBlock } from "@/components/EventCard"
import { Container, EmptyState, PageError, PageLoading } from "@/components/PageState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { firstName, formatDate, formatMoney, place } from "@/lib/format"
import type { Event, Listing } from "@/lib/types"

export function EventPage() {
  const { slug = "" } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [result, setResult] = useState<{
    slug: string
    data: { event: Event; listings: Listing[] } | null
    error: ApiError | null
  } | null>(null)
  const [buying, setBuying] = useState<number | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    api
      .event(slug)
      .then((res) => active && setResult({ slug, data: res, error: null }))
      .catch((e) =>
        active &&
        setResult({ slug, data: null, error: e instanceof ApiError ? e : new ApiError(0, "Couldn't load this event.") }),
      )
    return () => {
      active = false
    }
  }, [slug, reload])

  // Keep showing the previous listings while a reload for the same event is in flight.
  const current = result?.slug === slug ? result : null
  const data = current?.data ?? null
  const error = current?.error ?? null

  async function buy(listing: Listing) {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/events/${slug}`)}`)
      return
    }
    setBuying(listing.id)
    try {
      const { order } = await api.createOrder(listing.id)
      navigate(`/checkout/${order.id}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast.error("Someone just grabbed this ticket.")
        setReload((n) => n + 1)
      } else {
        toast.error(e instanceof ApiError ? e.message : "Couldn't start checkout.")
      }
    } finally {
      setBuying(null)
    }
  }

  if (error?.status === 404) {
    return (
      <Container className="max-w-xl">
        <EmptyState icon={<TicketX />} title="Event not found">
          <Link to="/" className="text-primary underline">Back to all events</Link>
        </EmptyState>
      </Container>
    )
  }
  if (error) return <PageError message={error.message} />
  if (!data) return <PageLoading />

  const { event, listings } = data
  const where = place(event.venue, event.city)

  return (
    <>
      <section className="border-b bg-gradient-to-b from-primary/10 to-transparent">
        <Container className="flex gap-4 sm:gap-6">
          <DateBlock iso={event.starts_at} />
          <div className="min-w-0 space-y-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight break-words sm:text-4xl">{event.name}</h1>
            <p className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="size-4 shrink-0" /> {formatDate(event.starts_at)}
            </p>
            {where && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0" /> {where}
              </p>
            )}
          </div>
        </Container>
      </section>

      <Container className="max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">
            {listings.length} {listings.length === 1 ? "ticket" : "tickets"} available
          </h2>
          <Button asChild variant="outline">
            <Link to="/sell">Sell yours</Link>
          </Button>
        </div>

        {listings.length === 0 ? (
          <EmptyState icon={<TicketX />} title="No tickets on sale right now">
            Check back later, or sell a ticket you can't use.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {listings.map((listing) => (
              <li key={listing.id}>
                <Card>
                  <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">{listing.ticket_type || "Ticket"}</p>
                      {listing.seat && <p className="text-sm text-muted-foreground">{listing.seat}</p>}
                      <p className="text-sm text-muted-foreground">
                        Sold by {firstName(listing.seller_name)}
                        {listing.face_value_cents !== null && (
                          <> · face value {formatMoney(listing.face_value_cents, listing.currency)}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span className="text-xl font-semibold">{formatMoney(listing.price_cents, listing.currency)}</span>
                      {listing.is_mine ? (
                        <Badge variant="secondary">Your listing</Badge>
                      ) : (
                        <Button onClick={() => buy(listing)} disabled={buying !== null}>
                          {buying === listing.id ? "Reserving…" : "Buy"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  )
}
