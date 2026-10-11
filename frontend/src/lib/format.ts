const LOCALE = "nl-NL"

export function formatMoney(cents: number | null | undefined, currency = "EUR"): string {
  if (cents === null || cents === undefined) return "–"
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency }).format(cents / 100)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Date to be announced"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Date to be announced"
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatDay(iso: string | null | undefined): { day: string; month: string } | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return {
    day: new Intl.DateTimeFormat(LOCALE, { day: "numeric" }).format(date),
    month: new Intl.DateTimeFormat(LOCALE, { month: "short" }).format(date).replace(".", ""),
  }
}

export function place(venue: string | null, city: string | null): string | null {
  return [venue, city].filter(Boolean).join(", ") || null
}

/** "12,50" or "12.50" → 1250. Returns null when the text isn't a valid amount. */
export function parseMoney(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, "").replace(",", ".")
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Math.round(Number(normalized) * 100)
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ""
  return (cents / 100).toFixed(2)
}

/** ISO string → value for <input type="datetime-local"> in the viewer's local time. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function localInputToIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}
