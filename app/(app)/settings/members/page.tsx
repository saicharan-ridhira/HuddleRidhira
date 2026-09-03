'use client'

import { useMemo, useState } from 'react'
import { SettingsPage } from '@/components/settings/settings-page'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserAvatar } from '@/components/primitives'
import { useAllWorkItems, useDepartments, useEngineContext, useRoles, useUsers } from '@/lib/store/selectors'
import { configService } from '@/lib/services'
import { isBlocked, isDone } from '@/lib/engine/derive'

/** PRD §37 — who is in the organization, what they hold, what they own. */
export default function MembersSettingsPage() {
  const users = useUsers()
  const roles = useRoles()
  const departments = useDepartments()
  const items = useAllWorkItems()
  const ctx = useEngineContext()

  const [query, setQuery] = useState('')
  const [departmentId, setDepartmentId] = useState('all')

  const filtered = useMemo(
    () =>
      users
        .filter((user) => departmentId === 'all' || user.departmentIds.includes(departmentId))
        .filter((user) =>
          query.trim() ? `${user.name} ${user.email} ${user.title}`.toLowerCase().includes(query.toLowerCase()) : true,
        ),
    [users, departmentId, query],
  )

  return (
    <SettingsPage
      title="Members"
      description={`${users.length} people across ${departments.length} departments.`}
      actions={
        <>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search…" className="w-40" />
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
    >
      <div className="overflow-hidden rounded-lg border border-border">
        {filtered.map((user) => {
          const owned = items.filter((item) => item.assigneeId === user.id && !isDone(item, ctx))
          const blocked = owned.filter((item) => isBlocked(item.id, ctx)).length

          return (
            <div key={user.id} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
              <UserAvatar user={user} size="lg" />

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium">{user.name}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {user.email} · {user.title}
                </span>
              </div>

              <div className="hidden shrink-0 items-center gap-1 lg:flex">
                {user.departmentIds.slice(0, 2).map((id) => (
                  <Badge key={id} variant="muted">
                    {ctx.departments[id]?.name ?? 'Unknown'}
                  </Badge>
                ))}
                {user.departmentIds.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">+{user.departmentIds.length - 2}</span>
                )}
              </div>

              <span className="w-20 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                {owned.length} active
              </span>

              {blocked > 0 && (
                <span className="inline-flex h-5 shrink-0 items-center rounded border border-blocked-border bg-blocked-muted px-1.5 text-[10px] font-medium text-blocked">
                  {blocked}
                </span>
              )}

              <Select value={user.roleId} onValueChange={(value) => configService.setUserRole(user.id, value)}>
                <SelectTrigger size="sm" className="w-28 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">Nobody matches that search.</p>
        )}
      </div>
    </SettingsPage>
  )
}
