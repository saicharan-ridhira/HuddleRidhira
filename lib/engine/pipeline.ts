import type { GroupedItems, Id, ViewConfig, WorkItem } from '@/lib/types'
import type { EngineContext } from './context'
import { applyFilter } from './filter'
import { applySort } from './sort'
import { groupItems } from './group'

/**
 * The one pipeline every view runs on.
 *
 * Board, List, Table, Calendar, Timeline and Huddle all call this and
 * differ only in how they paint the result. That is what makes PRD §16's
 * claim — "all views operate on the same Work Item model" — structural
 * rather than aspirational.
 */
export interface PipelineOptions {
  /** Statuses of the department's workflow, so board columns stay stable. */
  statusUniverse?: Id[]
  /** Members of the department, so a person with no work still appears. */
  memberUniverse?: Id[]
}

export function runPipeline(
  items: WorkItem[],
  config: ViewConfig,
  ctx: EngineContext,
  options: PipelineOptions = {},
): GroupedItems<WorkItem>[] {
  const filtered = applyFilter(items, config.filter, ctx)
  const sorted = applySort(filtered, config.sort, ctx)

  // A board needs its empty columns; a grouped list does not.
  const includeEmpty = config.layout === 'board' ? !config.hideEmptyGroups : false

  const universe =
    config.groupBy === 'status'
      ? options.statusUniverse
      : config.groupBy === 'assignee'
        ? options.memberUniverse
        : undefined

  return groupItems(sorted, config.groupBy, ctx, { universe, includeEmpty })
}

/** Flat result for views that do their own layout (calendar, timeline). */
export function runPipelineFlat(items: WorkItem[], config: ViewConfig, ctx: EngineContext): WorkItem[] {
  return applySort(applyFilter(items, config.filter, ctx), config.sort, ctx)
}
