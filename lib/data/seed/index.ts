import type { Entities, EntityOrder } from '@/lib/engine/context'
import {
  customFields,
  departments,
  labels,
  organizations,
  roles,
  statuses,
  users,
  workItemTypes,
  workflows,
} from './config'
import { buildHistorySeed } from './history'
import { buildCriticalNumbers, buildMetricSeed, metrics } from './metrics'
import { idsOf, toRecord } from './helpers'
import { savedViews } from './views'
import { buildWorkSeed } from './work'

export { CURRENT_ORG_ID, CURRENT_USER_ID, DEPARTMENT_KEY_PREFIX } from './config'
export { defaultViewConfig } from './views'

export interface Seed {
  entities: Entities
  order: EntityOrder
}

/**
 * Builds the whole demo dataset relative to a given "now", so the board
 * always looks current — overdue items are genuinely overdue and "due
 * today" genuinely is today, whenever the prototype is opened.
 *
 * Deterministic given the same `now`: the generated departments use a
 * fixed PRNG seed, so "Reset demo data" restores exactly the same board.
 */
export function createSeed(now: Date = new Date()): Seed {
  const work = buildWorkSeed(now)
  const history = buildHistorySeed(now)
  const metricSeed = buildMetricSeed(now)

  // The Critical Number is quarter-relative, so it is stamped onto the
  // static department records here rather than hardcoded in ./config.
  const criticalNumbers = buildCriticalNumbers(now)
  const seededDepartments = departments.map((department) => ({
    ...department,
    criticalNumber: criticalNumbers[department.id] ?? null,
  }))

  const entities: Entities = {
    organizations: toRecord(organizations),
    users: toRecord(users),
    roles: toRecord(roles),
    departments: toRecord(seededDepartments),
    workflows: toRecord(workflows),
    statuses: toRecord(statuses),
    labels: toRecord(labels),
    workItemTypes: toRecord(workItemTypes),
    customFields: toRecord(customFields),
    metrics: toRecord(metrics),
    metricEntries: toRecord(metricSeed.entries),
    workItems: toRecord(work.workItems),
    checklists: toRecord(work.checklists),
    checklistItems: toRecord(work.checklistItems),
    dependencies: toRecord(work.dependencies),
    blockers: toRecord(work.blockers),
    comments: toRecord(work.comments),
    savedViews: toRecord(savedViews),
    huddles: toRecord(history.huddles),
    huddleDiscussions: toRecord(history.discussions),
    huddleActions: toRecord(history.actions),
    auditEvents: toRecord(history.auditEvents),
  }

  const order: EntityOrder = {
    organizationIds: idsOf(organizations),
    userIds: idsOf(users),
    roleIds: idsOf(roles),
    departmentIds: idsOf(departments),
    workflowIds: idsOf(workflows),
    labelIds: idsOf(labels),
    workItemTypeIds: idsOf(workItemTypes),
    customFieldIds: idsOf(customFields),
    metricIds: idsOf(metrics),
    metricEntryIds: idsOf(metricSeed.entries),
    workItemIds: idsOf(work.workItems),
    savedViewIds: idsOf(savedViews),
    auditEventIds: [...history.auditEvents]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .map((event) => event.id),
    huddleIds: [...history.huddles]
      .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())
      .map((huddle) => huddle.id),
  }

  return { entities, order }
}
