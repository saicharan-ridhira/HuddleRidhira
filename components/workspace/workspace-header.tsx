'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ViewSwitcher } from './view-switcher'
import { FilterBar } from './filter-bar'
import { GroupMenu } from './group-menu'
import { SortMenu } from './sort-menu'
import { ViewMenu, WorkspaceOverflow } from './view-menu'
import { DynamicIcon } from '@/components/primitives'
import { CreateWorkItemDialog } from '@/components/work/create-work-item-dialog'
import { useEngineContext } from '@/lib/store/selectors'
import { isBlocked } from '@/lib/engine/derive'
import type { Department, ViewConfig, WorkItem } from '@/lib/types'
import { hueStyle } from '@/lib/ui/tokens'

/**
 * PRD §6, §27, §43, §44.
 *
 * Two rows and nothing more: identity and creation on top, the whole
 * work-management control set beneath.
 *
 * The second row is the whole work-management control set:
 * `[Filter] [Group] [Sort]` on the left as one proximity group, and
 * `[View ▾] [⋯]` on the right. Everything else in the product is
 * reached from inside one of those five.
 */
export function WorkspaceHeader({
  department,
  config,
  onConfigChange,
  items,
}: {
  department: Department
  config: ViewConfig
  onConfigChange: (patch: Partial<ViewConfig>) => void
  items: WorkItem[]
}) {
  const ctx = useEngineContext()
  const [creating, setCreating] = useState(false)

  const blockedCount = items.filter((item) => isBlocked(item.id, ctx)).length

  const statuses = ctx.workflows[department.workflowId]?.statusIds ?? []
  const firstStatus = statuses[0]

  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-border px-3 pt-2.5 pb-2">
      <div className="flex items-center gap-2">
        <span
          style={hueStyle(department.hue)}
          className="flex size-6 items-center justify-center rounded bg-[var(--chip-bg)] text-[var(--chip-fg)]"
        >
          <DynamicIcon name={department.icon} />
        </span>

        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-sm font-semibold tracking-tight">{department.name}</h1>
          <span className="hidden truncate text-[12px] text-muted-foreground md:inline">{department.description}</span>
        </div>

        {blockedCount > 0 && (
          <button
            type="button"
            onClick={() =>
              onConfigChange({
                filter: {
                  kind: 'group',
                  id: 'root',
                  combinator: 'and',
                  children: [{ kind: 'condition', id: 'quick-blocked', field: 'blocked', operator: 'is', value: true }],
                },
              })
            }
            className="inline-flex h-5 items-center gap-1 rounded border border-blocked-border bg-blocked-muted px-1.5 text-[11px] font-medium text-blocked transition-opacity hover:opacity-80"
            title="Filter to blocked work"
          >
            {blockedCount} blocked
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {firstStatus && (
            <Button variant="default" size="sm" onClick={() => setCreating(true)}>
              <Plus />
              <span className="hidden sm:inline">New work item</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ViewSwitcher slug={department.slug} />

        <div className="flex items-center gap-0.5">
          <FilterBar
            filter={config.filter}
            departmentId={department.id}
            onChange={(filter) => onConfigChange({ filter })}
          />
          <GroupMenu value={config.groupBy} onChange={(groupBy) => onConfigChange({ groupBy })} />
          <SortMenu rules={config.sort} onChange={(sort) => onConfigChange({ sort })} />
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <ViewMenu
            departmentId={department.id}
            departmentSlug={department.slug}
            config={config}
            onChange={onConfigChange}
          />
          <WorkspaceOverflow departmentId={department.id} departmentSlug={department.slug} />
        </div>
      </div>

      {firstStatus && (
        <CreateWorkItemDialog
          open={creating}
          onOpenChange={setCreating}
          departmentId={department.id}
          defaultStatusId={firstStatus}
        />
      )}
    </header>
  )
}
