'use client'

import { useState } from 'react'
import { ArrowDown, Plus, Trash2 } from 'lucide-react'
import { SettingsPage, SettingsSection } from '@/components/settings/settings-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { StatusIcon } from '@/components/primitives'
import { EditableText } from '@/components/work/inline/editable-text'
import { useAllWorkItems, useDepartments, useEngineContext, useWorkflows } from '@/lib/store/selectors'
import { configService } from '@/lib/services'
import { STATUS_CATEGORIES, type StatusCategory } from '@/lib/types'
import { toast } from 'sonner'

/**
 * PRD §39. A workflow is presented as the pipeline it is — a vertical
 * chain with arrows — rather than as a table of rows. The whole point of
 * §39 is that configuration should look like the thing being configured
 * instead of exposing a workflow engine.
 *
 * Category is the one thing that is not free text: it is what tells the
 * rest of the product whether work in this status is finished, and
 * therefore whether anything downstream is still blocked.
 */
export default function WorkflowsSettingsPage() {
  const workflows = useWorkflows()
  const departments = useDepartments()
  const items = useAllWorkItems()
  const ctx = useEngineContext()
  const [newName, setNewName] = useState('')

  return (
    <SettingsPage
      title="Workflows & statuses"
      description="Each department runs one workflow. A status's category tells the product whether work there is finished."
      actions={
        <div className="flex items-center gap-1.5">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="New workflow"
            className="w-40"
          />
          <Button
            size="sm"
            disabled={!newName.trim()}
            onClick={() => {
              configService.createWorkflow(newName.trim(), 'Created in settings.')
              setNewName('')
              toast.success('Workflow created')
            }}
          >
            <Plus />
            Add
          </Button>
        </div>
      }
    >
      {workflows.map((workflow) => {
        const usedBy = departments.filter((department) => department.workflowId === workflow.id)
        const statuses = workflow.statusIds.map((id) => ctx.statuses[id]!).filter(Boolean)

        return (
          <SettingsSection key={workflow.id}>
            <div className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col">
                <EditableText
                  value={workflow.name}
                  onCommit={(next) => configService.updateWorkflow(workflow.id, { name: next })}
                  className="-ml-1 text-[13px] font-semibold"
                />
                <EditableText
                  value={workflow.description}
                  onCommit={(next) => configService.updateWorkflow(workflow.id, { description: next })}
                  placeholder="Add a description"
                  className="-ml-1 text-[12px] text-muted-foreground"
                />
              </div>

              <Button
                variant="ghost"
                size="icon-xs"
                className="mt-1 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  const result = configService.deleteWorkflow(workflow.id)
                  if (result.ok) toast.success(`Deleted ${workflow.name}`)
                  else toast.error(result.reason ?? 'Could not delete that workflow.')
                }}
                aria-label={`Delete ${workflow.name}`}
              >
                <Trash2 />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {usedBy.length > 0 ? (
                usedBy.map((department) => (
                  <Badge key={department.id} variant="muted">
                    {department.name}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline">Not in use</Badge>
              )}
            </div>

            <ol className="flex flex-col rounded-lg border border-border p-2">
              {statuses.map((status, index) => {
                const count = items.filter((item) => item.statusId === status.id).length

                return (
                  <li key={status.id} className="flex flex-col">
                    <div className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-accent/40">
                      <StatusIcon category={status.category} />

                      <EditableText
                        value={status.name}
                        onCommit={(next) => configService.updateStatusConfig(status.id, { name: next })}
                        className="min-w-0 flex-1 text-[13px]"
                      />

                      <Select
                        value={status.category}
                        onValueChange={(value) =>
                          configService.updateStatusConfig(status.id, { category: value as StatusCategory })
                        }
                      >
                        <SelectTrigger size="sm" className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              <span className="flex items-center gap-2">
                                <StatusIcon category={category} />
                                <span className="capitalize">{category}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                        {count} item{count === 1 ? '' : 's'}
                      </span>

                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={statuses.length <= 2}
                        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 disabled:opacity-0"
                        onClick={() => {
                          configService.deleteStatus(workflow.id, status.id)
                          toast.success(`Removed ${status.name}`, {
                            description: count > 0 ? `${count} item${count === 1 ? '' : 's'} moved to the first status.` : undefined,
                          })
                        }}
                        aria-label={`Remove ${status.name}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    {index < statuses.length - 1 && (
                      <span className="ml-3.5 flex h-3 items-center" aria-hidden>
                        <ArrowDown className="size-3 text-muted-foreground/40" />
                      </span>
                    )}
                  </li>
                )
              })}

              <AddStatus workflowId={workflow.id} />
            </ol>
          </SettingsSection>
        )
      })}
    </SettingsPage>
  )
}

function AddStatus({ workflowId }: { workflowId: string }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<StatusCategory>('unstarted')

  return (
    <li className="flex items-center gap-1.5 border-t border-border pt-2 pl-1.5">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="New status"
        className="h-7 max-w-48"
      />
      <Select value={category} onValueChange={(value) => setCategory(value as StatusCategory)}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_CATEGORIES.map((entry) => (
            <SelectItem key={entry} value={entry}>
              <span className="capitalize">{entry}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="xs"
        disabled={!name.trim()}
        onClick={() => {
          configService.createStatus(workflowId, name.trim(), category)
          setName('')
          toast.success('Status added')
        }}
      >
        <Plus />
        Add status
      </Button>
    </li>
  )
}
