'use client'

import type { User } from '@/lib/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { hueStyle } from '@/lib/ui/tokens'
import { cn } from '@/lib/utils'

const SIZES = {
  xs: 'size-4 text-[8px]',
  sm: 'size-5 text-[9px]',
  default: 'size-6 text-[10px]',
  lg: 'size-8 text-[11px]',
  xl: 'size-10 text-[13px]',
} as const

export function UserAvatar({
  user,
  size = 'sm',
  className,
}: {
  user: User | undefined
  size?: keyof typeof SIZES
  className?: string
}) {
  if (!user) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground',
          SIZES[size],
          className,
        )}
        title="Unassigned"
        aria-label="Unassigned"
      >
        <span aria-hidden>–</span>
      </span>
    )
  }

  return (
    <Avatar className={cn(SIZES[size], className)} title={user.name}>
      <AvatarFallback
        style={hueStyle(user.hue)}
        className="bg-[var(--chip-bg)] font-semibold text-[var(--chip-fg)]"
      >
        {user.initials}
      </AvatarFallback>
    </Avatar>
  )
}

export function UserChip({ user, size = 'sm' }: { user: User | undefined; size?: keyof typeof SIZES }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <UserAvatar user={user} size={size} />
      <span className="truncate text-[13px]">{user?.name ?? 'Unassigned'}</span>
    </span>
  )
}
