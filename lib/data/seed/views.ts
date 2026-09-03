import type { DisplayableField, SavedView, ViewConfig } from '@/lib/types'

const BASE_FIELDS: DisplayableField[] = ['key', 'type', 'status', 'priority', 'assignee', 'labels', 'dueDate', 'checklist', 'blocked']

/** The view a department opens with when nothing else is saved. */
export function defaultViewConfig(overrides: Partial<ViewConfig> = {}): ViewConfig {
  return {
    layout: 'board',
    groupBy: 'status',
    sort: [{ id: 'srt-default', field: 'manual', direction: 'asc' }],
    filter: { kind: 'group', id: 'root', combinator: 'and', children: [] },
    visibleFields: BASE_FIELDS,
    visibleCustomFieldIds: [],
    density: 'compact',
    hideEmptyGroups: false,
    ...overrides,
  }
}

/**
 * PRD §17's worked example ("Blocked Engineering Work") ships as a saved
 * view so the concept is discoverable on first run rather than something
 * the user has to invent.
 */
export const savedViews: SavedView[] = [
  {
    id: 'view-blocked-engineering',
    name: 'Blocked engineering work',
    description: 'Everything that cannot currently proceed, grouped by who owns it.',
    departmentId: 'dept-engineering',
    scope: 'department',
    createdBy: 'u-sai',
    icon: 'OctagonAlert',
    config: defaultViewConfig({
      layout: 'board',
      groupBy: 'assignee',
      sort: [
        { id: 'srt-b1', field: 'priority', direction: 'desc' },
        { id: 'srt-b2', field: 'dueDate', direction: 'asc' },
      ],
      filter: {
        kind: 'group',
        id: 'root',
        combinator: 'and',
        children: [{ kind: 'condition', id: 'c1', field: 'blocked', operator: 'is', value: true }],
      },
      hideEmptyGroups: true,
    }),
  },
  {
    id: 'view-payments',
    name: 'Payments programme',
    description: 'The v2.4 payments work across every status.',
    departmentId: 'dept-engineering',
    scope: 'department',
    createdBy: 'u-sai',
    icon: 'CreditCard',
    config: defaultViewConfig({
      layout: 'timeline',
      groupBy: 'status',
      sort: [{ id: 'srt-p1', field: 'dueDate', direction: 'asc' }],
      filter: {
        kind: 'group',
        id: 'root',
        combinator: 'and',
        children: [{ kind: 'condition', id: 'c1', field: 'label', operator: 'is', value: 'lbl-payments' }],
      },
      visibleCustomFieldIds: ['cf-release'],
    }),
  },
  {
    id: 'view-this-week',
    name: 'Due this week',
    description: 'Work landing in the next seven days, most urgent first.',
    departmentId: null,
    scope: 'organization',
    createdBy: 'u-aditya',
    icon: 'CalendarClock',
    config: defaultViewConfig({
      layout: 'list',
      groupBy: 'dueDate',
      sort: [
        { id: 'srt-w1', field: 'dueDate', direction: 'asc' },
        { id: 'srt-w2', field: 'priority', direction: 'desc' },
      ],
      filter: {
        kind: 'group',
        id: 'root',
        combinator: 'and',
        children: [{ kind: 'condition', id: 'c1', field: 'dueDate', operator: 'is-set', value: null }],
      },
    }),
  },
  {
    id: 'view-escalations',
    name: 'Escalations',
    description: 'Blocked work, or anything urgent that has slipped its date.',
    departmentId: null,
    scope: 'organization',
    createdBy: 'u-sai',
    icon: 'Siren',
    config: defaultViewConfig({
      layout: 'table',
      groupBy: 'department',
      sort: [{ id: 'srt-e1', field: 'priority', direction: 'desc' }],
      // The nested example from PRD §20: (priority = urgent AND overdue) OR blocked.
      filter: {
        kind: 'group',
        id: 'root',
        combinator: 'or',
        children: [
          {
            kind: 'group',
            id: 'g1',
            combinator: 'and',
            children: [
              { kind: 'condition', id: 'c1', field: 'priority', operator: 'is', value: 'urgent' },
              { kind: 'condition', id: 'c2', field: 'overdue', operator: 'is', value: true },
            ],
          },
          { kind: 'condition', id: 'c3', field: 'blocked', operator: 'is', value: true },
        ],
      },
      visibleFields: ['key', 'title' as DisplayableField, 'status', 'priority', 'assignee', 'dueDate', 'blocked'].filter(
        (field): field is DisplayableField => field !== 'title',
      ),
    }),
  },
]
