'use client'

import { cn } from '@/lib/utils'

/** Shared chrome for the non-department pages, so they feel like one product. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5', className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
        {description && <p className="truncate text-[12px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
  )
}
