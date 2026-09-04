'use client'

import type { Metric, MetricCadence } from '@/lib/types'
import { formatMetricValue, metricHealth } from '@/lib/engine/metrics'
import { formatPeriod } from '@/lib/engine/periods'
import { HEALTH_STYLE } from './metric-health'
import { cn } from '@/lib/utils'

/**
 * A trend, drawn as bars rather than a line.
 *
 * No chart library: this repository has none, and adding one for a
 * 40-pixel graphic would be the first dependency of its kind and would
 * look foreign against the rest of the interface. Bars also survive gaps
 * honestly — a missing day is simply absent, where a line would
 * interpolate straight through it and invent a number nobody reported.
 */
export function Sparkline({
  metric,
  series,
  periods,
  height = 36,
  mono = false,
  className,
}: {
  metric: Metric
  series: (number | null)[]
  periods: string[]
  height?: number
  /**
   * One muted colour for every bar instead of per-bar health.
   *
   * Where the value and its target already sit beside the chart, ten
   * red bars say nothing the number has not already said — they just
   * add heat. In that context the sparkline's only job is shape.
   */
  mono?: boolean
  className?: string
}) {
  const values = series.filter((value): value is number => value !== null)
  if (values.length === 0) {
    return <div className={cn('flex items-center text-[11px] text-muted-foreground', className)}>No data yet</div>
  }

  const max = Math.max(...values, metric.target ?? 0)
  const min = Math.min(...values, 0)
  const span = max - min || 1

  // Where the target line sits, as a share of the plot height.
  const targetRatio = metric.target === null ? null : (metric.target - min) / span

  return (
    <div className={cn('relative flex items-end gap-px', className)} style={{ height }}>
      {targetRatio !== null && targetRatio >= 0 && targetRatio <= 1 && (
        <span
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/40"
          style={{ bottom: `${targetRatio * 100}%` }}
          title={`Target ${formatMetricValue(metric.target, metric.unit)}`}
        />
      )}

      {series.map((value, index) => {
        const period = periods[index] ?? ''
        if (value === null) {
          return (
            <span
              key={period || index}
              className="flex-1 self-end border-b border-dashed border-muted-foreground/30"
              title={`${label(metric.cadence, period)} — not reported`}
            />
          )
        }

        const ratio = (value - min) / span
        return (
          <span
            key={period || index}
            className={cn(
              'flex-1 rounded-t-[1px]',
              mono ? 'bg-muted-foreground/35' : HEALTH_STYLE[metricHealth(metric, value)].dot,
            )}
            // A floor of 2px so a genuine zero still draws something —
            // an invisible bar reads as missing data, which it is not.
            style={{ height: `${Math.max(2, ratio * height)}px` }}
            title={`${label(metric.cadence, period)} — ${formatMetricValue(value, metric.unit)}`}
          />
        )
      })}
    </div>
  )
}

function label(cadence: MetricCadence, period: string): string {
  return period ? formatPeriod(cadence, period) : ''
}
