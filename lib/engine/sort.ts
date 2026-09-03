import type { SortField, SortRule, WorkItem } from '@/lib/types'
import type { EngineContext } from './context'
import { priorityRank, statusOf } from './derive'

type Comparable = string | number

/**
 * Null handling is deliberate: an item with no due date should sort
 * *after* everything with one, in both directions. Sorting "soonest
 * first" that leads with a wall of undated work is useless.
 */
const NULL_LAST = Number.POSITIVE_INFINITY

function valueFor(field: SortField, item: WorkItem, ctx: EngineContext): Comparable {
  switch (field) {
    case 'priority':
      return priorityRank(item.priority)
    case 'dueDate':
      return item.dueDate ? new Date(item.dueDate).getTime() : NULL_LAST
    case 'createdAt':
      return new Date(item.createdAt).getTime()
    case 'updatedAt':
      return new Date(item.updatedAt).getTime()
    case 'assignee':
      return item.assigneeId ? (ctx.users[item.assigneeId]?.name ?? '').toLowerCase() : '￿'
    case 'status':
      return statusOf(item, ctx)?.order ?? Number.MAX_SAFE_INTEGER
    case 'title':
      return item.title.toLowerCase()
    case 'manual':
      return item.order
  }
}

function compareValues(a: Comparable, b: Comparable): number {
  if (typeof a === 'number' && typeof b === 'number') {
    if (a === b) return 0
    // Infinity stands for "no value" — keep it last regardless of direction.
    if (a === NULL_LAST) return 1
    if (b === NULL_LAST) return -1
    return a < b ? -1 : 1
  }
  return String(a).localeCompare(String(b))
}

/**
 * PRD §19 — multi-level sort. Rules are applied in order; the first
 * that separates two items wins. Manual board order is always the final
 * tiebreak so drag-and-drop positions stay stable.
 */
export function buildComparator(rules: SortRule[], ctx: EngineContext) {
  return (a: WorkItem, b: WorkItem): number => {
    for (const rule of rules) {
      const left = valueFor(rule.field, a, ctx)
      const right = valueFor(rule.field, b, ctx)
      const result = compareValues(left, right)
      if (result !== 0) {
        // A null-sentinel comparison already decided; don't flip it.
        const isNullDecision = left === NULL_LAST || right === NULL_LAST
        if (isNullDecision) return result
        return rule.direction === 'desc' ? -result : result
      }
    }
    return a.order - b.order || a.key.localeCompare(b.key)
  }
}

export function applySort(items: WorkItem[], rules: SortRule[], ctx: EngineContext): WorkItem[] {
  return [...items].sort(buildComparator(rules, ctx))
}
