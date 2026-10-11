import { CheckCircle2, Info } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router"
import { toast } from "sonner"

import { Container, EmptyState, FieldError, PageError, PageLoading } from "@/components/PageState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { api, ApiError } from "@/lib/api"
import type { FieldErrors } from "@/lib/api"
import {
  centsToInput,
  formatDate,
  formatMoney,
  isoToLocalInput,
  localInputToIso,
  parseMoney,
  place,
} from "@/lib/format"
import type { Event, Extraction, Listing, PublishPayload, UploadResult } from "@/lib/types"

type Loaded = { listing: Listing; extraction: Extraction | null; matched: Event | null }

export function SellConfirm() {
  const { listingId = "" } = useParams()
  const location = useLocation()
  const fromUpload = location.state as UploadResult | null
  const [loaded, setLoaded] = useState<Loaded | null>(
    fromUpload && String(fromUpload.listing.id) === listingId
      ? { listing: fromUpload.listing, extraction: fromUpload.extraction, matched: fromUpload.matched_event }
      : null,
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loaded) return
    api
      .listing(Number(listingId))
      .then((res) => setLoaded({ listing: res.listing, extraction: res.extraction, matched: res.matched_event }))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load your listing."))
  }, [listingId, loaded])

  if (error) return <PageError message={error} action={<Link to="/my/listings" className="underline">Go to my listings</Link>} />
  if (!loaded) return <PageLoading />
  if (loaded.listing.status !== "draft") {
    return (
      <Container className="max-w-xl">
        <EmptyState icon={<CheckCircle2 />} title="This ticket is already listed">
          <Link to="/my/listings" className="text-primary underline">See my listings</Link>
        </EmptyState>
      </Container>
    )
  }
  return <ConfirmForm {...loaded} />
}

