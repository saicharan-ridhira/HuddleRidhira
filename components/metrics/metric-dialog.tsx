'use client'

import { useState } from 'react'
import type { EngineContext } from '@/lib/engine/context'
import { eligibleInputs, formulaOf } from '@/lib/engine/metrics'
import { metricService } from '@/lib/services'
import {
  COMPUTED_SOURCES,
  METRIC_CADENCES,
  METRIC_CADENCE_LABEL,
  METRIC_DIRECTIONS,
  METRIC_DIRECTION_LABEL,
  METRIC_ROLLUPS,
  METRIC_ROLLUP_LABEL,
  METRIC_SOURCES,
  METRIC_SOURCE_LABEL,
  METRIC_UNITS,
  METRIC_UNIT_LABEL,
  type Department,
  type Id,
  type Metric,
  type MetricCadence,
  type MetricDirection,
  type MetricRollup,
  type MetricSource,
  type MetricUnit,
} from '@/lib/types'
import { EntityDialog, Field } from '@/components/settings/entity-dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/primitives'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/**
 * Defining a metric.
 *
 * The form is the generalisation made visible: name, unit, cadence,
 * direction and target are all this product knows about a KPI, and that
 * is enough for a conversion rate and an incident count to live side by
 * side without either being special-cased.
 */
