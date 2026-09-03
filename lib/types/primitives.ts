/**
 * Shared scalar types and the fixed vocabularies the product refuses to
 * make configurable.
 *
 * PRD §49 draws the line: statuses, labels, work item types and custom
 * fields are org-configurable, but the *categories* they map onto are
 * not. That is what lets a board render 50 user-defined statuses in
 * consistent colours (§46) without asking the user to pick a colour for
 * each one.
 */

export type Id = string

export type ISODate = string

/**
 * Every configurable status resolves to exactly one of these. Colour,
 * icon and ordering are driven from the category, never from the
 * individual status.
 */
export const STATUS_CATEGORIES = [
  'backlog',
  'unstarted',
  'started',
  'review',
  'completed',
  'cancelled',
] as const
export type StatusCategory = (typeof STATUS_CATEGORIES)[number]

/** Categories in which work is considered finished — nothing downstream waits on it. */
export const TERMINAL_STATUS_CATEGORIES: readonly StatusCategory[] = ['completed', 'cancelled']

/** Categories in which work is considered actively in flight. */
export const ACTIVE_STATUS_CATEGORIES: readonly StatusCategory[] = ['unstarted', 'started', 'review']

export const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const
export type Priority = (typeof PRIORITIES)[number]

/** Ascending rank. Sorting DESC by priority puts `urgent` first. */
export const PRIORITY_RANK: Record<Priority, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  none: 'No priority',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

/**
 * The fixed palette. Labels, work item types and departments pick a hue
 * by name; the actual colour values live in globals.css so light and
 * dark stay in step.
 */
export const HUES = [
  'gray',
  'blue',
  'indigo',
  'purple',
  'pink',
  'red',
  'orange',
  'amber',
  'green',
  'teal',
] as const
export type Hue = (typeof HUES)[number]

export type ViewLayout = 'board' | 'list' | 'table' | 'calendar' | 'timeline'

export type Density = 'compact' | 'comfortable'
