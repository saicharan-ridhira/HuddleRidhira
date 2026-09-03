'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Plus, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ViewSwitcher } from './view-switcher'
import { FilterBar } from './filter-bar'
import { GroupMenu } from './group-menu'
import { SortMenu } from './sort-menu'
import { ViewMenu, WorkspaceOverflow } from './view-menu'
import { DynamicIcon } from '@/components/primitives'
import { useEngineContext, useHuddlesForDepartment } from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import { huddleService, workItemService } from '@/lib/services'
import { isBlocked } from '@/lib/engine/derive'
import type { Department, ViewConfig, WorkItem } from '@/lib/types'
import { hueStyle } from '@/lib/ui/tokens'

/**
 * PRD §6, §27, §43, §44.
 *
 * Two rows and nothing more. Identity and the two highest-frequency
 * actions on top — "Start huddle" is deliberately the largest, most
 * consistently placed target in the workspace (Fitts's Law, §43).
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
  const router = useRouter()
  const pathname = usePathname()
  const ctx = useEngineContext()
  const huddles = useHuddlesForDepartment(department.id)
  const openWorkItem = useStore((state) => state.openWorkItem)

  const blockedCount = items.filter((item) => isBlocked(item.id, ctx)).length
  const liveHuddle = huddles.find((huddle) => huddle.stage !== 'complete')
  const inHuddleView = pathname.includes('/huddle')

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const id = workItemService.createWorkItem({
                  title: 'New work item',
                  departmentId: department.id,
                  statusId: firstStatus,
                })
                if (id) openWorkItem(id)
              }}
            >
              <Plus />
              <span className="hidden sm:inline">New</span>
            </Button>
          )}

          {!inHuddleView && (
            <Button
              size="sm"
              variant={liveHuddle ? 'blocked' : 'default'}
              onClick={() => {
                huddleService.openHuddle(department.id)
                router.push(`/departments/${department.slug}/huddle`)
              }}
            >
              <Radio />
              {liveHuddle ? 'Resume huddle' : 'Start huddle'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ViewSwitcher slug={department.slug} />

        {!inHuddleView && (
          <>
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
          </>
        )}
      </div>
    </header>
  )
}
