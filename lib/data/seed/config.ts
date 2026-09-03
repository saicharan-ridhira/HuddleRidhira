import type {
  CustomField,
  Department,
  Label,
  Organization,
  Role,
  Status,
  User,
  WorkItemType,
  Workflow,
} from '@/lib/types'

/* ------------------------------------------------------------------ *
 * Organizations
 * ------------------------------------------------------------------ */

const DEFAULT_HUDDLE: Organization['huddle'] = {
  cadence: 'weekdays',
  time: '09:30',
  backlogLimit: 3,
}

export const organizations: Organization[] = [
  { id: 'org-acme', name: 'Acme Corp', slug: 'acme', initials: 'AC', hue: 'indigo', createdAt: '2024-01-15T09:00:00.000Z', huddle: { ...DEFAULT_HUDDLE } },
  { id: 'org-labs', name: 'Acme Labs', slug: 'acme-labs', initials: 'AL', hue: 'teal', createdAt: '2024-06-02T09:00:00.000Z', huddle: { ...DEFAULT_HUDDLE, cadence: 'weekly', time: '11:00' } },
  { id: 'org-ventures', name: 'Acme Ventures', slug: 'acme-ventures', initials: 'AV', hue: 'amber', createdAt: '2025-02-11T09:00:00.000Z', huddle: { ...DEFAULT_HUDDLE, cadence: 'none' } },
]

/* ------------------------------------------------------------------ *
 * Roles — PRD §40
 * ------------------------------------------------------------------ */

export const roles: Role[] = [
  {
    id: 'role-owner',
    name: 'Owner',
    description: 'Full control, including billing and deleting the organization.',
    permissions: [
      'work.view', 'work.create', 'work.edit', 'work.delete', 'huddle.run',
      'members.manage', 'departments.manage', 'workflows.manage', 'settings.manage', 'audit.view',
    ],
    system: true,
    rank: 0,
  },
  {
    id: 'role-admin',
    name: 'Admin',
    description: 'Configures workflows, departments and members.',
    permissions: [
      'work.view', 'work.create', 'work.edit', 'work.delete', 'huddle.run',
      'members.manage', 'departments.manage', 'workflows.manage', 'settings.manage', 'audit.view',
    ],
    system: true,
    rank: 1,
  },
  {
    id: 'role-manager',
    name: 'Manager',
    description: 'Runs huddles and manages work within their departments.',
    permissions: ['work.view', 'work.create', 'work.edit', 'work.delete', 'huddle.run', 'members.manage', 'audit.view'],
    system: true,
    rank: 2,
  },
  {
    id: 'role-member',
    name: 'Member',
    description: 'Creates and updates work. The default for new people.',
    permissions: ['work.view', 'work.create', 'work.edit'],
    system: true,
    rank: 3,
  },
]

/* ------------------------------------------------------------------ *
 * Workflows and statuses — PRD §39
 *
 * Four genuinely different pipelines, so the configurability claim is
 * visible at a glance rather than asserted in a settings screen.
 * ------------------------------------------------------------------ */

export const statuses: Status[] = [
  // Engineering
  { id: 'st-eng-backlog', name: 'Backlog', category: 'backlog', order: 0 },
  { id: 'st-eng-ready', name: 'Ready', category: 'unstarted', order: 1 },
  { id: 'st-eng-dev', name: 'In Development', category: 'started', order: 2 },
  { id: 'st-eng-review', name: 'Code Review', category: 'review', order: 3 },
  { id: 'st-eng-qa', name: 'QA', category: 'review', order: 4 },
  { id: 'st-eng-done', name: 'Done', category: 'completed', order: 5 },
  { id: 'st-eng-cancelled', name: 'Cancelled', category: 'cancelled', order: 6 },

  // Product
  { id: 'st-prd-discovery', name: 'Discovery', category: 'backlog', order: 0 },
  { id: 'st-prd-defined', name: 'Defined', category: 'unstarted', order: 1 },
  { id: 'st-prd-design', name: 'In Design', category: 'started', order: 2 },
  { id: 'st-prd-build', name: 'In Build', category: 'started', order: 3 },
  { id: 'st-prd-validation', name: 'Validation', category: 'review', order: 4 },
  { id: 'st-prd-shipped', name: 'Shipped', category: 'completed', order: 5 },
  { id: 'st-prd-cancelled', name: 'Cancelled', category: 'cancelled', order: 6 },

  // Marketing
  { id: 'st-mkt-ideas', name: 'Ideas', category: 'backlog', order: 0 },
  { id: 'st-mkt-planning', name: 'Planning', category: 'unstarted', order: 1 },
  { id: 'st-mkt-content', name: 'Content', category: 'started', order: 2 },
  { id: 'st-mkt-review', name: 'Review', category: 'review', order: 3 },
  { id: 'st-mkt-scheduled', name: 'Scheduled', category: 'review', order: 4 },
  { id: 'st-mkt-published', name: 'Published', category: 'completed', order: 5 },
  { id: 'st-mkt-dropped', name: 'Dropped', category: 'cancelled', order: 6 },

  // Sales
  { id: 'st-sls-lead', name: 'Lead', category: 'backlog', order: 0 },
  { id: 'st-sls-qualified', name: 'Qualified', category: 'unstarted', order: 1 },
  { id: 'st-sls-proposal', name: 'Proposal', category: 'started', order: 2 },
  { id: 'st-sls-negotiation', name: 'Negotiation', category: 'review', order: 3 },
  { id: 'st-sls-won', name: 'Closed Won', category: 'completed', order: 4 },
  { id: 'st-sls-lost', name: 'Closed Lost', category: 'cancelled', order: 5 },
]

