'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChecklistProgress } from '@/components/primitives'
import { EditableText } from './inline/editable-text'
import { workItemService } from '@/lib/services'
import { checklistProgress } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { WorkItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * PRD §36. The bar plus the fraction is the point: progress toward a
 * goal should feel like it is accelerating as it nears the end
 * (goal-gradient), and the outstanding entries stay visible rather than
 * collapsing once most are ticked (Zeigarnik).
 */
export function Checklist({ item, ctx }: { item: WorkItem; ctx: EngineContext }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const progress = checklistProgress(item, ctx)
  const checklist = item.checklistId ? ctx.checklists[item.checklistId] : undefined
  const entries = (checklist?.itemIds ?? []).map((id) => ctx.checklistItems[id]).filter(Boolean)

  const submit = () => {
    const trimmed = draft.trim()
    if (trimmed) workItemService.addChecklistItem(item.id, trimmed)
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-2">
      {progress && <ChecklistProgress progress={progress} variant="bar" />}

      <ul className="flex flex-col gap-px">
        {entries.map((entry) => (
          <li key={entry!.id} className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-accent/50">
            <Checkbox
              checked={entry!.done}
              onCheckedChange={() => workItemService.toggleChecklistItem(item.id, entry!.id)}
              aria-label={entry!.text}
            />
            <EditableText
              value={entry!.text}
              onCommit={(next) => workItemService.renameChecklistItem(entry!.id, next)}
              className={cn('flex-1 text-[13px]', entry!.done && 'text-muted-foreground line-through')}
            />
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              onClick={() => workItemService.removeChecklistItem(item.id, entry!.id)}
              aria-label={`Remove ${entry!.text}`}
            >
              <X />
            </Button>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            value={draft}
            placeholder="Add a step…"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submit()
              }
              if (event.key === 'Escape') {
                setDraft('')
                setAdding(false)
              }
            }}
            onBlur={() => {
              submit()
              setAdding(false)
            }}
            className="h-7"
          />
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="w-fit text-muted-foreground" onClick={() => setAdding(true)}>
          <Plus />
          Add step
        </Button>
      )}
    </div>
  )
}
