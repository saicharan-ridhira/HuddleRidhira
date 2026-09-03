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
  /** The raw reason, as stored. */
  reason: string
  /**
   * The reason as it should be read out, prefix included.
   *
   * A dependency block needs the "Waiting for" framing to make sense of
   * a bare item key. A manually declared blocker is already written as a
   * sentence by whoever raised it — prefixing that produces "Waiting for
   * Waiting on the security review slot", so the label is computed once
   * here rather than at each of the four places that render it.
   */
  label: string
  source: 'blocker' | 'dependency'
  blockerId?: Id
  workItemId?: Id
}

export function blockDetails(itemId: Id, ctx: EngineContext): BlockDetail[] {
  const details: BlockDetail[] = []

  for (const blocker of activeBlockers(itemId, ctx)) {
    details.push({
      reason: blocker.reason,
      label: blocker.reason,
      source: 'blocker',
      blockerId: blocker.id,
    })
  }

  for (const edge of blockingEdges(itemId, ctx)) {
    const other = ctx.workItems[edge.otherId]
    if (!other) continue
    const reason = `${other.key} ${other.title}`
    details.push({
      reason,
      label: `Waiting for ${reason}`,
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

export type AttentionReason =
  | 'blocked'
  | 'blocking-others'
  | 'backlog'
  | 'overdue'
  | 'due-today'
  | 'high-priority'

export interface Attention {
  score: number
  reasons: AttentionReason[]
  /** Whether this item is worth raising in the huddle at all. */
  needsDiscussion: boolean
}

/**
 * Reasons that are worth flagging on a board card. `backlog` is
 * deliberately absent: it is a reason to raise something in a meeting,
 * not a property worth a badge on a board where the column already says
 * it. Without this guard every card in every Backlog column would light
 * up, and the loudest signal in the product would become wallpaper.
 */
const CARD_REASONS: readonly AttentionReason[] = ['blocked', 'blocking-others', 'overdue', 'due-today']

export function isCardReason(reason: AttentionReason): boolean {
  return CARD_REASONS.includes(reason)
}

/**
 * The one ranking the whole product agrees on. It orders the huddle, the
 * dashboard's "Attention required" list, the department overview and the
 * Blocked view — so "the most important thing" means the same in all
 * four.
 *
 * The huddle is between heads of department, and what that meeting is
 * for is **work that cannot proceed, and work nobody has started**.
 * Hence the two qualifying signals: blocked, and sitting in a backlog
 * status. Overdue and due-today deliberately no longer qualify on their
 * own — a late in-progress item is something the head already knows
 * about and is working on, whereas an untouched backlog item is exactly
 * the thing that never gets raised unless a meeting raises it.
 *
 * Holding up other work scores highly but does not by itself put an item
 * on the agenda, because the item it is blocking is already there and
 * names it. Listing both ends of a dependency makes the room discuss the
 * same problem twice.
 *
 * Scoring is tiered, and the modifiers are sized so that no combination
 * of them can lift an item into the tier above:
 *
 *   blocked          1000
 *   blocking-others   600  (+8 per downstream item, at most 5 counted)
 *   backlog           300
 *   + overdue        +150      max backlog          = 510  < 600
 *   + due today       +80      max blocking-others  = 850  < 1000
 *   + priority       +0..60
 */
export function attentionOf(item: WorkItem, ctx: EngineContext): Attention {
  const reasons: AttentionReason[] = []
  let score = 0

  const done = isDone(item, ctx)

  if (isBlocked(item.id, ctx)) {
    reasons.push('blocked')
    score += 1000
  } else {
    const downstreamBlocked = blockedDownstream(item.id, ctx).filter((entry) => !isDone(entry, ctx))
    if (downstreamBlocked.length > 0 && !done) {
      reasons.push('blocking-others')
      score += 600 + Math.min(downstreamBlocked.length, 5) * 8
    } else if (statusCategoryOf(item, ctx) === 'backlog') {
      reasons.push('backlog')
      score += 300
    }
  }

  if (isOverdue(item, ctx)) {
    reasons.push('overdue')
    score += 150
  } else if (isDueToday(item, ctx)) {
    reasons.push('due-today')
    score += 80
  }

  if (!done && (item.priority === 'urgent' || item.priority === 'high')) {
    reasons.push('high-priority')
  }
  if (!done) score += PRIORITY_RANK[item.priority] * 15

  return {
    score,
    reasons,
    // Note that 'blocking-others' is deliberately *not* here. If ENG-124
    // is blocked by ENG-120, then ENG-120 is "blocking others" — and
    // putting both on the agenda makes the room discuss one dependency
    // twice. The blocked item is the one with a problem, and its row
    // already names what it is waiting for, so the upstream item earns a
    // badge and a high score but not a seat of its own.
    needsDiscussion: !done && reasons.some((r) => r === 'blocked' || r === 'backlog'),
  }
}

/** Reasons filtered to those a board card should render. */
export function cardReasons(attention: Attention): AttentionReason[] {
  return attention.reasons.filter(isCardReason)
}

export function priorityRank(priority: Priority): number {
  return PRIORITY_RANK[priority]
}

/* ------------------------------------------------------------------ *
 * Rollups — the headline numbers above a department's huddle section
 * ------------------------------------------------------------------ */

export interface WorkStats {
  active: number
  blockers: number
  backlog: number
  dependencies: number
  overdue: number
  completedRecently: number
  total: number
}

export function workStats(items: WorkItem[], ctx: EngineContext): WorkStats {
  let active = 0
  let blockers = 0
  let backlog = 0
  let dependencies = 0
  let overdue = 0
  let completedRecently = 0

  const recentCutoff = new Date(ctx.now.getTime() - 7 * 86_400_000)

  for (const item of items) {
    if (isActive(item, ctx)) active += 1
    if (isBlocked(item.id, ctx)) blockers += 1
    if (!isDone(item, ctx) && statusCategoryOf(item, ctx) === 'backlog') backlog += 1
    if (relationsOf(item.id, ctx).length > 0) dependencies += 1
    if (isOverdue(item, ctx)) overdue += 1
    if (item.completedAt && new Date(item.completedAt) >= recentCutoff) completedRecently += 1
  }

  return { active, blockers, backlog, dependencies, overdue, completedRecently, total: items.length }
}

/**
 * What one department brings to the huddle: every blocker, plus the
 * highest-scoring backlog items up to `backlogLimit`.
 *
 * Blockers are never capped — there are few and each one is a real
 * problem the room needs to hear. Backlog is capped because a
 * department can carry thirty untouched items, and reading all of them
 * out turns a meeting back into a database browse.
 */
export interface HuddleAgenda {
  blockers: WorkItem[]
  backlog: WorkItem[]
  /** Backlog beyond the cap — reachable, but not read out by default. */
  remainingBacklog: WorkItem[]
}

export function huddleAgenda(items: WorkItem[], ctx: EngineContext, backlogLimit: number): HuddleAgenda {
  const scored = items
    .map((item) => ({ item, attention: attentionOf(item, ctx) }))
    .filter((entry) => entry.attention.needsDiscussion)
    .sort((a, b) => b.attention.score - a.attention.score)

  const blockers = scored
    .filter((entry) => entry.attention.reasons.includes('blocked'))
    .map((entry) => entry.item)

  const allBacklog = scored
    .filter((entry) => entry.attention.reasons.includes('backlog'))
    .map((entry) => entry.item)

  return {
    blockers,
    backlog: allBacklog.slice(0, Math.max(0, backlogLimit)),
    remainingBacklog: allBacklog.slice(Math.max(0, backlogLimit)),
  }
}
