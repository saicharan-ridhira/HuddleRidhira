'use client'

import Link from 'next/link'
import { ArrowRight, GitBranch, ListChecks, OctagonAlert, Radio, TriangleAlert } from 'lucide-react'
import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { Button } from '@/components/ui/button'
import { WorkRow } from '@/components/views/work-row'
import { StatusIcon, UserAvatar } from '@/components/primitives'
import { useStore } from '@/lib/store/store'
import { attentionOf, isBlocked, isDone, isOverdue, relationsOf } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { Department, WorkItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * The department's own answer to the dashboard's three questions,
 * scoped to one team. Attention comes first and everything else is
 * quieter — a wall of equally weighted counters would tell a lead
 * nothing about where to look (§8's selective attention).
 */
export default function DepartmentOverviewPage() {
  return (
    <WorkspaceFrame layout="board">
      {({ department, ctx, all }) => <Overview department={department} ctx={ctx} items={all} />}
    </WorkspaceFrame>
  )
}

function Overview({ department, ctx, items }: { department: Department; ctx: EngineContext; items: WorkItem[] }) {
  const openWorkItem = useStore((state) => state.openWorkItem)

  const blocked = items.filter((item) => isBlocked(item.id, ctx))
  const overdue = items.filter((item) => isOverdue(item, ctx))
  const done = items.filter((item) => isDone(item, ctx))
  const withDeps = items.filter((item) => relationsOf(item.id, ctx).length > 0)

  const attention = items
    .map((item) => ({ item, attention: attentionOf(item, ctx) }))
    .filter((entry) => entry.attention.needsDiscussion)
    .sort((a, b) => b.attention.score - a.attention.score)
    .slice(0, 8)

  const byStatus = (ctx.workflows[department.workflowId]?.statusIds ?? []).map((statusId) => ({
    status: ctx.statuses[statusId]!,
    count: items.filter((item) => item.statusId === statusId).length,
  }))

  const byPerson = department.memberIds
    .map((userId) => {
      const owned = items.filter((item) => item.assigneeId === userId && !isDone(item, ctx))
      return {
        user: ctx.users[userId]!,
        active: owned.length,
        blocked: owned.filter((item) => isBlocked(item.id, ctx)).length,
      }
    })
    .filter((entry) => entry.user)
    .sort((a, b) => b.blocked - a.blocked || b.active - a.active)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Tile
            icon={<OctagonAlert className="size-3.5" />}
            label="Blocked"
            value={blocked.length}
            tone={blocked.length > 0 ? 'blocked' : 'muted'}
          />
          <Tile
            icon={<TriangleAlert className="size-3.5" />}
            label="Overdue"
            value={overdue.length}
            tone={overdue.length > 0 ? 'overdue' : 'muted'}
          />
          <Tile icon={<GitBranch className="size-3.5" />} label="With dependencies" value={withDeps.length} />
          <Tile icon={<ListChecks className="size-3.5" />} label="Completed" value={done.length} />
        </section>

        {attention.length > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-semibold">Needs attention</h2>
              <Button size="sm" className="ml-auto" asChild>
                <Link href={`/departments/${department.slug}/huddle`}>
                  <Radio />
                  Start huddle
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
            <h2 className="text-[13px] font-semibold">Where the work is</h2>
            <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
              {byStatus.map(({ status, count }) => {
                const max = Math.max(1, ...byStatus.map((entry) => entry.count))
                return (
                  <div key={status.id} className="flex items-center gap-2">
                    <StatusIcon category={status.category} />
                    <span className="w-28 shrink-0 truncate text-[12px]">{status.name}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-primary/70"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[13px] font-semibold">Who is carrying what</h2>
            <div className="flex flex-col gap-px rounded-lg border border-border p-1.5">
              {byPerson.map(({ user, active, blocked: personBlocked }) => (
                <Link
                  key={user.id}
                  href={`/my-work?user=${user.id}`}
                  className="flex items-center gap-2 rounded px-1.5 py-1 transition-colors hover:bg-accent/50"
                >
                  <UserAvatar user={user} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[12px]">{user.name}</span>
                  {personBlocked > 0 && (
                    <span className="inline-flex h-4 items-center rounded bg-blocked-muted px-1 text-[10px] font-medium tabular-nums text-blocked">
                      {personBlocked} blocked
                    </span>
                  )}
                  <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">{active} active</span>
                  <ArrowRight className="size-3 text-muted-foreground/50" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Tile({
  icon,
  label,
  value,
  tone = 'muted',
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone?: 'muted' | 'blocked' | 'overdue'
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border px-3 py-2.5',
        tone === 'blocked' && 'border-blocked-border bg-blocked-muted/50',
        tone === 'overdue' && 'border-overdue-border bg-overdue-muted/50',
        tone === 'muted' && 'border-border bg-card',
      )}
    >
      <span
        className={cn(
          'flex items-center gap-1.5 text-[10px] font-medium tracking-wide uppercase',
          tone === 'blocked' ? 'text-blocked' : tone === 'overdue' ? 'text-overdue' : 'text-muted-foreground',
        )}
      >
        {icon}
        {label}
      </span>
      <span className="text-xl leading-none font-semibold tabular-nums">{value}</span>
    </div>
  )
}
