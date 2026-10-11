import { MapPin } from "lucide-react"
import { Link } from "react-router"

import { Card, CardContent } from "@/components/ui/card"
import { formatDate, formatDay, formatMoney, place } from "@/lib/format"
import type { Event } from "@/lib/types"

export function DateBlock({ iso }: { iso: string | null }) {
  const day = formatDay(iso)
  return (
    <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
      {day ? (
        <div className="text-center leading-tight">
          <div className="text-xl font-semibold">{day.day}</div>
          <div className="text-xs font-medium uppercase">{day.month}</div>
        </div>
      ) : (
        <span className="text-xs font-medium">TBA</span>
      )}
    </div>
  )
}

export function EventCard({ event }: { event: Event }) {
  const where = place(event.venue, event.city)
  return (
    <Link to={`/events/${event.slug}`} className="group rounded-xl focus-visible:outline-2">
      <Card className="h-full transition-colors group-hover:border-primary/60">
        <CardContent className="flex gap-4">
          <DateBlock iso={event.starts_at} />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="truncate font-semibold group-hover:text-primary">{event.name}</h3>
            <p className="text-sm text-muted-foreground">{formatDate(event.starts_at)}</p>
            {where && (
              <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" /> {where}
              </p>
            )}
            <p className="pt-1 text-sm font-medium">
              {event.available_count > 0 ? (
                <>
                  {event.available_count} {event.available_count === 1 ? "ticket" : "tickets"} from{" "}
                  <span className="text-primary">{formatMoney(event.min_price_cents, event.currency)}</span>
                </>
              ) : (
                <span className="text-muted-foreground">No tickets yet</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
