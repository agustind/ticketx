import { Compass } from "lucide-react"
import { Link } from "react-router"

import { Container, EmptyState } from "@/components/PageState"
import { Button } from "@/components/ui/button"

export function NotFound() {
  return (
    <Container className="max-w-xl py-16">
      <EmptyState icon={<Compass />} title="Page not found">
        The page you're looking for doesn't exist.
        <div className="pt-4">
          <Button asChild><Link to="/">Browse events</Link></Button>
        </div>
      </EmptyState>
    </Container>
  )
}
