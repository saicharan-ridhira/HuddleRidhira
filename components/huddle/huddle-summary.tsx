'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CircleCheck, GitBranch, Inbox, ListChecks, OctagonAlert, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DueDate, StatusIcon, UserAvatar, WorkItemKey } from '@/components/primitives'
import { useStore } from '@/lib/store/store'
import { huddleService } from '@/lib/services'
import { isBlocked, isDone, relationsOf, statusCategoryOf } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { Huddle, Organization, WorkItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * PRD §34. Short, and about what happens next rather than what was said.
 *
 * The Peak-End Rule says the ending disproportionately shapes how the
 * whole meeting is remembered, so this screen leads with the actions
 * people are walking away with, grouped by owner.
 */
export function HuddleSummary({
  huddle,
  organization,
  items,
  ctx,
}: {
  huddle: Huddle
  organization: Organization
  items: WorkItem[]
  ctx: EngineContext
}) {
  const router = useRouter()
  const openWorkItem = useStore((state) => state.openWorkItem)

  const stats = useMemo(() => {
    // Only the departments actually reviewed count toward the figures —
    // reporting numbers for a department nobody spoke for would overstate
    // what the meeting covered.
    const reviewed = new Set(huddle.reviewOrder)
    const scoped = items.filter((item) => reviewed.has(item.departmentId))

    const present = huddle.participants.filter((entry) => entry.attendance === 'present').length
    const blockers = scoped.filter((item) => isBlocked(item.id, ctx)).length
    const backlog = scoped.filter((item) => !isDone(item, ctx) && statusCategoryOf(item, ctx) === 'backlog').length
    const dependencies = scoped.filter((item) => relationsOf(item.id, ctx).length > 0).length

    const durationMinutes = huddle.startedAt
      ? Math.max(1, Math.round((ctx.now.getTime() - new Date(huddle.startedAt).getTime()) / 60_000))
      : null

    return {
      present,
      total: huddle.participants.length,
      blockers,
      backlog,
      dependencies,
      itemsUpdated: huddle.updatedWorkItemIds.length,
      actionsCreated: huddle.actionIds.length,
      durationMinutes,
    }
  }, [huddle, items, ctx])

  const actionsByOwner = useMemo(() => {
    const grouped = new Map<string, Array<(typeof ctx.huddleActions)[string]>>()
    for (const id of huddle.actionIds) {
      const action = ctx.huddleActions[id]
      if (!action) continue
      const list = grouped.get(action.ownerId)
      if (list) list.push(action)
      else grouped.set(action.ownerId, [action])
    }
    return [...grouped.entries()]
  }, [huddle.actionIds, ctx])

  const discussions = huddle.discussionIds.map((id) => ctx.huddleDiscussions[id]!).filter(Boolean)
  const updated = huddle.updatedWorkItemIds.map((id) => ctx.workItems[id]!).filter(Boolean)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 overflow-y-auto px-6 py-8 scrollbar-thin">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">{organization.name} Leadership Huddle</h1>
        <p className="text-[13px] text-muted-foreground">
          {stats.durationMinutes ? `${stats.durationMinutes} minutes · ` : ''}
          {new Date(huddle.scheduledFor).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile icon={<Users className="size-3.5" />} value={`${stats.present}/${stats.total}`} label="Departments" />
        <StatTile
          icon={<OctagonAlert className="size-3.5" />}
          value={stats.blockers}
          label="Blockers"
          tone={stats.blockers > 0 ? 'blocked' : 'muted'}
        />
        <StatTile icon={<Inbox className="size-3.5" />} value={stats.backlog} label="In backlog" />
        <StatTile icon={<GitBranch className="size-3.5" />} value={stats.dependencies} label="Dependencies" />
        <StatTile icon={<ListChecks className="size-3.5" />} value={stats.itemsUpdated} label="Items updated" />
        <StatTile icon={<CircleCheck className="size-3.5" />} value={stats.actionsCreated} label="Actions" />
      </section>

      {actionsByOwner.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Actions</h2>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
            {actionsByOwner.map(([ownerId, actions]) => {
              const owner = ctx.users[ownerId]
              return (
                <div key={ownerId} className="flex gap-2.5">
                  <UserAvatar user={owner} size="default" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[13px] font-medium">{owner?.name ?? 'Someone'}</span>
                    <ul className="flex flex-col gap-1">
                      {actions.map((action) => (
                        <li key={action!.id} className="flex items-center gap-2 text-[13px]">
                          <span className="text-muted-foreground">→</span>
                          <span className={cn('flex-1', action!.done && 'line-through opacity-60')}>{action!.text}</span>
                          <DueDate value={action!.dueDate} now={ctx.now} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {discussions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Decisions</h2>
          <ul className="flex flex-col gap-1.5">
            {discussions.map((entry) => {
              const item = ctx.workItems[entry.workItemId]
              if (!item) return null
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => openWorkItem(item.id)}
                    className="flex w-full flex-col gap-1 rounded-md border border-border bg-card px-2.5 py-2 text-left transition-colors hover:border-ring/40"
                  >
                    <span className="flex items-center gap-2">
                      <WorkItemKey value={item.key} />
                      <span className="truncate text-[13px] font-medium">{item.title}</span>
                    </span>
                    {entry.why && <span className="text-[12px] text-muted-foreground">Why: {entry.why}</span>}
                    {entry.decision && <span className="text-[12px]">Decision: {entry.decision}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {updated.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Work changed in this huddle
          </h2>
          <ul className="flex flex-col gap-px">
            {updated.map((item) => {
              const status = ctx.statuses[item.statusId]
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openWorkItem(item.id)}
                    className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-accent/50"
                  >
                    {status && <StatusIcon category={status.category} />}
                    <WorkItemKey value={item.key} />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{item.title}</span>
                    <span className="text-[11px] text-muted-foreground">{status?.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <footer className="flex items-center gap-2 pt-1">
        <Button
          size="lg"
          onClick={() => {
            huddleService.completeHuddle(huddle.id)
            router.push('/dashboard')
          }}
        >
          <CircleCheck />
          Complete huddle
        </Button>
        <Button variant="ghost" size="lg" onClick={() => huddleService.reopenReview(huddle.id)}>
          <ArrowLeft />
          Back to review
        </Button>
        <p className="ml-auto text-[11px] text-muted-foreground">
          Every change above is already on the board.
        </p>
      </footer>
    </div>
  )
}

function StatTile({
  icon,
  value,
  label,
  tone = 'muted',
}: {
  icon: React.ReactNode
  value: string | number
  label: string
  tone?: 'muted' | 'blocked' | 'overdue'
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-md border px-2.5 py-2',
        tone === 'blocked' && 'border-blocked-border bg-blocked-muted/50',
        tone === 'overdue' && 'border-overdue-border bg-overdue-muted/50',
        tone === 'muted' && 'border-border bg-card',
      )}
    >
      <span
        className={cn(
          'flex items-center gap-1 text-[10px] tracking-wide uppercase',
          tone === 'blocked' ? 'text-blocked' : tone === 'overdue' ? 'text-overdue' : 'text-muted-foreground',
        )}
      >
        {icon}
        {label}
      </span>
      <span className="text-lg leading-none font-semibold tabular-nums">{value}</span>
    </div>
  )
}
