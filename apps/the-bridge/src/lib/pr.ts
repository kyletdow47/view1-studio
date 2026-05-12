import type { PersonalRecord } from '@/types'

/**
 * A PR is set when weight * reps STRICTLY exceeds the previous PR's product.
 * First-ever set for an exercise is automatically a PR.
 * Ties do not count as a new PR.
 */
export function isNewPR(
  weight: number,
  reps: number,
  current: PersonalRecord | null | undefined
): boolean {
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return false
  if (weight <= 0 || reps <= 0) return false
  if (!current) return true
  return weight * reps > current.weight * current.reps
}

export function buildPR(
  exerciseName: string,
  weight: number,
  reps: number,
  date: string
): PersonalRecord {
  return { exerciseName, weight, reps, date }
}
