'use client'

import {
  Circle,
  CircleCheckBig,
  CircleDashed,
  CircleDot,
  CircleDotDashed,
  CircleX,
  type LucideIcon,
} from 'lucide-react'
import type { Status, StatusCategory } from '@/lib/types'
import { statusColor } from '@/lib/ui/tokens'
import { cn } from '@/lib/utils'

/**
 * Status is user-configurable but its *category* is not, so the icon and
 * colour come from the category. Fifty custom statuses still read
 * consistently across every view (PRD §46) without anyone picking
 * colours by hand.
 */
const CATEGORY_ICON: Record<StatusCategory, LucideIcon> = {
  backlog: CircleDashed,
  unstarted: Circle,
  started: CircleDot,
  review: CircleDotDashed,
  completed: CircleCheckBig,
  cancelled: CircleX,
}

export function StatusIcon({
  category,
  className,
}: {
  category: StatusCategory
  className?: string
}) {
  const Icon = CATEGORY_ICON[category]
  return <Icon className={cn('size-3.5 shrink-0', className)} style={{ color: statusColor(category) }} aria-hidden />
}

export function StatusPill({
  status,
  showLabel = true,
  className,
}: {
  status: Status | undefined
  showLabel?: boolean
  className?: string
}) {
  if (!status) return null

  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', className)}>
      <StatusIcon category={status.category} />
      {showLabel && <span className="text-[13px]">{status.name}</span>}
    </span>
  )
}
