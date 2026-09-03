'use client'

import {
  BlockedBadge,
  ChecklistProgress,
  DueDate,
  LabelChip,
  PriorityIndicator,
  StatusIcon,
  TypeIcon,
  UserAvatar,
  WorkItemKey,
} from '@/components/primitives'
import { checklistProgress, isBlocked, isDueToday, isOverdue, relationsOf } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { DisplayableField, WorkItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * The list row. Denser than a card and driven by the view's
 * `visibleFields` (PRD §17), but it renders the same primitives the
 * board does — so "blocked" looks identical whichever view you are in.
 */
export function WorkRow({
  item,
  ctx,
  fields,
  density,
  onOpen,
}: {
  item: WorkItem
  ctx: EngineContext
  fields: DisplayableField[]
  density: 'compact' | 'comfortable'
  onOpen: (id: string) => void
}) {
  const shows = (field: DisplayableField) => fields.includes(field)

  const status = ctx.statuses[item.statusId]
  const blocked = isBlocked(item.id, ctx)
  const progress = checklistProgress(item, ctx)
  const labels = item.labelIds.map((id) => ctx.labels[id]!).filter(Boolean)
  const dependencyCount = relationsOf(item.id, ctx).length

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(item.id)
        }
      }}
      className={cn(
        'group flex cursor-pointer items-center gap-2 border-b border-border px-3 transition-colors',
        'hover:bg-accent/40 focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/30 outline-none',
        density === 'compact' ? 'h-8' : 'h-10',
      )}
    >
      {shows('status') && status && <StatusIcon category={status.category} />}
      {shows('priority') && <PriorityIndicator priority={item.priority} />}
      {shows('type') && <TypeIcon type={ctx.workItemTypes[item.typeId]} />}
      {shows('key') && <WorkItemKey value={item.key} className="w-16 shrink-0" />}

      <span className="min-w-0 flex-1 truncate text-[13px]">{item.title}</span>

      {shows('blocked') && blocked && <BlockedBadge size="sm" />}

      {shows('labels') && labels.length > 0 && (
        <span className="hidden shrink-0 items-center gap-1 lg:flex">
          {labels.slice(0, 2).map((label) => (
            <LabelChip key={label.id} label={label} />
          ))}
          {labels.length > 2 && <span className="text-[10px] text-muted-foreground">+{labels.length - 2}</span>}
        </span>
      )}

      {shows('dependencies') && dependencyCount > 0 && (
        <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">{dependencyCount} linked</span>
      )}

      {shows('checklist') && progress && <ChecklistProgress progress={progress} />}

      {shows('dueDate') && (
        <span className="w-16 shrink-0 text-right">
          <DueDate
            value={item.dueDate}
            overdue={isOverdue(item, ctx)}
            dueToday={isDueToday(item, ctx)}
            now={ctx.now}
          />
        </span>
      )}

      {shows('assignee') && <UserAvatar user={item.assigneeId ? ctx.users[item.assigneeId] : undefined} size="xs" />}
    </div>
  )
}
