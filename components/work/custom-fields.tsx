'use client'

import { Check, ChevronDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { EditableText } from './inline/editable-text'
import { workItemService } from '@/lib/services'
import type { CustomField, CustomFieldValue, WorkItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * PRD §22. Custom fields are editable inline like any other frequently
 * changed property, but they deliberately do not appear on cards or in
 * every view — visibility is a per-view choice, which is what keeps a
 * team with thirty custom fields from drowning in them.
 */
export function CustomFieldEditor({ item, field }: { item: WorkItem; field: CustomField }) {
  const value = item.customFields[field.id] ?? null
  const set = (next: CustomFieldValue) => workItemService.setCustomField(item.id, field.id, next)

  switch (field.kind) {
    case 'checkbox':
      return (
        <Checkbox
          checked={value === true}
          onCheckedChange={(checked) => set(checked === true)}
          aria-label={field.name}
        />
      )

    case 'number':
      return (
        <Input
          type="number"
          value={value === null ? '' : String(value)}
          onChange={(event) => set(event.target.value === '' ? null : Number(event.target.value))}
          className="h-6 w-24 border-transparent px-1 hover:border-input"
        />
      )

    case 'date':
      return (
        <Input
          type="date"
          value={typeof value === 'string' ? value.slice(0, 10) : ''}
          onChange={(event) => set(event.target.value || null)}
          className="h-6 w-36 border-transparent px-1 hover:border-input"
        />
      )

    case 'dropdown':
      return <OptionPicker field={field} value={value} onChange={set} />

    case 'multi-select':
      return <OptionPicker field={field} value={value} onChange={set} multiple />

    case 'url':
      return (
        <EditableText
          value={typeof value === 'string' ? value : ''}
          onCommit={(next) => set(next || null)}
          placeholder="Add a link"
          className="text-[13px] text-primary"
        />
      )

    default:
      return (
        <EditableText
          value={typeof value === 'string' ? value : ''}
          onCommit={(next) => set(next || null)}
          placeholder="Empty"
          className="text-[13px]"
        />
      )
  }
}

function OptionPicker({
  field,
  value,
  onChange,
  multiple = false,
}: {
  field: CustomField
  value: CustomFieldValue
  onChange: (next: CustomFieldValue) => void
  multiple?: boolean
}) {
  const selected = multiple ? (Array.isArray(value) ? value : []) : value === null ? [] : [String(value)]

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'inline-flex h-6 items-center gap-1.5 rounded px-1 text-[13px] transition-colors outline-none',
          'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40',
          selected.length === 0 && 'text-muted-foreground',
        )}
      >
        {selected.length > 0 ? selected.join(', ') : 'Empty'}
        <ChevronDown className="size-3 opacity-50" />
      </PopoverTrigger>

      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {field.options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    if (!multiple) {
                      onChange(selected.includes(option) ? null : option)
                      return
                    }
                    onChange(
                      selected.includes(option)
                        ? selected.filter((entry) => entry !== option)
                        : [...selected, option],
                    )
                  }}
                >
                  <span className="flex-1">{option}</span>
                  {selected.includes(option) && <Check className="size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
