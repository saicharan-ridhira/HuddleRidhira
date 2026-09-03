'use client'

import { useMemo } from 'react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DynamicIcon, StatusIcon, UserAvatar } from '@/components/primitives'
import { useAllWorkItems, useDepartments, useEngineContext, useStoreHuddles } from '@/lib/store/selectors'
import { isBlocked, isDone, isOverdue, statusCategoryOf } from '@/lib/engine/derive'
import { hueStyle, statusColor } from '@/lib/ui/tokens'
import { cn } from '@/lib/utils'

/**
 * A small set of real numbers computed from the live data, not an
 * analytics engine — the prototype's job here is to show where reporting
 * would sit, and to prove the counts come from the same derived state
 * the rest of the product uses.
 */
export default function ReportsPage() {
  const items = useAllWorkItems()
  const departments = useDepartments()
  const huddles = useStoreHuddles()
  const ctx = useEngineContext()

  const perDepartment = useMemo(
    () =>
      departments.map((department) => {
        const owned = items.filter((item) => item.departmentId === department.id)
        const done = owned.filter((item) => isDone(item, ctx))
        return {
          department,
          total: owned.length,
          done: done.length,
          blocked: owned.filter((item) => isBlocked(item.id, ctx)).length,
          overdue: owned.filter((item) => isOverdue(item, ctx)).length,
          completion: owned.length === 0 ? 0 : Math.round((done.length / owned.length) * 100),
        }
      }),
    [departments, items, ctx],
  )

  const throughput = useMemo(() => {
    // Completions per day over the last fortnight.
    const days = Array.from({ length: 14 }, (_, index) => {
      const day = new Date(ctx.now)
      day.setDate(day.getDate() - (13 - index))
      day.setHours(0, 0, 0, 0)
      return day
    })

    return days.map((day) => {
      const next = new Date(day)
      next.setDate(next.getDate() + 1)
      const count = items.filter((item) => {
        if (!item.completedAt) return false
        const at = new Date(item.completedAt)
        return at >= day && at < next
      }).length
      return { day, count }
    })
  }, [items, ctx])

  const byCategory = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      const category = statusCategoryOf(item, ctx)
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [items, ctx])

  const attendance = useMemo(() => {
    const complete = huddles.filter((huddle) => huddle.stage === 'complete')
    if (complete.length === 0) return null
    const totals = complete.reduce(
      (acc, huddle) => ({
        present: acc.present + huddle.participants.filter((entry) => entry.attendance === 'present').length,
        total: acc.total + huddle.participants.length,
      }),
      { present: 0, total: 0 },
    )
    return {
      rate: Math.round((totals.present / totals.total) * 100),
      huddles: complete.length,
      actions: complete.reduce((sum, huddle) => sum + huddle.actionIds.length, 0),
    }
  }, [huddles])

  const maxThroughput = Math.max(1, ...throughput.map((entry) => entry.count))

  return (
    <>
      <PageHeader title="Reports" description="Computed live from the current board" />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
          <section className="flex flex-col gap-2">
            <h2 className="text-[13px] font-semibold">By department</h2>
            <div className="overflow-hidden rounded-lg border border-border">
              {perDepartment.map(({ department, total, done, blocked, overdue, completion }) => (
                <div
                  key={department.id}
                  className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
                >
                  <span
                    style={hueStyle(department.hue)}
                    className="flex size-6 shrink-0 items-center justify-center rounded bg-[var(--chip-bg)] text-[var(--chip-fg)]"
                  >
                    <DynamicIcon name={department.icon} />
                  </span>
                  <span className="w-24 shrink-0 truncate text-[13px] font-medium">{department.name}</span>

                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-unblocked" style={{ width: `${completion}%` }} />
                  </span>

                  <span className="w-10 shrink-0 text-right text-[12px] tabular-nums">{completion}%</span>
                  <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                    {done}/{total}
                  </span>
                  <span
                    className={cn(
                      'w-16 shrink-0 text-right text-[11px] tabular-nums',
                      blocked > 0 ? 'font-medium text-blocked' : 'text-muted-foreground',
                    )}
                  >
                    {blocked} blocked
                  </span>
                  <span
                    className={cn(
                      'w-16 shrink-0 text-right text-[11px] tabular-nums',
                      overdue > 0 ? 'font-medium text-overdue' : 'text-muted-foreground',
                    )}
                  >
                    {overdue} late
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="flex flex-col gap-2">
              <h2 className="text-[13px] font-semibold">Completed per day</h2>
              <div className="flex h-32 items-end gap-1 rounded-lg border border-border p-3">
                {throughput.map(({ day, count }) => (
                  <div key={day.toISOString()} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <span className="text-[9px] tabular-nums text-muted-foreground">{count || ''}</span>
                    <span
                      className="w-full rounded-t bg-primary/70"
                      style={{ height: `${Math.max(2, (count / maxThroughput) * 72)}px` }}
                      title={`${count} completed on ${day.toLocaleDateString()}`}
                    />
                    <span className="text-[9px] text-muted-foreground">{day.getDate()}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-[13px] font-semibold">Where work sits</h2>
              <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
                {byCategory.map(([category, count]) => {
                  const max = Math.max(...byCategory.map(([, value]) => value))
                  return (
                    <div key={category} className="flex items-center gap-2">
                      <StatusIcon category={category as never} />
                      <span className="w-20 shrink-0 text-[12px] capitalize">{category}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${(count / max) * 100}%`, backgroundColor: statusColor(category as never) }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          {attendance && (
            <section className="flex flex-col gap-2">
              <h2 className="text-[13px] font-semibold">Huddles</h2>
              <div className="grid grid-cols-3 gap-2">
                <Metric label="Completed huddles" value={attendance.huddles} />
                <Metric label="Average attendance" value={`${attendance.rate}%`} />
                <Metric label="Actions created" value={attendance.actions} />
              </div>
            </section>
          )}

          <section className="flex flex-col gap-2">
            <h2 className="text-[13px] font-semibold">Blocked work by owner</h2>
            <div className="flex flex-col gap-1 rounded-lg border border-border p-2">
              {(() => {
                const counts = new Map<string, number>()
                for (const item of items) {
                  if (!isBlocked(item.id, ctx) || !item.assigneeId) continue
                  counts.set(item.assigneeId, (counts.get(item.assigneeId) ?? 0) + 1)
                }
                const rows = [...counts.entries()].sort((a, b) => b[1] - a[1])
                if (rows.length === 0)
                  return <p className="px-1.5 py-1 text-[12px] text-muted-foreground">Nothing is blocked.</p>

                const max = Math.max(...rows.map(([, value]) => value))
                return rows.map(([userId, count]) => (
                  <div key={userId} className="flex items-center gap-2 px-1.5 py-0.5">
                    <UserAvatar user={ctx.users[userId]} size="xs" />
                    <span className="w-32 shrink-0 truncate text-[12px]">{ctx.users[userId]?.name}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-blocked" style={{ width: `${(count / max) * 100}%` }} />
                    </span>
                    <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-blocked">{count}</span>
                  </div>
                ))
              })()}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5">
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-xl leading-none font-semibold tabular-nums">{value}</span>
    </div>
  )
}
