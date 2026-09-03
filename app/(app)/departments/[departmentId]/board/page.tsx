'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { Board } from '@/components/work/board'
import { useStore } from '@/lib/store/store'
import { workItemService } from '@/lib/services'

export default function BoardPage() {
  return (
    <WorkspaceFrame layout="board">
      {({ department, config, groups }) => (
        <>
          <NewItemFromQuery departmentId={department.id} statusId={groups[0]?.key} />
          <Board groups={groups} groupBy={config.groupBy} departmentId={department.id} />
        </>
      )}
    </WorkspaceFrame>
  )
}

/** Lets the command palette's "Create work item" land straight in the drawer. */
function NewItemFromQuery({ departmentId, statusId }: { departmentId: string; statusId?: string }) {
  const searchParams = useSearchParams()
  const openWorkItem = useStore((state) => state.openWorkItem)
  const wantsNew = searchParams.get('new') === '1'

  useEffect(() => {
    if (!wantsNew || !statusId) return
    const id = workItemService.createWorkItem({ title: 'New work item', departmentId, statusId })
    if (id) openWorkItem(id)
    window.history.replaceState(null, '', window.location.pathname)
  }, [wantsNew, statusId, departmentId, openWorkItem])

  return null
}
