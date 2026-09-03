import {
  ACTIVE_STATUS_CATEGORIES,
  BLOCKING_RELATIONS,
  PRIORITY_RANK,
  TERMINAL_STATUS_CATEGORIES,
  type Blocker,
  type Id,
  type Priority,
  type Status,
  type StatusCategory,
  type WorkItem,
} from '@/lib/types'
import type { EngineContext, RelationEdge } from './context'

/* ------------------------------------------------------------------ *
 * Status
 * ------------------------------------------------------------------ */

export function statusOf(item: WorkItem, ctx: EngineContext): Status | undefined {
  return ctx.statuses[item.statusId]
}

export function statusCategoryOf(item: WorkItem, ctx: EngineContext): StatusCategory {
  return statusOf(item, ctx)?.category ?? 'backlog'
}

export function isTerminalStatusId(statusId: Id, ctx: EngineContext): boolean {
  const status = ctx.statuses[statusId]
  return status ? TERMINAL_STATUS_CATEGORIES.includes(status.category) : false
}

export function isDone(item: WorkItem, ctx: EngineContext): boolean {
  return isTerminalStatusId(item.statusId, ctx)
}

export function isActive(item: WorkItem, ctx: EngineContext): boolean {
  return ACTIVE_STATUS_CATEGORIES.includes(statusCategoryOf(item, ctx))
}

/* ------------------------------------------------------------------ *
 * Dependencies
 * ------------------------------------------------------------------ */

export function relationsOf(itemId: Id, ctx: EngineContext): RelationEdge[] {
  return ctx.dependencyIndex[itemId] ?? []
}

export function relationsByKind(itemId: Id, ctx: EngineContext) {
  const edges = relationsOf(itemId, ctx)
  return {
    blockedBy: edges.filter((e) => e.relation === 'blocked-by'),
    blocks: edges.filter((e) => e.relation === 'blocks'),
    dependsOn: edges.filter((e) => e.relation === 'depends-on'),
    relatedTo: edges.filter((e) => e.relation === 'related-to'),
    duplicateOf: edges.filter((e) => e.relation === 'duplicate-of'),
    parentOf: edges.filter((e) => e.relation === 'parent-of'),
    childOf: edges.filter((e) => e.relation === 'child-of'),
  }
}

/**
 * The upstream items that are stopping this one: a blocking relation
 * whose target has not reached a terminal status. Marking that target
 * Done removes it from this list, and the dependent unblocks — no flag
 * to flip anywhere (PRD §25).
 */
export function blockingEdges(itemId: Id, ctx: EngineContext): RelationEdge[] {
  return relationsOf(itemId, ctx).filter((edge) => {
    if (!BLOCKING_RELATIONS.includes(edge.relation)) return false
    const other = ctx.workItems[edge.otherId]
    if (!other) return false
    return !isTerminalStatusId(other.statusId, ctx)
  })
}

/** Manually declared, unresolved blockers (§33 "Add blocker"). */
export function activeBlockers(itemId: Id, ctx: EngineContext): Blocker[] {
  return (ctx.blockerIndex[itemId] ?? []).filter((b) => b.resolvedAt === null)
}

/**
 * PRD §12 and §48. Blocked is a property of the work, derived from
 * unresolved blockers and unfinished blocking dependencies. It is never
 * a status and never stored.
 */
export function isBlocked(itemId: Id, ctx: EngineContext): boolean {
  return activeBlockers(itemId, ctx).length > 0 || blockingEdges(itemId, ctx).length > 0
}

export interface BlockDetail {
  /** Human-readable one-liner: "Waiting for PAY-120 Finance credentials". */
  reason: string
  source: 'blocker' | 'dependency'
  blockerId?: Id
  workItemId?: Id
}

export function blockDetails(itemId: Id, ctx: EngineContext): BlockDetail[] {
  const details: BlockDetail[] = []

  for (const blocker of activeBlockers(itemId, ctx)) {
    details.push({ reason: blocker.reason, source: 'blocker', blockerId: blocker.id })
  }

  for (const edge of blockingEdges(itemId, ctx)) {
    const other = ctx.workItems[edge.otherId]
    if (!other) continue
    details.push({
      reason: `${other.key} ${other.title}`,
      source: 'dependency',
      workItemId: other.id,
    })
  }

  return details
}

/**
 * True when this item *was* blocked by dependencies and every one of
 * them is now finished. Used to show the "unblocked" confirmation state
 * the PRD describes in §25 rather than silently dropping the badge.
 */
export function hasResolvedDependencies(itemId: Id, ctx: EngineContext): boolean {
  const blocking = relationsOf(itemId, ctx).filter((e) => BLOCKING_RELATIONS.includes(e.relation))
  if (blocking.length === 0) return false
  return blocking.every((edge) => {
    const other = ctx.workItems[edge.otherId]
    return other ? isTerminalStatusId(other.statusId, ctx) : true
  })
}

