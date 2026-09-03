'use client'

import { useState } from 'react'
import { CircleCheck, OctagonAlert, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { dependencyService } from '@/lib/services'
import { activeBlockers } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { WorkItem } from '@/lib/types'

/**
 * Manually declared blockers, separate from dependency-derived ones.
 * PRD §33 lists "Add blocker" and "Resolve blocker" as huddle actions
 * distinct from adding a dependency — not everything that stops work is
 * another work item.
 */
export function BlockerList({ item, ctx, compact = false }: { item: WorkItem; ctx: EngineContext; compact?: boolean }) {
  const [adding, setAdding] = useState(false)
  const [reason, setReason] = useState('')

  const blockers = activeBlockers(item.id, ctx)
  const resolved = (ctx.blockerIndex[item.id] ?? []).filter((blocker) => blocker.resolvedAt !== null)

  const submit = () => {
    const trimmed = reason.trim()
    if (trimmed) dependencyService.addBlocker(item.id, trimmed)
    setReason('')
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {blockers.map((blocker) => (
        <div
          key={blocker.id}
          className="flex items-start gap-2 rounded-md border border-blocked-border bg-blocked-muted/50 px-2 py-1.5"
        >
          <OctagonAlert className="mt-px size-3.5 shrink-0 text-blocked" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[13px] leading-snug">{blocker.reason}</p>
            <p className="text-[10px] text-muted-foreground">
              Raised by {ctx.users[blocker.createdBy]?.name ?? 'someone'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="xs"
            className="shrink-0 text-blocked hover:bg-blocked/10"
            onClick={() => dependencyService.resolveBlocker(blocker.id)}
          >
            <CircleCheck />
            Resolve
          </Button>
        </div>
      ))}

      {!compact &&
        resolved.map((blocker) => (
          <div key={blocker.id} className="flex items-start gap-2 px-2 py-1 opacity-60">
            <CircleCheck className="mt-px size-3.5 shrink-0 text-unblocked" />
            <p className="flex-1 text-[12px] line-through">{blocker.reason}</p>
          </div>
        ))}

      {adding ? (
        <Input
          autoFocus
          value={reason}
          placeholder="What is stopping this?"
          onChange={(event) => setReason(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
            if (event.key === 'Escape') {
              setReason('')
              setAdding(false)
            }
          }}
          onBlur={submit}
          className="h-7"
        />
      ) : (
        <Button variant="ghost" size="sm" className="w-fit text-muted-foreground" onClick={() => setAdding(true)}>
          <Plus />
          Add blocker
        </Button>
      )}
    </div>
  )
}
