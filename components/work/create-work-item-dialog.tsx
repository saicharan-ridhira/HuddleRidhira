'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EntityDialog, Field } from '@/components/settings/entity-dialog'
import { LabelChip, PriorityIndicator, StatusIcon, TypeIcon, UserAvatar, formatDueDate } from '@/components/primitives'
import { useDepartment, useDepartmentStatuses, useLabels, useUsers, useWorkItemTypes } from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import { workItemService } from '@/lib/services'
import { PRIORITIES, PRIORITY_LABEL, type Id, type Priority } from '@/lib/types'
import { hueDot } from '@/lib/ui/tokens'
import { toast } from 'sonner'

/**
 * The full create form. Inline creation on the board stays the fast path
 * — a title and Enter — but that leaves everything else to be filled in
 * afterwards, item by item. This is for when you already know what the
 * work is.
 */
export function CreateWorkItemDialog({
  open,
  onOpenChange,
  departmentId,
  defaultStatusId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentId: Id
  defaultStatusId?: Id
}) {
  const department = useDepartment(departmentId)
  const statuses = useDepartmentStatuses(departmentId)
  const types = useWorkItemTypes()
  const labels = useLabels()
  const users = useUsers()
  const openWorkItem = useStore((state) => state.openWorkItem)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [typeId, setTypeId] = useState('')
  const [statusId, setStatusId] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [assigneeId, setAssigneeId] = useState('unassigned')
  const [labelIds, setLabelIds] = useState<Id[]>([])
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)

  // Reset each time the dialog opens, so a previous draft never leaks
  // into the next item. Adjusted during render rather than in an effect
  // so the form never paints one frame of the last item's values.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setTitle('')
      setDescription('')
      setTypeId(types[0]?.id ?? '')
      setStatusId(defaultStatusId ?? statuses[0]?.id ?? '')
      setPriority('medium')
      setAssigneeId('unassigned')
      setLabelIds([])
      setDueDate(undefined)
    }
  }

  const members = department ? users.filter((user) => department.memberIds.includes(user.id)) : users

  const submit = () => {
    const due = dueDate ? new Date(dueDate) : null
    due?.setHours(17, 0, 0, 0)

    const id = workItemService.createWorkItem({
      title,
      departmentId,
      statusId,
      typeId,
      priority,
      assigneeId: assigneeId === 'unassigned' ? null : assigneeId,
      labelIds,
      dueDate: due ? due.toISOString() : null,
      description,
    })

    onOpenChange(false)
    if (id) {
      toast.success('Work item created', { description: title.trim() })
      openWorkItem(id)
    }
  }

  return (
    <EntityDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`New work item in ${department?.name ?? 'this department'}`}
      submitLabel="Create"
      canSubmit={Boolean(title.trim() && statusId && typeId)}
      onSubmit={submit}
      className="sm:max-w-lg"
    >
      <Field label="Title" htmlFor="wi-title">
        <Input
          id="wi-title"
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
        />
      </Field>

      <Field label="Description" htmlFor="wi-description">
        <Textarea
          id="wi-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Anything the assignee needs to know"
          rows={3}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  <span className="flex items-center gap-2">
                    <TypeIcon type={type} />
                    {type.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Status">
          <Select value={statusId} onValueChange={setStatusId}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  <span className="flex items-center gap-2">
                    <StatusIcon category={status.category} />
                    {status.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Priority">
          <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...PRIORITIES].reverse().map((entry) => (
                <SelectItem key={entry} value={entry}>
                  <span className="flex items-center gap-2">
                    <PriorityIndicator priority={entry} />
                    {PRIORITY_LABEL[entry]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Assignee">
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {members.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <span className="flex items-center gap-2">
                    <UserAvatar user={user} size="xs" />
                    {user.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Due date">
        <Popover>
          <PopoverTrigger className="inline-flex h-8 w-full items-center rounded-md border border-input px-2.5 text-left text-[13px] outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40">
            {dueDate ? formatDueDate(dueDate.toISOString()) : <span className="text-muted-foreground">No due date</span>}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dueDate} onSelect={setDueDate} autoFocus />
          </PopoverContent>
        </Popover>
      </Field>

      <Field label="Labels">
        <div className="flex flex-wrap gap-1">
          {labels.map((label) => {
            const on = labelIds.includes(label.id)
            return (
              <button
                key={label.id}
                type="button"
                onClick={() =>
                  setLabelIds(on ? labelIds.filter((id) => id !== label.id) : [...labelIds, label.id])
                }
                className={on ? '' : 'opacity-45 transition-opacity hover:opacity-80'}
              >
                {on ? (
                  <LabelChip label={label} />
                ) : (
                  <span className="inline-flex h-5 items-center gap-1 rounded border border-border px-1.5 text-[11px] text-muted-foreground">
                    <span className="size-1.5 rounded-full" style={hueDot(label.hue)} />
                    {label.name}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Field>
    </EntityDialog>
  )
}
