'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ChartNoAxesColumn, Plus } from 'lucide-react'
import type { EngineContext } from '@/lib/engine/context'
import {
  formatMetricValue,
  huddleScorecard,
  metricSeries,
  scorecardSummary,
} from '@/lib/engine/metrics'
import { formatPeriod, periodsBack, quarterOf } from '@/lib/engine/periods'
import { useMetrics, useRocks } from '@/lib/store/selectors'
import type { Department, Metric } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { CriticalNumberTile } from './critical-number'
import { HEALTH_STYLE, HealthChip, Trend } from './metric-health'
import { RockList } from './rock-list'
import { ScorecardGrid } from './scorecard-grid'
import { Sparkline } from './sparkline'
import { cn } from '@/lib/utils'

/**
 * A department's whole scorecard: the Critical Number, the quarter's
 * Rocks, the entry grid, then the trends.
 *
 * The order is the argument. Numbers first, then the commitments those
 * numbers are meant to move, then the place you keep them up to date —
 * which is the sequence a Scaling Up meeting runs in, and the reverse of
 * how a spreadsheet presents itself.
 */
export function DepartmentScorecard({ department, ctx }: { department: Department; ctx: EngineContext }) {
  const metrics = useMetrics(department.id)
  const quarter = quarterOf(ctx.now)
  const rocks = useRocks(department.id, quarter)

  const summary = useMemo(() => scorecardSummary(metrics, department.id, ctx), [metrics, department.id, ctx])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-5">
        <header className="flex flex-wrap items-center gap-2">
          <h1 className="text-sm font-semibold tracking-tight">Scorecard</h1>
          <div className="flex items-center gap-1.5">
            {summary.offTrack > 0 && <HealthChip health="off-track">{summary.offTrack} off track</HealthChip>}
            {summary.atRisk > 0 && <HealthChip health="at-risk">{summary.atRisk} at risk</HealthChip>}
            {summary.missing > 0 && <HealthChip health="not-reported">{summary.missing} not reported</HealthChip>}
            {summary.total > 0 && summary.offTrack === 0 && summary.atRisk === 0 && summary.missing === 0 && (
              <HealthChip health="on-track">All on track</HealthChip>
            )}
          </div>
          <Button asChild variant="ghost" size="sm" className="ml-auto text-[11px]">
            <Link href="/settings/metrics">
              <Plus className="size-3.5" />
              Metrics
            </Link>
          </Button>
        </header>

        <CriticalNumberTile department={department} ctx={ctx} metrics={metrics} />

        <RockList rocks={rocks} quarter={quarter} ctx={ctx} />

        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ChartNoAxesColumn className="size-3.5 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold">Numbers</h2>
            <span className="text-[11px] text-muted-foreground">
              Type straight into a cell, or paste a block from a spreadsheet.
            </span>
          </div>
          <ScorecardGrid departmentId={department.id} metrics={metrics} ctx={ctx} />
        </section>

        {metrics.length > 0 && <Trends departmentId={department.id} metrics={metrics} ctx={ctx} />}
      </div>
    </div>
  )
}

function Trends({ departmentId, metrics, ctx }: { departmentId: string; metrics: Metric[]; ctx: EngineContext }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[13px] font-semibold">Trends</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {metrics.map((metric) => {
          const periods = periodsBack(metric.cadence, metric.cadence === 'daily' ? 21 : 8, ctx.now)
          const series = metricSeries(metric, departmentId, periods, ctx)
          const latest = series[series.length - 1] ?? null

          return (
            <div key={metric.id} className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5">
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">{metric.name}</span>
                <span className="text-[15px] font-semibold tabular-nums">
                  {formatMetricValue(latest, metric.unit)}
                </span>
              </div>
              <Sparkline metric={metric} series={series} periods={periods} />
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * What a department brings to the huddle.
 *
 * Only the numbers that need a conversation: off track, at risk, then
 * anything nobody has reported. Reading out the green ones is the
 * meeting habit this product exists to shorten, so they are not here.
 */
export function HuddleScorecard({ department, ctx }: { department: Department; ctx: EngineContext }) {
  const metrics = useMetrics(department.id)
  const readings = useMemo(() => huddleScorecard(metrics, department.id, ctx), [metrics, department.id, ctx])
  const summary = useMemo(() => scorecardSummary(metrics, department.id, ctx), [metrics, department.id, ctx])

  const criticalNumber = department.criticalNumber
  const critical = criticalNumber ? ctx.metrics[criticalNumber.metricId] : undefined

  if (metrics.length === 0) return null

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-card/60 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[12px] font-semibold">Scorecard</h3>
        {summary.onTrack > 0 && (
          <span className="text-[11px] text-muted-foreground">{summary.onTrack} on track</span>
        )}
        {critical && criticalNumber && (
          <span className="ml-auto text-[11px] text-muted-foreground">
            Critical Number ·{' '}
            <span className="font-medium text-foreground">
              {critical.name} {critical.direction === 'up-is-good' ? '≥' : '≤'}{' '}
              {formatMetricValue(criticalNumber.target, critical.unit)}
            </span>
          </span>
        )}
      </div>

      {readings.length === 0 ? (
        <p className="text-[12px] text-unblocked">Every number on track.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {readings.map((reading) => {
            const periods = periodsBack(reading.metric.cadence, 8, ctx.now)
            const series = metricSeries(reading.metric, department.id, periods, ctx)

            return (
              <li key={reading.metric.id} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-accent/40">
                <span
                  className={cn('size-1.5 shrink-0 rounded-full', HEALTH_STYLE[reading.health].dot)}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-[12px]">{reading.metric.name}</span>

                <Sparkline
                  metric={reading.metric}
                  series={series}
                  periods={periods}
                  height={16}
                  className="hidden w-20 sm:flex"
                />

                <span className={cn('text-[12px] font-medium tabular-nums', HEALTH_STYLE[reading.health].text)}>
                  {formatMetricValue(reading.value, reading.metric.unit)}
                </span>
                {reading.metric.target !== null && (
                  <span className="w-14 text-right text-[10px] tabular-nums text-muted-foreground">
                    {reading.metric.direction === 'up-is-good' ? '≥' : '≤'}{' '}
                    {formatMetricValue(reading.metric.target, reading.metric.unit)}
                  </span>
                )}
                <Trend improvement={reading.improvement} />
              </li>
            )
          })}
        </ul>
      )}

      {summary.missing > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {summary.missing} {summary.missing === 1 ? 'number has' : 'numbers have'} not been reported for{' '}
          {formatPeriod('daily', periodsBack('daily', 1, ctx.now)[0] ?? '')}.
        </p>
      )}
    </section>
  )
}
