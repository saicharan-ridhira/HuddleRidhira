import type {
  Blocker,
  Checklist,
  ChecklistItem,
  Comment,
  CustomFieldValue,
  Dependency,
  DependencyRelation,
  Priority,
  WorkItem,
} from '@/lib/types'
import { quarterOf } from '@/lib/engine/periods'
import { DEPARTMENT_KEY_PREFIX, statuses as allStatuses } from './config'
import { isoDaysFromNow, isoMinutesAgo, makeRandom, pick } from './helpers'

/**
 * Compact spec for a seeded work item. Engineering work is written out
 * by hand because the huddle demo depends on its exact shape; the other
 * departments are generated from curated title lists so the boards look
 * lived-in without 200 lines of fixture each.
 */
interface ItemSpec {
  n: number
  title: string
  dept: string
  type: string
  status: string
  assignee: string | null
  priority: Priority
  /** Days from today; negative is in the past. */
  due?: number
  start?: number
  labels?: string[]
  desc?: string
  /** [checklist title, completed items, outstanding items] */
  checklist?: [string, string[], string[]]
  cf?: Record<string, CustomFieldValue>
  /** Marks the item a Rock for the current quarter. */
  rock?: boolean
  createdDaysAgo?: number
  updatedMinutesAgo?: number
  completedDaysAgo?: number
}

/* ------------------------------------------------------------------ *
 * Engineering
 *
 * Sai owns 23 items, of which exactly three warrant discussion — that
 * contrast is the whole point of PRD §31 ("3 things to discuss", not
 * "23 tasks"), so it is seeded deliberately rather than by accident.
 * ------------------------------------------------------------------ */

