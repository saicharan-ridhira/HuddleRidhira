'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  GanttChartSquare,
  KanbanSquare,
  LayoutList,
  Table2,
  Users,
  LayoutDashboard,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * PRD §6 and §16. One proximity group: every way of looking at the same
 * work sits together, so switching is a single decision rather than a
 * hunt across the chrome.
 */
const VIEWS: Array<{ segment: string; label: string; icon: LucideIcon }> = [
  { segment: 'overview', label: 'Overview', icon: LayoutDashboard },
  { segment: 'board', label: 'Board', icon: KanbanSquare },
  { segment: 'list', label: 'List', icon: LayoutList },
  { segment: 'table', label: 'Table', icon: Table2 },
  { segment: 'calendar', label: 'Calendar', icon: CalendarDays },
  { segment: 'timeline', label: 'Timeline', icon: GanttChartSquare },
  { segment: 'huddle', label: 'Huddle', icon: Users },
  { segment: 'members', label: 'Members', icon: UsersRound },
]

export function ViewSwitcher({ slug }: { slug: string }) {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-px rounded-md bg-muted/60 p-0.5">
      {VIEWS.map((view) => {
        const href = `/departments/${slug}/${view.segment}`
        const active = pathname === href
        const Icon = view.icon

        return (
          <Link
            key={view.segment}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-6 items-center gap-1.5 rounded px-2 text-[12px] font-medium transition-colors',
              'focus-visible:ring-2 focus-visible:ring-ring/40 outline-none',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
            <span className="hidden lg:inline">{view.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
