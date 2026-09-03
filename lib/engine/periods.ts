import type { ISODate, MetricCadence } from '@/lib/types'

/**
 * Period arithmetic for metric cadences.
 *
 * Every read and every write of a `MetricEntry` canonicalises its date
 * through `periodKey`. That single rule is what stops a weekly metric
 * quietly collecting seven entries in a week, and it is why nothing else
 * in the codebase is allowed to construct a `periodStart` by hand.
 *
 * Dates are handled as local-midnight `Date`s and serialised as plain
 * `YYYY-MM-DD`, not full ISO timestamps. A period is a calendar fact —
 * "the week of 1 September" — and giving it a time zone would mean the
 * same Monday could land in two different weeks for two colleagues.
 */

const MS_PER_DAY = 86_400_000

/** `YYYY-MM-DD` in local time. `toISOString` would shift across the date line. */
function toDateString(date: Date): ISODate {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parses either a `YYYY-MM-DD` key or a full ISO timestamp to local midnight. */
export function parsePeriod(value: ISODate | Date): Date {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const [datePart] = value.split('T')
  const parts = (datePart ?? '').split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    const fallback = new Date(value)
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate())
  }
  return new Date(year, month - 1, day)
}

/**
 * The canonical first day of the period a date falls in.
 *
 * Weeks start Monday — the working week everywhere this is used, and the
 * week a Monday huddle is reviewing.
 */
export function periodKey(cadence: MetricCadence, value: ISODate | Date): ISODate {
  const date = parsePeriod(value)

  switch (cadence) {
    case 'daily':
      return toDateString(date)
    case 'weekly': {
      // getDay() is 0 for Sunday, which belongs to the week that began
      // six days earlier rather than the one starting tomorrow.
      const offset = (date.getDay() + 6) % 7
      return toDateString(new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset))
    }
    case 'monthly':
      return toDateString(new Date(date.getFullYear(), date.getMonth(), 1))
    case 'quarterly':
      return toDateString(new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1))
  }
}

/** Steps `count` periods from a period start. Negative goes back. */
export function shiftPeriod(cadence: MetricCadence, periodStart: ISODate, count: number): ISODate {
  const date = parsePeriod(periodStart)

  switch (cadence) {
    case 'daily':
      return toDateString(new Date(date.getFullYear(), date.getMonth(), date.getDate() + count))
    case 'weekly':
      return toDateString(new Date(date.getFullYear(), date.getMonth(), date.getDate() + count * 7))
    case 'monthly':
      return toDateString(new Date(date.getFullYear(), date.getMonth() + count, 1))
    case 'quarterly':
      return toDateString(new Date(date.getFullYear(), date.getMonth() + count * 3, 1))
  }
}

/**
 * The last `count` periods ending with the one `now` falls in, oldest
 * first — which is the order the scorecard's columns read in, left to
 * right, so the current period sits at the right edge where the eye
 * lands last.
 */
export function periodsBack(cadence: MetricCadence, count: number, now: Date): ISODate[] {
  const current = periodKey(cadence, now)
  const periods: ISODate[] = []
  for (let index = count - 1; index >= 0; index--) {
    periods.push(shiftPeriod(cadence, current, -index))
  }
  return periods
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A column heading: "3 Sep", "w/c 1 Sep", "Sep 2026", "Q3 2026". */
export function formatPeriod(cadence: MetricCadence, periodStart: ISODate): string {
  const date = parsePeriod(periodStart)
  const month = MONTHS[date.getMonth()] ?? ''

  switch (cadence) {
    case 'daily':
      return `${date.getDate()} ${month}`
    case 'weekly':
      return `w/c ${date.getDate()} ${month}`
    case 'monthly':
      return `${month} ${date.getFullYear()}`
    case 'quarterly':
      return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`
  }
}

/** A tight column heading for the grid, where space is scarce. */
export function formatPeriodShort(cadence: MetricCadence, periodStart: ISODate): string {
  const date = parsePeriod(periodStart)
  switch (cadence) {
    case 'daily':
      return String(date.getDate())
    case 'weekly':
      return `${date.getDate()}/${date.getMonth() + 1}`
    case 'monthly':
      return MONTHS[date.getMonth()] ?? ''
    case 'quarterly':
      return `Q${Math.floor(date.getMonth() / 3) + 1}`
  }
}

/** '2026-Q3'. Used by Rocks and by the Critical Number. */
export function quarterOf(value: ISODate | Date): string {
  const date = parsePeriod(value)
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`
}

export function formatQuarter(quarter: string): string {
  const [year, q] = quarter.split('-')
  return `${q} ${year}`
}

/** The quarter `count` quarters from this one — for picking a Rock's quarter. */
export function shiftQuarter(quarter: string, count: number): string {
  const [yearPart, qPart] = quarter.split('-')
  const year = Number(yearPart)
  const index = Number((qPart ?? 'Q1').slice(1)) - 1
  const absolute = year * 4 + index + count
  return `${Math.floor(absolute / 4)}-Q${(absolute % 4) + 1}`
}

/** How far through the current quarter we are, 0–1. Gives a Rock a pace to be judged against. */
export function quarterProgress(now: Date): number {
  const start = parsePeriod(periodKey('quarterly', now))
  const end = parsePeriod(shiftPeriod('quarterly', periodKey('quarterly', now), 1))
  const elapsed = parsePeriod(now).getTime() - start.getTime()
  const total = end.getTime() - start.getTime()
  return Math.min(1, Math.max(0, elapsed / total))
}

/** True when a period start is the one the given moment falls in. */
export function isCurrentPeriod(cadence: MetricCadence, periodStart: ISODate, now: Date): boolean {
  return periodKey(cadence, now) === periodStart
}

/** Whole days between two period starts. Used for the "not reported since" nudge. */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((parsePeriod(to).getTime() - parsePeriod(from).getTime()) / MS_PER_DAY)
}
