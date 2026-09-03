'use client'

import Link from 'next/link'
import { CircleCheck, Radio, Trash2, Users } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { DynamicIcon, UserAvatar, WorkItemKey } from '@/components/primitives'
import { Pagination, usePagination } from '@/components/shared/pagination'
import { useCurrentOrg, useEngineContext, useStoreHuddles } from '@/lib/store/selectors'
import { huddleService } from '@/lib/services'
import { hueStyle } from '@/lib/ui/tokens'
import { toast } from 'sonner'

/** Past leadership huddles, with the actions they produced. */
export default function HuddleHistoryPage() {
  const organization = useCurrentOrg()
  const ctx = useEngineContext()
  const huddles = useStoreHuddles().filter(
    (huddle) => huddle.organizationId === organization?.id && huddle.stage === 'complete',
  )

  // One huddle a day accumulates fast; the archive needs paging even
  // though it looks short on day one.
  const pagination = usePagination(huddles, 25)

  return (
    <>
      <PageHeader
        title="Huddle history"
        description={`${huddles.length} completed huddle${huddles.length === 1 ? '' : 's'}`}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/huddle">
              <Radio />
              Current huddle
            </Link>
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          {huddles.length === 0 && (
            <p className="rounded-md border border-border bg-card px-3 py-8 text-center text-[13px] text-muted-foreground">
              No completed huddles yet.
            </p>
          )}

          {pagination.items.map((huddle) => {
            const present = huddle.participants.filter((entry) => entry.attendance === 'present').length
            const actions = huddle.actionIds.map((id) => ctx.huddleActions[id]!).filter(Boolean)
            const discussions = huddle.discussionIds.map((id) => ctx.huddleDiscussions[id]!).filter(Boolean)

            return (
              <article key={huddle.id} className="group flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3">
                <header className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[13px] font-semibold">{huddle.title}</h2>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="size-3" />
                    {present}/{huddle.participants.length} departments
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {actions.length} action{actions.length === 1 ? '' : 's'}
                  </span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {new Date(huddle.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                    onClick={() => {
                      huddleService.deleteHuddle(huddle.id)
                      toast.success('Huddle deleted')
                    }}
                    aria-label={`Delete ${huddle.title}`}
                  >
                    <Trash2 />
                  </Button>
                </header>

                <ul className="flex flex-wrap items-center gap-1.5">
                  {huddle.participants.map((participant) => {
                    const department = ctx.departments[participant.departmentId]
                    if (!department) return null
                    return (
                      <li
                        key={participant.departmentId}
                        style={hueStyle(department.hue)}
                        className={
                          participant.attendance === 'present'
                            ? 'inline-flex h-5 items-center gap-1 rounded border border-transparent bg-[var(--chip-bg)] px-1.5 text-[10px] font-medium text-[var(--chip-fg)]'
                            : 'inline-flex h-5 items-center gap-1 rounded border border-dashed border-border px-1.5 text-[10px] text-muted-foreground line-through'
                        }
                      >
                        <DynamicIcon name={department.icon} className="size-2.5" />
                        {department.name}
                      </li>
                    )
                  })}
                </ul>

                {discussions.map((entry) => {
                  const item = ctx.workItems[entry.workItemId]
                  return (
                    <div key={entry.id} className="flex flex-col gap-0.5 border-l-2 border-border pl-2.5">
                      {item && (
                        <span className="flex items-center gap-2">
                          <WorkItemKey value={item.key} />
                          <span className="truncate text-[12px] font-medium">{item.title}</span>
                        </span>
                      )}
                      {entry.why && <span className="text-[12px] text-muted-foreground">Why: {entry.why}</span>}
                      {entry.decision && <span className="text-[12px]">Decision: {entry.decision}</span>}
                    </div>
                  )
                })}

                {actions.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {actions.map((action) => (
                      <li key={action.id} className="flex items-center gap-2 text-[12px]">
                        <CircleCheck
                          className={action.done ? 'size-3.5 text-unblocked' : 'size-3.5 text-muted-foreground/50'}
                        />
                        <UserAvatar user={ctx.users[action.ownerId]} size="xs" />
                        <span className={action.done ? 'flex-1 line-through opacity-60' : 'flex-1'}>{action.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })}
        </div>

        {huddles.length > 0 && (
          <div className="mx-auto w-full max-w-3xl">
            <Pagination state={pagination} itemLabel="huddles" />
          </div>
        )}
      </div>
    </>
  )
}
