'use client'

import { useState } from 'react'
import { WorkRow } from './work-row'
import { ShowMore, visibleInGroup } from '@/components/shared/pagination'
import { StatusIcon, PriorityIndicator, UserAvatar } from '@/components/primitives'
import { useStore } from '@/lib/store/store'
import { isBlocked } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { GroupedItems, Priority, ViewConfig, WorkItem } from '@/lib/types'
import { hueDot } from '@/lib/ui/tokens'

/**
 * PRD §16 — the compact operational overview. Same pipeline output the
 * board consumes, laid out as grouped rows instead of columns.
 *
 * Long groups are capped rather than paginated. Page numbers across a
 * grouped list put a break in the middle of a group — "Sai" appearing on
 * both page 2 and page 3 reads as a bug — so the cap sits inside each
 * group, where the user is already looking.
 */
export function ListView({
  groups,
  config,
  ctx,
}: {
  groups: GroupedItems<WorkItem>[]
  config: ViewConfig
  ctx: EngineContext
}) {
  const openWorkItem = useStore((state) => state.openWorkItem)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (groups.every((group) => group.items.length === 0)) {
    return <EmptyState />
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
      {groups.map((group) => {
        const blockedCount = group.items.filter((item) => isBlocked(item.id, ctx)).length
        const isExpanded = expanded[group.key] ?? false
        const { visible, hidden } = visibleInGroup(group.items, isExpanded)

        return (
          <section key={group.key}>
            <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-1.5 backdrop-blur">
              <GroupGlyph group={group} groupBy={config.groupBy} ctx={ctx} />
              <h2 className="text-[12px] font-medium">{group.label}</h2>
              <span className="text-[11px] tabular-nums text-muted-foreground">{group.items.length}</span>
              {blockedCount > 0 && (
                <span className="inline-flex h-4 items-center rounded bg-blocked-muted px-1 text-[10px] font-medium tabular-nums text-blocked">
                  {blockedCount} blocked
                </span>
              )}
            </header>

            {visible.map((item) => (
              <WorkRow
                key={item.id}
                item={item}
                ctx={ctx}
                fields={config.visibleFields}
                density={config.density}
                onOpen={openWorkItem}
              />
            ))}

            <ShowMore
              hidden={hidden}
              expanded={isExpanded}
              onToggle={() => setExpanded((previous) => ({ ...previous, [group.key]: !isExpanded }))}
              noun="in this group"
            />
          </section>
        )
      })}
    </div>
  )
}

function GroupGlyph({
  group,
  groupBy,
  ctx,
}: {
  group: GroupedItems<WorkItem>
  groupBy: string
  ctx: EngineContext
}) {
  if (groupBy === 'status') {
    const status = ctx.statuses[group.key]
    return status ? <StatusIcon category={status.category} /> : null
  }
  if (groupBy === 'assignee') {
    return <UserAvatar user={group.entityId ? ctx.users[group.entityId] : undefined} size="xs" />
  }
  if (groupBy === 'priority') return <PriorityIndicator priority={group.key as Priority} />
  if (group.meta?.hue) return <span className="size-2 rounded-full" style={hueDot(group.meta.hue as never)} />
  return null
}

export function EmptyState({ message = 'Nothing matches the current filter.' }: { message?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 py-16 text-center">
      <p className="text-[13px] font-medium">{message}</p>
      <p className="text-[12px] text-muted-foreground">Clear or widen the filter to see more work.</p>
    </div>
  )
}
