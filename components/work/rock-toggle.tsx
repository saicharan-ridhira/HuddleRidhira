'use client'

import { Mountain } from 'lucide-react'
import type { EngineContext } from '@/lib/engine/context'
import { formatQuarter, quarterOf, shiftQuarter } from '@/lib/engine/periods'
import { metricService } from '@/lib/services'
import type { WorkItem } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

/**
 * Promotes a work item to a quarterly Rock.
 *
 * It lives among the classification fields rather than as a separate
 * concept because that is exactly what it is: the same item, marked as
 * one of the few things the quarter is actually for. Everything else —
 * owner, due date, blockers, its place on the board — carries over
 * untouched.
 */
export function RockToggle({ item, ctx }: { item: WorkItem; ctx: EngineContext }) {
  const current = quarterOf(ctx.now)
  const options = [shiftQuarter(current, -1), current, shiftQuarter(current, 1)]
  const value = item.rockQuarter ?? 'none'

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        const quarter = next === 'none' ? null : next
        metricService.setRockQuarter(item.id, quarter)
        toast.success(quarter ? `Rock for ${formatQuarter(quarter)}` : 'No longer a Rock', { description: item.title })
      }}
    >
      <SelectTrigger size="sm" className="w-full border-transparent bg-transparent hover:bg-accent">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Not a Rock</SelectItem>
        {options.map((quarter) => (
          <SelectItem key={quarter} value={quarter}>
            <span className="flex items-center gap-2">
              <Mountain className="size-3" />
              {formatQuarter(quarter)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
