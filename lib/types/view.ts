import type { Density, Id, Priority, ViewLayout } from './primitives'

/**
 * PRD §20. A filter is a tree so the advanced builder can express
 * `(Status = Doing AND Priority = High) OR Blocked = true`. The simple
 * popover writes a flat single-level AND group into the same structure,
 * so there is one evaluator rather than two code paths.
 */
export const FILTER_FIELDS = [
  'status',
  'statusCategory',
  'assignee',
  'priority',
  'label',
  'type',
  'department',
  'blocked',
  'overdue',
  'rock',
  'dueDate',
  'reporter',
  'title',
] as const
export type FilterField = (typeof FILTER_FIELDS)[number]

export const FILTER_OPERATORS = [
  'is',
  'is-not',
  'is-any-of',
  'is-none-of',
  'contains',
  'before',
  'after',
  'is-set',
  'is-not-set',
] as const
export type FilterOperator = (typeof FILTER_OPERATORS)[number]

export type FilterValue = string | number | boolean | string[] | null

export interface FilterCondition {
  kind: 'condition'
  id: Id
  field: FilterField
  operator: FilterOperator
  value: FilterValue
}

export interface FilterGroup {
  kind: 'group'
  id: Id
  combinator: 'and' | 'or'
  children: FilterNode[]
}

export type FilterNode = FilterCondition | FilterGroup

export const SORT_FIELDS = [
  'priority',
  'dueDate',
  'createdAt',
  'updatedAt',
  'assignee',
  'status',
  'title',
  'manual',
] as const
export type SortField = (typeof SORT_FIELDS)[number]

export interface SortRule {
  id: Id
  field: SortField
  direction: 'asc' | 'desc'
}

/** PRD §18. */
export const GROUP_KEYS = [
  'none',
  'status',
  'assignee',
  'priority',
  'label',
  'type',
  'dueDate',
  'department',
] as const
export type GroupKey = (typeof GROUP_KEYS)[number]

/** Columns/fields a view may show. Board cards ignore this beyond §13. */
export const DISPLAYABLE_FIELDS = [
  'key',
  'type',
  'status',
  'priority',
  'assignee',
  'labels',
  'dueDate',
  'checklist',
  'blocked',
  'dependencies',
  'updatedAt',
] as const
export type DisplayableField = (typeof DISPLAYABLE_FIELDS)[number]

/** PRD §17 — a view is presentation only; it never changes the data. */
export interface ViewConfig {
  layout: ViewLayout
  groupBy: GroupKey
  sort: SortRule[]
  filter: FilterGroup
  visibleFields: DisplayableField[]
  /** Custom field ids surfaced in this view (§22 — not everywhere by default). */
  visibleCustomFieldIds: Id[]
  density: Density
  /** Board only: hide columns whose status is finished and empty. */
  hideEmptyGroups: boolean
}

export interface SavedView {
  id: Id
  name: string
  description?: string
  /** Null means the view spans all departments. */
  departmentId: Id | null
  config: ViewConfig
  /** Personal views are only listed for their creator. */
  scope: 'personal' | 'department' | 'organization'
  createdBy: Id
  icon?: string
}

export type GroupedItems<T> = {
  key: string
  label: string
  /** Present when the group maps to an entity (status, user, label…). */
  entityId: Id | null
  items: T[]
  /** Groups can be rendered even when empty — board columns must be. */
  meta?: { priority?: Priority; hue?: string; category?: string }
}
