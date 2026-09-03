'use client'

import * as React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

function Calendar({ className, classNames, showOutsideDays = true, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-2', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-3',
        month: 'flex flex-col gap-3',
        month_caption: 'flex justify-center pt-1 relative items-center h-7',
        caption_label: 'text-[13px] font-medium',
        nav: 'flex items-center gap-1 absolute right-1 top-1 z-10',
        button_previous: cn(buttonVariants({ variant: 'ghost', size: 'icon-xs' }), 'opacity-60 hover:opacity-100'),
        button_next: cn(buttonVariants({ variant: 'ghost', size: 'icon-xs' }), 'opacity-60 hover:opacity-100'),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-7 font-normal text-[11px]',
        week: 'flex w-full mt-1',
        day: 'size-7 text-center text-xs p-0 relative',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-7 p-0 font-normal aria-selected:opacity-100 rounded-md text-xs',
        ),
        range_start: 'rounded-l-md',
        range_end: 'rounded-r-md',
        selected: '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary',
        today: '[&>button]:bg-accent [&>button]:font-semibold',
        outside: 'text-muted-foreground/50',
        disabled: 'text-muted-foreground opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === 'left' ? (
            <ChevronLeftIcon className="size-3.5" {...chevronProps} />
          ) : (
            <ChevronRightIcon className="size-3.5" {...chevronProps} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
