'use client'

import { cn } from '@/lib/utils'

/** Consistent shell for every settings screen. */
export function SettingsPage({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-5">
        <header className="flex items-start gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-[12px] text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
        {children}
      </div>
    </div>
  )
}

export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-2', className)}>
      {title && (
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[13px] font-semibold">{title}</h2>
          {description && <p className="text-[12px] text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

export function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-center gap-3 border-b border-border py-2.5 last:border-b-0">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px]">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
