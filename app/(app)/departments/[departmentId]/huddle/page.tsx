'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { History, Radio } from 'lucide-react'
import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { Attendance } from '@/components/huddle/attendance'
import { HuddleHeader } from '@/components/huddle/huddle-header'
import { PersonReview } from '@/components/huddle/person-review'
import { HuddleSummary } from '@/components/huddle/huddle-summary'
import { Button } from '@/components/ui/button'
import { useHuddlesForDepartment } from '@/lib/store/selectors'
import { huddleService } from '@/lib/services'
import type { EngineContext } from '@/lib/engine/context'
import type { Department, WorkItem } from '@/lib/types'

/**
 * PRD §26–§34. The huddle is a state machine over the department's
 * existing work:
 *
 *   attendance → running(person index) → summary → complete
 *
 * Each stage renders a different surface, but they all read and write
 * the same work items the board shows. Nothing is duplicated, so
 * "complete" needs no reconciliation step.
 */
export default function HuddlePage() {
  return (
    <WorkspaceFrame layout="board">
      {({ department, ctx, all }) => <HuddleStages department={department} ctx={ctx} items={all} />}
    </WorkspaceFrame>
  )
}

function HuddleStages({
  department,
  ctx,
  items,
}: {
  department: Department
  ctx: EngineContext
  items: WorkItem[]
}) {
  const huddles = useHuddlesForDepartment(department.id)
  const live = huddles.find((huddle) => huddle.stage !== 'complete')

  const members = useMemo(
    () => department.memberIds.map((id) => ctx.users[id]!).filter(Boolean),
    [department.memberIds, ctx.users],
  )

  const currentPersonId = live?.reviewOrder[live.currentIndex]
  const currentPerson = currentPersonId ? ctx.users[currentPersonId] : undefined

  const personItems = useMemo(
    () => (currentPersonId ? items.filter((item) => item.assigneeId === currentPersonId) : []),
    [items, currentPersonId],
  )

  if (!live) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex flex-col items-center gap-1.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-blocked-muted text-blocked">
            <Radio className="size-4.5" />
          </span>
          <h2 className="text-base font-semibold tracking-tight">No huddle in progress</h2>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            A huddle walks the team person by person through blockers, dependencies and overdue work — and writes every
            decision straight back onto the board.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="lg" onClick={() => huddleService.openHuddle(department.id)}>
            <Radio />
            Start {department.name} huddle
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link href={`/departments/${department.slug}/huddle/history`}>
              <History />
              History
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (live.stage === 'attendance' || live.stage === 'setup') {
    return <Attendance huddle={live} department={department} members={members} />
  }

  if (live.stage === 'summary') {
    return <HuddleSummary huddle={live} department={department} items={items} ctx={ctx} />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HuddleHeader huddle={live} department={department} ctx={ctx} />
      {currentPerson ? (
        <PersonReview huddle={live} person={currentPerson} items={personItems} ctx={ctx} />
      ) : (
        <div className="flex flex-1 items-center justify-center text-[13px] text-muted-foreground">
          Nobody left to review.
        </div>
      )}
    </div>
  )
}
