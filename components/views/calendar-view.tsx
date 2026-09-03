'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { Button } from '@/components/ui/button'
import { BlockedBadge, PriorityIndicator, StatusIcon, WorkItemKey } from '@/components/primitives'
import { useStore } from '@/lib/store/store'
import { isBlocked, isOverdue } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { WorkItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * PRD §16 — time-oriented planning, built by hand on `date-fns` rather
 * than pulled from a calendar library. Every one of those fights the
 * density and the token system, and a month grid is forty-two cells.
 *
 * Work is placed by due date; anything undated is listed beside the grid
 * rather than silently dropped, because "not scheduled" is exactly the
 * thing a planning view should surface.
 */
export function CalendarView({ items, ctx }: { items: WorkItem[]; ctx: EngineContext }) {
  const [month, setMonth] = useState(() => startOfMonth(ctx.now))
  const openWorkItem = useStore((state) => state.openWorkItem)

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  )

  const { byDay, undated } = useMemo(() => {
    const map = new Map<string, WorkItem[]>()
    const none: WorkItem[] = []

    for (const item of items) {
      if (!item.dueDate) {
        none.push(item)
        continue
      }
      const key = format(new Date(item.dueDate), 'yyyy-MM-dd')
      const list = map.get(key)
      if (list) list.push(item)
      else map.set(key, [item])
    }

    return { byDay: map, undated: none }
  }, [items])

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-h-0 flex-col">
        <header className="flex items-center gap-2 px-3 py-2">
          <h2 className="text-[13px] font-semibold">{format(month, 'MMMM yyyy')}</h2>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" onClick={() => setMonth(subMonths(month, 1))} aria-label="Previous month">
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
              <ChevronRight />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMonth(startOfMonth(ctx.now))}>
            Today
          </Button>
        </header>

        <div className="grid shrink-0 grid-cols-7 border-y border-border">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
            <div key={label} className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              {label}
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 overflow-y-auto scrollbar-thin">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayItems = byDay.get(key) ?? []
            const outside = !isSameMonth(day, month)

            return (
              <div
                key={key}
                className={cn(
                  'flex min-h-24 flex-col gap-0.5 border-r border-b border-border p-1',
                  outside && 'bg-muted/25',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded text-[11px] tabular-nums',
                    isToday(day) && 'bg-primary font-semibold text-primary-foreground',
                    outside && 'text-muted-foreground/50',
                  )}
                >
                  {format(day, 'd')}
                </span>

                {dayItems.slice(0, 3).map((item) => {
                  const status = ctx.statuses[item.statusId]
                  const blocked = isBlocked(item.id, ctx)
                  const late = isOverdue(item, ctx)

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openWorkItem(item.id)}
                      title={`${item.key} ${item.title}`}
                      className={cn(
                        'flex items-center gap-1 rounded border px-1 py-0.5 text-left text-[11px] transition-colors',
                        'hover:border-ring/40 focus-visible:ring-2 focus-visible:ring-ring/40 outline-none',
                        blocked
                          ? 'border-blocked-border bg-blocked-muted/60'
                          : late
                            ? 'border-overdue-border bg-overdue-muted/50'
                            : 'border-border bg-card',
                      )}
                    >
                      {status && <StatusIcon category={status.category} className="size-2.5" />}
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    </button>
                  )
                })}

                {dayItems.length > 3 && (
                  <span className="px-1 text-[10px] text-muted-foreground">+{dayItems.length - 3} more</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <aside className="hidden min-h-0 flex-col overflow-y-auto border-l border-border px-3 py-2 scrollbar-thin xl:flex">
        <h3 className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          No due date ({undated.length})
        </h3>
        <div className="flex flex-col gap-1">
          {undated.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openWorkItem(item.id)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 text-left transition-colors hover:border-ring/40"
            >
              <PriorityIndicator priority={item.priority} />
              <WorkItemKey value={item.key} />
              <span className="min-w-0 flex-1 truncate text-[12px]">{item.title}</span>
              {isBlocked(item.id, ctx) && <BlockedBadge size="sm" />}
            </button>
          ))}
          {undated.length === 0 && <p className="text-[12px] text-muted-foreground">Everything is scheduled.</p>}
        </div>
      </aside>
    </div>
  )
}
