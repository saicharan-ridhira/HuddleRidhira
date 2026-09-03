'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/dashboard/page-header'
import { WorkRow } from '@/components/views/work-row'
import { EmptyState } from '@/components/views/list-view'
import { GroupMenu } from '@/components/workspace/group-menu'
import { SortMenu } from '@/components/workspace/sort-menu'
import { UserAvatar, StatusIcon, PriorityIndicator } from '@/components/primitives'
import { ShowMore, visibleInGroup } from '@/components/shared/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAllWorkItems, useCurrentUser, useEngineContext, useUsers } from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import { runPipeline } from '@/lib/engine/pipeline'
import { defaultViewConfig } from '@/lib/data/seed'
import { isBlocked, isDone } from '@/lib/engine/derive'
import type { GroupKey, Priority, SortRule } from '@/lib/types'
import { hueDot } from '@/lib/ui/tokens'

/**
 * PRD §5's personal section. One person's work across every department,
 * on the same pipeline as everything else — the `?user=` parameter lets
 * a lead look at a teammate's plate from the huddle or members list
 * without a separate screen.
 */
export default function MyWorkPage() {
  return (
    <Suspense fallback={null}>
      <MyWork />
    </Suspense>
  )
}

function MyWork() {
  const searchParams = useSearchParams()
  const currentUser = useCurrentUser()
  const users = useUsers()
  const items = useAllWorkItems()
  const ctx = useEngineContext()
  const openWorkItem = useStore((state) => state.openWorkItem)

  const requestedId = searchParams.get('user')
  const subject = users.find((user) => user.id === requestedId) ?? currentUser

  const [groupBy, setGroupBy] = useState<GroupKey>('status')
  const [sort, setSort] = useState<SortRule[]>([
    { id: 'mw-1', field: 'priority', direction: 'desc' },
    { id: 'mw-2', field: 'dueDate', direction: 'asc' },
  ])
  const [scope, setScope] = useState<'open' | 'all'>('open')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const mine = useMemo(() => {
    const owned = items.filter((item) => item.assigneeId === subject?.id)
    return scope === 'open' ? owned.filter((item) => !isDone(item, ctx)) : owned
  }, [items, subject, scope, ctx])

  const groups = useMemo(
    () => runPipeline(mine, { ...defaultViewConfig(), layout: 'list', groupBy, sort }, ctx),
    [mine, groupBy, sort, ctx],
  )

  const blockedCount = mine.filter((item) => isBlocked(item.id, ctx)).length
  const isSomeoneElse = subject?.id !== currentUser?.id

  return (
    <>
      <PageHeader
        title={isSomeoneElse ? `${subject?.name}'s work` : 'My work'}
        description={
          blockedCount > 0
            ? `${mine.length} item${mine.length === 1 ? '' : 's'} · ${blockedCount} blocked`
            : `${mine.length} item${mine.length === 1 ? '' : 's'}`
        }
        actions={
          <>
            <Select value={scope} onValueChange={(value) => setScope(value as 'open' | 'all')}>
              <SelectTrigger size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open work</SelectItem>
                <SelectItem value="all">Everything</SelectItem>
              </SelectContent>
            </Select>
            <GroupMenu value={groupBy} onChange={setGroupBy} />
            <SortMenu rules={sort} onChange={setSort} />
          </>
        }
      />

      {subject && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
          <UserAvatar user={subject} size="lg" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium">{subject.name}</span>
            <span className="truncate text-[11px] text-muted-foreground">{subject.title}</span>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyState message="Nothing assigned." />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {groups.map((group) => {
            const isExpanded = expanded[group.key] ?? false
            const { visible, hidden } = visibleInGroup(group.items, isExpanded)

            return (
            <section key={group.key}>
              <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur">
                {groupBy === 'status' && ctx.statuses[group.key] && (
                  <StatusIcon category={ctx.statuses[group.key]!.category} />
                )}
                {groupBy === 'priority' && <PriorityIndicator priority={group.key as Priority} />}
                {group.meta?.hue && groupBy !== 'status' && groupBy !== 'priority' && (
                  <span className="size-2 rounded-full" style={hueDot(group.meta.hue as never)} />
                )}
                <h2 className="text-[12px] font-medium">{group.label}</h2>
                <span className="text-[11px] tabular-nums text-muted-foreground">{group.items.length}</span>
              </header>

              {visible.map((item) => (
                <WorkRow
                  key={item.id}
                  item={item}
                  ctx={ctx}
                  fields={['key', 'type', 'status', 'priority', 'labels', 'dueDate', 'checklist', 'blocked', 'dependencies']}
                  density="compact"
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
      )}
    </>
  )
}
