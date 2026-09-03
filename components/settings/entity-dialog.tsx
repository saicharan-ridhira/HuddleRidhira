'use client'

import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * One dialog shape for creating and editing every entity, so a form for
 * a department and a form for an employee behave identically. Submitting
 * with Enter works, Escape cancels, and the primary action is disabled
 * until the form says it is valid.
 */
export function EntityDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = 'Save',
  canSubmit = true,
  onSubmit,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  submitLabel?: string
  canSubmit?: boolean
  onSubmit: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-md', className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (canSubmit) onSubmit()
          }}
        >
          {children}

          <DialogFooter className="mt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** A labelled field inside an `EntityDialog`. */
export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

/**
 * Deletion that says what it will take with it.
 *
 * `consequences` is the point of this component: a prototype that
 * silently cascades stops being trustworthy the first time someone
 * notices work vanished. Naming the damage before it happens is cheaper
 * than an undo stack and more honest than a generic "are you sure".
 */
export function ConfirmDelete({
  open,
  onOpenChange,
  title,
  entityName,
  consequences,
  confirmLabel = 'Delete',
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  entityName: string
  consequences: string[]
  confirmLabel?: string
  onConfirm: () => void
  /** Extra controls, e.g. choosing who inherits the work. */
  children?: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? `Delete ${entityName}?`}</DialogTitle>
          <DialogDescription>This cannot be undone from the interface.</DialogDescription>
        </DialogHeader>

        {consequences.length > 0 && (
          <div className="flex gap-2.5 rounded-md border border-overdue-border bg-overdue-muted/50 px-3 py-2.5">
            <TriangleAlert className="mt-px size-4 shrink-0 text-overdue" />
            <ul className="flex flex-col gap-1 text-[12px]">
              {consequences.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {children}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Small hook for the open/target pattern every settings list repeats. */
export function useEntityDialog<T>() {
  const [target, setTarget] = useState<T | null>(null)
  return {
    target,
    open: (value: T) => setTarget(value),
    close: () => setTarget(null),
    isOpen: target !== null,
    onOpenChange: (next: boolean) => {
      if (!next) setTarget(null)
    },
  }
}
