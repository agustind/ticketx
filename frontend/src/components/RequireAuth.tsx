import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"

import { PageLoading } from "@/components/PageState"
import { useAuth } from "@/lib/auth"

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoading />
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return children
}
