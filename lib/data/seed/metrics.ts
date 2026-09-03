import { periodKey, periodsBack, quarterOf } from '@/lib/engine/periods'
import type { CriticalNumber, Id, Metric, MetricEntry } from '@/lib/types'
import { makeRandom } from './helpers'

/**
 * The demo scorecard.
 *
 * Every department gets a real set of numbers, because the whole claim
 * being demonstrated is that four departments measuring four unrelated
 * things can share one surface. A seed where only sales had metrics
 * would prove nothing.
 *
 * Ids are hardcoded and readable, matching the convention in
 * `./config` — runtime-created metrics use `newId('met')` instead.
 */

const HEAD_OF: Record<Id, Id> = {
  'dept-engineering': 'u-sai',
  'dept-product': 'u-aditya',
  'dept-marketing': 'u-rohan',
  'dept-sales': 'u-manish',
}

type Spec = Omit<Metric, 'archived'> & {
  /** How the seeded history is shaped: a centre, a spread, and an optional drift. */
  series?: { base: number; spread: number; drift?: number; integer?: boolean }
  /** Skip today's entry, so the demo has a department with numbers outstanding. */
  skipCurrent?: boolean
}

const spec = (
  id: string,
  name: string,
  departmentIds: Id[],
  rest: Partial<Spec> & Pick<Spec, 'unit' | 'cadence' | 'direction' | 'rollup'>,
): Spec => ({
  id,
  name,
  departmentIds,
  target: null,
  warnAt: null,
  ownerId: departmentIds[0] ? (HEAD_OF[departmentIds[0]] ?? null) : null,
  source: 'manual',
  inputIds: [],
  scale: null,
  ...rest,
})

