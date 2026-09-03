'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, GitBranch, ListChecks, OctagonAlert, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { HuddleWorkRow } from './huddle-work-row'
import { Discussion } from './discussion'
import { UserAvatar } from '@/components/primitives'
import { attentionOf, isDone, personStats } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import type { Huddle, User, WorkItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * PRD §29, §30 and §31 — the single most important screen in the
 * product.
 *
 * The headline is "3 things to discuss", never "23 tasks". A huddle is a
 * conversation, and a conversation cannot hold twenty-three items
 * (Miller's Law); showing all of them guarantees the important three are
 * skimmed past. Everything else is one click away and stays that way.
 *
 * Ordering is §30's hierarchy, computed once in `attentionOf` so the
 * huddle, the dashboard and the Blocked view can never disagree about
 * what matters.
 */
export function PersonReview({
  huddle,
  person,
  items,
  ctx,
}: {
  huddle: Huddle
  person: User
  items: WorkItem[]
  ctx: EngineContext
}) {
  const [showAll, setShowAll] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const stats = useMemo(() => personStats(items, ctx), [items, ctx])

  const { discussion, rest } = useMemo(() => {
    const scored = items
      .map((item) => ({ item, attention: attentionOf(item, ctx) }))
      .sort((a, b) => b.attention.score - a.attention.score)

    const needing = scored.filter((entry) => entry.attention.needsDiscussion)
    const others = scored.filter((entry) => !entry.attention.needsDiscussion)

    return { discussion: needing, rest: others }
  }, [items, ctx])

  // Auto-select the top item so the facilitator lands ready to talk.
  const activeId = selectedId ?? discussion[0]?.item.id ?? null
  const activeItem = activeId ? ctx.workItems[activeId] : undefined

  const recentlyDone = rest.filter((entry) => isDone(entry.item, ctx)).slice(0, 4)
  const active = rest.filter((entry) => !isDone(entry.item, ctx))

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-h-0 overflow-y-auto px-4 py-4 scrollbar-thin">
        <header className="mb-4 flex items-start gap-3">
          <UserAvatar user={person} size="xl" />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-base font-semibold tracking-tight">{person.name}</h2>
            <p className="text-[12px] text-muted-foreground">{person.title}</p>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Stat icon={<ListChecks className="size-3" />} value={stats.active} label="active" />
              {stats.blockers > 0 && (
                <Stat
                  icon={<OctagonAlert className="size-3" />}
                  value={stats.blockers}
                  label={stats.blockers === 1 ? 'blocker' : 'blockers'}
                  tone="blocked"
                />
              )}
              {stats.dependencies > 0 && (
                <Stat icon={<GitBranch className="size-3" />} value={stats.dependencies} label="with dependencies" />
              )}
              {stats.overdue > 0 && (
                <Stat
                  icon={<TriangleAlert className="size-3" />}
                  value={stats.overdue}
                  label="overdue"
                  tone="overdue"
                />
              )}
            </div>
          </div>
        </header>

        {/* The headline count. This is the number that keeps a huddle to
            fifteen minutes rather than fifty. */}
        <div className="mb-2 flex items-baseline gap-2">
          <h3 className="text-[13px] font-semibold">
            {discussion.length === 0
              ? 'Nothing to discuss'
              : `${discussion.length} thing${discussion.length === 1 ? '' : 's'} to discuss`}
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {items.length} item{items.length === 1 ? '' : 's'} in total
          </span>
        </div>

        {discussion.length === 0 ? (
          <p className="rounded-md border border-border bg-card px-3 py-4 text-[13px] text-muted-foreground">
            No blockers, dependency problems or overdue work. Move on.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {discussion.map(({ item, attention }) => (
              <li key={item.id}>
                <HuddleWorkRow
                  item={item}
                  ctx={ctx}
                  reasons={attention.reasons}
                  selected={item.id === activeId}
                  onSelect={() => setSelectedId(item.id)}
                />
              </li>
            ))}
          </ul>
        )}

        <Collapsible open={showAll} onOpenChange={setShowAll} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <ChevronDown className={cn('transition-transform', showAll && 'rotate-180')} />
              {showAll ? 'Show fewer' : `Show all ${items.length} item${items.length === 1 ? '' : 's'}`}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-2 flex flex-col gap-3">
            {active.length > 0 && (
              <Group title="Everything else">
                {active.map(({ item, attention }) => (
                  <HuddleWorkRow
                    key={item.id}
                    item={item}
                    ctx={ctx}
                    reasons={attention.reasons}
                    selected={item.id === activeId}
                    onSelect={() => setSelectedId(item.id)}
                  />
                ))}
              </Group>
            )}

            {recentlyDone.length > 0 && (
              <Group title="Recently completed">
                {recentlyDone.map(({ item, attention }) => (
                  <HuddleWorkRow
                    key={item.id}
                    item={item}
                    ctx={ctx}
                    reasons={attention.reasons}
                    selected={item.id === activeId}
                    onSelect={() => setSelectedId(item.id)}
                  />
                ))}
              </Group>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <aside className="min-h-0 overflow-y-auto border-t border-border lg:border-t-0 lg:border-l scrollbar-thin">
        {activeItem ? (
          <Discussion huddle={huddle} item={activeItem} subjectUserId={person.id} ctx={ctx} />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-muted-foreground">
            Select an item to capture what was decided.
          </div>
        )}
      </aside>
    </div>
  )
}

function Stat({
  icon,
  value,
  label,
  tone = 'muted',
}: {
  icon: React.ReactNode
  value: number
  label: string
  tone?: 'muted' | 'blocked' | 'overdue'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] tabular-nums',
        tone === 'blocked' && 'font-medium text-blocked',
        tone === 'overdue' && 'font-medium text-overdue',
        tone === 'muted' && 'text-muted-foreground',
      )}
    >
      {icon}
      {value} {label}
    </span>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</h4>
      {children}
    </section>
  )
}
