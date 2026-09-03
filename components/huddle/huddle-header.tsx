'use client'

import { ChevronLeft, ChevronRight, CircleCheckBig, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DynamicIcon, UserAvatar } from '@/components/primitives'
import { huddleService } from '@/lib/services'
import type { EngineContext } from '@/lib/engine/context'
import type { Huddle } from '@/lib/types'
import { hueStyle } from '@/lib/ui/tokens'
import { cn } from '@/lib/utils'

/**
 * The roster doubles as a progress bar: which departments are done, and
 * which one the room is on. Each chip is a department, badged with the
 * head who is speaking for it.
 */
export function HuddleHeader({ huddle, ctx }: { huddle: Huddle; ctx: EngineContext }) {
  const present = huddle.participants.filter((entry) => entry.attendance === 'present').length
  const total = huddle.participants.length
  const isLast = huddle.currentIndex >= huddle.reviewOrder.length - 1

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2">
      <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold">
        <Radio className="size-3.5 text-blocked" />
        Leadership Huddle
      </span>

      <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
        {present}/{total} present
      </span>

      <ol className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
        {huddle.reviewOrder.map((departmentId, index) => {
          const department = ctx.departments[departmentId]
          const participant = huddle.participants.find((entry) => entry.departmentId === departmentId)
          const head = participant ? ctx.users[participant.userId] : undefined
          const active = index === huddle.currentIndex
          const reviewed = participant?.reviewedAt

          if (!department) return null

          return (
            <li key={departmentId}>
              <button
                type="button"
                onClick={() => huddleService.goToDepartment(huddle.id, index)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-1.5 py-1 whitespace-nowrap transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-ring/40 outline-none',
                  active ? 'bg-accent' : 'hover:bg-accent/50',
                  !active && reviewed && 'opacity-50',
                )}
                title={`${department.name} — ${head?.name ?? 'no head'}`}
              >
                <span style={hueStyle(department.hue)} className="text-[var(--chip-fg)]">
                  <DynamicIcon name={department.icon} />
                </span>
                {active && <span className="text-[12px] font-medium">{department.name}</span>}
                <UserAvatar user={head} size="xs" />
              </button>
            </li>
          )
        })}
      </ol>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => huddleService.previousDepartment(huddle.id)}
          disabled={huddle.currentIndex === 0}
        >
          <ChevronLeft />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <Button size="sm" onClick={() => huddleService.nextDepartment(huddle.id)}>
          {isLast ? (
            <>
              Finish
              <CircleCheckBig />
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Next</span>
              <ChevronRight />
            </>
          )}
        </Button>
      </div>
    </header>
  )
}
