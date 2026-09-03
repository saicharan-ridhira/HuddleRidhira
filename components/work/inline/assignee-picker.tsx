'use client'

import { useState } from 'react'
import { Check, CircleSlash } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { UserAvatar } from '@/components/primitives'
import { useDepartment, useUsers } from '@/lib/store/selectors'
import { workItemService } from '@/lib/services'
import type { Id } from '@/lib/types'
import { cn } from '@/lib/utils'

export function AssigneePicker({
  workItemId,
  departmentId,
  assigneeId,
  showLabel = false,
  variant = 'ghost',
  className,
}: {
  workItemId: Id
  departmentId: Id
  assigneeId: Id | null
  showLabel?: boolean
  variant?: 'ghost' | 'bordered'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const department = useDepartment(departmentId)
  const allUsers = useUsers()

  // Department members first — reassigning outside the team is possible
  // but rare, so it should not be the first thing in the list.
  const members = allUsers.filter((user) => department?.memberIds.includes(user.id))
  const others = allUsers.filter((user) => !department?.memberIds.includes(user.id))
  const current = allUsers.find((user) => user.id === assigneeId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'inline-flex h-6 max-w-full items-center gap-1.5 rounded px-1 transition-colors outline-none',
          'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40',
          variant === 'bordered' && 'h-7 border border-border px-2',
          className,
        )}
        aria-label={`Assignee: ${current?.name ?? 'unassigned'}`}
      >
        <UserAvatar user={current} size="sm" />
        {showLabel && <span className="truncate text-[13px]">{current?.name ?? 'Unassigned'}</span>}
      </PopoverTrigger>

      <PopoverContent className="w-60 p-0" align="start" onClick={(event) => event.stopPropagation()}>
        <Command>
          <CommandInput placeholder="Assign to…" />
          <CommandList>
            <CommandEmpty>No one found.</CommandEmpty>

            <CommandGroup heading={department?.name ?? 'Team'}>
              {members.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${user.name} ${user.email}`}
                  onSelect={() => {
                    workItemService.updateAssignee(workItemId, user.id)
                    setOpen(false)
                  }}
                >
                  <UserAvatar user={user} size="xs" />
                  <span className="flex-1 truncate">{user.name}</span>
                  {user.id === assigneeId && <Check className="size-3.5" />}
                </CommandItem>
              ))}
              <CommandItem
                value="unassigned none"
                onSelect={() => {
                  workItemService.updateAssignee(workItemId, null)
                  setOpen(false)
                }}
              >
                <CircleSlash className="size-3.5 text-muted-foreground" />
                <span className="flex-1">Unassigned</span>
                {assigneeId === null && <Check className="size-3.5" />}
              </CommandItem>
            </CommandGroup>

            {others.length > 0 && (
              <CommandGroup heading="Elsewhere in the org">
                {others.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={`${user.name} ${user.email}`}
                    onSelect={() => {
                      workItemService.updateAssignee(workItemId, user.id)
                      setOpen(false)
                    }}
                  >
                    <UserAvatar user={user} size="xs" />
                    <span className="flex-1 truncate">{user.name}</span>
                    {user.id === assigneeId && <Check className="size-3.5" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
