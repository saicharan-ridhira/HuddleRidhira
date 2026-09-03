'use client'

import { createElement } from 'react'
import {
  BookOpen,
  Bug,
  CircleDashed,
  Code2,
  Compass,
  CreditCard,
  Handshake,
  Inbox,
  Megaphone,
  OctagonAlert,
  Siren,
  Sparkles,
  TrendingUp,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react'
import type { WorkItemType } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Icons are stored as names on configurable entities (types,
 * departments, saved views), so a small explicit registry resolves them.
 * A lookup table rather than dynamic import keeps the bundle honest and
 * makes an unknown name degrade to a sensible default instead of
 * crashing the board.
 */
const ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Bug,
  CalendarClock,
  CircleDashed,
  Code2,
  Compass,
  CreditCard,
  Handshake,
  Inbox,
  Megaphone,
  OctagonAlert,
  Siren,
  Sparkles,
  TrendingUp,
}

export function resolveIcon(name: string | undefined): LucideIcon {
  return (name && ICONS[name]) || CircleDashed
}

export function DynamicIcon({ name, className }: { name: string | undefined; className?: string }) {
  // `createElement` rather than binding the icon to a capitalised local:
  // assigning a component during render reads as creating one, which the
  // React compiler rightly rejects.
  return createElement(resolveIcon(name), {
    className: cn('size-3.5 shrink-0', className),
    'aria-hidden': true,
  })
}

export function TypeIcon({ type, className }: { type: WorkItemType | undefined; className?: string }) {
  if (!type) return null
  return createElement(resolveIcon(type.icon), {
    className: cn('size-3.5 shrink-0', className),
    style: { color: `var(--hue-${type.hue})` },
    'aria-label': type.name,
  })
}
