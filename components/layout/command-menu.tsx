'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  OctagonAlert,
  Plus,
  RotateCcw,
  ScrollText,
  Settings,
  Users,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { BlockedBadge, DynamicIcon, StatusIcon, UserAvatar, WorkItemKey } from '@/components/primitives'
import { isBlocked } from '@/lib/engine/derive'
import { useAllWorkItems, useDepartments, useEngineContext, useUsers } from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import { huddleService } from '@/lib/services'
import { toast } from 'sonner'

interface CommandMenuContextValue {
  open: () => void
  close: () => void
  isOpen: boolean
}

const CommandMenuContext = createContext<CommandMenuContextValue | null>(null)

export function useCommandMenu(): CommandMenuContextValue {
  const context = useContext(CommandMenuContext)
  if (!context) throw new Error('useCommandMenu must be used inside CommandMenuProvider')
  return context
}

/**
 * PRD §42. Search and commands share one surface, because the Paradox
 * of the Active User says people will try to *do* something before they
 * read how — so the fastest path to any action should also be the
 * fastest path to any object.
 */
export function CommandMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const value = useMemo<CommandMenuContextValue>(
    () => ({ open: () => setIsOpen(true), close: () => setIsOpen(false), isOpen }),
    [isOpen],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setIsOpen((previous) => !previous)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <CommandMenuContext.Provider value={value}>
      {children}
      <CommandMenu open={isOpen} onOpenChange={setIsOpen} />
    </CommandMenuContext.Provider>
  )
}

function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const departments = useDepartments()
  const users = useUsers()
  const workItems = useAllWorkItems()
  const ctx = useEngineContext()
  const openWorkItem = useStore((state) => state.openWorkItem)
  const resetDemoData = useStore((state) => state.resetDemoData)

  const run = useCallback(
    (action: () => void) => {
      onOpenChange(false)
      // Let the dialog finish closing before navigating, or the route
      // change and the exit animation fight over focus.
      requestAnimationFrame(action)
    },
    [onOpenChange],
  )

  // Blocked work first: if someone is searching during a huddle, that is
  // almost always what they are reaching for.
  const rankedItems = useMemo(() => {
    return [...workItems]
      .sort((a, b) => Number(isBlocked(b.id, ctx)) - Number(isBlocked(a.id, ctx)))
      .slice(0, 120)
  }, [workItems, ctx])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search work, people and commands…" />
      <CommandList>
        <CommandEmpty>Nothing matched that.</CommandEmpty>

        <CommandGroup heading="Commands">
          <CommandItem
            value="create work item new task"
            onSelect={() =>
              run(() => {
                const first = departments[0]
                if (first) router.push(`/departments/${first.slug}/board?new=1`)
              })
            }
          >
            <Plus />
            Create work item
          </CommandItem>
          {departments.map((department) => (
            <CommandItem
              key={`huddle-${department.id}`}
              value={`start huddle ${department.name}`}
              onSelect={() =>
                run(() => {
                  huddleService.openHuddle(department.id)
                  router.push(`/departments/${department.slug}/huddle`)
                })
              }
            >
              <Users />
              Start {department.name} huddle
            </CommandItem>
          ))}
          <CommandItem value="show blocked work" onSelect={() => run(() => router.push('/blocked'))}>
            <OctagonAlert />
            Show blocked work
          </CommandItem>
          <CommandItem
            value="reset demo data"
            onSelect={() =>
              run(() => {
                resetDemoData()
                toast.success('Demo data reset')
              })
            }
          >
            <RotateCcw />
            Reset demo data
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Go to">
          <CommandItem value="overview dashboard" onSelect={() => run(() => router.push('/dashboard'))}>
            <LayoutDashboard />
            Overview
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem value="my work" onSelect={() => run(() => router.push('/my-work'))}>
            <ListTodo />
            My work
          </CommandItem>
          <CommandItem value="calendar" onSelect={() => run(() => router.push('/calendar'))}>
            <CalendarDays />
            Calendar
          </CommandItem>
          <CommandItem value="audit logs" onSelect={() => run(() => router.push('/audit-logs'))}>
            <ScrollText />
            Audit logs
          </CommandItem>
          <CommandItem value="settings" onSelect={() => run(() => router.push('/settings'))}>
            <Settings />
            Settings
          </CommandItem>
          {departments.map((department) => (
            <CommandItem
              key={department.id}
              value={`go to ${department.name} department`}
              onSelect={() => run(() => router.push(`/departments/${department.slug}`))}
            >
              <DynamicIcon name={department.icon} />
              {department.name}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Work">
          {rankedItems.map((item) => {
            const status = ctx.statuses[item.statusId]
            const department = ctx.departments[item.departmentId]
            const blocked = isBlocked(item.id, ctx)

            return (
              <CommandItem
                key={item.id}
                value={`${item.key} ${item.title} ${department?.name ?? ''}`}
                onSelect={() =>
                  run(() => {
                    if (department) router.push(`/departments/${department.slug}/board`)
                    openWorkItem(item.id)
                  })
                }
              >
                {status && <StatusIcon category={status.category} />}
                <WorkItemKey value={item.key} />
                <span className="flex-1 truncate">{item.title}</span>
                {blocked && <BlockedBadge size="sm" />}
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="People">
          {users.slice(0, 30).map((user) => (
            <CommandItem
              key={user.id}
              value={`${user.name} ${user.email} ${user.title}`}
              onSelect={() => run(() => router.push(`/my-work?user=${user.id}`))}
            >
              <UserAvatar user={user} size="xs" />
              <span className="flex-1 truncate">{user.name}</span>
              <span className="text-[11px] text-muted-foreground">{user.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
