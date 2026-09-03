'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { SettingsPage } from '@/components/settings/settings-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DynamicIcon, TypeIcon } from '@/components/primitives'
import { EditableText } from '@/components/work/inline/editable-text'
import { useAllWorkItems, useWorkItemTypes } from '@/lib/store/selectors'
import { configService } from '@/lib/services'
import { HUES, type Hue } from '@/lib/types'
import { hueStyle } from '@/lib/ui/tokens'
import { toast } from 'sonner'

const ICONS = ['CircleDashed', 'Bug', 'Sparkles', 'BookOpen', 'Inbox', 'Siren', 'Megaphone', 'Handshake', 'CreditCard']

/** PRD §10 — "Work Item", not "ticket". Types are configurable. */
export default function WorkItemTypesSettingsPage() {
  const types = useWorkItemTypes()
  const items = useAllWorkItems()
  const [name, setName] = useState('')

  return (
    <SettingsPage
      title="Work item types"
      description="The kinds of work this organization tracks. Everything is a work item; the type is a label on it."
      actions={
        <div className="flex items-center gap-1.5">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && name.trim()) {
                configService.createWorkItemType(name.trim(), 'CircleDashed', 'gray')
                setName('')
                toast.success('Type created')
              }
            }}
            placeholder="New type"
            className="w-32"
          />
          <Button
            size="sm"
            disabled={!name.trim()}
            onClick={() => {
              configService.createWorkItemType(name.trim(), 'CircleDashed', 'gray')
              setName('')
              toast.success('Type created')
            }}
          >
            <Plus />
            Add
          </Button>
        </div>
      }
    >
      <div className="overflow-hidden rounded-lg border border-border">
        {types.map((type) => {
          const usage = items.filter((item) => item.typeId === type.id).length

          return (
            <div key={type.id} className="group flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
              <TypeIcon type={type} />

              <EditableText
                value={type.name}
                onCommit={(next) => configService.updateWorkItemType(type.id, { name: next })}
                className="min-w-0 flex-1 text-[13px]"
              />

              <Select
                value={type.icon}
                onValueChange={(value) => configService.updateWorkItemType(type.id, { icon: value })}
              >
                <SelectTrigger size="sm" className="w-40">
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

              <Select value={type.hue} onValueChange={(value) => configService.updateWorkItemType(type.id, { hue: value as Hue })}>
                <SelectTrigger size="sm" className="w-28">
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

              <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                {usage} item{usage === 1 ? '' : 's'}
              </span>

              <Button
                variant="ghost"
                size="icon-xs"
                disabled={types.length <= 1}
                className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 disabled:opacity-0"
                onClick={() => {
                  configService.deleteWorkItemType(type.id)
                  toast.success(`Deleted ${type.name}`, {
                    description: usage > 0 ? `${usage} item${usage === 1 ? '' : 's'} moved to another type.` : undefined,
                  })
                }}
                aria-label={`Delete ${type.name}`}
              >
                <Trash2 />
              </Button>
            </div>
          )
        })}
      </div>
    </SettingsPage>
  )
}
