'use client'

import { useState } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/settings/settings-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAllWorkItems, useCurrentOrg, useDepartments, useUsers } from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import { configService } from '@/lib/services'
import { HUES, type Hue } from '@/lib/types'
import { hueStyle } from '@/lib/ui/tokens'
import { toast } from 'sonner'

export default function OrganizationSettingsPage() {
  const org = useCurrentOrg()
  const users = useUsers()
  const departments = useDepartments()
  const items = useAllWorkItems()
  const resetDemoData = useStore((state) => state.resetDemoData)
  const [name, setName] = useState(org?.name ?? '')

  if (!org) return null

  return (
    <SettingsPage title="Organization" description="Identity and workspace-wide defaults.">
      <SettingsSection>
        <div className="rounded-lg border border-border px-3">
          <SettingsRow label="Name">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => name.trim() && configService.updateOrganization(org.id, { name: name.trim() })}
              className="max-w-xs"
            />
          </SettingsRow>

          <SettingsRow label="Monogram" hint="Shown in the switcher">
            <Input
              value={org.initials}
              maxLength={2}
              onChange={(event) => configService.updateOrganization(org.id, { initials: event.target.value.toUpperCase() })}
              className="w-20"
            />
          </SettingsRow>

          <SettingsRow label="Colour">
            <Select value={org.hue} onValueChange={(value) => configService.updateOrganization(org.id, { hue: value as Hue })}>
              <SelectTrigger size="sm" className="w-40">
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
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection title="Scale">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Departments" value={departments.length} />
          <Metric label="Members" value={users.length} />
          <Metric label="Work items" value={items.length} />
        </div>
      </SettingsSection>

      <SettingsSection title="Prototype data">
        <Alert variant="warning">
          <TriangleAlert />
          <AlertTitle>This is a frontend prototype</AlertTitle>
          <AlertDescription>
            <p>
              Everything lives in this browser&apos;s local storage. There is no server, no authentication and no other
              user to sync with. Resetting restores the demo dataset exactly as it ships.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                resetDemoData()
                toast.success('Demo data reset', { description: 'Every board is back to its starting state.' })
              }}
            >
              <RotateCcw />
              Reset demo data
            </Button>
          </AlertDescription>
        </Alert>
      </SettingsSection>
    </SettingsPage>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5">
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-xl leading-none font-semibold tabular-nums">{value}</span>
    </div>
  )
}
