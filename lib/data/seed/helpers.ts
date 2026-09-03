/** Shared helpers for building seed fixtures relative to "today". */

export function isoDaysFromNow(now: Date, days: number, hour = 10, minute = 0): string {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

export function isoMinutesAgo(now: Date, minutes: number): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString()
}

/**
 * Deterministic PRNG (mulberry32). The bulk work items for non-demo
 * departments are generated rather than hand-written, but they must be
 * identical on every reseed — otherwise "Reset demo data" would show a
 * different board each time and screenshots would never match.
 */
export function makeRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick<T>(random: () => number, list: readonly T[]): T {
  return list[Math.floor(random() * list.length)] as T
}

export function toRecord<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]))
}

export function idsOf<T extends { id: string }>(items: T[]): string[] {
  return items.map((item) => item.id)
}
