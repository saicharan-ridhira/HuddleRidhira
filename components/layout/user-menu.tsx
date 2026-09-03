'use client'

import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { LogOut, Monitor, Moon, RotateCcw, Sun, UserRound } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/components/primitives'
import { useCurrentUser } from '@/lib/store/selectors'
import { useStore } from '@/lib/store/store'
import { toast } from 'sonner'

export function UserMenu() {
  const user = useCurrentUser()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const setSession = useStore((state) => state.setSession)
  const resetDemoData = useStore((state) => state.resetDemoData)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
        <UserAvatar user={user} size="default" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case">
          <div className="flex flex-col gap-0.5 py-0.5">
            <span className="text-[13px] font-medium text-foreground">{user?.name}</span>
            <span className="text-[11px] font-normal tracking-normal text-muted-foreground normal-case">
              {user?.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => router.push('/my-work')}>
          <UserRound />
          My work
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            resetDemoData()
            toast.success('Demo data reset', { description: 'Every board is back to its starting state.' })
          }}
        >
          <RotateCcw />
          Reset demo data
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            setSession({ signedIn: false })
            router.push('/login')
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
