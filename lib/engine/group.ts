import { PRIORITIES, PRIORITY_LABEL, type GroupedItems, type GroupKey, type Id, type WorkItem } from '@/lib/types'
import type { EngineContext } from './context'
import { isOverdue, isDueToday } from './derive'

/**
 * PRD §18. Grouping returns ordered buckets rather than a plain map,
 * because empty buckets matter: a board must still render the "Done"
 * column when nothing is done, and a huddle must still show a person
 * with no work rather than skipping them.
 *
 * `universe` supplies the buckets that should exist regardless of
 * whether any item falls into them.
 */
export interface GroupOptions {
  /** Restrict/extend the bucket set — e.g. the department's statuses. */
  universe?: Id[]
  /** Keep buckets with no items (board columns: yes, list view: usually no). */
  includeEmpty?: boolean
}

const UNASSIGNED_KEY = '__none__'

function bucketsForDate(item: WorkItem, ctx: EngineContext): { key: string; label: string; rank: number } {
  if (!item.dueDate) return { key: 'no-date', label: 'No due date', rank: 99 }
  if (isOverdue(item, ctx)) return { key: 'overdue', label: 'Overdue', rank: 0 }
  if (isDueToday(item, ctx)) return { key: 'today', label: 'Today', rank: 1 }

  const due = new Date(item.dueDate)
  const today = new Date(ctx.now)
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000)

  if (days === 1) return { key: 'tomorrow', label: 'Tomorrow', rank: 2 }
  if (days <= 7) return { key: 'this-week', label: 'This week', rank: 3 }
  if (days <= 30) return { key: 'this-month', label: 'This month', rank: 4 }
  return { key: 'later', label: 'Later', rank: 5 }
}

export function groupItems(
  items: WorkItem[],
  key: GroupKey,
  ctx: EngineContext,
  options: GroupOptions = {},
): GroupedItems<WorkItem>[] {
  const { universe, includeEmpty = false } = options

  if (key === 'none') {
    return [{ key: 'all', label: 'All work', entityId: null, items }]
  }

  const buckets = new Map<string, GroupedItems<WorkItem>>()
  const order: string[] = []

  const ensure = (bucketKey: string, label: string, entityId: Id | null, meta?: GroupedItems<WorkItem>['meta']) => {
    let bucket = buckets.get(bucketKey)
    if (!bucket) {
      bucket = { key: bucketKey, label, entityId, items: [], meta }
      buckets.set(bucketKey, bucket)
      order.push(bucketKey)
    }
    return bucket
  }

  // Seed the buckets that must exist even when empty.
  if (includeEmpty) {
    switch (key) {
      case 'status': {
        const statusIds = universe ?? Object.keys(ctx.statuses)
        for (const id of statusIds) {
          const status = ctx.statuses[id]
          if (status) ensure(id, status.name, id, { category: status.category })
        }
        break
      }
      case 'assignee': {
        const userIds = universe ?? Object.keys(ctx.users)
        for (const id of userIds) {
          const user = ctx.users[id]
          if (user) ensure(id, user.name, id, { hue: user.hue })
        }
        ensure(UNASSIGNED_KEY, 'Unassigned', null)
        break
      }
      case 'priority': {
        for (const priority of [...PRIORITIES].reverse()) {
          ensure(priority, PRIORITY_LABEL[priority], null, { priority })
        }
        break
      }
      case 'label': {
        const labelIds = universe ?? Object.keys(ctx.labels)
        for (const id of labelIds) {
          const label = ctx.labels[id]
          if (label) ensure(id, label.name, id, { hue: label.hue })
        }
        ensure(UNASSIGNED_KEY, 'No label', null)
        break
      }
      case 'type': {
        const typeIds = universe ?? Object.keys(ctx.workItemTypes)
        for (const id of typeIds) {
          const type = ctx.workItemTypes[id]
          if (type) ensure(id, type.name, id, { hue: type.hue })
        }
        break
      }
      case 'department': {
        const deptIds = universe ?? Object.keys(ctx.departments)
        for (const id of deptIds) {
          const dept = ctx.departments[id]
          if (dept) ensure(id, dept.name, id, { hue: dept.hue })
        }
        break
      }
      case 'dueDate':
        break
    }
  }

  for (const item of items) {
    switch (key) {
      case 'status': {
        const status = ctx.statuses[item.statusId]
        ensure(item.statusId, status?.name ?? 'Unknown', item.statusId, {
          category: status?.category,
        }).items.push(item)
        break
      }
      case 'assignee': {
        if (item.assigneeId) {
          const user = ctx.users[item.assigneeId]
          ensure(item.assigneeId, user?.name ?? 'Unknown', item.assigneeId, { hue: user?.hue }).items.push(item)
        } else {
          ensure(UNASSIGNED_KEY, 'Unassigned', null).items.push(item)
        }
        break
      }
      case 'priority':
        ensure(item.priority, PRIORITY_LABEL[item.priority], null, { priority: item.priority }).items.push(item)
        break
      case 'label': {
        if (item.labelIds.length === 0) {
          ensure(UNASSIGNED_KEY, 'No label', null).items.push(item)
        } else {
          // An item with several labels appears under each — that is what
          // "group by label" means to a user scanning for a label's work.
          for (const labelId of item.labelIds) {
            const label = ctx.labels[labelId]
            ensure(labelId, label?.name ?? 'Unknown', labelId, { hue: label?.hue }).items.push(item)
          }
        }
        break
      }
      case 'type': {
        const type = ctx.workItemTypes[item.typeId]
        ensure(item.typeId, type?.name ?? 'Unknown', item.typeId, { hue: type?.hue }).items.push(item)
        break
      }
      case 'department': {
        const dept = ctx.departments[item.departmentId]
        ensure(item.departmentId, dept?.name ?? 'Unknown', item.departmentId, { hue: dept?.hue }).items.push(item)
        break
      }
      case 'dueDate': {
        const bucket = bucketsForDate(item, ctx)
        ensure(bucket.key, bucket.label, null).items.push(item)
        break
      }
    }
  }

  let groups = order.map((bucketKey) => buckets.get(bucketKey)!).filter(Boolean)

  if (!includeEmpty) groups = groups.filter((group) => group.items.length > 0)

  // Deterministic bucket ordering per grouping dimension.
  if (key === 'status') {
    groups.sort((a, b) => (ctx.statuses[a.key]?.order ?? 0) - (ctx.statuses[b.key]?.order ?? 0))
  } else if (key === 'priority') {
    const rank = [...PRIORITIES].reverse()
    groups.sort((a, b) => rank.indexOf(a.key as never) - rank.indexOf(b.key as never))
  } else if (key === 'dueDate') {
    const rank = ['overdue', 'today', 'tomorrow', 'this-week', 'this-month', 'later', 'no-date']
    groups.sort((a, b) => rank.indexOf(a.key) - rank.indexOf(b.key))
  } else if (key === 'assignee' || key === 'label') {
    // Unassigned always last; the rest alphabetical.
    groups.sort((a, b) => {
      if (a.key === UNASSIGNED_KEY) return 1
      if (b.key === UNASSIGNED_KEY) return -1
      return a.label.localeCompare(b.label)
    })
  }

  return groups
}

export { UNASSIGNED_KEY }