const ENGINEERING: ItemSpec[] = [
  // --- The payments dependency chain (PRD §23–§25) -----------------
  {
    n: 120,
    title: 'Finance credentials for payment gateway',
    dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-dev', assignee: 'u-karthik',
    priority: 'high', due: -1, labels: ['lbl-payments', 'lbl-backend'],
    desc: 'Production API credentials from the payment provider, countersigned by Finance. Everything downstream in the payments programme waits on this.',
    cf: { 'cf-environment': 'Production', 'cf-release': 'v2.4', 'cf-security-review': 'Required', 'cf-story-points': 2 },
    createdDaysAgo: 12, updatedMinutesAgo: 190,
  },
  {
    n: 124,
    rock: true,
    title: 'Payment API',
    dept: 'dept-engineering', type: 'wt-feature', status: 'st-eng-dev', assignee: 'u-sai',
    priority: 'high', due: 2, start: -6, labels: ['lbl-payments', 'lbl-backend', 'lbl-feature'],
    desc: 'Charge, refund and reconciliation endpoints for the new payment provider. Cannot be finished until the production credentials land.',
    checklist: ['Implementation', ['Endpoint', 'Validation', 'Error handling'], ['Retry handling', 'Tests']],
    cf: { 'cf-environment': 'Production', 'cf-release': 'v2.4', 'cf-security-review': 'Required', 'cf-story-points': 8, 'cf-customer': 'Northwind' },
    createdDaysAgo: 14, updatedMinutesAgo: 55,
  },
  {
    n: 131,
    title: 'Payment UI',
    dept: 'dept-engineering', type: 'wt-feature', status: 'st-eng-ready', assignee: 'u-meera',
    priority: 'high', due: 6, labels: ['lbl-payments', 'lbl-frontend'],
    desc: 'Checkout and payment method management screens. Waits on the Payment API contract being final.',
    checklist: ['Screens', ['Wireframes signed off'], ['Checkout form', 'Saved cards', 'Error states']],
    cf: { 'cf-release': 'v2.4', 'cf-story-points': 5 },
    createdDaysAgo: 10, updatedMinutesAgo: 420,
  },
  {
    n: 140,
    title: 'Payment QA sign-off',
    dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-divya',
    priority: 'medium', due: 9, labels: ['lbl-payments'],
    desc: 'End-to-end regression across checkout, refunds and reconciliation before the v2.4 release.',
    cf: { 'cf-release': 'v2.4', 'cf-story-points': 3 },
    createdDaysAgo: 9, updatedMinutesAgo: 1500,
  },

  // --- Sai's remaining work ----------------------------------------
  {
    n: 118, title: 'Dashboard API', dept: 'dept-engineering', type: 'wt-feature', status: 'st-eng-dev',
    assignee: 'u-sai', priority: 'high', due: 0, labels: ['lbl-backend', 'lbl-feature'],
    desc: 'Aggregation endpoints powering the customer dashboard. Due today.',
    checklist: ['Endpoints', ['Summary counts', 'Time series'], ['Caching layer']],
    cf: { 'cf-release': 'v2.4', 'cf-story-points': 5 }, createdDaysAgo: 11, updatedMinutesAgo: 130,
  },
  {
    n: 109, title: 'API documentation', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog',
    assignee: 'u-sai', priority: 'medium', due: -4, labels: ['lbl-docs'],
    desc: 'Public reference for the v2 API. Overdue since last week.',
    cf: { 'cf-release': 'v2.3', 'cf-story-points': 3 }, createdDaysAgo: 21, updatedMinutesAgo: 4300,
  },
  { n: 133, title: 'Webhook delivery tests', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-ready', assignee: 'u-sai', priority: 'medium', due: 5, labels: ['lbl-backend'], desc: 'Cover retry, ordering and signature verification for outbound webhooks.', cf: { 'cf-story-points': 3 }, createdDaysAgo: 8, updatedMinutesAgo: 900 },
  { n: 112, title: 'Error taxonomy for public API', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-review', assignee: 'u-sai', priority: 'medium', due: 3, labels: ['lbl-backend', 'lbl-docs'], desc: 'One consistent error envelope and code list across every endpoint.', cf: { 'cf-story-points': 2 }, createdDaysAgo: 16, updatedMinutesAgo: 260 },
  { n: 151, title: 'Cache invalidation on tenant switch', dept: 'dept-engineering', type: 'wt-bug', status: 'st-eng-review', assignee: 'u-sai', priority: 'high', due: 4, labels: ['lbl-bug', 'lbl-backend'], desc: 'Switching organizations serves the previous tenant’s cached aggregates for up to a minute.', cf: { 'cf-environment': 'Production', 'cf-story-points': 3 }, createdDaysAgo: 5, updatedMinutesAgo: 340 },
  { n: 157, title: 'Postmortem: September gateway outage', dept: 'dept-engineering', type: 'wt-incident', status: 'st-eng-qa', assignee: 'u-sai', priority: 'medium', due: 7, labels: ['lbl-infrastructure'], desc: 'Write-up and follow-up actions from the 43-minute gateway outage.', createdDaysAgo: 4, updatedMinutesAgo: 700 },
  { n: 101, title: 'Rate limiting middleware', dept: 'dept-engineering', type: 'wt-feature', status: 'st-eng-done', assignee: 'u-sai', priority: 'medium', labels: ['lbl-backend'], desc: 'Token-bucket limiter with per-plan quotas.', completedDaysAgo: 3, createdDaysAgo: 25, updatedMinutesAgo: 4400, cf: { 'cf-release': 'v2.3', 'cf-story-points': 5 } },
  { n: 104, title: 'Auth token refresh flow', dept: 'dept-engineering', type: 'wt-feature', status: 'st-eng-done', assignee: 'u-sai', priority: 'high', labels: ['lbl-backend', 'lbl-security'], desc: 'Rotating refresh tokens with revocation.', completedDaysAgo: 6, createdDaysAgo: 30, updatedMinutesAgo: 8700, cf: { 'cf-release': 'v2.3', 'cf-security-review': 'Complete', 'cf-story-points': 8 } },
  { n: 115, title: 'Idempotency keys for writes', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-sai', priority: 'low', labels: ['lbl-backend'], desc: 'Accept and honour an Idempotency-Key header on all POST endpoints.', createdDaysAgo: 18, updatedMinutesAgo: 5000 },
  { n: 121, title: 'Audit log ingestion pipeline', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-sai', priority: 'low', labels: ['lbl-infrastructure'], desc: 'Batch writer so audit events never block a request.', createdDaysAgo: 17, updatedMinutesAgo: 6100 },
  { n: 126, title: 'Batch export endpoint', dept: 'dept-engineering', type: 'wt-request', status: 'st-eng-backlog', assignee: 'u-sai', priority: 'none', labels: ['lbl-backend', 'lbl-customer'], desc: 'Requested by two enterprise accounts: async CSV export of work items.', cf: { 'cf-customer': 'Contoso' }, createdDaysAgo: 15, updatedMinutesAgo: 7000 },
  { n: 129, title: 'Cursor-based pagination', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-sai', priority: 'medium', labels: ['lbl-backend'], desc: 'Replace offset pagination, which drifts under concurrent writes.', createdDaysAgo: 13, updatedMinutesAgo: 5400 },
  { n: 134, title: 'Health check probes', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-sai', priority: 'low', labels: ['lbl-infrastructure'], desc: 'Separate liveness and readiness endpoints.', createdDaysAgo: 12, updatedMinutesAgo: 6600 },
  { n: 136, title: 'GraphQL gateway spike', dept: 'dept-engineering', type: 'wt-story', status: 'st-eng-backlog', assignee: 'u-sai', priority: 'none', labels: ['lbl-research'], desc: 'Timeboxed investigation: is a gateway worth it for our read patterns?', createdDaysAgo: 11, updatedMinutesAgo: 7400 },
  { n: 138, title: 'Distributed request tracing', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-sai', priority: 'low', labels: ['lbl-infrastructure'], desc: 'Propagate trace ids across the service boundary.', createdDaysAgo: 10, updatedMinutesAgo: 6900 },
  { n: 141, title: 'Connection pool tuning', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-sai', priority: 'medium', labels: ['lbl-infrastructure'], desc: 'Pool exhaustion under burst traffic during the outage.', createdDaysAgo: 8, updatedMinutesAgo: 5200 },
  { n: 143, title: 'Secrets rotation runbook', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-sai', priority: 'medium', labels: ['lbl-security', 'lbl-docs'], desc: 'Documented, rehearsed rotation for every production secret.', cf: { 'cf-security-review': 'Required' }, createdDaysAgo: 7, updatedMinutesAgo: 5800 },
  { n: 145, title: 'Deprecate v1 endpoints', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-sai', priority: 'low', labels: ['lbl-backend'], desc: 'Sunset schedule and deprecation headers for the v1 surface.', createdDaysAgo: 20, updatedMinutesAgo: 9000 },
  { n: 147, title: 'SDK release notes automation', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-sai', priority: 'none', labels: ['lbl-docs'], desc: 'Generate notes from merged PR labels.', createdDaysAgo: 19, updatedMinutesAgo: 9600 },
  { n: 149, title: 'Load test harness', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-sai', priority: 'low', labels: ['lbl-infrastructure'], desc: 'Repeatable load profile we can run before each release.', createdDaysAgo: 9, updatedMinutesAgo: 6300 },
  { n: 153, title: 'Timezone handling in reports', dept: 'dept-engineering', type: 'wt-bug', status: 'st-eng-backlog', assignee: 'u-sai', priority: 'low', labels: ['lbl-bug'], desc: 'Daily rollups use server time rather than the organization’s timezone.', createdDaysAgo: 6, updatedMinutesAgo: 4800 },
  { n: 155, title: 'Engineering onboarding docs', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-sai', priority: 'none', labels: ['lbl-docs'], desc: 'Day-one setup that actually works on a fresh machine.', createdDaysAgo: 22, updatedMinutesAgo: 10200 },

  // --- Other Engineering members -----------------------------------
  {
    n: 127, title: 'Checkout redesign approval', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-ready',
    assignee: 'u-priya', priority: 'high', due: 1, labels: ['lbl-frontend', 'lbl-payments'],
    desc: 'Final visual sign-off on the checkout redesign before build starts.',
    createdDaysAgo: 7, updatedMinutesAgo: 300,
  },
  { n: 122, rock: true, title: 'TypeScript SDK v2', dept: 'dept-engineering', type: 'wt-feature', status: 'st-eng-dev', assignee: 'u-rahul', priority: 'high', due: 3, labels: ['lbl-backend', 'lbl-feature'], desc: 'Generated client with typed responses and retries.', checklist: ['SDK', ['Codegen', 'Retries'], ['Docs', 'Examples', 'Publish pipeline']], cf: { 'cf-release': 'v2.4', 'cf-story-points': 8 }, createdDaysAgo: 13, updatedMinutesAgo: 95 },
  { n: 128, title: 'SDK reference documentation', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-ready', assignee: 'u-rahul', priority: 'medium', due: 8, labels: ['lbl-docs'], desc: 'Reference pages generated from the SDK source.', createdDaysAgo: 9, updatedMinutesAgo: 1300 },
  { n: 135, title: 'Review: payments PR #482', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-review', assignee: 'u-rahul', priority: 'high', due: 0, labels: ['lbl-payments'], desc: 'Outstanding review blocking the payments branch merge.', createdDaysAgo: 2, updatedMinutesAgo: 45 },
  { n: 108, title: 'Session storage migration', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-done', assignee: 'u-rahul', priority: 'medium', labels: ['lbl-infrastructure'], desc: 'Move sessions off sticky instances.', completedDaysAgo: 4, createdDaysAgo: 24, updatedMinutesAgo: 5700 },
  { n: 116, rock: true, title: 'Design system tokens', dept: 'dept-engineering', type: 'wt-story', status: 'st-eng-dev', assignee: 'u-priya', priority: 'medium', due: 4, labels: ['lbl-frontend'], desc: 'Single token source shared by web and mobile.', checklist: ['Tokens', ['Colour', 'Spacing'], ['Typography', 'Motion']], createdDaysAgo: 15, updatedMinutesAgo: 480 },
  { n: 139, title: 'Empty states audit', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-priya', priority: 'low', labels: ['lbl-frontend'], desc: 'Every list view needs a real empty state.', createdDaysAgo: 6, updatedMinutesAgo: 3200 },
  { n: 119, title: 'Notification preferences', dept: 'dept-engineering', type: 'wt-feature', status: 'st-eng-dev', assignee: 'u-ananya', priority: 'medium', due: -2, labels: ['lbl-feature'], desc: 'Per-channel notification settings. Slipped past its due date.', createdDaysAgo: 14, updatedMinutesAgo: 1800 },
  { n: 130, title: 'Bulk edit on the board', dept: 'dept-engineering', type: 'wt-feature', status: 'st-eng-ready', assignee: 'u-ananya', priority: 'medium', due: 6, labels: ['lbl-frontend', 'lbl-feature'], desc: 'Multi-select and apply a change to every selected item.', createdDaysAgo: 8, updatedMinutesAgo: 2200 },
  { n: 144, title: 'Search relevance tuning', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-ananya', priority: 'low', labels: ['lbl-backend'], desc: 'Exact key matches should always outrank fuzzy title hits.', createdDaysAgo: 5, updatedMinutesAgo: 3900 },
  { n: 123, title: 'Kubernetes node upgrade', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-dev', assignee: 'u-vikram', priority: 'high', due: 1, labels: ['lbl-infrastructure'], desc: 'Rolling upgrade of the production node pool.', cf: { 'cf-environment': 'Production' }, createdDaysAgo: 10, updatedMinutesAgo: 210 },
  { n: 132, title: 'CI pipeline speed-up', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-ready', assignee: 'u-vikram', priority: 'medium', due: 10, labels: ['lbl-infrastructure'], desc: 'Twenty-two minutes is too long for a pull request.', createdDaysAgo: 7, updatedMinutesAgo: 2600 },
  { n: 137, title: 'Terraform state locking', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-vikram', priority: 'medium', labels: ['lbl-infrastructure'], desc: 'Two concurrent applies corrupted state last month.', createdDaysAgo: 11, updatedMinutesAgo: 4100 },
  { n: 125, title: 'Checkout flow regression suite', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-qa', assignee: 'u-divya', priority: 'high', due: 2, labels: ['lbl-payments'], desc: 'Automated coverage for the full checkout path.', createdDaysAgo: 9, updatedMinutesAgo: 620 },
  { n: 142, title: 'Flaky test quarantine', dept: 'dept-engineering', type: 'wt-bug', status: 'st-eng-dev', assignee: 'u-divya', priority: 'medium', due: -3, labels: ['lbl-bug'], desc: 'Six tests fail intermittently and are eroding trust in CI.', createdDaysAgo: 12, updatedMinutesAgo: 2900 },
  { n: 146, title: 'Accessibility audit', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-divya', priority: 'medium', labels: ['lbl-frontend'], desc: 'Keyboard and screen reader pass over the core flows.', createdDaysAgo: 8, updatedMinutesAgo: 4600 },
  { n: 117, title: 'Reconciliation ledger', dept: 'dept-engineering', type: 'wt-feature', status: 'st-eng-dev', assignee: 'u-arjun', priority: 'high', due: 5, labels: ['lbl-payments', 'lbl-backend'], desc: 'Immutable ledger of every payment state transition.', checklist: ['Ledger', ['Schema'], ['Writer', 'Reconciler', 'Reports']], cf: { 'cf-release': 'v2.4', 'cf-story-points': 13 }, createdDaysAgo: 16, updatedMinutesAgo: 380 },
  { n: 148, title: 'Database index review', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-ready', assignee: 'u-arjun', priority: 'medium', due: 12, labels: ['lbl-backend'], desc: 'Several sequential scans on the work item table.', createdDaysAgo: 6, updatedMinutesAgo: 3600 },
  { n: 152, title: 'Refund edge cases', dept: 'dept-engineering', type: 'wt-bug', status: 'st-eng-backlog', assignee: 'u-arjun', priority: 'high', due: 8, labels: ['lbl-payments', 'lbl-bug'], desc: 'Partial refunds against a settled batch are rejected.', createdDaysAgo: 4, updatedMinutesAgo: 1900 },
  { n: 113, title: 'Component library upgrade', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-done', assignee: 'u-meera', priority: 'low', labels: ['lbl-frontend'], desc: 'Bump to the current major and fix the breaking changes.', completedDaysAgo: 2, createdDaysAgo: 20, updatedMinutesAgo: 3000 },
  { n: 150, title: 'Mobile board layout', dept: 'dept-engineering', type: 'wt-feature', status: 'st-eng-ready', assignee: 'u-meera', priority: 'medium', due: 14, labels: ['lbl-frontend'], desc: 'The board is unusable below 480px.', createdDaysAgo: 5, updatedMinutesAgo: 4400 },
  { n: 154, title: 'Keyboard shortcuts', dept: 'dept-engineering', type: 'wt-feature', status: 'st-eng-backlog', assignee: 'u-meera', priority: 'low', labels: ['lbl-frontend'], desc: 'Navigate and edit the board without reaching for the mouse.', createdDaysAgo: 3, updatedMinutesAgo: 5100 },
  { n: 156, title: 'Email template rebuild', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-dev', assignee: 'u-nisha', priority: 'low', due: 11, labels: ['lbl-frontend'], desc: 'Transactional emails render badly in Outlook.', createdDaysAgo: 7, updatedMinutesAgo: 2400 },
  { n: 158, title: 'Feature flag cleanup', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-nisha', priority: 'low', labels: ['lbl-infrastructure'], desc: 'Nineteen flags are permanently on.', createdDaysAgo: 5, updatedMinutesAgo: 5500 },
  { n: 159, title: 'Slack integration', dept: 'dept-engineering', type: 'wt-feature', status: 'st-eng-backlog', assignee: 'u-nisha', priority: 'medium', due: 20, labels: ['lbl-feature'], desc: 'Post huddle summaries into a channel.', createdDaysAgo: 4, updatedMinutesAgo: 6800 },
  { n: 160, title: 'Provider sandbox flakiness', dept: 'dept-engineering', type: 'wt-incident', status: 'st-eng-dev', assignee: 'u-karthik', priority: 'medium', due: 2, labels: ['lbl-payments'], desc: 'The provider sandbox times out roughly one call in ten.', createdDaysAgo: 3, updatedMinutesAgo: 1100 },
  { n: 161, title: 'Retry budget policy', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: 'u-karthik', priority: 'low', labels: ['lbl-backend'], desc: 'Cap retries so a slow dependency cannot amplify load.', createdDaysAgo: 6, updatedMinutesAgo: 7200 },
  { n: 162, title: 'Weekly metrics digest', dept: 'dept-engineering', type: 'wt-task', status: 'st-eng-backlog', assignee: null, priority: 'none', labels: ['lbl-docs'], desc: 'Unowned. Someone should pick this up.', createdDaysAgo: 8, updatedMinutesAgo: 8400 },
]

/* ------------------------------------------------------------------ *
 * Anchors for the other departments
 *
 * The huddle is between heads of department, so every department needs
 * at least one blocker its head can actually speak to. Leaving that to
 * the random draw produced meetings where three of four heads had
 * nothing, which reads as a seeding accident rather than a product
 * statement. These are hand-written and cross-departmental on purpose —
 * the most interesting thing a leadership meeting surfaces is one
 * department waiting on another.
 * ------------------------------------------------------------------ */

const ANCHORS: ItemSpec[] = [
  {
    n: 30, title: 'Usage-based billing spec', dept: 'dept-product', type: 'wt-story', status: 'st-prd-build',
    assignee: 'u-sneha', priority: 'high', due: 4, labels: ['lbl-feature', 'lbl-enterprise'],
    desc: 'Metering model and invoice format for usage-based plans. Cannot be finalised until the payment provider contract is signed.',
    createdDaysAgo: 18, updatedMinutesAgo: 260,
  },
  {
    n: 31, title: 'Enterprise SSO rollout plan', dept: 'dept-product', type: 'wt-task', status: 'st-prd-defined',
    assignee: 'u-aditya', priority: 'high', due: 9, labels: ['lbl-enterprise', 'lbl-customer'],
    desc: 'Sequencing SSO across the three accounts that asked for it. Waiting on the security review to close.',
    createdDaysAgo: 14, updatedMinutesAgo: 700,
  },
  {
    n: 60, title: 'Launch week announcement', dept: 'dept-marketing', type: 'wt-campaign', status: 'st-mkt-content',
    assignee: 'u-kavya', priority: 'urgent', due: 3, labels: ['lbl-campaign', 'lbl-urgent'],
    desc: 'The whole launch-week sequence. Nothing ships until payments is demonstrably working.',
    createdDaysAgo: 12, updatedMinutesAgo: 140,
  },
  {
    n: 61, title: 'Pricing page rebuild', dept: 'dept-marketing', type: 'wt-task', status: 'st-mkt-planning',
    assignee: 'u-rohan', priority: 'high', due: 11, labels: ['lbl-campaign'],
    desc: 'New pricing tiers on the site. Blocked on the billing model being settled.',
    createdDaysAgo: 10, updatedMinutesAgo: 900,
  },
  {
    n: 190, title: 'Litware — security questionnaire', dept: 'dept-sales', type: 'wt-opportunity', status: 'st-sls-negotiation',
    assignee: 'u-neha', priority: 'urgent', due: 2, labels: ['lbl-enterprise', 'lbl-customer'],
    desc: 'Two hundred questions from Litware procurement. Several answers depend on the secrets rotation runbook existing.',
    cf: { 'cf-deal-size': 180000, 'cf-customer': 'Litware' },
    createdDaysAgo: 16, updatedMinutesAgo: 320,
  },
  {
    n: 191, title: 'Northwind — expansion contract', dept: 'dept-sales', type: 'wt-opportunity', status: 'st-sls-proposal',
    assignee: 'u-manish', priority: 'high', due: 6, labels: ['lbl-customer', 'lbl-enterprise'],
    desc: 'Doubling Northwind\u2019s seats, contingent on the payments work landing this quarter.',
    cf: { 'cf-deal-size': 240000, 'cf-customer': 'Northwind Traders' },
    createdDaysAgo: 20, updatedMinutesAgo: 480,
  },
]

/* ------------------------------------------------------------------ *
 * Other departments — generated from curated titles
 * ------------------------------------------------------------------ */

interface GenSpec {
  dept: string
  titles: string[]
  statusIds: string[]
  assignees: string[]
  types: string[]
  labels: string[]
  startNumber: number
  /**
   * Fraction of this department's items pinned to its first (backlog)
   * status. Left to a uniform draw across six statuses, a department
   * ends up with three or four backlog items — too thin for its head to
   * have anything to bring to the huddle.
   */
  backlogShare: number
}

const GENERATED: GenSpec[] = [
  {
    dept: 'dept-product',
    startNumber: 40,
    backlogShare: 0.38,
    titles: [
      'Onboarding funnel research', 'Pricing page experiment', 'Usage-based billing definition',
      'Customer interview round 3', 'Activation metric definition', 'Enterprise SSO requirements',
      'Mobile roadmap Q4', 'Churn driver analysis', 'In-product guidance spec',
      'Reporting module discovery', 'Data retention policy', 'Partner API scoping',
      'Trial length experiment', 'Competitive teardown', 'Accessibility commitments',
      'Self-serve upgrade flow', 'Usage analytics event taxonomy', 'Team invitation flow',
      'Workspace templates', 'Notification digest design', 'Admin audit surface',
      'Guest access model', 'Bulk import from CSV', 'Saved view sharing',
      'Onboarding checklist rework', 'Seat forecasting model', 'Deprecation comms plan',
      'Search results relevance study',
    ],
    statusIds: ['st-prd-discovery', 'st-prd-defined', 'st-prd-design', 'st-prd-build', 'st-prd-validation', 'st-prd-shipped'],
    assignees: ['u-aditya', 'u-sneha', 'u-vivek', 'u-tanya', 'u-priya'],
    types: ['wt-story', 'wt-feature', 'wt-task', 'wt-request'],
    labels: ['lbl-research', 'lbl-feature', 'lbl-customer', 'lbl-enterprise', 'lbl-docs'],
  },
  {
    dept: 'dept-marketing',
    startNumber: 70,
    backlogShare: 0.42,
    titles: [
      'Q4 product launch campaign', 'Customer story: Northwind', 'Webinar: payments deep dive',
      'Paid search refresh', 'Brand refresh phase 2', 'Developer newsletter revamp',
      'Conference booth design', 'SEO content cluster: workflows', 'Lifecycle email sequence',
      'Analyst briefing deck', 'Social calendar for launch week', 'Partner co-marketing brief',
      'Pricing page copy rewrite', 'Case study video', 'Community AMA series',
      'Retargeting audience rebuild', 'Docs site information architecture', 'Changelog relaunch',
      'Customer advisory board invites', 'Podcast sponsorship test', 'Comparison page: alternatives',
      'Onboarding email rewrite', 'Regional campaign: APAC', 'Referral programme design',
      'Testimonial collection drive', 'Event follow-up sequence', 'Brand photography refresh',
    ],
    statusIds: ['st-mkt-ideas', 'st-mkt-planning', 'st-mkt-content', 'st-mkt-review', 'st-mkt-scheduled', 'st-mkt-published'],
    assignees: ['u-rohan', 'u-kavya', 'u-ishaan', 'u-tara', 'u-deepak', 'u-anjali'],
    types: ['wt-campaign', 'wt-task', 'wt-request'],
    labels: ['lbl-campaign', 'lbl-customer', 'lbl-urgent', 'lbl-docs'],
  },
  {
    dept: 'dept-sales',
    startNumber: 200,
    backlogShare: 0.34,
    titles: [
      'Northwind Traders — platform expansion', 'Contoso — enterprise renewal', 'Fabrikam — pilot to production',
      'Tailspin Toys — new logo', 'Adventure Works — seat expansion', 'Litware — security review',
      'Proseware — procurement', 'Wingtip — migration scoping', 'Fourth Coffee — annual contract',
      'Graphic Design Institute — pilot', 'Woodgrove Bank — compliance pack', 'Lucerne Publishing — upsell',
      'Trey Research — technical evaluation', 'Alpine Ski House — renewal at risk',
      'Blue Yonder Airlines — RFP response', 'City Power — multi-year agreement',
      'Coho Vineyard — pilot expansion', 'Humongous Insurance — security questionnaire',
      'Margie\u2019s Travel — new logo', 'Nod Publishers — renewal', 'Southridge Video — upsell',
      'Tailwind Traders — platform migration', 'VanArsdel — procurement review',
      'Relecloud — technical evaluation', 'Fourth Coffee — regional rollout',
      'Contoso Pharmaceuticals — compliance pack',
    ],
    statusIds: ['st-sls-lead', 'st-sls-qualified', 'st-sls-proposal', 'st-sls-negotiation', 'st-sls-won', 'st-sls-lost'],
    assignees: ['u-manish', 'u-ritu', 'u-gaurav', 'u-neha', 'u-suresh'],
    types: ['wt-opportunity', 'wt-task'],
    labels: ['lbl-customer', 'lbl-enterprise', 'lbl-urgent'],
  },
]

const PRIORITY_POOL: Priority[] = ['none', 'low', 'medium', 'medium', 'high', 'high', 'urgent']

function generateSpecs(): ItemSpec[] {
  const random = makeRandom(20260903)
  const specs: ItemSpec[] = []

  for (const gen of GENERATED) {
    // Three quarterly Rocks per department, taken from the work that is
    // actually in flight — a Rock nobody has started is a wish.
    let rocksLeft = 3

    gen.titles.forEach((title, index) => {
      const backlogStatus = gen.statusIds[0]!
      const status = random() < gen.backlogShare ? backlogStatus : pick(random, gen.statusIds)
      const isFinal = status === gen.statusIds[gen.statusIds.length - 1]
      const dueOffset = Math.floor(random() * 34) - 8

      const rock = !isFinal && status !== backlogStatus && rocksLeft > 0
      if (rock) rocksLeft--

      specs.push({
        n: gen.startNumber + index,
        rock,
        title,
        dept: gen.dept,
        type: pick(random, gen.types),
        status,
        assignee: pick(random, gen.assignees),
        priority: pick(random, PRIORITY_POOL),
        due: isFinal ? undefined : dueOffset,
        labels: random() > 0.25 ? [pick(random, gen.labels)] : [],
        desc: `${title}. Tracked as part of the ${gen.dept.replace('dept-', '')} plan for this quarter.`,
        createdDaysAgo: 5 + Math.floor(random() * 30),
        updatedMinutesAgo: 30 + Math.floor(random() * 9000),
        completedDaysAgo: isFinal ? 1 + Math.floor(random() * 12) : undefined,
        cf:
          gen.dept === 'dept-sales'
            ? { 'cf-deal-size': (2 + Math.floor(random() * 40)) * 5000, 'cf-customer': title.split(' — ')[0] ?? '' }
            : gen.dept === 'dept-marketing'
              ? { 'cf-channel': [pick(random, ['Email', 'Social', 'Paid', 'Blog', 'Events'])] }
              : { 'cf-story-points': pick(random, [1, 2, 3, 5, 8]) },
      })
    })
  }

  return specs
}

/* ------------------------------------------------------------------ *
 * Materialisation
 * ------------------------------------------------------------------ */

export interface WorkSeed {
  workItems: WorkItem[]
  checklists: Checklist[]
  checklistItems: ChecklistItem[]
  dependencies: Dependency[]
  blockers: Blocker[]
  comments: Comment[]
}

/**
 * Work that has actually been picked up has a start date; work sitting
 * in a backlog does not. Deriving it from the status category rather
 * than hand-writing it on every spec keeps the timeline honest — a bar
 * only spans days when the work really is in flight.
 */
const CATEGORY_BY_STATUS = new Map(allStatuses.map((status) => [status.id, status.category]))

function impliedStartOffset(spec: ItemSpec, index: number): number | undefined {
  if (spec.start !== undefined) return spec.start

  const category = CATEGORY_BY_STATUS.get(spec.status)
  if (category !== 'started' && category !== 'review' && category !== 'completed') return undefined

  // Deterministic 3–9 day run-up, varied by position so bars do not all
  // begin on the same day and stack into one vertical stripe.
  const run = 3 + (index % 7)

  if (category === 'completed') {
    return spec.completedDaysAgo !== undefined ? -(spec.completedDaysAgo + run) : -run
  }
  return spec.due !== undefined ? spec.due - run : -run
}

export function buildWorkSeed(now: Date): WorkSeed {
  const specs = [...ENGINEERING, ...ANCHORS, ...generateSpecs()]

  const workItems: WorkItem[] = []
  const checklists: Checklist[] = []
  const checklistItems: ChecklistItem[] = []

  // Board position within a status column, assigned in declaration order.
  const orderByStatus = new Map<string, number>()

  specs.forEach((spec, specIndex) => {
    const id = `wi-${spec.dept.replace('dept-', '').slice(0, 3)}-${spec.n}`
    const prefix = DEPARTMENT_KEY_PREFIX[spec.dept] ?? 'WRK'
    const nextOrder = (orderByStatus.get(spec.status) ?? 0) + 1
    orderByStatus.set(spec.status, nextOrder)

    let checklistId: string | null = null
    if (spec.checklist) {
      const [title, done, todo] = spec.checklist
      checklistId = `cl-${id}`
      const entryIds: string[] = []

      done.forEach((text, index) => {
        const entryId = `cli-${id}-${index}`
        checklistItems.push({ id: entryId, text, done: true, order: index })
        entryIds.push(entryId)
      })
      todo.forEach((text, index) => {
        const entryId = `cli-${id}-${done.length + index}`
        checklistItems.push({ id: entryId, text, done: false, order: done.length + index })
        entryIds.push(entryId)
      })

      checklists.push({ id: checklistId, workItemId: id, title, itemIds: entryIds })
    }

    workItems.push({
      id,
      rockQuarter: spec.rock ? quarterOf(now) : null,
      key: `${prefix}-${spec.n}`,
      title: spec.title,
      description: spec.desc ?? '',
      typeId: spec.type,
      statusId: spec.status,
      priority: spec.priority,
      departmentId: spec.dept,
      assigneeId: spec.assignee,
      reporterId: spec.assignee === 'u-sai' ? 'u-aditya' : 'u-sai',
      labelIds: spec.labels ?? [],
      startDate: (() => {
        const offset = impliedStartOffset(spec, specIndex)
        return offset === undefined ? null : isoDaysFromNow(now, offset, 9)
      })(),
      dueDate: spec.due !== undefined ? isoDaysFromNow(now, spec.due, 17) : null,
      customFields: spec.cf ?? {},
      checklistId,
      order: nextOrder,
      createdAt: isoDaysFromNow(now, -(spec.createdDaysAgo ?? 10), 9),
      updatedAt: isoMinutesAgo(now, spec.updatedMinutesAgo ?? 600),
      completedAt: spec.completedDaysAgo !== undefined ? isoDaysFromNow(now, -spec.completedDaysAgo, 16) : null,
    })
  })

  /* --- The payments chain, PRD §23 ------------------------------- *
   * ENG-120 → ENG-124 → ENG-131 → ENG-140. Stored one way only; the
   * inverse is derived, so both sides stay consistent for free.       */
  const dep = (from: string, to: string, relation: DependencyRelation, daysAgo: number, by = 'u-sai'): Dependency => ({
    id: `dep-${from}-${to}`,
    fromId: from,
    toId: to,
    relation,
    createdAt: isoDaysFromNow(now, -daysAgo, 11),
    createdBy: by,
  })

  const dependencies: Dependency[] = [
    dep('wi-eng-124', 'wi-eng-120', 'blocked-by', 9),
    dep('wi-eng-131', 'wi-eng-124', 'blocked-by', 8, 'u-meera'),
    dep('wi-eng-140', 'wi-eng-131', 'blocked-by', 7, 'u-divya'),
    dep('wi-eng-117', 'wi-eng-120', 'depends-on', 9, 'u-arjun'),
    dep('wi-eng-125', 'wi-eng-131', 'blocked-by', 6, 'u-divya'),
    dep('wi-eng-124', 'wi-eng-117', 'related-to', 8),
    dep('wi-eng-152', 'wi-eng-117', 'depends-on', 4, 'u-arjun'),
    dep('wi-eng-122', 'wi-eng-112', 'related-to', 7, 'u-rahul'),
    dep('wi-eng-128', 'wi-eng-122', 'blocked-by', 6, 'u-rahul'),
    dep('wi-eng-131', 'wi-eng-127', 'blocked-by', 5, 'u-meera'),
    dep('wi-eng-116', 'wi-eng-127', 'related-to', 6, 'u-priya'),
    dep('wi-eng-157', 'wi-eng-141', 'parent-of', 3),
    dep('wi-eng-157', 'wi-eng-138', 'parent-of', 3),
    dep('wi-eng-153', 'wi-eng-118', 'related-to', 5),

    /* Cross-department. The most useful thing a leadership meeting
       surfaces is one department waiting on another, and these are what
       make the Product, Marketing and Sales heads have something to
       raise that Engineering can actually act on. */
    dep('wi-pro-30', 'wi-eng-120', 'blocked-by', 11, 'u-sneha'),
    dep('wi-pro-31', 'wi-eng-143', 'blocked-by', 9, 'u-aditya'),
    dep('wi-mar-60', 'wi-eng-124', 'blocked-by', 8, 'u-kavya'),
    dep('wi-mar-61', 'wi-pro-30', 'blocked-by', 7, 'u-rohan'),
    dep('wi-sal-190', 'wi-eng-143', 'blocked-by', 10, 'u-neha'),
    dep('wi-sal-191', 'wi-eng-124', 'depends-on', 12, 'u-manish'),
    dep('wi-pro-30', 'wi-eng-117', 'related-to', 9, 'u-sneha'),
  ]

  /* --- Manual blockers (§33 "Add blocker") ----------------------- */
  const blockers: Blocker[] = [
    {
      id: 'blk-127-design',
      workItemId: 'wi-eng-127',
      reason: 'Waiting on brand sign-off for the new checkout treatment',
      createdAt: isoDaysFromNow(now, -3, 14),
      createdBy: 'u-priya',
      resolvedAt: null,
      resolvedBy: null,
    },
    {
      id: 'blk-142-infra',
      workItemId: 'wi-eng-142',
      reason: 'Needs a dedicated CI runner before the tests can be isolated',
      createdAt: isoDaysFromNow(now, -2, 11),
      createdBy: 'u-divya',
      resolvedAt: null,
      resolvedBy: null,
    },
    {
      id: 'blk-mkt-60-legal',
      workItemId: 'wi-mar-60',
      reason: 'Legal has not signed off the launch claims',
      createdAt: isoDaysFromNow(now, -2, 15),
      createdBy: 'u-rohan',
      resolvedAt: null,
      resolvedBy: null,
    },
    {
      id: 'blk-sal-190-security',
      workItemId: 'wi-sal-190',
      reason: 'Needs a completed SOC 2 summary before procurement will proceed',
      createdAt: isoDaysFromNow(now, -4, 9),
      createdBy: 'u-neha',
      resolvedAt: null,
      resolvedBy: null,
    },
    {
      id: 'blk-pro-31-review',
      workItemId: 'wi-pro-31',
      reason: 'Waiting on the security review slot to open up',
      createdAt: isoDaysFromNow(now, -3, 12),
      createdBy: 'u-aditya',
      resolvedAt: null,
      resolvedBy: null,
    },
    {
      id: 'blk-108-resolved',
      workItemId: 'wi-eng-108',
      reason: 'Waiting for the load balancer change window',
      createdAt: isoDaysFromNow(now, -11, 10),
      createdBy: 'u-rahul',
      resolvedAt: isoDaysFromNow(now, -5, 15),
      resolvedBy: 'u-vikram',
      resolutionNote: 'Change window brought forward.',
    },
  ]

  const comments: Comment[] = [
    { id: 'cmt-1', workItemId: 'wi-eng-124', authorId: 'u-arjun', body: 'Charge and refund paths are done against the sandbox. Only the production credentials are outstanding.', createdAt: isoMinutesAgo(now, 900) },
    { id: 'cmt-2', workItemId: 'wi-eng-124', authorId: 'u-sai', body: 'Chased Finance again yesterday. Karthik is closest to it.', createdAt: isoMinutesAgo(now, 240) },
    { id: 'cmt-3', workItemId: 'wi-eng-120', authorId: 'u-karthik', body: 'Provider has the signed form. They quoted 24 hours for issuance.', createdAt: isoMinutesAgo(now, 190) },
    { id: 'cmt-4', workItemId: 'wi-eng-109', authorId: 'u-aditya', body: 'Two customers asked about this last week — worth pulling forward.', createdAt: isoMinutesAgo(now, 4300) },
    { id: 'cmt-5', workItemId: 'wi-eng-131', authorId: 'u-meera', body: 'Screens are ready to build the moment the API contract is frozen.', createdAt: isoMinutesAgo(now, 420) },
    { id: 'cmt-6', workItemId: 'wi-eng-118', authorId: 'u-sai', body: 'Caching layer is the only thing left. Should land today.', createdAt: isoMinutesAgo(now, 130) },
  ]

  return { workItems, checklists, checklistItems, dependencies, blockers, comments }
}
