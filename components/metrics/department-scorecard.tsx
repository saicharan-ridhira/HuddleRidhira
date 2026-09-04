'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChartNoAxesColumn, Plus, Target } from 'lucide-react'
import type { EngineContext } from '@/lib/engine/context'
import {
  formatMetricValue,
  huddleScorecard,
  metricHealth,
  metricReading,
  metricSeries,
  rollupSeries,
  scorecardSummary,
} from '@/lib/engine/metrics'
import { periodsBack, quarterOf, quarterProgress } from '@/lib/engine/periods'
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
 * The numbers a department brings to the huddle.
 *
 * Off track first, then at risk, then anything nobody reported. The
 * on-track ones are counted but not listed — a meeting that reads every
 * green number aloud is the meeting this product exists to shorten, and
 * they are one click away for the turn where somebody asks.
 *
 * Every row states its target beside its value, because a number without
 * one is trivia. That pairing is the whole content of this section: the
 * room is deciding whether a gap needs an action, and it cannot do that
 * from the value alone.
 */
export function HuddleScorecard({ department, ctx }: { department: Department; ctx: EngineContext }) {
  const metrics = useMetrics(department.id)
  const [showAll, setShowAll] = useState(false)

  const summary = useMemo(() => scorecardSummary(metrics, department.id, ctx), [metrics, department.id, ctx])
  const attention = useMemo(() => huddleScorecard(metrics, department.id, ctx), [metrics, department.id, ctx])
  const all = useMemo(
    () => metrics.map((metric) => metricReading(metric, department.id, ctx)),
    [metrics, department.id, ctx],
  )

  const criticalNumber = department.criticalNumber
  const critical = criticalNumber ? ctx.metrics[criticalNumber.metricId] : undefined

  if (metrics.length === 0) return null

  // The Critical Number has its own band directly above; repeating it in
  // the list below would spend two of the section's few lines saying one
  // thing.
  const rows = (showAll ? all : attention).filter((reading) => reading.metric.id !== criticalNumber?.metricId)

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[13px] font-semibold">Numbers</h3>
        <span className="text-[11px] text-muted-foreground">
          {summary.offTrack > 0 && <span className="font-medium text-blocked">{summary.offTrack} off track</span>}
          {summary.offTrack > 0 && (summary.atRisk > 0 || summary.missing > 0) && ' · '}
          {summary.atRisk > 0 && <span className="font-medium text-overdue">{summary.atRisk} at risk</span>}
          {summary.atRisk > 0 && summary.missing > 0 && ' · '}
          {summary.missing > 0 && `${summary.missing} not reported`}
          {attention.length === 0 && <span className="text-unblocked">All {summary.total} on track</span>}
        </span>

        {attention.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((previous) => !previous)}
            className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
          >
            {showAll ? 'Only what needs attention' : `Show all ${summary.total}`}
          </button>
        )}
      </div>

      {critical && criticalNumber && (
        <CriticalNumberLine department={department} metric={critical} criticalNumber={criticalNumber} ctx={ctx} />
      )}

      {rows.length > 0 && (
        <ul className="flex flex-col overflow-hidden rounded-md border border-border bg-card">
          {rows.map((reading) => {
            const periods = periodsBack(reading.metric.cadence, 10, ctx.now)
            const series = metricSeries(reading.metric, department.id, periods, ctx)

            return (
              <li
                key={reading.metric.id}
                className="flex h-8 items-center gap-2 border-b border-border px-2.5 last:border-b-0"
              >
                <span className={cn('size-1.5 shrink-0 rounded-full', HEALTH_STYLE[reading.health].dot)} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[12px]">{reading.metric.name}</span>

                <Sparkline
                  metric={reading.metric}
                  series={series}
                  periods={periods}
                  height={14}
                  mono
                  className="hidden w-16 shrink-0 sm:flex"
                />

                <span
                  className={cn(
                    'w-20 shrink-0 text-right text-[12px] font-semibold tabular-nums',
                    HEALTH_STYLE[reading.health].text,
                  )}
                >
                  {formatMetricValue(reading.value, reading.metric.unit)}
                </span>

                {/* The target, always next to the value. A number on its
                    own cannot tell the room whether to do anything. */}
                <span className="w-20 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                  {reading.metric.target === null
                    ? '—'
                    : `${reading.metric.direction === 'up-is-good' ? '≥' : '≤'} ${formatMetricValue(reading.metric.target, reading.metric.unit)}`}
                </span>

                <Trend improvement={reading.improvement} className="w-5 shrink-0 justify-end" />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** The one number the department is pushing this quarter, on one line. */
function CriticalNumberLine({
  department,
  metric,
  criticalNumber,
  ctx,
}: {
  department: Department
  metric: Metric
  criticalNumber: NonNullable<Department['criticalNumber']>
  ctx: EngineContext
}) {
  const periods = periodsBack(metric.cadence, quarterPeriodCount(metric.cadence, ctx.now), ctx.now)
  const achieved = rollupSeries(metric, metricSeries(metric, department.id, periods, ctx))
  const health = metricHealth({ ...metric, target: criticalNumber.target }, achieved)
  const pace = quarterProgress(ctx.now)

  const share =
    achieved === null || criticalNumber.target === 0
      ? null
      : metric.direction === 'up-is-good'
        ? achieved / criticalNumber.target
        : criticalNumber.target / (achieved || criticalNumber.target)

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-md border border-border bg-card px-2.5 py-2">
      <Target className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Critical number</span>
      <span className="text-[12px]">{metric.name}</span>

      <span className={cn('text-[15px] font-semibold tabular-nums', HEALTH_STYLE[health].text)}>
        {formatMetricValue(achieved, metric.unit)}
      </span>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        of {formatMetricValue(criticalNumber.target, metric.unit)}
      </span>

      {share !== null && (
        <span className="ml-auto flex items-center gap-2">
          <span className="relative h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-muted">
            <span
              className={cn('block h-full rounded-full', HEALTH_STYLE[health].dot)}
              style={{ width: `${Math.min(100, Math.max(0, share * 100))}%` }}
            />
            {/* Where the quarter is. Being at 60% of the number means
                nothing until you know whether 40% or 90% of the time is
                gone — so the pace marker sits on the same bar. */}
            <span
              className="absolute inset-y-0 w-px bg-foreground/60"
              style={{ left: `${pace * 100}%` }}
              title={`${Math.round(pace * 100)}% of the quarter elapsed`}
            />
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {Math.round(share * 100)}% · {Math.round(pace * 100)}% of Q
          </span>
        </span>
      )}
    </div>
  )
}

/** How many of the metric's own periods have elapsed this quarter. */
function quarterPeriodCount(cadence: Metric['cadence'], now: Date): number {
  const elapsedDays = Math.max(1, Math.ceil(quarterProgress(now) * 92))
  switch (cadence) {
    case 'daily':
      return elapsedDays
    case 'weekly':
      return Math.max(1, Math.ceil(elapsedDays / 7))
    case 'monthly':
      return Math.max(1, Math.ceil(elapsedDays / 31))
    case 'quarterly':
      return 1
  }
}
