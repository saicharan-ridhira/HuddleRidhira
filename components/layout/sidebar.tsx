'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  ChartNoAxesColumn,
  LayoutDashboard,
  ListTodo,
  OctagonAlert,
  Radio,
  ScrollText,
  Settings,
} from 'lucide-react'
import { DynamicIcon } from '@/components/primitives'
import {
  useCurrentOrg,
  useDepartments,
  useEngineContext,
  useLiveHuddle,
  useSession,
  useWorkItemsAssignedTo,
} from '@/lib/store/selectors'
import { isBlocked } from '@/lib/engine/derive'
import { hueStyle } from '@/lib/ui/tokens'
import { cn } from '@/lib/utils'

/**
 * PRD §5 and §6. The navigation stays small on purpose: five short
 * sections, no feature-per-row. Hick's Law is the binding constraint —
 * everything advanced is reached contextually from inside a workspace,
 * not by adding another top-level entry here.
 *
 * Each section is a visually distinct region (Law of Common Region), so
 * "a department" and "my own work" never blur together.
 */
export function Sidebar() {
  const pathname = usePathname()
  const departments = useDepartments()
  const session = useSession()
  const ctx = useEngineContext()
  const organization = useCurrentOrg()
  const liveHuddle = useLiveHuddle(organization?.id)
  const myItems = useWorkItemsAssignedTo(session.currentUserId)

  const myBlockedCount = myItems.filter((item) => isBlocked(item.id, ctx)).length

  return (
    <nav
      aria-label="Primary"
      className="flex w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-sidebar-border bg-sidebar px-2 py-3 scrollbar-thin"
    >
      <Section>
        <NavLink href="/dashboard" active={pathname === '/dashboard'} icon={<LayoutDashboard className="size-3.5" />}>
          Overview
        </NavLink>
        {/* The huddle is one organization-wide meeting between heads of
            department, so it belongs here rather than inside any one
            department's workspace. */}
        <NavLink
          href="/huddle"
          active={pathname.startsWith('/huddle')}
          icon={<Radio className={cn('size-3.5', liveHuddle && 'text-blocked')} />}
          badge={liveHuddle ? undefined : undefined}
        >
          <span className="flex items-center gap-1.5">
            Huddle
            {liveHuddle && (
              <span className="inline-flex h-3.5 items-center rounded bg-blocked-muted px-1 text-[9px] font-medium text-blocked">
                live
              </span>
            )}
          </span>
        </NavLink>
      </Section>

      <Section title="Departments">
        {departments.map((department) => (
          <NavLink
            key={department.id}
            href={`/departments/${department.slug}`}
            active={pathname.startsWith(`/departments/${department.slug}`)}
            icon={
              <span style={hueStyle(department.hue)} className="text-[var(--chip-fg)]">
                <DynamicIcon name={department.icon} />
              </span>
            }
          >
            {department.name}
          </NavLink>
        ))}
      </Section>

      <Section title="Personal">
        <NavLink href="/my-work" active={pathname === '/my-work'} icon={<ListTodo className="size-3.5" />}>
          My work
        </NavLink>
        <NavLink
          href="/blocked"
          active={pathname === '/blocked'}
          icon={<OctagonAlert className="size-3.5" />}
          badge={myBlockedCount > 0 ? myBlockedCount : undefined}
          badgeTone="blocked"
        >
          Blocked
        </NavLink>
        <NavLink href="/calendar" active={pathname === '/calendar'} icon={<CalendarDays className="size-3.5" />}>
          Calendar
        </NavLink>
      </Section>

      <Section title="Management">
        <NavLink href="/reports" active={pathname === '/reports'} icon={<ChartNoAxesColumn className="size-3.5" />}>
          Reports
        </NavLink>
        <NavLink href="/audit-logs" active={pathname === '/audit-logs'} icon={<ScrollText className="size-3.5" />}>
          Audit logs
        </NavLink>
      </Section>

      <Section title="System" className="mt-auto">
        <NavLink href="/settings" active={pathname.startsWith('/settings')} icon={<Settings className="size-3.5" />}>
          Settings
        </NavLink>
      </Section>
    </nav>
  )
}

function Section({
  title,
  children,
  className,
}: {
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-px', className)}>
      {title && (
        <div className="px-2 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

function NavLink({
  href,
  active,
  icon,
  children,
  badge,
  badgeTone = 'muted',
}: {
  href: string
  active: boolean
  icon: React.ReactNode
  children: React.ReactNode
  badge?: number
  badgeTone?: 'muted' | 'blocked'
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-7 items-center gap-2 rounded-md px-2 text-[13px] transition-colors',
        'focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 outline-none',
        active
          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
      )}
    >
      <span className="flex size-3.5 shrink-0 items-center justify-center opacity-80">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            'flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-medium tabular-nums',
            badgeTone === 'blocked' ? 'bg-blocked-muted text-blocked' : 'bg-muted text-muted-foreground',
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}
