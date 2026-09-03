'use client'

import { memo } from 'react'
import { GitBranch } from 'lucide-react'
import {
  BlockedBadge,
  ChecklistProgress,
  DueDate,
  LabelDots,
  PriorityIndicator,
  TypeIcon,
  UserAvatar,
  WorkItemKey,
} from '@/components/primitives'
import { attentionOf, checklistProgress, isBlocked, isDueToday, isOverdue, relationsOf } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { WorkItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * PRD §13. The card carries seven things and no more: key, title,
 * blocked, checklist progress, assignee, priority, due date.
 *
 * Everything else — description, dependencies, custom fields, activity —
 * waits for the drawer. A board is scanned, not read; adding a field
 * here costs attention on every card the user's eye passes over, which
 * is the cognitive-load argument in §13 and the progressive-disclosure
 * ladder in §47.
 */
export const WorkItemCard = memo(function WorkItemCard({
  item,
  ctx,
  onOpen,
  dragging = false,
  className,
}: {
  item: WorkItem
  ctx: EngineContext
  onOpen: (id: string) => void
  dragging?: boolean
  className?: string
}) {
  const blocked = isBlocked(item.id, ctx)
  const overdue = isOverdue(item, ctx)
  const dueToday = isDueToday(item, ctx)
  const progress = checklistProgress(item, ctx)
  const assignee = item.assigneeId ? ctx.users[item.assigneeId] : undefined
  const type = ctx.workItemTypes[item.typeId]
  const labels = item.labelIds.map((id) => ctx.labels[id]!).filter(Boolean)
  const dependencyCount = relationsOf(item.id, ctx).length
  const attention = attentionOf(item, ctx)

  return (
    <article
      onClick={() => onOpen(item.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(item.id)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${item.key} ${item.title}${blocked ? ', blocked' : ''}`}
      className={cn(
        'group flex cursor-pointer flex-col gap-1.5 rounded-md border bg-card p-2 text-left transition-colors',
        'hover:border-ring/40 focus-visible:ring-2 focus-visible:ring-ring/40 outline-none',
        // Blocked work carries a coloured edge as well as the badge, so
        // it is recognisable in peripheral vision while scanning (§30).
        blocked ? 'border-blocked-border' : 'border-border',
        dragging && 'opacity-40',
        className,
      )}
    >
      <header className="flex items-center gap-1.5">
        <TypeIcon type={type} />
        <WorkItemKey value={item.key} />
        {dependencyCount > 0 && (
          <span
            className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"
            title={`${dependencyCount} relationship${dependencyCount === 1 ? '' : 's'}`}
          >
            <GitBranch className="size-2.5" />
            {dependencyCount}
          </span>
        )}
        <span className="ml-auto">
          <LabelDots labels={labels} />
        </span>
      </header>

      <h3 className="line-clamp-2 text-[13px] leading-snug font-medium">{item.title}</h3>

      {(blocked || attention.reasons.includes('blocking-others')) && (
        <div className="flex flex-wrap items-center gap-1">
          {blocked && <BlockedBadge size="sm" />}
          {!blocked && attention.reasons.includes('blocking-others') && (
            <span className="inline-flex h-4 items-center gap-1 rounded border border-overdue-border bg-overdue-muted px-1 text-[10px] font-medium text-overdue">
              Holding up work
            </span>
          )}
        </div>
      )}

      {progress && <ChecklistProgress progress={progress} variant="bar" />}

      <footer className="flex items-center gap-2 pt-0.5">
        <UserAvatar user={assignee} size="xs" />
        <PriorityIndicator priority={item.priority} />
        <span className="ml-auto">
          <DueDate value={item.dueDate} overdue={overdue} dueToday={dueToday} now={ctx.now} />
        </span>
      </footer>
    </article>
  )
})
