'use client'

import { Mountain } from 'lucide-react'
import type { EngineContext } from '@/lib/engine/context'
import { checklistProgress, isBlocked, isDone, isOverdue, statusOf } from '@/lib/engine/derive'
import { formatQuarter, quarterProgress } from '@/lib/engine/periods'
import type { WorkItem } from '@/lib/types'
import { useStore } from '@/lib/store/store'
import { BlockedBadge, DueDate, StatusPill, UserAvatar, WorkItemKey } from '@/components/primitives'
import { cn } from '@/lib/utils'

/**
 * The quarter's Rocks.
 *
 * A Rock here is an ordinary work item carrying a quarter, which is why
 * this component can show a real owner, a real due date and a real
 * blocked state without any of that being rebuilt: the Rock *is* the
 * work, and it moves on the board like everything else.
 */
export function RockList({
  rocks,
  quarter,
  ctx,
  emptyHint = 'Mark a work item as a Rock from its detail panel.',
}: {
  rocks: WorkItem[]
  quarter: string
  ctx: EngineContext
  emptyHint?: string
}) {
  const openWorkItem = useStore((state) => state.openWorkItem)
  const pace = quarterProgress(ctx.now)
  const done = rocks.filter((rock) => isDone(rock, ctx)).length

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Mountain className="size-3.5 text-muted-foreground" />
        <h2 className="text-[13px] font-semibold">Rocks · {formatQuarter(quarter)}</h2>
        {rocks.length > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {done} of {rocks.length} done · {Math.round(pace * 100)}% of the quarter gone
          </span>
        )}
      </div>

      {rocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-[12px] text-muted-foreground">
          No Rocks set for this quarter. {emptyHint}
        </p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-lg border border-border">
          {rocks.map((rock) => {
            const assignee = rock.assigneeId ? ctx.users[rock.assigneeId] : undefined
            const progress = checklistProgress(rock, ctx)
            const blocked = isBlocked(rock.id, ctx)
            const complete = isDone(rock, ctx)

            return (
              <li key={rock.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => openWorkItem(rock.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent/40"
                >
                  <WorkItemKey value={rock.key} />
                  <span className={cn('min-w-0 flex-1 truncate text-[13px]', complete && 'text-muted-foreground line-through')}>
                    {rock.title}
                  </span>

                  {blocked && <BlockedBadge size="sm" />}
                  <StatusPill status={statusOf(rock, ctx)} />

                  {progress && (
                    <span className="hidden w-24 items-center gap-1.5 sm:flex">
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className={cn('block h-full rounded-full', complete ? 'bg-unblocked' : 'bg-primary/70')}
                          style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
                        />
                      </span>
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {progress.done}/{progress.total}
                      </span>
                    </span>
                  )}

                  {rock.dueDate && !complete && (
                    <DueDate value={rock.dueDate} overdue={isOverdue(rock, ctx)} now={ctx.now} />
                  )}
                  <UserAvatar user={assignee} size="xs" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
