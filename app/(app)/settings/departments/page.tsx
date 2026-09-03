'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Crown, Plus, Trash2 } from 'lucide-react'
import { SettingsPage } from '@/components/settings/settings-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EntityDialog, Field as DialogField } from '@/components/settings/entity-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DynamicIcon, UserAvatar } from '@/components/primitives'
import { EditableText } from '@/components/work/inline/editable-text'
import { useAllWorkItems, useDepartments, useEngineContext, useUsers, useWorkflows } from '@/lib/store/selectors'
import { configService } from '@/lib/services'
import { HUES, type Hue, type ViewLayout } from '@/lib/types'
import { hueStyle } from '@/lib/ui/tokens'
import { toast } from 'sonner'

const ICONS = ['Code2', 'Compass', 'Megaphone', 'TrendingUp', 'Handshake', 'Sparkles', 'Inbox', 'Siren']
const LAYOUTS: ViewLayout[] = ['board', 'list', 'table', 'calendar', 'timeline']

/** PRD §38 — a department is a workspace with its own defaults. */
export default function DepartmentsSettingsPage() {
  const departments = useDepartments()
  const workflows = useWorkflows()
  const items = useAllWorkItems()
  const ctx = useEngineContext()
  const users = useUsers()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  // A department with no head cannot take part in the huddle, so the
  // create form asks for one rather than leaving it blank and letting
  // the department quietly vanish from the roster.
  const [leadId, setLeadId] = useState('')

  const create = () => {
    const trimmed = name.trim()
    const workflow = workflows[0]
    if (!trimmed || !workflow || !leadId) return

    configService.createDepartment({
      name: trimmed,
      description: 'Created in settings.',
      icon: 'Sparkles',
      hue: 'teal',
      workflowId: workflow.id,
      defaultView: 'board',
      memberIds: [],
      leadId,
    })
    setName('')
    setLeadId('')
    setCreating(false)
    toast.success(`${trimmed} created`)
  }

  return (
    <SettingsPage
      title="Departments"
      description="Each department is a workspace with its own workflow, default view and huddle rules."
      actions={
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus />
          New department
        </Button>
      }
    >
      {departments.map((department) => {
        const owned = items.filter((item) => item.departmentId === department.id)
        const lead = ctx.users[department.leadId]

        return (
          <section key={department.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2.5">
              <span
                style={hueStyle(department.hue)}
                className="flex size-7 shrink-0 items-center justify-center rounded bg-[var(--chip-bg)] text-[var(--chip-fg)]"
              >
                <DynamicIcon name={department.icon} />
              </span>

              <div className="flex min-w-0 flex-1 flex-col">
                <EditableText
                  value={department.name}
                  onCommit={(next) => configService.updateDepartment(department.id, { name: next })}
                  className="text-[13px] font-semibold"
                />
                <EditableText
                  value={department.description}
                  onCommit={(next) => configService.updateDepartment(department.id, { description: next })}
                  placeholder="Add a description"
                  className="text-[11px] text-muted-foreground"
                />
              </div>

              <Badge variant="muted">{owned.length} items</Badge>

              <Button variant="ghost" size="sm" asChild>
                <Link href={`/departments/${department.slug}/board`}>
                  Open
                  <ArrowRight />
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  configService.deleteDepartment(department.id)
                  toast.success(`Deleted ${department.name}`, {
                    description: owned.length > 0 ? `${owned.length} work items were removed with it.` : undefined,
                  })
                }}
                aria-label={`Delete ${department.name}`}
              >
                <Trash2 />
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Workflow">
                <Select
                  value={department.workflowId}
                  onValueChange={(value) => configService.updateDepartment(department.id, { workflowId: value })}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Default view">
                <Select
                  value={department.defaultView}
                  onValueChange={(value) =>
                    configService.updateDepartment(department.id, { defaultView: value as ViewLayout })
                  }
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUTS.map((layout) => (
                      <SelectItem key={layout} value={layout}>
                        <span className="capitalize">{layout}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Icon">
                <Select
                  value={department.icon}
                  onValueChange={(value) => configService.updateDepartment(department.id, { icon: value })}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        <span className="flex items-center gap-2">
                          <DynamicIcon name={icon} />
                          {icon}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Colour">
                <Select
                  value={department.hue}
                  onValueChange={(value) => configService.updateDepartment(department.id, { hue: value as Hue })}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HUES.map((hue) => (
                      <SelectItem key={hue} value={hue}>
                        <span className="flex items-center gap-2">
                          <span style={hueStyle(hue)} className="size-3 rounded-full bg-[var(--chip-fg)]" />
                          <span className="capitalize">{hue}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,240px)_1fr]">
              <Field label="Head of department">
                <Select
                  value={department.leadId || 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') return
                    configService.setDepartmentLead(department.id, value)
                    toast.success(`${ctx.users[value]?.name ?? 'They'} now heads ${department.name}`)
                  }}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue placeholder="Nobody assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {!department.leadId && (
                      <SelectItem value="none" disabled>
                        Nobody assigned
                      </SelectItem>
                    )}
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <span className="flex items-center gap-2">
                          <UserAvatar user={user} size="xs" />
                          {user.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!lead && (
                  <span className="text-[10px] font-medium text-overdue">
                    Cannot take part in the huddle without one
                  </span>
                )}
              </Field>

              <Field label={`Members (${department.memberIds.length})`}>
                <div className="flex flex-wrap gap-1">
                  {users.map((user) => {
                    const isMember = department.memberIds.includes(user.id)
                    const isHead = department.leadId === user.id
                    return (
                      <button
                        key={user.id}
                        type="button"
                        disabled={isHead}
                        title={isHead ? 'The head is always a member' : undefined}
                        onClick={() =>
                          configService.setDepartmentMembers(
                            department.id,
                            isMember
                              ? department.memberIds.filter((id) => id !== user.id)
                              : [...department.memberIds, user.id],
                          )
                        }
                        className={
                          isMember
                            ? 'inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary disabled:opacity-60'
                            : 'inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent'
                        }
                      >
                        <UserAvatar user={user} size="xs" />
                        {user.name.split(' ')[0]}
                        {isHead && <Crown className="size-2.5 text-overdue" />}
                      </button>
                    )
                  })}
                </div>
              </Field>
            </div>
          </section>
        )
      })}

      <EntityDialog
        open={creating}
        onOpenChange={setCreating}
        title="New department"
        description="Workflow, members and colour can be changed afterwards. A head is required — without one the department cannot take part in the huddle."
        submitLabel="Create department"
        canSubmit={Boolean(name.trim() && leadId)}
        onSubmit={create}
      >
        <DialogField label="Name" htmlFor="dept-name">
          <Input
            id="dept-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Customer Success"
          />
        </DialogField>

        <DialogField label="Head of department">
          <Select value={leadId} onValueChange={setLeadId}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="Choose a head" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <span className="flex items-center gap-2">
                    <UserAvatar user={user} size="xs" />
                    {user.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogField>
      </EntityDialog>
    </SettingsPage>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      {children}
    </div>
  )
}
