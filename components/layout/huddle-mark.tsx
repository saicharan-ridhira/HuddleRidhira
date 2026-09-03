import Link from 'next/link'

/** Wordmark. Three overlapping dots — a huddle, drawn small. */
export function HuddleMark({ href = '/dashboard' }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded px-0.5 text-[13px] font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
        <circle cx="5.5" cy="6" r="3.2" fill="var(--primary)" opacity="0.9" />
        <circle cx="10.5" cy="6" r="3.2" fill="var(--primary)" opacity="0.55" />
        <circle cx="8" cy="10.5" r="3.2" fill="var(--primary)" opacity="0.75" />
      </svg>
      Huddle
    </Link>
  )
}
