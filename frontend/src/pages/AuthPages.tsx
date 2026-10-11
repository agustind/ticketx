import { useState } from "react"
import type { FormEvent } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"

import { Container, FieldError } from "@/components/PageState"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api"
import type { FieldErrors } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { firstName } from "@/lib/format"

/** Only allow same-site relative redirects. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/"
}

export function LoginPage() {
  return <AuthForm mode="login" />
}

export function RegisterPage() {
  return <AuthForm mode="register" />
}

function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { user, loading, login, register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get("next"))
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const isLogin = mode === "login"

  if (!loading && user) return <Navigate to={next} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    setFormError(null)
    if (!isLogin && password.length < 8) {
      setErrors({ password: "Use at least 8 characters." })
      return
    }
    setSubmitting(true)
    try {
      const signedIn = isLogin ? await login(email, password) : await register(name, email, password)
      toast.success(isLogin ? `Welcome back, ${firstName(signedIn.name)}!` : "Your account is ready.")
      navigate(next, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors)
        if (!Object.keys(err.errors).length) setFormError(err.message)
      } else {
        setFormError("Something went wrong. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const switchLink = `${isLogin ? "/register" : "/login"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`

  return (
    <Container className="max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{isLogin ? "Log in" : "Create your account"}</CardTitle>
          <CardDescription>
            {isLogin ? "Buy and sell tickets with your ticketex account." : "It takes less than a minute."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit} noValidate>
          <CardContent className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required aria-invalid={!!errors.name} />
                <FieldError message={errors.name} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required aria-invalid={!!errors.email} />
              <FieldError message={errors.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-invalid={!!errors.password}
              />
              {!isLogin && !errors.password && <p className="text-sm text-muted-foreground">At least 8 characters.</p>}
              <FieldError message={errors.password} />
            </div>
          </CardContent>
          <CardFooter className="mt-6 flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Please wait…" : isLogin ? "Log in" : "Create account"}
            </Button>
            <p className="text-sm text-muted-foreground">
              {isLogin ? "New to ticketex? " : "Already have an account? "}
              <Link to={switchLink} className="text-primary underline-offset-4 hover:underline">
                {isLogin ? "Sign up" : "Log in"}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </Container>
  )
}
