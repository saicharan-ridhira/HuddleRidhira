'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

/**
 * Pagination for the surfaces that genuinely need it — the audit log,
 * the table view, the member list — and deliberately not for the board,
 * the huddle, the calendar or the timeline.
 *
 * A kanban column is scanned spatially and paginating it would break the
 * mental model; the huddle's whole point is that it shows few things, so
 * page controls there would be answering a question nobody asked. Adding
 * pagination everywhere would look thorough and read as noise.
 */

export const PAGE_SIZES = [25, 50, 100, 200] as const
export type PageSize = (typeof PAGE_SIZES)[number]

export interface PaginationState<T> {
  page: number
  pageSize: number
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  /** The slice to render. */
  items: T[]
  total: number
  pageCount: number
  /** 1-indexed position of the first item on this page. */
  from: number
  to: number
}

/**
 * Clamping matters more than it looks. Filtering a list down, or
 * deleting the last row on the final page, would otherwise strand the
 * user on an empty page 14 of 3 with no obvious way back — so the page
 * is derived, not stored raw.
 */
export function usePagination<T>(all: T[], initialPageSize: PageSize = 50): PaginationState<T> {
  const [requestedPage, setRequestedPage] = useState(1)
  const [pageSize, setPageSizeState] = useState<number>(initialPageSize)

  const total = all.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, requestedPage), pageCount)

  const items = useMemo(() => all.slice((page - 1) * pageSize, page * pageSize), [all, page, pageSize])

  return {
    page,
    pageSize,
    setPage: setRequestedPage,
    // Changing page size keeps you near where you were rather than
    // dumping you back at the top of a now-differently-sized list.
    setPageSize: (size) => {
      const firstItem = (page - 1) * pageSize
      setPageSizeState(size)
      setRequestedPage(Math.floor(firstItem / size) + 1)
    },
    items,
    total,
    pageCount,
    from: total === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, total),
  }
}

export function Pagination<T>({
  state,
  itemLabel = 'items',
  showPageSize = true,
  className,
}: {
  state: PaginationState<T>
  /** Plural noun for the range summary, e.g. "events". */
  itemLabel?: string
  showPageSize?: boolean
  className?: string
}) {
  const { page, pageCount, pageSize, setPage, setPageSize, total, from, to } = state

  // One page of results needs no controls; showing them would be chrome
  // that never does anything.
  if (total <= PAGE_SIZES[0] && pageCount === 1) {
    return (
      <div className={cn('flex items-center px-4 py-2 text-[11px] text-muted-foreground', className)}>
        {total} {itemLabel}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-background px-4 py-2',
        className,
      )}
    >
      <span className="text-[11px] tabular-nums text-muted-foreground">
        <span className="font-medium text-foreground">
          {from}–{to}
        </span>{' '}
        of {total} {itemLabel}
      </span>

      {showPageSize && (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Per page</span>
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger size="sm" className="w-18">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="ml-auto flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setPage(1)}
          disabled={page === 1}
          aria-label="First page"
        >
          <ChevronsLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>

        <span className="px-2 text-[11px] tabular-nums text-muted-foreground">
          Page <span className="font-medium text-foreground">{page}</span> of {pageCount}
        </span>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setPage(page + 1)}
          disabled={page === pageCount}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setPage(pageCount)}
          disabled={page === pageCount}
          aria-label="Last page"
        >
          <ChevronsRight />
        </Button>
      </div>
    </div>
  )
}

/**
 * How many rows a group shows before the rest is collapsed, and the
 * slack below which collapsing is not worth it.
 *
 * "Show 1 more" is a control that costs more attention than the row it
 * hides, so a group only collapses when there is a real amount behind
 * the click.
 */
export const GROUP_CAP = 25
export const GROUP_SLACK = 3

export function visibleInGroup<T>(items: T[], expanded: boolean): { visible: T[]; hidden: number } {
  if (expanded || items.length <= GROUP_CAP + GROUP_SLACK) {
    return { visible: items, hidden: 0 }
  }
  return { visible: items.slice(0, GROUP_CAP), hidden: items.length - GROUP_CAP }
}

export function ShowMore({
  hidden,
  expanded,
  onToggle,
  noun = 'items',
}: {
  hidden: number
  expanded: boolean
  onToggle: () => void
  noun?: string
}) {
  if (hidden <= 0 && !expanded) return null

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-7 w-full items-center gap-1.5 border-b border-border px-4 text-left text-[11px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 outline-none"
    >
      {expanded ? 'Show fewer' : `Show ${hidden} more ${noun}`}
    </button>
  )
}
