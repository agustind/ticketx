import { LogOut, Plus, Tag, Ticket, User as UserIcon } from "lucide-react"
import { Link, Outlet, useLocation, useNavigate } from "react-router"
import { toast } from "sonner"

import { Logo } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth"
import { firstName } from "@/lib/format"

export function Layout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const next = encodeURIComponent(location.pathname + location.search)

  async function handleLogout() {
    try {
      await logout()
      navigate("/")
      toast.success("You're logged out.")
    } catch {
      toast.error("Couldn't log out. Try again.")
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Logo />
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/sell">
                <Plus /> Sell tickets
              </Link>
            </Button>
            {loading ? null : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" aria-label="Account menu">
                    <UserIcon /> <span className="max-w-28 truncate">{firstName(user.name)}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/my/tickets">
                      <Ticket /> My tickets
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my/listings">
                      <Tag /> My listings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/sell">
                      <Plus /> Sell tickets
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout}>
                    <LogOut /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to={`/login?next=${next}`}>Log in</Link>
                </Button>
                <Button asChild>
                  <Link to={`/register?next=${next}`}>Sign up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>ticketex · fan-to-fan ticket resale</span>
          <span>Prices are capped at 120% of face value.</span>
        </div>
      </footer>
    </div>
  )
}
