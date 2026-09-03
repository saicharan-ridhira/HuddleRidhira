'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Info, Library, Plus, Sigma, Trash2 } from 'lucide-react'
import { SettingsPage } from '@/components/settings/settings-page'
import { ConfirmDelete, useEntityDialog } from '@/components/settings/entity-dialog'
import { MetricDialog } from '@/components/metrics'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DynamicIcon, UserAvatar } from '@/components/primitives'
import { usePagination, Pagination } from '@/components/shared/pagination'
import { useDepartments, useEngineContext, useMetrics } from '@/lib/store/selectors'
import { metricService } from '@/lib/services'
import { formatMetricValue, formulaOf } from '@/lib/engine/metrics'
import { METRIC_CADENCE_LABEL, METRIC_UNIT_LABEL, type Metric } from '@/lib/types'
import { METRIC_TEMPLATE_SETS } from '@/lib/data/metric-templates'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/**
 * Where metrics are defined.
 *
 * Nothing about sales, marketing or engineering is built into the
 * product — a metric is a record, and this is the form that writes one.
 * The template library exists because the hard part of leaving a
 * spreadsheet is not the tool, it is deciding what to measure.
 */
export default function MetricsSettingsPage() {
  const metrics = useMetrics(undefined, true)
  const departments = useDepartments()
  const ctx = useEngineContext()

  const [creating, setCreating] = useState(false)
  const editing = useEntityDialog<Metric>()
  const deleting = useEntityDialog<Metric>()
  const page = usePagination(metrics, 25)

  return (
    <SettingsPage
      title="Metrics"
      description="What each department reports, how often, and what good looks like."
      actions={
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus />
          New metric
        </Button>
      }
    >
      <Alert>
        <Info />
        <AlertTitle>A metric is data, not code</AlertTitle>
        <AlertDescription>
          Sales tracks conversions, marketing tracks campaigns, engineering tracks deploys — the platform never
          learns what any of them mean. Scope a metric to the departments that report it, or leave it unscoped and
          every department reports its own number against the same definition.
        </AlertDescription>
      </Alert>

      <TemplateLibrary />

      <section className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold">
          Defined metrics <span className="font-normal text-muted-foreground">({metrics.length})</span>
        </h2>

        {metrics.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-[12px] text-muted-foreground">
            No metrics yet. Add a library above, or define one from scratch.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            {page.items.map((metric) => {
              const owner = metric.ownerId ? ctx.users[metric.ownerId] : undefined
              const formula = formulaOf(metric, ctx)
              const scoped = metric.departmentIds
                .map((id) => ctx.departments[id]?.name)
                .filter(Boolean) as string[]

              return (
                <div
                  key={metric.id}
                  className="group flex items-start gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {metric.source !== 'manual' && <Sigma className="size-3 text-muted-foreground" />}
                      <button
                        type="button"
                        onClick={() => editing.open(metric)}
                        className="truncate text-[13px] font-medium hover:underline"
                      >
                        {metric.name}
                      </button>
                      <Badge variant="muted">{METRIC_CADENCE_LABEL[metric.cadence]}</Badge>
                      <Badge variant="muted">{METRIC_UNIT_LABEL[metric.unit]}</Badge>
                      {metric.target !== null && (
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {metric.direction === 'up-is-good' ? '≥' : '≤'}{' '}
                          {formatMetricValue(metric.target, metric.unit)}
                        </span>
                      )}
                      {owner && <UserAvatar user={owner} size="xs" />}
                    </div>

                    {(metric.description || formula) && (
                      <p className="truncate text-[11px] text-muted-foreground">{formula ?? metric.description}</p>
                    )}

                    <div className="flex flex-wrap gap-1">
                      <span
                        className={cn(
                          'inline-flex h-5 items-center rounded border px-1.5 text-[11px]',
                          scoped.length === 0
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground',
                        )}
                      >
                        {scoped.length === 0 ? 'Every department' : scoped.join(', ')}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${metric.name}`}
                    className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={() => deleting.open(metric)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              )
            })}
            <Pagination state={page} itemLabel="metrics" />
          </div>
        )}
      </section>

      <p className="text-[11px] text-muted-foreground">
        Numbers are entered on each department&apos;s{' '}
        <Link href="/departments/sales/scorecard" className="underline underline-offset-2">
          Scorecard
        </Link>
        .
      </p>

      <MetricDialog open={creating} onOpenChange={setCreating} departments={departments} ctx={ctx} />

      {editing.target && (
        <MetricDialog
          open={editing.isOpen}
          onOpenChange={editing.onOpenChange}
          metric={editing.target}
          departments={departments}
          ctx={ctx}
        />
      )}

      {deleting.target && (
        <ConfirmDelete
          open={deleting.isOpen}
          onOpenChange={deleting.onOpenChange}
          entityName={deleting.target.name}
          consequences={consequencesOf(deleting.target, ctx)}
          onConfirm={() => {
            const name = deleting.target?.name
            if (deleting.target) metricService.deleteMetric(deleting.target.id)
            toast.success('Metric deleted', { description: name })
          }}
        />
      )}
    </SettingsPage>
  )
}

/** Names the damage before it happens, rather than cascading in silence. */
function consequencesOf(metric: Metric, ctx: ReturnType<typeof useEngineContext>): string[] {
  const lines: string[] = []

  const reported = Object.values(ctx.metricEntries).filter((entry) => entry.metricId === metric.id).length
  if (reported > 0) lines.push(`${reported} reported ${reported === 1 ? 'value is' : 'values are'} deleted with it.`)

  const dependents = Object.values(ctx.metrics).filter((other) => other.inputIds.includes(metric.id))
  if (dependents.length > 0) {
    lines.push(`${dependents.map((d) => d.name).join(', ')} computed from it, and will revert to manual entry.`)
  }

  const critical = Object.values(ctx.departments).filter((d) => d.criticalNumber?.metricId === metric.id)
  if (critical.length > 0) {
    lines.push(`${critical.map((d) => d.name).join(', ')} had it as the Critical Number, which will be cleared.`)
  }

  return lines
}

/**
 * One click to a working scorecard.
 *
 * Each set installs its computed metrics already wired to their inputs,
 * which is the part somebody starting from a blank form would get wrong
 * or skip.
 */
function TemplateLibrary() {
  const departments = useDepartments()
  const [target, setTarget] = useState<string>(departments[0]?.id ?? '')

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Library className="size-3.5 text-muted-foreground" />
        <h2 className="text-[13px] font-semibold">Start from a library</h2>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-muted-foreground">Add to</span>
          {departments.map((department) => (
            <button
              key={department.id}
              type="button"
              onClick={() => setTarget(department.id)}
              className={cn(
                'inline-flex h-6 items-center rounded border px-2 text-[11px] transition-colors',
                target === department.id
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent',
              )}
            >
              {department.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {METRIC_TEMPLATE_SETS.map((set) => (
          <div key={set.key} className="flex items-start gap-2.5 rounded-md border border-border px-3 py-2.5">
            <DynamicIcon name={set.icon} className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[12px] font-medium">{set.name}</span>
              <span className="text-[11px] text-muted-foreground">{set.description}</span>
              <span className="text-[11px] text-muted-foreground">
                {set.metrics.map((metric) => metric.name).join(' · ')}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-[11px]"
              disabled={!target}
              onClick={() => {
                const added = metricService.addFromTemplate(set.key === 'universal' ? null : target, set.key)
                if (added === 0) {
                  toast.info('Already added', { description: 'Every metric in this library is already defined.' })
                } else {
                  toast.success(`Added ${added} ${added === 1 ? 'metric' : 'metrics'}`, { description: set.name })
                }
              }}
            >
              Add
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}
