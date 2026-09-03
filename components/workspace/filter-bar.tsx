'use client'

import { useState } from 'react'
import { ListFilter, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PriorityIndicator, StatusIcon, UserAvatar } from '@/components/primitives'
import { useDepartment, useDepartmentStatuses, useLabels, useUsers, useWorkItemTypes } from '@/lib/store/selectors'
import { countConditions } from '@/lib/engine/filter'
import {
  PRIORITIES,
  PRIORITY_LABEL,
  type FilterCondition,
  type FilterField,
  type FilterGroup,
  type FilterNode,
  type FilterOperator,
  type Id,
} from '@/lib/types'
import { newId } from '@/lib/utils/id'
import { hueDot } from '@/lib/ui/tokens'
import { cn } from '@/lib/utils'

const FIELD_LABEL: Record<FilterField, string> = {
  status: 'Status',
  statusCategory: 'Status category',
  assignee: 'Assignee',
  priority: 'Priority',
  label: 'Label',
  type: 'Work type',
  department: 'Department',
  blocked: 'Blocked',
  overdue: 'Overdue',
  dueDate: 'Due date',
  reporter: 'Reporter',
  title: 'Title',
}

const OPERATOR_LABEL: Record<FilterOperator, string> = {
  is: 'is',
  'is-not': 'is not',
  'is-any-of': 'is any of',
  'is-none-of': 'is none of',
  contains: 'contains',
  before: 'before',
  after: 'after',
  'is-set': 'is set',
  'is-not-set': 'is not set',
}

/**
 * PRD §20 and §44.
 *
 * The default face of filtering is one button and a short list of the
 * things people actually filter on. The nested `(A AND B) OR C` builder
 * exists, but it lives behind an explicit "Advanced" step — showing a
 * query builder to everyone taxes the majority to serve a minority.
 *
 * Both write into the same `FilterGroup` tree, so there is one
 * evaluator and the simple view never lies about what is applied.
 */
export function FilterBar({
  filter,
  onChange,
  departmentId,
}: {
  filter: FilterGroup
  onChange: (next: FilterGroup) => void
  departmentId?: Id
}) {
  const [advanced, setAdvanced] = useState(false)
  const count = countConditions(filter)

  const addCondition = (condition: FilterCondition) =>
    onChange({ ...filter, children: [...filter.children, condition] })

  const removeNode = (id: string) =>
    onChange({ ...filter, children: filter.children.filter((child) => child.id !== id) })

  const hasNestedGroups = filter.children.some((child) => child.kind === 'group')

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn('text-muted-foreground hover:text-foreground', count > 0 && 'text-foreground')}
          >
            <ListFilter />
            Filter
            {count > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded bg-primary/15 px-1 text-[10px] font-medium tabular-nums text-primary">
                {count}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-64 p-0">
          {advanced ? (
            <AdvancedBuilder
              filter={filter}
              onChange={onChange}
              departmentId={departmentId}
              onBack={() => setAdvanced(false)}
            />
          ) : (
            <SimpleFilterPicker
              departmentId={departmentId}
              onPick={addCondition}
              onAdvanced={() => setAdvanced(true)}
            />
          )}
        </PopoverContent>
      </Popover>

      {/* Applied conditions read as chips, so what is filtered is never hidden. */}
      {filter.children.map((child) =>
        child.kind === 'condition' ? (
          <FilterChip key={child.id} condition={child} departmentId={departmentId} onRemove={() => removeNode(child.id)} />
        ) : (
          <span
            key={child.id}
            className="inline-flex h-6 items-center gap-1 rounded border border-border bg-muted/50 px-1.5 text-[11px]"
          >
            {countConditions(child)} nested conditions
            <button type="button" onClick={() => removeNode(child.id)} aria-label="Remove group">
              <X className="size-3" />
            </button>
          </span>
        ),
      )}

      {(count > 0 || hasNestedGroups) && (
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          onClick={() => onChange({ ...filter, combinator: 'and', children: [] })}
        >
          Clear
        </Button>
      )}
    </div>
  )
}

