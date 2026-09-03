'use client'

import { useState } from 'react'
import { Info, Lock, Plus, Trash2 } from 'lucide-react'
import { SettingsPage, SettingsSection } from '@/components/settings/settings-page'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserAvatar } from '@/components/primitives'
import { useRoles, useUsers } from '@/lib/store/selectors'
import { configService } from '@/lib/services'
import { PERMISSIONS, PERMISSION_LABEL } from '@/lib/types'
import { toast } from 'sonner'

/**
 * PRD §40. The matrix is real and editable and persists — but it is not
 * enforced against the UI. Gating a prototype's own features makes it
 * harder to demo the thing it exists to demonstrate, so the model is
 * shown rather than applied. That limitation is stated on the page
 * rather than left for someone to discover.
 */
export default function RolesSettingsPage() {
  const roles = useRoles()
  const users = useUsers()
  const [name, setName] = useState('')

  return (
    <SettingsPage
      title="Roles & permissions"
      description="Who can do what. Advanced permissions are added as an organization grows."
      actions={
        <div className="flex items-center gap-1.5">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="New role" className="w-32" />
          <Button
            size="sm"
            disabled={!name.trim()}
            onClick={() => {
              configService.createRole(name.trim(), 'Created in settings.')
              setName('')
              toast.success('Role created')
            }}
          >
            <Plus />
            Add
          </Button>
        </div>
      }
    >
      <Alert>
        <Info />
        <AlertTitle>Configurable, not enforced</AlertTitle>
        <AlertDescription>
          This prototype stores and applies your changes to the model, but it does not gate the interface on them —
          every feature stays reachable so the product can be demonstrated end to end.
        </AlertDescription>
      </Alert>

      <SettingsSection>
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">Permission</TableHead>
                {roles.map((role) => (
                  <TableHead key={role.id} className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      {role.name}
                      {role.system && <Lock className="size-2.5 opacity-50" />}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {PERMISSIONS.map((permission) => (
                <TableRow key={permission}>
                  <TableCell className="text-[13px]">{PERMISSION_LABEL[permission]}</TableCell>
                  {roles.map((role) => (
                    <TableCell key={role.id} className="text-center">
                      <Checkbox
                        checked={role.permissions.includes(permission)}
                        onCheckedChange={() => configService.toggleRolePermission(role.id, permission)}
                        aria-label={`${PERMISSION_LABEL[permission]} for ${role.name}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SettingsSection>

      <SettingsSection title="Roles">
        <div className="overflow-hidden rounded-lg border border-border">
          {roles.map((role) => {
            const holders = users.filter((user) => user.roleId === role.id)

            return (
              <div key={role.id} className="group flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-[13px] font-medium">
                    {role.name}
                    {role.system && <Lock className="size-2.5 text-muted-foreground" />}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">{role.description}</span>
                </div>

                <div className="ml-auto flex shrink-0 items-center -space-x-1.5">
                  {holders.slice(0, 6).map((user) => (
                    <UserAvatar key={user.id} user={user} size="sm" className="ring-2 ring-background" />
                  ))}
                  {holders.length > 6 && (
                    <span className="pl-2.5 text-[11px] text-muted-foreground">+{holders.length - 6}</span>
                  )}
                  {holders.length === 0 && <span className="text-[11px] text-muted-foreground">No one</span>}
                </div>

                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={role.system}
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 disabled:opacity-0"
                  onClick={() => {
                    configService.deleteRole(role.id)
                    toast.success(`Deleted ${role.name}`)
                  }}
                  aria-label={`Delete ${role.name}`}
                >
                  <Trash2 />
                </Button>
              </div>
            )
          })}
        </div>
      </SettingsSection>
    </SettingsPage>
  )
}
