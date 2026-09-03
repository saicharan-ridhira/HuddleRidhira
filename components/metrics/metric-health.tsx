'use client'

import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import type { MetricHealth } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Health maps onto the semantic tokens the rest of the product already
 * uses for exceptions — the same red that means "blocked" means "off
 * track" here, so somebody reading a scorecard is not learning a second
 * colour language.
 *
 * `not-reported` is deliberately colourless. An empty cell is not a
 * problem yet; it is an absence, and painting it red would train people
 * to ignore red.
 */
export const HEALTH_STYLE: Record<MetricHealth, { dot: string; text: string; cell: string; chip: string }> = {
  'on-track': {
    dot: 'bg-unblocked',
    text: 'text-unblocked',
    cell: 'bg-unblocked-muted/60',
    chip: 'border-unblocked-border bg-unblocked-muted/60 text-unblocked',
  },
  'at-risk': {
    dot: 'bg-overdue',
    text: 'text-overdue',
    cell: 'bg-overdue-muted/60',
    chip: 'border-overdue-border bg-overdue-muted/60 text-overdue',
  },
  'off-track': {
    dot: 'bg-blocked',
    text: 'text-blocked',
    cell: 'bg-blocked-muted/60',
    chip: 'border-blocked-border bg-blocked-muted/60 text-blocked',
  },
  'not-reported': {
    dot: 'bg-muted-foreground/35',
    text: 'text-muted-foreground',
    cell: '',
    chip: 'border-dashed border-border text-muted-foreground',
  },
}

export function HealthDot({ health, className }: { health: MetricHealth; className?: string }) {
  return <span className={cn('size-1.5 shrink-0 rounded-full', HEALTH_STYLE[health].dot, className)} />
}

export function HealthChip({ health, children }: { health: MetricHealth; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded border px-1.5 text-[11px] font-medium tabular-nums',
        HEALTH_STYLE[health].chip,
      )}
    >
      {children}
    </span>
  )
}

/**
 * The change since the previous period, already resolved into "better"
 * or "worse" by the engine — so a falling incident count shows a green
 * arrow without this component knowing what an incident is.
 */
export function Trend({ improvement, className }: { improvement: number | null; className?: string }) {
  if (improvement === null || improvement === 0) {
    return (
      <span className={cn('inline-flex items-center gap-0.5 text-[11px] text-muted-foreground', className)}>
        <Minus className="size-3" />
      </span>
    )
  }

  const better = improvement > 0
  const Icon = better ? TrendingUp : TrendingDown

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] tabular-nums',
        better ? 'text-unblocked' : 'text-blocked',
        className,
      )}
      // The arrow already says which way; the title says by how much.
      title={`${better ? 'Better' : 'Worse'} than the previous period`}
    >
      <Icon className="size-3" />
    </span>
  )
}
