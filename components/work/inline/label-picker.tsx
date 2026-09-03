'use client'

import { useState } from 'react'
import { Check, Tag } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LabelChip } from '@/components/primitives'
import { useLabels } from '@/lib/store/selectors'
import { workItemService } from '@/lib/services'
import type { Id } from '@/lib/types'
import { hueDot } from '@/lib/ui/tokens'
import { cn } from '@/lib/utils'

export function LabelPicker({
  workItemId,
  labelIds,
  className,
  trigger,
}: {
  workItemId: Id
  labelIds: Id[]
  className?: string
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const labels = useLabels()
  const selected = labels.filter((label) => labelIds.includes(label.id))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'inline-flex min-h-6 flex-wrap items-center gap-1 rounded px-1 py-0.5 text-left transition-colors outline-none',
          'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40',
          className,
        )}
        aria-label="Edit labels"
      >
        {trigger ??
          (selected.length > 0 ? (
            selected.map((label) => <LabelChip key={label.id} label={label} />)
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Tag className="size-3" />
              No labels
            </span>
          ))}
      </PopoverTrigger>

      <PopoverContent className="w-56 p-0" align="start" onClick={(event) => event.stopPropagation()}>
        <Command>
          <CommandInput placeholder="Add or remove labels…" />
          <CommandList>
            <CommandEmpty>No labels found.</CommandEmpty>
            <CommandGroup>
              {labels.map((label) => (
                <CommandItem
                  key={label.id}
                  value={label.name}
                  onSelect={() => workItemService.toggleLabel(workItemId, label.id)}
                >
                  <span className="size-2 rounded-full" style={hueDot(label.hue)} />
                  <span className="flex-1">{label.name}</span>
                  {labelIds.includes(label.id) && <Check className="size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
