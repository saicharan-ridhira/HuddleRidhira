'use client'

import type { CriticalNumber, Id, Metric, MetricEntry } from '@/lib/types'
import { formatMetricValue, metricEntryKey } from '@/lib/engine/metrics'
import { formatPeriod, periodKey, quarterOf } from '@/lib/engine/periods'
import type { MetricTemplate } from '@/lib/data/metric-templates'
import { templateSet } from '@/lib/data/metric-templates'
import { useStore, type AuditDraft, type StoreState } from '@/lib/store/store'
import { newId } from '@/lib/utils/id'

const apply = (recipe: (state: StoreState) => AuditDraft | AuditDraft[] | void | null) => useStore.getState().apply(recipe)

/* ------------------------------------------------------------------ *
 * Definitions
 * ------------------------------------------------------------------ */

export type MetricInput = Omit<Metric, 'id' | 'archived'>

export function createMetric(input: MetricInput): Id | null {
  let createdId: Id | null = null

  apply((state) => {
    const id = newId('met')
    state.entities.metrics[id] = { ...input, id, archived: false }
    state.order.metricIds.push(id)
    createdId = id

    return {
      kind: 'metric',
      entityId: id,
      summary: `created the ${input.name} metric`,
      departmentId: input.departmentIds[0] ?? null,
    }
  })

  return createdId
}

export function updateMetric(metricId: Id, patch: Partial<Metric>) {
  apply((state) => {
    const metric = state.entities.metrics[metricId]
    if (!metric) return

    const before = metric.name
    Object.assign(metric, patch)

    return {
      kind: 'metric',
      entityId: metricId,
      summary: `updated the ${before} metric`,
      departmentId: metric.departmentIds[0] ?? null,
    }
  })
}

/**
 * Removes the definition and every number reported against it.
 *
 * Leaving the entries behind would leave rows nothing can render and
 * nothing can reach — invisible weight in localStorage that reappears
 * the moment somebody recreates a metric with the same id.
 */
export function deleteMetric(metricId: Id) {
  apply((state) => {
    const metric = state.entities.metrics[metricId]
    if (!metric) return

    for (const entry of Object.values(state.entities.metricEntries)) {
      if (entry.metricId === metricId) delete state.entities.metricEntries[entry.id]
    }
    state.order.metricEntryIds = state.order.metricEntryIds.filter(
      (id) => state.entities.metricEntries[id] !== undefined,
    )

    // A computed metric that loses an input would silently start
    // reporting nothing, so it is unwired back to manual instead.
    for (const other of Object.values(state.entities.metrics)) {
      if (!other.inputIds.includes(metricId)) continue
      other.inputIds = other.inputIds.filter((id) => id !== metricId)
      if (other.inputIds.length === 0) other.source = 'manual'
    }

    // The department's Critical Number cannot point at a metric that
    // no longer exists.
    for (const department of Object.values(state.entities.departments)) {
      if (department.criticalNumber?.metricId === metricId) department.criticalNumber = null
    }

    delete state.entities.metrics[metricId]
    state.order.metricIds = state.order.metricIds.filter((id) => id !== metricId)

    return {
      kind: 'metric',
      entityId: metricId,
      summary: `deleted the ${metric.name} metric`,
      departmentId: metric.departmentIds[0] ?? null,
    }
  })
}

/* ------------------------------------------------------------------ *
 * Entries
 * ------------------------------------------------------------------ */

/**
 * Records a number for one period, replacing whatever was there.
 *
 * The audit detail carries the old value and the new one, which is the
 * one thing a shared spreadsheet cannot do: when last month's figure is
 * suddenly different, somebody can find out when it changed and who
 * changed it.
 */
