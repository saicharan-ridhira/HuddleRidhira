'use client'

import { CircleCheck, OctagonAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The loudest thing in the product. PRD §30 and §46 both hang on this
 * one component: because it is the only way anything renders "blocked",
 * the board, list, table, timeline, huddle, dashboard and search results
 * cannot drift apart in how they show it.
 */
export function BlockedBadge({
  count,
  reason,
  size = 'default',
  className,
}: {
  /** Number of things blocking this item; shown when more than one. */
  count?: number
  reason?: string
  size?: 'sm' | 'default'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded border font-medium whitespace-nowrap',
        'bg-blocked-muted text-blocked border-blocked-border',
        size === 'sm' ? 'h-4 px-1 text-[10px]' : 'h-5 px-1.5 text-[11px]',
        className,
      )}
      title={reason}
    >
      <OctagonAlert className={size === 'sm' ? 'size-2.5' : 'size-3'} aria-hidden />
      Blocked
      {typeof count === 'number' && count > 1 && <span className="opacity-70">{count}</span>}
    </span>
  )
}

/**
 * Shown briefly after the last blocker clears. Dropping the badge
 * silently would hide the most satisfying moment in the product — the
 * point of §25 is that the team *sees* the work become unblocked.
 */
export function UnblockedBadge({ size = 'default', className }: { size?: 'sm' | 'default'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded border font-medium whitespace-nowrap',
        'bg-unblocked-muted text-unblocked border-unblocked-border',
        size === 'sm' ? 'h-4 px-1 text-[10px]' : 'h-5 px-1.5 text-[11px]',
        className,
      )}
    >
      <CircleCheck className={size === 'sm' ? 'size-2.5' : 'size-3'} aria-hidden />
      Unblocked
    </span>
  )
}