const SPECS: Spec[] = [
  /* ---------------------------------------------------------------- *
   * Sales — the department whose spreadsheet started this
   * ---------------------------------------------------------------- */
  spec('met-sls-leads', 'New leads', ['dept-sales'], {
    unit: 'count', cadence: 'daily', direction: 'up-is-good', rollup: 'sum',
    target: 25, warnAt: 18, description: 'Leads created today, from any source.',
    series: { base: 24, spread: 9, integer: true },
  }),
  spec('met-sls-qualified', 'Qualified leads', ['dept-sales'], {
    unit: 'count', cadence: 'daily', direction: 'up-is-good', rollup: 'sum',
    target: 12, warnAt: 8, series: { base: 11, spread: 5, integer: true },
  }),
  spec('met-sls-demos', 'Demos booked', ['dept-sales'], {
    unit: 'count', cadence: 'daily', direction: 'up-is-good', rollup: 'sum',
    target: 6, warnAt: 4, series: { base: 5, spread: 3, integer: true },
  }),
  spec('met-sls-won', 'Deals won', ['dept-sales'], {
    unit: 'count', cadence: 'daily', direction: 'up-is-good', rollup: 'sum',
    target: 2, warnAt: 1, series: { base: 1.6, spread: 1.6, integer: true },
  }),
  spec('met-sls-conversion', 'Lead → won %', ['dept-sales'], {
    unit: 'percent', cadence: 'daily', direction: 'up-is-good', rollup: 'average',
    target: 8, warnAt: 5, source: 'ratio', inputIds: ['met-sls-won', 'met-sls-leads'], scale: 100,
    description: 'Deals won as a share of new leads. Computed, so it can never drift from the counts.',
  }),
  spec('met-sls-revenue', 'Revenue booked', ['dept-sales'], {
    unit: 'currency', cadence: 'weekly', direction: 'up-is-good', rollup: 'sum',
    target: 2_500_000, warnAt: 1_800_000, series: { base: 2_300_000, spread: 900_000, integer: true },
  }),

  /* ---------------------------------------------------------------- *
   * Marketing
   * ---------------------------------------------------------------- */
  spec('met-mkt-spend', 'Ad spend', ['dept-marketing'], {
    unit: 'currency', cadence: 'daily', direction: 'down-is-good', rollup: 'sum',
    target: 15_000, warnAt: 20_000, description: 'Spend across all paid channels.',
    series: { base: 16_500, spread: 5_000, integer: true },
  }),
  spec('met-mkt-mqls', 'MQLs', ['dept-marketing'], {
    unit: 'count', cadence: 'daily', direction: 'up-is-good', rollup: 'sum',
    target: 30, warnAt: 20, series: { base: 27, spread: 11, integer: true },
  }),
  spec('met-mkt-sessions', 'Site sessions', ['dept-marketing'], {
    unit: 'count', cadence: 'daily', direction: 'up-is-good', rollup: 'sum',
    target: 2_000, warnAt: 1_400, series: { base: 2_100, spread: 600, drift: 4, integer: true },
  }),
  spec('met-mkt-cpl', 'Cost per lead', ['dept-marketing'], {
    unit: 'currency', cadence: 'daily', direction: 'down-is-good', rollup: 'average',
    target: 500, warnAt: 800, source: 'ratio', inputIds: ['met-mkt-spend', 'met-mkt-mqls'],
    description: 'Spend ÷ MQLs. Lower is better, so the target reads as a ceiling.',
  }),
  spec('met-mkt-campaigns', 'Campaigns live', ['dept-marketing'], {
    unit: 'count', cadence: 'weekly', direction: 'up-is-good', rollup: 'last',
    target: 4, warnAt: 2, series: { base: 4, spread: 2, integer: true },
  }),

  /* ---------------------------------------------------------------- *
   * Engineering
   * ---------------------------------------------------------------- */
  spec('met-eng-deploys', 'Deploys', ['dept-engineering'], {
    unit: 'count', cadence: 'daily', direction: 'up-is-good', rollup: 'sum',
    target: 3, warnAt: 1, description: 'Production releases shipped today.',
    series: { base: 3.2, spread: 2.4, integer: true },
  }),
  spec('met-eng-incidents', 'P1 incidents', ['dept-engineering'], {
    unit: 'count', cadence: 'daily', direction: 'down-is-good', rollup: 'sum',
    target: 0, warnAt: 1, description: 'Customer-visible outages. The target is zero, so anything above it is off track.',
    series: { base: 0.3, spread: 0.9, integer: true },
  }),
  spec('met-eng-bugs', 'Open bugs', ['dept-engineering'], {
    unit: 'count', cadence: 'daily', direction: 'down-is-good', rollup: 'last',
    target: 20, warnAt: 30, series: { base: 26, spread: 7, drift: -0.1, integer: true },
  }),
  spec('met-eng-cycle', 'Cycle time', ['dept-engineering'], {
    unit: 'duration', cadence: 'weekly', direction: 'down-is-good', rollup: 'average',
    target: 48, warnAt: 72, series: { base: 55, spread: 20 },
  }),
  spec('met-eng-uptime', 'Uptime', ['dept-engineering'], {
    unit: 'percent', cadence: 'weekly', direction: 'up-is-good', rollup: 'average',
    target: 99.9, warnAt: 99.5, series: { base: 99.85, spread: 0.3 },
  }),

  /* ---------------------------------------------------------------- *
   * Product
   * ---------------------------------------------------------------- */
  spec('met-prd-interviews', 'Customer interviews', ['dept-product'], {
    unit: 'count', cadence: 'daily', direction: 'up-is-good', rollup: 'sum',
    target: 2, warnAt: 1, series: { base: 1.8, spread: 1.6, integer: true },
    skipCurrent: true,
  }),
  spec('met-prd-specs', 'Specs signed off', ['dept-product'], {
    unit: 'count', cadence: 'weekly', direction: 'up-is-good', rollup: 'sum',
    target: 3, warnAt: 2, series: { base: 2.6, spread: 1.8, integer: true },
  }),
  spec('met-prd-adoption', 'Feature adoption', ['dept-product'], {
    unit: 'percent', cadence: 'weekly', direction: 'up-is-good', rollup: 'average',
    target: 35, warnAt: 25, series: { base: 31, spread: 9 },
  }),
  spec('met-prd-activated', 'Activated accounts', ['dept-product'], {
    unit: 'count', cadence: 'weekly', direction: 'up-is-good', rollup: 'sum',
    target: 120, warnAt: 80, series: { base: 108, spread: 45, integer: true },
  }),
  spec('met-prd-new-accounts', 'New accounts', ['dept-product'], {
    unit: 'count', cadence: 'weekly', direction: 'up-is-good', rollup: 'sum',
    target: 300, warnAt: 220, series: { base: 290, spread: 70, integer: true },
  }),
  spec('met-prd-activation-rate', 'Activation rate', ['dept-product'], {
    unit: 'percent', cadence: 'weekly', direction: 'up-is-good', rollup: 'average',
    target: 40, warnAt: 30, source: 'ratio', inputIds: ['met-prd-activated', 'met-prd-new-accounts'], scale: 100,
  }),

  /* ---------------------------------------------------------------- *
   * Org-wide — an empty departmentIds means every department reports it
   * ---------------------------------------------------------------- */
  spec('met-org-nps', 'NPS', [], {
    unit: 'number', cadence: 'monthly', direction: 'up-is-good', rollup: 'last',
    target: 45, warnAt: 30, series: { base: 41, spread: 9 },
  }),
  spec('met-org-headcount', 'Headcount', [], {
    unit: 'count', cadence: 'monthly', direction: 'up-is-good', rollup: 'last',
    series: { base: 8, spread: 2, integer: true },
  }),
]

