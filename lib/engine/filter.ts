import type { FilterCondition, FilterField, FilterGroup, FilterNode, FilterValue, Id, WorkItem } from '@/lib/types'
import type { EngineContext } from './context'
import { isBlocked, isOverdue, statusCategoryOf } from './derive'

/* ------------------------------------------------------------------ *
 * Field extraction
 *
 * Each filterable field resolves to either a scalar or a set of ids.
 * Keeping extraction in one place means the simple popover and the
 * advanced builder can never disagree about what "assignee" means.
 * ------------------------------------------------------------------ */

type Extracted = { kind: 'scalar'; value: string | number | boolean | null } | { kind: 'set'; values: Id[] }

function extract(field: FilterField, item: WorkItem, ctx: EngineContext): Extracted {
  switch (field) {
    case 'status':
      return { kind: 'scalar', value: item.statusId }
    case 'statusCategory':
      return { kind: 'scalar', value: statusCategoryOf(item, ctx) }
    case 'assignee':
      return { kind: 'scalar', value: item.assigneeId }
    case 'reporter':
      return { kind: 'scalar', value: item.reporterId }
    case 'priority':
      return { kind: 'scalar', value: item.priority }
    case 'type':
      return { kind: 'scalar', value: item.typeId }
    case 'department':
      return { kind: 'scalar', value: item.departmentId }
    case 'label':
      return { kind: 'set', values: item.labelIds }
    case 'blocked':
      return { kind: 'scalar', value: isBlocked(item.id, ctx) }
    case 'overdue':
      return { kind: 'scalar', value: isOverdue(item, ctx) }
    case 'rock':
      return { kind: 'scalar', value: item.rockQuarter !== null }
    case 'dueDate':
      return { kind: 'scalar', value: item.dueDate }
    case 'title':
      return { kind: 'scalar', value: item.title }
  }
}

function toArray(value: FilterValue): string[] {
  if (Array.isArray(value)) return value
  if (value === null || value === undefined) return []
  return [String(value)]
}

function looseEquals(a: string | number | boolean | null, b: FilterValue): boolean {
  if (typeof a === 'boolean') {
    // The UI stores booleans as real booleans, but a saved view round-
    // tripped through JSON can carry "true"/"false" strings.
    return a === (b === true || b === 'true')
  }
  if (a === null) return b === null || b === '' || b === undefined
  return String(a) === String(b)
}

function evaluateCondition(condition: FilterCondition, item: WorkItem, ctx: EngineContext): boolean {
  const extracted = extract(condition.field, item, ctx)
  const { operator, value } = condition

  if (extracted.kind === 'set') {
    const values = extracted.values
    switch (operator) {
      case 'is':
      case 'contains':
        return values.some((v) => looseEquals(v, value))
      case 'is-not':
        return !values.some((v) => looseEquals(v, value))
      case 'is-any-of':
        return toArray(value).some((candidate) => values.includes(candidate))
      case 'is-none-of':
        return !toArray(value).some((candidate) => values.includes(candidate))
      case 'is-set':
        return values.length > 0
      case 'is-not-set':
        return values.length === 0
      default:
        return true
    }
  }

  const scalar = extracted.value

  switch (operator) {
    case 'is':
      return looseEquals(scalar, value)
    case 'is-not':
      return !looseEquals(scalar, value)
    case 'is-any-of':
      return toArray(value).some((candidate) => looseEquals(scalar, candidate))
    case 'is-none-of':
      return !toArray(value).some((candidate) => looseEquals(scalar, candidate))
    case 'contains':
      return String(scalar ?? '')
        .toLowerCase()
        .includes(String(value ?? '').toLowerCase())
    case 'before':
      if (scalar === null || value === null) return false
      return new Date(String(scalar)) < new Date(String(value))
    case 'after':
      if (scalar === null || value === null) return false
      return new Date(String(scalar)) > new Date(String(value))
    case 'is-set':
      return scalar !== null && scalar !== ''
    case 'is-not-set':
      return scalar === null || scalar === ''
    default:
      return true
  }
}

/**
 * PRD §20. One recursive evaluator serves both the simple filter
 * popover (which writes a flat AND group) and the advanced builder
 * (which nests arbitrarily), so the two can never drift apart.
 *
 * An empty group matches everything — "no filter" must not mean
 * "nothing shown".
 */
export function evaluateFilter(node: FilterNode, item: WorkItem, ctx: EngineContext): boolean {
  if (node.kind === 'condition') return evaluateCondition(node, item, ctx)

  if (node.children.length === 0) return true

  return node.combinator === 'and'
    ? node.children.every((child) => evaluateFilter(child, item, ctx))
    : node.children.some((child) => evaluateFilter(child, item, ctx))
}

export function applyFilter(items: WorkItem[], filter: FilterGroup, ctx: EngineContext): WorkItem[] {
  if (filter.children.length === 0) return items
  return items.filter((item) => evaluateFilter(filter, item, ctx))
}

/** Number of leaf conditions — drives the count badge on the Filter button. */
export function countConditions(node: FilterNode): number {
  if (node.kind === 'condition') return 1
  return node.children.reduce((total, child) => total + countConditions(child), 0)
}

export function emptyFilter(id = 'root'): FilterGroup {
  return { kind: 'group', id, combinator: 'and', children: [] }
}