export function setEntry(
  metricId: Id,
  departmentId: Id,
  period: string,
  value: number | null,
  note?: string,
) {
  apply((state) => {
    const metric = state.entities.metrics[metricId]
    if (!metric) return

    // Computed metrics are derived on read. Storing one would recreate
    // exactly the drift this design exists to prevent.
    if (metric.source !== 'manual') return

    const periodStart = periodKey(metric.cadence, period)
    const existing = Object.values(state.entities.metricEntries).find(
      (entry) => entry.metricId === metricId && entry.departmentId === departmentId && entry.periodStart === periodStart,
    )

    const previous = existing?.value ?? null
    if (previous === value && existing) return

    const now = new Date().toISOString()

    if (existing) {
      existing.value = value
      existing.enteredBy = state.session.currentUserId
      existing.enteredAt = now
      if (note !== undefined) existing.note = note
    } else {
      const id = newId('me')
      const entry: MetricEntry = {
        id,
        metricId,
        departmentId,
        periodStart,
        value,
        note,
        enteredBy: state.session.currentUserId,
        enteredAt: now,
      }
      state.entities.metricEntries[id] = entry
      state.order.metricEntryIds.push(id)
    }

    return {
      kind: 'metric',
      entityId: metricId,
      summary: `reported ${metric.name} for ${formatPeriod(metric.cadence, periodStart)}`,
      detail: {
        field: `${metric.name} · ${formatPeriod(metric.cadence, periodStart)}`,
        from: previous === null ? null : formatMetricValue(previous, metric.unit),
        to: value === null ? null : formatMetricValue(value, metric.unit),
      },
      departmentId,
    }
  })
}

/** Removes a reported number entirely — distinct from reporting a zero. */
export function clearEntry(metricId: Id, departmentId: Id, period: string) {
  apply((state) => {
    const metric = state.entities.metrics[metricId]
    if (!metric) return

    const periodStart = periodKey(metric.cadence, period)
    const existing = Object.values(state.entities.metricEntries).find(
      (entry) => entry.metricId === metricId && entry.departmentId === departmentId && entry.periodStart === periodStart,
    )
    if (!existing) return

    const previous = existing.value
    delete state.entities.metricEntries[existing.id]
    state.order.metricEntryIds = state.order.metricEntryIds.filter((id) => id !== existing.id)

    return {
      kind: 'metric',
      entityId: metricId,
      summary: `cleared ${metric.name} for ${formatPeriod(metric.cadence, periodStart)}`,
      detail: {
        field: `${metric.name} · ${formatPeriod(metric.cadence, periodStart)}`,
        from: previous === null ? null : formatMetricValue(previous, metric.unit),
        to: null,
      },
      departmentId,
    }
  })
}

/**
 * A block of values pasted from a spreadsheet, applied in one go.
 *
 * This is the migration path, and it is why the grid accepts a paste at
 * all: someone can bring months of history across in a single action
 * rather than retyping it, and the whole block lands as one undoable
 * unit of work rather than two hundred separate edits.
 */
export function setEntries(
  departmentId: Id,
  cells: { metricId: Id; period: string; value: number | null }[],
) {
  apply((state) => {
    const drafts: AuditDraft[] = []
    const now = new Date().toISOString()
    let changed = 0

    for (const cell of cells) {
      const metric = state.entities.metrics[cell.metricId]
      if (!metric || metric.source !== 'manual') continue

      const periodStart = periodKey(metric.cadence, cell.period)
      const existing = Object.values(state.entities.metricEntries).find(
        (entry) =>
          entry.metricId === cell.metricId &&
          entry.departmentId === departmentId &&
          entry.periodStart === periodStart,
      )

      if (existing) {
        if (existing.value === cell.value) continue
        existing.value = cell.value
        existing.enteredBy = state.session.currentUserId
        existing.enteredAt = now
      } else {
        const id = newId('me')
        state.entities.metricEntries[id] = {
          id,
          metricId: cell.metricId,
          departmentId,
          periodStart,
          value: cell.value,
          enteredBy: state.session.currentUserId,
          enteredAt: now,
        }
        state.order.metricEntryIds.push(id)
      }
      changed++
    }

    if (changed === 0) return null

    // One event, not one per cell — an audit log that logs a paste as
    // two hundred lines is an audit log nobody reads.
    drafts.push({
      kind: 'metric',
      entityId: cells[0]?.metricId ?? 'metrics',
      summary: `pasted ${changed} scorecard ${changed === 1 ? 'value' : 'values'}`,
      departmentId,
    })

    return drafts
  })
}

