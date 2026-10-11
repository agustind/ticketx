import { Download, Ticket } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router"

import { Container, EmptyState, PageError } from "@/components/PageState"
import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api, ApiError, urls } from "@/lib/api"
import { formatDate, formatMoney } from "@/lib/format"
import type { Order } from "@/lib/types"

export function MyTickets() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .myOrders()
      .then((res) => setOrders(res.orders))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load your tickets."))
  }, [])

  return (
    <Container className="max-w-3xl">
      <h1 className="mb-6 font-heading text-3xl font-semibold tracking-tight">My tickets</h1>
      {error ? (
        <PageError message={error} />
      ) : orders === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={<Ticket />} title="No tickets yet">
          Tickets you buy show up here.
          <div className="pt-4">
            <Button asChild><Link to="/">Find an event</Link></Button>
          </div>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const event = order.listing.event
            return (
              <li key={order.id}>
                <Card>
                  <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {event ? (
                          <Link to={`/events/${event.slug}`} className="font-medium hover:text-primary">{event.name}</Link>
                        ) : (
                          <span className="font-medium">Ticket</span>
                        )}
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDate(event?.starts_at)}</p>
                      <p className="text-sm text-muted-foreground">
                        {[order.listing.ticket_type || "Ticket", order.listing.seat].filter(Boolean).join(" · ")} ·{" "}
                        {formatMoney(order.amount_cents, order.currency)}
                      </p>
                    </div>
                    {order.can_download ? (
                      <Button asChild>
                        <a href={urls.orderTicket(order.id)} download><Download /> Download</a>
                      </Button>
                    ) : order.status === "pending" ? (
                      <Button asChild variant="outline"><Link to={`/checkout/${order.id}`}>Complete payment</Link></Button>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </Container>
  )
}
