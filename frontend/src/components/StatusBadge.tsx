import { Badge } from "@/components/ui/badge"
import type { ListingStatus, OrderStatus } from "@/lib/types"

const LABELS: Record<ListingStatus | OrderStatus, string> = {
  draft: "Draft",
  listed: "On sale",
  reserved: "Reserved",
  sold: "Sold",
  cancelled: "Cancelled",
  pending: "Awaiting payment",
  paid: "Paid",
  expired: "Expired",
}

const VARIANTS: Record<ListingStatus | OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  listed: "default",
  reserved: "secondary",
  sold: "secondary",
  cancelled: "outline",
  pending: "secondary",
  paid: "default",
  expired: "outline",
}

export function StatusBadge({ status }: { status: ListingStatus | OrderStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>
}
