import type {
  Blocker,
  Checklist,
  ChecklistItem,
  Comment,
  CustomField,
  Department,
  Dependency,
  DependencyRelation,
  Huddle,
  HuddleAction,
  HuddleDiscussion,
  Id,
  Label,
  Organization,
  Role,
  SavedView,
  Status,
  User,
  WorkItem,
  WorkItemType,
  Workflow,
} from '@/lib/types'
import { INVERSE_RELATION } from '@/lib/types'

/**
 * Normalized entity tables. Everything the app knows lives here as
 * `id -> entity` maps; ordering that matters is kept in `order`.
 *
 * Nothing derived is stored. `isBlocked`, checklist progress, overdue
 * and huddle counts are all computed from these tables on read, which is
 * what makes PRD §25's "simulated unblocking" work without any
 * invalidation logic: change one status and every dependent re-derives.
 */
export interface Entities {
  organizations: Record<Id, Organization>
  users: Record<Id, User>
  roles: Record<Id, Role>
  departments: Record<Id, Department>
  workflows: Record<Id, Workflow>
  statuses: Record<Id, Status>
  labels: Record<Id, Label>
  workItemTypes: Record<Id, WorkItemType>
  customFields: Record<Id, CustomField>
  workItems: Record<Id, WorkItem>
  checklists: Record<Id, Checklist>
  checklistItems: Record<Id, ChecklistItem>
  dependencies: Record<Id, Dependency>
  blockers: Record<Id, Blocker>
  comments: Record<Id, Comment>
  savedViews: Record<Id, SavedView>
  huddles: Record<Id, Huddle>
  huddleDiscussions: Record<Id, HuddleDiscussion>
  huddleActions: Record<Id, HuddleAction>
  auditEvents: Record<Id, import('@/lib/types').AuditEvent>
}

export interface EntityOrder {
  organizationIds: Id[]
  userIds: Id[]
  roleIds: Id[]
  departmentIds: Id[]
  workflowIds: Id[]
  labelIds: Id[]
  workItemTypeIds: Id[]
  customFieldIds: Id[]
  workItemIds: Id[]
  savedViewIds: Id[]
  /** Newest first — the audit log reads top-down. */
  auditEventIds: Id[]
  huddleIds: Id[]
}

/** One end of a dependency as seen *from* a particular work item. */
export interface RelationEdge {
  dependencyId: Id
  relation: DependencyRelation
  otherId: Id
  /** `out` when this item is the stored `fromId`. */
  direction: 'out' | 'in'
}

export type DependencyIndex = Record<Id, RelationEdge[]>

/**
 * Dependencies are stored once. This index resolves each record into
 * both directions so a relationship is visible from either side (§25)
 * without a mirrored row that could drift out of sync.
 */
export function buildDependencyIndex(dependencies: Record<Id, Dependency>): DependencyIndex {
  const index: DependencyIndex = {}

  const push = (itemId: Id, edge: RelationEdge) => {
    const list = index[itemId]
    if (list) list.push(edge)
    else index[itemId] = [edge]
  }

  for (const dep of Object.values(dependencies)) {
    push(dep.fromId, {
      dependencyId: dep.id,
      relation: dep.relation,
      otherId: dep.toId,
      direction: 'out',
    })
    push(dep.toId, {
      dependencyId: dep.id,
      relation: INVERSE_RELATION[dep.relation],
      otherId: dep.fromId,
      direction: 'in',
    })
  }

  return index
}

/** Blockers grouped by work item, so derivation is a lookup not a scan. */
export type BlockerIndex = Record<Id, Blocker[]>

export function buildBlockerIndex(blockers: Record<Id, Blocker>): BlockerIndex {
  const index: BlockerIndex = {}
  for (const blocker of Object.values(blockers)) {
    const list = index[blocker.workItemId]
    if (list) list.push(blocker)
    else index[blocker.workItemId] = [blocker]
  }
  return index
}

/**
 * What every engine function reads. Built once per render from the
 * store; the two indexes are the only precomputation.
 */
export interface EngineContext extends Entities {
  dependencyIndex: DependencyIndex
  blockerIndex: BlockerIndex
  /** Injected so overdue calculations are deterministic in tests. */
  now: Date
}

export function createEngineContext(entities: Entities, now: Date = new Date()): EngineContext {
  return {
    ...entities,
    dependencyIndex: buildDependencyIndex(entities.dependencies),
    blockerIndex: buildBlockerIndex(entities.blockers),
    now,
  }
}
