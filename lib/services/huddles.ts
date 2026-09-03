'use client'

import type { AttendanceState, Id } from '@/lib/types'
import { useStore, type AuditDraft, type StoreState } from '@/lib/store/store'
import { newId } from '@/lib/utils/id'

const apply = (recipe: (state: StoreState) => AuditDraft | AuditDraft[] | void | null) => useStore.getState().apply(recipe)

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * The huddle is a state machine over the organization's existing work:
 *
 *   attendance → running(department index) → summary → complete
 *
 * It is a meeting between heads of department, and it reviews
 * *departments* — each represented by its head — rather than people who
 * happen to be heads. Nothing here duplicates work data: discussions and
 * actions reference work items, and every change made during a huddle is
 * written to the item itself by the work-item service, so when the
 * huddle ends the board is already correct with no reconciliation step.
 */

/** Opens the attendance screen for an organization, reusing any live huddle. */
export function openHuddle(organizationId: Id): Id | null {
  const state = useStore.getState()

  const existing = Object.values(state.entities.huddles).find(
    (huddle) => huddle.organizationId === organizationId && huddle.stage !== 'complete',
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
    const organization = draft.entities.organizations[organizationId]
    if (!organization) return

    const id = newId('hud')
    const now = new Date()

    const departments = draft.order.departmentIds
      .map((departmentId) => draft.entities.departments[departmentId]!)
      .filter(Boolean)

    // A department with no head has nobody to speak for it. Rather than
    // quietly dropping it, record it so the huddle can say so out loud —
    // an absent department is a fact the room should hear.
    const represented = departments.filter((department) => Boolean(department.leadId))
    const skipped = departments.filter((department) => !department.leadId)

    draft.entities.huddles[id] = {
      id,
      organizationId,
      title: `Leadership Huddle — ${formatDate(now)}`,
      stage: 'attendance',
      scheduledFor: now.toISOString(),
      startedAt: null,
      endedAt: null,
      facilitatorId: draft.session.currentUserId,
      // Everyone starts present; marking absentees is the faster path.
      participants: represented.map((department) => ({
        departmentId: department.id,
        userId: department.leadId,
        attendance: 'present',
        reviewedAt: null,
      })),
      reviewOrder: [],
      currentIndex: 0,
      skippedDepartmentIds: skipped.map((department) => department.id),
      discussionIds: [],
      actionIds: [],
      updatedWorkItemIds: [],
      notes: '',
    }

    draft.order.huddleIds.unshift(id)
    draft.activeHuddleId = id
    createdId = id

    return { kind: 'huddle', entityId: id, summary: 'opened the leadership huddle', departmentId: null }
  })

  return createdId
}

export function setAttendance(huddleId: Id, departmentId: Id, attendance: AttendanceState) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    const participant = huddle?.participants.find((entry) => entry.departmentId === departmentId)
    if (!participant) return
    participant.attendance = attendance
    return null
  })
}

export function toggleAttendance(huddleId: Id, departmentId: Id) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    const participant = huddle?.participants.find((entry) => entry.departmentId === departmentId)
    if (!participant) return
    participant.attendance = participant.attendance === 'present' ? 'absent' : 'present'
    return null
  })
}

/**
 * Begins the department-by-department review. Only departments whose
 * head is present are put in the review order — reviewing a department
 * nobody can speak for wastes the room's time, and its work is still on
 * the board afterwards.
 */
export function startHuddle(huddleId: Id) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    if (!huddle) return

    huddle.reviewOrder = huddle.participants
      .filter((entry) => entry.attendance === 'present')
      .map((entry) => entry.departmentId)
    huddle.currentIndex = 0
    huddle.stage = 'running'
    huddle.startedAt = new Date().toISOString()
    state.activeHuddleId = huddleId

    return { kind: 'huddle', entityId: huddleId, summary: 'started the leadership huddle', departmentId: null }
  })
}

