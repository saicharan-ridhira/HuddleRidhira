'use client'

import type { CustomFieldValue, Id, Priority, WorkItem } from '@/lib/types'
import { TERMINAL_STATUS_CATEGORIES } from '@/lib/types'
import { useStore, type AuditDraft, type StoreState } from '@/lib/store/store'
import { DEPARTMENT_KEY_PREFIX } from '@/lib/data/seed'
import { newId } from '@/lib/utils/id'

const apply = (recipe: (state: StoreState) => AuditDraft | AuditDraft[] | void | null) => useStore.getState().apply(recipe)

function touch(item: WorkItem) {
  item.updatedAt = new Date().toISOString()
}

function statusName(state: StoreState, statusId: Id): string {
  return state.entities.statuses[statusId]?.name ?? 'Unknown'
}

/** Next free number for a department's key sequence, e.g. ENG-163. */
function nextKey(state: StoreState, departmentId: Id): string {
  const prefix = DEPARTMENT_KEY_PREFIX[departmentId] ?? 'WRK'
  let highest = 0
  for (const item of Object.values(state.entities.workItems)) {
    if (item.departmentId !== departmentId) continue
    const parsed = Number.parseInt(item.key.split('-')[1] ?? '0', 10)
    if (Number.isFinite(parsed) && parsed > highest) highest = parsed
  }
  return `${prefix}-${highest + 1}`
}

/**
 * Moving into a terminal status stamps `completedAt`; moving back out
 * clears it. Every downstream dependent re-derives its blocked state
 * from this automatically — that is PRD §25's "simulated unblocking",
 * and it needs no extra code here.
 */
export function updateStatus(itemId: Id, statusId: Id) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item || item.statusId === statusId) return
    const from = statusName(state, item.statusId)
    const to = statusName(state, statusId)

    const category = state.entities.statuses[statusId]?.category
    const wasTerminal = TERMINAL_STATUS_CATEGORIES.includes(
      state.entities.statuses[item.statusId]?.category ?? 'backlog',
    )
    const isTerminal = category ? TERMINAL_STATUS_CATEGORIES.includes(category) : false

    item.statusId = statusId
    if (isTerminal && !wasTerminal) item.completedAt = new Date().toISOString()
    if (!isTerminal && wasTerminal) item.completedAt = null
    touch(item)

    trackHuddleEdit(state, itemId)

    return {
      kind: 'work-item',
      entityId: itemId,
      summary: `moved ${item.key} to ${to}`,
      detail: { field: 'status', from, to },
      departmentId: item.departmentId,
    }
  })
}

/** Board drag & drop: change column and position in one transaction. */
export function moveWorkItem(itemId: Id, statusId: Id, targetIndex: number) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item) return

    const changedStatus = item.statusId !== statusId
    const from = statusName(state, item.statusId)
    const to = statusName(state, statusId)

    // Re-number the destination column so positions stay dense and stable.
    const column = Object.values(state.entities.workItems)
      .filter((other) => other.statusId === statusId && other.id !== itemId)
      .sort((a, b) => a.order - b.order)

    column.splice(Math.max(0, Math.min(targetIndex, column.length)), 0, item)
    column.forEach((entry, index) => {
      const target = state.entities.workItems[entry.id]
      if (target) target.order = index
    })

    if (changedStatus) {
      const category = state.entities.statuses[statusId]?.category
      const wasTerminal = TERMINAL_STATUS_CATEGORIES.includes(
        state.entities.statuses[item.statusId]?.category ?? 'backlog',
      )
      const isTerminal = category ? TERMINAL_STATUS_CATEGORIES.includes(category) : false
      item.statusId = statusId
      if (isTerminal && !wasTerminal) item.completedAt = new Date().toISOString()
      if (!isTerminal && wasTerminal) item.completedAt = null
    }

    touch(item)
    trackHuddleEdit(state, itemId)

    if (!changedStatus) return null

    return {
      kind: 'work-item',
      entityId: itemId,
      summary: `moved ${item.key} to ${to}`,
      detail: { field: 'status', from, to },
      departmentId: item.departmentId,
    }
  })
}

export function updatePriority(itemId: Id, priority: Priority) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item || item.priority === priority) return
    const from = item.priority
    item.priority = priority
    touch(item)
    trackHuddleEdit(state, itemId)
    return {
      kind: 'work-item',
      entityId: itemId,
      summary: `set ${item.key} priority to ${priority}`,
      detail: { field: 'priority', from, to: priority },
      departmentId: item.departmentId,
    }
  })
}

export function updateAssignee(itemId: Id, assigneeId: Id | null) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item || item.assigneeId === assigneeId) return
    const from = item.assigneeId ? (state.entities.users[item.assigneeId]?.name ?? null) : null
    const to = assigneeId ? (state.entities.users[assigneeId]?.name ?? null) : null
    item.assigneeId = assigneeId
    touch(item)
    trackHuddleEdit(state, itemId)
    return {
      kind: 'work-item',
      entityId: itemId,
      summary: to ? `assigned ${item.key} to ${to}` : `unassigned ${item.key}`,
      detail: { field: 'assignee', from, to },
      departmentId: item.departmentId,
    }
  })
}

