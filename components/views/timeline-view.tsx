'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { addDays, differenceInCalendarDays, endOfWeek, format, isToday, startOfWeek } from 'date-fns'
import { BlockedBadge, StatusIcon, UserAvatar, WorkItemKey } from '@/components/primitives'
import { EmptyState } from './list-view'
import { useStore } from '@/lib/store/store'
import { BLOCKING_RELATIONS } from '@/lib/types'
import { isBlocked, isOverdue, relationsOf, statusCategoryOf } from '@/lib/engine/derive'
import { statusColor } from '@/lib/ui/tokens'
import type { EngineContext } from '@/lib/engine/context'
import type { WorkItem } from '@/lib/types'
import { cn } from '@/lib/utils'

const DAY_WIDTH = 26
const ROW_HEIGHT = 30
const LABEL_WIDTH = 240

/**
 * PRD §16 and §24 — scheduling plus dependency visualisation.
 *
 * Bars are absolutely positioned on a day grid; arrows are drawn in one
 * SVG overlay sharing the same coordinate space, so geometry is computed
 * from the same numbers that position the bars rather than measured back
 * out of the DOM. That is what keeps the arrows correct while the user
 * scrolls, and it is why this is hand-built rather than a gantt library.
 *
 * Only *blocking* relations get arrows. Drawing every "related to" as a
 * line turns the view into a hairball and tells you nothing about what
 * is actually waiting on what (Law of Uniform Connectedness works only
 * when the connection means one thing).
 */
