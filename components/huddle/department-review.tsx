'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, GitBranch, Inbox, ListChecks, OctagonAlert, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { HuddleWorkRow } from './huddle-work-row'
import { Discussion } from './discussion'
import { DynamicIcon, UserAvatar } from '@/components/primitives'
import { HuddleScorecard } from '@/components/metrics'
import { attentionOf, huddleAgenda, workStats } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { Department, Huddle, User, WorkItem } from '@/lib/types'
import { hueStyle } from '@/lib/ui/tokens'
import { cn } from '@/lib/utils'

/**
 * One department's turn, spoken for by its head.
 *
 * The agenda is deliberately narrow: **what cannot proceed, and what
 * nobody has started**. Blockers lead — all of them, since there are few
 * and each is a real problem — followed by the highest-scoring backlog
 * items up to the organization's limit. Everything else is one click
 * away and stays there.
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

  const stats = useMemo(() => workStats(items, ctx), [items, ctx])
  const agenda = useMemo(() => huddleAgenda(items, ctx, backlogLimit), [items, ctx, backlogLimit])

  // One merged ranked list: blockers outrank backlog by construction, so
  // sorting by score alone produces the right order.
  const discussed = useMemo(
    () =>
      [...agenda.blockers, ...agenda.backlog].sort(
        (a, b) => attentionOf(b, ctx).score - attentionOf(a, ctx).score,
      ),
    [agenda.blockers, agenda.backlog, ctx],
  )

  const activeId = selectedId ?? discussed[0]?.id ?? null
  const activeItem = activeId ? ctx.workItems[activeId] : undefined

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-h-0 overflow-y-auto px-4 py-4 scrollbar-thin">
        <header className="mb-4 flex items-start gap-3">
          <span
            style={hueStyle(department.hue)}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--chip-bg)] text-[var(--chip-fg)]"
          >
            <DynamicIcon name={department.icon} className="size-5" />
          </span>

          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-base font-semibold tracking-tight">{department.name}</h2>
            <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <UserAvatar user={head} size="xs" />
              {head?.name ?? 'No head assigned'}
              {head?.title && <span className="opacity-70">· {head.title}</span>}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Stat icon={<ListChecks className="size-3" />} value={stats.active} label="active" />
              {stats.blockers > 0 && (
                <Stat
                  icon={<OctagonAlert className="size-3" />}
                  value={stats.blockers}
                  label={stats.blockers === 1 ? 'blocker' : 'blockers'}
                  tone="blocked"
                />
              )}
              <Stat icon={<Inbox className="size-3" />} value={stats.backlog} label="in backlog" />
              {stats.dependencies > 0 && (
                <Stat icon={<GitBranch className="size-3" />} value={stats.dependencies} label="with dependencies" />
              )}
              {stats.overdue > 0 && (
                <Stat icon={<TriangleAlert className="size-3" />} value={stats.overdue} label="overdue" tone="overdue" />
              )}
            </div>
          </div>
        </header>

        {/* Numbers first, then issues — the order a Scaling Up huddle
            runs in, and the reason anyone keeps the scorecard current. */}
        <div className="mb-4">
          <HuddleScorecard department={department} ctx={ctx} />
        </div>

        <div className="mb-2 flex items-baseline gap-2">
          <h3 className="text-[13px] font-semibold">
            {discussed.length === 0
              ? 'Nothing to discuss'
              : `${discussed.length} thing${discussed.length === 1 ? '' : 's'} to discuss`}
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {agenda.blockers.length} blocked · {stats.backlog} in backlog · {items.length} items in total
          </span>
        </div>

        {discussed.length === 0 ? (
          <p className="rounded-md border border-border bg-card px-3 py-4 text-[13px] text-muted-foreground">
            Nothing blocked and nothing sitting in the backlog. Move on.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {discussed.map((item) => (
              <li key={item.id}>
                <HuddleWorkRow
                  item={item}
                  ctx={ctx}
                  reasons={attentionOf(item, ctx).reasons}
                  selected={item.id === activeId}
                  onSelect={() => setSelectedId(item.id)}
                />
              </li>
            ))}
          </ul>
        )}

        {agenda.remainingBacklog.length > 0 && (
          <Collapsible open={showAllBacklog} onOpenChange={setShowAllBacklog} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ChevronDown className={cn('transition-transform', showAllBacklog && 'rotate-180')} />
                {showAllBacklog
                  ? 'Show fewer'
                  : `Show ${agenda.remainingBacklog.length} more backlog item${agenda.remainingBacklog.length === 1 ? '' : 's'}`}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-2 flex flex-col gap-1.5">
              {agenda.remainingBacklog.map((item) => (
                <HuddleWorkRow
                  key={item.id}
                  item={item}
                  ctx={ctx}
                  reasons={attentionOf(item, ctx).reasons}
                  selected={item.id === activeId}
                  onSelect={() => setSelectedId(item.id)}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
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

function Stat({
  icon,
  value,
  label,
  tone = 'muted',
}: {
  icon: React.ReactNode
  value: number
  label: string
  tone?: 'muted' | 'blocked' | 'overdue'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] tabular-nums',
        tone === 'blocked' && 'font-medium text-blocked',
        tone === 'overdue' && 'font-medium text-overdue',
        tone === 'muted' && 'text-muted-foreground',
      )}
    >
      {icon}
      {value} {label}
    </span>
  )
}