export function updateDueDate(itemId: Id, dueDate: string | null) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item || item.dueDate === dueDate) return
    const from = item.dueDate
    item.dueDate = dueDate
    touch(item)
    trackHuddleEdit(state, itemId)
    return {
      kind: 'work-item',
      entityId: itemId,
      summary: dueDate ? `set ${item.key} due date` : `cleared the due date on ${item.key}`,
      detail: { field: 'dueDate', from, to: dueDate },
      departmentId: item.departmentId,
    }
  })
}

export function updateStartDate(itemId: Id, startDate: string | null) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item) return
    item.startDate = startDate
    touch(item)
    return { kind: 'work-item', entityId: itemId, summary: `updated the start date on ${item.key}`, departmentId: item.departmentId }
  })
}

export function updateTitle(itemId: Id, title: string) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item || item.title === title || !title.trim()) return
    const from = item.title
    item.title = title.trim()
    touch(item)
    return {
      kind: 'work-item',
      entityId: itemId,
      summary: `renamed ${item.key}`,
      detail: { field: 'title', from, to: item.title },
      departmentId: item.departmentId,
    }
  })
}

export function updateDescription(itemId: Id, description: string) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item || item.description === description) return
    item.description = description
    touch(item)
    return { kind: 'work-item', entityId: itemId, summary: `updated the description of ${item.key}`, departmentId: item.departmentId }
  })
}

export function toggleLabel(itemId: Id, labelId: Id) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item) return
    const name = state.entities.labels[labelId]?.name ?? 'label'
    const index = item.labelIds.indexOf(labelId)
    const added = index === -1
    if (added) item.labelIds.push(labelId)
    else item.labelIds.splice(index, 1)
    touch(item)
    trackHuddleEdit(state, itemId)
    return {
      kind: 'work-item',
      entityId: itemId,
      summary: `${added ? 'added' : 'removed'} the ${name} label ${added ? 'to' : 'from'} ${item.key}`,
      departmentId: item.departmentId,
    }
  })
}

export function setCustomField(itemId: Id, fieldId: Id, value: CustomFieldValue) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item) return
    const field = state.entities.customFields[fieldId]
    item.customFields[fieldId] = value
    touch(item)
    return {
      kind: 'work-item',
      entityId: itemId,
      summary: `set ${field?.name ?? 'a custom field'} on ${item.key}`,
      detail: { field: field?.name ?? fieldId, from: null, to: value === null ? null : String(value) },
      departmentId: item.departmentId,
    }
  })
}

export interface CreateWorkItemInput {
  title: string
  departmentId: Id
  statusId: Id
  typeId?: Id
  priority?: Priority
  assigneeId?: Id | null
  labelIds?: Id[]
  dueDate?: string | null
  description?: string
}

export function createWorkItem(input: CreateWorkItemInput): Id | null {
  let createdId: Id | null = null

  apply((state) => {
    const id = newId('wi')
    const key = nextKey(state, input.departmentId)
    const now = new Date().toISOString()

    const columnSize = Object.values(state.entities.workItems).filter((item) => item.statusId === input.statusId).length

    state.entities.workItems[id] = {
      id,
      key,
      title: input.title.trim(),
      description: input.description ?? '',
      typeId: input.typeId ?? state.order.workItemTypeIds[0] ?? 'wt-task',
      statusId: input.statusId,
      priority: input.priority ?? 'medium',
      departmentId: input.departmentId,
      assigneeId: input.assigneeId ?? null,
      reporterId: state.session.currentUserId,
      rockQuarter: null,
      labelIds: input.labelIds ?? [],
      startDate: null,
      dueDate: input.dueDate ?? null,
      customFields: {},
      checklistId: null,
      order: columnSize,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    }
    state.order.workItemIds.push(id)
    createdId = id
    trackHuddleEdit(state, id)

    return { kind: 'work-item', entityId: id, summary: `created ${key}`, departmentId: input.departmentId }
  })

  return createdId
}

export function deleteWorkItem(itemId: Id) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item) return
    const { key, departmentId } = item

    // Take the item's relationships with it, or the board renders ghosts.
    for (const dependency of Object.values(state.entities.dependencies)) {
      if (dependency.fromId === itemId || dependency.toId === itemId) {
        delete state.entities.dependencies[dependency.id]
      }
    }
    for (const blocker of Object.values(state.entities.blockers)) {
      if (blocker.workItemId === itemId) delete state.entities.blockers[blocker.id]
    }
    for (const comment of Object.values(state.entities.comments)) {
      if (comment.workItemId === itemId) delete state.entities.comments[comment.id]
    }
    if (item.checklistId) {
      const checklist = state.entities.checklists[item.checklistId]
      for (const entryId of checklist?.itemIds ?? []) delete state.entities.checklistItems[entryId]
      delete state.entities.checklists[item.checklistId]
    }

    delete state.entities.workItems[itemId]
    state.order.workItemIds = state.order.workItemIds.filter((id) => id !== itemId)
    if (state.openWorkItemId === itemId) state.openWorkItemId = null

    return { kind: 'work-item', entityId: itemId, summary: `deleted ${key}`, departmentId }
  })
}

