'use client'

import { ArrowDownUp, ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SORT_FIELDS, type SortField, type SortRule } from '@/lib/types'
import { newId } from '@/lib/utils/id'

const LABELS: Record<SortField, string> = {
  priority: 'Priority',
  dueDate: 'Due date',
  createdAt: 'Created',
  updatedAt: 'Updated',
  assignee: 'Assignee',
  status: 'Status',
  title: 'Title',
  manual: 'Manual order',
}

/**
 * PRD §19. Multi-level sorting is supported, but the default face of it
 * is one button. Extra levels appear only after "Add sort" — a
 * permanently visible three-row sort panel taxes every user for a
 * feature few use daily.
 */
export function SortMenu({ rules, onChange }: { rules: SortRule[]; onChange: (next: SortRule[]) => void }) {
  const primary = rules[0]

  const update = (id: string, patch: Partial<SortRule>) =>
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)))

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <ArrowDownUp />
          Sort
          {primary && primary.field !== 'manual' && (
            <span className="text-foreground">: {LABELS[primary.field]}</span>
          )}
          {rules.length > 1 && <span className="text-muted-foreground">+{rules.length - 1}</span>}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80 p-2">
        <div className="flex flex-col gap-1.5">
          {rules.map((rule, index) => (
            <div key={rule.id} className="flex items-center gap-1.5">
              <span className="w-10 shrink-0 text-[11px] text-muted-foreground">
                {index === 0 ? 'Sort by' : 'then'}
              </span>

              <Select value={rule.field} onValueChange={(value) => update(rule.id, { field: value as SortField })}>
                <SelectTrigger size="sm" className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_FIELDS.map((field) => (
                    <SelectItem key={field} value={field}>
                      {LABELS[field]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => update(rule.id, { direction: rule.direction === 'asc' ? 'desc' : 'asc' })}
                aria-label={rule.direction === 'asc' ? 'Ascending' : 'Descending'}
              >
                {rule.direction === 'asc' ? <ArrowUp /> : <ArrowDown />}
              </Button>

              {rules.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onChange(rules.filter((entry) => entry.id !== rule.id))}
                  aria-label="Remove this sort level"
                >
                  <X />
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="w-fit text-muted-foreground"
            onClick={() => onChange([...rules, { id: newId('srt'), field: 'dueDate', direction: 'asc' }])}
          >
            <Plus />
            Add sort
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
