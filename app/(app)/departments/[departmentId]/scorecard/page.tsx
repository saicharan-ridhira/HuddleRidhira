'use client'

import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { DepartmentScorecard } from '@/components/metrics'

/**
 * The department's numbers.
 *
 * `showHeader` is off because the filter, sort and group controls act on
 * work items, and a scorecard has none — offering them would be chrome
 * that cannot do anything.
 */
export default function ScorecardPage() {
  return (
    <WorkspaceFrame layout="board" showHeader={false}>
      {({ department, ctx }) => <DepartmentScorecard department={department} ctx={ctx} />}
    </WorkspaceFrame>
  )
}
