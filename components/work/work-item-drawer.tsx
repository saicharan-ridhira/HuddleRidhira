'use client'

import { useMemo, useState } from 'react'
import { MessageSquare, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { BlockedBadge, DueDate, TypeIcon, UnblockedBadge, UserAvatar, WorkItemKey } from '@/components/primitives'
import { EditableText } from './inline/editable-text'
import { StatusPicker } from './inline/status-picker'
import { PriorityPicker } from './inline/priority-picker'
import { AssigneePicker } from './inline/assignee-picker'
import { DueDatePicker } from './inline/due-date-picker'
import { LabelPicker } from './inline/label-picker'
import { Checklist } from './checklist'
import { RockToggle } from './rock-toggle'
import { DependencyPanel } from './dependency-panel'
import { BlockerList } from './blocker-list'
import { CustomFieldEditor } from './custom-fields'
import { useCustomFields, useEngineContext, useOpenWorkItemId } from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import { workItemService } from '@/lib/services'
import { blockDetails, hasResolvedDependencies, isBlocked, isDueToday, isOverdue } from '@/lib/engine/derive'
import { cn } from '@/lib/utils'

/**
 * PRD §14 and §45.
 *
 * A drawer rather than a page, so the board stays visible behind it and
 * the user keeps their place (Flow). The body is chunked into labelled
 * sections — Work, Schedule, Classification, Progress, Relationships,
 * Custom, Activity — because a flat list of twenty properties reads as
 * one undifferentiated wall.
 *
 * Frequent properties (§15) are inline controls at the top. Slower,
 * more consequential ones (relationships) sit lower and behind explicit
 * interactions.
 */
export function WorkItemDrawer() {
  const openId = useOpenWorkItemId()
  const openWorkItem = useStore((state) => state.openWorkItem)
  const ctx = useEngineContext()

  const item = openId ? ctx.workItems[openId] : undefined

  return (
    <Sheet open={Boolean(item)} onOpenChange={(next) => !next && openWorkItem(null)}>
      <SheetContent side="right" className="gap-0 p-0">
        {item && <DrawerBody key={item.id} itemId={item.id} />}
      </SheetContent>
    </Sheet>
  )
}

function DrawerBody({ itemId }: { itemId: string }) {
  const ctx = useEngineContext()
  const openWorkItem = useStore((state) => state.openWorkItem)
  const item = ctx.workItems[itemId]
  const customFields = useCustomFields(item?.departmentId)
  const [comment, setComment] = useState('')
  // Activity was hard-capped with no way past it, which quietly hid an
  // item's history. Capped for scanning, expandable on demand.
  const [showAllActivity, setShowAllActivity] = useState(false)

  const comments = useMemo(
    () =>
      Object.values(ctx.comments)
        .filter((entry) => entry.workItemId === itemId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [ctx.comments, itemId],
  )

  const activity = useMemo(
    () =>
      Object.values(ctx.auditEvents)
        .filter((event) => event.entityId === itemId)
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [ctx.auditEvents, itemId],
  )

  if (!item) return null

  const status = ctx.statuses[item.statusId]
  const type = ctx.workItemTypes[item.typeId]
  const department = ctx.departments[item.departmentId]
  const reporter = ctx.users[item.reporterId]
  const blocked = isBlocked(item.id, ctx)
  const details = blockDetails(item.id, ctx)
  const justUnblocked = !blocked && hasResolvedDependencies(item.id, ctx)

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <TypeIcon type={type} />
          <WorkItemKey value={item.key} />
          <span className="text-[11px] text-muted-foreground">{department?.name}</span>
          <div className="ml-auto flex items-center gap-1 pr-7">
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => {
                workItemService.deleteWorkItem(item.id)
                openWorkItem(null)
              }}
              aria-label="Delete work item"
            >
              <Trash2 />
            </Button>
          </div>
        </div>

        <SheetTitle asChild>
          <div>
            <EditableText
              value={item.title}
              onCommit={(next) => workItemService.updateTitle(item.id, next)}
              className="-mx-1 text-[15px] leading-snug font-semibold"
            />
          </div>
        </SheetTitle>
        <SheetDescription className="sr-only">Work item detail</SheetDescription>

        {(blocked || justUnblocked) && (
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              {blocked ? <BlockedBadge count={details.length} /> : <UnblockedBadge />}
            </div>
            {blocked && details.length > 0 && (
              <ul className="flex flex-col gap-0.5 text-[12px] text-muted-foreground">
                {details.map((detail, index) => (
                  <li key={index}>{detail.label}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SheetHeader>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <Section title="Work">
          <Row label="Status">
            <StatusPicker workItemId={item.id} departmentId={item.departmentId} status={status} />
          </Row>
          <Row label="Priority">
            <PriorityPicker workItemId={item.id} priority={item.priority} showLabel />
          </Row>
          <Row label="Assignee">
            <AssigneePicker
              workItemId={item.id}
              departmentId={item.departmentId}
              assigneeId={item.assigneeId}
              showLabel
            />
          </Row>
          <Row label="Reporter">
            <span className="inline-flex items-center gap-1.5 px-1 text-[13px]">
              <UserAvatar user={reporter} size="sm" />
              {reporter?.name ?? 'Unknown'}
            </span>
          </Row>
        </Section>

        <Section title="Schedule">
          <Row label="Start">
            <span className="px-1 text-[13px] text-muted-foreground">
              {item.startDate ? <DueDate value={item.startDate} now={ctx.now} /> : 'Not set'}
            </span>
          </Row>
          <Row label="Due">
            <DueDatePicker
              workItemId={item.id}
              value={item.dueDate}
              overdue={isOverdue(item, ctx)}
              dueToday={isDueToday(item, ctx)}
            />
          </Row>
        </Section>

        <Section title="Classification">
          <Row label="Rock">
            <RockToggle item={item} ctx={ctx} />
          </Row>
          <Row label="Type">
            <span className="inline-flex items-center gap-1.5 px-1 text-[13px]">
              <TypeIcon type={type} />
              {type?.name}
            </span>
          </Row>
          <Row label="Labels" align="start">
            <LabelPicker workItemId={item.id} labelIds={item.labelIds} />
          </Row>
        </Section>

        <Section title="Description">
          <EditableText
            value={item.description}
            onCommit={(next) => workItemService.updateDescription(item.id, next)}
            placeholder="Add a description…"
            multiline
            className="text-[13px] leading-relaxed"
          />
        </Section>

        <Section title="Progress">
          <Checklist item={item} ctx={ctx} />
        </Section>

        <Section title="Blockers">
          <BlockerList item={item} ctx={ctx} />
        </Section>

        <Section title="Relationships">
          <DependencyPanel item={item} ctx={ctx} />
        </Section>

        {customFields.length > 0 && (
          <Section title="Custom fields">
            {customFields.map((field) => (
              <Row key={field.id} label={field.name}>
                <CustomFieldEditor item={item} field={field} />
              </Row>
            ))}
          </Section>
        )}

        <Section title="Comments">
          <div className="flex flex-col gap-2.5">
            {comments.map((entry) => {
              const author = ctx.users[entry.authorId]
              return (
                <div key={entry.id} className="flex gap-2">
                  <UserAvatar user={author} size="default" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] font-medium">{author?.name}</span>
                      <span className="text-[10px] text-muted-foreground">{relativeTime(entry.createdAt, ctx.now)}</span>
                    </div>
                    <p className="text-[13px] leading-relaxed">{entry.body}</p>
                  </div>
                </div>
              )
            })}

            {comments.length === 0 && <p className="text-[12px] text-muted-foreground">No comments yet.</p>}

            <div className="flex flex-col gap-1.5">
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Leave a comment…"
                rows={2}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault()
                    if (comment.trim()) {
                      workItemService.addComment(item.id, comment)
                      setComment('')
                    }
                  }
                }}
              />
              <Button
                size="sm"
                className="w-fit"
                disabled={!comment.trim()}
                onClick={() => {
                  workItemService.addComment(item.id, comment)
                  setComment('')
                }}
              >
                <MessageSquare />
                Comment
              </Button>
            </div>
          </div>
        </Section>

        <Section title="Activity" last>
          {activity.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">Nothing recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {(showAllActivity ? activity : activity.slice(0, 12)).map((event) => (
                <li key={event.id} className="flex items-baseline gap-2 text-[12px]">
                  <span className="shrink-0 text-muted-foreground tabular-nums">{relativeTime(event.at, ctx.now)}</span>
                  <span className="min-w-0">
                    <span className="font-medium">{ctx.users[event.actorId]?.name ?? 'Someone'}</span>{' '}
                    <span className="text-muted-foreground">{event.summary}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {activity.length > 12 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1.5 w-fit text-muted-foreground"
              onClick={() => setShowAllActivity((previous) => !previous)}
            >
              {showAllActivity ? 'Show fewer' : `Show all ${activity.length} events`}
            </Button>
          )}
        </Section>
      </div>
    </>
  )
}

function Section({
  title,
  children,
  last = false,
}: {
  title: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <section className={cn('px-5 py-3.5', !last && 'border-b border-border')}>
      <h3 className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</h3>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  )
}

function Row({
  label,
  children,
  align = 'center',
}: {
  label: string
  children: React.ReactNode
  align?: 'center' | 'start'
}) {
  return (
    <div className={cn('grid grid-cols-[96px_1fr] gap-2', align === 'center' ? 'items-center' : 'items-start')}>
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime()
  const minutes = Math.round(diff / 60_000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