export function MetricDialog({
  open,
  onOpenChange,
  metric,
  departments,
  ctx,
  defaultDepartmentId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Absent when creating. */
  metric?: Metric
  departments: Department[]
  ctx: EngineContext
  defaultDepartmentId?: Id
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [unit, setUnit] = useState<MetricUnit>('count')
  const [cadence, setCadence] = useState<MetricCadence>('daily')
  const [direction, setDirection] = useState<MetricDirection>('up-is-good')
  const [rollup, setRollup] = useState<MetricRollup>('sum')
  const [target, setTarget] = useState('')
  const [warnAt, setWarnAt] = useState('')
  const [ownerId, setOwnerId] = useState('none')
  const [departmentIds, setDepartmentIds] = useState<Id[]>([])
  const [source, setSource] = useState<MetricSource>('manual')
  const [inputIds, setInputIds] = useState<Id[]>([])
  const [scale, setScale] = useState('1')

  // Reset on open rather than in an effect, so the form never paints one
  // frame of the previous metric's values.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setName(metric?.name ?? '')
      setDescription(metric?.description ?? '')
      setUnit(metric?.unit ?? 'count')
      setCadence(metric?.cadence ?? 'daily')
      setDirection(metric?.direction ?? 'up-is-good')
      setRollup(metric?.rollup ?? 'sum')
      setTarget(metric?.target === null || metric?.target === undefined ? '' : String(metric.target))
      setWarnAt(metric?.warnAt === null || metric?.warnAt === undefined ? '' : String(metric.warnAt))
      setOwnerId(metric?.ownerId ?? 'none')
      setDepartmentIds(metric?.departmentIds ?? (defaultDepartmentId ? [defaultDepartmentId] : []))
      setSource(metric?.source ?? 'manual')
      setInputIds(metric?.inputIds ?? [])
      setScale(metric?.scale === null || metric?.scale === undefined ? '1' : String(metric.scale))
    }
  }

  const computed = COMPUTED_SOURCES.includes(source)
  const inputCount = source === 'sum' ? Math.max(2, inputIds.length + 1) : 2

  // A metric that already depends on this one cannot become its input —
  // that is how a cycle gets created, and the editor is the right place
  // to make it impossible rather than merely survivable.
  const candidates = metric
    ? eligibleInputs(metric, ctx)
    : Object.values(ctx.metrics).filter((other) => !other.archived)

  const owners = ctx.users
  const ownerList = Object.values(owners)

  const draft: Metric = {
    id: metric?.id ?? 'preview',
    name,
    departmentIds,
    unit,
    cadence,
    direction,
    rollup,
    target: target.trim() === '' ? null : Number(target),
    warnAt: warnAt.trim() === '' ? null : Number(warnAt),
    ownerId: ownerId === 'none' ? null : ownerId,
    description: description.trim() || undefined,
    source,
    inputIds: computed ? inputIds.filter(Boolean) : [],
    scale: source === 'ratio' ? Number(scale) || 1 : null,
    archived: metric?.archived ?? false,
  }

  const valid =
    Boolean(name.trim()) &&
    (!computed || (source === 'sum' ? draft.inputIds.length >= 2 : draft.inputIds.length === 2))

  const submit = () => {
    if (metric) {
      metricService.updateMetric(metric.id, draft)
      toast.success('Metric updated', { description: name.trim() })
    } else {
      const { id: _id, archived: _archived, ...input } = draft
      metricService.createMetric(input)
      toast.success('Metric created', { description: name.trim() })
    }
    onOpenChange(false)
  }

  return (
    <EntityDialog
      open={open}
      onOpenChange={onOpenChange}
      title={metric ? `Edit ${metric.name}` : 'New metric'}
      submitLabel={metric ? 'Save' : 'Create'}
      canSubmit={valid}
      onSubmit={submit}
      className="sm:max-w-lg"
    >
      <Field label="Name" htmlFor="met-name">
        <Input
          id="met-name"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Conversions, Campaign reach, Deploys…"
        />
      </Field>

      <Field
        label="How it is measured"
        htmlFor="met-description"
        hint="Written down once, so two people never compute the same number two different ways."
      >
        <Textarea
          id="met-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          placeholder="Where the number comes from, and what counts."
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Unit">
          <Picker value={unit} onChange={(value) => setUnit(value as MetricUnit)} options={METRIC_UNITS} label={METRIC_UNIT_LABEL} />
        </Field>

        <Field label="Reported">
          <Picker
            value={cadence}
            onChange={(value) => setCadence(value as MetricCadence)}
            options={METRIC_CADENCES}
            label={METRIC_CADENCE_LABEL}
          />
        </Field>

        <Field label="Good direction">
          <Picker
            value={direction}
            onChange={(value) => setDirection(value as MetricDirection)}
            options={METRIC_DIRECTIONS}
            label={METRIC_DIRECTION_LABEL}
          />
        </Field>

        <Field label="Rolls up as">
          <Picker
            value={rollup}
            onChange={(value) => setRollup(value as MetricRollup)}
            options={METRIC_ROLLUPS}
            label={METRIC_ROLLUP_LABEL}
          />
        </Field>

        <Field label="Target" htmlFor="met-target" hint="Leave blank to track without judging.">
          <Input id="met-target" inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="—" />
        </Field>

        <Field label="At risk beyond" htmlFor="met-warn" hint="The amber band. Blank means red the moment the target is missed.">
          <Input id="met-warn" inputMode="decimal" value={warnAt} onChange={(event) => setWarnAt(event.target.value)} placeholder="—" />
        </Field>
      </div>

      <Field label="Owner">
        <Select value={ownerId} onValueChange={setOwnerId}>
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nobody</SelectItem>
            {ownerList.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <span className="flex items-center gap-2">
                  <UserAvatar user={user} size="xs" />
                  {user.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Reported by" hint="Choose nothing to have every department report its own number.">
        <div className="flex flex-wrap gap-1">
          <Pill active={departmentIds.length === 0} onClick={() => setDepartmentIds([])}>
            Every department
          </Pill>
          {departments.map((department) => {
            const on = departmentIds.includes(department.id)
            return (
              <Pill
                key={department.id}
                active={on}
                onClick={() =>
                  setDepartmentIds(
                    on ? departmentIds.filter((id) => id !== department.id) : [...departmentIds, department.id],
                  )
                }
              >
                {department.name}
              </Pill>
            )
          })}
        </div>
      </Field>

      <Field
        label="Where the number comes from"
        hint="A computed metric is derived on read, so it can never drift from the numbers it is made of."
      >
        <Picker
          value={source}
          onChange={(value) => {
            setSource(value as MetricSource)
            setInputIds([])
          }}
          options={METRIC_SOURCES}
          label={METRIC_SOURCE_LABEL}
        />
      </Field>

      {computed && (
        <div className="flex flex-col gap-2 rounded-md border border-border px-3 py-2.5">
          {Array.from({ length: inputCount }).map((_, index) => (
            <Select
              key={index}
              value={inputIds[index] ?? ''}
              onValueChange={(value) => {
                const next = [...inputIds]
                next[index] = value
                setInputIds(next)
              }}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder={inputLabel(source, index)} />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          {source === 'ratio' && (
            <Field label="Multiply by" htmlFor="met-scale" hint="100 turns a fraction into a percentage.">
              <Input id="met-scale" inputMode="decimal" value={scale} onChange={(event) => setScale(event.target.value)} />
            </Field>
          )}

          {draft.inputIds.length > 0 && (
            <p className="text-[11px] text-muted-foreground">{formulaOf(draft, ctx) ?? ''}</p>
          )}
        </div>
      )}
    </EntityDialog>
  )
}

function inputLabel(source: MetricSource, index: number): string {
  if (source === 'ratio') return index === 0 ? 'Numerator' : 'Denominator'
  if (source === 'difference') return index === 0 ? 'Start from' : 'Subtract'
  return `Metric ${index + 1}`
}

function Picker<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: string) => void
  options: readonly T[]
  label: Record<T, string>
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {label[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-6 items-center rounded border px-2 text-[11px] transition-colors',
        active ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}
