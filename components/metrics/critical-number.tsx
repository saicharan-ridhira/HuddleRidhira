'use client'

import { useState } from 'react'
import { Target } from 'lucide-react'
import type { EngineContext } from '@/lib/engine/context'
import { formatMetricValue, metricHealth, metricSeries, rollupSeries } from '@/lib/engine/metrics'
import { formatQuarter, periodsBack, quarterOf, quarterProgress } from '@/lib/engine/periods'
import { metricService } from '@/lib/services'
import { METRIC_ROLLUP_LABEL, type Department, type Metric } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EntityDialog, Field } from '@/components/settings/entity-dialog'
import { HEALTH_STYLE } from './metric-health'
import { Sparkline } from './sparkline'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/**
 * The one number this department is pushing this quarter.
 *
 * Its entire value is that there is exactly one. A department with six
 * priorities has none, so this is a single tile rather than a list, and
 * the quarter's target may be more ambitious than the metric's standing
 * one — that gap is the point.
 */
export function CriticalNumberTile({
  department,
  ctx,
  metrics,
}: {
  department: Department
  ctx: EngineContext
  metrics: Metric[]
}) {
  const [editing, setEditing] = useState(false)
  const quarter = quarterOf(ctx.now)
  const criticalNumber = department.criticalNumber
  const metric = criticalNumber ? ctx.metrics[criticalNumber.metricId] : undefined

  if (!criticalNumber || !metric) {
    return (
      <>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border px-4 py-5 text-left transition-colors hover:bg-accent/40"
        >
          <Target className="size-4 text-muted-foreground" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium">Name a Critical Number for {formatQuarter(quarter)}</span>
            <span className="text-[11px] text-muted-foreground">
              One metric this department is pushing above all the others.
            </span>
          </div>
        </button>
        <CriticalNumberDialog
          open={editing}
          onOpenChange={setEditing}
          department={department}
          metrics={metrics}
          ctx={ctx}
        />
      </>
    )
  }

  // Progress is measured across the whole quarter, not the metric's own
  // period — a Critical Number is a quarterly commitment.
  const periods = periodsBack(metric.cadence, quarterPeriods(metric, ctx), ctx.now)
  const series = metricSeries(metric, department.id, periods, ctx)
  const achieved = rollupSeries(metric, series)
  const health = metricHealth({ ...metric, target: criticalNumber.target }, achieved)
  const pace = quarterProgress(ctx.now)

  const share =
    achieved === null || criticalNumber.target === 0
      ? null
      : metric.direction === 'up-is-good'
        ? achieved / criticalNumber.target
        : criticalNumber.target / (achieved || criticalNumber.target)

  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Target className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Critical Number · {formatQuarter(criticalNumber.quarter)}
          </span>
          <Button variant="ghost" size="sm" className="ml-auto h-6 text-[11px]" onClick={() => setEditing(true)}>
            Change
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] text-muted-foreground">
              {metric.name} · {METRIC_ROLLUP_LABEL[metric.rollup].toLowerCase()} this quarter
            </span>
            <span className={cn('text-2xl font-semibold tabular-nums', HEALTH_STYLE[health].text)}>
              {formatMetricValue(achieved, metric.unit)}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 pb-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Target</span>
            <span className="text-[13px] font-medium tabular-nums">
              {formatMetricValue(criticalNumber.target, metric.unit)}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 pb-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Quarter elapsed</span>
            <span className="text-[13px] font-medium tabular-nums">{Math.round(pace * 100)}%</span>
          </div>

          <Sparkline
            metric={{ ...metric, target: null }}
            series={series}
            periods={periods}
            className="ml-auto w-40"
          />
        </div>

        {share !== null && (
          <div className="flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className={cn('block h-full rounded-full', HEALTH_STYLE[health].dot)}
                style={{ width: `${Math.min(100, Math.max(0, share * 100))}%` }}
              />
            </span>
            {/* The comparison that matters is against the calendar, not
                against zero: 60% of the number with 80% of the quarter
                gone is behind, however good 60% looks on its own. */}
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {Math.round(share * 100)}% of target
            </span>
          </div>
        )}
      </div>

      <CriticalNumberDialog
        open={editing}
        onOpenChange={setEditing}
        department={department}
        metrics={metrics}
        ctx={ctx}
      />
    </>
  )
}

/** How many of the metric's own periods fit in a quarter. */
function quarterPeriods(metric: Metric, ctx: EngineContext): number {
  const elapsed = Math.max(1, Math.ceil(quarterProgress(ctx.now) * 92))
  switch (metric.cadence) {
    case 'daily':
      return elapsed
    case 'weekly':
      return Math.max(1, Math.ceil(elapsed / 7))
    case 'monthly':
      return Math.max(1, Math.ceil(elapsed / 31))
    case 'quarterly':
      return 1
  }
}

function CriticalNumberDialog({
  open,
  onOpenChange,
  department,
  metrics,
  ctx,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  department: Department
  metrics: Metric[]
  ctx: EngineContext
}) {
  const quarter = quarterOf(ctx.now)
  const [metricId, setMetricId] = useState(department.criticalNumber?.metricId ?? metrics[0]?.id ?? '')
  const [target, setTarget] = useState(String(department.criticalNumber?.target ?? ''))

  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setMetricId(department.criticalNumber?.metricId ?? metrics[0]?.id ?? '')
      setTarget(String(department.criticalNumber?.target ?? metrics[0]?.target ?? ''))
    }
  }

  const selected = ctx.metrics[metricId]

  return (
    <EntityDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Critical Number for ${formatQuarter(quarter)}`}
      description="The single metric this department is pushing this quarter."
      submitLabel="Set"
      canSubmit={Boolean(metricId && target.trim() && !Number.isNaN(Number(target)))}
      onSubmit={() => {
        metricService.setCriticalNumber(department.id, { quarter, metricId, target: Number(target) })
        onOpenChange(false)
        toast.success('Critical Number set', { description: ctx.metrics[metricId]?.name })
      }}
    >
      <Field label="Metric">
        <Select value={metricId} onValueChange={setMetricId}>
          <SelectTrigger size="sm" className="w-full">
            <SelectValue placeholder="Pick a metric" />
          </SelectTrigger>
          <SelectContent>
            {metrics.map((metric) => (
              <SelectItem key={metric.id} value={metric.id}>
                {metric.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Quarter target"
        htmlFor="cn-target"
        hint={
          selected
            ? `${selected.direction === 'up-is-good' ? 'Higher is better' : 'Lower is better'}. Standing target: ${formatMetricValue(selected.target, selected.unit)}.`
            : undefined
        }
      >
        <Input
          id="cn-target"
          inputMode="decimal"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder="0"
        />
      </Field>

      {department.criticalNumber && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start text-[11px] text-muted-foreground"
          onClick={() => {
            metricService.setCriticalNumber(department.id, null)
            onOpenChange(false)
            toast.success('Critical Number cleared')
          }}
        >
          Clear the Critical Number
        </Button>
      )}
    </EntityDialog>
  )
}
