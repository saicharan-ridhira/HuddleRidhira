'use client'

import { useCallback, useMemo } from 'react'
import { notFound, useParams } from 'next/navigation'
import { WorkspaceHeader } from './workspace-header'
import {
  useDepartmentBySlug,
  useDepartmentWorkItems,
  useEngineContext,
  useWorkingView,
} from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import { runPipeline, runPipelineFlat } from '@/lib/engine/pipeline'
import type { GroupedItems, Department, ViewConfig, ViewLayout, WorkItem } from '@/lib/types'
import type { EngineContext } from '@/lib/engine/context'

export interface WorkspaceRenderArgs {
  department: Department
  config: ViewConfig
  ctx: EngineContext
  /** Grouped result, for views that lay out by group. */
  groups: GroupedItems<WorkItem>[]
  /** Flat filtered+sorted result, for calendar and timeline. */
  flat: WorkItem[]
  /** Everything in the department, unfiltered — for header counts. */
  all: WorkItem[]
}

/**
 * Every department view is the same frame: resolve the department, run
 * the one pipeline, hand the result to a renderer. Filters, grouping and
 * sort live in the store keyed by department, so moving Board → Table
 * keeps what the user set up (PRD §16, §49).
 */
export function WorkspaceFrame({
  layout,
  children,
  showHeader = true,
}: {
  layout: ViewLayout
  children: (args: WorkspaceRenderArgs) => React.ReactNode
  showHeader?: boolean
}) {
  const params = useParams<{ departmentId: string }>()
  const department = useDepartmentBySlug(params?.departmentId)
  const ctx = useEngineContext()
  const all = useDepartmentWorkItems(department?.id)
  const config = useWorkingView(department?.id, layout)
  const setWorkingView = useStore((state) => state.setWorkingView)

  const onConfigChange = useCallback(
    (patch: Partial<ViewConfig>) => {
      if (department) setWorkingView(department.id, patch)
    },
    [department, setWorkingView],
  )

  const { groups, flat } = useMemo(() => {
    if (!department) return { groups: [], flat: [] }
    const statusUniverse = ctx.workflows[department.workflowId]?.statusIds ?? []
    return {
      groups: runPipeline(all, config, ctx, { statusUniverse, memberUniverse: department.memberIds }),
      flat: runPipelineFlat(all, config, ctx),
    }
  }, [all, config, ctx, department])

  if (!department) notFound()

  return (
    <div className="group/board flex min-h-0 flex-1 flex-col">
      {showHeader && (
        <WorkspaceHeader
          department={department}
          config={config}
          onConfigChange={onConfigChange}
          items={all}
        />
      )}
      {children({ department, config, ctx, groups, flat, all })}
    </div>
  )
}
