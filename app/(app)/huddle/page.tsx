'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { History, Radio, TriangleAlert } from 'lucide-react'
import { Attendance } from '@/components/huddle/attendance'
import { HuddleHeader } from '@/components/huddle/huddle-header'
import { DepartmentReview } from '@/components/huddle/department-review'
import { HuddleSummary } from '@/components/huddle/huddle-summary'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  useAllWorkItems,
  useCurrentOrg,
  useDepartments,
  useEngineContext,
  useStoreHuddles,
} from '@/lib/store/selectors'
import { huddleService } from '@/lib/services'

/**
 * The huddle is a state machine over the organization's existing work:
 *
 *   attendance → running(department) → summary → complete
 *
 * Each stage renders a different surface, but they all read and write
 * the same work items the boards show. Nothing is duplicated, so
 * "complete" needs no reconciliation step.
 */
export default function HuddlePage() {
  const organization = useCurrentOrg()
  const departments = useDepartments()
  const items = useAllWorkItems()
  const ctx = useEngineContext()
  const huddles = useStoreHuddles()

  const live = huddles.find(
    (huddle) => huddle.organizationId === organization?.id && huddle.stage !== 'complete',
  )

  const currentDepartmentId = live?.reviewOrder[live.currentIndex]
  const currentDepartment = currentDepartmentId ? ctx.departments[currentDepartmentId] : undefined
  const currentHead = currentDepartment ? ctx.users[currentDepartment.leadId] : undefined

  const departmentItems = useMemo(
    () => (currentDepartmentId ? items.filter((item) => item.departmentId === currentDepartmentId) : []),
    [items, currentDepartmentId],
  )

  const headless = departments.filter((department) => !department.leadId)

  if (!organization) return null

  if (!live) {
    return (
      <>
        <PageHeader
          title="Huddle"
          description="The heads-of-department meeting"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/huddle/history">
                <History />
                History
              </Link>
            </Button>
          }
        />

        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex max-w-md flex-col items-center gap-1.5">
            <span className="flex size-10 items-center justify-center rounded-full bg-blocked-muted text-blocked">
              <Radio className="size-4.5" />
            </span>
            <h2 className="text-base font-semibold tracking-tight">No huddle in progress</h2>
            <p className="text-[13px] text-muted-foreground">
              The huddle walks department by department, each spoken for by its head, through what cannot proceed and
              what nobody has started — and writes every decision straight back onto the boards.
            </p>
          </div>

          {headless.length > 0 && (
            <Alert variant="warning" className="max-w-md text-left">
              <TriangleAlert />
              <AlertTitle>
                {headless.length} department{headless.length === 1 ? '' : 's'} without a head
              </AlertTitle>
              <AlertDescription>
                <p>
                  {headless.map((department) => department.name).join(', ')} cannot take part until someone is set as
                  head in Settings → Departments.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <Button size="lg" onClick={() => huddleService.openHuddle(organization.id)}>
            <Radio />
            Start the leadership huddle
          </Button>
        </div>
      </>
    )
  }

  if (live.stage === 'attendance' || live.stage === 'setup') {
    return <Attendance huddle={live} organization={organization} ctx={ctx} />
  }

  if (live.stage === 'summary') {
    return <HuddleSummary huddle={live} organization={organization} items={items} ctx={ctx} />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HuddleHeader huddle={live} ctx={ctx} />
      {currentDepartment ? (
        <DepartmentReview
          huddle={live}
          department={currentDepartment}
          head={currentHead}
          items={departmentItems}
          ctx={ctx}
          backlogLimit={organization.huddle.backlogLimit}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-[13px] text-muted-foreground">
          No departments left to review.
        </div>
      )}
    </div>
  )
}
