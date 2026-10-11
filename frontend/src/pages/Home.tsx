import { CalendarX, Search, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Link, useSearchParams } from "react-router"

import { EventCard } from "@/components/EventCard"
import { Container, EmptyState, PageError } from "@/components/PageState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { api, ApiError } from "@/lib/api"
import type { Event } from "@/lib/types"

export function Home() {
  const [params, setParams] = useSearchParams()
  const q = params.get("q") ?? ""
  const [query, setQuery] = useState(q)
  // Results are keyed by the query they belong to, so a new search shows skeletons again.
  const [result, setResult] = useState<{ q: string; events: Event[] | null; error: string | null } | null>(null)

  useEffect(() => {
    let active = true
    api
      .events(q || undefined)
      .then((res) => active && setResult({ q, events: res.events, error: null }))
      .catch((e) =>
        active && setResult({ q, events: null, error: e instanceof ApiError ? e.message : "Couldn't load events." }),
      )
    return () => {
      active = false
    }
  }, [q])

  const current = result?.q === q ? result : null
  const events = current?.events ?? null
  const error = current?.error ?? null

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const value = query.trim()
    setParams(value ? { q: value } : {})
  }

  return (
    <>
      <section className="border-b bg-gradient-to-b from-primary/10 to-transparent">
        <Container className="py-12 sm:py-16">
          <div className="max-w-2xl space-y-4">
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-5xl">
              Can't go? Someone else can.
            </h1>
            <p className="text-lg text-muted-foreground">
              Buy and sell tickets from fans, at fair prices. Every resale is capped at 120% of face value.
            </p>
            <form onSubmit={onSearch} className="flex gap-2 pt-2" role="search">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search events, venues or cities"
                  className="h-11 pl-9"
                  aria-label="Search events"
                />
              </div>
              <Button type="submit" size="lg" className="h-11">
                Search
              </Button>
            </form>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" /> Tickets are only released to the buyer after payment.
            </p>
          </div>
        </Container>
      </section>

      <Container>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold">{q ? `Results for “${q}”` : "Upcoming events"}</h2>
          {q && (
            <Button variant="link" onClick={() => { setQuery(""); setParams({}) }}>
              Clear search
            </Button>
          )}
        </div>

        {error ? (
          <PageError message={error} />
        ) : events === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState icon={<CalendarX />} title={q ? "No events match your search" : "No events yet"}>
            {q ? "Try a different name, venue or city." : "Be the first: upload a ticket you can't use."}
            <div className="pt-4">
              <Button asChild>
                <Link to="/sell">Sell a ticket</Link>
              </Button>
            </div>
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </Container>
    </>
  )
}
