import type { EngineContext } from './context'
import { isCurrentPeriod, periodKey, periodsBack, shiftPeriod } from './periods'
import type { Id, ISODate, Metric, MetricEntry, MetricHealth, MetricUnit } from '@/lib/types'

/**
 * Everything a scorecard shows, derived on read.
 *
 * Nothing here is stored: a computed metric is resolved from its inputs
 * every time it is asked for, so correcting yesterday's lead count fixes
 * yesterday's conversion rate in the same render. That is the whole
 * argument against the spreadsheet, and it only holds if no total is
 * ever cached.
 */

/**
 * Entries keyed `metricId:departmentId:periodStart`, so a lookup is O(1)
 * rather than a scan.
 *
 * The department belongs in the key because a metric can be shared: an
 * org-wide "Headcount" is one *definition* that every department reports
 * its own number against. Keying on the metric alone would have four
 * departments overwriting each other.
 */
export type MetricIndex = Record<string, MetricEntry>

export function metricEntryKey(metricId: Id, departmentId: Id, periodStart: ISODate): string {
  return `${metricId}:${departmentId}:${periodStart}`
}

export function buildMetricIndex(entries: Record<Id, MetricEntry>): MetricIndex {
  const index: MetricIndex = {}
  for (const entry of Object.values(entries)) {
    index[metricEntryKey(entry.metricId, entry.departmentId, entry.periodStart)] = entry
  }
  return index
}

/** How deep a chain of computed metrics may go before we stop trying. */
const MAX_DEPTH = 8

/**
 * The value of a metric for one period, resolving computed metrics from
 * their inputs.
 *
 * A ratio may reference another ratio, so a cycle is reachable through
 * ordinary editing — `seen` makes that return null rather than recurse
 * until the stack gives out. The metric editor refuses to *create* such a
 * cycle, but a prototype that persists to localStorage will meet data it
 * did not create, and hanging is a worse answer than a blank cell.
 */
export function metricValue(
  metric: Metric | undefined,
  departmentId: Id,
  periodStart: ISODate,
  ctx: EngineContext,
  seen: Set<Id> = new Set(),
): number | null {
  if (!metric) return null
  if (seen.has(metric.id) || seen.size > MAX_DEPTH) return null

  if (metric.source === 'manual') {
    return ctx.metricIndex[metricEntryKey(metric.id, departmentId, periodStart)]?.value ?? null
  }

  const next = new Set(seen).add(metric.id)
  const inputs = metric.inputIds.map((id) => {
    const input = ctx.metrics[id]
    // An input on a different cadence is read at *its* period covering
    // this one, so a daily conversion rate can divide by a weekly total
    // without anyone having to think about it.
    const inputPeriod = input && input.cadence !== metric.cadence ? periodKey(input.cadence, periodStart) : periodStart
    return metricValue(input, departmentId, inputPeriod, ctx, next)
  })

  switch (metric.source) {
    case 'ratio': {
      const [numerator, denominator] = inputs
      if (numerator === null || numerator === undefined) return null
      if (denominator === null || denominator === undefined || denominator === 0) return null
      return (numerator / denominator) * (metric.scale ?? 1)
    }
    case 'sum': {
      const present = inputs.filter((value): value is number => value !== null && value !== undefined)
      // Summing what happens to have been filled in would quietly report
      // a smaller number as if it were the total.
      if (present.length !== inputs.length || present.length === 0) return null
      return present.reduce((total, value) => total + value, 0)
    }
    case 'difference': {
      const [a, b] = inputs
      if (a === null || a === undefined || b === null || b === undefined) return null
      return a - b
    }
    default:
      return null
  }
}

/**
 * How a value reads against its target.
 *
 * `direction` does all the work — "Incidents, target 0, lower is better"
 * and "Deploys, target 3, higher is better" both resolve here, so no
 * component ever branches on what a metric means.
 */
export function metricHealth(metric: Metric, value: number | null): MetricHealth {
  // An empty cell and a reported zero are different facts. Colouring a
  // blank red is how a scorecard loses its credibility in week two.
  if (value === null) return 'not-reported'
  if (metric.target === null) return 'on-track'

  const meets = metric.direction === 'up-is-good' ? value >= metric.target : value <= metric.target
  if (meets) return 'on-track'

  if (metric.warnAt !== null) {
    const warned = metric.direction === 'up-is-good' ? value >= metric.warnAt : value <= metric.warnAt
    if (warned) return 'at-risk'
  }

  return 'off-track'
}

/** The value for each period, in the order given. */
export function metricSeries(
  metric: Metric,
  departmentId: Id,
  periods: ISODate[],
  ctx: EngineContext,
): (number | null)[] {
  return periods.map((period) => metricValue(metric, departmentId, period, ctx))
}

/** Combines a window of values the way the metric says it should. */
export function rollupSeries(metric: Metric, series: (number | null)[]): number | null {
  const values = series.filter((value): value is number => value !== null)
  if (values.length === 0) return null

  switch (metric.rollup) {
    case 'sum':
      return values.reduce((total, value) => total + value, 0)
    case 'average':
      return values.reduce((total, value) => total + value, 0) / values.length
    case 'last':
      return values[values.length - 1] ?? null
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
  }
}

