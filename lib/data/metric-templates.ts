import type { Metric } from '@/lib/types'

/**
 * The starting library.
 *
 * A blank "create a metric" form is a wall — the hardest part of moving
 * off a spreadsheet is not the tool, it is deciding what to measure.
 * These are the metrics an operating scorecard usually starts from, one
 * click to install and free to edit afterwards.
 *
 * Each set deliberately includes at least one *computed* metric, because
 * a conversion rate or a cost per lead is exactly the number people
 * currently keep in a separate cell and let drift away from the counts
 * it is made of.
 */

/** A definition without an id — ids are minted when it is installed into a department. */
export type MetricTemplate = Omit<Metric, 'id' | 'departmentIds' | 'inputIds' | 'archived'> & {
  /** Stable within a template set, used to wire a computed metric to its inputs. */
  key: string
  /** Keys of the inputs, resolved to real ids at install time. */
  inputKeys?: string[]
}

export interface MetricTemplateSet {
  key: string
  name: string
  description: string
  /** lucide icon name, resolved through lib/icons.ts */
  icon: string
  metrics: MetricTemplate[]
}

const manual = (
  key: string,
  name: string,
  overrides: Partial<MetricTemplate> = {},
): MetricTemplate => ({
  key,
  name,
  unit: 'count',
  cadence: 'daily',
  direction: 'up-is-good',
  rollup: 'sum',
  target: null,
  warnAt: null,
  ownerId: null,
  source: 'manual',
  scale: null,
  ...overrides,
})

export const METRIC_TEMPLATE_SETS: MetricTemplateSet[] = [
  {
    key: 'sales',
    name: 'Sales',
    description: 'Pipeline from lead through close, plus the conversion rate that ties them together.',
    icon: 'TrendingUp',
    metrics: [
      manual('leads', 'New leads', { target: 25, warnAt: 18, description: 'Leads created today, from any source.' }),
      manual('qualified', 'Qualified leads', { target: 12, warnAt: 8, description: 'Leads that met the qualification criteria.' }),
      manual('demos', 'Demos booked', { target: 6, warnAt: 4 }),
      manual('proposals', 'Proposals sent', { target: 4, warnAt: 2 }),
      manual('won', 'Deals won', { target: 2, warnAt: 1 }),
      manual('revenue', 'Revenue booked', {
        unit: 'currency',
        cadence: 'weekly',
        target: 2_500_000,
        warnAt: 1_800_000,
        description: 'Value of contracts signed this week.',
      }),
      {
        ...manual('conversion', 'Lead → won %', {
          unit: 'percent',
          rollup: 'average',
          target: 8,
          warnAt: 5,
          source: 'ratio',
          scale: 100,
          description: 'Deals won as a share of new leads, computed so it can never drift from the counts.',
        }),
        inputKeys: ['won', 'leads'],
      },
      {
        ...manual('deal-size', 'Average deal size', {
          unit: 'currency',
          cadence: 'weekly',
          rollup: 'average',
          source: 'ratio',
          target: 400_000,
        }),
        inputKeys: ['revenue', 'won'],
      },
    ],
  },
  {
    key: 'marketing',
    name: 'Marketing',
    description: 'Spend, reach and the cost of a lead — the numbers a campaign is judged on.',
    icon: 'Megaphone',
    metrics: [
      manual('spend', 'Ad spend', {
        unit: 'currency',
        target: 15_000,
        warnAt: 20_000,
        direction: 'down-is-good',
        description: 'Spend across all paid channels today.',
      }),
      manual('impressions', 'Impressions', { target: 40_000, warnAt: 25_000 }),
      manual('sessions', 'Site sessions', { target: 2_000, warnAt: 1_400 }),
      manual('mqls', 'MQLs', { target: 30, warnAt: 20, description: 'Marketing-qualified leads handed to sales.' }),
      manual('campaigns', 'Campaigns live', { cadence: 'weekly', rollup: 'last', target: 4, warnAt: 2 }),
      {
        ...manual('cpl', 'Cost per lead', {
          unit: 'currency',
          rollup: 'average',
          direction: 'down-is-good',
          target: 500,
          warnAt: 800,
          source: 'ratio',
          description: 'Spend divided by MQLs. Lower is better, so the target reads as a ceiling.',
        }),
        inputKeys: ['spend', 'mqls'],
      },
    ],
  },
  {
    key: 'engineering',
    name: 'Engineering & Product',
    description: 'Throughput, quality and the incidents that interrupt both.',
    icon: 'Code2',
    metrics: [
      manual('deploys', 'Deploys', { target: 3, warnAt: 1, description: 'Production releases shipped today.' }),
      manual('shipped', 'Stories shipped', { target: 4, warnAt: 2 }),
      manual('bugs-open', 'Open bugs', { rollup: 'last', direction: 'down-is-good', target: 20, warnAt: 30 }),
      manual('incidents', 'P1 incidents', {
        direction: 'down-is-good',
        target: 0,
        warnAt: 1,
        description: 'Customer-visible outages. The target is zero, so any number above it is off track.',
      }),
      manual('cycle-time', 'Cycle time', {
        unit: 'duration',
        cadence: 'weekly',
        rollup: 'average',
        direction: 'down-is-good',
        target: 48,
        warnAt: 72,
      }),
      manual('uptime', 'Uptime', { unit: 'percent', cadence: 'weekly', rollup: 'average', target: 99.9, warnAt: 99.5 }),
    ],
  },
  {
    key: 'universal',
    name: 'Every department',
    description: 'The handful that mean the same thing wherever they are tracked.',
    icon: 'Building2',
    metrics: [
      manual('headcount', 'Headcount', { cadence: 'monthly', rollup: 'last', target: null }),
      manual('cash-collected', 'Cash collected', { unit: 'currency', cadence: 'weekly', target: 1_000_000 }),
      manual('nps', 'NPS', { unit: 'number', cadence: 'monthly', rollup: 'last', target: 45, warnAt: 30 }),
      manual('attendance', 'Huddle attendance', { unit: 'percent', cadence: 'weekly', rollup: 'average', target: 90, warnAt: 75 }),
    ],
  },
]

export function templateSet(key: string): MetricTemplateSet | undefined {
  return METRIC_TEMPLATE_SETS.find((set) => set.key === key)
}
