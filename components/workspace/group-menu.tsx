'use client'

import { Check, Group } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GROUP_KEYS, type GroupKey } from '@/lib/types'

const LABELS: Record<GroupKey, string> = {
  none: 'No grouping',
  status: 'Status',
  assignee: 'Assignee',
  priority: 'Priority',
  label: 'Label',
  type: 'Work type',
  dueDate: 'Due date',
  department: 'Department',
}

/** PRD §18. One button, one list — grouping is a single choice. */
export function GroupMenu({ value, onChange }: { value: GroupKey; onChange: (next: GroupKey) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Group />
          Group
          {value !== 'status' && value !== 'none' && (
            <span className="text-foreground">: {LABELS[value]}</span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Group by</DropdownMenuLabel>
        {GROUP_KEYS.map((key) => (
          <DropdownMenuItem key={key} onSelect={() => onChange(key)}>
            <span className="flex-1">{LABELS[key]}</span>
            {key === value && <Check className="size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
