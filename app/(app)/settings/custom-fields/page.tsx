'use client'

import { useState } from 'react'
import { Info, Plus, Trash2 } from 'lucide-react'
import { SettingsPage } from '@/components/settings/settings-page'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EditableText } from '@/components/work/inline/editable-text'
import { useCustomFields, useDepartments, useEngineContext } from '@/lib/store/selectors'
import { configService } from '@/lib/services'
import { CUSTOM_FIELD_KINDS, type CustomFieldKind } from '@/lib/types'
import { toast } from 'sonner'

/**
 * PRD §22. Fields are defined here and scoped to departments, but where
 * they *appear* is a per-view decision — that separation is what keeps a
 * team with thirty custom fields from meeting all thirty on every card.
 */
export default function CustomFieldsSettingsPage() {
  const fields = useCustomFields()
  const departments = useDepartments()
  const ctx = useEngineContext()

  const [name, setName] = useState('')
  const [kind, setKind] = useState<CustomFieldKind>('text')

  const create = () => {
    if (!name.trim()) return
    configService.createCustomField({
      name: name.trim(),
      kind,
      departmentIds: [],
      options: kind === 'dropdown' || kind === 'multi-select' ? ['Option one', 'Option two'] : [],
    })
    setName('')
    toast.success('Custom field created')
  }

  return (
    <SettingsPage
      title="Custom fields"
      description="Extra properties on work items. Scoped to departments here; shown per view."
      actions={
        <div className="flex items-center gap-1.5">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && create()}
            placeholder="Field name"
            className="w-36"
          />
          <Select value={kind} onValueChange={(value) => setKind(value as CustomFieldKind)}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CUSTOM_FIELD_KINDS.map((entry) => (
                <SelectItem key={entry} value={entry}>
                  <span className="capitalize">{entry.replace('-', ' ')}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={create} disabled={!name.trim()}>
            <Plus />
            Add
          </Button>
        </div>
      }
    >
      <Alert>
        <Info />
        <AlertTitle>Defined here, shown per view</AlertTitle>
        <AlertDescription>
          A new field does not appear on cards or tables automatically. Turn it on for a particular view under
          View → Visible fields, so each team sees only the fields it works with.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-2">
        {fields.map((field) => (
          <div key={field.id} className="group flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <EditableText
                value={field.name}
                onCommit={(next) => configService.updateCustomField(field.id, { name: next })}
                className="text-[13px] font-medium"
              />

              <Select
                value={field.kind}
                onValueChange={(value) => configService.updateCustomField(field.id, { kind: value as CustomFieldKind })}
              >
                <SelectTrigger size="sm" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_FIELD_KINDS.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      <span className="capitalize">{entry.replace('-', ' ')}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="ml-auto flex items-center gap-1">
                {field.departmentIds.length === 0 ? (
                  <Badge variant="outline">All departments</Badge>
                ) : (
                  field.departmentIds.map((id) => (
                    <Badge key={id} variant="muted">
                      {ctx.departments[id]?.name ?? 'Unknown'}
                    </Badge>
                  ))
                )}
              </div>

              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                onClick={() => {
                  configService.deleteCustomField(field.id)
                  toast.success(`Deleted ${field.name}`)
                }}
                aria-label={`Delete ${field.name}`}
              >
                <Trash2 />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Applies to</span>
              <button
                type="button"
                onClick={() => configService.updateCustomField(field.id, { departmentIds: [] })}
                className={
                  field.departmentIds.length === 0
                    ? 'rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary'
                    : 'rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent'
                }
              >
                Everything
              </button>
              {departments.map((department) => {
                const on = field.departmentIds.includes(department.id)
                return (
                  <button
                    key={department.id}
                    type="button"
                    onClick={() =>
                      configService.updateCustomField(field.id, {
                        departmentIds: on
                          ? field.departmentIds.filter((id) => id !== department.id)
                          : [...field.departmentIds, department.id],
                      })
                    }
                    className={
                      on
                        ? 'rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary'
                        : 'rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent'
                    }
                  >
                    {department.name}
                  </button>
                )
              })}
            </div>

            {(field.kind === 'dropdown' || field.kind === 'multi-select') && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Options</span>
                {field.options.map((option, index) => (
                  <span
                    key={`${option}-${index}`}
                    className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px]"
                  >
                    {option}
                    <button
                      type="button"
                      onClick={() =>
                        configService.updateCustomField(field.id, {
                          options: field.options.filter((_, position) => position !== index),
                        })
                      }
                      aria-label={`Remove ${option}`}
                      className="opacity-60 hover:opacity-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <AddOption
                  onAdd={(option) =>
                    configService.updateCustomField(field.id, { options: [...field.options, option] })
                  }
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </SettingsPage>
  )
}

function AddOption({ onAdd }: { onAdd: (option: string) => void }) {
  const [value, setValue] = useState('')

  return (
    <Input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && value.trim()) {
          event.preventDefault()
          onAdd(value.trim())
          setValue('')
        }
      }}
      placeholder="Add option…"
      className="h-6 w-28 text-[11px]"
    />
  )
}
