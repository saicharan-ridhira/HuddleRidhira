'use client'

import { useMemo, useRef, useState } from 'react'
import { Sigma } from 'lucide-react'
import type { EngineContext } from '@/lib/engine/context'
import { formatMetricValue, formulaOf, metricHealth, metricValue } from '@/lib/engine/metrics'
import { formatPeriod, formatPeriodShort, periodKey, periodsBack } from '@/lib/engine/periods'
import { metricService } from '@/lib/services'
import {
  METRIC_CADENCE_LABEL,
  type Id,
  type Metric,
  type MetricCadence,
} from '@/lib/types'
import { UserAvatar } from '@/components/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HEALTH_STYLE, HealthDot } from './metric-health'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/**
 * Data entry, shaped like the thing it replaces.
 *
 * The one real advantage a spreadsheet has is that filling it in is
 * fast: rows down the side, days across the top, tab and type. A form
 * per metric per day would be more "designed" and would send everybody
 * straight back to Excel, so this is a grid — keyboard-navigable, with
 * Enter moving *down* the way a spreadsheet does, and accepting a paste
 * of real cells off the clipboard.
 */

/** How many periods each cadence shows at a time. */
const WINDOW: Record<MetricCadence, number> = { daily: 14, weekly: 8, monthly: 6, quarterly: 4 }

export function ScorecardGrid({
  departmentId,
  metrics,
  ctx,
}: {
  departmentId: Id
  metrics: Metric[]
  ctx: EngineContext
}) {
  const byCadence = useMemo(() => {
    const groups = new Map<MetricCadence, Metric[]>()
    for (const metric of metrics) {
      const list = groups.get(metric.cadence)
      if (list) list.push(metric)
      else groups.set(metric.cadence, [metric])
    }
    return groups
  }, [metrics])

  if (metrics.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-[12px] text-muted-foreground">
        No metrics defined for this department yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {(['daily', 'weekly', 'monthly', 'quarterly'] as MetricCadence[]).map((cadence) => {
        const group = byCadence.get(cadence)
        if (!group || group.length === 0) return null
        return <CadenceGrid key={cadence} cadence={cadence} metrics={group} departmentId={departmentId} ctx={ctx} />
      })}
    </div>
  )
}

