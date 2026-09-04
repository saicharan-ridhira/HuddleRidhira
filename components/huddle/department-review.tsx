'use client'

import { useMemo, useState } from 'react'
import { HuddleWorkRow } from './huddle-work-row'
import { Discussion } from './discussion'
import { DynamicIcon, UserAvatar } from '@/components/primitives'
import { HuddleScorecard } from '@/components/metrics'
import { huddleAgenda, workStats } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { Department, Huddle, User, WorkItem } from '@/lib/types'
import { hueStyle } from '@/lib/ui/tokens'
import { cn } from '@/lib/utils'

/**
 * One department's turn, spoken for by its head.
 *
 * Four things are in front of the room and nothing else: the numbers,
 * the targets they are measured against, what cannot proceed, and what
 * nobody has started. Anything a head already knows — how many items are
 * active, how many carry dependencies, the total on the board — is not a
 * decision the meeting can make, so it is not here.
 *
 * Blockers and backlog get their own headed sections rather than one
 * ranked list. They rank correctly when merged, but they are two
 * different conversations — "who unblocks this" and "should this be
 * started at all" — and running them together made a dozen rows read as
 * one undifferentiated wall.
 *
 * The cap on backlog is the load-bearing detail. Engineering alone
 * carries twenty-six untouched items; reading them all out would turn a
 * leadership meeting back into a database browse, and the two or three
 * that actually matter would be skimmed past.
 */
export function DepartmentReview({
  huddle,
  department,
  head,
  items,
  ctx,
  backlogLimit,
}: {
  huddle: Huddle
  department: Department
  head: User | undefined
  items: WorkItem[]
  ctx: EngineContext
  backlogLimit: number
}) {
  const [showAllBacklog, setShowAllBacklog] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Moving to the next department has to clear the selection, or the
  // discussion panel keeps showing the previous department's item and
  // the room captures a decision against the wrong work. Adjusted during
  // render rather than in an effect, so no frame ever paints the stale
  // one.
  const [reviewing, setReviewing] = useState(department.id)
  if (department.id !== reviewing) {
    setReviewing(department.id)
    setSelectedId(null)
    setShowAllBacklog(false)
  }

  const stats = useMemo(() => workStats(items, ctx), [items, ctx])
  const agenda = useMemo(() => huddleAgenda(items, ctx, backlogLimit), [items, ctx, backlogLimit])

  const backlog = showAllBacklog ? [...agenda.backlog, ...agenda.remainingBacklog] : agenda.backlog
  const activeId = selectedId ?? agenda.blockers[0]?.id ?? agenda.backlog[0]?.id ?? null
  const activeItem = activeId ? ctx.workItems[activeId] : undefined

  const nothingToDiscuss = agenda.blockers.length === 0 && agenda.backlog.length === 0

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-h-0 overflow-y-auto px-4 py-4 scrollbar-thin">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <header className="flex items-center gap-3">
            <span
              style={hueStyle(department.hue)}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--chip-bg)] text-[var(--chip-fg)]"
            >
              <DynamicIcon name={department.icon} className="size-4.5" />
            </span>

            <div className="flex min-w-0 flex-col">
              <h2 className="text-base font-semibold tracking-tight">{department.name}</h2>
              <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <UserAvatar user={head} size="xs" />
                {head?.name ?? 'No head assigned'}
              </p>
            </div>

            {/* Two counts, both of them things the room can act on. */}
            <div className="ml-auto flex shrink-0 items-baseline gap-3 text-[11px] tabular-nums">
              {stats.blockers > 0 && (
                <span className="font-medium text-blocked">
                  {stats.blockers} blocked
                </span>
              )}
              {stats.backlog > 0 && <span className="text-muted-foreground">{stats.backlog} not started</span>}
            </div>
          </header>

          {/* Numbers first, then issues — the order a Scaling Up huddle
              runs in, and the reason anyone keeps the scorecard current. */}
          <HuddleScorecard department={department} ctx={ctx} />

          <AgendaSection
            title="Blocked"
            count={agenda.blockers.length}
            hint="Each one needs a name and a next step."
            empty="Nothing blocked."
          >
            {agenda.blockers.map((item) => (
              <HuddleWorkRow
                key={item.id}
                item={item}
                ctx={ctx}
                selected={item.id === activeId}
                onSelect={() => setSelectedId(item.id === activeId ? null : item.id)}
              />
            ))}
          </AgendaSection>

          <AgendaSection
            title="Not started"
            count={stats.backlog}
            shown={agenda.remainingBacklog.length > 0 ? backlog.length : undefined}
            hint="Start it, drop it, or leave it — but say which."
            empty="Nothing sitting untouched."
            action={
              agenda.remainingBacklog.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllBacklog((previous) => !previous)}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {showAllBacklog ? 'Show top few' : `Show all ${stats.backlog}`}
                </button>
              ) : undefined
            }
          >
            {backlog.map((item) => (
              <HuddleWorkRow
                key={item.id}
                item={item}
                ctx={ctx}
                selected={item.id === activeId}
                onSelect={() => setSelectedId(item.id === activeId ? null : item.id)}
              />
            ))}
          </AgendaSection>

          {nothingToDiscuss && (
            <p className="rounded-md border border-border bg-card px-3 py-4 text-center text-[13px] text-muted-foreground">
              Nothing blocked and nothing sitting in the backlog. Move on.
            </p>
          )}
        </div>
      </div>

      <aside className="min-h-0 overflow-y-auto border-t border-border lg:border-t-0 lg:border-l scrollbar-thin">
        {activeItem ? (
          <Discussion huddle={huddle} item={activeItem} subjectDepartmentId={department.id} ctx={ctx} />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-muted-foreground">
            Select an item to capture what was decided.
          </div>
        )}
      </aside>
    </div>
  )
}

/**
 * A headed group of rows.
 *
 * The hint says what the room is meant to *do* with the section, which
 * is the part a bare count leaves out — "9 blocked" is a fact, "each one
 * needs a name and a next step" is an agenda.
 */
function AgendaSection({
  title,
  count,
  shown,
  hint,
  empty,
  action,
  children,
}: {
  title: string
  count: number
  /** How many are on screen, when that differs from the total. */
  shown?: number
  hint: string
  empty: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <h3 className={cn('text-[13px] font-semibold', count === 0 && 'text-muted-foreground')}>
          {title}
          {count > 0 && (
            <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">
              {shown !== undefined && shown !== count ? `${shown} of ${count}` : count}
            </span>
          )}
        </h3>
        {count > 0 && <span className="text-[11px] text-muted-foreground">{hint}</span>}
        {action && <span className="ml-auto">{action}</span>}
      </div>

      {count === 0 ? (
        <p className="text-[12px] text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-col gap-1">{children}</div>
      )}
    </section>
  )
}