function FilterChip({
  condition,
  departmentId,
  onRemove,
}: {
  condition: FilterCondition
  departmentId?: Id
  onRemove: () => void
}) {
  const statuses = useDepartmentStatuses(departmentId)
  const users = useUsers()
  const labels = useLabels()
  const types = useWorkItemTypes()

  const readable = (() => {
    const raw = condition.value
    if (typeof raw === 'boolean') return raw ? 'yes' : 'no'
    if (raw === null) return ''
    const value = String(raw)
    return (
      statuses.find((entry) => entry.id === value)?.name ??
      users.find((entry) => entry.id === value)?.name ??
      labels.find((entry) => entry.id === value)?.name ??
      types.find((entry) => entry.id === value)?.name ??
      value
    )
  })()

  return (
    <span className="inline-flex h-6 items-center gap-1 rounded border border-border bg-muted/50 px-1.5 text-[11px]">
      <span className="text-muted-foreground">{FIELD_LABEL[condition.field]}</span>
      <span className="text-muted-foreground/70">{OPERATOR_LABEL[condition.operator]}</span>
      <span className="font-medium">{readable}</span>
      <button type="button" onClick={onRemove} aria-label="Remove filter" className="ml-0.5 opacity-60 hover:opacity-100">
        <X className="size-3" />
      </button>
    </span>
  )
}