export function TimelineView({ items, ctx }: { items: WorkItem[]; ctx: EngineContext }) {
  const openWorkItem = useStore((state) => state.openWorkItem)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scheduled = useMemo(() => items.filter((item) => item.dueDate || item.startDate), [items])

  const { start, days } = useMemo(() => {
    if (scheduled.length === 0) {
      const from = startOfWeek(ctx.now, { weekStartsOn: 1 })
      return { start: from, days: 42 }
    }

    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY

    for (const item of scheduled) {
      const from = new Date(item.startDate ?? item.dueDate!).getTime()
      const to = new Date(item.dueDate ?? item.startDate!).getTime()
      min = Math.min(min, from, to)
      max = Math.max(max, from, to)
    }

    // Pad so today is always on screen even when all work sits ahead of it.
    min = Math.min(min, ctx.now.getTime())
    max = Math.max(max, ctx.now.getTime())

    const from = startOfWeek(new Date(min), { weekStartsOn: 1 })
    const to = endOfWeek(new Date(max), { weekStartsOn: 1 })
    return { start: from, days: Math.max(21, differenceInCalendarDays(to, from) + 1) }
  }, [scheduled, ctx.now])

  const rows = useMemo(
    () =>
      scheduled.map((item, index) => {
        const from = new Date(item.startDate ?? item.dueDate!)
        const to = new Date(item.dueDate ?? item.startDate!)
        const offset = Math.max(0, differenceInCalendarDays(from, start))
        const span = Math.max(1, differenceInCalendarDays(to, from) + 1)
        return { item, index, offset, span }
      }),
    [scheduled, start],
  )

  const rowById = useMemo(() => new Map(rows.map((row) => [row.item.id, row])), [rows])

  // Arrows: from the end of the blocker's bar to the start of the dependent's.
  const arrows = useMemo(() => {
    const result: Array<{ id: string; x1: number; y1: number; x2: number; y2: number; resolved: boolean }> = []

    for (const row of rows) {
      for (const edge of relationsOf(row.item.id, ctx)) {
        if (!BLOCKING_RELATIONS.includes(edge.relation)) continue
        const source = rowById.get(edge.otherId)
        if (!source) continue

        const resolved = ['completed', 'cancelled'].includes(statusCategoryOf(source.item, ctx))

        result.push({
          id: `${source.item.id}-${row.item.id}`,
          x1: (source.offset + source.span) * DAY_WIDTH,
          y1: source.index * ROW_HEIGHT + ROW_HEIGHT / 2,
          x2: row.offset * DAY_WIDTH,
          y2: row.index * ROW_HEIGHT + ROW_HEIGHT / 2,
          resolved,
        })
      }
    }

    return result
  }, [rows, rowById, ctx])

  // Open on today rather than at the far left of the range.
  useLayoutEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const todayOffset = differenceInCalendarDays(ctx.now, start) * DAY_WIDTH
    node.scrollLeft = Math.max(0, todayOffset - node.clientWidth / 3)
  }, [start, ctx.now])

  if (scheduled.length === 0) {
    return <EmptyState message="Nothing in this view has a start or due date." />
  }

  const gridWidth = days * DAY_WIDTH
  const todayOffset = differenceInCalendarDays(ctx.now, start) * DAY_WIDTH

  return (
    <div className="flex min-h-0 flex-1">
      <div className="shrink-0 border-r border-border" style={{ width: LABEL_WIDTH }}>
        <div className="h-9 border-b border-border" />
        <div className="overflow-hidden">
          {rows.map(({ item }) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openWorkItem(item.id)}
              style={{ height: ROW_HEIGHT }}
              className="flex w-full items-center gap-1.5 px-2.5 text-left transition-colors hover:bg-accent/40 focus-visible:bg-accent/50 outline-none"
            >
              <StatusIcon category={statusCategoryOf(item, ctx)} />
              <WorkItemKey value={item.key} className="w-14 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-[12px]">{item.title}</span>
              <UserAvatar user={item.assigneeId ? ctx.users[item.assigneeId] : undefined} size="xs" />
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="min-w-0 flex-1 overflow-auto scrollbar-thin">
        <div style={{ width: gridWidth }}>
          <DayHeader start={start} days={days} />

          <div className="relative" style={{ height: rows.length * ROW_HEIGHT }}>
            <GridLines start={start} days={days} height={rows.length * ROW_HEIGHT} />

            {todayOffset >= 0 && todayOffset <= gridWidth && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-primary/60"
                style={{ left: todayOffset + DAY_WIDTH / 2 }}
              />
            )}

            <DependencyArrows arrows={arrows} width={gridWidth} height={rows.length * ROW_HEIGHT} />

            {rows.map(({ item, index, offset, span }) => {
              const blocked = isBlocked(item.id, ctx)
              const late = isOverdue(item, ctx)
              const category = statusCategoryOf(item, ctx)

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openWorkItem(item.id)}
                  title={`${item.key} ${item.title}`}
                  className={cn(
                    'absolute z-20 flex items-center gap-1 rounded border px-1.5 text-[11px] transition-colors',
                    'hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring/50 outline-none',
                    blocked
                      ? 'border-blocked-border bg-blocked-muted'
                      : late
                        ? 'border-overdue-border bg-overdue-muted'
                        : 'border-border bg-card',
                  )}
                  style={{
                    left: offset * DAY_WIDTH + 2,
                    top: index * ROW_HEIGHT + 5,
                    width: span * DAY_WIDTH - 4,
                    height: ROW_HEIGHT - 10,
                  }}
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: statusColor(category) }}
                    aria-hidden
                  />
                  {/* A one-day bar has no room for a title, so the label
                      sits outside it rather than being clipped away. */}
                  {span > 2 ? (
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  ) : (
                    <span className="absolute top-1/2 left-full ml-1.5 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap">
                      <span className="max-w-56 truncate text-[11px] text-muted-foreground">{item.title}</span>
                      {blocked && <BlockedBadge size="sm" />}
                    </span>
                  )}
                  {blocked && span > 2 && <BlockedBadge size="sm" className="shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function DayHeader({ start, days }: { start: Date; days: number }) {
  const cells = Array.from({ length: days }, (_, index) => addDays(start, index))

  return (
    <div className="sticky top-0 z-30 flex h-9 border-b border-border bg-background/95 backdrop-blur">
      {cells.map((day, index) => {
        const isMonthStart = day.getDate() === 1 || index === 0
        return (
          <div
            key={day.toISOString()}
            style={{ width: DAY_WIDTH }}
            className={cn(
              'relative flex shrink-0 flex-col items-center justify-center',
              isMonthStart && 'border-l border-border',
            )}
          >
            {isMonthStart && (
              <span className="absolute top-0.5 left-1 text-[9px] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase">
                {format(day, 'MMM')}
              </span>
            )}
            <span
              className={cn(
                'mt-2 flex size-4 items-center justify-center rounded text-[10px] tabular-nums',
                isToday(day) ? 'bg-primary font-semibold text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {format(day, 'd')}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function GridLines({ start, days, height }: { start: Date; days: number; height: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex">
      {Array.from({ length: days }, (_, index) => {
        const day = addDays(start, index)
        const weekend = day.getDay() === 0 || day.getDay() === 6
        return (
          <div
            key={index}
            style={{ width: DAY_WIDTH, height }}
            className={cn('shrink-0 border-r border-border/50', weekend && 'bg-muted/40')}
          />
        )
      })}
    </div>
  )
}

/**
 * One SVG overlay for every arrow. A path per relation, elbowed so it
 * reads as a route rather than a straight line across unrelated rows.
 * Resolved dependencies stay drawn but recede — the connection is still
 * true, it just no longer holds anything up.
 */
function DependencyArrows({
  arrows,
  width,
  height,
}: {
  arrows: Array<{ id: string; x1: number; y1: number; x2: number; y2: number; resolved: boolean }>
  width: number
  height: number
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  if (arrows.length === 0) return null

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 overflow-visible"
      width={width}
      height={height}
      aria-hidden
    >
      <defs>
        <marker id="tl-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--blocked)" />
        </marker>
        <marker id="tl-arrow-done" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted-foreground)" />
        </marker>
      </defs>

      {arrows.map((arrow) => {
        // Elbow out of the source, across, then into the target.
        const gap = Math.max(8, Math.min(16, Math.abs(arrow.x2 - arrow.x1) / 2))
        const midX = arrow.x2 - gap
        const path = `M ${arrow.x1} ${arrow.y1} L ${arrow.x1 + gap} ${arrow.y1} L ${arrow.x1 + gap} ${arrow.y2} L ${midX} ${arrow.y2} L ${arrow.x2 - 2} ${arrow.y2}`

        return (
          <path
            key={arrow.id}
            d={path}
            fill="none"
            stroke={arrow.resolved ? 'var(--muted-foreground)' : 'var(--blocked)'}
            strokeWidth={hovered === arrow.id ? 2 : 1.25}
            strokeOpacity={arrow.resolved ? 0.35 : 0.75}
            strokeDasharray={arrow.resolved ? '3 3' : undefined}
            markerEnd={`url(#${arrow.resolved ? 'tl-arrow-done' : 'tl-arrow'})`}
            onMouseEnter={() => setHovered(arrow.id)}
            onMouseLeave={() => setHovered(null)}
          />
        )
      })}
    </svg>
  )
}
