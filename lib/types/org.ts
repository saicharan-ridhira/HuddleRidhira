import type { Hue, Id, ISODate, ViewLayout } from './primitives'

export interface Organization {
  id: Id
  name: string
  slug: string
  /** Two-letter monogram shown in the switcher. */
  initials: string
  hue: Hue
  createdAt: ISODate
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

export type HuddleCadence = 'daily' | 'weekdays' | 'weekly' | 'none'

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
  leadId: Id
  huddle: {
    cadence: HuddleCadence
    /** 24h "HH:mm" */
    time: string
    groupBy: 'assignee' | 'status' | 'priority'
    /** How many items surface per person before "show all" (§31). */
    discussionLimit: number
  }
}
