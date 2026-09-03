'use client'

import Link from 'next/link'
import { ArrowRight, Crown } from 'lucide-react'
import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { UserAvatar } from '@/components/primitives'
import { Badge } from '@/components/ui/badge'
import { isBlocked, isDone, isOverdue } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { Department, WorkItem } from '@/lib/types'

/** Who is in the department and what they are carrying right now. */
export default function MembersPage() {
  return (
    <WorkspaceFrame layout="board">
      {({ department, ctx, all }) => <Members department={department} ctx={ctx} items={all} />}
    </WorkspaceFrame>
  )
}

function Members({ department, ctx, items }: { department: Department; ctx: EngineContext; items: WorkItem[] }) {
  const members = department.memberIds.map((id) => ctx.users[id]!).filter(Boolean)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
      <div className="mx-auto grid w-full max-w-4xl gap-2 sm:grid-cols-2">
        {members.map((member) => {
          const owned = items.filter((item) => item.assigneeId === member.id)
          const active = owned.filter((item) => !isDone(item, ctx))
          const blocked = owned.filter((item) => isBlocked(item.id, ctx))
          const overdue = owned.filter((item) => isOverdue(item, ctx))
          const role = ctx.roles[member.roleId]

          return (
            <Link
              key={member.id}
              href={`/my-work?user=${member.id}`}
              className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-ring/40"
            >
              <UserAvatar user={member} size="xl" />

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-medium">{member.name}</span>
                  {member.id === department.leadId && (
                    <Crown className="size-3 shrink-0 text-overdue" aria-label="Department lead" />
                  )}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">{member.title}</span>

                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  <Badge variant="muted">{active.length} active</Badge>
                  {blocked.length > 0 && (
                    <span className="inline-flex h-5 items-center rounded border border-blocked-border bg-blocked-muted px-1.5 text-[11px] font-medium text-blocked">
                      {blocked.length} blocked
                    </span>
                  )}
                  {overdue.length > 0 && (
                    <span className="inline-flex h-5 items-center rounded border border-overdue-border bg-overdue-muted px-1.5 text-[11px] font-medium text-overdue">
                      {overdue.length} overdue
                    </span>
                  )}
                  {role && <Badge variant="outline">{role.name}</Badge>}
                </div>
              </div>

              <ArrowRight className="mt-1 size-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
