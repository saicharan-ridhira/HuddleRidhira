import { describe, expect, it } from 'vitest'
import { createSeed } from '@/lib/data/seed'
import { createEngineContext, type EngineContext } from './context'
import {
  attentionOf,
  blockDetails,
  blockedDownstream,
  checklistProgress,
  isBlocked,
  isDone,
  isOverdue,
  relationsByKind,
} from './derive'
import { applyFilter, countConditions, evaluateFilter } from './filter'
import { applySort } from './sort'
import { groupItems } from './group'
import type { FilterGroup, SortRule, WorkItem } from '@/lib/types'

/** Fixed "now" so overdue assertions never depend on when tests run. */
const NOW = new Date('2026-09-03T09:00:00.000Z')

function context(): EngineContext {
  return createEngineContext(createSeed(NOW).entities, NOW)
}

function item(ctx: EngineContext, id: string): WorkItem {
  const found = ctx.workItems[id]
  if (!found) throw new Error(`Missing seeded work item ${id}`)
  return found
}

describe('blocked is derived, never stored', () => {
  it('reports an item as blocked when a blocking dependency is unfinished', () => {
    const ctx = context()
    // ENG-124 Payment API is blocked by ENG-120 Finance credentials.
    expect(isBlocked('wi-eng-124', ctx)).toBe(true)
    expect(blockDetails('wi-eng-124', ctx).some((d) => d.source === 'dependency')).toBe(true)
  })

  it('unblocks a dependent the moment its blocker reaches a terminal status', () => {
    const seed = createSeed(NOW)

    expect(isBlocked('wi-eng-124', createEngineContext(seed.entities, NOW))).toBe(true)

    // This is exactly what the huddle does: move the blocker to Done.
    const blocker = seed.entities.workItems['wi-eng-120']!
    blocker.statusId = 'st-eng-done'

    const after = createEngineContext(seed.entities, NOW)
    expect(isDone(after.workItems['wi-eng-120']!, after)).toBe(true)
    expect(isBlocked('wi-eng-124', after)).toBe(false)
  })

  it('does not unblock items further down the chain', () => {
    const seed = createSeed(NOW)
    seed.entities.workItems['wi-eng-120']!.statusId = 'st-eng-done'
    const ctx = createEngineContext(seed.entities, NOW)

    // ENG-131 waits on ENG-124, which is still in development.
    expect(isBlocked('wi-eng-131', ctx)).toBe(true)
  })

  it('treats an unresolved manual blocker as blocking', () => {
    const ctx = context()
    expect(isBlocked('wi-eng-127', ctx)).toBe(true)
    expect(blockDetails('wi-eng-127', ctx).some((d) => d.source === 'blocker')).toBe(true)
  })

  it('ignores a resolved manual blocker', () => {
    const ctx = context()
    // ENG-108 had a blocker that was resolved days ago.
    expect(isBlocked('wi-eng-108', ctx)).toBe(false)
  })

  it('never reports a status as the source of blocking', () => {
    const ctx = context()
    // No seeded status is named "Blocked" — blocked is a property, not a column (§12).
    expect(Object.values(ctx.statuses).some((status) => /blocked/i.test(status.name))).toBe(false)
  })
})

describe('dependency relations are visible from both sides', () => {
  it('derives the inverse without a second stored record', () => {
    const ctx = context()
    const downstream = relationsByKind('wi-eng-120', ctx)
    // ENG-120 is stored only as the target of "ENG-124 blocked-by ENG-120".
    expect(downstream.blocks.map((edge) => edge.otherId)).toContain('wi-eng-124')

    const upstream = relationsByKind('wi-eng-124', ctx)
    expect(upstream.blockedBy.map((edge) => edge.otherId)).toContain('wi-eng-120')
  })

  it('lists the items an item is holding up', () => {
    const ctx = context()
    expect(blockedDownstream('wi-eng-120', ctx).map((entry) => entry.key)).toContain('ENG-124')
  })
})

describe('checklist progress', () => {
  it('counts completed entries', () => {
    const ctx = context()
    // PRD §36's worked example: 3 of 5 complete.
    expect(checklistProgress(item(ctx, 'wi-eng-124'), ctx)).toEqual({
      done: 3,
      total: 5,
      percent: 60,
      complete: false,
    })
  })

  it('returns null when there is no checklist', () => {
    const ctx = context()
    expect(checklistProgress(item(ctx, 'wi-eng-109'), ctx)).toBeNull()
  })
})

describe('overdue', () => {
  it('flags unfinished work past its due date', () => {
    const ctx = context()
    expect(isOverdue(item(ctx, 'wi-eng-109'), ctx)).toBe(true)
  })

  it('never flags finished work as overdue', () => {
    const seed = createSeed(NOW)
    const done = seed.entities.workItems['wi-eng-101']!
    done.dueDate = new Date('2026-08-01T17:00:00.000Z').toISOString()
    const ctx = createEngineContext(seed.entities, NOW)
    expect(isOverdue(ctx.workItems['wi-eng-101']!, ctx)).toBe(false)
  })
})

