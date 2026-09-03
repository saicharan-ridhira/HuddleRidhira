'use client'

import type { Priority } from '@/lib/types'
import { PRIORITY_LABEL } from '@/lib/types'
import { priorityColor } from '@/lib/ui/tokens'
import { cn } from '@/lib/utils'

/**
 * A bar-chart glyph rather than coloured text: it reads at card size,
 * survives dense rows, and stays legible for people who cannot rely on
 * the colour difference alone. Urgent breaks the pattern deliberately
 * so it stands out among the others (Von Restorff).
 */
const BAR_COUNT: Record<Priority, number> = { none: 0, low: 1, medium: 2, high: 3, urgent: 3 }

export function PriorityIndicator({
  priority,
  showLabel = false,
  className,
}: {
  priority: Priority
  showLabel?: boolean
  className?: string
}) {
  const colour = priorityColor(priority)
  const filled = BAR_COUNT[priority]

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', className)}
      title={PRIORITY_LABEL[priority]}
    >
      {priority === 'urgent' ? (
        <svg viewBox="0 0 14 14" className="size-3.5 shrink-0" aria-hidden>
          <rect x="1" y="1" width="12" height="12" rx="3" fill={colour} />
          <rect x="6.25" y="3.5" width="1.5" height="4.5" rx="0.75" fill="var(--background)" />
          <rect x="6.25" y="9" width="1.5" height="1.5" rx="0.75" fill="var(--background)" />
        </svg>
      ) : (
        <svg viewBox="0 0 14 14" className="size-3.5 shrink-0" aria-hidden>
          {[0, 1, 2].map((index) => (
            <rect
              key={index}
              x={1.5 + index * 4}
              y={10 - index * 3}
              width="3"
              height={3 + index * 3}
              rx="1"
              fill={colour}
              opacity={index < filled ? 1 : 0.28}
            />
          ))}
        </svg>
      )}
      {showLabel && <span className="text-[13px]">{PRIORITY_LABEL[priority]}</span>}
    </span>
  )
}
