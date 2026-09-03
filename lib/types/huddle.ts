import type { Id, ISODate } from './primitives'

/**
 * PRD §26–§34. A huddle is a temporary operating mode over a
 * department's existing work — not a second place where work lives.
 * Everything decided here writes back to the work items themselves,
 * which is the product's north star.
 */
export type HuddleStage = 'setup' | 'attendance' | 'running' | 'summary' | 'complete'

export type AttendanceState = 'present' | 'absent' | 'excused'

export interface HuddleParticipant {
  userId: Id
  attendance: AttendanceState
  /** Set when the facilitator moves past this person. */
  reviewedAt: ISODate | null
}

/** PRD §32 — captured against the work item, not in a separate meeting doc. */
export interface HuddleDiscussion {
  id: Id
  huddleId: Id
  workItemId: Id
  /** Who the item was being discussed under. */
  subjectUserId: Id | null
  why: string
  decision: string
  createdAt: ISODate
  createdBy: Id
}

export interface HuddleAction {
  id: Id
  huddleId: Id
  /** Actions may stand alone, but usually hang off the item discussed. */
  workItemId: Id | null
  text: string
  ownerId: Id
  dueDate: ISODate | null
  done: boolean
  createdAt: ISODate
  createdBy: Id
}

export interface Huddle {
  id: Id
  departmentId: Id
  /** e.g. "Engineering Huddle — 3 Sep" */
  title: string
  stage: HuddleStage
  scheduledFor: ISODate
  startedAt: ISODate | null
  endedAt: ISODate | null
  facilitatorId: Id
  participants: HuddleParticipant[]
  /** Order in which people are reviewed; index into this drives navigation. */
  reviewOrder: Id[]
  currentIndex: number
  discussionIds: Id[]
  actionIds: Id[]
  /** Work item ids touched during this huddle — drives the summary count. */
  updatedWorkItemIds: Id[]
  notes: string
}

export interface HuddleSummaryStats {
  present: number
  total: number
  blockers: number
  dependencies: number
  overdue: number
  itemsUpdated: number
  actionsCreated: number
  durationMinutes: number | null
}
