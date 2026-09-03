'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { SettingsPage } from '@/components/settings/settings-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LabelChip } from '@/components/primitives'
import { EditableText } from '@/components/work/inline/editable-text'
import { useAllWorkItems, useLabels } from '@/lib/store/selectors'
import { configService } from '@/lib/services'
import { HUES, type Hue } from '@/lib/types'
import { hueStyle } from '@/lib/ui/tokens'
import { toast } from 'sonner'

/**
 * PRD §21. The preview column is the point: a label's appearance is
 * fixed here and identical everywhere it is used, so this page is where
 * you decide what it will look like on every card and row.
 */
export default function LabelsSettingsPage() {
  const labels = useLabels()
  const items = useAllWorkItems()
  const [name, setName] = useState('')
  const [hue, setHue] = useState<Hue>('blue')

  const create = () => {
    if (!name.trim()) return
    configService.createLabel(name.trim(), hue)
    setName('')
    toast.success('Label created')
  }

  return (
    <SettingsPage title="Labels" description="Cross-cutting tags. The same label looks the same everywhere it appears.">
      <div className="flex items-center gap-1.5">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && create()}
          placeholder="New label name"
          className="max-w-xs"
        />
        <Select value={hue} onValueChange={(value) => setHue(value as Hue)}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HUES.map((entry) => (
              <SelectItem key={entry} value={entry}>
                <span className="flex items-center gap-2">
                  <span style={hueStyle(entry)} className="size-3 rounded-full bg-[var(--chip-fg)]" />
                  <span className="capitalize">{entry}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={create} disabled={!name.trim()}>
          <Plus />
          Add
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {labels.map((label) => {
          const usage = items.filter((item) => item.labelIds.includes(label.id)).length

          return (
            <div key={label.id} className="group flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
              <LabelChip label={label} />

              <EditableText
                value={label.name}
                onCommit={(next) => configService.updateLabel(label.id, { name: next })}
                className="min-w-0 flex-1 text-[13px]"
              />

              <Select value={label.hue} onValueChange={(value) => configService.updateLabel(label.id, { hue: value as Hue })}>
                <SelectTrigger size="sm" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HUES.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      <span className="flex items-center gap-2">
                        <span style={hueStyle(entry)} className="size-3 rounded-full bg-[var(--chip-fg)]" />
                        <span className="capitalize">{entry}</span>
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
                className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                onClick={() => {
                  configService.deleteLabel(label.id)
                  toast.success(`Deleted ${label.name}`, {
                    description: usage > 0 ? `Removed from ${usage} work item${usage === 1 ? '' : 's'}.` : undefined,
                  })
                }}
                aria-label={`Delete ${label.name}`}
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
