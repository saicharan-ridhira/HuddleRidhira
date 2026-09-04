'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  ChartNoAxesColumn,
  LayoutDashboard,
  ListTodo,
  OctagonAlert,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  ScrollText,
  Settings,
} from 'lucide-react'
import { DynamicIcon } from '@/components/primitives'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  useCurrentOrg,
  useDepartments,
  useEngineContext,
  useLiveHuddle,
  useSession,
  useSidebarCollapsed,
  useWorkItemsAssignedTo,
} from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
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
 *
 * Collapsing reduces it to an icon rail rather than hiding it. A board,
 * a timeline and the scorecard grid all want horizontal room, and this
 * gives back 168px of it — but navigation that vanishes has to be
 * summoned before it can be used, which costs more than it saves. The
 * icons stay in exactly the same vertical positions either way, so the
 * muscle memory built on the expanded rail still works on the collapsed
 * one (Fitts's Law, and the reason this is a rail and not a drawer).
 */
export function Sidebar() {
  const pathname = usePathname()
  const departments = useDepartments()
  const session = useSession()
  const ctx = useEngineContext()
  const organization = useCurrentOrg()
  const liveHuddle = useLiveHuddle(organization?.id)
  const myItems = useWorkItemsAssignedTo(session.currentUserId)
  const collapsed = useSidebarCollapsed()
  const toggleSidebar = useStore((state) => state.toggleSidebar)

  const myBlockedCount = myItems.filter((item) => isBlocked(item.id, ctx)).length

  return (
    <TooltipProvider delayDuration={200}>
      <nav
        aria-label="Primary"
        className={cn(
          'flex shrink-0 flex-col gap-4 overflow-y-auto overflow-x-hidden border-r border-sidebar-border bg-sidebar py-3 scrollbar-thin',
          // Width is the only thing that animates. Fading or sliding the
          // contents would draw the eye to chrome at the exact moment
          // someone is trying to look at the work instead.
          'transition-[width] duration-150 ease-out',
          collapsed ? 'w-12 px-1.5' : 'w-56 px-2',
        )}
      >
        <Section collapsed={collapsed}>
          <NavLink
            href="/dashboard"
            active={pathname === '/dashboard'}
            icon={<LayoutDashboard className="size-3.5" />}
            label="Overview"
            collapsed={collapsed}
          />
          {/* The huddle is one organization-wide meeting between heads of
              department, so it belongs here rather than inside any one
              department's workspace. */}
          <NavLink
            href="/huddle"
            active={pathname.startsWith('/huddle')}
            icon={<Radio className={cn('size-3.5', liveHuddle && 'text-blocked')} />}
            label="Huddle"
            collapsed={collapsed}
            // Collapsed, the icon already turns red for a live huddle;
            // a dot as well would be the same fact said twice.
            after={
              liveHuddle && !collapsed ? (
                <span className="inline-flex h-3.5 items-center rounded bg-blocked-muted px-1 text-[9px] font-medium text-blocked">
                  live
                </span>
              ) : undefined
            }
          />
        </Section>

        <Section title="Departments" collapsed={collapsed}>
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
              label={department.name}
              collapsed={collapsed}
            />
          ))}
        </Section>

        <Section title="Personal" collapsed={collapsed}>
          <NavLink
            href="/my-work"
            active={pathname === '/my-work'}
            icon={<ListTodo className="size-3.5" />}
            label="My work"
            collapsed={collapsed}
          />
          <NavLink
            href="/blocked"
            active={pathname === '/blocked'}
            icon={<OctagonAlert className="size-3.5" />}
            label="Blocked"
            collapsed={collapsed}
            badge={myBlockedCount > 0 ? myBlockedCount : undefined}
            badgeTone="blocked"
          />
          <NavLink
            href="/calendar"
            active={pathname === '/calendar'}
            icon={<CalendarDays className="size-3.5" />}
            label="Calendar"
            collapsed={collapsed}
          />
        </Section>

        <Section title="Management" collapsed={collapsed}>
          <NavLink
            href="/reports"
            active={pathname === '/reports'}
            icon={<ChartNoAxesColumn className="size-3.5" />}
            label="Reports"
            collapsed={collapsed}
          />
          <NavLink
            href="/audit-logs"
            active={pathname === '/audit-logs'}
            icon={<ScrollText className="size-3.5" />}
            label="Audit logs"
            collapsed={collapsed}
          />
        </Section>

        <Section title="System" collapsed={collapsed} className="mt-auto">
          <NavLink
            href="/settings"
            active={pathname.startsWith('/settings')}
            icon={<Settings className="size-3.5" />}
            label="Settings"
            collapsed={collapsed}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className={cn(
                  'flex h-7 items-center gap-2 rounded-md px-2 text-[13px] text-sidebar-foreground transition-colors',
                  'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                  'focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 outline-none',
                  collapsed && 'justify-center px-0',
                )}
              >
                <span className="flex size-3.5 shrink-0 items-center justify-center opacity-80">
                  {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
                </span>
                {!collapsed && <span className="flex-1 truncate text-left">Collapse</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="flex items-center gap-1.5">
              {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              <kbd className="rounded bg-background/20 px-1 font-mono text-[10px]">⌘\</kbd>
            </TooltipContent>
          </Tooltip>
        </Section>
      </nav>
    </TooltipProvider>
  )
}

function Section({
  title,
  children,
  collapsed,
  className,
}: {
  title?: string
  children: React.ReactNode
  collapsed: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-px', className)}>
      {title &&
        (collapsed ? (
          // The heading is what groups the rows; with no room for it, a
          // rule keeps the grouping visible rather than letting fourteen
          // icons run together into one undifferentiated column.
          <div className="mx-2 mt-1 mb-1 border-t border-sidebar-border" aria-hidden />
        ) : (
          <div className="px-2 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
            {title}
          </div>
        ))}
      {children}
    </div>
  )
}

function NavLink({
  href,
  active,
  icon,
  label,
  collapsed,
  badge,
  badgeTone = 'muted',
  after,
}: {
  href: string
  active: boolean
  icon: React.ReactNode
  label: string
  collapsed: boolean
  badge?: number
  badgeTone?: 'muted' | 'blocked'
  after?: React.ReactNode
}) {
  const link = (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-7 items-center gap-2 rounded-md text-[13px] transition-colors',
        'focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 outline-none',
        collapsed ? 'justify-center px-0' : 'px-2',
        active
          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
      )}
    >
      <span className="flex size-3.5 shrink-0 items-center justify-center opacity-80">{icon}</span>

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {after}
        </>
      )}

      {badge !== undefined &&
        (collapsed ? (
          // No room for the count, but "there is something here" is the
          // part that has to survive — otherwise collapsing the rail
          // hides the one signal it exists to raise.
          <span
            className={cn(
              'absolute top-1 right-1 size-1.5 rounded-full',
              badgeTone === 'blocked' ? 'bg-blocked' : 'bg-muted-foreground',
            )}
          />
        ) : (
          <span
            className={cn(
              'flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-medium tabular-nums',
              badgeTone === 'blocked' ? 'bg-blocked-muted text-blocked' : 'bg-muted text-muted-foreground',
            )}
          >
            {badge}
          </span>
        ))}
    </Link>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        {label}
        {badge !== undefined && ` · ${badge}`}
      </TooltipContent>
    </Tooltip>
  )
}
