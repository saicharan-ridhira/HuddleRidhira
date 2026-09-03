'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BlockedBadge, ChecklistProgress, LabelChip, TypeIcon, WorkItemKey } from '@/components/primitives'
import { StatusPicker } from '@/components/work/inline/status-picker'
import { PriorityPicker } from '@/components/work/inline/priority-picker'
import { AssigneePicker } from '@/components/work/inline/assignee-picker'
import { DueDatePicker } from '@/components/work/inline/due-date-picker'
import { EmptyState } from './list-view'
import { Pagination, usePagination } from '@/components/shared/pagination'
import { useCustomFields } from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import { checklistProgress, isBlocked, isDueToday, isOverdue } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { GroupedItems, Id, ViewConfig, WorkItem } from '@/lib/types'

/**
 * PRD §16 — dense data manipulation. The distinguishing feature is that
 * the cells are the real editors: status, priority, assignee and due
 * date all change in place (§15), which is the whole reason to be in a
 * table rather than a list.
 *
 * Custom fields appear here only when the view asks for them (§22).
 */
export function TableView({
  groups,
  config,
  ctx,
  departmentId,
}: {
  groups: GroupedItems<WorkItem>[]
  config: ViewConfig
  ctx: EngineContext
  departmentId: Id
}) {
  const openWorkItem = useStore((state) => state.openWorkItem)
  const allCustomFields = useCustomFields(departmentId)
  const customFields = allCustomFields.filter((field) => config.visibleCustomFieldIds.includes(field.id))

  const rows = groups.flatMap((group) =>
    group.items.map((item) => ({ item, groupLabel: config.groupBy === 'none' ? null : group.label })),
  )

  // A table is the one view where a page break is expected rather than
  // jarring — rows are read linearly and the group is a column, not a
  // heading you can be interrupted mid-way through.
  const pagination = usePagination(rows, 50)

  if (rows.length === 0) return <EmptyState />

  const shows = (field: string) => config.visibleFields.includes(field as never)

  // The grouping dimension often already has its own column. Repeating
  // it wastes a column and reads as a mistake, so the Group column only
  // appears when it is telling the reader something new.
  const groupColumnDuplicates: Record<string, string> = {
    status: 'status',
    assignee: 'assignee',
    priority: 'priority',
    type: 'type',
    label: 'labels',
    dueDate: 'dueDate',
  }
  const duplicateOf = groupColumnDuplicates[config.groupBy]
  const showGroupColumn = config.groupBy !== 'none' && !(duplicateOf && shows(duplicateOf))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
          <TableRow>
            {shows('key') && <TableHead className="w-20">ID</TableHead>}
            <TableHead className="min-w-64">Title</TableHead>
            {showGroupColumn && <TableHead className="w-32">Group</TableHead>}
            {shows('status') && <TableHead className="w-36">Status</TableHead>}
            {shows('priority') && <TableHead className="w-28">Priority</TableHead>}
            {shows('assignee') && <TableHead className="w-36">Assignee</TableHead>}
            {shows('dueDate') && <TableHead className="w-28">Due</TableHead>}
            {shows('labels') && <TableHead className="w-40">Labels</TableHead>}
            {shows('checklist') && <TableHead className="w-20">Progress</TableHead>}
            {customFields.map((field) => (
              <TableHead key={field.id} className="w-32">
                {field.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {pagination.items.map(({ item, groupLabel }) => {
            const status = ctx.statuses[item.statusId]
            const labels = item.labelIds.map((id) => ctx.labels[id]!).filter(Boolean)

            return (
              <TableRow key={item.id}>
                {shows('key') && (
                  <TableCell>
                    <WorkItemKey value={item.key} />
                  </TableCell>
                )}

                <TableCell>
                  <button
                    type="button"
                    onClick={() => openWorkItem(item.id)}
                    className="flex max-w-lg items-center gap-2 text-left outline-none focus-visible:underline"
                  >
                    <TypeIcon type={ctx.workItemTypes[item.typeId]} />
                    <span className="truncate">{item.title}</span>
                    {isBlocked(item.id, ctx) && <BlockedBadge size="sm" />}
                  </button>
                </TableCell>

                {showGroupColumn && (
                  <TableCell className="text-[12px] text-muted-foreground">{groupLabel}</TableCell>
                )}

                {shows('status') && (
                  <TableCell>
                    <StatusPicker workItemId={item.id} departmentId={item.departmentId} status={status} />
                  </TableCell>
                )}

                {shows('priority') && (
                  <TableCell>
                    <PriorityPicker workItemId={item.id} priority={item.priority} showLabel />
                  </TableCell>
                )}

                {shows('assignee') && (
                  <TableCell>
                    <AssigneePicker
                      workItemId={item.id}
                      departmentId={item.departmentId}
                      assigneeId={item.assigneeId}
                      showLabel
                    />
                  </TableCell>
                )}

                {shows('dueDate') && (
                  <TableCell>
                    <DueDatePicker
                      workItemId={item.id}
                      value={item.dueDate}
                      overdue={isOverdue(item, ctx)}
                      dueToday={isDueToday(item, ctx)}
                      placeholder="—"
                    />
                  </TableCell>
                )}

                {shows('labels') && (
                  <TableCell>
                    <span className="flex items-center gap-1">
                      {labels.slice(0, 2).map((label) => (
                        <LabelChip key={label.id} label={label} />
                      ))}
                      {labels.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">+{labels.length - 2}</span>
                      )}
                    </span>
                  </TableCell>
                )}

                {shows('checklist') && (
                  <TableCell>
                    <ChecklistProgress progress={checklistProgress(item, ctx)} />
                  </TableCell>
                )}

                {customFields.map((field) => {
                  const value = item.customFields[field.id]
                  return (
                    <TableCell key={field.id} className="text-[12px] text-muted-foreground">
                      {value === null || value === undefined || value === ''
                        ? '—'
                        : Array.isArray(value)
                          ? value.join(', ')
                          : String(value)}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>

      <Pagination state={pagination} itemLabel="work items" />
    </div>
  )
}