function ConfirmForm({ listing, extraction, matched }: Loaded) {
  const navigate = useNavigate()
  const currency = listing.currency
  const [useMatched, setUseMatched] = useState<"matched" | "new">(matched ? "matched" : "new")
  const [eventName, setEventName] = useState(extraction?.event_name ?? listing.event?.name ?? "")
  const [startsAt, setStartsAt] = useState(isoToLocalInput(extraction?.starts_at ?? listing.event?.starts_at))
  const [venue, setVenue] = useState(extraction?.venue ?? listing.event?.venue ?? "")
  const [city, setCity] = useState(extraction?.city ?? listing.event?.city ?? "")
  const [ticketType, setTicketType] = useState(listing.ticket_type ?? extraction?.ticket_type ?? "")
  const [seat, setSeat] = useState(listing.seat ?? extraction?.seat ?? "")
  const [faceValue, setFaceValue] = useState(centsToInput(listing.face_value_cents))
  const [price, setPrice] = useState(centsToInput(listing.max_price_cents ?? listing.face_value_cents))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const faceCents = listing.face_value_locked ? listing.face_value_cents : parseMoney(faceValue)
  const maxCents = useMemo(
    () => (listing.face_value_locked ? listing.max_price_cents : faceCents !== null ? Math.floor(faceCents * 1.2) : null),
    [listing.face_value_locked, listing.max_price_cents, faceCents],
  )
  const priceCents = parseMoney(price)
  const overCap = priceCents !== null && maxCents !== null && priceCents > maxCents

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: FieldErrors = {}
    if (useMatched === "new" && !eventName.trim()) next["event.name"] = "Enter the event name."
    if (!listing.face_value_locked && (faceCents === null || faceCents <= 0)) next.face_value_cents = "Enter the price printed on the ticket."
    if (priceCents === null || priceCents <= 0) next.price_cents = "Enter a price."
    else if (overCap) next.price_cents = `The maximum is ${formatMoney(maxCents, currency)}.`
    setErrors(next)
    if (Object.keys(next).length || priceCents === null) return

    const payload: PublishPayload = {
      ticket_type: ticketType.trim() || null,
      seat: seat.trim() || null,
      face_value_cents: faceCents,
      price_cents: priceCents,
    }
    if (useMatched === "matched" && matched) payload.event_id = matched.id
    else
      payload.event = {
        name: eventName.trim(),
        starts_at: localInputToIso(startsAt),
        venue: venue.trim() || null,
        city: city.trim() || null,
      }

    setSubmitting(true)
    try {
      const { listing: published } = await api.publishListing(listing.id, payload)
      toast.success("Your ticket is on sale!")
      navigate(published.event ? `/events/${published.event.slug}` : "/my/listings")
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors)
        if (!Object.keys(err.errors).length) toast.error(err.message)
      } else toast.error("Couldn't publish your ticket.")
    } finally {
      setSubmitting(false)
    }
  }

  async function discard() {
    try {
      await api.cancelListing(listing.id)
      toast.success("Draft discarded.")
      navigate("/sell")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't discard the draft.")
    }
  }

  return (
    <Container className="max-w-2xl">
      <div className="mb-6 space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Check the details</h1>
        <p className="text-muted-foreground">We read these from your ticket. Fix anything that's wrong, then set your price.</p>
      </div>

      {extraction?.notes && (
        <Alert className="mb-4">
          <Info />
          <AlertTitle>Note from reading your ticket</AlertTitle>
          <AlertDescription>{extraction.notes}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Event</CardTitle>
            {matched && <CardDescription>We found a matching event on ticketex.</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {matched && (
              <RadioGroup value={useMatched} onValueChange={(v) => setUseMatched(v as "matched" | "new")} className="gap-3">
                <Label htmlFor="ev-matched" className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-primary">
                  <RadioGroupItem value="matched" id="ev-matched" className="mt-0.5" />
                  <span className="space-y-0.5">
                    <span className="block font-medium">{matched.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {formatDate(matched.starts_at)}
                      {place(matched.venue, matched.city) && ` · ${place(matched.venue, matched.city)}`}
                    </span>
                  </span>
                </Label>
                <Label htmlFor="ev-new" className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-primary">
                  <RadioGroupItem value="new" id="ev-new" /> It's a different event
                </Label>
              </RadioGroup>
            )}
            {(useMatched === "new" || !matched) && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="event-name">Event name</Label>
                  <Input id="event-name" value={eventName} onChange={(e) => setEventName(e.target.value)} aria-invalid={!!errors["event.name"]} />
                  <FieldError message={errors["event.name"]} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="starts-at">Date and time</Label>
                  <Input id="starts-at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                  <FieldError message={errors["event.starts_at"]} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="venue">Venue</Label>
                  <Input id="venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
                </div>
              </div>
            )}
            <FieldError message={errors.event_id ?? errors.event} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ticket</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ticket-type">Ticket type</Label>
              <Input id="ticket-type" placeholder="e.g. General admission" value={ticketType} onChange={(e) => setTicketType(e.target.value)} />
              <FieldError message={errors.ticket_type} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seat">Seat / section</Label>
              <Input id="seat" placeholder="Optional" value={seat} onChange={(e) => setSeat(e.target.value)} />
              <FieldError message={errors.seat} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Price</CardTitle>
            <CardDescription>Resale is capped at 120% of the face value.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="face-value">Face value ({currency})</Label>
              {listing.face_value_locked ? (
                <>
                  <Input id="face-value" value={formatMoney(listing.face_value_cents, currency)} readOnly disabled />
                  <p className="text-sm text-muted-foreground">Read from your ticket.</p>
                </>
              ) : (
                <>
                  <Input id="face-value" inputMode="decimal" placeholder="0,00" value={faceValue} onChange={(e) => setFaceValue(e.target.value)} aria-invalid={!!errors.face_value_cents} />
                  <p className="text-sm text-muted-foreground">The price printed on the ticket.</p>
                </>
              )}
              <FieldError message={errors.face_value_cents} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Your price ({currency})</Label>
              <Input id="price" inputMode="decimal" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={overCap || !!errors.price_cents} />
              {maxCents !== null && (
                <p className={`text-sm ${overCap ? "text-destructive" : "text-muted-foreground"}`}>
                  Max {formatMoney(maxCents, currency)} (120% of face value)
                </p>
              )}
              <FieldError message={errors.price_cents} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost">Discard</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard this ticket?</AlertDialogTitle>
                <AlertDialogDescription>The draft is removed and the ticket won't be listed. You can upload it again later.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                <AlertDialogAction onClick={discard}>Discard</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button type="submit" size="lg" disabled={submitting || overCap}>
            {submitting ? "Publishing…" : "Put on sale"}
          </Button>
        </div>
      </form>
    </Container>
  )
}
