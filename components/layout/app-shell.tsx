'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { CommandMenuProvider } from './command-menu'
import { WorkItemDrawer } from '@/components/work/work-item-drawer'
import { useSession } from '@/lib/store/selectors'

/**
 * PRD §6. Sidebar, topbar and content are three clearly separate
 * regions. The drawer is mounted once at the shell rather than per view,
 * so opening a work item from the board, the huddle, the calendar or the
 * command palette is the same interaction with the same state.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const session = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!session.signedIn) router.replace('/login')
  }, [session.signedIn, router])

  if (!session.signedIn) return null

  return (
    <CommandMenuProvider>
      <div className="app-shell flex h-dvh flex-col overflow-hidden bg-background">
        <Topbar />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
        </div>
      </div>
      <WorkItemDrawer />
    </CommandMenuProvider>
  )
}
