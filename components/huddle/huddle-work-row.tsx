'use client'

import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  BlockedBadge,
  ChecklistProgress,
  DueDate,
  StatusIcon,
  UnblockedBadge,
  UserAvatar,
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
import type { WorkItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * A work item in a huddle: one line until it is the item being
 * discussed, then everything.
 *
 * A room discusses one thing at a time. Giving every row its badges, its
 * blocker detail and a toolbar of four pickers meant a dozen items'
 * worth of chrome for one item's worth of use — the screen filled up,
 * and the two rows that mattered stopped standing out from the ten that
 * did not. Collapsed, a row carries only what earns its place in a
 * scan: what it is, and the single reason it is on the agenda.
 *
 * Expanded, PRD §33's inline actions are all still here. Changing
 * status, assignee or due date during the discussion writes straight to
 * the item, so there is no meeting record to reconcile afterwards.
 */
export function HuddleWorkRow({
  item,
  ctx,
  selected,
  onSelect,
}: {
  item: WorkItem
  ctx: EngineContext
  selected: boolean
  onSelect: () => void
}) {
  const openWorkItem = useStore((state) => state.openWorkItem)
  const status = ctx.statuses[item.statusId]
  const blocked = isBlocked(item.id, ctx)
  const details = blockDetails(item.id, ctx)
  const justUnblocked = !blocked && hasResolvedDependencies(item.id, ctx)
  const progress = checklistProgress(item, ctx)
  const overdue = isOverdue(item, ctx)
  const assignee = item.assigneeId ? ctx.users[item.assigneeId] : undefined

  return (
    <div
      className={cn(
        'rounded-md border transition-colors',
        selected
          ? 'border-ring/60 bg-accent/30'
          : blocked
            ? 'border-blocked-border/70 bg-card hover:bg-accent/20'
            : 'border-border bg-card hover:bg-accent/20',
      )}
    >
      <div
        onClick={onSelect}
        role="button"
        tabIndex={0}
        aria-expanded={selected}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect()
          }
        }}
        className="flex h-8 cursor-pointer items-center gap-2 px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {status && <StatusIcon category={status.category} />}
        <WorkItemKey value={item.key} />
        <span className="min-w-0 flex-1 truncate text-[13px]">{item.title}</span>

        {/* One reason, not five. The row is scanned, not read — a stack
            of badges on every line is a stack nobody separates. Once the
            row is open it states the reason in full below, so saying it
            here as well would be the same sentence twice. */}
        {!selected && <Reason item={item} ctx={ctx} blocked={blocked} details={details} overdue={overdue} />}

        {justUnblocked && <UnblockedBadge size="sm" />}
        <UserAvatar user={assignee} size="xs" />
      </div>

      {selected && (
        <div className="flex flex-col gap-2 border-t border-border/60 px-2.5 pt-2 pb-2">
          {blocked && details.length > 0 && (
            <div className="flex flex-col gap-1">
              <BlockedBadge size="sm" count={details.length} />
              <ul className="flex flex-col gap-0.5 pl-0.5 text-[11px] text-muted-foreground">
                {details.map((detail, index) => (
                  <li key={index}>{detail.label}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
            <StatusPicker workItemId={item.id} departmentId={item.departmentId} status={status} />
            <PriorityPicker workItemId={item.id} priority={item.priority} />
            <AssigneePicker workItemId={item.id} departmentId={item.departmentId} assigneeId={item.assigneeId} />
            <DueDatePicker
              workItemId={item.id}
              value={item.dueDate}
              overdue={overdue}
              dueToday={isDueToday(item, ctx)}
              placeholder="Due"
            />
            {progress && <ChecklistProgress progress={progress} className="ml-1" />}
            <Button
              variant="ghost"
              size="icon-xs"
              className="ml-auto text-muted-foreground"
              onClick={() => openWorkItem(item.id)}
              aria-label="Open full detail"
            >
              <ExternalLink />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The single most useful thing to say about why this row is here.
 *
 * Blocked work says what it is waiting for, because that names the
 * person who can unblock it. Everything else falls back to the date,
 * which is the only other thing the room can act on.
 */
function Reason({
  item,
  ctx,
  blocked,
  details,
  overdue,
}: {
  item: WorkItem
  ctx: EngineContext
  blocked: boolean
  details: ReturnType<typeof blockDetails>
  overdue: boolean
}) {
  if (blocked) {
    const first = details[0]
    return (
      <span className="hidden max-w-64 shrink-0 items-center gap-1 truncate text-[11px] text-blocked sm:flex">
        <span className="size-1.5 shrink-0 rounded-full bg-blocked" aria-hidden />
        <span className="truncate">{first?.label ?? 'Blocked'}</span>
        {details.length > 1 && <span className="shrink-0 opacity-70">+{details.length - 1}</span>}
      </span>
    )
  }

  if (item.dueDate) {
    return <DueDate value={item.dueDate} overdue={overdue} dueToday={isDueToday(item, ctx)} now={ctx.now} />
  }

  return <span className="text-[11px] text-muted-foreground">No date</span>
}