function CadenceGrid({
  cadence,
  metrics,
  departmentId,
  ctx,
}: {
  cadence: MetricCadence
  metrics: Metric[]
  departmentId: Id
  ctx: EngineContext
}) {
  const [count, setCount] = useState(WINDOW[cadence])
  const periods = useMemo(() => periodsBack(cadence, count, ctx.now), [cadence, count, ctx.now])
  const current = periodKey(cadence, ctx.now)
  const gridRef = useRef<HTMLDivElement>(null)

  // Scoped to this cadence's grid, and namespaced by cadence, so the
  // daily and weekly tables cannot answer for each other's cells.
  const cellId = (row: number, column: number) => `${cadence}:${row}:${column}`

  const move = (row: number, column: number) => {
    const next = gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${cellId(row, column)}"]`)
    next?.focus()
    next?.select()
  }

  /**
   * A block pasted out of a spreadsheet, filled in from the focused
   * cell. This is the migration path — three months of history arrive in
   * one action instead of four hundred keystrokes.
   */
  const handlePaste = (event: React.ClipboardEvent, row: number, column: number) => {
    const text = event.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.includes('\n')) return

    event.preventDefault()

    const rows = text.replace(/\r/g, '').replace(/\n+$/, '').split('\n')
    const cells: { metricId: Id; period: string; value: number | null }[] = []

    rows.forEach((line, rowOffset) => {
      const metric = metrics[row + rowOffset]
      if (!metric || metric.source !== 'manual') return

      line.split('\t').forEach((raw, columnOffset) => {
        const period = periods[column + columnOffset]
        if (!period) return

        const trimmed = raw.trim()
        // Tolerate what a spreadsheet actually puts on the clipboard:
        // thousands separators, currency symbols, a trailing percent.
        const parsed = trimmed === '' ? null : Number(trimmed.replace(/[,₹$€£%\s]/g, ''))
        if (parsed !== null && Number.isNaN(parsed)) return

        cells.push({ metricId: metric.id, period, value: parsed })
      })
    })

    if (cells.length === 0) return

    metricService.setEntries(departmentId, cells)
    toast.success(`Pasted ${cells.length} ${cells.length === 1 ? 'value' : 'values'}`)
  }

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <h3 className="text-[12px] font-semibold">{METRIC_CADENCE_LABEL[cadence]}</h3>
        <span className="text-[11px] text-muted-foreground">
          {metrics.length} {metrics.length === 1 ? 'metric' : 'metrics'}
        </span>
        <Select value={String(count)} onValueChange={(value) => setCount(Number(value))}>
          <SelectTrigger size="sm" className="ml-auto w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[WINDOW[cadence], WINDOW[cadence] * 2, WINDOW[cadence] * 4].map((option) => (
              <SelectItem key={option} value={String(option)}>
                Last {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div ref={gridRef} className="overflow-x-auto rounded-lg border border-border scrollbar-thin">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="sticky left-0 z-10 min-w-56 bg-muted/40 px-3 py-1.5 text-left font-medium backdrop-blur">
                Metric
              </th>
              {periods.map((period) => (
                <th
                  key={period}
                  className={cn(
                    'min-w-16 px-1 py-1.5 text-center text-[11px] font-medium tabular-nums text-muted-foreground',
                    period === current && 'bg-primary/10 text-foreground',
                  )}
                  title={formatPeriod(cadence, period)}
                >
                  {formatPeriodShort(cadence, period)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, row) => (
              <MetricRow
                key={metric.id}
                metric={metric}
                row={row}
                rowCount={metrics.length}
                periods={periods}
                current={current}
                departmentId={departmentId}
                ctx={ctx}
                cellId={cellId}
                onMove={move}
                onPaste={handlePaste}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MetricRow({
  metric,
  row,
  rowCount,
  periods,
  current,
  departmentId,
  ctx,
  cellId,
  onMove,
  onPaste,
}: {
  metric: Metric
  row: number
  rowCount: number
  periods: string[]
  current: string
  departmentId: Id
  ctx: EngineContext
  cellId: (row: number, column: number) => string
  onMove: (row: number, column: number) => void
  onPaste: (event: React.ClipboardEvent, row: number, column: number) => void
}) {
  const owner = metric.ownerId ? ctx.users[metric.ownerId] : undefined
  const formula = formulaOf(metric, ctx)
  const computed = metric.source !== 'manual'

  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-accent/20">
      <th
        scope="row"
        className="sticky left-0 z-10 min-w-56 bg-background px-3 py-1 text-left font-normal"
      >
        <div className="flex items-center gap-1.5">
          {computed && <Sigma className="size-3 shrink-0 text-muted-foreground" />}
          <span className="truncate font-medium" title={metric.description ?? metric.name}>
            {metric.name}
          </span>
          {owner && <UserAvatar user={owner} size="xs" />}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {metric.target !== null && (
            <span className="tabular-nums">
              {metric.direction === 'up-is-good' ? '≥' : '≤'} {formatMetricValue(metric.target, metric.unit)}
            </span>
          )}
          {formula && <span className="truncate">{formula}</span>}
        </div>
      </th>

      {periods.map((period, column) => (
        <Cell
          key={period}
          metric={metric}
          period={period}
          isCurrent={period === current}
          departmentId={departmentId}
          ctx={ctx}
          row={row}
          column={column}
          rowCount={rowCount}
          columnCount={periods.length}
          cellId={cellId}
          onMove={onMove}
          onPaste={onPaste}
        />
      ))}
    </tr>
  )
}

function Cell({
  metric,
  period,
  isCurrent,
  departmentId,
  ctx,
  row,
  column,
  rowCount,
  columnCount,
  cellId,
  onMove,
  onPaste,
}: {
  metric: Metric
  period: string
  isCurrent: boolean
  departmentId: Id
  ctx: EngineContext
  row: number
  column: number
  rowCount: number
  columnCount: number
  cellId: (row: number, column: number) => string
  onMove: (row: number, column: number) => void
  onPaste: (event: React.ClipboardEvent, row: number, column: number) => void
}) {
  const value = metricValue(metric, departmentId, period, ctx)
  const health = metricHealth(metric, value)
  const computed = metric.source !== 'manual'

  const [draft, setDraft] = useState(value === null ? '' : String(value))
  const [editing, setEditing] = useState(false)
  const skipCommit = useRef(false)

  // Adjusted during render rather than in an effect, so a value changed
  // elsewhere — a pasted block, a corrected input — shows immediately
  // without the cell painting one frame of the old number.
  const [syncedValue, setSyncedValue] = useState(value)
  if (value !== syncedValue && !editing) {
    setSyncedValue(value)
    setDraft(value === null ? '' : String(value))
  }

  if (computed) {
    return (
      <td
        className={cn(
          'px-1 py-1 text-center text-[12px] tabular-nums',
          HEALTH_STYLE[health].cell,
          isCurrent && 'ring-1 ring-inset ring-primary/25',
        )}
        title={`${metric.name} — ${formatPeriod(metric.cadence, period)} (computed)`}
      >
        <span className={value === null ? 'text-muted-foreground' : ''}>{formatMetricValue(value, metric.unit)}</span>
      </td>
    )
  }

  const commit = () => {
    setEditing(false)

    // A paste has just rewritten this cell from the clipboard. The draft
    // still holds what was here before, and committing it on the way out
    // would silently undo the very value that was just pasted in.
    if (skipCommit.current) {
      skipCommit.current = false
      return
    }

    const trimmed = draft.trim()

    if (trimmed === '') {
      if (value !== null) metricService.clearEntry(metric.id, departmentId, period)
      return
    }

    const parsed = Number(trimmed.replace(/[,₹$€£%\s]/g, ''))
    if (Number.isNaN(parsed)) {
      setDraft(value === null ? '' : String(value))
      return
    }
    if (parsed === value) return

    metricService.setEntry(metric.id, departmentId, period, parsed)
  }

  return (
    <td
      className={cn(
        'p-0',
        HEALTH_STYLE[health].cell,
        isCurrent && 'ring-1 ring-inset ring-primary/25',
      )}
    >
      <input
        data-cell={cellId(row, column)}
        inputMode="decimal"
        value={draft}
        // An em dash, never a 0 — the placeholder has to say "nobody
        // reported" rather than suggest a number that was never given.
        placeholder="—"
        aria-label={`${metric.name}, ${formatPeriod(metric.cadence, period)}`}
        onFocus={(event) => {
          setEditing(true)
          event.target.select()
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onPaste={(event) => {
          onPaste(event, row, column)
          // Blurring lets the render-time sync pull the pasted value in;
          // the guard stops the outgoing blur writing the old one back.
          if (event.defaultPrevented) {
            skipCommit.current = true
            event.currentTarget.blur()
          }
        }}
        onKeyDown={(event) => {
          switch (event.key) {
            case 'Enter':
              // Down, not right: the muscle memory people bring with them.
              event.preventDefault()
              commit()
              if (row < rowCount - 1) onMove(row + 1, column)
              break
            case 'Escape':
              event.preventDefault()
              setDraft(value === null ? '' : String(value))
              setEditing(false)
              event.currentTarget.blur()
              break
            case 'ArrowUp':
              event.preventDefault()
              commit()
              if (row > 0) onMove(row - 1, column)
              break
            case 'ArrowDown':
              event.preventDefault()
              commit()
              if (row < rowCount - 1) onMove(row + 1, column)
              break
            // Sideways moves only once the caret has nowhere left to go
            // inside the cell — except on a freshly focused cell, whose
            // value is fully selected and which a spreadsheet would let
            // you arrow straight out of.
            case 'ArrowLeft': {
              const input = event.currentTarget
              const all = input.selectionStart === 0 && input.selectionEnd === draft.length
              if (!all && input.selectionStart !== 0) break
              event.preventDefault()
              commit()
              if (column > 0) onMove(row, column - 1)
              break
            }
            case 'ArrowRight': {
              const input = event.currentTarget
              const all = input.selectionStart === 0 && input.selectionEnd === draft.length
              if (!all && input.selectionEnd !== draft.length) break
              event.preventDefault()
              commit()
              if (column < columnCount - 1) onMove(row, column + 1)
              break
            }
          }
        }}
        className={cn(
          'h-7 w-full min-w-16 bg-transparent px-1 text-center text-[12px] tabular-nums outline-none',
          'placeholder:text-muted-foreground/50 focus:bg-background focus:ring-2 focus:ring-inset focus:ring-ring/40',
        )}
      />
    </td>
  )
}

/** The row of health dots used where a full grid would be too much. */
export function HealthStrip({ metrics, departmentId, ctx }: { metrics: Metric[]; departmentId: Id; ctx: EngineContext }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {metrics.map((metric) => {
        const value = metricValue(metric, departmentId, periodKey(metric.cadence, ctx.now), ctx)
        return <HealthDot key={metric.id} health={metricHealth(metric, value)} />
      })}
    </div>
  )
}