export const workflows: Workflow[] = [
  {
    id: 'wf-engineering',
    name: 'Engineering Workflow',
    description: 'Build pipeline with an explicit review and QA gate.',
    statusIds: ['st-eng-backlog', 'st-eng-ready', 'st-eng-dev', 'st-eng-review', 'st-eng-qa', 'st-eng-done', 'st-eng-cancelled'],
  },
  {
    id: 'wf-product',
    name: 'Product Workflow',
    description: 'Discovery through validation for product definition work.',
    statusIds: ['st-prd-discovery', 'st-prd-defined', 'st-prd-design', 'st-prd-build', 'st-prd-validation', 'st-prd-shipped', 'st-prd-cancelled'],
  },
  {
    id: 'wf-marketing',
    name: 'Marketing Workflow',
    description: 'Campaign and content pipeline ending in publication.',
    statusIds: ['st-mkt-ideas', 'st-mkt-planning', 'st-mkt-content', 'st-mkt-review', 'st-mkt-scheduled', 'st-mkt-published', 'st-mkt-dropped'],
  },
  {
    id: 'wf-sales',
    name: 'Sales Pipeline',
    description: 'Opportunity stages from lead through close.',
    statusIds: ['st-sls-lead', 'st-sls-qualified', 'st-sls-proposal', 'st-sls-negotiation', 'st-sls-won', 'st-sls-lost'],
  },
]

/* ------------------------------------------------------------------ *
 * People
 * ------------------------------------------------------------------ */

interface SeedUser {
  id: string
  name: string
  email: string
  title: string
  roleId: string
  hue: User['hue']
  departmentIds: string[]
}

