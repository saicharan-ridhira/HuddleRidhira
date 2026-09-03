import type { AuditEvent, Huddle, HuddleAction, HuddleDiscussion } from '@/lib/types'
import { isoDaysFromNow, isoMinutesAgo } from './helpers'

/**
 * A few completed huddles so "Huddle history" is not an empty state on
 * first run, and so the summary screen has something to be compared to.
 *
 * These are leadership huddles: the participants are the four heads of
 * department, and each one is recorded against the department it spoke
 * for rather than only against the person.
 */
export interface HistorySeed {
  huddles: Huddle[]
  discussions: HuddleDiscussion[]
  actions: HuddleAction[]
  auditEvents: AuditEvent[]
}

/** department id → the head who represented it. */
const HEADS: Array<{ departmentId: string; userId: string }> = [
  { departmentId: 'dept-engineering', userId: 'u-sai' },
  { departmentId: 'dept-product', userId: 'u-aditya' },
  { departmentId: 'dept-marketing', userId: 'u-rohan' },
  { departmentId: 'dept-sales', userId: 'u-manish' },
]

export function buildHistorySeed(now: Date): HistorySeed {
  const huddles: Huddle[] = []
  const discussions: HuddleDiscussion[] = []
  const actions: HuddleAction[] = []

  const past: Array<{
    daysAgo: number
    absentDepartments: string[]
    workItemId: string
    departmentId: string
    why: string
    decision: string
    action: string
    owner: string
  }> = [
    {
      daysAgo: 1,
      absentDepartments: ['dept-sales'],
      workItemId: 'wi-eng-120',
      departmentId: 'dept-engineering',
      why: 'Provider had not received the countersigned form, and four things across three departments wait on it.',
      decision: 'Karthik to re-send directly to the provider’s onboarding contact.',
      action: 'Confirm the provider has the signed form',
      owner: 'u-sai',
    },
    {
      daysAgo: 3,
      absentDepartments: [],
      workItemId: 'wi-mar-60',
      departmentId: 'dept-marketing',
      why: 'Launch week cannot be scheduled while the payments work is still open.',
      decision: 'Hold the announcement until Engineering confirms a date, rather than booking and moving it.',
      action: 'Agree a launch date once payments is green',
      owner: 'u-rohan',
    },
    {
      daysAgo: 4,
      absentDepartments: ['dept-product'],
      workItemId: 'wi-sal-190',
      departmentId: 'dept-sales',
      why: 'Litware procurement is waiting on a security summary nobody owns.',
      decision: 'Engineering to prioritise the secrets rotation runbook so the questionnaire can be answered.',
      action: 'Pull the secrets rotation runbook forward',
      owner: 'u-manish',
    },
  ]

  past.forEach((entry, index) => {
    const huddleId = `hud-past-${index + 1}`
    const startedAt = isoDaysFromNow(now, -entry.daysAgo, 9, 30)
    const endedAt = isoDaysFromNow(now, -entry.daysAgo, 9, 30 + 18 + index * 4)

    const discussionId = `hdis-past-${index + 1}`
    discussions.push({
      id: discussionId,
      huddleId,
      workItemId: entry.workItemId,
      subjectDepartmentId: entry.departmentId,
      why: entry.why,
      decision: entry.decision,
      createdAt: startedAt,
      createdBy: 'u-sai',
    })

    const actionId = `hact-past-${index + 1}`
    actions.push({
      id: actionId,
      huddleId,
      workItemId: entry.workItemId,
      text: entry.action,
      ownerId: entry.owner,
      dueDate: isoDaysFromNow(now, -entry.daysAgo + 1, 17),
      done: index > 0,
      createdAt: startedAt,
      createdBy: 'u-sai',
    })

    const presentDepartments = HEADS.filter(
      (head) => !entry.absentDepartments.includes(head.departmentId),
    ).map((head) => head.departmentId)

    huddles.push({
      id: huddleId,
      organizationId: 'org-acme',
      title: `Leadership Huddle — ${new Date(startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      stage: 'complete',
      scheduledFor: startedAt,
      startedAt,
      endedAt,
      facilitatorId: 'u-sai',
      participants: HEADS.map((head) => ({
        departmentId: head.departmentId,
        userId: head.userId,
        attendance: entry.absentDepartments.includes(head.departmentId) ? 'absent' : 'present',
        reviewedAt: entry.absentDepartments.includes(head.departmentId) ? null : startedAt,
      })),
      reviewOrder: presentDepartments,
      currentIndex: 0,
      skippedDepartmentIds: [],
      discussionIds: [discussionId],
      actionIds: [actionId],
      updatedWorkItemIds: [entry.workItemId],
      notes: '',
    })
  })

  /* --- Seeded audit trail (PRD §41) ----------------------------- */
  const auditEvents: AuditEvent[] = [
    { id: 'aud-1', at: isoMinutesAgo(now, 45), actorId: 'u-rahul', kind: 'work-item', entityId: 'wi-eng-135', summary: 'moved ENG-135 to Code Review', departmentId: 'dept-engineering', detail: { field: 'status', from: 'In Development', to: 'Code Review' } },
    { id: 'aud-2', at: isoMinutesAgo(now, 55), actorId: 'u-sai', kind: 'checklist', entityId: 'wi-eng-124', summary: 'completed “Error handling” on ENG-124', departmentId: 'dept-engineering' },
    { id: 'aud-3', at: isoMinutesAgo(now, 95), actorId: 'u-rahul', kind: 'work-item', entityId: 'wi-eng-122', summary: 'updated the description of ENG-122', departmentId: 'dept-engineering' },
    { id: 'aud-4', at: isoMinutesAgo(now, 130), actorId: 'u-sai', kind: 'work-item', entityId: 'wi-eng-118', summary: 'set ENG-118 due date to today', departmentId: 'dept-engineering', detail: { field: 'dueDate', from: null, to: 'today' } },
    { id: 'aud-5', at: isoMinutesAgo(now, 140), actorId: 'u-kavya', kind: 'work-item', entityId: 'wi-mar-60', summary: 'moved MKT-60 to Content', departmentId: 'dept-marketing' },
    { id: 'aud-6', at: isoMinutesAgo(now, 190), actorId: 'u-karthik', kind: 'comment', entityId: 'wi-eng-120', summary: 'commented on ENG-120', departmentId: 'dept-engineering' },
    { id: 'aud-7', at: isoMinutesAgo(now, 210), actorId: 'u-vikram', kind: 'work-item', entityId: 'wi-eng-123', summary: 'moved ENG-123 to In Development', departmentId: 'dept-engineering', detail: { field: 'status', from: 'Ready', to: 'In Development' } },
    { id: 'aud-8', at: isoMinutesAgo(now, 260), actorId: 'u-sneha', kind: 'dependency', entityId: 'dep-wi-pro-30-wi-eng-120', summary: 'linked PRD-30 blocked by ENG-120', departmentId: 'dept-product' },
    { id: 'aud-9', at: isoMinutesAgo(now, 300), actorId: 'u-priya', kind: 'blocker', entityId: 'wi-eng-127', summary: 'added a blocker to ENG-127', departmentId: 'dept-engineering' },
    { id: 'aud-10', at: isoMinutesAgo(now, 320), actorId: 'u-neha', kind: 'blocker', entityId: 'wi-sal-190', summary: 'flagged SLS-190 as blocked', departmentId: 'dept-sales' },
    { id: 'aud-11', at: isoMinutesAgo(now, 420), actorId: 'u-meera', kind: 'comment', entityId: 'wi-eng-131', summary: 'commented on ENG-131', departmentId: 'dept-engineering' },
    { id: 'aud-12', at: isoMinutesAgo(now, 1440), actorId: 'u-sai', kind: 'huddle', entityId: 'hud-past-1', summary: 'completed the leadership huddle', departmentId: null },
    { id: 'aud-13', at: isoMinutesAgo(now, 1460), actorId: 'u-sai', kind: 'huddle', entityId: 'hud-past-1', summary: 'started the leadership huddle', departmentId: null },
    { id: 'aud-14', at: isoMinutesAgo(now, 2880), actorId: 'u-aditya', kind: 'member', entityId: 'u-nisha', summary: 'added Nisha Pillai to Engineering', departmentId: 'dept-engineering' },
    { id: 'aud-15', at: isoMinutesAgo(now, 4320), actorId: 'u-aditya', kind: 'workflow', entityId: 'wf-engineering', summary: 'added the QA status to Engineering Workflow', departmentId: null },
    { id: 'aud-16', at: isoMinutesAgo(now, 5760), actorId: 'u-aditya', kind: 'department', entityId: 'dept-marketing', summary: 'made Rohan Kapoor head of Marketing', departmentId: 'dept-marketing' },
    { id: 'aud-17', at: isoMinutesAgo(now, 7200), actorId: 'u-sai', kind: 'view', entityId: 'view-blocked-engineering', summary: 'created the saved view “Blocked engineering work”', departmentId: 'dept-engineering' },
  ]

  return { huddles, discussions, actions, auditEvents }
}
