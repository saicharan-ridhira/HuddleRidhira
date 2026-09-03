'use client'

import Link from 'next/link'
import { ArrowRight, Radio } from 'lucide-react'
import { SettingsPage, SettingsSection } from '@/components/settings/settings-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DynamicIcon } from '@/components/primitives'
import { useDepartments, useStoreHuddles } from '@/lib/store/selectors'
import { configService } from '@/lib/services'
import type { Department, HuddleCadence } from '@/lib/types'
import { hueStyle } from '@/lib/ui/tokens'

const CADENCES: HuddleCadence[] = ['daily', 'weekdays', 'weekly', 'none']

/**
 * PRD §38 and §35. The one setting worth dwelling on is the discussion
 * limit: it is how many items surface per person before "show all", and
 * it is the single most important number for keeping a huddle to
 * fifteen minutes rather than fifty (§31).
 */
export default function HuddleSettingsPage() {
  const departments = useDepartments()
  const huddles = useStoreHuddles()

  return (
    <SettingsPage
      title="Huddle configuration"
      description="Cadence, grouping and how much surfaces per person before the rest is hidden."
    >
      {departments.map((department) => (
        <DepartmentHuddleSettings
          key={department.id}
          department={department}
          completed={huddles.filter((huddle) => huddle.departmentId === department.id && huddle.stage === 'complete').length}
        />
      ))}
    </SettingsPage>
  )
}

function DepartmentHuddleSettings({ department, completed }: { department: Department; completed: number }) {
  const update = (patch: Partial<Department['huddle']>) =>
    configService.updateDepartment(department.id, { huddle: { ...department.huddle, ...patch } })

  return (
    <SettingsSection>
      <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <div className="flex items-center gap-2.5">
          <span
            style={hueStyle(department.hue)}
            className="flex size-6 shrink-0 items-center justify-center rounded bg-[var(--chip-bg)] text-[var(--chip-fg)]"
          >
            <DynamicIcon name={department.icon} />
          </span>
          <span className="text-[13px] font-semibold">{department.name}</span>
          <span className="text-[11px] text-muted-foreground">
            {completed} completed huddle{completed === 1 ? '' : 's'}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/departments/${department.slug}/huddle/history`}>
                History
                <ArrowRight />
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/departments/${department.slug}/huddle`}>
                <Radio />
                Start
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Cadence">
            <Select value={department.huddle.cadence} onValueChange={(value) => update({ cadence: value as HuddleCadence })}>
              <SelectTrigger size="sm" className="w-full">
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
          </Field>

          <Field label="Time">
            <Input
              type="time"
              value={department.huddle.time}
              onChange={(event) => update({ time: event.target.value })}
              className="h-7"
            />
          </Field>

          <Field label="Group by">
            <Select
              value={department.huddle.groupBy}
              onValueChange={(value) => update({ groupBy: value as Department['huddle']['groupBy'] })}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assignee">Person</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Discussion limit" hint="Items surfaced per person">
            <Input
              type="number"
              min={1}
              max={20}
              value={department.huddle.discussionLimit}
              onChange={(event) => update({ discussionLimit: Math.max(1, Number(event.target.value) || 1) })}
              className="h-7"
            />
          </Field>
        </div>
      </div>
    </SettingsSection>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  )
}
