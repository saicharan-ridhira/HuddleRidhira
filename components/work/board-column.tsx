'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, X } from 'lucide-react'
import { WorkItemCard } from './work-item-card'
import { StatusIcon, PriorityIndicator, UserAvatar } from '@/components/primitives'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/lib/store/store'
import { workItemService } from '@/lib/services'
import { isBlocked } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { GroupedItems, Id, Priority, WorkItem } from '@/lib/types'
import { hueDot } from '@/lib/ui/tokens'
import { cn } from '@/lib/utils'

export function BoardColumn({
  group,
  groupBy,
  departmentId,
  ctx,
}: {
  group: GroupedItems<WorkItem>
  groupBy: string
  departmentId: Id
  ctx: EngineContext
}) {
  const { setNodeRef, isOver } = useDroppable({ id: group.key })
  const openWorkItem = useStore((state) => state.openWorkItem)
  const [composing, setComposing] = useState(false)

  const blockedCount = group.items.filter((item) => isBlocked(item.id, ctx)).length
  const status = groupBy === 'status' ? ctx.statuses[group.key] : undefined

  return (
    <section
      className={cn(
        'flex h-full w-[280px] shrink-0 flex-col rounded-lg border bg-muted/25 transition-colors',
        isOver ? 'border-ring/50 bg-accent/40' : 'border-transparent',
      )}
      aria-label={group.label}
    >
      <header className="flex items-center gap-1.5 px-2.5 py-2">
        <GroupGlyph group={group} groupBy={groupBy} ctx={ctx} />
        <h2 className="truncate text-[13px] font-medium">{group.label}</h2>
        <span className="text-[11px] tabular-nums text-muted-foreground">{group.items.length}</span>

        {blockedCount > 0 && (
          <span
            className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded bg-blocked-muted px-1 text-[10px] font-medium tabular-nums text-blocked"
            title={`${blockedCount} blocked`}
          >
            {blockedCount}
          </span>
        )}

        {status && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="ml-auto opacity-0 transition-opacity group-hover/board:opacity-100 focus-visible:opacity-100 hover:opacity-100"
            onClick={() => setComposing(true)}
            aria-label={`Add work to ${group.label}`}
          >
            <Plus />
          </Button>
        )}
      </header>

      <div ref={setNodeRef} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-1.5 pb-1.5 scrollbar-thin">
        {group.items.map((item) => (
          <SortableCard key={item.id} item={item} ctx={ctx} onOpen={openWorkItem} />
        ))}

        {composing && status && (
          <InlineComposer
            departmentId={departmentId}
            statusId={status.id}
            onDone={() => setComposing(false)}
          />
        )}

        {group.items.length === 0 && !composing && (
          <div className="flex flex-1 items-center justify-center py-6 text-[11px] text-muted-foreground/60">
            Nothing here
          </div>
        )}
      </div>

      {status && !composing && (
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="mx-1.5 mb-1.5 flex h-7 items-center gap-1.5 rounded-md px-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 outline-none"
        >
          <Plus className="size-3.5" />
          Add work
        </button>
      )}
    </section>
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
  if (groupBy === 'priority') {
    return <PriorityIndicator priority={group.key as Priority} />
  }
  if (group.meta?.hue) {
    return <span className="size-2 rounded-full" style={hueDot(group.meta.hue as never)} />
  }
  return null
}

function SortableCard({
  item,
  ctx,
  onOpen,
}: {
  item: WorkItem
  ctx: EngineContext
  onOpen: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <WorkItemCard item={item} ctx={ctx} onOpen={onOpen} dragging={isDragging} />
    </div>
  )
}

/**
 * PRD §11 — inline creation. Typing a title and pressing Enter is the
 * whole interaction; everything else about the new item is edited in
 * place afterwards. Shift+Enter keeps the composer open for a run of
 * items, which is how people actually fill a column.
 */
function InlineComposer({
  departmentId,
  statusId,
  onDone,
}: {
  departmentId: Id
  statusId: Id
  onDone: () => void
}) {
  const [title, setTitle] = useState('')

  const submit = (keepOpen: boolean) => {
    const trimmed = title.trim()
    if (trimmed) workItemService.createWorkItem({ title: trimmed, departmentId, statusId })
    setTitle('')
    if (!keepOpen) onDone()
  }

  return (
    <div className="rounded-md border border-ring/50 bg-card p-2">
      <Textarea
        autoFocus
        rows={2}
        value={title}
        placeholder="What needs doing?"
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onDone()
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            submit(event.shiftKey)
          }
        }}
        onBlur={() => submit(false)}
        className="min-h-0 resize-none border-0 p-0 text-[13px] focus-visible:ring-0"
      />
      <div className="mt-1.5 flex items-center gap-1">
        <Button size="xs" onClick={() => submit(false)} disabled={!title.trim()}>
          Add
        </Button>
        <Button size="xs" variant="ghost" onClick={onDone}>
          <X />
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">⇧↵ to keep adding</span>
      </div>
    </div>
  )
}
