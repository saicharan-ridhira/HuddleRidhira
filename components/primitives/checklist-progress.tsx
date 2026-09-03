'use client'

import { ListChecks } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { ChecklistProgress as Progression } from '@/lib/engine/derive'

/**
 * PRD §36. Progress is shown as a fraction *and* a bar: the fraction is
 * precise, the bar makes the remaining distance feel small as it shrinks
 * (goal-gradient), and an incomplete list stays visible rather than
 * collapsing away (Zeigarnik).
 */
export function ChecklistProgress({
  progress,
  variant = 'inline',
  className,
}: {
  progress: Progression | null
  variant?: 'inline' | 'bar'
  className?: string
}) {
  if (!progress) return null

  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 whitespace-nowrap text-[11px] tabular-nums',
          progress.complete ? 'text-unblocked' : 'text-muted-foreground',
          className,
        )}
        title={`${progress.done} of ${progress.total} complete`}
      >
        <ListChecks className="size-3" aria-hidden />
        {progress.done}/{progress.total}
      </span>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Progress
        value={progress.percent}
        className="h-1 flex-1"
        indicatorClassName={progress.complete ? 'bg-unblocked' : undefined}
      />
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {progress.done}/{progress.total}
      </span>
    </div>
  )
}
