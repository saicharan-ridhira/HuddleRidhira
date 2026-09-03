'use client'

import { Radio, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/primitives'
import { huddleService } from '@/lib/services'
import type { Department, Huddle, User } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * PRD §27 and §35. Attendance belongs to the huddle — no separate
 * workflow, no second screen. Everyone starts present because marking
 * the two absentees is faster than ticking the eight who turned up.
 */
export function Attendance({
  huddle,
  department,
  members,
}: {
  huddle: Huddle
  department: Department
  members: User[]
}) {
  const present = huddle.participants.filter((entry) => entry.attendance === 'present').length
  const total = huddle.participants.length

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">{department.name} Huddle</h1>
        <p className="text-[13px] text-muted-foreground">
          {new Date(huddle.scheduledFor).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {' · '}
          {department.huddle.time}
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Attendance</h2>
          <span className="text-[13px] tabular-nums">
            <span className="font-semibold">{present}</span>
            <span className="text-muted-foreground"> / {total} present</span>
          </span>
        </div>

        <ul className="grid gap-1 sm:grid-cols-2">
          {members.map((member) => {
            const participant = huddle.participants.find((entry) => entry.userId === member.id)
            const isPresent = participant?.attendance === 'present'

            return (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => huddleService.toggleAttendance(huddle.id, member.id)}
                  aria-pressed={isPresent}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring/40 outline-none',
                    isPresent
                      ? 'border-border bg-card hover:border-ring/40'
                      : 'border-dashed border-border bg-muted/30 opacity-60 hover:opacity-90',
                  )}
                >
                  <UserAvatar user={member} size="lg" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-medium">{member.name}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{member.title}</span>
                  </span>
                  {isPresent ? (
                    <UserCheck className="size-4 shrink-0 text-unblocked" />
                  ) : (
                    <UserX className="size-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="flex items-center gap-2">
        <Button size="lg" onClick={() => huddleService.startHuddle(huddle.id)} disabled={present === 0}>
          <Radio />
          Start huddle
        </Button>
        <Button variant="ghost" size="lg" onClick={() => huddleService.cancelHuddle(huddle.id)}>
          Cancel
        </Button>
        <p className="ml-auto text-[11px] text-muted-foreground">
          {present === 0 ? 'Mark at least one person present.' : `Reviewing ${present} ${present === 1 ? 'person' : 'people'}.`}
        </p>
      </div>
    </div>
  )
}
