import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-16 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] transition-colors',
        'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50 field-sizing-content',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
