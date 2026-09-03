'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Click-to-edit text. Enter commits, Escape reverts, blur commits —
 * the behaviour people already expect from Linear and Notion, so there
 * is nothing to learn (Jakob's Law).
 */
export function EditableText({
  value,
  onCommit,
  placeholder = 'Untitled',
  multiline = false,
  className,
  editClassName,
  disabled = false,
}: {
  value: string
  onCommit: (next: string) => void
  placeholder?: string
  multiline?: boolean
  className?: string
  editClassName?: string
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  // A change made elsewhere (a huddle action, the command palette)
  // should show here immediately — unless this field is being typed in,
  // which would throw away what the user is halfway through writing.
  // Adjusting during render rather than in an effect avoids the extra
  // commit and the flash of stale text that comes with it.
  const [syncedValue, setSyncedValue] = useState(value)
  if (value !== syncedValue && !editing) {
    setSyncedValue(value)
    setDraft(value)
  }

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed !== value) onCommit(trimmed)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          if (!disabled) setEditing(true)
        }}
        className={cn(
          'w-full rounded px-1 py-0.5 text-left transition-colors',
          !disabled && 'hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/40 outline-none',
          !value && 'text-muted-foreground',
          multiline && 'whitespace-pre-wrap',
          className,
        )}
      >
        {value || placeholder}
      </button>
    )
  }

  const shared = {
    ref: inputRef as never,
    value: draft,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
    onBlur: commit,
    onClick: (event: React.MouseEvent) => event.stopPropagation(),
    className: cn(
      'w-full resize-none rounded border border-ring bg-background px-1 py-0.5 outline-none ring-2 ring-ring/25',
      className,
      editClassName,
    ),
  }

  if (multiline) {
    return (
      <textarea
        {...shared}
        rows={Math.max(3, draft.split('\n').length)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') cancel()
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) commit()
        }}
      />
    )
  }

  return (
    <input
      {...shared}
      onKeyDown={(event) => {
        if (event.key === 'Escape') cancel()
        if (event.key === 'Enter') commit()
      }}
    />
  )
}
