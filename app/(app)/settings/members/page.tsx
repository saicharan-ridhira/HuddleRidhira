'use client'

import { useMemo, useState } from 'react'
import { Crown, Pencil, Plus, Trash2 } from 'lucide-react'
import { SettingsPage } from '@/components/settings/settings-page'
import { ConfirmDelete, EntityDialog, Field } from '@/components/settings/entity-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserAvatar } from '@/components/primitives'
import { Pagination, usePagination } from '@/components/shared/pagination'
import { useAllWorkItems, useDepartments, useEngineContext, useRoles, useUsers } from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import { configService } from '@/lib/services'
import { isBlocked, isDone } from '@/lib/engine/derive'
import { HUES, type Hue, type Id, type User } from '@/lib/types'
import { hueStyle } from '@/lib/ui/tokens'
import { toast } from 'sonner'

interface Draft {
  name: string
  email: string
  title: string
  roleId: Id
  hue: Hue
  departmentIds: Id[]
}

const emptyDraft = (roleId: Id): Draft => ({
  name: '',
  email: '',
  title: '',
  roleId,
  hue: 'blue',
  departmentIds: [],
})

export default function MembersSettingsPage() {
  const users = useUsers()
  const roles = useRoles()
  const departments = useDepartments()
  const items = useAllWorkItems()
  const ctx = useEngineContext()
  const currentUserId = useStore((state) => state.session.currentUserId)

  const [query, setQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')

  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(roles[roles.length - 1]?.id ?? ''))
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)
  const [reassignTo, setReassignTo] = useState<string>('none')

  const filtered = useMemo(
    () =>
      users
        .filter((user) => departmentFilter === 'all' || user.departmentIds.includes(departmentFilter))
        .filter((user) =>
          query.trim() ? `${user.name} ${user.email} ${user.title}`.toLowerCase().includes(query.toLowerCase()) : true,
        ),
    [users, departmentFilter, query],
  )

  const pagination = usePagination(filtered, 25)

  const openCreate = () => {
    setDraft(emptyDraft(roles[roles.length - 1]?.id ?? ''))
    setCreating(true)
  }

  const openEdit = (user: User) => {
    setDraft({
      name: user.name,
      email: user.email,
      title: user.title,
      roleId: user.roleId,
      hue: user.hue,
      departmentIds: [...user.departmentIds],
    })
    setEditing(user)
  }

  const toggleDraftDepartment = (departmentId: Id) =>
    setDraft((previous) => ({
      ...previous,
      departmentIds: previous.departmentIds.includes(departmentId)
        ? previous.departmentIds.filter((id) => id !== departmentId)
        : [...previous.departmentIds, departmentId],
    }))

  /** What removing this person would take with them. */
  const deletionConsequences = (user: User): string[] => {
    const owned = items.filter((item) => item.assigneeId === user.id)
    const headOf = departments.filter((department) => department.leadId === user.id)
    const lines: string[] = []

    if (owned.length > 0) {
      lines.push(
        reassignTo === 'none'
          ? `${owned.length} work item${owned.length === 1 ? '' : 's'} will be left unassigned.`
          : `${owned.length} work item${owned.length === 1 ? '' : 's'} will move to ${ctx.users[reassignTo]?.name ?? 'someone else'}.`,
      )
    }
    if (headOf.length > 0) {
      lines.push(
        reassignTo === 'none'
          ? `${headOf.map((d) => d.name).join(', ')} will be left without a head and cannot take part in the huddle.`
          : `${ctx.users[reassignTo]?.name ?? 'They'} will become head of ${headOf.map((d) => d.name).join(', ')}.`,
      )
    }
    lines.push(`They will be removed from ${user.departmentIds.length} department${user.departmentIds.length === 1 ? '' : 's'}.`)
    return lines
  }

  const draftValid = draft.name.trim().length > 0 && draft.email.trim().length > 0 && Boolean(draft.roleId)

  const fields = (
    <>
      <Field label="Name" htmlFor="member-name">
        <Input
          id="member-name"
          autoFocus
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder="Asha Menon"
        />
      </Field>

      <Field label="Email" htmlFor="member-email">
        <Input
          id="member-email"
          type="email"
          value={draft.email}
          onChange={(event) => setDraft({ ...draft, email: event.target.value })}
          placeholder="asha@acme.com"
        />
      </Field>

      <Field label="Title" htmlFor="member-title">
        <Input
          id="member-title"
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          placeholder="Engineer"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Role">
          <Select value={draft.roleId} onValueChange={(value) => setDraft({ ...draft, roleId: value })}>
            <SelectTrigger size="sm" className="w-full">
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
        </Field>

        <Field label="Colour">
          <Select value={draft.hue} onValueChange={(value) => setDraft({ ...draft, hue: value as Hue })}>
            <SelectTrigger size="sm" className="w-full">
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
        </Field>
      </div>

      <Field label="Departments" hint="Someone can belong to more than one.">
        <div className="flex flex-wrap gap-1.5">
          {departments.map((department) => {
            const on = draft.departmentIds.includes(department.id)
            return (
              <button
                key={department.id}
                type="button"
                onClick={() => toggleDraftDepartment(department.id)}
                className={
                  on
                    ? 'rounded border border-primary/40 bg-primary/10 px-2 py-1 text-[12px] font-medium text-primary'
                    : 'rounded border border-border px-2 py-1 text-[12px] text-muted-foreground hover:bg-accent'
                }
              >
                {department.name}
              </button>
            )
          })}
        </div>
      </Field>
    </>
  )

  return (
    <SettingsPage
      title="Members"
      description={`${users.length} people across ${departments.length} departments.`}
      actions={
        <>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search…" className="w-36" />
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger size="sm" className="w-32">
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
          <Button size="sm" onClick={openCreate}>
            <Plus />
            Add
          </Button>
        </>
      }
    >
      <div className="overflow-hidden rounded-lg border border-border">
        {pagination.items.map((user) => {
          const owned = items.filter((item) => item.assigneeId === user.id && !isDone(item, ctx))
          const blocked = owned.filter((item) => isBlocked(item.id, ctx)).length
          const headOf = departments.filter((department) => department.leadId === user.id)

          return (
            <div
              key={user.id}
              className="group flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
            >
              <UserAvatar user={user} size="lg" />

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-medium">{user.name}</span>
                  {headOf.length > 0 && (
                    <Crown className="size-3 shrink-0 text-overdue" aria-label={`Head of ${headOf.map((d) => d.name).join(', ')}`} />
                  )}
                  {user.id === currentUserId && <Badge variant="outline">You</Badge>}
                </span>
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
                <SelectTrigger size="sm" className="w-24 shrink-0">
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

              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="icon-xs" onClick={() => openEdit(user)} aria-label={`Edit ${user.name}`}>
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={user.id === currentUserId}
                  onClick={() => {
                    setReassignTo('none')
                    setDeleting(user)
                  }}
                  aria-label={`Remove ${user.name}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">Nobody matches that search.</p>
        )}

        {filtered.length > 0 && <Pagination state={pagination} itemLabel="people" className="border-t-0" />}
      </div>

      <EntityDialog
        open={creating}
        onOpenChange={setCreating}
        title="Add an employee"
        description="They can be assigned work and made head of a department straight away."
        submitLabel="Add employee"
        canSubmit={draftValid}
        onSubmit={() => {
          configService.createUser(draft)
          setCreating(false)
          toast.success(`${draft.name.trim()} added`)
        }}
      >
        {fields}
      </EntityDialog>

      <EntityDialog
        open={editing !== null}
        onOpenChange={(next) => !next && setEditing(null)}
        title={`Edit ${editing?.name ?? ''}`}
        submitLabel="Save changes"
        canSubmit={draftValid}
        onSubmit={() => {
          if (editing) configService.updateUser(editing.id, draft)
          setEditing(null)
          toast.success('Employee updated')
        }}
      >
        {fields}
      </EntityDialog>

      {deleting && (
        <ConfirmDelete
          open
          onOpenChange={(next) => !next && setDeleting(null)}
          entityName={deleting.name}
          title={`Remove ${deleting.name}?`}
          consequences={deletionConsequences(deleting)}
          confirmLabel="Remove employee"
          onConfirm={() => {
            configService.deleteUser(deleting.id, { reassignTo: reassignTo === 'none' ? null : reassignTo })
            toast.success(`${deleting.name} removed`)
            setDeleting(null)
          }}
        >
          <Field label="Hand their work to" hint="Leave unassigned if nobody is taking it on yet.">
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nobody — leave unassigned</SelectItem>
                {users
                  .filter((candidate) => candidate.id !== deleting.id)
                  .map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
        </ConfirmDelete>
      )}
    </SettingsPage>
  )
}
