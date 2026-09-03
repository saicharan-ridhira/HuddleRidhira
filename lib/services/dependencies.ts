'use client'

import type { DependencyRelation, Id } from '@/lib/types'
import { DEPENDENCY_RELATION_LABEL, INVERSE_RELATION } from '@/lib/types'
import { useStore, type AuditDraft, type StoreState } from '@/lib/store/store'
import { newId } from '@/lib/utils/id'

const apply = (recipe: (state: StoreState) => AuditDraft | AuditDraft[] | void | null) => useStore.getState().apply(recipe)

/**
 * Adds a typed relationship. Stored once in the direction the user
 * expressed it; the inverse is derived on read (see `buildDependencyIndex`),
 * so "blocked by" and "blocks" can never disagree.
 *
 * Two guards matter: an item cannot depend on itself, and a blocking
 * relation that would close a cycle is refused — otherwise every item in
 * the cycle would be permanently blocked with no way to resolve it.
 */
export function addDependency(fromId: Id, toId: Id, relation: DependencyRelation): { ok: boolean; reason?: string } {
  if (fromId === toId) return { ok: false, reason: 'An item cannot depend on itself.' }

  const state = useStore.getState()

  const duplicate = Object.values(state.entities.dependencies).some(
    (dep) =>
      (dep.fromId === fromId && dep.toId === toId && dep.relation === relation) ||
      (dep.fromId === toId && dep.toId === fromId && dep.relation === INVERSE_RELATION[relation]),
  )
  if (duplicate) return { ok: false, reason: 'That relationship already exists.' }

  if (relation === 'blocked-by' || relation === 'depends-on') {
    if (createsCycle(state, fromId, toId)) {
      return { ok: false, reason: 'That would create a circular dependency.' }
    }
  }

  apply((draft) => {
    const from = draft.entities.workItems[fromId]
    const to = draft.entities.workItems[toId]
    if (!from || !to) return

    const id = newId('dep')
    draft.entities.dependencies[id] = {
      id,
      fromId,
      toId,
      relation,
      createdAt: new Date().toISOString(),
      createdBy: draft.session.currentUserId,
    }

    if (draft.activeHuddleId) {
      const huddle = draft.entities.huddles[draft.activeHuddleId]
      if (huddle && !huddle.updatedWorkItemIds.includes(fromId)) huddle.updatedWorkItemIds.push(fromId)
    }

    return {
      kind: 'dependency',
      entityId: id,
      summary: `linked ${from.key} ${DEPENDENCY_RELATION_LABEL[relation].toLowerCase()} ${to.key}`,
      departmentId: from.departmentId,
    }
  })

  return { ok: true }
}

/** Walks the blocking graph upward from `toId` looking for `fromId`. */
function createsCycle(state: StoreState, fromId: Id, toId: Id): boolean {
  const blockingEdgesOf = (itemId: Id): Id[] => {
    const upstream: Id[] = []
    for (const dep of Object.values(state.entities.dependencies)) {
      if ((dep.relation === 'blocked-by' || dep.relation === 'depends-on') && dep.fromId === itemId) {
        upstream.push(dep.toId)
      }
      if (dep.relation === 'blocks' && dep.toId === itemId) upstream.push(dep.fromId)
    }
    return upstream
  }

  const seen = new Set<Id>()
  const queue = [toId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === fromId) return true
    if (seen.has(current)) continue
    seen.add(current)
    queue.push(...blockingEdgesOf(current))
  }

  return false
}

export function removeDependency(dependencyId: Id) {
  apply((state) => {
    const dependency = state.entities.dependencies[dependencyId]
    if (!dependency) return
    const from = state.entities.workItems[dependency.fromId]
    const to = state.entities.workItems[dependency.toId]
    delete state.entities.dependencies[dependencyId]

    return {
      kind: 'dependency',
      entityId: dependencyId,
      summary: `removed the link between ${from?.key ?? 'an item'} and ${to?.key ?? 'an item'}`,
      departmentId: from?.departmentId ?? null,
    }
  })
}

/* ------------------------------------------------------------------ *
 * Manual blockers — PRD §33
 * ------------------------------------------------------------------ */

export function addBlocker(itemId: Id, reason: string) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item || !reason.trim()) return

    const id = newId('blk')
    state.entities.blockers[id] = {
      id,
      workItemId: itemId,
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
      createdBy: state.session.currentUserId,
      resolvedAt: null,
      resolvedBy: null,
    }

    if (state.activeHuddleId) {
      const huddle = state.entities.huddles[state.activeHuddleId]
      if (huddle && !huddle.updatedWorkItemIds.includes(itemId)) huddle.updatedWorkItemIds.push(itemId)
    }

    return { kind: 'blocker', entityId: id, summary: `flagged ${item.key} as blocked`, departmentId: item.departmentId }
  })
}

export function updateBlockerReason(blockerId: Id, reason: string) {
  apply((state) => {
    const blocker = state.entities.blockers[blockerId]
    if (!blocker || !reason.trim()) return
    blocker.reason = reason.trim()
    const item = state.entities.workItems[blocker.workItemId]
    return { kind: 'blocker', entityId: blockerId, summary: `reworded the blocker on ${item?.key ?? 'an item'}`, departmentId: item?.departmentId ?? null }
  })
}

/**
 * Removes a blocker outright, as opposed to resolving it. Use this when
 * it was raised in error — resolving records that the obstacle was
 * cleared, which is a different and usually truer thing to say.
 */
export function deleteBlocker(blockerId: Id) {
  apply((state) => {
    const blocker = state.entities.blockers[blockerId]
    if (!blocker) return
    const item = state.entities.workItems[blocker.workItemId]
    delete state.entities.blockers[blockerId]
    return { kind: 'blocker', entityId: blockerId, summary: `removed a blocker from ${item?.key ?? 'an item'}`, departmentId: item?.departmentId ?? null }
  })
}

export function resolveBlocker(blockerId: Id, note?: string) {
  apply((state) => {
    const blocker = state.entities.blockers[blockerId]
    if (!blocker || blocker.resolvedAt) return
    const item = state.entities.workItems[blocker.workItemId]

    blocker.resolvedAt = new Date().toISOString()
    blocker.resolvedBy = state.session.currentUserId
    if (note?.trim()) blocker.resolutionNote = note.trim()

    if (state.activeHuddleId && item) {
      const huddle = state.entities.huddles[state.activeHuddleId]
      if (huddle && !huddle.updatedWorkItemIds.includes(item.id)) huddle.updatedWorkItemIds.push(item.id)
    }

    return {
      kind: 'blocker',
      entityId: blockerId,
      summary: `resolved the blocker on ${item?.key ?? 'an item'}`,
      departmentId: item?.departmentId ?? null,
    }
  })
}