/* ------------------------------------------------------------------ *
 * Checklists — PRD §36
 * ------------------------------------------------------------------ */

export function addChecklistItem(itemId: Id, text: string) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item || !text.trim()) return

    let checklistId = item.checklistId
    if (!checklistId) {
      checklistId = newId('cl')
      state.entities.checklists[checklistId] = { id: checklistId, workItemId: itemId, title: 'Checklist', itemIds: [] }
      item.checklistId = checklistId
    }

    const checklist = state.entities.checklists[checklistId]
    if (!checklist) return

    const entryId = newId('cli')
    state.entities.checklistItems[entryId] = { id: entryId, text: text.trim(), done: false, order: checklist.itemIds.length }
    checklist.itemIds.push(entryId)
    touch(item)
    trackHuddleEdit(state, itemId)

    return { kind: 'checklist', entityId: itemId, summary: `added “${text.trim()}” to the ${item.key} checklist`, departmentId: item.departmentId }
  })
}

export function toggleChecklistItem(itemId: Id, entryId: Id) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    const entry = state.entities.checklistItems[entryId]
    if (!item || !entry) return
    entry.done = !entry.done
    touch(item)
    trackHuddleEdit(state, itemId)
    return {
      kind: 'checklist',
      entityId: itemId,
      summary: `${entry.done ? 'completed' : 'reopened'} “${entry.text}” on ${item.key}`,
      departmentId: item.departmentId,
    }
  })
}

export function removeChecklistItem(itemId: Id, entryId: Id) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item || !item.checklistId) return
    const checklist = state.entities.checklists[item.checklistId]
    const entry = state.entities.checklistItems[entryId]
    if (!checklist || !entry) return

    checklist.itemIds = checklist.itemIds.filter((id) => id !== entryId)
    delete state.entities.checklistItems[entryId]
    touch(item)

    return { kind: 'checklist', entityId: itemId, summary: `removed “${entry.text}” from ${item.key}`, departmentId: item.departmentId }
  })
}

export function renameChecklistItem(entryId: Id, text: string) {
  apply((state) => {
    const entry = state.entities.checklistItems[entryId]
    if (!entry || !text.trim()) return
    entry.text = text.trim()
    return null
  })
}

/* ------------------------------------------------------------------ *
 * Comments
 * ------------------------------------------------------------------ */

export function updateComment(commentId: Id, body: string) {
  apply((state) => {
    const comment = state.entities.comments[commentId]
    if (!comment || !body.trim()) return
    // A comment is a record of what someone said; only they may rewrite it.
    if (comment.authorId !== state.session.currentUserId) return
    comment.body = body.trim()
    const item = state.entities.workItems[comment.workItemId]
    return { kind: 'comment', entityId: comment.workItemId, summary: `edited a comment on ${item?.key ?? 'an item'}`, departmentId: item?.departmentId ?? null }
  })
}

export function deleteComment(commentId: Id) {
  apply((state) => {
    const comment = state.entities.comments[commentId]
    if (!comment) return
    if (comment.authorId !== state.session.currentUserId) return
    const item = state.entities.workItems[comment.workItemId]
    delete state.entities.comments[commentId]
    return { kind: 'comment', entityId: comment.workItemId, summary: `deleted a comment on ${item?.key ?? 'an item'}`, departmentId: item?.departmentId ?? null }
  })
}

export function addComment(itemId: Id, body: string) {
  apply((state) => {
    const item = state.entities.workItems[itemId]
    if (!item || !body.trim()) return
    const id = newId('cmt')
    state.entities.comments[id] = {
      id,
      workItemId: itemId,
      authorId: state.session.currentUserId,
      body: body.trim(),
      createdAt: new Date().toISOString(),
    }
    touch(item)
    return { kind: 'comment', entityId: itemId, summary: `commented on ${item.key}`, departmentId: item.departmentId }
  })
}

/* ------------------------------------------------------------------ *
 * Huddle bookkeeping
 * ------------------------------------------------------------------ */

/**
 * Any edit made while a huddle is running counts toward that huddle's
 * "tasks updated" figure. Recording it here — rather than in the huddle
 * UI — means changes made from the drawer, the board or the command
 * palette all count, which is what makes the summary trustworthy.
 */
function trackHuddleEdit(state: StoreState, itemId: Id) {
  if (!state.activeHuddleId) return
  const huddle = state.entities.huddles[state.activeHuddleId]
  if (!huddle || huddle.stage === 'complete') return
  if (!huddle.updatedWorkItemIds.includes(itemId)) huddle.updatedWorkItemIds.push(itemId)
}
