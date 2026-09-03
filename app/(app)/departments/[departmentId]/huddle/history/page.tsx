'use client'

import Link from 'next/link'
import { CircleCheck, Radio, Users } from 'lucide-react'
import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { Button } from '@/components/ui/button'
import { UserAvatar, WorkItemKey } from '@/components/primitives'
import { useHuddlesForDepartment } from '@/lib/store/selectors'
import type { EngineContext } from '@/lib/engine/context'
import type { Department } from '@/lib/types'

/** PRD §35 — past huddles, with the actions they produced. */
export default function HuddleHistoryPage() {
  return (
    <WorkspaceFrame layout="board">
      {({ department, ctx }) => <History department={department} ctx={ctx} />}
    </WorkspaceFrame>
  )
}

function History({ department, ctx }: { department: Department; ctx: EngineContext }) {
  const huddles = useHuddlesForDepartment(department.id).filter((huddle) => huddle.stage === 'complete')

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 overflow-y-auto px-6 py-6 scrollbar-thin">
      <header className="flex items-center gap-2">
        <h1 className="text-sm font-semibold tracking-tight">Huddle history</h1>
        <Button variant="ghost" size="sm" className="ml-auto" asChild>
          <Link href={`/departments/${department.slug}/huddle`}>
            <Radio />
            Current huddle
          </Link>
        </Button>
      </header>

      {huddles.length === 0 && (
        <p className="rounded-md border border-border bg-card px-3 py-6 text-center text-[13px] text-muted-foreground">
          No completed huddles yet.
        </p>
      )}

      {huddles.map((huddle) => {
        const present = huddle.participants.filter((entry) => entry.attendance === 'present').length
        const actions = huddle.actionIds.map((id) => ctx.huddleActions[id]!).filter(Boolean)
        const discussions = huddle.discussionIds.map((id) => ctx.huddleDiscussions[id]!).filter(Boolean)

        return (
          <article key={huddle.id} className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3">
            <header className="flex flex-wrap items-center gap-2">
              <h2 className="text-[13px] font-semibold">{huddle.title}</h2>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users className="size-3" />
                {present}/{huddle.participants.length}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {actions.length} action{actions.length === 1 ? '' : 's'}
              </span>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {new Date(huddle.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </header>

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
  )
}
