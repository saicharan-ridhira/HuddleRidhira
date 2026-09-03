'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PriorityIndicator } from '@/components/primitives'
import { workItemService } from '@/lib/services'
import { PRIORITIES, PRIORITY_LABEL, type Id, type Priority } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PriorityPicker({
  workItemId,
  priority,
  showLabel = false,
  variant = 'ghost',
  className,
}: {
  workItemId: Id
  priority: Priority
  showLabel?: boolean
  variant?: 'ghost' | 'bordered'
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'inline-flex h-6 items-center gap-1.5 rounded px-1 text-[13px] transition-colors outline-none',
          'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40',
          variant === 'bordered' && 'h-7 border border-border px-2',
          className,
        )}
        aria-label={`Priority: ${PRIORITY_LABEL[priority]}`}
      >
        <PriorityIndicator priority={priority} showLabel={showLabel} />
      </PopoverTrigger>

      <PopoverContent className="w-48 p-0" align="start" onClick={(event) => event.stopPropagation()}>
        <Command>
          <CommandList>
            <CommandGroup>
              {[...PRIORITIES].reverse().map((option) => (
                <CommandItem
                  key={option}
                  value={PRIORITY_LABEL[option]}
                  onSelect={() => {
                    workItemService.updatePriority(workItemId, option)
                    setOpen(false)
                  }}
                >
                  <PriorityIndicator priority={option} />
                  <span className="flex-1">{PRIORITY_LABEL[option]}</span>
                  {option === priority && <Check className="size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
