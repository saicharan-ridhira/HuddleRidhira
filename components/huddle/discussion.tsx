'use client'

import { useMemo, useState } from 'react'
import { CircleCheck, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BlockedBadge, DueDate, UnblockedBadge, UserAvatar, WorkItemKey } from '@/components/primitives'
import { BlockerList } from '@/components/work/blocker-list'
import { DependencyPanel } from '@/components/work/dependency-panel'
import { huddleService } from '@/lib/services'
import { blockDetails, hasResolvedDependencies, isBlocked } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { Huddle, Id, WorkItem } from '@/lib/types'
import { toast } from 'sonner'

/**
 * PRD §32. Why → Decision → Action → Owner → Due, captured against the
 * work item rather than in a meeting document.
 *
 * This panel is the mechanism behind the product's north star: when the
 * huddle ends, the decision and the action already live on the work, so
 * there is no separate record for the manager to maintain.
 */
export function Discussion({
  huddle,
  item,
  subjectUserId,
  ctx,
}: {
  huddle: Huddle
  item: WorkItem
  subjectUserId: Id
  ctx: EngineContext
}) {
  const existing = useMemo(
    () => huddle.discussionIds.map((id) => ctx.huddleDiscussions[id]).find((entry) => entry?.workItemId === item.id),
    [huddle.discussionIds, ctx.huddleDiscussions, item.id],
  )

  const actions = useMemo(
    () => huddle.actionIds.map((id) => ctx.huddleActions[id]!).filter((entry) => entry && entry.workItemId === item.id),
    [huddle.actionIds, ctx.huddleActions, item.id],
  )

  const [why, setWhy] = useState(existing?.why ?? '')
  const [decision, setDecision] = useState(existing?.decision ?? '')
  const [actionText, setActionText] = useState('')
  const [ownerId, setOwnerId] = useState<Id>(item.assigneeId ?? subjectUserId)
  const [dueOffset, setDueOffset] = useState('0')

  // Switching item resets the form to whatever was already recorded for
  // that item. Done during render rather than in an effect so the new
  // item never paints with the previous one's text.
  const [formItemId, setFormItemId] = useState(item.id)
  if (item.id !== formItemId) {
    setFormItemId(item.id)
    setWhy(existing?.why ?? '')
    setDecision(existing?.decision ?? '')
    setActionText('')
    setOwnerId(item.assigneeId ?? subjectUserId)
    setDueOffset('0')
  }

  const blocked = isBlocked(item.id, ctx)
  const details = blockDetails(item.id, ctx)
  const justUnblocked = !blocked && hasResolvedDependencies(item.id, ctx)
  const department = ctx.departments[item.departmentId]
  const members = (department?.memberIds ?? []).map((id) => ctx.users[id]!).filter(Boolean)

  const save = () => {
    huddleService.recordDiscussion(huddle.id, {
      workItemId: item.id,
      subjectUserId,
      why: why.trim(),
      decision: decision.trim(),
    })
    toast.success('Decision recorded on ' + item.key)
  }

  const addAction = () => {
    const text = actionText.trim()
    if (!text) return

    const due = new Date()
    due.setDate(due.getDate() + Number(dueOffset))
    due.setHours(17, 0, 0, 0)

    huddleService.addAction(huddle.id, {
      workItemId: item.id,
      text,
      ownerId,
      dueDate: dueOffset === 'none' ? null : due.toISOString(),
    })
    setActionText('')
    toast.success('Action created')
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <WorkItemKey value={item.key} />
          {blocked && <BlockedBadge size="sm" count={details.length} />}
          {justUnblocked && <UnblockedBadge size="sm" />}
        </div>
        <h3 className="text-[14px] leading-snug font-semibold">{item.title}</h3>
        {blocked && details.length > 0 && (
          <ul className="flex flex-col gap-0.5 text-[12px] text-muted-foreground">
            {details.map((detail, index) => (
              <li key={index}>Waiting for {detail.reason}</li>
            ))}
          </ul>
        )}
        {justUnblocked && (
          <p className="text-[12px] text-unblocked">Everything this was waiting on is now finished.</p>
        )}
      </header>

      <Field label="Why is it stuck?">
        <Textarea
          value={why}
          onChange={(event) => setWhy(event.target.value)}
          onBlur={() => (why.trim() || decision.trim()) && save()}
          placeholder="Waiting for Finance credentials."
          rows={2}
        />
      </Field>

      <Field label="Decision">
        <Textarea
          value={decision}
          onChange={(event) => setDecision(event.target.value)}
          onBlur={() => (why.trim() || decision.trim()) && save()}
          placeholder="Finance will provide credentials today."
          rows={2}
        />
      </Field>

      <section className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-2.5">
        <Label className="text-[10px] tracking-wider uppercase">Action</Label>

        <Input
          value={actionText}
          onChange={(event) => setActionText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addAction()
            }
          }}
          placeholder="Follow up with Finance at 2pm"
        />

        <div className="flex items-center gap-1.5">
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger size="sm" className="min-w-0 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dueOffset} onValueChange={setDueOffset}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Today</SelectItem>
              <SelectItem value="1">Tomorrow</SelectItem>
              <SelectItem value="3">In 3 days</SelectItem>
              <SelectItem value="7">Next week</SelectItem>
              <SelectItem value="none">No date</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" onClick={addAction} disabled={!actionText.trim()}>
            <Plus />
            Add
          </Button>
        </div>

        {actions.length > 0 && (
          <ul className="flex flex-col gap-1 pt-0.5">
            {actions.map((action) => (
              <li key={action.id} className="flex items-center gap-2 text-[12px]">
                <button
                  type="button"
                  onClick={() => huddleService.toggleAction(action.id)}
                  aria-label={action.done ? 'Reopen action' : 'Complete action'}
                >
                  <CircleCheck className={action.done ? 'size-3.5 text-unblocked' : 'size-3.5 text-muted-foreground'} />
                </button>
                <UserAvatar user={ctx.users[action.ownerId]} size="xs" />
                <span className={action.done ? 'flex-1 line-through opacity-60' : 'flex-1'}>{action.text}</span>
                <DueDate value={action.dueDate} now={ctx.now} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <Label className="text-[10px] tracking-wider uppercase">Blockers</Label>
        <BlockerList item={item} ctx={ctx} compact />
      </section>

      <section className="flex flex-col gap-2">
        <Label className="text-[10px] tracking-wider uppercase">Dependencies</Label>
        <DependencyPanel item={item} ctx={ctx} />
      </section>

      {existing && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="size-3" />
          Recorded on {item.key}. It will appear in the huddle summary.
        </p>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10px] tracking-wider uppercase">{label}</Label>
      {children}
    </div>
  )
}
