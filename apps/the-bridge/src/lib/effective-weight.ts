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
 * For all exercises: just whatever weight the user typed in (or 0).
 * For bodyweight movements, `set.w` is interpreted as ADDED weight on top
 * of the user's body (weighted dips/vest push-ups/belt pull-ups). We
 * deliberately do NOT fold bodyweight into the load — push-ups don't
 * actually press 100% of bodyweight, and tracking phantom tonnage caused
 * inflated/double-counted PRs. Bodyweight movements are tracked by reps
 * instead (see PR detection in db/operations.ts).
 */
export function effectiveWeight(
  set: Pick<SetEntry, 'w'>,
  _def: Pick<ExerciseDef, 'isBodyweight'>,
  _bodyweightAt?: (date?: string) => number | null,
  _date?: string
): number {
  return set.w ?? 0
}
