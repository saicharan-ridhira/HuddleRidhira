'use client'

import { Radio, TriangleAlert, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DynamicIcon, UserAvatar } from '@/components/primitives'
import { huddleService } from '@/lib/services'
import type { EngineContext } from '@/lib/engine/context'
import type { Huddle, Organization } from '@/lib/types'
import { hueStyle } from '@/lib/ui/tokens'
import { cn } from '@/lib/utils'

/**
 * Attendance belongs to the huddle — no separate workflow, no second
 * screen. Every department starts present because marking the one or
 * two heads who could not make it is faster than ticking the rest.
 *
 * The row is a department, not a person: the head is who speaks for it.
 */
export function Attendance({
  huddle,
  organization,
  ctx,
}: {
  huddle: Huddle
  organization: Organization
  ctx: EngineContext
}) {
  const present = huddle.participants.filter((entry) => entry.attendance === 'present').length
  const total = huddle.participants.length
  const skipped = huddle.skippedDepartmentIds.map((id) => ctx.departments[id]!).filter(Boolean)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">{organization.name} Leadership Huddle</h1>
        <p className="text-[13px] text-muted-foreground">
          {new Date(huddle.scheduledFor).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {' · '}
          {organization.huddle.time}
          {' · heads of department'}
        </p>
      </header>

      {skipped.length > 0 && (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertTitle>
            {skipped.length} department{skipped.length === 1 ? '' : 's'} cannot take part
          </AlertTitle>
          <AlertDescription>
            <p>
              {skipped.map((department) => department.name).join(', ')}{' '}
              {skipped.length === 1 ? 'has' : 'have'} no head assigned, so nobody can speak for{' '}
              {skipped.length === 1 ? 'it' : 'them'}. Set one in Settings → Departments.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Attendance</h2>
          <span className="text-[13px] tabular-nums">
            <span className="font-semibold">{present}</span>
            <span className="text-muted-foreground"> / {total} present</span>
          </span>
        </div>

        <ul className="grid gap-1 sm:grid-cols-2">
          {huddle.participants.map((participant) => {
            const department = ctx.departments[participant.departmentId]
            const head = ctx.users[participant.userId]
            const isPresent = participant.attendance === 'present'
            if (!department) return null

            return (
              <li key={participant.departmentId}>
                <button
                  type="button"
                  onClick={() => huddleService.toggleAttendance(huddle.id, participant.departmentId)}
                  aria-pressed={isPresent}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring/40 outline-none',
                    isPresent
                      ? 'border-border bg-card hover:border-ring/40'
                      : 'border-dashed border-border bg-muted/30 opacity-60 hover:opacity-90',
                  )}
                >
                  <span
                    style={hueStyle(department.hue)}
                    className="flex size-7 shrink-0 items-center justify-center rounded bg-[var(--chip-bg)] text-[var(--chip-fg)]"
                  >
                    <DynamicIcon name={department.icon} />
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-medium">{department.name}</span>
                    <span className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                      <UserAvatar user={head} size="xs" />
                      {head?.name ?? 'No head assigned'}
                    </span>
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
          {present === 0
            ? 'Mark at least one department present.'
            : `Reviewing ${present} department${present === 1 ? '' : 's'}.`}
        </p>
      </div>
    </div>
  )
}
