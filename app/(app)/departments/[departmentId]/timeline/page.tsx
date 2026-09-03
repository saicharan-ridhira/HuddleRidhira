'use client'

import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { TimelineView } from '@/components/views/timeline-view'

export default function TimelinePage() {
  return (
    <WorkspaceFrame layout="timeline">{({ flat, ctx }) => <TimelineView items={flat} ctx={ctx} />}</WorkspaceFrame>
  )
}
