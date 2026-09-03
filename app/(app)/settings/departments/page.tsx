'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import { SettingsPage } from '@/components/settings/settings-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DynamicIcon, UserAvatar } from '@/components/primitives'
import { EditableText } from '@/components/work/inline/editable-text'
import { useAllWorkItems, useDepartments, useEngineContext, useWorkflows } from '@/lib/store/selectors'
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
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const create = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const workflow = workflows[0]
    if (!workflow) return

    configService.createDepartment({
      name: trimmed,
      description: 'Created in settings.',
      icon: 'Sparkles',
      hue: 'teal',
      workflowId: workflow.id,
      defaultView: 'board',
      memberIds: [],
      leadId: '',
      huddle: { cadence: 'daily', time: '09:30', groupBy: 'assignee', discussionLimit: 3 },
    })
    setName('')
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

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Members</span>
              <div className="flex items-center -space-x-1.5">
                {department.memberIds.slice(0, 8).map((id) => (
                  <UserAvatar key={id} user={ctx.users[id]} size="sm" className="ring-2 ring-background" />
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">{department.memberIds.length}</span>
              {lead && <span className="ml-auto text-[11px] text-muted-foreground">Lead: {lead.name}</span>}
            </div>
          </section>
        )
      })}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New department</DialogTitle>
            <DialogDescription>You can set its workflow, members and huddle rules afterwards.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dept-name">Name</Label>
            <Input
              id="dept-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && create()}
              placeholder="Customer Success"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
