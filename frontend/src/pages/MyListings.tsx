import { FileText, Image, Tag } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"

import { Container, EmptyState, PageError } from "@/components/PageState"
import { StatusBadge } from "@/components/StatusBadge"
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
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api, ApiError, urls } from "@/lib/api"
import { formatDate, formatMoney } from "@/lib/format"
import type { Listing } from "@/lib/types"

export function MyListings() {
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .myListings()
      .then((res) => setListings(res.listings))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load your listings."))
  }, [])

  async function cancel(id: number) {
    try {
      const { listing } = await api.cancelListing(id)
      setListings((prev) => prev?.map((l) => (l.id === id ? listing : l)) ?? null)
      toast.success("Listing cancelled.")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't cancel the listing.")
    }
  }

  return (
    <Container className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">My listings</h1>
        <Button asChild><Link to="/sell">Sell a ticket</Link></Button>
      </div>
      {error ? (
        <PageError message={error} />
      ) : listings === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : listings.length === 0 ? (
        <EmptyState icon={<Tag />} title="You're not selling anything yet">
          Upload a ticket you can't use and set a fair price.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <Card>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {listing.event ? (
                        <Link to={`/events/${listing.event.slug}`} className="font-medium hover:text-primary">{listing.event.name}</Link>
                      ) : (
                        <span className="font-medium">Unconfirmed ticket</span>
                      )}
                      <StatusBadge status={listing.status} />
                    </div>
                    {listing.event && <p className="text-sm text-muted-foreground">{formatDate(listing.event.starts_at)}</p>}
                    <p className="text-sm text-muted-foreground">
                      {[listing.ticket_type || "Ticket", listing.seat].filter(Boolean).join(" · ")}
                      {listing.price_cents !== null && <> · {formatMoney(listing.price_cents, listing.currency)}</>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={urls.listingFile(listing.id)} target="_blank" rel="noreferrer">
                        {listing.file_type === "application/pdf" ? <FileText /> : <Image />} View ticket
                      </a>
                    </Button>
                    {listing.status === "draft" && (
                      <Button asChild size="sm"><Link to={`/sell/${listing.id}`}>Continue</Link></Button>
                    )}
                    {(listing.status === "draft" || listing.status === "listed") && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">Cancel</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel this listing?</AlertDialogTitle>
                            <AlertDialogDescription>It's taken off sale right away. You can upload the ticket again later.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep it</AlertDialogCancel>
                            <AlertDialogAction onClick={() => cancel(listing.id)}>Cancel listing</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}