export function goToDepartment(huddleId: Id, index: number) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    if (!huddle) return

    const clamped = Math.max(0, Math.min(index, huddle.reviewOrder.length - 1))

    // Mark what we've moved past as reviewed, so the roster shows progress.
    const currentDepartmentId = huddle.reviewOrder[huddle.currentIndex]
    if (currentDepartmentId && clamped > huddle.currentIndex) {
      const participant = huddle.participants.find((entry) => entry.departmentId === currentDepartmentId)
      if (participant && !participant.reviewedAt) participant.reviewedAt = new Date().toISOString()
    }

    huddle.currentIndex = clamped
    return null
  })
}

export function nextDepartment(huddleId: Id) {
  const huddle = useStore.getState().entities.huddles[huddleId]
  if (!huddle) return
  if (huddle.currentIndex >= huddle.reviewOrder.length - 1) {
    finishReview(huddleId)
    return
  }
  goToDepartment(huddleId, huddle.currentIndex + 1)
}

export function previousDepartment(huddleId: Id) {
  const huddle = useStore.getState().entities.huddles[huddleId]
  if (!huddle) return
  goToDepartment(huddleId, huddle.currentIndex - 1)
}

/** Moves to the summary screen — the huddle is not yet closed. */
export function finishReview(huddleId: Id) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    if (!huddle) return

    const lastDepartmentId = huddle.reviewOrder[huddle.currentIndex]
    if (lastDepartmentId) {
      const participant = huddle.participants.find((entry) => entry.departmentId === lastDepartmentId)
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

    return { kind: 'huddle', entityId: huddleId, summary: 'completed the leadership huddle', departmentId: null }
  })
}

export function cancelHuddle(huddleId: Id) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    if (!huddle) return

    for (const id of huddle.discussionIds) delete state.entities.huddleDiscussions[id]
    for (const id of huddle.actionIds) delete state.entities.huddleActions[id]
    delete state.entities.huddles[huddleId]
    state.order.huddleIds = state.order.huddleIds.filter((id) => id !== huddleId)
    if (state.activeHuddleId === huddleId) state.activeHuddleId = null

    return { kind: 'huddle', entityId: huddleId, summary: 'discarded a huddle', departmentId: null }
  })
}

/* ------------------------------------------------------------------ *
 * Discussions and actions — PRD §32
 * ------------------------------------------------------------------ */

export interface DiscussionInput {
  workItemId: Id
  /** Which department's review this came up in. */
  subjectDepartmentId: Id | null
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
        existing.subjectDepartmentId = input.subjectDepartmentId
      }
      createdId = existingId
    } else {
      const id = newId('hdis')
      state.entities.huddleDiscussions[id] = {
        id,
        huddleId,
        workItemId: input.workItemId,
        subjectDepartmentId: input.subjectDepartmentId,
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
      departmentId: null,
    }
  })

  return createdId
}

export function toggleAction(actionId: Id) {
  apply((state) => {
    const action = state.entities.huddleActions[actionId]
    if (!action) return
    action.done = !action.done
    return {
      kind: 'huddle-action',
      entityId: actionId,
      summary: `${action.done ? 'completed' : 'reopened'} the action “${action.text}”`,
      departmentId: null,
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

/** Removes a completed huddle from history, with its discussions and actions. */
export function deleteHuddle(huddleId: Id) {
  apply((state) => {
    const huddle = state.entities.huddles[huddleId]
    if (!huddle) return
    const { title } = huddle

    for (const id of huddle.discussionIds) delete state.entities.huddleDiscussions[id]
    for (const id of huddle.actionIds) delete state.entities.huddleActions[id]
    delete state.entities.huddles[huddleId]
    state.order.huddleIds = state.order.huddleIds.filter((id) => id !== huddleId)
    if (state.activeHuddleId === huddleId) state.activeHuddleId = null

    return { kind: 'huddle', entityId: huddleId, summary: `deleted “${title}”`, departmentId: null }
  })
}

export function updateAction(actionId: Id, patch: { text?: string; ownerId?: Id; dueDate?: string | null }) {
  apply((state) => {
    const action = state.entities.huddleActions[actionId]
    if (!action) return
    Object.assign(action, patch)
    return { kind: 'huddle-action', entityId: actionId, summary: `updated the action “${action.text}”`, departmentId: null }
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
