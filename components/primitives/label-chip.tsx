'use client'

import type { Label } from '@/lib/types'
import { hueDot, hueStyle } from '@/lib/ui/tokens'
import { cn } from '@/lib/utils'

/** PRD §21 — the same label looks the same everywhere it appears. */
export function LabelChip({ label, className }: { label: Label | undefined; className?: string }) {
  if (!label) return null

  return (
    <span
      style={hueStyle(label.hue)}
      className={cn(
        'inline-flex h-5 w-fit items-center gap-1 rounded border border-transparent px-1.5 text-[11px] font-medium whitespace-nowrap',
        'bg-[var(--chip-bg)] text-[var(--chip-fg)]',
        className,
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={hueDot(label.hue)} aria-hidden />
      {label.name}
    </span>
  )
}

/** Compact form for board cards, where space is at a premium. */
export function LabelDots({ labels, max = 3 }: { labels: Label[]; max?: number }) {
  if (labels.length === 0) return null
  const shown = labels.slice(0, max)

  return (
    <span className="inline-flex items-center gap-0.5" title={labels.map((label) => label.name).join(', ')}>
      {shown.map((label) => (
        <span key={label.id} className="size-1.5 rounded-full" style={hueDot(label.hue)} aria-hidden />
      ))}
      {labels.length > max && <span className="text-[10px] text-muted-foreground">+{labels.length - max}</span>}
    </span>
  )
}
