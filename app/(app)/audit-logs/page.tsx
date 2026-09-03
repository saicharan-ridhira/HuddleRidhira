'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserAvatar } from '@/components/primitives'
import { relativeTime } from '@/components/work/work-item-drawer'
import { useAuditEvents, useDepartments, useEngineContext } from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import type { AuditEntityKind } from '@/lib/types'

const KINDS: AuditEntityKind[] = [
  'work-item', 'dependency', 'blocker', 'checklist', 'comment', 'huddle', 'huddle-action',
  'department', 'member', 'role', 'workflow', 'status', 'label', 'work-item-type',
  'custom-field', 'view', 'organization',
]

/**
 * PRD §41. Available to anyone who needs it, and deliberately out of the
 * way of daily work — the log is written automatically by the service
 * layer's audit wrapper, so it covers everything without cluttering the
 * surfaces where work actually happens.
 */
export default function AuditLogsPage() {
  const events = useAuditEvents(400)
  const ctx = useEngineContext()
  const departments = useDepartments()
  const openWorkItem = useStore((state) => state.openWorkItem)

  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')
  const [departmentId, setDepartmentId] = useState('all')

  const filtered = useMemo(
    () =>
      events
        .filter((event) => kind === 'all' || event.kind === kind)
        .filter((event) => departmentId === 'all' || event.departmentId === departmentId)
        .filter((event) => {
          if (!query.trim()) return true
          const actor = ctx.users[event.actorId]?.name ?? ''
          return `${actor} ${event.summary}`.toLowerCase().includes(query.toLowerCase())
        }),
    [events, kind, departmentId, query, ctx],
  )

  return (
    <>
      <PageHeader
        title="Audit logs"
        description={`${filtered.length} event${filtered.length === 1 ? '' : 's'}`}
        actions={
          <>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search events…"
              className="w-48"
            />
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {KINDS.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry.replace('-', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <ul className="mx-auto w-full max-w-4xl">
          {filtered.map((event) => {
            const actor = ctx.users[event.actorId]
            const workItem = ctx.workItems[event.entityId]

            return (
              <li
                key={event.id}
                className="flex items-center gap-2.5 border-b border-border px-4 py-2 text-[13px]"
              >
                <span className="w-16 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {new Date(event.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <UserAvatar user={actor} size="xs" />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{actor?.name ?? 'Someone'}</span>{' '}
                  <span className="text-muted-foreground">{event.summary}</span>
                  {event.detail && event.detail.from && event.detail.to && (
                    <span className="text-muted-foreground">
                      {' '}
                      ({event.detail.from} → {event.detail.to})
                    </span>
                  )}
                </span>

                {workItem && (
                  <button
                    type="button"
                    onClick={() => openWorkItem(workItem.id)}
                    className="shrink-0 font-mono text-[11px] text-primary underline-offset-2 hover:underline"
                  >
                    {workItem.key}
                  </button>
                )}

                <span className="w-24 shrink-0 text-right text-[10px] text-muted-foreground">
                  {relativeTime(event.at, ctx.now)}
                </span>
              </li>
            )
          })}

          {filtered.length === 0 && (
            <li className="px-4 py-12 text-center text-[13px] text-muted-foreground">No events match that filter.</li>
          )}
        </ul>
      </div>
    </>
  )
}