function SimpleFilterPicker({
  departmentId,
  onPick,
  onAdvanced,
}: {
  departmentId?: Id
  onPick: (condition: FilterCondition) => void
  onAdvanced: () => void
}) {
  const statuses = useDepartmentStatuses(departmentId)
  const users = useUsers()
  const department = useDepartment(departmentId)
  const labels = useLabels()

  const members = department ? users.filter((user) => department.memberIds.includes(user.id)) : users

  const make = (field: FilterField, value: FilterCondition['value'], operator: FilterOperator = 'is'): FilterCondition => ({
    kind: 'condition',
    id: newId('flt'),
    field,
    operator,
    value,
  })

  return (
    <Command>
      <CommandInput placeholder="Filter by…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        <CommandGroup heading="Exceptions">
          <CommandItem value="blocked" onSelect={() => onPick(make('blocked', true))}>
            <span className="size-2 rounded-full bg-blocked" />
            Blocked
          </CommandItem>
          <CommandItem value="overdue" onSelect={() => onPick(make('overdue', true))}>
            <span className="size-2 rounded-full bg-overdue" />
            Overdue
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Status">
          {statuses.map((status) => (
            <CommandItem key={status.id} value={`status ${status.name}`} onSelect={() => onPick(make('status', status.id))}>
              <StatusIcon category={status.category} />
              {status.name}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Assignee">
          {members.map((user) => (
            <CommandItem key={user.id} value={`assignee ${user.name}`} onSelect={() => onPick(make('assignee', user.id))}>
              <UserAvatar user={user} size="xs" />
              {user.name}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Priority">
          {[...PRIORITIES].reverse().map((priority) => (
            <CommandItem
              key={priority}
              value={`priority ${PRIORITY_LABEL[priority]}`}
              onSelect={() => onPick(make('priority', priority))}
            >
              <PriorityIndicator priority={priority} />
              {PRIORITY_LABEL[priority]}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Label">
          {labels.map((label) => (
            <CommandItem key={label.id} value={`label ${label.name}`} onSelect={() => onPick(make('label', label.id))}>
              <span className="size-2 rounded-full" style={hueDot(label.hue)} />
              {label.name}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup>
          <CommandItem value="advanced filter builder" onSelect={onAdvanced}>
            <SlidersHorizontal />
            Advanced filter…
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

/**
 * The nested builder. Kept deliberately plain: a combinator toggle, a
 * flat list of conditions, and the ability to nest one level of groups —
 * which covers §20's worked example without turning into a query IDE.
 */
function AdvancedBuilder({
  filter,
  onChange,
  departmentId,
  onBack,
}: {
  filter: FilterGroup
  onChange: (next: FilterGroup) => void
  departmentId?: Id
  onBack: () => void
}) {
  return (
    <div className="flex max-h-[420px] flex-col overflow-y-auto p-2 scrollbar-thin">
      <div className="mb-2 flex items-center gap-2">
        <Button variant="ghost" size="xs" onClick={onBack}>
          Back
        </Button>
        <span className="text-[11px] font-medium text-muted-foreground">Advanced filter</span>
      </div>

      <GroupEditor node={filter} onChange={onChange} departmentId={departmentId} depth={0} />
    </div>
  )
}

function GroupEditor({
  node,
  onChange,
  departmentId,
  depth,
}: {
  node: FilterGroup
  onChange: (next: FilterGroup) => void
  departmentId?: Id
  depth: number
}) {
  const replaceChild = (id: string, next: FilterNode) =>
    onChange({ ...node, children: node.children.map((child) => (child.id === id ? next : child)) })

  const removeChild = (id: string) => onChange({ ...node, children: node.children.filter((child) => child.id !== id) })

  return (
    <div className={cn('flex flex-col gap-1.5', depth > 0 && 'rounded-md border border-border bg-muted/30 p-1.5')}>
      <div className="flex items-center gap-1">
        <Select
          value={node.combinator}
          onValueChange={(value) => onChange({ ...node, combinator: value as 'and' | 'or' })}
        >
          <SelectTrigger size="sm" className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">AND</SelectItem>
            <SelectItem value="or">OR</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[11px] text-muted-foreground">
          {node.combinator === 'and' ? 'match every condition' : 'match any condition'}
        </span>
      </div>

      {node.children.map((child) =>
        child.kind === 'condition' ? (
          <ConditionEditor
            key={child.id}
            condition={child}
            departmentId={departmentId}
            onChange={(next) => replaceChild(child.id, next)}
            onRemove={() => removeChild(child.id)}
          />
        ) : (
          <div key={child.id} className="flex items-start gap-1">
            <div className="flex-1">
              <GroupEditor
                node={child}
                onChange={(next) => replaceChild(child.id, next)}
                departmentId={departmentId}
                depth={depth + 1}
              />
            </div>
            <Button variant="ghost" size="icon-xs" onClick={() => removeChild(child.id)} aria-label="Remove group">
              <Trash2 />
            </Button>
          </div>
        ),
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          onClick={() =>
            onChange({
              ...node,
              children: [
                ...node.children,
                { kind: 'condition', id: newId('flt'), field: 'status', operator: 'is', value: null },
              ],
            })
          }
        >
          <Plus />
          Condition
        </Button>

        {depth === 0 && (
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() =>
              onChange({
                ...node,
                children: [
                  ...node.children,
                  { kind: 'group', id: newId('grp'), combinator: 'and', children: [] },
                ],
              })
            }
          >
            <Plus />
            Group
          </Button>
        )}
      </div>
    </div>
  )
}

function ConditionEditor({
  condition,
  departmentId,
  onChange,
  onRemove,
}: {
  condition: FilterCondition
  departmentId?: Id
  onChange: (next: FilterCondition) => void
  onRemove: () => void
}) {
  const statuses = useDepartmentStatuses(departmentId)
  const users = useUsers()
  const labels = useLabels()
  const types = useWorkItemTypes()

  const options: Array<{ value: string; label: string }> = (() => {
    switch (condition.field) {
      case 'status':
        return statuses.map((entry) => ({ value: entry.id, label: entry.name }))
      case 'assignee':
      case 'reporter':
        return users.map((entry) => ({ value: entry.id, label: entry.name }))
      case 'label':
        return labels.map((entry) => ({ value: entry.id, label: entry.name }))
      case 'type':
        return types.map((entry) => ({ value: entry.id, label: entry.name }))
      case 'priority':
        return PRIORITIES.map((entry) => ({ value: entry, label: PRIORITY_LABEL[entry] }))
      case 'blocked':
      case 'overdue':
        return [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ]
      default:
        return []
    }
  })()

  const needsValue = condition.operator !== 'is-set' && condition.operator !== 'is-not-set'

  return (
    <div className="flex items-center gap-1">
      <Select
        value={condition.field}
        onValueChange={(value) => onChange({ ...condition, field: value as FilterField, value: null })}
      >
        <SelectTrigger size="sm" className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(FIELD_LABEL) as FilterField[]).map((field) => (
            <SelectItem key={field} value={field}>
              {FIELD_LABEL[field]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={condition.operator}
        onValueChange={(value) => onChange({ ...condition, operator: value as FilterOperator })}
      >
        <SelectTrigger size="sm" className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(OPERATOR_LABEL) as FilterOperator[]).map((operator) => (
            <SelectItem key={operator} value={operator}>
              {OPERATOR_LABEL[operator]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {needsValue && options.length > 0 && (
        <Select
          value={condition.value === null ? '' : String(condition.value)}
          onValueChange={(value) =>
            onChange({
              ...condition,
              value: condition.field === 'blocked' || condition.field === 'overdue' ? value === 'true' : value,
            })
          }
        >
          <SelectTrigger size="sm" className="min-w-0 flex-1">
            <SelectValue placeholder="Value" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button variant="ghost" size="icon-xs" onClick={onRemove} aria-label="Remove condition">
        <X />
      </Button>
    </div>
  )
}
