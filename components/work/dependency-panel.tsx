'use client'

import { useState } from 'react'
import { ArrowDown, Link2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BlockedBadge, StatusIcon, UnblockedBadge, WorkItemKey } from '@/components/primitives'
import { useStore } from '@/lib/store/store'
import { dependencyService } from '@/lib/services'
import { isTerminalStatusId, relationsByKind, relationsOf } from '@/lib/engine/derive'
import type { EngineContext } from '@/lib/engine/context'
import {
  DEPENDENCY_RELATIONS,
  DEPENDENCY_RELATION_LABEL,
  type DependencyRelation,
  type WorkItem,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/**
 * PRD §23–§25. A relationship is shown from both sides — what this item
 * waits for, and what waits on it — because the two questions get asked
 * by different people in the same huddle.
 *
 * Upstream rows are drawn as a connected chain rather than a flat list
 * (Law of Uniform Connectedness): the vertical rule and arrow say
 * "this feeds into that" without a legend.
 */
export function DependencyPanel({ item, ctx }: { item: WorkItem; ctx: EngineContext }) {
  const openWorkItem = useStore((state) => state.openWorkItem)
  const kinds = relationsByKind(item.id, ctx)

  const upstream = [...kinds.blockedBy, ...kinds.dependsOn]
  const downstream = kinds.blocks
  const lateral = [...kinds.relatedTo, ...kinds.duplicateOf]
  const family = [...kinds.parentOf, ...kinds.childOf]

  const unresolvedUpstream = upstream.filter((edge) => {
    const other = ctx.workItems[edge.otherId]
    return other && !isTerminalStatusId(other.statusId, ctx)
  })

  const hasAny = relationsOf(item.id, ctx).length > 0

  return (
    <div className="flex flex-col gap-3">
      {upstream.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <PanelHeading>
            {unresolvedUpstream.length > 0 ? 'Waiting for' : 'Was waiting for'}
            {unresolvedUpstream.length > 0 ? (
              <BlockedBadge size="sm" count={unresolvedUpstream.length} />
            ) : (
              <UnblockedBadge size="sm" />
            )}
          </PanelHeading>

          <ol className="flex flex-col">
            {upstream.map((edge, index) => {
              const other = ctx.workItems[edge.otherId]
              if (!other) return null
              const resolved = isTerminalStatusId(other.statusId, ctx)

              return (
                <li key={edge.dependencyId} className="flex flex-col">
                  <RelationRow
                    item={other}
                    ctx={ctx}
                    relation={edge.relation}
                    resolved={resolved}
                    onOpen={() => openWorkItem(other.id)}
                    onRemove={() => dependencyService.removeDependency(edge.dependencyId)}
                  />
                  {index < upstream.length - 1 && <Connector />}
                </li>
              )
            })}
          </ol>

          <div className="flex items-center gap-1.5 pt-0.5 pl-1 text-muted-foreground">
            <ArrowDown className="size-3" />
            <WorkItemKey value={item.key} />
            <span className="truncate text-[12px]">{item.title}</span>
          </div>
        </div>
      )}

      {downstream.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <PanelHeading>Holding up</PanelHeading>
          {downstream.map((edge) => {
            const other = ctx.workItems[edge.otherId]
            if (!other) return null
            return (
              <RelationRow
                key={edge.dependencyId}
                item={other}
                ctx={ctx}
                relation={edge.relation}
                resolved={isTerminalStatusId(other.statusId, ctx)}
                onOpen={() => openWorkItem(other.id)}
                onRemove={() => dependencyService.removeDependency(edge.dependencyId)}
              />
            )
          })}
        </div>
      )}

      {family.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <PanelHeading>Hierarchy</PanelHeading>
          {family.map((edge) => {
            const other = ctx.workItems[edge.otherId]
            if (!other) return null
            return (
              <RelationRow
                key={edge.dependencyId}
                item={other}
                ctx={ctx}
                relation={edge.relation}
                onOpen={() => openWorkItem(other.id)}
                onRemove={() => dependencyService.removeDependency(edge.dependencyId)}
              />
            )
          })}
        </div>
      )}

      {lateral.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <PanelHeading>Related</PanelHeading>
          {lateral.map((edge) => {
            const other = ctx.workItems[edge.otherId]
            if (!other) return null
            return (
              <RelationRow
                key={edge.dependencyId}
                item={other}
                ctx={ctx}
                relation={edge.relation}
                onOpen={() => openWorkItem(other.id)}
                onRemove={() => dependencyService.removeDependency(edge.dependencyId)}
              />
            )
          })}
        </div>
      )}

      {!hasAny && <p className="px-1 text-[12px] text-muted-foreground">No relationships yet.</p>}

      <AddDependency item={item} ctx={ctx} />
    </div>
  )
}

function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
      {children}
    </div>
  )
}

function Connector() {
  return <span className="ml-[13px] h-2 w-px bg-border" aria-hidden />
}

function RelationRow({
  item,
  ctx,
  relation,
  resolved,
  onOpen,
  onRemove,
}: {
  item: WorkItem
  ctx: EngineContext
  relation: DependencyRelation
  resolved?: boolean
  onOpen: () => void
  onRemove: () => void
}) {
  const status = ctx.statuses[item.statusId]

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors',
        resolved === false ? 'border-blocked-border bg-blocked-muted/40' : 'border-border bg-card',
      )}
    >
      {status && <StatusIcon category={status.category} />}
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none">
        <WorkItemKey value={item.key} />
        <span className="truncate text-[13px]">{item.title}</span>
      </button>
      <span className="shrink-0 text-[10px] text-muted-foreground">{DEPENDENCY_RELATION_LABEL[relation]}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        onClick={onRemove}
        aria-label="Remove relationship"
      >
        <X />
      </Button>
    </div>
  )
}

/**
 * Creating a dependency is a low-frequency, two-part decision (which
 * relation, which item), so PRD §15 puts it behind an explicit
 * interaction rather than making it an inline control.
 */
function AddDependency({ item, ctx }: { item: WorkItem; ctx: EngineContext }) {
  const [open, setOpen] = useState(false)
  const [relation, setRelation] = useState<DependencyRelation>('blocked-by')

  const candidates = Object.values(ctx.workItems)
    .filter((candidate) => candidate.id !== item.id)
    .slice(0, 200)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-fit">
          <Plus />
          Add relationship
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex items-center gap-2 border-b border-border p-2">
          <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
          <WorkItemKey value={item.key} />
          <Select value={relation} onValueChange={(value) => setRelation(value as DependencyRelation)}>
            <SelectTrigger size="sm" className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPENDENCY_RELATIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {DEPENDENCY_RELATION_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Command>
          <CommandInput placeholder="Find work…" />
          <CommandList>
            <CommandEmpty>Nothing matched.</CommandEmpty>
            <CommandGroup>
              {candidates.map((candidate) => {
                const status = ctx.statuses[candidate.statusId]
                return (
                  <CommandItem
                    key={candidate.id}
                    value={`${candidate.key} ${candidate.title}`}
                    onSelect={() => {
                      const result = dependencyService.addDependency(item.id, candidate.id, relation)
                      if (result.ok) {
                        toast.success(`${item.key} ${DEPENDENCY_RELATION_LABEL[relation].toLowerCase()} ${candidate.key}`)
                        setOpen(false)
                      } else {
                        toast.error(result.reason ?? 'Could not create that relationship.')
                      }
                    }}
                  >
                    {status && <StatusIcon category={status.category} />}
                    <WorkItemKey value={candidate.key} />
                    <span className="flex-1 truncate">{candidate.title}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
