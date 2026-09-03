import type { Id, ISODate } from './primitives'

/**
 * KPI tracking, generalised the same way everything else in this product
 * is: the metric is *data*, not code.
 *
 * Every department here tracks different numbers — sales counts
 * conversions, marketing tracks campaign spend, engineering tracks
 * deploys — which is exactly why a fixed set of columns would be wrong
 * for three departments out of four. So a `Metric` is a department-scoped
 * definition, exactly like `CustomField`, and `MetricEntry` holds the
 * values. The platform never learns what any of them mean.
 *
 * Mapped onto the spreadsheets this replaces: definitions are the rows,
 * periods are the columns, entries are the cells.
 */

/** How a value is rendered. Fixed, because the *display* of a number is
 * not something anyone should have to configure per metric. */
export const METRIC_UNITS = ['number', 'count', 'currency', 'percent', 'duration'] as const
export type MetricUnit = (typeof METRIC_UNITS)[number]

export const METRIC_UNIT_LABEL: Record<MetricUnit, string> = {
  number: 'Number',
  count: 'Count',
  currency: 'Currency',
  percent: 'Percentage',
  duration: 'Hours',
}

/** How often the number is reported. Sales logs leads daily; finance
 * closes monthly. Forcing one cadence on both would push somebody back
 * to their spreadsheet. */
export const METRIC_CADENCES = ['daily', 'weekly', 'monthly', 'quarterly'] as const
export type MetricCadence = (typeof METRIC_CADENCES)[number]

export const METRIC_CADENCE_LABEL: Record<MetricCadence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
}

/**
 * Which way is good. This one field is what lets "Incidents, target 0"
 * and "Deploys, target 3" both work without a single special case
 * anywhere in the UI.
 */
export const METRIC_DIRECTIONS = ['up-is-good', 'down-is-good'] as const
export type MetricDirection = (typeof METRIC_DIRECTIONS)[number]

export const METRIC_DIRECTION_LABEL: Record<MetricDirection, string> = {
  'up-is-good': 'Higher is better',
  'down-is-good': 'Lower is better',
}

/** How periods combine into a total or an average across a window. */
export const METRIC_ROLLUPS = ['sum', 'average', 'last', 'min', 'max'] as const
export type MetricRollup = (typeof METRIC_ROLLUPS)[number]

export const METRIC_ROLLUP_LABEL: Record<MetricRollup, string> = {
  sum: 'Total',
  average: 'Average',
  last: 'Latest',
  min: 'Lowest',
  max: 'Highest',
}

/**
 * Where a number comes from. Everything but `manual` is computed from
 * other metrics, which is what stops a conversion rate drifting away
 * from the counts it is made of.
 *
 * These are presets rather than a formula language on purpose: a typed
 * set of four covers what an operating scorecard actually needs, with no
 * parser to write, no expression to get wrong, and nothing to evaluate.
 */
export const METRIC_SOURCES = ['manual', 'ratio', 'sum', 'difference'] as const
export type MetricSource = (typeof METRIC_SOURCES)[number]

export const METRIC_SOURCE_LABEL: Record<MetricSource, string> = {
  manual: 'Entered by hand',
  ratio: 'A ÷ B',
  sum: 'A + B + …',
  difference: 'A − B',
}

export const COMPUTED_SOURCES: readonly MetricSource[] = ['ratio', 'sum', 'difference']

export interface Metric {
  id: Id
  name: string
  /** Empty means org-wide — the same convention as `CustomField`. */
  departmentIds: Id[]
  unit: MetricUnit
  cadence: MetricCadence
  direction: MetricDirection
  rollup: MetricRollup
  /** What good looks like. Null means the metric is tracked but not judged. */
  target: number | null
  /**
   * The boundary between "fine" and "missed". Null collapses the scale
   * to two states instead of three.
   */
  warnAt: number | null
  ownerId: Id | null
  /**
   * How to measure it. This is the discipline that stops two people
   * computing the same metric two different ways — the single most
   * common failure of a spreadsheet scorecard.
   */
  description?: string
  source: MetricSource
  /** Computed metrics only. `ratio` and `difference` take [a, b]; `sum` takes any length. */
  inputIds: Id[]
  /** `ratio` only — 100 turns a fraction into a percentage. */
  scale: number | null
  archived: boolean
}

export interface MetricEntry {
  id: Id
  metricId: Id
  /** Denormalised so filtering is a lookup, exactly like `Blocker.workItemId`. */
  departmentId: Id
  /** Canonical first day of the period being reported. Always via `periodKey`. */
  periodStart: ISODate
  /**
   * Null is meaningful and distinct from 0: it records that a period was
   * opened and deliberately left blank. Absence of the whole entry means
   * nobody reported.
   */
  value: number | null
  note?: string
  enteredBy: Id
  enteredAt: ISODate
}

/**
 * The one number a department is pushing this quarter — Scaling Up's
 * Critical Number. Its whole value is that there is exactly one, so this
 * is a single field rather than a list.
 */
export interface CriticalNumber {
  /** e.g. '2026-Q3' */
  quarter: string
  metricId: Id
  /** The quarter's target, which may be more ambitious than the metric's standing one. */
  target: number
}

/**
 * How a value reads against its target.
 *
 * `not-reported` exists because an empty cell and a reported zero are
 * different facts, and conflating them is how a scorecard loses trust in
 * its second week.
 */
export type MetricHealth = 'on-track' | 'at-risk' | 'off-track' | 'not-reported'

export const METRIC_HEALTH_LABEL: Record<MetricHealth, string> = {
  'on-track': 'On track',
  'at-risk': 'At risk',
  'off-track': 'Off track',
  'not-reported': 'Not reported',
}