const seedUsers: SeedUser[] = [
  // Engineering — ten people, matching the huddle counts used throughout the PRD.
  { id: 'u-sai', name: 'Sai Charan', email: 'sai@acme.com', title: 'Engineering Lead', roleId: 'role-admin', hue: 'indigo', departmentIds: ['dept-engineering', 'dept-product'] },
  { id: 'u-rahul', name: 'Rahul Menon', email: 'rahul@acme.com', title: 'Senior Engineer', roleId: 'role-member', hue: 'blue', departmentIds: ['dept-engineering'] },
  { id: 'u-priya', name: 'Priya Nair', email: 'priya@acme.com', title: 'Product Designer', roleId: 'role-member', hue: 'purple', departmentIds: ['dept-engineering', 'dept-product'] },
  { id: 'u-ananya', name: 'Ananya Rao', email: 'ananya@acme.com', title: 'Engineer', roleId: 'role-member', hue: 'teal', departmentIds: ['dept-engineering'] },
  { id: 'u-karthik', name: 'Karthik Iyer', email: 'karthik@acme.com', title: 'Engineer', roleId: 'role-member', hue: 'amber', departmentIds: ['dept-engineering'] },
  { id: 'u-divya', name: 'Divya Shetty', email: 'divya@acme.com', title: 'QA Engineer', roleId: 'role-member', hue: 'green', departmentIds: ['dept-engineering'] },
  { id: 'u-arjun', name: 'Arjun Reddy', email: 'arjun@acme.com', title: 'Backend Engineer', roleId: 'role-member', hue: 'orange', departmentIds: ['dept-engineering'] },
  { id: 'u-meera', name: 'Meera Krishnan', email: 'meera@acme.com', title: 'Frontend Engineer', roleId: 'role-member', hue: 'pink', departmentIds: ['dept-engineering'] },
  { id: 'u-vikram', name: 'Vikram Desai', email: 'vikram@acme.com', title: 'Platform Engineer', roleId: 'role-member', hue: 'red', departmentIds: ['dept-engineering'] },
  { id: 'u-nisha', name: 'Nisha Pillai', email: 'nisha@acme.com', title: 'Engineer', roleId: 'role-member', hue: 'gray', departmentIds: ['dept-engineering'] },

  // Product
  { id: 'u-aditya', name: 'Aditya Bose', email: 'aditya@acme.com', title: 'Head of Product', roleId: 'role-owner', hue: 'indigo', departmentIds: ['dept-product'] },
  { id: 'u-sneha', name: 'Sneha Kulkarni', email: 'sneha@acme.com', title: 'Product Manager', roleId: 'role-manager', hue: 'teal', departmentIds: ['dept-product'] },
  { id: 'u-vivek', name: 'Vivek Sharma', email: 'vivek@acme.com', title: 'Product Analyst', roleId: 'role-member', hue: 'blue', departmentIds: ['dept-product'] },
  { id: 'u-tanya', name: 'Tanya Grover', email: 'tanya@acme.com', title: 'UX Researcher', roleId: 'role-member', hue: 'pink', departmentIds: ['dept-product'] },

  // Marketing
  { id: 'u-rohan', name: 'Rohan Kapoor', email: 'rohan@acme.com', title: 'Marketing Lead', roleId: 'role-manager', hue: 'orange', departmentIds: ['dept-marketing'] },
  { id: 'u-kavya', name: 'Kavya Menon', email: 'kavya@acme.com', title: 'Content Strategist', roleId: 'role-member', hue: 'purple', departmentIds: ['dept-marketing'] },
  { id: 'u-ishaan', name: 'Ishaan Verma', email: 'ishaan@acme.com', title: 'Growth Marketer', roleId: 'role-member', hue: 'green', departmentIds: ['dept-marketing'] },
  { id: 'u-tara', name: 'Tara Fernandes', email: 'tara@acme.com', title: 'Brand Designer', roleId: 'role-member', hue: 'amber', departmentIds: ['dept-marketing'] },
  { id: 'u-deepak', name: 'Deepak Joshi', email: 'deepak@acme.com', title: 'Marketing Ops', roleId: 'role-member', hue: 'gray', departmentIds: ['dept-marketing'] },
  { id: 'u-anjali', name: 'Anjali Sen', email: 'anjali@acme.com', title: 'Social Lead', roleId: 'role-member', hue: 'red', departmentIds: ['dept-marketing'] },

  // Sales
  { id: 'u-manish', name: 'Manish Agarwal', email: 'manish@acme.com', title: 'Sales Director', roleId: 'role-manager', hue: 'blue', departmentIds: ['dept-sales'] },
  { id: 'u-ritu', name: 'Ritu Chawla', email: 'ritu@acme.com', title: 'Account Executive', roleId: 'role-member', hue: 'teal', departmentIds: ['dept-sales'] },
  { id: 'u-gaurav', name: 'Gaurav Malhotra', email: 'gaurav@acme.com', title: 'Account Executive', roleId: 'role-member', hue: 'indigo', departmentIds: ['dept-sales'] },
  { id: 'u-neha', name: 'Neha Bhatt', email: 'neha@acme.com', title: 'Solutions Engineer', roleId: 'role-member', hue: 'purple', departmentIds: ['dept-sales'] },
  { id: 'u-suresh', name: 'Suresh Nambiar', email: 'suresh@acme.com', title: 'Sales Ops', roleId: 'role-member', hue: 'green', departmentIds: ['dept-sales'] },
]

