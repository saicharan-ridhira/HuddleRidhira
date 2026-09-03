'use client'

import { CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Short, scannable date: "Sep 5", or "Today" / "Tomorrow" when close. */
export function formatDueDate(value: string, now: Date = new Date()): string {
  const due = new Date(value)
  const startOfDue = new Date(due).setHours(0, 0, 0, 0)
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  const days = Math.round((startOfDue - startOfToday) / 86_400_000)

  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'

  return due.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(due.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

/**
 * Overdue is a second exceptional state after blocked, and it uses its
 * own token so the two never look alike — a board where everything late
 * is as loud as everything blocked tells you nothing (§30).
 */
export function DueDate({
  value,
  overdue = false,
  dueToday = false,
  showIcon = false,
  className,
  now,
}: {
  value: string | null
  overdue?: boolean
  dueToday?: boolean
  showIcon?: boolean
  className?: string
  now?: Date
}) {
  if (!value) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap text-[11px] tabular-nums',
        overdue && 'font-medium text-overdue',
        dueToday && !overdue && 'font-medium text-foreground',
        !overdue && !dueToday && 'text-muted-foreground',
        className,
      )}
      title={new Date(value).toLocaleDateString('en-US', { dateStyle: 'full' })}
    >
      {showIcon && <CalendarClock className="size-3" aria-hidden />}
      {formatDueDate(value, now)}
    </span>
  )
}
