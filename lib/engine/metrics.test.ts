import { describe, expect, it } from 'vitest'
import { createSeed } from '@/lib/data/seed'
import { createEngineContext, type EngineContext } from './context'
import {
  buildMetricIndex,
  dependsOn,
  eligibleInputs,
  formatMetricValue,
  formulaOf,
  huddleScorecard,
  metricEntryKey,
  metricHealth,
  metricReading,
  metricSeries,
  metricValue,
  rollupSeries,
  scorecardSummary,
} from './metrics'
import {
  daysBetween,
  formatPeriod,
  periodKey,
  periodsBack,
  quarterOf,
  quarterProgress,
  shiftPeriod,
  shiftQuarter,
} from './periods'
import type { Metric } from '@/lib/types'

/** Fixed "now" so period assertions never depend on when tests run. */
const NOW = new Date('2026-09-03T09:00:00.000Z')

function context(): EngineContext {
  return createEngineContext(createSeed(NOW).entities, NOW)
}

function metric(ctx: EngineContext, id: string): Metric {
  const found = ctx.metrics[id]
  if (!found) throw new Error(`Missing seeded metric ${id}`)
  return found
}

describe('periods are canonical', () => {
  it('keeps a daily period as the day itself', () => {
    expect(periodKey('daily', '2026-09-03')).toBe('2026-09-03')
  })

  it('snaps every day of a week to the same Monday', () => {
    // 2026-08-31 is a Monday.
    const week = ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06']
    for (const day of week) expect(periodKey('weekly', day)).toBe('2026-08-31')
  })

  it('puts Sunday in the week that began six days earlier, not the one starting tomorrow', () => {
    // The off-by-one that a naive getDay() would produce.
    expect(periodKey('weekly', '2026-09-06')).toBe('2026-08-31')
    expect(periodKey('weekly', '2026-09-07')).toBe('2026-09-07')
  })

  it('snaps months and quarters to their first day', () => {
    expect(periodKey('monthly', '2026-09-30')).toBe('2026-09-01')
    expect(periodKey('quarterly', '2026-09-30')).toBe('2026-07-01')
    expect(periodKey('quarterly', '2026-10-01')).toBe('2026-10-01')
  })

  it('steps across month and year boundaries', () => {
    expect(shiftPeriod('daily', '2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftPeriod('monthly', '2026-01-01', -1)).toBe('2025-12-01')
    expect(shiftPeriod('quarterly', '2026-01-01', -1)).toBe('2025-10-01')
    expect(shiftPeriod('weekly', '2026-08-31', 1)).toBe('2026-09-07')
  })

  it('returns the requested window oldest first, ending on the current period', () => {
    const days = periodsBack('daily', 3, NOW)
    expect(days).toEqual(['2026-09-01', '2026-09-02', '2026-09-03'])
    expect(days[days.length - 1]).toBe(periodKey('daily', NOW))
  })

  it('formats a period per cadence', () => {
    expect(formatPeriod('daily', '2026-09-03')).toBe('3 Sep')
    expect(formatPeriod('weekly', '2026-08-31')).toBe('w/c 31 Aug')
    expect(formatPeriod('monthly', '2026-09-01')).toBe('Sep 2026')
    expect(formatPeriod('quarterly', '2026-07-01')).toBe('Q3 2026')
  })

  it('names quarters and steps between them across a year end', () => {
    expect(quarterOf(NOW)).toBe('2026-Q3')
    expect(shiftQuarter('2026-Q4', 1)).toBe('2027-Q1')
    expect(shiftQuarter('2026-Q1', -1)).toBe('2025-Q4')
    expect(quarterProgress(NOW)).toBeGreaterThan(0.6)
    expect(quarterProgress(NOW)).toBeLessThan(0.8)
  })

  it('counts whole days between period starts', () => {
    expect(daysBetween('2026-09-01', '2026-09-03')).toBe(2)
  })
})

describe('health reads against the target in whichever direction the metric wants', () => {
  const base: Metric = {
    id: 'm', name: 'M', departmentIds: [], unit: 'count', cadence: 'daily',
    direction: 'up-is-good', rollup: 'sum', target: 10, warnAt: 7, ownerId: null,
    source: 'manual', inputIds: [], scale: null, archived: false,
  }

  it('treats meeting or beating the target as on track when higher is better', () => {
    expect(metricHealth(base, 12)).toBe('on-track')
    expect(metricHealth(base, 10)).toBe('on-track')
    expect(metricHealth(base, 8)).toBe('at-risk')
    expect(metricHealth(base, 3)).toBe('off-track')
  })

  it('inverts cleanly when lower is better', () => {
    const incidents: Metric = { ...base, direction: 'down-is-good', target: 0, warnAt: 1 }
    expect(metricHealth(incidents, 0)).toBe('on-track')
    expect(metricHealth(incidents, 1)).toBe('at-risk')
    expect(metricHealth(incidents, 3)).toBe('off-track')
  })

  it('distinguishes a reported zero from nobody reporting', () => {
    // The distinction the whole scorecard rests on: a blank is not a nought.
    expect(metricHealth(base, null)).toBe('not-reported')
    expect(metricHealth(base, 0)).toBe('off-track')
  })

  it('never judges a metric with no target', () => {
    expect(metricHealth({ ...base, target: null }, 0)).toBe('on-track')
  })

  it('has only two states when no warning band is set', () => {
    const strict = { ...base, warnAt: null }
    expect(metricHealth(strict, 9)).toBe('off-track')
  })
})

describe('computed metrics resolve from their inputs', () => {
  it('computes a ratio and scales it to a percentage', () => {
    const ctx = context()
    const conversion = metric(ctx, 'met-sls-conversion')
    const won = metricValue(metric(ctx, 'met-sls-won'), 'dept-sales', '2026-09-03', ctx)
    const leads = metricValue(metric(ctx, 'met-sls-leads'), 'dept-sales', '2026-09-03', ctx)
    const value = metricValue(conversion, 'dept-sales', '2026-09-03', ctx)

    expect(won).not.toBeNull()
    expect(leads).not.toBeNull()
    expect(value).toBeCloseTo((won! / leads!) * 100, 6)
  })

  it('reports nothing rather than infinity when the denominator is zero', () => {
    const ctx = context()
    const ratio: Metric = {
      ...metric(ctx, 'met-sls-conversion'),
      id: 'met-zero',
      inputIds: ['met-a', 'met-b'],
    }
    ctx.metrics['met-zero'] = ratio
    ctx.metrics['met-a'] = { ...ratio, id: 'met-a', source: 'manual', inputIds: [] }
    ctx.metrics['met-b'] = { ...ratio, id: 'met-b', source: 'manual', inputIds: [] }
    ctx.metricIndex[metricEntryKey('met-a', 'dept-sales', '2026-09-03')] = {
      id: 'e1', metricId: 'met-a', departmentId: 'dept-sales', periodStart: '2026-09-03',
      value: 5, enteredBy: 'u-sai', enteredAt: '2026-09-03T09:00:00.000Z',
    }
    ctx.metricIndex[metricEntryKey('met-b', 'dept-sales', '2026-09-03')] = {
      id: 'e2', metricId: 'met-b', departmentId: 'dept-sales', periodStart: '2026-09-03',
      value: 0, enteredBy: 'u-sai', enteredAt: '2026-09-03T09:00:00.000Z',
    }

    expect(metricValue(ratio, 'dept-sales', '2026-09-03', ctx)).toBeNull()
  })

  it('refuses to sum a partial set rather than under-report a total', () => {
    const ctx = context()
    const total: Metric = {
      id: 'met-total', name: 'Total', departmentIds: ['dept-sales'], unit: 'count', cadence: 'daily',
      direction: 'up-is-good', rollup: 'sum', target: null, warnAt: null, ownerId: null,
      source: 'sum', inputIds: ['met-sls-leads', 'met-missing'], scale: null, archived: false,
    }
    ctx.metrics['met-total'] = total
    expect(metricValue(total, 'dept-sales', '2026-09-03', ctx)).toBeNull()
  })

  it('returns null instead of hanging when a metric depends on itself', () => {
    const ctx = context()
    const loop: Metric = {
      id: 'met-loop', name: 'Loop', departmentIds: [], unit: 'number', cadence: 'daily',
      direction: 'up-is-good', rollup: 'sum', target: null, warnAt: null, ownerId: null,
      source: 'ratio', inputIds: ['met-loop', 'met-loop'], scale: null, archived: false,
    }
    ctx.metrics['met-loop'] = loop
    expect(metricValue(loop, 'dept-sales', '2026-09-03', ctx)).toBeNull()
  })

  it('returns null for a cycle that runs through another metric', () => {
    const ctx = context()
    const shape: Omit<Metric, 'id' | 'name' | 'inputIds'> = {
      departmentIds: [], unit: 'number', cadence: 'daily', direction: 'up-is-good',
      rollup: 'sum', target: null, warnAt: null, ownerId: null, source: 'ratio',
      scale: null, archived: false,
    }
    ctx.metrics['met-x'] = { ...shape, id: 'met-x', name: 'X', inputIds: ['met-y', 'met-y'] }
    ctx.metrics['met-y'] = { ...shape, id: 'met-y', name: 'Y', inputIds: ['met-x', 'met-x'] }

    expect(metricValue(ctx.metrics['met-x'], 'dept-sales', '2026-09-03', ctx)).toBeNull()
  })

  it('will not offer a metric as an input when that would close a loop', () => {
    const ctx = context()
    const conversion = metric(ctx, 'met-sls-conversion')
    const leads = metric(ctx, 'met-sls-leads')

    expect(dependsOn(conversion, leads.id, ctx)).toBe(true)
    expect(eligibleInputs(leads, ctx).map((m) => m.id)).not.toContain(conversion.id)
    expect(eligibleInputs(conversion, ctx).map((m) => m.id)).toContain(leads.id)
  })

  it('explains itself in words', () => {
    const ctx = context()
    expect(formulaOf(metric(ctx, 'met-sls-conversion'), ctx)).toBe('Deals won ÷ New leads × 100')
    expect(formulaOf(metric(ctx, 'met-sls-leads'), ctx)).toBeNull()
  })
})

describe('entries are per department, not per metric', () => {
  it('keeps four departments reporting one org-wide metric apart', () => {
    const ctx = context()
    const nps = metric(ctx, 'met-org-nps')
    const period = periodKey('monthly', NOW)

    const sales = metricValue(nps, 'dept-sales', period, ctx)
    const engineering = metricValue(nps, 'dept-engineering', period, ctx)

    expect(sales).not.toBeNull()
    expect(engineering).not.toBeNull()
    expect(sales).not.toBe(engineering)
  })

  it('indexes on metric, department and period together', () => {
    const index = buildMetricIndex({
      a: { id: 'a', metricId: 'm', departmentId: 'd1', periodStart: '2026-09-03', value: 1, enteredBy: 'u', enteredAt: 'x' },
      b: { id: 'b', metricId: 'm', departmentId: 'd2', periodStart: '2026-09-03', value: 2, enteredBy: 'u', enteredAt: 'x' },
    })
    expect(index[metricEntryKey('m', 'd1', '2026-09-03')]?.value).toBe(1)
    expect(index[metricEntryKey('m', 'd2', '2026-09-03')]?.value).toBe(2)
  })
})

describe('readings and rollups', () => {
  it('reports improvement in the direction the metric cares about', () => {
    const ctx = context()
    const incidents = metric(ctx, 'met-eng-incidents')
    const reading = metricReading(incidents, 'dept-engineering', ctx)

    if (reading.value !== null && reading.previous !== null) {
      // Fewer incidents is an improvement, so a fall must read positive.
      expect(reading.improvement).toBeCloseTo(reading.previous - reading.value, 6)
    }
  })

  it('rolls a window up the way the metric says', () => {
    const base: Metric = {
      id: 'm', name: 'M', departmentIds: [], unit: 'count', cadence: 'daily',
      direction: 'up-is-good', rollup: 'sum', target: null, warnAt: null, ownerId: null,
      source: 'manual', inputIds: [], scale: null, archived: false,
    }
    const series = [2, null, 4, 6]
    expect(rollupSeries(base, series)).toBe(12)
    expect(rollupSeries({ ...base, rollup: 'average' }, series)).toBe(4)
    expect(rollupSeries({ ...base, rollup: 'last' }, series)).toBe(6)
    expect(rollupSeries({ ...base, rollup: 'min' }, series)).toBe(2)
    expect(rollupSeries({ ...base, rollup: 'max' }, series)).toBe(6)
    expect(rollupSeries(base, [null, null])).toBeNull()
  })

  it('returns one value per requested period, in order', () => {
    const ctx = context()
    const periods = periodsBack('daily', 5, NOW)
    const series = metricSeries(metric(ctx, 'met-sls-leads'), 'dept-sales', periods, ctx)
    expect(series).toHaveLength(5)
    expect(series.every((value) => value === null || typeof value === 'number')).toBe(true)
  })
})

describe('what the huddle hears', () => {
  it('leaves on-track metrics out of the agenda', () => {
    const ctx = context()
    const metrics = Object.values(ctx.metrics).filter((m) => m.departmentIds.includes('dept-sales'))
    const readings = huddleScorecard(metrics, 'dept-sales', ctx)

    expect(readings.every((reading) => reading.health !== 'on-track')).toBe(true)
  })

  it('puts off-track first and unreported last', () => {
    const ctx = context()
    const metrics = Object.values(ctx.metrics)
    const order = huddleScorecard(metrics, 'dept-product', ctx).map((reading) => reading.health)
    const rank = { 'off-track': 0, 'at-risk': 1, 'not-reported': 2, 'on-track': 3 } as const

    for (let index = 1; index < order.length; index++) {
      expect(rank[order[index]!]).toBeGreaterThanOrEqual(rank[order[index - 1]!])
    }
  })

  it('counts an unreported manual metric as missing but never a computed one', () => {
    const ctx = context()
    // Product's interview count is deliberately seeded without today's entry.
    const productMetrics = Object.values(ctx.metrics).filter((m) => m.departmentIds.includes('dept-product'))
    const summary = scorecardSummary(productMetrics, 'dept-product', ctx)

    expect(summary.missing).toBeGreaterThan(0)
    expect(summary.total).toBe(productMetrics.length)

    const computed = productMetrics.filter((m) => m.source !== 'manual')
    expect(computed.length).toBeGreaterThan(0)
    // A ratio is derived, so nobody can have forgotten to fill it in.
    expect(summary.missing).toBeLessThanOrEqual(productMetrics.length - computed.length)
  })

  it('gives every department something to report', () => {
    const ctx = context()
    for (const departmentId of ['dept-engineering', 'dept-product', 'dept-marketing', 'dept-sales']) {
      const metrics = Object.values(ctx.metrics).filter(
        (m) => m.departmentIds.length === 0 || m.departmentIds.includes(departmentId),
      )
      expect(metrics.length).toBeGreaterThan(3)
      expect(ctx.departments[departmentId]?.criticalNumber).not.toBeNull()
    }
  })
})

describe('formatting', () => {
  it('shows an em dash for an unreported value rather than a zero', () => {
    expect(formatMetricValue(null, 'count')).toBe('—')
    expect(formatMetricValue(0, 'count')).toBe('0')
  })

  it('keeps enough precision for a percentage to mean anything', () => {
    // Rounded to one place this reads 100%, which is exactly the number
    // an uptime target of 99.95 is not.
    expect(formatMetricValue(99.95, 'percent')).toBe('99.95%')
    expect(formatMetricValue(40, 'percent')).toBe('40%')
  })

  it('renders each unit in its own shape', () => {
    expect(formatMetricValue(99.87, 'percent')).toBe('99.87%')
    expect(formatMetricValue(48, 'duration')).toBe('48h')
    expect(formatMetricValue(12.4, 'count')).toBe('12')
    expect(formatMetricValue(1234, 'number')).toBe('1234')
  })
})

describe('seeded Rocks', () => {
  it('gives every department Rocks for the current quarter', () => {
    const ctx = context()
    const quarter = quarterOf(NOW)

    for (const departmentId of ['dept-engineering', 'dept-product', 'dept-marketing', 'dept-sales']) {
      const rocks = Object.values(ctx.workItems).filter(
        (item) => item.departmentId === departmentId && item.rockQuarter === quarter,
      )
      expect(rocks.length).toBeGreaterThan(0)
    }
  })

  it('leaves ordinary work unmarked', () => {
    const ctx = context()
    const rocks = Object.values(ctx.workItems).filter((item) => item.rockQuarter !== null)
    expect(rocks.length).toBeLessThan(Object.values(ctx.workItems).length / 4)
  })
})