/* ------------------------------------------------------------------ *
 * Critical Number
 * ------------------------------------------------------------------ */

export function setCriticalNumber(departmentId: Id, criticalNumber: CriticalNumber | null) {
  apply((state) => {
    const department = state.entities.departments[departmentId]
    if (!department) return

    const before = department.criticalNumber
      ? (state.entities.metrics[department.criticalNumber.metricId]?.name ?? null)
      : null
    department.criticalNumber = criticalNumber

    const after = criticalNumber ? (state.entities.metrics[criticalNumber.metricId]?.name ?? null) : null

    return {
      kind: 'department',
      entityId: departmentId,
      summary: after
        ? `set the Critical Number to ${after}`
        : 'cleared the Critical Number',
      detail: { field: 'Critical Number', from: before, to: after },
      departmentId,
    }
  })
}

/* ------------------------------------------------------------------ *
 * Rocks
 * ------------------------------------------------------------------ */

/** Promotes a work item to a quarterly Rock, or demotes it back. */
export function setRockQuarter(workItemId: Id, quarter: string | null) {
  apply((state) => {
    const item = state.entities.workItems[workItemId]
    if (!item) return

    const before = item.rockQuarter
    if (before === quarter) return

    item.rockQuarter = quarter
    item.updatedAt = new Date().toISOString()

    return {
      kind: 'work-item',
      entityId: workItemId,
      summary: quarter ? `made ${item.key} a Rock for ${quarter}` : `removed ${item.key} from the Rocks`,
      detail: { field: 'Rock', from: before, to: quarter },
      departmentId: item.departmentId,
    }
  })
}

export function currentQuarter(now: Date = new Date()): string {
  return quarterOf(now)
}

/* ------------------------------------------------------------------ *
 * The template library
 * ------------------------------------------------------------------ */

/**
 * Installs a preset set of metrics into a department.
 *
 * Templates are wired to each other by `key`, so a set can ship a
 * computed metric — a conversion rate, a cost per lead — with its inputs
 * already connected. Installing one metric at a time through
 * `createMetric` could not do that, which is the whole reason this
 * exists rather than a loop at the call site.
 */
export function addFromTemplate(departmentId: Id | null, setKey: string): number {
  const set = templateSet(setKey)
  if (!set) return 0

  let installed = 0

  apply((state) => {
    const departmentIds = departmentId ? [departmentId] : []
    const existing = new Set(
      Object.values(state.entities.metrics)
        .filter((metric) => !departmentId || metric.departmentIds.length === 0 || metric.departmentIds.includes(departmentId))
        .map((metric) => metric.name.toLowerCase()),
    )

    const idByKey: Record<string, Id> = {}
    const pending: { template: MetricTemplate; id: Id }[] = []

    for (const template of set.metrics) {
      // Adding a second "New leads" would leave two columns that mean the
      // same thing and disagree — worse than not adding it at all.
      if (existing.has(template.name.toLowerCase())) continue

      const id = newId('met')
      idByKey[template.key] = id
      pending.push({ template, id })
    }

    for (const { template, id } of pending) {
      const { key: _key, inputKeys, ...rest } = template
      const inputIds = (inputKeys ?? []).map((inputKey) => idByKey[inputKey]).filter((value): value is Id => Boolean(value))

      state.entities.metrics[id] = {
        ...rest,
        id,
        departmentIds,
        // A computed metric whose inputs were skipped as duplicates has
        // nothing to compute from, so it falls back to manual entry.
        source: inputKeys && inputIds.length !== inputKeys.length ? 'manual' : rest.source,
        inputIds,
        archived: false,
      }
      state.order.metricIds.push(id)
      installed++
    }

    if (installed === 0) return null

    return {
      kind: 'metric',
      entityId: departmentId ?? 'metrics',
      summary: `added the ${set.name} metric library (${installed} ${installed === 1 ? 'metric' : 'metrics'})`,
      departmentId,
    }
  })

  return installed
}

export { metricEntryKey }
