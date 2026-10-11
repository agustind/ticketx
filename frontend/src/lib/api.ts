import type {
  Event,
  Listing,
  Order,
  PublishPayload,
  UploadResult,
  User,
} from "@/lib/types"

export type FieldErrors = Record<string, string>

export class ApiError extends Error {
  status: number
  errors: FieldErrors

  constructor(status: number, message: string, errors: FieldErrors = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
  }
}

let csrfToken: string | null = null

type SessionResponse = { user: User | null; csrf_token: string }

export async function fetchSession(): Promise<SessionResponse> {
  const session = await request<SessionResponse>("GET", "/api/session")
  csrfToken = session.csrf_token
  return session
}

async function ensureCsrf(): Promise<string> {
  if (!csrfToken) await fetchSession()
  return csrfToken ?? ""
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }
  let payload: BodyInit | undefined

  if (method !== "GET") headers["X-CSRF-TOKEN"] = await ensureCsrf()
  if (body instanceof FormData) {
    payload = body // the browser sets the multipart boundary
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json"
    payload = JSON.stringify(body)
  }

  let res: Response
  try {
    res = await fetch(path, { method, headers, body: payload, credentials: "same-origin" })
  } catch {
    throw new ApiError(0, "Can't reach ticketex. Check your connection and try again.")
  }

  const isJson = res.headers.get("content-type")?.includes("application/json")
  const data = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    const message =
      (data && typeof data.message === "string" && data.message) ||
      defaultMessage(res.status)
    const errors = (data && typeof data.errors === "object" && data.errors) || {}
    throw new ApiError(res.status, message, errors as FieldErrors)
  }
  return data as T
}

function defaultMessage(status: number): string {
  if (status === 401) return "Please log in to continue."
  if (status === 403) return "You don't have access to that."
  if (status === 404) return "We couldn't find that."
  if (status === 409) return "That's no longer available."
  if (status === 422) return "Please check the highlighted fields."
  if (status === 503) return "This is temporarily unavailable. Try again in a moment."
  return "Something went wrong. Please try again."
}

// After anything that changes the session, fetch a fresh CSRF token.
async function refreshing<T>(promise: Promise<T>): Promise<T> {
  const result = await promise
  csrfToken = null
  await fetchSession()
  return result
}

export const api = {
  register: (name: string, email: string, password: string) =>
    refreshing(request<{ user: User }>("POST", "/api/auth/register", { name, email, password })),
  login: (email: string, password: string) =>
    refreshing(request<{ user: User }>("POST", "/api/auth/login", { email, password })),
  logout: () => refreshing(request<{ ok: true }>("POST", "/api/auth/logout")),

  events: (q?: string) =>
    request<{ events: Event[] }>("GET", `/api/events${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  event: (slug: string) =>
    request<{ event: Event; listings: Listing[] }>("GET", `/api/events/${encodeURIComponent(slug)}`),

  uploadTicket: (file: File) => {
    const form = new FormData()
    form.append("file", file)
    return request<UploadResult>("POST", "/api/listings", form)
  },
  publishListing: (id: number, payload: PublishPayload) =>
    request<{ listing: Listing }>("POST", `/api/listings/${id}/publish`, payload),
  cancelListing: (id: number) => request<{ listing: Listing }>("DELETE", `/api/listings/${id}`),
  listing: (id: number) => request<UploadResult>("GET", `/api/listings/${id}`),
  myListings: () => request<{ listings: Listing[] }>("GET", "/api/me/listings"),

  createOrder: (listingId: number) =>
    request<{ order: Order }>("POST", "/api/orders", { listing_id: listingId }),
  order: (id: number) => request<{ order: Order }>("GET", `/api/orders/${id}`),
  payOrder: (id: number) => request<{ order: Order }>("POST", `/api/orders/${id}/pay`),
  myOrders: () => request<{ orders: Order[] }>("GET", "/api/me/orders"),
}

export const urls = {
  listingFile: (id: number) => `/api/listings/${id}/file`,
  orderTicket: (id: number) => `/api/orders/${id}/ticket`,
}
