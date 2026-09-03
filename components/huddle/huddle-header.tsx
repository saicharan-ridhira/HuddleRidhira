'use client'

import { ChevronLeft, ChevronRight, CircleCheckBig, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/primitives'
import { huddleService } from '@/lib/services'
import type { EngineContext } from '@/lib/engine/context'
import type { Department, Huddle } from '@/lib/types'
import { cn } from '@/lib/utils'

export function HuddleHeader({
  huddle,
  department,
  ctx,
}: {
  huddle: Huddle
  department: Department
  ctx: EngineContext
}) {
  const present = huddle.participants.filter((entry) => entry.attendance === 'present').length
  const total = huddle.participants.length

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2">
      <span className="flex items-center gap-1.5 text-[13px] font-semibold">
        <Radio className="size-3.5 text-blocked" />
        {department.name} Huddle
      </span>

      <span className="text-[12px] tabular-nums text-muted-foreground">
        {present}/{total} present
      </span>

      {/* The roster doubles as a progress bar: who is done, who is next. */}
      <ol className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
        {huddle.reviewOrder.map((userId, index) => {
          const user = ctx.users[userId]
          const active = index === huddle.currentIndex
          const reviewed = huddle.participants.find((entry) => entry.userId === userId)?.reviewedAt

          return (
            <li key={userId}>
              <button
                type="button"
                onClick={() => huddleService.goToPerson(huddle.id, index)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-ring/40 outline-none',
                  active ? 'bg-accent' : 'hover:bg-accent/50',
                  !active && reviewed && 'opacity-50',
                )}
                title={user?.name}
              >
                <UserAvatar user={user} size="xs" />
                {active && <span className="text-[12px] font-medium">{user?.name}</span>}
              </button>
            </li>
          )
        })}
      </ol>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => huddleService.previousPerson(huddle.id)}
          disabled={huddle.currentIndex === 0}
        >
          <ChevronLeft />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <Button size="sm" onClick={() => huddleService.nextPerson(huddle.id)}>
          {huddle.currentIndex >= huddle.reviewOrder.length - 1 ? (
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
