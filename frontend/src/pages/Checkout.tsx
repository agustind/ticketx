import { CheckCircle2, Clock, Download, FlaskConical, TimerOff } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"

import { Container, EmptyState, PageError, PageLoading } from "@/components/PageState"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { api, ApiError, urls } from "@/lib/api"
import { formatDate, formatMoney, place } from "@/lib/format"
import type { Order } from "@/lib/types"

function useCountdown(expiresAt: string | null): number | null {
  const target = expiresAt ? new Date(expiresAt).getTime() : null
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (target === null) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [target])
  return target === null ? null : Math.max(0, Math.floor((target - now) / 1000))
}

export function Checkout() {
  const { orderId = "" } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    api
      .order(Number(orderId))
      .then((res) => setOrder(res.order))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load your order."))
  }, [orderId])

  const secondsLeft = useCountdown(order?.status === "pending" ? order.expires_at : null)
  const timedOut = order?.status === "expired" || (order?.status === "pending" && secondsLeft === 0)

  async function pay() {
    if (!order) return
    setPaying(true)
    try {
      const res = await api.payOrder(order.id)
      setOrder(res.order)
      toast.success("Payment received. Enjoy the event!")
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Reservation lapsed or the order changed; show the latest state.
        const res = await api.order(order.id).catch(() => null)
        if (res) setOrder(res.order)
      }
      toast.error(e instanceof ApiError ? e.message : "Payment failed. Please try again.")
    } finally {
      setPaying(false)
    }
  }

  if (error) return <PageError message={error} action={<Link to="/my/tickets" className="underline">Go to my tickets</Link>} />
  if (!order) return <PageLoading />

  const { listing } = order
  const event = listing.event

  if (timedOut || order.status === "cancelled") {
    return (
      <Container className="max-w-xl">
        <EmptyState icon={<TimerOff />} title="Your reservation expired">
          The ticket went back on sale. If it's still available you can try again.
          <div className="pt-4">
            <Button asChild>
              <Link to={event ? `/events/${event.slug}` : "/"}>Back to the event</Link>
            </Button>
          </div>
        </EmptyState>
      </Container>
    )
  }

  if (order.status === "paid") {
    return (
      <Container className="max-w-xl">
        <EmptyState icon={<CheckCircle2 />} title="You've got your ticket!">
          {event?.name} · {formatDate(event?.starts_at)}
          <div className="flex flex-col justify-center gap-2 pt-4 sm:flex-row">
            {order.can_download && (
              <Button asChild>
                <a href={urls.orderTicket(order.id)} download>
                  <Download /> Download ticket
                </a>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/my/tickets">My tickets</Link>
            </Button>
          </div>
        </EmptyState>
      </Container>
    )
  }

  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null
  const seconds = secondsLeft !== null ? String(secondsLeft % 60).padStart(2, "0") : null

  return (
    <Container className="max-w-xl">
      <h1 className="mb-6 font-heading text-3xl font-semibold tracking-tight">Checkout</h1>
      {secondsLeft !== null && (
        <Alert className="mb-4">
          <Clock />
          <AlertDescription>
            We're holding this ticket for you for{" "}
            <span className="font-semibold tabular-nums text-foreground">{minutes}:{seconds}</span>.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{event?.name ?? "Ticket"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {formatDate(event?.starts_at)}
            {event && place(event.venue, event.city) && ` · ${place(event.venue, event.city)}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Ticket</span>
            <span className="text-right">{[listing.ticket_type || "Ticket", listing.seat].filter(Boolean).join(" · ")}</span>
          </div>
          {listing.face_value_cents !== null && (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Face value</span>
              <span>{formatMoney(listing.face_value_cents, listing.currency)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between gap-4 text-lg font-semibold">
            <span>Total</span>
            <span>{formatMoney(order.amount_cents, order.currency)}</span>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button size="lg" className="w-full" onClick={pay} disabled={paying}>
            <FlaskConical /> {paying ? "Processing…" : "Pay (test mode — no real money)"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Payments are simulated while ticketex is in testing. Nothing will be charged.
          </p>
        </CardFooter>
      </Card>
    </Container>
  )
}
