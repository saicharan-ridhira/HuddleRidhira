import type { Id, ISODate } from './primitives'

/**
 * A huddle is a temporary operating mode over the organization's
 * existing work — not a second place where work lives. Everything
 * decided here writes back to the work items themselves, which is the
 * product's north star.
 *
 * The meeting is between **heads of department**. Note that it reviews
 * *departments*, each represented by its head, rather than reviewing
 * people who happen to be heads — so `reviewOrder` holds department
 * ids. That distinction survives an HOD changing mid-quarter: the
 * department is still the unit of review, and past huddles still record
 * who spoke for it at the time.
 */
export type HuddleStage = 'setup' | 'attendance' | 'running' | 'summary' | 'complete'

export type AttendanceState = 'present' | 'absent' | 'excused'

export interface HuddleParticipant {
  /** The unit being represented. */
  departmentId: Id
  /** Who spoke for it — the department's head at the time of the huddle. */
  userId: Id
  attendance: AttendanceState
  /** Set when the facilitator moves past this department. */
  reviewedAt: ISODate | null
}

/** PRD §32 — captured against the work item, not in a separate meeting doc. */
export interface HuddleDiscussion {
  id: Id
  huddleId: Id
  workItemId: Id
  /** Which department's review the item came up in. */
  subjectDepartmentId: Id | null
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
  organizationId: Id
  /** e.g. "Leadership Huddle — 3 Sep" */
  title: string
  stage: HuddleStage
  scheduledFor: ISODate
  startedAt: ISODate | null
  endedAt: ISODate | null
  facilitatorId: Id
  participants: HuddleParticipant[]
  /**
   * Department ids, in review order; `currentIndex` points into this.
   * Only departments whose head is present are included.
   */
  reviewOrder: Id[]
  currentIndex: number
  /**
   * Departments left out because they have no head assigned. Recorded so
   * the huddle can say so out loud rather than silently omitting them.
   */
  skippedDepartmentIds: Id[]
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
  backlog: number
  dependencies: number
  itemsUpdated: number
  actionsCreated: number
  durationMinutes: number | null
}
