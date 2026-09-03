'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CircleCheckBig,
  ListChecks,
  OctagonAlert,
  Radio,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { WorkRow } from '@/components/views/work-row'
import { Button } from '@/components/ui/button'
import { DynamicIcon, UserAvatar } from '@/components/primitives'
import { relativeTime } from '@/components/work/work-item-drawer'
import {
  useAllWorkItems,
  useAuditEvents,
  useCurrentOrg,
  useCurrentUser,
  useDepartments,
  useEngineContext,
  useStoreHuddles,
} from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import { attentionOf, isBlocked, isDone, isOverdue, statusCategoryOf } from '@/lib/engine/derive'
import { hueStyle } from '@/lib/ui/tokens'
import { cn } from '@/lib/utils'

/**
 * PRD §8. The dashboard answers three questions — who is here, what are
 * they working on, what is blocking them — and it answers the third one
 * loudest.
 *
 * The counters are deliberately quiet and the attention list is
 * deliberately not. Giving every metric equal visual weight is the
 * failure mode §8 warns about: a wall of equally sized numbers tells a
 * manager nothing about where to look first (selective attention).
 */
export default function DashboardPage() {
  const user = useCurrentUser()
  const organization = useCurrentOrg()
  const departments = useDepartments()
  const items = useAllWorkItems()
  const ctx = useEngineContext()
  const huddles = useStoreHuddles()
  const audit = useAuditEvents(8)
  const openWorkItem = useStore((state) => state.openWorkItem)

  const stats = useMemo(() => {
    const blocked = items.filter((item) => isBlocked(item.id, ctx))
    const overdue = items.filter((item) => isOverdue(item, ctx))
    const completedToday = items.filter(
      (item) => item.completedAt && new Date(item.completedAt).toDateString() === ctx.now.toDateString(),
    )
    const completedThisWeek = items.filter(
      (item) => item.completedAt && ctx.now.getTime() - new Date(item.completedAt).getTime() < 7 * 86_400_000,
    )
    return { blocked, overdue, completedToday, completedThisWeek }
  }, [items, ctx])

  const attention = useMemo(
    () =>
      items
        .map((item) => ({ item, attention: attentionOf(item, ctx) }))
        .filter((entry) => entry.attention.needsDiscussion)
        .sort((a, b) => b.attention.score - a.attention.score)
        .slice(0, 7),
    [items, ctx],
  )

  /** Per-department readiness for the huddle: what its head will raise. */
  const departmentRows = useMemo(
    () =>
      departments.map((department) => {
        const deptItems = items.filter((item) => item.departmentId === department.id)
        return {
          department,
          head: department.leadId ? ctx.users[department.leadId] : undefined,
          blockers: deptItems.filter((item) => isBlocked(item.id, ctx)).length,
          backlog: deptItems.filter(
            (item) => !isDone(item, ctx) && statusCategoryOf(item, ctx) === 'backlog',
          ).length,
        }
      }),
    [departments, items, ctx],
  )

  const liveHuddle = huddles.find(
    (huddle) => huddle.organizationId === organization?.id && huddle.stage !== 'complete',
  )

  /** Average attendance across huddles that have actually been held. */
  const attendanceRate = useMemo(() => {
    const held = huddles.filter((huddle) => huddle.stage === 'complete')
    if (held.length === 0) return null

    const totals = held.reduce(
      (acc, huddle) => ({
        present: acc.present + huddle.participants.filter((entry) => entry.attendance === 'present').length,
        total: acc.total + huddle.participants.length,
      }),
      { present: 0, total: 0 },
    )
    return totals.total === 0 ? null : Math.round((totals.present / totals.total) * 100)
  }, [huddles])

  const greeting = (() => {
    const hour = ctx.now.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user?.name.split(' ')[0] ?? 'there'}`}
        description="Today's overview"
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
          {/* Quiet counters. The loud thing is below. */}
          <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Counter
              icon={<Radio className="size-3.5" />}
              label="Departments"
              value={departments.length}
            />
            <Counter
              icon={<Users className="size-3.5" />}
              label="Attendance"
              value={attendanceRate === null ? '—' : `${attendanceRate}%`}
            />
            <Counter
              icon={<OctagonAlert className="size-3.5" />}
              label="Blockers"
              value={stats.blocked.length}
              tone={stats.blocked.length > 0 ? 'blocked' : 'muted'}
            />
            <Counter
              icon={<CircleCheckBig className="size-3.5" />}
              label="Completed this week"
              value={stats.completedThisWeek.length}
            />
          </section>

          {attention.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[13px] font-semibold">Attention required</h2>
                <span className="text-[11px] text-muted-foreground">
                  {stats.blocked.length} blocked · {stats.overdue.length} overdue
                </span>
                <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" asChild>
                  <Link href="/blocked">
                    See all
                    <ArrowRight />
                  </Link>
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                {attention.map(({ item }) => (
                  <WorkRow
                    key={item.id}
                    item={item}
                    ctx={ctx}
                    fields={['key', 'status', 'priority', 'assignee', 'dueDate', 'blocked', 'checklist']}
                    density="comfortable"
                    onOpen={openWorkItem}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[13px] font-semibold">Leadership huddle</h2>
                <Button size="sm" className="ml-auto" variant={liveHuddle ? 'blocked' : 'default'} asChild>
                  <Link href="/huddle">
                    <Radio />
                    {liveHuddle ? 'Resume' : 'Start'}
                  </Link>
                </Button>
              </div>

              <div className="flex flex-col gap-1">
                {departmentRows.map(({ department, head, blockers, backlog }) => (
                  <Link
                    key={department.id}
                    href="/huddle"
                    className="group flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-ring/40"
                  >
                    <span
                      style={hueStyle(department.hue)}
                      className="flex size-6 shrink-0 items-center justify-center rounded bg-[var(--chip-bg)] text-[var(--chip-fg)]"
                    >
                      <DynamicIcon name={department.icon} />
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-medium">{department.name}</span>
                      <span className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                        {head ? (
                          <>
                            <UserAvatar user={head} size="xs" />
                            {head.name}
                          </>
                        ) : (
                          <span className="text-overdue">No head assigned</span>
                        )}
                      </span>
                    </span>

                    {blockers > 0 ? (
                      <span className="shrink-0 text-[11px] font-medium tabular-nums text-blocked">
                        {blockers} blocked
                      </span>
                    ) : (
                      <span className="shrink-0 text-[11px] text-muted-foreground">no blockers</span>
                    )}

                    <span className="w-20 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                      {backlog} in backlog
                    </span>

                    <ArrowRight className="size-3 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[13px] font-semibold">Recent activity</h2>
                <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" asChild>
                  <Link href="/audit-logs">
                    Audit log
                    <ArrowRight />
                  </Link>
                </Button>
              </div>

              <ul className="flex flex-col gap-1 rounded-lg border border-border p-2">
                {audit.map((event) => (
                  <li key={event.id} className="flex items-center gap-2 text-[12px]">
                    <UserAvatar user={ctx.users[event.actorId]} size="xs" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{ctx.users[event.actorId]?.name ?? 'Someone'}</span>{' '}
                      <span className="text-muted-foreground">{event.summary}</span>
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {relativeTime(event.at, ctx.now)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="flex flex-col gap-2">
            <h2 className="text-[13px] font-semibold">Your day</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniStat
                href="/my-work"
                icon={<ListChecks className="size-3.5" />}
                label="Assigned to you"
                value={items.filter((item) => item.assigneeId === user?.id && !isDone(item, ctx)).length}
              />
              <MiniStat
                href="/blocked"
                icon={<OctagonAlert className="size-3.5" />}
                label="Your blockers"
                value={items.filter((item) => item.assigneeId === user?.id && isBlocked(item.id, ctx)).length}
                tone="blocked"
              />
              <MiniStat
                href="/calendar"
                icon={<TriangleAlert className="size-3.5" />}
                label="Your overdue"
                value={items.filter((item) => item.assigneeId === user?.id && isOverdue(item, ctx)).length}
                tone="overdue"
              />
              <MiniStat
                href="/my-work"
                icon={<CircleCheckBig className="size-3.5" />}
                label="Done this week"
                value={stats.completedThisWeek.filter((item) => item.assigneeId === user?.id).length}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

function Counter({
  icon,
  label,
  value,
  tone = 'muted',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  tone?: 'muted' | 'blocked'
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border px-3 py-2.5',
        tone === 'blocked' ? 'border-blocked-border bg-blocked-muted/40' : 'border-border bg-card',
      )}
    >
      <span
        className={cn(
          'flex items-center gap-1.5 text-[10px] font-medium tracking-wide uppercase',
          tone === 'blocked' ? 'text-blocked' : 'text-muted-foreground',
        )}
      >
        {icon}
        {label}
      </span>
      <span className="text-xl leading-none font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function MiniStat({
  href,
  icon,
  label,
  value,
  tone = 'muted',
}: {
  href: string
  icon: React.ReactNode
  label: string
  value: number
  tone?: 'muted' | 'blocked' | 'overdue'
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-ring/40"
    >
      <span
        className={cn(
          tone === 'blocked' ? 'text-blocked' : tone === 'overdue' ? 'text-overdue' : 'text-muted-foreground',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-[15px] font-semibold tabular-nums',
          tone === 'blocked' && value > 0 && 'text-blocked',
          tone === 'overdue' && value > 0 && 'text-overdue',
        )}
      >
        {value}
      </span>
    </Link>
  )
}
