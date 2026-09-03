'use client'

import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { TableView } from '@/components/views/table-view'

export default function TablePage() {
  return (
    <WorkspaceFrame layout="table">
      {({ groups, config, ctx, department }) => (
        <TableView groups={groups} config={config} ctx={ctx} departmentId={department.id} />
      )}
    </WorkspaceFrame>
  )
}