function initialsOf(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

export const users: User[] = seedUsers.map((user) => ({ ...user, initials: initialsOf(user.name) }))

/** The account the prototype signs in as. */
export const CURRENT_USER_ID = 'u-sai'
export const CURRENT_ORG_ID = 'org-acme'

/* ------------------------------------------------------------------ *
 * Departments — PRD §38
 * ------------------------------------------------------------------ */

const engineeringMembers = [
  'u-sai', 'u-rahul', 'u-priya', 'u-ananya', 'u-karthik',
  'u-divya', 'u-arjun', 'u-meera', 'u-vikram', 'u-nisha',
]

export const departments: Department[] = [
  {
    id: 'dept-engineering',
    name: 'Engineering',
    slug: 'engineering',
    description: 'Platform, APIs and the payments programme.',
    icon: 'Code2',
    hue: 'indigo',
    workflowId: 'wf-engineering',
    defaultView: 'board',
    memberIds: engineeringMembers,
    leadId: 'u-sai',
  },
  {
    id: 'dept-product',
    name: 'Product',
    slug: 'product',
    description: 'Discovery, definition and validation.',
    icon: 'Compass',
    hue: 'teal',
    workflowId: 'wf-product',
    defaultView: 'board',
    memberIds: ['u-aditya', 'u-sneha', 'u-vivek', 'u-tanya', 'u-priya', 'u-sai'],
    leadId: 'u-aditya',
  },
  {
    id: 'dept-marketing',
    name: 'Marketing',
    slug: 'marketing',
    description: 'Campaigns, content and brand.',
    icon: 'Megaphone',
    hue: 'orange',
    workflowId: 'wf-marketing',
    defaultView: 'board',
    memberIds: ['u-rohan', 'u-kavya', 'u-ishaan', 'u-tara', 'u-deepak', 'u-anjali'],
    leadId: 'u-rohan',
  },
  {
    id: 'dept-sales',
    name: 'Sales',
    slug: 'sales',
    description: 'Pipeline from lead through close.',
    icon: 'TrendingUp',
    hue: 'green',
    workflowId: 'wf-sales',
    defaultView: 'list',
    memberIds: ['u-manish', 'u-ritu', 'u-gaurav', 'u-neha', 'u-suresh'],
    leadId: 'u-manish',
  },
]

/** Human-readable key prefix per department, e.g. ENG-124. */
export const DEPARTMENT_KEY_PREFIX: Record<string, string> = {
  'dept-engineering': 'ENG',
  'dept-product': 'PRD',
  'dept-marketing': 'MKT',
  'dept-sales': 'SLS',
}

/* ------------------------------------------------------------------ *
 * Taxonomy — PRD §21, §10, §22
 * ------------------------------------------------------------------ */

export const labels: Label[] = [
  { id: 'lbl-backend', name: 'Backend', hue: 'blue' },
  { id: 'lbl-frontend', name: 'Frontend', hue: 'purple' },
  { id: 'lbl-infrastructure', name: 'Infrastructure', hue: 'teal' },
  { id: 'lbl-bug', name: 'Bug', hue: 'red' },
  { id: 'lbl-feature', name: 'Feature', hue: 'green' },
  { id: 'lbl-urgent', name: 'Urgent', hue: 'orange' },
  { id: 'lbl-customer', name: 'Customer', hue: 'amber' },
  { id: 'lbl-security', name: 'Security', hue: 'red' },
  { id: 'lbl-payments', name: 'Payments', hue: 'indigo' },
  { id: 'lbl-docs', name: 'Documentation', hue: 'gray' },
  { id: 'lbl-research', name: 'Research', hue: 'pink' },
  { id: 'lbl-campaign', name: 'Campaign', hue: 'orange' },
  { id: 'lbl-enterprise', name: 'Enterprise', hue: 'indigo' },
]

export const workItemTypes: WorkItemType[] = [
  { id: 'wt-task', name: 'Task', icon: 'CircleDashed', hue: 'gray', keyPrefix: 'T' },
  { id: 'wt-bug', name: 'Bug', icon: 'Bug', hue: 'red', keyPrefix: 'B' },
  { id: 'wt-feature', name: 'Feature', icon: 'Sparkles', hue: 'green', keyPrefix: 'F' },
  { id: 'wt-story', name: 'Story', icon: 'BookOpen', hue: 'blue', keyPrefix: 'S' },
  { id: 'wt-request', name: 'Request', icon: 'Inbox', hue: 'amber', keyPrefix: 'R' },
  { id: 'wt-incident', name: 'Incident', icon: 'Siren', hue: 'orange', keyPrefix: 'I' },
  { id: 'wt-campaign', name: 'Campaign', icon: 'Megaphone', hue: 'purple', keyPrefix: 'C' },
  { id: 'wt-opportunity', name: 'Opportunity', icon: 'Handshake', hue: 'teal', keyPrefix: 'O' },
]

export const customFields: CustomField[] = [
  {
    id: 'cf-environment',
    name: 'Environment',
    kind: 'dropdown',
    departmentIds: ['dept-engineering'],
    options: ['Production', 'Staging', 'Development'],
    description: 'Where the work lands.',
  },
  { id: 'cf-story-points', name: 'Story Points', kind: 'number', departmentIds: ['dept-engineering', 'dept-product'], options: [] },
  { id: 'cf-release', name: 'Release', kind: 'dropdown', departmentIds: ['dept-engineering'], options: ['v2.3', 'v2.4', 'v2.5', 'Unscheduled'] },
  { id: 'cf-customer', name: 'Customer', kind: 'text', departmentIds: [], options: [] },
  {
    id: 'cf-security-review',
    name: 'Security Review',
    kind: 'dropdown',
    departmentIds: ['dept-engineering'],
    options: ['Not required', 'Required', 'Complete'],
  },
  { id: 'cf-channel', name: 'Channel', kind: 'multi-select', departmentIds: ['dept-marketing'], options: ['Email', 'Social', 'Paid', 'Blog', 'Events'] },
  { id: 'cf-deal-size', name: 'Deal Size', kind: 'number', departmentIds: ['dept-sales'], options: [] },
  { id: 'cf-spec-url', name: 'Spec', kind: 'url', departmentIds: ['dept-product', 'dept-engineering'], options: [] },
]
