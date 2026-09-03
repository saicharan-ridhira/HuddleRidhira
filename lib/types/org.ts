import type { Hue, Id, ISODate, ViewLayout } from './primitives'

export type HuddleCadence = 'daily' | 'weekdays' | 'weekly' | 'none'

/**
 * There is exactly one huddle — the heads-of-department meeting — so its
 * configuration belongs to the organization rather than to any single
 * department.
 */
export interface HuddleConfig {
  cadence: HuddleCadence
  /** 24h "HH:mm" */
  time: string
  /**
   * How many backlog items surface per department before the rest is
   * hidden behind "show all". Blockers are never capped: there are few
   * of them and each one is a real problem. Backlog is capped because a
   * department can easily carry thirty items nobody has started, and
   * listing them all turns the meeting back into a database browse.
   */
  backlogLimit: number
}

export interface Organization {
  id: Id
  name: string
  slug: string
  /** Two-letter monogram shown in the switcher. */
  initials: string
  hue: Hue
  createdAt: ISODate
  huddle: HuddleConfig
}

export interface User {
  id: Id
  name: string
  email: string
  /** Monogram fallback — the prototype ships no avatar images. */
  initials: string
  hue: Hue
  title: string
  roleId: Id
  departmentIds: Id[]
}

/**
 * PRD §40. Permissions are configurable and persisted, and the matrix in
 * Settings is fully editable — but they are not enforced against the UI.
 * Gating a prototype's own features makes it harder to demo, and the
 * point here is to show the shape of the model.
 */
export const PERMISSIONS = [
  'work.view',
  'work.create',
  'work.edit',
  'work.delete',
  'huddle.run',
  'members.manage',
  'departments.manage',
  'workflows.manage',
  'settings.manage',
  'audit.view',
] as const
export type Permission = (typeof PERMISSIONS)[number]

export const PERMISSION_LABEL: Record<Permission, string> = {
  'work.view': 'View work',
  'work.create': 'Create work',
  'work.edit': 'Edit work',
  'work.delete': 'Delete work',
  'huddle.run': 'Run huddle',
  'members.manage': 'Manage members',
  'departments.manage': 'Manage departments',
  'workflows.manage': 'Manage workflows',
  'settings.manage': 'Manage settings',
  'audit.view': 'View audit logs',
}

export interface Role {
  id: Id
  name: string
  description: string
  permissions: Permission[]
  /** Built-in roles cannot be deleted. */
  system: boolean
  rank: number
}

/** PRD §38 — a department is a workspace with its own defaults. */
export interface Department {
  id: Id
  name: string
  slug: string
  description: string
  /** lucide icon name, resolved through lib/icons.ts */
  icon: string
  hue: Hue
  workflowId: Id
  defaultView: ViewLayout
  memberIds: Id[]
  /**
   * The head of department — who speaks for this department in the
   * huddle. A department without one cannot take part, so this is not
   * decorative.
   */
  leadId: Id
}