export const metrics: Metric[] = SPECS.map(({ series: _series, skipCurrent: _skip, ...metric }) => ({
  ...metric,
  archived: false,
}))

/** Which departments actually report a given metric. Org-wide metrics are reported by all four. */
const ALL_DEPARTMENTS = ['dept-engineering', 'dept-product', 'dept-marketing', 'dept-sales']

function reportingDepartments(metric: Spec): Id[] {
  return metric.departmentIds.length > 0 ? metric.departmentIds : ALL_DEPARTMENTS
}

/** How much history each cadence gets. Enough for a trend to be real, not so much that localStorage groans. */
const HISTORY: Record<string, number> = { daily: 60, weekly: 12, monthly: 6, quarterly: 4 }

/** The Critical Number each department is pushing this quarter. */
export function buildCriticalNumbers(now: Date): Record<Id, CriticalNumber> {
  const quarter = quarterOf(now)
  return {
    // Revenue rolls up as a sum, so the quarter's target is a quarter's
    // worth of weeks — not one week's number.
    'dept-sales': { quarter, metricId: 'met-sls-revenue', target: 30_000_000 },
    'dept-marketing': { quarter, metricId: 'met-mkt-cpl', target: 450 },
    'dept-engineering': { quarter, metricId: 'met-eng-uptime', target: 99.95 },
    'dept-product': { quarter, metricId: 'met-prd-activation-rate', target: 45 },
  }
}

export interface MetricSeed {
  entries: MetricEntry[]
}

/**
 * Reported history, deterministic given the same `now` so "Reset demo
 * data" reproduces the same scorecard.
 *
 * Two things are deliberate. Product's interview count has no entry for
 * the current period, so the demo has a department visibly behind on its
 * reporting; and computed metrics are never seeded, because a ratio is
 * derived on read and storing one would be the exact drift this design
 * exists to prevent.
 */
export function buildMetricSeed(now: Date): MetricSeed {
  const random = makeRandom(0x5c04eca7)
  const entries: MetricEntry[] = []

  for (const metric of SPECS) {
    if (metric.source !== 'manual' || !metric.series) continue

    const periods = periodsBack(metric.cadence, HISTORY[metric.cadence] ?? 30, now)
    const current = periodKey(metric.cadence, now)

    for (const [department, index] of reportingDepartments(metric).map((d, i) => [d, i] as const)) {
      // A little per-department offset, so four departments reporting the
      // same org-wide metric do not report identical numbers.
      const bias = 1 + (index - 1.5) * 0.06

      periods.forEach((periodStart, step) => {
        if (metric.skipCurrent && periodStart === current) return

        const { base, spread, drift = 0, integer } = metric.series!
        const trend = drift * (step - periods.length + 1)
        const raw = (base + trend + (random() - 0.5) * spread) * bias
        const value = Math.max(0, integer ? Math.round(raw) : Math.round(raw * 100) / 100)

        entries.push({
          id: `me-${metric.id}-${department}-${periodStart}`,
          metricId: metric.id,
          departmentId: department,
          periodStart,
          value,
          enteredBy: HEAD_OF[department] ?? 'u-sai',
          enteredAt: `${periodStart}T09:15:00.000Z`,
        })
      })
    }
  }

  return { entries }
}
