'use client'

import type { AttendanceState, Id } from '@/lib/types'
import { useStore, type AuditDraft, type StoreState } from '@/lib/store/store'
import { newId } from '@/lib/utils/id'

const apply = (recipe: (state: StoreState) => AuditDraft | AuditDraft[] | void | null) => useStore.getState().apply(recipe)

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * PRD §26–§34. The huddle is a state machine over a department's
 * existing work:
 *
 *   setup → attendance → running(personIndex) → summary → complete
 *
 * Nothing here duplicates work data. Discussions and actions reference
 * work items; every change made during a huddle is written to the item
 * itself by the work-item service, so when the huddle ends the board is
 * already correct with no reconciliation step.
 */

/** Opens the attendance screen for a department, reusing any live huddle. */
export function openHuddle(departmentId: Id): Id | null {
  const state = useStore.getState()

  const existing = Object.values(state.entities.huddles).find(
    (huddle) => huddle.departmentId === departmentId && huddle.stage !== 'complete',
  )
  if (existing) {
    useStore.getState().apply((draft) => {
      draft.activeHuddleId = existing.id
      return null
    })
    return existing.id
  }

  let createdId: Id | null = null

  apply((draft) => {
    const department = draft.entities.departments[departmentId]
    if (!department) return

    const id = newId('hud')
    const now = new Date()

    draft.entities.huddles[id] = {
      id,
      departmentId,
      title: `${department.name} Huddle — ${formatDate(now)}`,
      stage: 'attendance',
      scheduledFor: now.toISOString(),
      startedAt: null,
      endedAt: null,
      facilitatorId: draft.session.currentUserId,
      // Everyone starts present; marking absentees is the faster path.
      participants: department.memberIds.map((userId) => ({ userId, attendance: 'present', reviewedAt: null })),
      reviewOrder: [],
      currentIndex: 0,
      discussionIds: [],
      actionIds: [],
      updatedWorkItemIds: [],
      notes: '',
    }

    draft.order.huddleIds.unshift(id)
    draft.activeHuddleId = id
    createdId = id

    return { kind: 'huddle', entityId: id, summary: `opened the ${department.name} huddle`, departmentId }
  })

  return createdId
}

export function setAttendance(huddleId: Id, userId: Id, attendance: AttendanceState) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    const participant = huddle?.participants.find((entry) => entry.userId === userId)
    if (!participant) return
    participant.attendance = attendance
    return null
  })
}

export function toggleAttendance(huddleId: Id, userId: Id) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    const participant = huddle?.participants.find((entry) => entry.userId === userId)
    if (!participant) return
    participant.attendance = participant.attendance === 'present' ? 'absent' : 'present'
    return null
  })
}

/**
 * Begins the person-by-person review. Only people marked present are put
 * in the review order — walking an absent person's board wastes the
 * room's time, and their work still shows on the board afterwards.
 */
export function startHuddle(huddleId: Id) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    if (!huddle) return

    const present = huddle.participants.filter((entry) => entry.attendance === 'present').map((entry) => entry.userId)

    huddle.reviewOrder = present
    huddle.currentIndex = 0
    huddle.stage = 'running'
    huddle.startedAt = new Date().toISOString()
    state.activeHuddleId = huddleId

    const department = state.entities.departments[huddle.departmentId]
    return {
      kind: 'huddle',
      entityId: huddleId,
      summary: `started the ${department?.name ?? ''} huddle`.trim(),
      departmentId: huddle.departmentId,
    }
  })
}

export function goToPerson(huddleId: Id, index: number) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    if (!huddle) return

    const clamped = Math.max(0, Math.min(index, huddle.reviewOrder.length - 1))

    // Mark everyone we've moved past as reviewed, so the roster shows progress.
    const currentUserId = huddle.reviewOrder[huddle.currentIndex]
    if (currentUserId && clamped > huddle.currentIndex) {
      const participant = huddle.participants.find((entry) => entry.userId === currentUserId)
      if (participant && !participant.reviewedAt) participant.reviewedAt = new Date().toISOString()
    }

    huddle.currentIndex = clamped
    return null
  })
}

export function nextPerson(huddleId: Id) {
  const huddle = useStore.getState().entities.huddles[huddleId]
  if (!huddle) return
  if (huddle.currentIndex >= huddle.reviewOrder.length - 1) {
    finishReview(huddleId)
    return
  }
  goToPerson(huddleId, huddle.currentIndex + 1)
}

export function previousPerson(huddleId: Id) {
  const huddle = useStore.getState().entities.huddles[huddleId]
  if (!huddle) return
  goToPerson(huddleId, huddle.currentIndex - 1)
}

/** Moves to the summary screen — the huddle is not yet closed. */
export function finishReview(huddleId: Id) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    if (!huddle) return

    const lastUserId = huddle.reviewOrder[huddle.currentIndex]
    if (lastUserId) {
      const participant = huddle.participants.find((entry) => entry.userId === lastUserId)
      if (participant && !participant.reviewedAt) participant.reviewedAt = new Date().toISOString()
    }

    huddle.stage = 'summary'
    return null
  })
}

