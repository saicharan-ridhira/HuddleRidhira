import type { AuditEvent, Huddle, HuddleAction, HuddleDiscussion } from '@/lib/types'
import { isoDaysFromNow, isoMinutesAgo } from './helpers'

/**
 * A few completed huddles so "Huddle history" is not an empty state on
 * first run, and so the summary screen has something to be compared to.
 */
export interface HistorySeed {
  huddles: Huddle[]
  discussions: HuddleDiscussion[]
  actions: HuddleAction[]
  auditEvents: AuditEvent[]
}

const ENGINEERING_MEMBERS = [
  'u-sai', 'u-rahul', 'u-priya', 'u-ananya', 'u-karthik',
  'u-divya', 'u-arjun', 'u-meera', 'u-vikram', 'u-nisha',
]

export function buildHistorySeed(now: Date): HistorySeed {
  const huddles: Huddle[] = []
  const discussions: HuddleDiscussion[] = []
  const actions: HuddleAction[] = []

  const past: Array<{ daysAgo: number; absent: string[]; blockerItem: string; why: string; decision: string; action: string; owner: string }> = [
    {
      daysAgo: 1, absent: ['u-nisha'], blockerItem: 'wi-eng-120',
      why: 'Provider had not received the countersigned form.',
      decision: 'Karthik to re-send directly to the provider’s onboarding contact.',
      action: 'Confirm the provider has the signed form', owner: 'u-karthik',
    },
    {
      daysAgo: 2, absent: ['u-vikram', 'u-meera'], blockerItem: 'wi-eng-142',
      why: 'Flaky tests share a runner with the main build.',
      decision: 'Vikram to provision a dedicated runner this week.',
      action: 'Provision an isolated CI runner', owner: 'u-vikram',
    },
    {
      daysAgo: 3, absent: [], blockerItem: 'wi-eng-127',
      why: 'Brand review slot slipped by a week.',
      decision: 'Priya to book time directly with the brand lead.',
      action: 'Book the checkout brand review', owner: 'u-priya',
    },
  ]

  past.forEach((entry, index) => {
    const huddleId = `hud-past-${index + 1}`
    const startedAt = isoDaysFromNow(now, -entry.daysAgo, 9, 30)
    const endedAt = isoDaysFromNow(now, -entry.daysAgo, 9, 30 + 14 + index * 3)

    const discussionId = `hdis-past-${index + 1}`
    discussions.push({
      id: discussionId,
      huddleId,
      workItemId: entry.blockerItem,
      subjectUserId: entry.owner,
      why: entry.why,
      decision: entry.decision,
      createdAt: startedAt,
      createdBy: 'u-sai',
    })

    const actionId = `hact-past-${index + 1}`
    actions.push({
      id: actionId,
      huddleId,
      workItemId: entry.blockerItem,
      text: entry.action,
      ownerId: entry.owner,
      dueDate: isoDaysFromNow(now, -entry.daysAgo + 1, 17),
      done: index > 0,
      createdAt: startedAt,
      createdBy: 'u-sai',
    })

    huddles.push({
      id: huddleId,
      departmentId: 'dept-engineering',
      title: `Engineering Huddle — ${new Date(startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      stage: 'complete',
      scheduledFor: startedAt,
      startedAt,
      endedAt,
      facilitatorId: 'u-sai',
      participants: ENGINEERING_MEMBERS.map((userId) => ({
        userId,
        attendance: entry.absent.includes(userId) ? 'absent' : 'present',
        reviewedAt: entry.absent.includes(userId) ? null : startedAt,
      })),
      reviewOrder: ENGINEERING_MEMBERS.filter((id) => !entry.absent.includes(id)),
      currentIndex: 0,
      discussionIds: [discussionId],
      actionIds: [actionId],
      updatedWorkItemIds: [entry.blockerItem],
      notes: '',
    })
  })

  /* --- Seeded audit trail (PRD §41) ----------------------------- */
  const auditEvents: AuditEvent[] = [
    { id: 'aud-1', at: isoMinutesAgo(now, 45), actorId: 'u-rahul', kind: 'work-item', entityId: 'wi-eng-135', summary: 'moved ENG-135 to Code Review', departmentId: 'dept-engineering', detail: { field: 'status', from: 'In Development', to: 'Code Review' } },
    { id: 'aud-2', at: isoMinutesAgo(now, 55), actorId: 'u-sai', kind: 'checklist', entityId: 'wi-eng-124', summary: 'completed “Error handling” on ENG-124', departmentId: 'dept-engineering' },
    { id: 'aud-3', at: isoMinutesAgo(now, 95), actorId: 'u-rahul', kind: 'work-item', entityId: 'wi-eng-122', summary: 'updated the description of ENG-122', departmentId: 'dept-engineering' },
    { id: 'aud-4', at: isoMinutesAgo(now, 130), actorId: 'u-sai', kind: 'work-item', entityId: 'wi-eng-118', summary: 'set ENG-118 due date to today', departmentId: 'dept-engineering', detail: { field: 'dueDate', from: null, to: 'today' } },
    { id: 'aud-5', at: isoMinutesAgo(now, 190), actorId: 'u-karthik', kind: 'comment', entityId: 'wi-eng-120', summary: 'commented on ENG-120', departmentId: 'dept-engineering' },
    { id: 'aud-6', at: isoMinutesAgo(now, 210), actorId: 'u-vikram', kind: 'work-item', entityId: 'wi-eng-123', summary: 'moved ENG-123 to In Development', departmentId: 'dept-engineering', detail: { field: 'status', from: 'Ready', to: 'In Development' } },
    { id: 'aud-7', at: isoMinutesAgo(now, 300), actorId: 'u-priya', kind: 'blocker', entityId: 'wi-eng-127', summary: 'added a blocker to ENG-127', departmentId: 'dept-engineering' },
    { id: 'aud-8', at: isoMinutesAgo(now, 420), actorId: 'u-meera', kind: 'comment', entityId: 'wi-eng-131', summary: 'commented on ENG-131', departmentId: 'dept-engineering' },
    { id: 'aud-9', at: isoMinutesAgo(now, 1440), actorId: 'u-sai', kind: 'huddle', entityId: 'hud-past-1', summary: 'completed the Engineering huddle', departmentId: 'dept-engineering' },
    { id: 'aud-10', at: isoMinutesAgo(now, 1450), actorId: 'u-sai', kind: 'huddle', entityId: 'hud-past-1', summary: 'started the Engineering huddle', departmentId: 'dept-engineering' },
    { id: 'aud-11', at: isoMinutesAgo(now, 2880), actorId: 'u-aditya', kind: 'member', entityId: 'u-nisha', summary: 'added Nisha Pillai to Engineering', departmentId: 'dept-engineering' },
    { id: 'aud-12', at: isoMinutesAgo(now, 4320), actorId: 'u-aditya', kind: 'workflow', entityId: 'wf-engineering', summary: 'added the QA status to Engineering Workflow', departmentId: null },
    { id: 'aud-13', at: isoMinutesAgo(now, 5760), actorId: 'u-rohan', kind: 'department', entityId: 'dept-marketing', summary: 'changed the Marketing huddle to weekly', departmentId: 'dept-marketing' },
    { id: 'aud-14', at: isoMinutesAgo(now, 7200), actorId: 'u-sai', kind: 'view', entityId: 'view-blocked-engineering', summary: 'created the saved view “Blocked engineering work”', departmentId: 'dept-engineering' },
  ]

  return { huddles, discussions, actions, auditEvents }
}