export interface MetricReading {
  metric: Metric
  /** The period currently being reported. */
  periodStart: ISODate
  value: number | null
  health: MetricHealth
  /** The period before, for the delta arrow. */
  previous: number | null
  /** Positive means "moved the way this metric wants", whatever its direction. */
  improvement: number | null
}

/** The current state of one metric — what a tile or a huddle row shows. */
export function metricReading(metric: Metric, departmentId: Id, ctx: EngineContext): MetricReading {
  const periodStart = periodKey(metric.cadence, ctx.now)
  const value = metricValue(metric, departmentId, periodStart, ctx)
  const previous = metricValue(metric, departmentId, shiftPeriod(metric.cadence, periodStart, -1), ctx)

  let improvement: number | null = null
  if (value !== null && previous !== null) {
    const delta = value - previous
    improvement = metric.direction === 'up-is-good' ? delta : -delta
  }

  return { metric, periodStart, value, health: metricHealth(metric, value), previous, improvement }
}

export interface ScorecardSummary {
  offTrack: number
  atRisk: number
  onTrack: number
  /** Metrics with nobody's number in for the current period. */
  missing: number
  total: number
}

/**
 * The counts a huddle needs at a glance. Computed metrics are excluded
 * from `missing` — nobody forgot to fill in a ratio, and reporting one
 * as missing would send the HOD looking for a cell that does not exist.
 */
export function scorecardSummary(metrics: Metric[], departmentId: Id, ctx: EngineContext): ScorecardSummary {
  const summary: ScorecardSummary = { offTrack: 0, atRisk: 0, onTrack: 0, missing: 0, total: metrics.length }

  for (const metric of metrics) {
    const { value, health } = metricReading(metric, departmentId, ctx)
    if (health === 'off-track') summary.offTrack++
    else if (health === 'at-risk') summary.atRisk++
    else if (health === 'on-track') summary.onTrack++
    if (value === null && metric.source === 'manual') summary.missing++
  }

  return summary
}

/**
 * The metrics a huddle should actually hear about: off track first, then
 * at risk, then anything nobody has reported. On-track numbers are left
 * out — a meeting that reads every green cell aloud is the meeting this
 * product exists to shorten.
 */
export function huddleScorecard(metrics: Metric[], departmentId: Id, ctx: EngineContext): MetricReading[] {
  const rank: Record<MetricHealth, number> = {
    'off-track': 0,
    'at-risk': 1,
    'not-reported': 2,
    'on-track': 3,
  }

  return metrics
    .map((metric) => metricReading(metric, departmentId, ctx))
    .filter((reading) => reading.health !== 'on-track')
    .sort((a, b) => rank[a.health] - rank[b.health] || a.metric.name.localeCompare(b.metric.name))
}

/** True when `candidate` already depends on `metric`, so wiring it as an input would close a loop. */
export function dependsOn(candidate: Metric, metricId: Id, ctx: EngineContext, depth = 0): boolean {
  if (candidate.id === metricId) return true
  if (depth > MAX_DEPTH) return false
  return candidate.inputIds.some((id) => {
    const input = ctx.metrics[id]
    return input ? dependsOn(input, metricId, ctx, depth + 1) : false
  })
}

/** Inputs a metric may legally be given: everything that does not already lead back to it. */
export function eligibleInputs(metric: Metric, ctx: EngineContext): Metric[] {
  return Object.values(ctx.metrics).filter((other) => !other.archived && !dependsOn(other, metric.id, ctx))
}

const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

/** One place that turns a number into what the scorecard shows. */
export function formatMetricValue(value: number | null, unit: MetricUnit): string {
  // An em dash, not "0" and not an empty cell — the reader has to be able
  // to tell "nobody said" from "it was nothing".
  if (value === null || Number.isNaN(value)) return '—'

  switch (unit) {
    case 'currency':
      return CURRENCY.format(value)
    case 'percent':
      // Two decimals, trailing zeros trimmed. An uptime target of 99.95
      // rounded to one place reads as 100% — which is the one number it
      // is specifically not.
      return `${trim(Math.round(value * 100) / 100)}%`
    case 'duration':
      return `${round(value)}h`
    case 'count':
      return String(Math.round(value))
    case 'number':
      return String(round(value))
  }
}

function round(value: number): number {
  return Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10
}

function trim(value: number): string {
  return String(value)
}

/** "Deals won ÷ Leads × 100" — a computed metric explaining itself. */
export function formulaOf(metric: Metric, ctx: EngineContext): string | null {
  if (metric.source === 'manual') return null

  const names = metric.inputIds.map((id) => ctx.metrics[id]?.name ?? '?')
  if (names.length === 0) return null

  switch (metric.source) {
    case 'ratio': {
      const base = `${names[0] ?? '?'} ÷ ${names[1] ?? '?'}`
      return metric.scale && metric.scale !== 1 ? `${base} × ${metric.scale}` : base
    }
    case 'sum':
      return names.join(' + ')
    case 'difference':
      return `${names[0] ?? '?'} − ${names[1] ?? '?'}`
    default:
      return null
  }
}

/** Does this metric have a number in for the period we are in right now? */
export function isReported(metric: Metric, departmentId: Id, ctx: EngineContext): boolean {
  return metricValue(metric, departmentId, periodKey(metric.cadence, ctx.now), ctx) !== null
}

export { periodKey, periodsBack, isCurrentPeriod }
