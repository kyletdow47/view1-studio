import type { ExerciseDef, SetEntry, WeightEntry } from '@/types'

/**
 * Build a fast lookup: given a date, return the most recent bodyweight on or
 * before that date. Falls back to the earliest weight if `date` is before
 * the first entry, or null if no weight has ever been logged.
 */
export function bodyweightLookup(weights: WeightEntry[]) {
  const sorted = [...weights].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  )
  return (date?: string): number | null => {
    if (sorted.length === 0) return null
    if (!date) return sorted[sorted.length - 1].kg
    // walk forward, last entry with date <= target wins
    let result: number | null = null
    for (const w of sorted) {
      if (w.date > date) break
      result = w.kg
    }
    return result ?? sorted[0].kg
  }
}

/**
 * Resolve the load (kg) a given set actually represents.
 *
 *   Non-bodyweight exercise:   set.w (or 0 if not entered)
 *   Bodyweight exercise:        bodyweight(at date) + (set.w ?? 0)
 *
 * `set.w` for a bodyweight movement is interpreted as ADDED weight
 * (weighted dips, belt pull-ups, vest push-ups, etc.).
 */
export function effectiveWeight(
  set: Pick<SetEntry, 'w'>,
  def: Pick<ExerciseDef, 'isBodyweight'>,
  bodyweightAt: (date?: string) => number | null,
  date?: string
): number {
  if (def.isBodyweight) {
    const bw = bodyweightAt(date) ?? 0
    return bw + (set.w ?? 0)
  }
  return set.w ?? 0
}