/** Items this one is holding up — the other half of §25's two-sided view. */
export function blockedDownstream(itemId: Id, ctx: EngineContext): WorkItem[] {
  return relationsOf(itemId, ctx)
    .filter((e) => e.relation === 'blocks')
    .map((e) => ctx.workItems[e.otherId])
    .filter((item): item is WorkItem => Boolean(item))
}

/* ------------------------------------------------------------------ *
 * Checklists
 * ------------------------------------------------------------------ */

export interface ChecklistProgress {
  done: number
  total: number
  percent: number
  complete: boolean
}

/** PRD §36 — visible progress toward a goal (goal-gradient effect). */
export function checklistProgress(item: WorkItem, ctx: EngineContext): ChecklistProgress | null {
  if (!item.checklistId) return null
  const checklist = ctx.checklists[item.checklistId]
  if (!checklist) return null

  const items = checklist.itemIds.map((id) => ctx.checklistItems[id]).filter(Boolean)
  const total = items.length
  if (total === 0) return null

  const done = items.filter((entry) => entry?.done).length
  return { done, total, percent: Math.round((done / total) * 100), complete: done === total }
}

/* ------------------------------------------------------------------ *
 * Dates
 * ------------------------------------------------------------------ */

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Overdue means past due *and* not finished — done work is never overdue. */
export function isOverdue(item: WorkItem, ctx: EngineContext): boolean {
  if (!item.dueDate || isDone(item, ctx)) return false
  return startOfDay(new Date(item.dueDate)) < startOfDay(ctx.now)
}

export function isDueToday(item: WorkItem, ctx: EngineContext): boolean {
  if (!item.dueDate || isDone(item, ctx)) return false
  return startOfDay(new Date(item.dueDate)).getTime() === startOfDay(ctx.now).getTime()
}

export function isDueSoon(item: WorkItem, ctx: EngineContext, withinDays = 3): boolean {
  if (!item.dueDate || isDone(item, ctx)) return false
  const due = startOfDay(new Date(item.dueDate))
  const today = startOfDay(ctx.now)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  return diffDays > 0 && diffDays <= withinDays
}

/* ------------------------------------------------------------------ *
 * Huddle attention ranking
 * ------------------------------------------------------------------ */

export type AttentionReason = 'blocked' | 'blocking-others' | 'overdue' | 'due-today' | 'high-priority'

export interface Attention {
  score: number
  reasons: AttentionReason[]
  /** Whether this item is worth raising in a huddle at all (§31). */
  needsDiscussion: boolean
}

/**
 * PRD §30's information hierarchy, expressed as a score:
 * blockers first, then dependency problems, then overdue, then
 * high-priority active work. This single function orders the huddle,
 * the dashboard's "Attention Required" list and the Blocked view, so
 * all three agree about what matters.
 */
export function attentionOf(item: WorkItem, ctx: EngineContext): Attention {
  const reasons: AttentionReason[] = []
  let score = 0

  if (isBlocked(item.id, ctx)) {
    reasons.push('blocked')
    score += 1000
  }

  const downstreamBlocked = blockedDownstream(item.id, ctx).filter((d) => !isDone(d, ctx))
  if (downstreamBlocked.length > 0 && !isDone(item, ctx)) {
    reasons.push('blocking-others')
    score += 500 + downstreamBlocked.length * 10
  }

  if (isOverdue(item, ctx)) {
    reasons.push('overdue')
    score += 250
  } else if (isDueToday(item, ctx)) {
    reasons.push('due-today')
    score += 120
  }

  if (!isDone(item, ctx) && (item.priority === 'urgent' || item.priority === 'high')) {
    reasons.push('high-priority')
    score += PRIORITY_RANK[item.priority] * 20
  }

  // Tiny nudge so active work outranks untouched backlog at equal score.
  if (isActive(item, ctx)) score += 5

  return {
    score,
    reasons,
    // High priority alone is not a discussion topic; a problem is.
    needsDiscussion: reasons.some(
      (r) => r === 'blocked' || r === 'blocking-others' || r === 'overdue' || r === 'due-today',
    ),
  }
}

export function priorityRank(priority: Priority): number {
  return PRIORITY_RANK[priority]
}

/* ------------------------------------------------------------------ *
 * Per-person rollups (huddle headline numbers)
 * ------------------------------------------------------------------ */

export interface PersonStats {
  active: number
  blockers: number
  dependencies: number
  overdue: number
  completedRecently: number
  total: number
}

export function personStats(items: WorkItem[], ctx: EngineContext): PersonStats {
  let active = 0
  let blockers = 0
  let dependencies = 0
  let overdue = 0
  let completedRecently = 0

  const recentCutoff = new Date(ctx.now.getTime() - 7 * 86_400_000)

  for (const item of items) {
    if (isActive(item, ctx)) active += 1
    if (isBlocked(item.id, ctx)) blockers += 1
    if (relationsOf(item.id, ctx).length > 0) dependencies += 1
    if (isOverdue(item, ctx)) overdue += 1
    if (item.completedAt && new Date(item.completedAt) >= recentCutoff) completedRecently += 1
  }

  return { active, blockers, dependencies, overdue, completedRecently, total: items.length }
}
