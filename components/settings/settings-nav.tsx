'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * PRD §37 and §45. Configuration is chunked into four groups rather
 * than presented as a flat list of twelve pages — the same content is
 * far easier to hold in mind when it arrives as "Organization / Work
 * management / Views / Security" than as an undifferentiated column.
 */
const GROUPS: Array<{ title: string; items: Array<{ href: string; label: string }> }> = [
  {
    title: 'Organization',
    items: [
      { href: '/settings/organization', label: 'General' },
      { href: '/settings/departments', label: 'Departments' },
      { href: '/settings/members', label: 'Members' },
      { href: '/settings/roles', label: 'Roles & permissions' },
    ],
  },
  {
    title: 'Work management',
    items: [
      { href: '/settings/workflows', label: 'Workflows & statuses' },
      { href: '/settings/labels', label: 'Labels' },
      { href: '/settings/work-item-types', label: 'Work item types' },
      { href: '/settings/custom-fields', label: 'Custom fields' },
    ],
  },
  {
    title: 'Views',
    items: [{ href: '/settings/views', label: 'Saved views' }],
  },
  {
    title: 'Huddles',
    items: [{ href: '/settings/huddles', label: 'Huddle configuration' }],
  },
  {
    title: 'Security',
    items: [{ href: '/settings/audit-logs', label: 'Audit logs' }],
  },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Settings" className="flex w-52 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border px-2 py-3 scrollbar-thin">
      {GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-px">
          <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
            {group.title}
          </div>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className={cn(
                'flex h-7 items-center rounded-md px-2 text-[13px] transition-colors outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring/40',
                pathname === item.href
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}
