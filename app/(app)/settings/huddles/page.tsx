'use client'

import Link from 'next/link'
import { ArrowRight, Radio, TriangleAlert } from 'lucide-react'
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/settings/settings-page'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DynamicIcon, UserAvatar } from '@/components/primitives'
import { useCurrentOrg, useDepartments, useEngineContext, useStoreHuddles } from '@/lib/store/selectors'
import { configService } from '@/lib/services'
import type { HuddleCadence } from '@/lib/types'
import { hueStyle } from '@/lib/ui/tokens'

const CADENCES: HuddleCadence[] = ['daily', 'weekdays', 'weekly', 'none']

/**
 * There is exactly one huddle — the heads-of-department meeting — so
 * this is one panel rather than a per-department grid.
 *
 * The setting worth dwelling on is the backlog limit: it is how many
 * untouched items each head reads out before the rest is hidden, and it
 * is the single number that decides whether the meeting runs fifteen
 * minutes or fifty. Blockers are deliberately not capped.
 */
export default function HuddleSettingsPage() {
  const organization = useCurrentOrg()
  const departments = useDepartments()
  const huddles = useStoreHuddles()
  const ctx = useEngineContext()

  if (!organization) return null

  const completed = huddles.filter(
    (huddle) => huddle.organizationId === organization.id && huddle.stage === 'complete',
  ).length
  const headless = departments.filter((department) => !department.leadId)

  const update = (patch: Partial<typeof organization.huddle>) =>
    configService.updateHuddleConfig(organization.id, patch)

  return (
    <SettingsPage
      title="Huddle configuration"
      description="One organization-wide meeting between heads of department."
      actions={
        <Button size="sm" asChild>
          <Link href="/huddle">
            <Radio />
            Open huddle
          </Link>
        </Button>
      }
    >
      <SettingsSection>
        <div className="rounded-lg border border-border px-3">
          <SettingsRow label="Cadence">
            <Select value={organization.huddle.cadence} onValueChange={(value) => update({ cadence: value as HuddleCadence })}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CADENCES.map((cadence) => (
                  <SelectItem key={cadence} value={cadence}>
                    <span className="capitalize">{cadence === 'none' ? 'No huddle' : cadence}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>

          <SettingsRow label="Time">
            <Input
              type="time"
              value={organization.huddle.time}
              onChange={(event) => update({ time: event.target.value })}
              className="w-32"
            />
          </SettingsRow>

          <SettingsRow
            label="Backlog limit"
            hint="Untouched items surfaced per department before the rest is hidden"
          >
            <Input
              type="number"
              min={1}
              max={20}
              value={organization.huddle.backlogLimit}
              onChange={(event) => update({ backlogLimit: Math.max(1, Number(event.target.value) || 1) })}
              className="w-24"
            />
          </SettingsRow>

          <SettingsRow label="Blockers" hint="Never capped">
            <p className="text-[12px] text-muted-foreground">
              Every blocker is read out. There are few of them and each one is a real problem — capping them would hide
              exactly what the meeting exists to surface.
            </p>
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Who attends"
        description="Each department is represented by its head. Set one in Settings → Departments."
      >
        {headless.length > 0 && (
          <Alert variant="warning">
            <TriangleAlert />
            <AlertTitle>
              {headless.length} department{headless.length === 1 ? '' : 's'} cannot take part
            </AlertTitle>
            <AlertDescription>
              <p>{headless.map((department) => department.name).join(', ')} has nobody assigned as head.</p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link href="/settings/departments">
                  Assign a head
                  <ArrowRight />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="overflow-hidden rounded-lg border border-border">
          {departments.map((department) => {
            const head = department.leadId ? ctx.users[department.leadId] : undefined

            return (
              <div
                key={department.id}
                className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
              >
                <span
                  style={hueStyle(department.hue)}
                  className="flex size-6 shrink-0 items-center justify-center rounded bg-[var(--chip-bg)] text-[var(--chip-fg)]"
                >
                  <DynamicIcon name={department.icon} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{department.name}</span>

                {head ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-[12px]">
                    <UserAvatar user={head} size="sm" />
                    {head.name}
                  </span>
                ) : (
                  <span className="shrink-0 text-[12px] font-medium text-overdue">No head assigned</span>
                )}
              </div>
            )
          })}
        </div>
      </SettingsSection>

      <SettingsSection title="History">
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5">
          <span className="text-[13px]">
            {completed} completed huddle{completed === 1 ? '' : 's'}
          </span>
          <Button variant="ghost" size="sm" className="ml-auto" asChild>
            <Link href="/huddle/history">
              View history
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </SettingsSection>
    </SettingsPage>
  )
}
