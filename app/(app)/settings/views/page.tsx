'use client'

import Link from 'next/link'
import { ArrowRight, Trash2 } from 'lucide-react'
import { SettingsPage } from '@/components/settings/settings-page'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DynamicIcon, UserAvatar } from '@/components/primitives'
import { useEngineContext, useSavedViews } from '@/lib/store/selectors'
import { viewService } from '@/lib/services'
import { countConditions } from '@/lib/engine/filter'
import { toast } from 'sonner'

const SORT_LABEL: Record<string, string> = {
  priority: 'Priority',
  dueDate: 'Due date',
  createdAt: 'Created',
  updatedAt: 'Updated',
  assignee: 'Assignee',
  status: 'Status',
  title: 'Title',
  manual: 'Manual order',
}

/**
 * PRD §17. A saved view is presentation only — layout, grouping, sort,
 * filter, visible fields. Spelling that out here matters: the most
 * common misunderstanding of a "view" is that it holds work, and it
 * does not.
 */
export default function ViewsSettingsPage() {
  const views = useSavedViews()
  const ctx = useEngineContext()

  return (
    <SettingsPage
      title="Saved views"
      description="A view saves how work is presented — never the work itself. Save one from any board's View menu."
    >
      {views.length === 0 && (
        <p className="rounded-lg border border-border bg-card px-3 py-8 text-center text-[13px] text-muted-foreground">
          No saved views yet.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {views.map((view) => {
          const department = view.departmentId ? ctx.departments[view.departmentId] : null
          const creator = ctx.users[view.createdBy]
          const conditions = countConditions(view.config.filter)

          return (
            <article key={view.id} className="group flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <DynamicIcon name={view.icon} className="text-muted-foreground" />
                <span className="text-[13px] font-medium">{view.name}</span>
                <Badge variant="outline" className="capitalize">
                  {view.scope}
                </Badge>
                {department ? <Badge variant="muted">{department.name}</Badge> : <Badge variant="muted">All departments</Badge>}

                <div className="ml-auto flex items-center gap-1">
                  {department && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/departments/${department.slug}/${view.config.layout}`}>
                        Open
                        <ArrowRight />
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                    onClick={() => {
                      viewService.deleteSavedView(view.id)
                      toast.success(`Deleted “${view.name}”`)
                    }}
                    aria-label={`Delete ${view.name}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>

              {view.description && <p className="text-[12px] text-muted-foreground">{view.description}</p>}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                <Spec label="Layout" value={view.config.layout} />
                <Spec label="Group by" value={view.config.groupBy} />
                <Spec
                  label="Sort"
                  value={view.config.sort.map((rule) => `${SORT_LABEL[rule.field] ?? rule.field} ${rule.direction}`).join(', ') || 'none'}
                />
                <Spec label="Filter" value={conditions === 0 ? 'none' : `${conditions} condition${conditions === 1 ? '' : 's'}`} />
              </dl>

              <div className="flex items-center gap-1.5">
                <UserAvatar user={creator} size="xs" />
                <span className="text-[11px] text-muted-foreground">Created by {creator?.name ?? 'someone'}</span>
              </div>
            </article>
          )
        })}
      </div>
    </SettingsPage>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="truncate text-[12px] capitalize">{value}</dd>
    </div>
  )
}
