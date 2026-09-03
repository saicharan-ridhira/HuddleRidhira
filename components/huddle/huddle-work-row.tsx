'use client'

import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  BlockedBadge,
  ChecklistProgress,
  DueDate,
  StatusIcon,
  UnblockedBadge,
  WorkItemKey,
} from '@/components/primitives'
import { StatusPicker } from '@/components/work/inline/status-picker'
import { PriorityPicker } from '@/components/work/inline/priority-picker'
import { AssigneePicker } from '@/components/work/inline/assignee-picker'
import { DueDatePicker } from '@/components/work/inline/due-date-picker'
import { useStore } from '@/lib/store/store'
import {
  blockDetails,
  checklistProgress,
  hasResolvedDependencies,
  isBlocked,
  isDueToday,
  isOverdue,
} from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { AttentionReason } from '@/lib/engine/derive'
import type { WorkItem } from '@/lib/types'
import { cn } from '@/lib/utils'

const REASON_LABEL: Record<AttentionReason, string> = {
  blocked: 'Blocked',
  'blocking-others': 'Holding up work',
  backlog: 'Not started',
  overdue: 'Overdue',
  'due-today': 'Due today',
  'high-priority': 'High priority',
}

/**
 * A work item as it appears inside a huddle: the reason it is on screen
 * is stated first, and every control that PRD §33 lists is right here.
 * Changing status, priority, assignee or due date during the discussion
 * writes straight to the item — there is no meeting record to reconcile
 * afterwards, which is the product's north star.
 */
export function HuddleWorkRow({
  item,
  ctx,
  reasons,
  selected,
  onSelect,
}: {
  item: WorkItem
  ctx: EngineContext
  reasons: AttentionReason[]
  selected: boolean
  onSelect: () => void
}) {
  const openWorkItem = useStore((state) => state.openWorkItem)
  const status = ctx.statuses[item.statusId]
  const blocked = isBlocked(item.id, ctx)
  const details = blockDetails(item.id, ctx)
  const justUnblocked = !blocked && hasResolvedDependencies(item.id, ctx)
  const progress = checklistProgress(item, ctx)

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'flex cursor-pointer flex-col gap-1.5 rounded-md border px-2.5 py-2 transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring/40',
        selected ? 'border-ring/60 bg-accent/40' : blocked ? 'border-blocked-border bg-card' : 'border-border bg-card',
      )}
    >
      <div className="flex items-center gap-2">
        {status && <StatusIcon category={status.category} />}
        <WorkItemKey value={item.key} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{item.title}</span>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          onClick={(event) => {
            event.stopPropagation()
            openWorkItem(item.id)
          }}
          aria-label="Open full detail"
        >
          <ExternalLink />
        </Button>
      </div>

      {/* Why this item is in front of the room, stated plainly. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {blocked && <BlockedBadge size="sm" count={details.length} />}
        {justUnblocked && <UnblockedBadge size="sm" />}
        {reasons
          .filter((reason) => reason !== 'blocked')
          .map((reason) => (
            <span
              key={reason}
              className={cn(
                'inline-flex h-4 items-center rounded border px-1 text-[10px] font-medium',
                reason === 'overdue' && 'border-overdue-border bg-overdue-muted text-overdue',
                reason === 'blocking-others' && 'border-overdue-border bg-overdue-muted text-overdue',
                reason === 'backlog' && 'border-border bg-muted text-muted-foreground',
                reason === 'due-today' && 'border-border bg-muted text-foreground',
                reason === 'high-priority' && 'border-border bg-muted text-muted-foreground',
              )}
            >
              {REASON_LABEL[reason]}
            </span>
          ))}
        {progress && <ChecklistProgress progress={progress} />}
        <DueDate
          value={item.dueDate}
          overdue={isOverdue(item, ctx)}
          dueToday={isDueToday(item, ctx)}
          now={ctx.now}
          className="ml-auto"
        />
      </div>

      {blocked && details.length > 0 && (
        <ul className="flex flex-col gap-0.5 pl-0.5 text-[11px] text-muted-foreground">
          {details.map((detail, index) => (
            <li key={index}>{detail.label}</li>
          ))}
        </ul>
      )}

      {/* PRD §33's inline actions, at the point of discussion. */}
      <div
        className="flex flex-wrap items-center gap-0.5 border-t border-border/60 pt-1.5"
        onClick={(event) => event.stopPropagation()}
      >
        <StatusPicker workItemId={item.id} departmentId={item.departmentId} status={status} />
        <PriorityPicker workItemId={item.id} priority={item.priority} />
        <AssigneePicker workItemId={item.id} departmentId={item.departmentId} assigneeId={item.assigneeId} />
        <DueDatePicker
          workItemId={item.id}
          value={item.dueDate}
          overdue={isOverdue(item, ctx)}
          dueToday={isDueToday(item, ctx)}
          placeholder="Due"
        />
      </div>
    </div>
  )
}
