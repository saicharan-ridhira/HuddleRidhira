'use client'

import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { CalendarView } from '@/components/views/calendar-view'

export default function CalendarPage() {
  return (
    <WorkspaceFrame layout="calendar">{({ flat, ctx }) => <CalendarView items={flat} ctx={ctx} />}</WorkspaceFrame>
  )
}
