'use client'

import { useRouter } from 'next/navigation'
import { Building2, Check, ChevronsUpDown, Plus, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCurrentOrg, useOrganizations } from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import { hueStyle } from '@/lib/ui/tokens'
import { toast } from 'sonner'

/**
 * PRD §7. Deliberately shaped like the workspace switchers in Slack,
 * Linear and Google Workspace — Jakob's Law says the cost of being
 * novel here is paid by every user, every session, for no benefit.
 */
export function OrgSwitcher() {
  const organizations = useOrganizations()
  const current = useCurrentOrg()
  const setSession = useStore((state) => state.setSession)
  const router = useRouter()

  if (!current) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-7 items-center gap-1.5 rounded-md px-1.5 text-[13px] font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 outline-none">
        <span
          style={hueStyle(current.hue)}
          className="flex size-5 items-center justify-center rounded bg-[var(--chip-bg)] text-[9px] font-bold text-[var(--chip-fg)]"
        >
          {current.initials}
        </span>
        <span className="max-w-32 truncate">{current.name}</span>
        <ChevronsUpDown className="size-3 opacity-50" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={() => {
              if (org.id === current.id) return
              setSession({ currentOrgId: org.id })
              toast.info(`Switched to ${org.name}`, {
                description: 'The prototype seeds work for Acme Corp only.',
              })
            }}
          >
            <span
              style={hueStyle(org.hue)}
              className="flex size-5 items-center justify-center rounded bg-[var(--chip-bg)] text-[9px] font-bold text-[var(--chip-fg)]"
            >
              {org.initials}
            </span>
            <span className="flex-1 truncate">{org.name}</span>
            {org.id === current.id && <Check className="size-3.5" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => toast.info('Creating organizations is out of scope for the prototype.')}>
          <Plus />
          Create organization
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push('/settings/organization')}>
          <Settings />
          Organization settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push('/settings/departments')}>
          <Building2 />
          Departments
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