export function reopenReview(huddleId: Id) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    if (!huddle) return
    huddle.stage = 'running'
    return null
  })
}

/** Closes the huddle. From here it is read-only history. */
export function completeHuddle(huddleId: Id) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    if (!huddle) return

    huddle.stage = 'complete'
    huddle.endedAt = new Date().toISOString()
    if (state.activeHuddleId === huddleId) state.activeHuddleId = null

    const department = state.entities.departments[huddle.departmentId]
    return {
      kind: 'huddle',
      entityId: huddleId,
      summary: `completed the ${department?.name ?? ''} huddle`.trim(),
      departmentId: huddle.departmentId,
    }
  })
}

export function cancelHuddle(huddleId: Id) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    if (!huddle) return
    const departmentId = huddle.departmentId

    for (const id of huddle.discussionIds) delete state.entities.huddleDiscussions[id]
    for (const id of huddle.actionIds) delete state.entities.huddleActions[id]
    delete state.entities.huddles[huddleId]
    state.order.huddleIds = state.order.huddleIds.filter((id) => id !== huddleId)
    if (state.activeHuddleId === huddleId) state.activeHuddleId = null

    return { kind: 'huddle', entityId: huddleId, summary: 'discarded a huddle', departmentId }
  })
}

/* ------------------------------------------------------------------ *
 * Discussions and actions — PRD §32
 * ------------------------------------------------------------------ */

export interface DiscussionInput {
  workItemId: Id
  subjectUserId: Id | null
  why: string
  decision: string
}

export function recordDiscussion(huddleId: Id, input: DiscussionInput): Id | null {
  let createdId: Id | null = null

  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    const item = state.entities.workItems[input.workItemId]
    if (!huddle || !item) return

    // One discussion record per item per huddle — revisiting an item
    // should refine what was said, not append a second version of it.
    const existingId = huddle.discussionIds.find(
      (id) => state.entities.huddleDiscussions[id]?.workItemId === input.workItemId,
    )

    if (existingId) {
      const existing = state.entities.huddleDiscussions[existingId]
      if (existing) {
        existing.why = input.why
        existing.decision = input.decision
        existing.subjectUserId = input.subjectUserId
      }
      createdId = existingId
    } else {
      const id = newId('hdis')
      state.entities.huddleDiscussions[id] = {
        id,
        huddleId,
        workItemId: input.workItemId,
        subjectUserId: input.subjectUserId,
        why: input.why,
        decision: input.decision,
        createdAt: new Date().toISOString(),
        createdBy: state.session.currentUserId,
      }
      huddle.discussionIds.push(id)
      createdId = id
    }

    if (!huddle.updatedWorkItemIds.includes(input.workItemId)) huddle.updatedWorkItemIds.push(input.workItemId)

    return { kind: 'huddle', entityId: huddleId, summary: `recorded a decision on ${item.key}`, departmentId: item.departmentId }
  })

  return createdId
}

export interface ActionInput {
  workItemId: Id | null
  text: string
  ownerId: Id
  dueDate: string | null
}

export function addAction(huddleId: Id, input: ActionInput): Id | null {
  let createdId: Id | null = null

  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    if (!huddle || !input.text.trim()) return

    const id = newId('hact')
    state.entities.huddleActions[id] = {
      id,
      huddleId,
      workItemId: input.workItemId,
      text: input.text.trim(),
      ownerId: input.ownerId,
      dueDate: input.dueDate,
      done: false,
      createdAt: new Date().toISOString(),
      createdBy: state.session.currentUserId,
    }
    huddle.actionIds.push(id)
    createdId = id

    if (input.workItemId && !huddle.updatedWorkItemIds.includes(input.workItemId)) {
      huddle.updatedWorkItemIds.push(input.workItemId)
    }

    const owner = state.entities.users[input.ownerId]
    return {
      kind: 'huddle-action',
      entityId: id,
      summary: `created an action for ${owner?.name ?? 'someone'}: ${input.text.trim()}`,
      departmentId: huddle.departmentId,
    }
  })

  return createdId
}

export function toggleAction(actionId: Id) {
  apply((state) => {
    const action = state.entities.huddleActions[actionId]
    if (!action) return
    action.done = !action.done
    const huddle = state.entities.huddles[action.huddleId]
    return {
      kind: 'huddle-action',
      entityId: actionId,
      summary: `${action.done ? 'completed' : 'reopened'} the action “${action.text}”`,
      departmentId: huddle?.departmentId ?? null,
    }
  })
}

export function removeAction(actionId: Id) {
  apply((state) => {
    const action = state.entities.huddleActions[actionId]
    if (!action) return
    const huddle = state.entities.huddles[action.huddleId]
    if (huddle) huddle.actionIds = huddle.actionIds.filter((id) => id !== actionId)
    delete state.entities.huddleActions[actionId]
    return null
  })
}

export function setHuddleNotes(huddleId: Id, notes: string) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    if (!huddle) return
    huddle.notes = notes
    return null
  })
}
