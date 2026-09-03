'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, OctagonAlert } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/views/list-view'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BlockedBadge, DueDate, StatusIcon, UserAvatar, WorkItemKey } from '@/components/primitives'
import { useAllWorkItems, useCurrentUser, useDepartments, useEngineContext } from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import { attentionOf, blockDetails, isBlocked, isOverdue } from '@/lib/engine/derive'

/**
 * Every blocked item in one place, ranked by the same `attentionOf`
 * score the huddle and the dashboard use — so "most important blocker"
 * means the same thing in all three.
 *
 * Each row states what it is waiting for, because a list of blocked
 * work without the reasons is a list of things to go and ask about.
 */
export default function BlockedPage() {
  const items = useAllWorkItems()
  const ctx = useEngineContext()
  const departments = useDepartments()
  const currentUser = useCurrentUser()
  const openWorkItem = useStore((state) => state.openWorkItem)

  const [scope, setScope] = useState<'all' | 'mine'>('all')
  const [departmentId, setDepartmentId] = useState<string>('all')

  const blocked = useMemo(
    () =>
      items
        .filter((item) => isBlocked(item.id, ctx))
        .filter((item) => scope === 'all' || item.assigneeId === currentUser?.id)
        .filter((item) => departmentId === 'all' || item.departmentId === departmentId)
        .sort((a, b) => attentionOf(b, ctx).score - attentionOf(a, ctx).score),
    [items, ctx, scope, departmentId, currentUser],
  )

  return (
    <>
      <PageHeader
        title="Blocked"
        description={`${blocked.length} item${blocked.length === 1 ? '' : 's'} cannot currently proceed`}
        actions={
          <>
            <Select value={scope} onValueChange={(value) => setScope(value as 'all' | 'mine')}>
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="mine">Assigned to me</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      {blocked.length === 0 ? (
        <EmptyState message="Nothing is blocked." />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
          <ul className="mx-auto flex w-full max-w-4xl flex-col gap-1.5">
            {blocked.map((item) => {
              const status = ctx.statuses[item.statusId]
              const department = ctx.departments[item.departmentId]
              const details = blockDetails(item.id, ctx)

              return (
                <li key={item.id}>
                  <div className="flex flex-col gap-1.5 rounded-lg border border-blocked-border bg-card px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => openWorkItem(item.id)}
                      className="flex items-center gap-2 text-left outline-none focus-visible:underline"
                    >
                      {status && <StatusIcon category={status.category} />}
                      <WorkItemKey value={item.key} />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{item.title}</span>
                      <BlockedBadge size="sm" count={details.length} />
                      <DueDate value={item.dueDate} overdue={isOverdue(item, ctx)} now={ctx.now} />
                      <UserAvatar user={item.assigneeId ? ctx.users[item.assigneeId] : undefined} size="xs" />
                    </button>

                    <ul className="flex flex-col gap-0.5 border-l-2 border-blocked-border pl-2.5">
                      {details.map((detail, index) => (
                        <li key={index} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <OctagonAlert className="size-3 shrink-0 text-blocked" />
                          {detail.label}
                          {detail.workItemId && (
                            <button
                              type="button"
                              onClick={() => openWorkItem(detail.workItemId!)}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              open
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>

                    {department && (
                      <Button variant="ghost" size="xs" className="w-fit text-muted-foreground" asChild>
                        <Link href={`/departments/${department.slug}/huddle`}>
                          Raise in the {department.name} huddle
                          <ArrowRight />
                        </Link>
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>
  )
}
