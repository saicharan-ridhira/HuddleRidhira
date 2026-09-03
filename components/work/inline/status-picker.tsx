'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { StatusIcon } from '@/components/primitives'
import { useDepartmentStatuses } from '@/lib/store/selectors'
import { workItemService } from '@/lib/services'
import type { Id, Status } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * PRD §15 — status is one of the most frequently changed properties, so
 * it edits in place from wherever it is shown. No modal, no save button.
 */
export function StatusPicker({
  workItemId,
  departmentId,
  status,
  variant = 'ghost',
  showLabel = true,
  className,
}: {
  workItemId: Id
  departmentId: Id
  status: Status | undefined
  variant?: 'ghost' | 'bordered'
  showLabel?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const statuses = useDepartmentStatuses(departmentId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'inline-flex h-6 max-w-full items-center gap-1.5 rounded px-1 text-[13px] transition-colors outline-none',
          'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40',
          variant === 'bordered' && 'h-7 border border-border px-2',
          className,
        )}
        aria-label={`Status: ${status?.name ?? 'none'}`}
      >
        {status && <StatusIcon category={status.category} />}
        {showLabel && <span className="truncate">{status?.name ?? 'No status'}</span>}
      </PopoverTrigger>

      <PopoverContent className="w-56 p-0" align="start" onClick={(event) => event.stopPropagation()}>
        <Command>
          <CommandInput placeholder="Change status…" />
          <CommandList>
            <CommandEmpty>No status found.</CommandEmpty>
            <CommandGroup>
              {statuses.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => {
                    workItemService.updateStatus(workItemId, option.id)
                    setOpen(false)
                  }}
                >
                  <StatusIcon category={option.category} />
                  <span className="flex-1">{option.name}</span>
                  {option.id === status?.id && <Check className="size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
