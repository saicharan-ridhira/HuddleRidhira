'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { BoardColumn } from './board-column'
import { WorkItemCard } from './work-item-card'
import { useEngineContext } from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import { workItemService } from '@/lib/services'
import type { GroupedItems, Id, WorkItem } from '@/lib/types'

/**
 * PRD §11 and §12. Columns are the groups the pipeline produced — when
 * grouping is by status they are the workflow's statuses, and there is
 * never a "Blocked" column: blocked work sits in whichever status it is
 * genuinely in, wearing a badge.
 *
 * Dropping into a column that is not a status (grouped by assignee, say)
 * reassigns rather than restatuses, so the same board code serves every
 * grouping in §18.
 */
export function Board({
  groups,
  groupBy,
  departmentId,
}: {
  groups: GroupedItems<WorkItem>[]
  groupBy: string
  departmentId: Id
}) {
  const ctx = useEngineContext()
  const openWorkItem = useStore((state) => state.openWorkItem)
  const [activeId, setActiveId] = useState<Id | null>(null)

  const sensors = useSensors(
    // A small activation distance keeps click-to-open working: without
    // it every click on a card starts a drag and the drawer never opens.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )

  const activeItem = useMemo(() => (activeId ? ctx.workItems[activeId] : undefined), [activeId, ctx])

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id))

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const itemId = String(active.id)
    const overId = String(over.id)

    // Dropping onto a card targets that card's group and position;
    // dropping onto empty column space targets the end of that column.
    const targetGroup =
      groups.find((group) => group.key === overId) ??
      groups.find((group) => group.items.some((entry) => entry.id === overId))
    if (!targetGroup) return

    const indexInGroup = targetGroup.items.findIndex((entry) => entry.id === overId)
    const targetIndex = indexInGroup === -1 ? targetGroup.items.length : indexInGroup

    if (groupBy === 'status') {
      workItemService.moveWorkItem(itemId, targetGroup.key, targetIndex)
      return
    }

    if (groupBy === 'assignee') {
      workItemService.updateAssignee(itemId, targetGroup.entityId)
      return
    }

    if (groupBy === 'priority') {
      workItemService.updatePriority(itemId, targetGroup.key as never)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full min-h-0 gap-2.5 overflow-x-auto px-3 pb-3 scrollbar-thin">
        {groups.map((group) => (
          <SortableContext
            key={group.key}
            items={group.items.map((entry) => entry.id)}
            strategy={verticalListSortingStrategy}
          >
            <BoardColumn group={group} groupBy={groupBy} departmentId={departmentId} ctx={ctx} />
          </SortableContext>
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem && (
          <div className="w-[268px] rotate-1 shadow-lg">
            <WorkItemCard item={activeItem} ctx={ctx} onOpen={openWorkItem} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
