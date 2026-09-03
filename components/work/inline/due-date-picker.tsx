'use client'

import { useState } from 'react'
import { CalendarPlus, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DueDate } from '@/components/primitives'
import { workItemService } from '@/lib/services'
import type { Id } from '@/lib/types'
import { cn } from '@/lib/utils'

export function DueDatePicker({
  workItemId,
  value,
  overdue = false,
  dueToday = false,
  placeholder = 'No due date',
  variant = 'ghost',
  className,
}: {
  workItemId: Id
  value: string | null
  overdue?: boolean
  dueToday?: boolean
  placeholder?: string
  variant?: 'ghost' | 'bordered'
  className?: string
}) {
  const [open, setOpen] = useState(false)

  const commit = (date: Date | undefined) => {
    if (!date) {
      workItemService.updateDueDate(workItemId, null)
    } else {
      const normalized = new Date(date)
      normalized.setHours(17, 0, 0, 0)
      workItemService.updateDueDate(workItemId, normalized.toISOString())
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'inline-flex h-6 items-center gap-1.5 rounded px-1 text-[11px] transition-colors outline-none',
          'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40',
          variant === 'bordered' && 'h-7 border border-border px-2 text-[13px]',
          !value && 'text-muted-foreground',
          className,
        )}
      >
        {value ? (
          <DueDate value={value} overdue={overdue} dueToday={dueToday} showIcon />
        ) : (
          <>
            <CalendarPlus className="size-3" />
            {placeholder}
          </>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start" onClick={(event) => event.stopPropagation()}>
        <Calendar mode="single" selected={value ? new Date(value) : undefined} onSelect={commit} autoFocus />
        {value && (
          <div className="border-t border-border p-1.5">
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => commit(undefined)}>
              <X />
              Clear due date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
