import type { Hue, Id, ISODate, Priority, StatusCategory } from './primitives'

export interface Status {
  id: Id
  name: string
  category: StatusCategory
  /** Position within its workflow. */
  order: number
}

/** PRD §39 — each department runs one workflow; workflows are org-level. */
export interface Workflow {
  id: Id
  name: string
  description: string
  statusIds: Id[]
}

export interface Label {
  id: Id
  name: string
  hue: Hue
  description?: string
}

/** PRD §10 — "Work Item", not "ticket". Types are configurable. */
export interface WorkItemType {
  id: Id
  name: string
  /** lucide icon name */
  icon: string
  hue: Hue
  /** Short prefix used in the human-readable key, e.g. ENG-124. */
  keyPrefix: string
}

export const CUSTOM_FIELD_KINDS = [
  'text',
  'number',
  'date',
  'checkbox',
  'dropdown',
  'multi-select',
  'user',
  'url',
] as const
export type CustomFieldKind = (typeof CUSTOM_FIELD_KINDS)[number]

export interface CustomField {
  id: Id
  name: string
  kind: CustomFieldKind
  /** Empty means the field applies org-wide. */
  departmentIds: Id[]
  /** For dropdown / multi-select. */
  options: string[]
  description?: string
}

export type CustomFieldValue = string | number | boolean | string[] | null

export interface ChecklistItem {
  id: Id
  text: string
  done: boolean
  order: number
}

export interface Checklist {
  id: Id
  workItemId: Id
  title: string
  itemIds: Id[]
}

/**
 * PRD §23. Stored once, per direction pair — `fromId <relation> toId`.
 * The inverse is derived on read so the relationship is visible from
 * both sides (§25) without a second record to keep in sync.
 */
export const DEPENDENCY_RELATIONS = [
  'blocks',
  'blocked-by',
  'depends-on',
  'related-to',
  'duplicate-of',
  'parent-of',
  'child-of',
] as const
export type DependencyRelation = (typeof DEPENDENCY_RELATIONS)[number]

export const DEPENDENCY_RELATION_LABEL: Record<DependencyRelation, string> = {
  blocks: 'Blocks',
  'blocked-by': 'Blocked by',
  'depends-on': 'Depends on',
  'related-to': 'Related to',
  'duplicate-of': 'Duplicate of',
  'parent-of': 'Parent of',
  'child-of': 'Child of',
}

export const INVERSE_RELATION: Record<DependencyRelation, DependencyRelation> = {
  blocks: 'blocked-by',
  'blocked-by': 'blocks',
  'depends-on': 'blocks',
  'related-to': 'related-to',
  'duplicate-of': 'duplicate-of',
  'parent-of': 'child-of',
  'child-of': 'parent-of',
}

/** Relations where the target not being finished stops the source proceeding. */
export const BLOCKING_RELATIONS: readonly DependencyRelation[] = ['blocked-by', 'depends-on']

export interface Dependency {
  id: Id
  fromId: Id
  toId: Id
  relation: DependencyRelation
  createdAt: ISODate
  createdBy: Id
}

/**
 * An explicit, human-declared blocker — distinct from a dependency block.
 * PRD §33 lists "Add blocker" and "Resolve blocker" as huddle actions
 * separate from adding a dependency, so both paths to `isBlocked` exist.
 */
export interface Blocker {
  id: Id
  workItemId: Id
  reason: string
  createdAt: ISODate
  createdBy: Id
  resolvedAt: ISODate | null
  resolvedBy: Id | null
  resolutionNote?: string
}

export interface Comment {
  id: Id
  workItemId: Id
  authorId: Id
  body: string
  createdAt: ISODate
}

export interface WorkItem {
  id: Id
  /** Human-readable, e.g. "ENG-124". Stable once assigned. */
  key: string
  title: string
  description: string
  typeId: Id
  statusId: Id
  priority: Priority
  departmentId: Id
  assigneeId: Id | null
  reporterId: Id
  labelIds: Id[]
  startDate: ISODate | null
  dueDate: ISODate | null
  /** Keyed by CustomField id. */
  customFields: Record<Id, CustomFieldValue>
  checklistId: Id | null
  /** Position within its status column on the board. */
  order: number
  createdAt: ISODate
  updatedAt: ISODate
  completedAt: ISODate | null
}
