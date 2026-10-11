import { AlertCircle, Loader2 } from "lucide-react"
import type { ReactNode } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 py-8 ${className}`}>{children}</div>
}

export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground" role="status">
      <Loader2 className="size-5 animate-spin" /> {label}
    </div>
  )
}

export function PageError({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <Container className="max-w-xl">
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          <p>{message}</p>
          {action}
        </AlertDescription>
      </Alert>
    </Container>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-destructive">{message}</p>
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground [&>svg]:size-6">
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  )
}