describe('attention ranking drives the huddle', () => {
  it('ranks a blocker above an overdue item', () => {
    const ctx = context()
    const blocked = attentionOf(item(ctx, 'wi-eng-124'), ctx)
    const overdue = attentionOf(item(ctx, 'wi-eng-109'), ctx)
    expect(blocked.score).toBeGreaterThan(overdue.score)
    expect(blocked.reasons).toContain('blocked')
  })

  it('does not treat high priority alone as a discussion topic', () => {
    const ctx = context()
    // ENG-151 is high priority, not blocked, not overdue.
    const attention = attentionOf(item(ctx, 'wi-eng-151'), ctx)
    expect(attention.reasons).toContain('high-priority')
    expect(attention.needsDiscussion).toBe(false)
  })

  it('surfaces exactly three discussion items for Sai out of a much longer list', () => {
    const ctx = context()
    const sais = Object.values(ctx.workItems).filter((entry) => entry.assigneeId === 'u-sai')
    const needsDiscussion = sais.filter((entry) => attentionOf(entry, ctx).needsDiscussion)

    // PRD §31: "3 things to discuss", not "23 tasks".
    expect(sais.length).toBe(23)
    expect(needsDiscussion).toHaveLength(3)
  })
})

describe('filter engine', () => {
  const blockedOnly: FilterGroup = {
    kind: 'group',
    id: 'root',
    combinator: 'and',
    children: [{ kind: 'condition', id: 'c1', field: 'blocked', operator: 'is', value: true }],
  }

  it('matches everything when empty', () => {
    const ctx = context()
    const all = Object.values(ctx.workItems)
    const empty: FilterGroup = { kind: 'group', id: 'root', combinator: 'and', children: [] }
    expect(applyFilter(all, empty, ctx)).toHaveLength(all.length)
  })

  it('filters on the derived blocked property', () => {
    const ctx = context()
    const all = Object.values(ctx.workItems)
    const result = applyFilter(all, blockedOnly, ctx)
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((entry) => isBlocked(entry.id, ctx))).toBe(true)
  })

  it('evaluates nested AND inside OR', () => {
    const ctx = context()
    // (priority = high AND status = In Development) OR blocked
    const nested: FilterGroup = {
      kind: 'group',
      id: 'root',
      combinator: 'or',
      children: [
        {
          kind: 'group',
          id: 'g1',
          combinator: 'and',
          children: [
            { kind: 'condition', id: 'c1', field: 'priority', operator: 'is', value: 'high' },
            { kind: 'condition', id: 'c2', field: 'status', operator: 'is', value: 'st-eng-dev' },
          ],
        },
        { kind: 'condition', id: 'c3', field: 'blocked', operator: 'is', value: true },
      ],
    }

    const payment = item(ctx, 'wi-eng-124')
    expect(evaluateFilter(nested, payment, ctx)).toBe(true)

    const quiet = item(ctx, 'wi-eng-155') // no priority, backlog, not blocked
    expect(evaluateFilter(nested, quiet, ctx)).toBe(false)
  })

  it('counts leaf conditions across nesting for the toolbar badge', () => {
    expect(countConditions(blockedOnly)).toBe(1)
  })

  it('supports is-any-of over labels', () => {
    const ctx = context()
    const all = Object.values(ctx.workItems)
    const filter: FilterGroup = {
      kind: 'group',
      id: 'root',
      combinator: 'and',
      children: [{ kind: 'condition', id: 'c1', field: 'label', operator: 'is-any-of', value: ['lbl-payments'] }],
    }
    const result = applyFilter(all, filter, ctx)
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((entry) => entry.labelIds.includes('lbl-payments'))).toBe(true)
  })
})

describe('sort engine', () => {
  it('applies rules in order, using later rules only as tiebreaks', () => {
    const ctx = context()
    const rules: SortRule[] = [
      { id: 's1', field: 'priority', direction: 'desc' },
      { id: 's2', field: 'dueDate', direction: 'asc' },
    ]
    const sorted = applySort(Object.values(ctx.workItems), rules, ctx)

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1]!
      const current = sorted[index]!
      const order = ['none', 'low', 'medium', 'high', 'urgent']
      expect(order.indexOf(previous.priority)).toBeGreaterThanOrEqual(order.indexOf(current.priority))
    }
  })

  it('keeps undated items last even when sorting descending', () => {
    const ctx = context()
    const sorted = applySort(Object.values(ctx.workItems), [{ id: 's1', field: 'dueDate', direction: 'desc' }], ctx)
    const firstUndatedIndex = sorted.findIndex((entry) => entry.dueDate === null)
    const lastDatedIndex = sorted.reduce((last, entry, index) => (entry.dueDate ? index : last), -1)
    expect(firstUndatedIndex).toBeGreaterThan(lastDatedIndex)
  })
})

describe('group engine', () => {
  it('keeps empty board columns when asked', () => {
    const ctx = context()
    const engineering = Object.values(ctx.workItems).filter((entry) => entry.departmentId === 'dept-engineering')
    const statusIds = ctx.workflows['wf-engineering']!.statusIds

    const groups = groupItems(engineering, 'status', ctx, { universe: statusIds, includeEmpty: true })
    expect(groups).toHaveLength(statusIds.length)
    expect(groups.map((group) => group.key)).toEqual(statusIds)
  })

  it('drops empty groups by default', () => {
    const ctx = context()
    const groups = groupItems([], 'status', ctx)
    expect(groups).toHaveLength(0)
  })

  it('lists a multi-labelled item under each of its labels', () => {
    const ctx = context()
    const payment = item(ctx, 'wi-eng-124') // payments + backend + feature
    const groups = groupItems([payment], 'label', ctx)
    expect(groups).toHaveLength(payment.labelIds.length)
  })

  it('puts unassigned work last', () => {
    const ctx = context()
    const engineering = Object.values(ctx.workItems).filter((entry) => entry.departmentId === 'dept-engineering')
    const groups = groupItems(engineering, 'assignee', ctx)
    expect(groups[groups.length - 1]?.label).toBe('Unassigned')
  })
})
