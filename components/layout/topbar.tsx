'use client'

import { Search } from 'lucide-react'
import { OrgSwitcher } from './org-switcher'
import { UserMenu } from './user-menu'
import { HuddleMark } from './huddle-mark'
import { useCommandMenu } from './command-menu'

/**
 * PRD §6. Three regions, fixed positions: identity on the left, search
 * in the middle, account on the right. Fitts's Law is served by keeping
 * these in exactly the same place on every screen, so the muscle memory
 * built on the board still works inside a huddle.
 */
export function Topbar() {
  const { open } = useCommandMenu()

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-background px-3">
      <div className="flex items-center gap-2">
        <HuddleMark />
        <span className="text-muted-foreground/40">/</span>
        <OrgSwitcher />
      </div>

      <button
        type="button"
        onClick={open}
        className="mx-auto flex h-7 w-full max-w-md items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 outline-none"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Search work, people and commands…</span>
        <kbd className="hidden rounded border border-border bg-background px-1 py-px font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-1.5">
        <UserMenu />
      </div>
    </header>
  )
}
