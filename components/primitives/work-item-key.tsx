'use client'

import { cn } from '@/lib/utils'

/** Monospaced and muted: an identifier to scan past, not to read. */
export function WorkItemKey({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn('font-mono text-[11px] tracking-tight text-muted-foreground tabular-nums', className)}>
      {value}
    </span>
  )
}
