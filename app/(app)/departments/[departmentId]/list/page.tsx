'use client'

import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { ListView } from '@/components/views/list-view'

export default function ListPage() {
  return (
    <WorkspaceFrame layout="list">
      {({ groups, config, ctx }) => <ListView groups={groups} config={config} ctx={ctx} />}
    </WorkspaceFrame>
  )
}
