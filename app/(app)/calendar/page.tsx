'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/dashboard/page-header'
import { CalendarView } from '@/components/views/calendar-view'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAllWorkItems, useCurrentUser, useDepartments, useEngineContext } from '@/lib/store/selectors'
import { isDone } from '@/lib/engine/derive'

/** The personal calendar: the same month grid, scoped to one person. */
export default function PersonalCalendarPage() {
  const items = useAllWorkItems()
  const ctx = useEngineContext()
  const user = useCurrentUser()
  const departments = useDepartments()

  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const [departmentId, setDepartmentId] = useState('all')
  const [includeDone, setIncludeDone] = useState('open')

  const visible = useMemo(
    () =>
      items
        .filter((item) => scope === 'all' || item.assigneeId === user?.id)
        .filter((item) => departmentId === 'all' || item.departmentId === departmentId)
        .filter((item) => includeDone === 'all' || !isDone(item, ctx)),
    [items, scope, user, departmentId, includeDone, ctx],
  )

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`${visible.length} item${visible.length === 1 ? '' : 's'}`}
        actions={
          <>
            <Select value={scope} onValueChange={(value) => setScope(value as 'mine' | 'all')}>
              <SelectTrigger size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mine">My work</SelectItem>
                <SelectItem value="all">Everyone</SelectItem>
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
            <Select value={includeDone} onValueChange={setIncludeDone}>
              <SelectTrigger size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open only</SelectItem>
                <SelectItem value="all">Include done</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      <CalendarView items={visible} ctx={ctx} />
    </>
  )
}
