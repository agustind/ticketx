import { Link } from "react-router"

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
          <path
            d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6z"
            fill="currentColor"
          />
        </svg>
      </span>
      ticketex
    </Link>
  )
}
